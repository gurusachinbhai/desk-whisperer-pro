
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS check_in_lat numeric,
  ADD COLUMN IF NOT EXISTS check_in_lng numeric,
  ADD COLUMN IF NOT EXISTS check_in_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS check_in_distance_m numeric,
  ADD COLUMN IF NOT EXISTS check_in_address text,
  ADD COLUMN IF NOT EXISTS check_out_lat numeric,
  ADD COLUMN IF NOT EXISTS check_out_lng numeric,
  ADD COLUMN IF NOT EXISTS check_out_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS check_out_distance_m numeric,
  ADD COLUMN IF NOT EXISTS check_out_address text;
