CREATE TABLE public.ai_assistant_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_email TEXT,
  prompt TEXT NOT NULL,
  reply_preview TEXT,
  blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  message_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_assistant_logs TO authenticated;
GRANT ALL ON public.ai_assistant_logs TO service_role;

ALTER TABLE public.ai_assistant_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own ai logs"
ON public.ai_assistant_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own ai logs"
ON public.ai_assistant_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins view company ai logs"
ON public.ai_assistant_logs FOR SELECT TO authenticated
USING (company_id IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Super admins view all ai logs"
ON public.ai_assistant_logs FOR SELECT TO authenticated
USING (is_super_admin());

CREATE INDEX idx_ai_logs_company_created ON public.ai_assistant_logs(company_id, created_at DESC);
CREATE INDEX idx_ai_logs_user_created ON public.ai_assistant_logs(user_id, created_at DESC);