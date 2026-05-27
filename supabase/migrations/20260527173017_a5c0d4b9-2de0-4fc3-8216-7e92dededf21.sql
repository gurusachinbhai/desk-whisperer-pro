CREATE TABLE public.it_security_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  prompt TEXT NOT NULL,
  block_reason TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  it_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT it_security_escalations_status_check CHECK (status IN ('open','in_progress','resolved','dismissed'))
);

GRANT SELECT, INSERT, UPDATE ON public.it_security_escalations TO authenticated;
GRANT ALL ON public.it_security_escalations TO service_role;

ALTER TABLE public.it_security_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own escalations"
ON public.it_security_escalations FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins see company escalations"
ON public.it_security_escalations FOR SELECT TO authenticated
USING (company_id IS NOT NULL AND public.has_role(auth.uid(),'admin') AND public.is_company_member(company_id));

CREATE POLICY "Super admins see all escalations"
ON public.it_security_escalations FOR SELECT TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Admins update company escalations"
ON public.it_security_escalations FOR UPDATE TO authenticated
USING (company_id IS NOT NULL AND public.has_role(auth.uid(),'admin') AND public.is_company_member(company_id))
WITH CHECK (company_id IS NOT NULL AND public.has_role(auth.uid(),'admin') AND public.is_company_member(company_id));

CREATE INDEX idx_it_sec_esc_company_status ON public.it_security_escalations(company_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.it_sec_esc_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_it_sec_esc_updated_at
BEFORE UPDATE ON public.it_security_escalations
FOR EACH ROW EXECUTE FUNCTION public.it_sec_esc_touch_updated_at();