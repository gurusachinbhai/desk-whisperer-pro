
-- =========================================================
-- Desk bookings (per user / per company, persisted)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.desk_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  desk_label text NOT NULL,
  floor text,
  booking_date date NOT NULL,
  time_slot text NOT NULL DEFAULT 'Full Day',
  status text NOT NULL DEFAULT 'confirmed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.desk_reservations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_desk_res_user ON public.desk_reservations(user_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_desk_res_company ON public.desk_reservations(company_id, booking_date DESC);

CREATE POLICY "Users view own desk reservations"
  ON public.desk_reservations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view company desk reservations"
  ON public.desk_reservations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE POLICY "Super admins view all desk reservations"
  ON public.desk_reservations FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Users create own desk reservations"
  ON public.desk_reservations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users update own desk reservations"
  ON public.desk_reservations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update company desk reservations"
  ON public.desk_reservations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE POLICY "Users cancel own desk reservations"
  ON public.desk_reservations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_desk_res_updated_at
  BEFORE UPDATE ON public.desk_reservations
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

-- =========================================================
-- Attendance records (daily per user)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  work_date date NOT NULL DEFAULT (now()::date),
  check_in_at timestamptz,
  check_out_at timestamptz,
  status text NOT NULL DEFAULT 'present',
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, work_date)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_att_user ON public.attendance_records(user_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_att_company ON public.attendance_records(company_id, work_date DESC);

CREATE POLICY "Users view own attendance"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view company attendance"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE POLICY "Super admins view all attendance"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Users create own attendance"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users update own attendance"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update company attendance"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE TRIGGER trg_att_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

-- =========================================================
-- Leave requests
-- =========================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  leave_type text NOT NULL DEFAULT 'casual',
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric(5,2) NOT NULL DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewer_name text,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_leave_user ON public.leave_requests(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_leave_company ON public.leave_requests(company_id, start_date DESC);

CREATE POLICY "Users view own leaves"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view company leaves"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE POLICY "Super admins view all leaves"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Users create own leave requests"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users update own pending leaves"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update company leaves"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE POLICY "Users cancel own pending leaves"
  ON public.leave_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

CREATE TRIGGER trg_leave_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();
