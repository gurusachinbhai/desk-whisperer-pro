-- 1. Replace the overlap trigger with hour-range based logic
CREATE OR REPLACE FUNCTION public.desk_reservations_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _new_start int;
  _new_end int;
  _conflict_count int;
BEGIN
  IF NEW.status NOT IN ('confirmed', 'pending') THEN
    RETURN NEW;
  END IF;

  -- Map shift label to [start_hour, end_hour) on a 0..30 scale (night wraps to 30 = next-day 6am)
  CASE lower(coalesce(NEW.time_slot, ''))
    WHEN 'morning'   THEN _new_start := 6;  _new_end := 14;
    WHEN 'day'       THEN _new_start := 9;  _new_end := 17;
    WHEN 'afternoon' THEN _new_start := 14; _new_end := 22;
    WHEN 'night'     THEN _new_start := 22; _new_end := 30;
    WHEN 'full day'  THEN _new_start := 0;  _new_end := 24;
    ELSE _new_start := 0; _new_end := 24;  -- unknown label = full day, safest
  END CASE;

  SELECT count(*) INTO _conflict_count
  FROM public.desk_reservations existing
  WHERE existing.company_id = NEW.company_id
    AND existing.desk_label = NEW.desk_label
    AND existing.booking_date = NEW.booking_date
    AND existing.status IN ('confirmed', 'pending')
    AND existing.id <> NEW.id
    AND (
      -- Compute existing range and check for overlap with new range
      CASE lower(coalesce(existing.time_slot, ''))
        WHEN 'morning'   THEN 6
        WHEN 'day'       THEN 9
        WHEN 'afternoon' THEN 14
        WHEN 'night'     THEN 22
        WHEN 'full day'  THEN 0
        ELSE 0
      END
    ) < _new_end
    AND (
      CASE lower(coalesce(existing.time_slot, ''))
        WHEN 'morning'   THEN 14
        WHEN 'day'       THEN 17
        WHEN 'afternoon' THEN 22
        WHEN 'night'     THEN 30
        WHEN 'full day'  THEN 24
        ELSE 24
      END
    ) > _new_start;

  IF _conflict_count > 0 THEN
    RAISE EXCEPTION 'This desk is already booked for an overlapping time slot on this date'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Make sure the trigger is attached (recreate to be safe)
DROP TRIGGER IF EXISTS desk_reservations_prevent_overlap ON public.desk_reservations;
CREATE TRIGGER desk_reservations_prevent_overlap
  BEFORE INSERT OR UPDATE ON public.desk_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.desk_reservations_prevent_overlap();

-- 3. Cancel the duplicate booking that slipped through
UPDATE public.desk_reservations
SET status = 'cancelled', updated_at = now()
WHERE id = 'c932944c-2d26-4f93-b33d-640282d7209e';
