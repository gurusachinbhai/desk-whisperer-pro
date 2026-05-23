
CREATE OR REPLACE FUNCTION public.it_license_alerts_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.it_license_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  license_id uuid NOT NULL,
  software_name text NOT NULL,
  expiry_date date NOT NULL,
  days_remaining integer NOT NULL,
  severity text NOT NULL,
  message text,
  alerted_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  dismissed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (license_id)
);

CREATE INDEX idx_it_license_alerts_company ON public.it_license_alerts(company_id, dismissed_at, severity);

ALTER TABLE public.it_license_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage license alerts" ON public.it_license_alerts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Members view license alerts" ON public.it_license_alerts
  FOR SELECT TO authenticated USING (is_company_member(company_id));

CREATE POLICY "Super admins manage license alerts" ON public.it_license_alerts
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER trg_it_license_alerts_touch
  BEFORE UPDATE ON public.it_license_alerts
  FOR EACH ROW EXECUTE FUNCTION public.it_license_alerts_touch_updated_at();

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
