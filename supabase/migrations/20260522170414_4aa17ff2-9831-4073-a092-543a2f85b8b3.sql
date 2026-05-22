
-- Hardware assets
CREATE TABLE public.it_hardware_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  asset_tag TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'Laptop',
  serial_number TEXT,
  device_model TEXT,
  manufacturer TEXT,
  order_date DATE,
  in_service_date DATE,
  warranty_expiry DATE,
  purchase_cost NUMERIC(12,2),
  currency TEXT DEFAULT 'INR',
  vendor TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  condition TEXT,
  location TEXT,
  current_owner_employee_id UUID,
  current_owner_name TEXT,
  department TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, asset_tag)
);
ALTER TABLE public.it_hardware_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view hardware" ON public.it_hardware_assets FOR SELECT TO authenticated USING (is_company_member(company_id));
CREATE POLICY "Admins manage hardware" ON public.it_hardware_assets FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(),'admin') AND is_company_member(company_id));
CREATE POLICY "Super admins manage hardware" ON public.it_hardware_assets FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Software licenses
CREATE TABLE public.it_software_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  software_name TEXT NOT NULL,
  vendor TEXT,
  license_type TEXT NOT NULL DEFAULT 'per_user',
  total_seats INTEGER DEFAULT 1,
  license_key TEXT,
  start_date DATE,
  expiry_date DATE,
  duration_months INTEGER,
  renewal_alert_days INTEGER DEFAULT 30,
  cost NUMERIC(12,2),
  currency TEXT DEFAULT 'INR',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_software_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view software" ON public.it_software_licenses FOR SELECT TO authenticated USING (is_company_member(company_id));
CREATE POLICY "Admins manage software" ON public.it_software_licenses FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(),'admin') AND is_company_member(company_id));
CREATE POLICY "Super admins manage software" ON public.it_software_licenses FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Software assignments (which employee uses which license)
CREATE TABLE public.it_software_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  license_id UUID NOT NULL REFERENCES public.it_software_licenses(id) ON DELETE CASCADE,
  hardware_asset_id UUID REFERENCES public.it_hardware_assets(id) ON DELETE SET NULL,
  employee_id UUID,
  employee_name TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_software_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view sw assignments" ON public.it_software_assignments FOR SELECT TO authenticated USING (is_company_member(company_id));
CREATE POLICY "Admins manage sw assignments" ON public.it_software_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(),'admin') AND is_company_member(company_id));

-- Hardware assignment lifecycle history
CREATE TABLE public.it_asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  hardware_asset_id UUID NOT NULL REFERENCES public.it_hardware_assets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  employee_id UUID,
  employee_name TEXT,
  department TEXT,
  location TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  condition_check TEXT,
  notes TEXT,
  performed_by UUID,
  performed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_asset_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view asset history" ON public.it_asset_assignments FOR SELECT TO authenticated USING (is_company_member(company_id));
CREATE POLICY "Admins manage asset history" ON public.it_asset_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(),'admin') AND is_company_member(company_id));

-- updated_at triggers
CREATE TRIGGER it_hw_touch BEFORE UPDATE ON public.it_hardware_assets FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();
CREATE TRIGGER it_sw_touch BEFORE UPDATE ON public.it_software_licenses FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

CREATE INDEX it_hw_company_idx ON public.it_hardware_assets(company_id);
CREATE INDEX it_hw_owner_idx ON public.it_hardware_assets(current_owner_employee_id);
CREATE INDEX it_sw_company_idx ON public.it_software_licenses(company_id);
CREATE INDEX it_sw_expiry_idx ON public.it_software_licenses(expiry_date);
CREATE INDEX it_sw_assign_lic_idx ON public.it_software_assignments(license_id);
CREATE INDEX it_asset_assign_hw_idx ON public.it_asset_assignments(hardware_asset_id);
