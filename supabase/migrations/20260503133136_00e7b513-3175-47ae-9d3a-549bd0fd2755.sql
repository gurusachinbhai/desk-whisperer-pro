-- Store area as first-class reservation state so the database can distinguish A2 on AREA-01 vs AREA-02
ALTER TABLE public.desk_reservations
ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT '';

-- Safe JSON metadata reader for legacy rows that stored area only in notes
CREATE OR REPLACE FUNCTION public.desk_reservation_json_text(_notes text, _key text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  _json jsonb;
BEGIN
  IF _notes IS NULL OR btrim(_notes) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    _json := _notes::jsonb;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  RETURN _json ->> _key;
END;
$$;

-- Canonical shift-hour helpers used by triggers, constraints, and release logic
CREATE OR REPLACE FUNCTION public.desk_reservation_shift_start(_time_slot text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE lower(btrim(coalesce(_time_slot, '')))
    WHEN 'morning' THEN 6
    WHEN 'day' THEN 9
    WHEN 'afternoon' THEN 14
    WHEN 'night' THEN 22
    WHEN 'full day' THEN 0
    ELSE 0
  END
$$;

CREATE OR REPLACE FUNCTION public.desk_reservation_shift_end(_time_slot text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE lower(btrim(coalesce(_time_slot, '')))
    WHEN 'morning' THEN 14
    WHEN 'day' THEN 17
    WHEN 'afternoon' THEN 22
    WHEN 'night' THEN 30
    WHEN 'full day' THEN 24
    ELSE 24
  END
$$;

-- Generated columns make overlap protection deterministic and indexable
ALTER TABLE public.desk_reservations
ADD COLUMN IF NOT EXISTS slot_start_hour integer
GENERATED ALWAYS AS (public.desk_reservation_shift_start(time_slot)) STORED;

ALTER TABLE public.desk_reservations
ADD COLUMN IF NOT EXISTS slot_end_hour integer
GENERATED ALWAYS AS (public.desk_reservation_shift_end(time_slot)) STORED;

-- Backfill area for old rows from notes metadata when present, then normalize floor/desk/area values
UPDATE public.desk_reservations
SET area = upper(btrim(coalesce(nullif(public.desk_reservation_json_text(notes, 'area'), ''), area, ''))),
    floor = nullif(btrim(coalesce(floor, '')), ''),
    desk_label = upper(btrim(desk_label));

-- Cancel later active rows that already conflict under the corrected floor + area + hour-overlap rule
WITH active AS (
  SELECT
    id,
    company_id,
    upper(btrim(desk_label)) AS desk_label_norm,
    coalesce(nullif(btrim(floor), ''), '') AS floor_norm,
    upper(btrim(coalesce(area, ''))) AS area_norm,
    booking_date,
    slot_start_hour,
    slot_end_hour,
    created_at
  FROM public.desk_reservations
  WHERE status IN ('confirmed', 'pending')
), conflicting_later AS (
  SELECT DISTINCT later.id
  FROM active later
  JOIN active earlier
    ON earlier.company_id = later.company_id
   AND earlier.desk_label_norm = later.desk_label_norm
   AND earlier.floor_norm = later.floor_norm
   AND earlier.area_norm = later.area_norm
   AND earlier.booking_date = later.booking_date
   AND earlier.id <> later.id
   AND int4range(earlier.slot_start_hour, earlier.slot_end_hour, '[)') && int4range(later.slot_start_hour, later.slot_end_hour, '[)')
   AND (earlier.created_at, earlier.id) < (later.created_at, later.id)
)
UPDATE public.desk_reservations dr
SET status = 'cancelled', updated_at = now()
FROM conflicting_later c
WHERE dr.id = c.id;

-- The previous index ignored floor/area and cannot protect overlapping ranges like Morning vs Day
DROP INDEX IF EXISTS public.desk_reservations_unique_active_slot;

-- Remove duplicate legacy triggers and replace them with one validator
DROP TRIGGER IF EXISTS desk_reservations_prevent_overlap ON public.desk_reservations;
DROP TRIGGER IF EXISTS desk_reservations_prevent_overlap_trg ON public.desk_reservations;

CREATE OR REPLACE FUNCTION public.desk_reservations_validate_and_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.desk_label := upper(btrim(NEW.desk_label));
  NEW.floor := nullif(btrim(coalesce(NEW.floor, '')), '');
  NEW.area := upper(btrim(coalesce(nullif(NEW.area, ''), public.desk_reservation_json_text(NEW.notes, 'area'), '')));

  IF NEW.status NOT IN ('confirmed', 'pending') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.desk_reservations existing
    WHERE existing.company_id = NEW.company_id
      AND upper(btrim(existing.desk_label)) = NEW.desk_label
      AND coalesce(nullif(btrim(existing.floor), ''), '') = coalesce(NEW.floor, '')
      AND upper(btrim(coalesce(existing.area, ''))) = NEW.area
      AND existing.booking_date = NEW.booking_date
      AND existing.status IN ('confirmed', 'pending')
      AND existing.id <> NEW.id
      AND int4range(existing.slot_start_hour, existing.slot_end_hour, '[)') && int4range(public.desk_reservation_shift_start(NEW.time_slot), public.desk_reservation_shift_end(NEW.time_slot), '[)')
  ) THEN
    RAISE EXCEPTION 'This seat is already booked.' USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER desk_reservations_validate_and_prevent_overlap
BEFORE INSERT OR UPDATE ON public.desk_reservations
FOR EACH ROW
EXECUTE FUNCTION public.desk_reservations_validate_and_prevent_overlap();

-- Race-proof overlap enforcement: even simultaneous inserts cannot create two active overlapping bookings
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'desk_reservations_no_active_overlap'
      AND conrelid = 'public.desk_reservations'::regclass
  ) THEN
    ALTER TABLE public.desk_reservations
    ADD CONSTRAINT desk_reservations_no_active_overlap
    EXCLUDE USING gist (
      company_id WITH =,
      lower(coalesce(floor, '')) WITH =,
      lower(coalesce(area, '')) WITH =,
      upper(btrim(desk_label)) WITH =,
      booking_date WITH =,
      int4range(slot_start_hour, slot_end_hour, '[)') WITH &&
    )
    WHERE (status IN ('confirmed', 'pending'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_desk_res_active_seat_lookup
ON public.desk_reservations (company_id, booking_date, floor, area, desk_label, status);

-- Transactional booking API used by the UI. It serializes attempts for the same seat/date before inserting.
CREATE OR REPLACE FUNCTION public.book_desk_reservation(
  _company_id uuid,
  _desk_label text,
  _floor text,
  _area text,
  _booking_date date,
  _time_slot text,
  _user_name text,
  _notes text DEFAULT NULL
)
RETURNS public.desk_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _reservation public.desk_reservations%ROWTYPE;
  _desk_norm text := upper(btrim(coalesce(_desk_label, '')));
  _floor_norm text := nullif(btrim(coalesce(_floor, '')), '');
  _area_norm text := upper(btrim(coalesce(_area, '')));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _desk_norm = '' THEN
    RAISE EXCEPTION 'Seat is required';
  END IF;

  IF NOT public.is_company_member(_company_id) THEN
    RAISE EXCEPTION 'Company membership required';
  END IF;

  -- Serialize booking attempts for the exact seat/date/floor/area to close race-click windows.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      _company_id::text || '|' || coalesce(_floor_norm, '') || '|' || _area_norm || '|' || _desk_norm || '|' || _booking_date::text,
      0
    )
  );

  BEGIN
    INSERT INTO public.desk_reservations (
      company_id,
      user_id,
      user_name,
      desk_label,
      floor,
      area,
      booking_date,
      time_slot,
      status,
      notes
    ) VALUES (
      _company_id,
      auth.uid(),
      btrim(coalesce(_user_name, 'Employee')),
      _desk_norm,
      _floor_norm,
      _area_norm,
      _booking_date,
      btrim(coalesce(_time_slot, 'Full Day')),
      'confirmed',
      _notes
    )
    RETURNING * INTO _reservation;
  EXCEPTION
    WHEN unique_violation OR exclusion_violation THEN
      RAISE EXCEPTION 'This seat is already booked.' USING ERRCODE = '23505';
  END;

  RETURN _reservation;
END;
$$;

REVOKE ALL ON FUNCTION public.book_desk_reservation(uuid, text, text, text, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_desk_reservation(uuid, text, text, text, date, text, text, text) TO authenticated;

-- Release active bookings whose shift window has ended; the UI calls this before reading seat states.
CREATE OR REPLACE FUNCTION public.release_expired_desk_reservations(_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _released_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_company_member(_company_id) THEN
    RAISE EXCEPTION 'Company membership required';
  END IF;

  UPDATE public.desk_reservations
  SET status = 'released', updated_at = now()
  WHERE company_id = _company_id
    AND status IN ('confirmed', 'pending')
    AND (booking_date::timestamp with time zone + (slot_end_hour || ' hours')::interval) <= now();

  GET DIAGNOSTICS _released_count = ROW_COUNT;
  RETURN _released_count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_expired_desk_reservations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_expired_desk_reservations(uuid) TO authenticated;