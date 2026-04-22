-- DeskFlow persistent booking model
CREATE TABLE public.deskflow_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.deskflow_floors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.deskflow_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity_limit INTEGER NOT NULL CHECK (capacity_limit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE public.deskflow_desk_status AS ENUM ('available', 'occupied');
CREATE TYPE public.deskflow_booking_status AS ENUM ('confirmed', 'checked_in', 'released', 'cancelled');

CREATE TABLE public.deskflow_desks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_id UUID NOT NULL REFERENCES public.deskflow_floors(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  x_position TEXT NOT NULL,
  y_position TEXT NOT NULL,
  status public.deskflow_desk_status NOT NULL DEFAULT 'available',
  features TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (floor_id, code)
);

CREATE TABLE public.deskflow_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  desk_id UUID NOT NULL REFERENCES public.deskflow_desks(id) ON DELETE CASCADE,
  time_slot TEXT NOT NULL CHECK (time_slot IN ('Full Day', 'Morning', 'Afternoon')),
  status public.deskflow_booking_status NOT NULL DEFAULT 'confirmed',
  client_session_id TEXT NOT NULL CHECK (length(client_session_id) BETWEEN 8 AND 128),
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deskflow_desks_floor_id ON public.deskflow_desks(floor_id);
CREATE INDEX idx_deskflow_bookings_desk_id ON public.deskflow_bookings(desk_id);
CREATE INDEX idx_deskflow_bookings_status ON public.deskflow_bookings(status);

CREATE OR REPLACE FUNCTION public.deskflow_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER deskflow_companies_touch_updated_at
BEFORE UPDATE ON public.deskflow_companies
FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

CREATE TRIGGER deskflow_floors_touch_updated_at
BEFORE UPDATE ON public.deskflow_floors
FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

CREATE TRIGGER deskflow_desks_touch_updated_at
BEFORE UPDATE ON public.deskflow_desks
FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

CREATE TRIGGER deskflow_bookings_touch_updated_at
BEFORE UPDATE ON public.deskflow_bookings
FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

ALTER TABLE public.deskflow_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deskflow_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deskflow_desks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deskflow_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo users can view companies"
ON public.deskflow_companies
FOR SELECT
USING (true);

CREATE POLICY "Demo users can view floors"
ON public.deskflow_floors
FOR SELECT
USING (true);

CREATE POLICY "Demo users can view desks"
ON public.deskflow_desks
FOR SELECT
USING (true);

CREATE POLICY "Demo users can view bookings"
ON public.deskflow_bookings
FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.deskflow_book_desk(
  _desk_id UUID,
  _time_slot TEXT,
  _client_session_id TEXT
)
RETURNS public.deskflow_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _desk public.deskflow_desks%ROWTYPE;
  _booking public.deskflow_bookings%ROWTYPE;
BEGIN
  IF _time_slot NOT IN ('Full Day', 'Morning', 'Afternoon') THEN
    RAISE EXCEPTION 'Invalid booking time slot';
  END IF;

  IF length(_client_session_id) < 8 OR length(_client_session_id) > 128 THEN
    RAISE EXCEPTION 'Invalid client session';
  END IF;

  SELECT * INTO _desk
  FROM public.deskflow_desks
  WHERE id = _desk_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desk not found';
  END IF;

  IF _desk.status <> 'available' THEN
    RAISE EXCEPTION 'Desk is already occupied';
  END IF;

  UPDATE public.deskflow_desks
  SET status = 'occupied'
  WHERE id = _desk_id;

  INSERT INTO public.deskflow_bookings (desk_id, time_slot, client_session_id)
  VALUES (_desk_id, _time_slot, _client_session_id)
  RETURNING * INTO _booking;

  RETURN _booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deskflow_book_desk(UUID, TEXT, TEXT) TO anon, authenticated;

ALTER TABLE public.deskflow_desks REPLICA IDENTITY FULL;
ALTER TABLE public.deskflow_bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deskflow_desks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deskflow_bookings;

WITH company AS (
  INSERT INTO public.deskflow_companies (name, organization_code)
  VALUES ('Northstar Labs', 'NORTHSTAR')
  RETURNING id
), floor AS (
  INSERT INTO public.deskflow_floors (company_id, name, location, capacity_limit)
  SELECT id, 'Floor 4', 'London HQ', 80 FROM company
  RETURNING id
)
INSERT INTO public.deskflow_desks (floor_id, code, label, x_position, y_position, status, features)
SELECT floor.id, desk.code, desk.label, desk.x_position, desk.y_position, desk.status::public.deskflow_desk_status, desk.features
FROM floor
CROSS JOIN (VALUES
  ('A1', 'Standing', '16%', '24%', 'available', ARRAY['standing desk']),
  ('A2', 'Dual', '34%', '24%', 'occupied', ARRAY['dual monitor']),
  ('A3', 'Window', '52%', '24%', 'available', ARRAY['window']),
  ('B1', 'Quiet', '23%', '48%', 'available', ARRAY['quiet zone']),
  ('B2', 'Focus', '44%', '51%', 'occupied', ARRAY['focus pod']),
  ('B3', 'Team', '66%', '45%', 'available', ARRAY['team area']),
  ('C1', 'Near Mia', '30%', '74%', 'occupied', ARRAY['colleague proximity']),
  ('C2', 'Monitor', '56%', '72%', 'available', ARRAY['dual monitor'])
) AS desk(code, label, x_position, y_position, status, features);