-- Cancel any existing duplicate active reservations (keep the earliest)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY company_id, desk_label, booking_date, time_slot
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.desk_reservations
  WHERE status IN ('confirmed', 'pending')
)
UPDATE public.desk_reservations dr
SET status = 'cancelled', updated_at = now()
FROM ranked
WHERE dr.id = ranked.id AND ranked.rn > 1;

-- Partial unique index: only one active reservation per desk/date/slot within a company
CREATE UNIQUE INDEX IF NOT EXISTS desk_reservations_unique_active_slot
ON public.desk_reservations (company_id, desk_label, booking_date, time_slot)
WHERE status IN ('confirmed', 'pending');

-- Also block Full Day vs Morning/Afternoon overlaps via a trigger
CREATE OR REPLACE FUNCTION public.desk_reservations_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _conflict_slots text[];
BEGIN
  IF NEW.status NOT IN ('confirmed', 'pending') THEN
    RETURN NEW;
  END IF;

  IF NEW.time_slot = 'Full Day' THEN
    _conflict_slots := ARRAY['Full Day', 'Morning', 'Afternoon'];
  ELSIF NEW.time_slot IN ('Morning', 'Afternoon') THEN
    _conflict_slots := ARRAY['Full Day', NEW.time_slot];
  ELSE
    _conflict_slots := ARRAY[NEW.time_slot];
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.desk_reservations
    WHERE company_id = NEW.company_id
      AND desk_label = NEW.desk_label
      AND booking_date = NEW.booking_date
      AND status IN ('confirmed', 'pending')
      AND time_slot = ANY(_conflict_slots)
      AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'This desk is already booked for the selected date and time slot'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS desk_reservations_prevent_overlap_trg ON public.desk_reservations;
CREATE TRIGGER desk_reservations_prevent_overlap_trg
BEFORE INSERT OR UPDATE ON public.desk_reservations
FOR EACH ROW
EXECUTE FUNCTION public.desk_reservations_prevent_overlap();