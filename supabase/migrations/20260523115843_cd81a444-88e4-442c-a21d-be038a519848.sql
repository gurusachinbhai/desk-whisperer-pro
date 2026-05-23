
CREATE OR REPLACE FUNCTION public.acct_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.acct_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  order_number text NOT NULL,
  client_name text NOT NULL,
  client_email text,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acct_orders_company ON public.acct_orders(company_id, order_date DESC);
CREATE UNIQUE INDEX idx_acct_orders_company_number ON public.acct_orders(company_id, order_number);
ALTER TABLE public.acct_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage acct orders" ON public.acct_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) AND is_company_member(company_id));
CREATE POLICY "Members view acct orders" ON public.acct_orders FOR SELECT TO authenticated
  USING (is_company_member(company_id));
CREATE POLICY "Super admins manage acct orders" ON public.acct_orders FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE TRIGGER trg_acct_orders_updated BEFORE UPDATE ON public.acct_orders FOR EACH ROW EXECUTE FUNCTION public.acct_touch_updated_at();

CREATE TABLE public.acct_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  receipt_number text NOT NULL,
  order_id uuid REFERENCES public.acct_orders(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_received numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  reference text,
  notes text,
  is_reversal boolean NOT NULL DEFAULT false,
  reverses_receipt_id uuid REFERENCES public.acct_receipts(id) ON DELETE SET NULL,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acct_receipts_company ON public.acct_receipts(company_id, payment_date DESC);
CREATE UNIQUE INDEX idx_acct_receipts_company_number ON public.acct_receipts(company_id, receipt_number);
ALTER TABLE public.acct_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins insert acct receipts" ON public.acct_receipts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) AND is_company_member(company_id));
CREATE POLICY "Admins update acct receipts" ON public.acct_receipts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) AND is_company_member(company_id));
CREATE POLICY "Members view acct receipts" ON public.acct_receipts FOR SELECT TO authenticated
  USING (is_company_member(company_id));
CREATE POLICY "Super admins manage acct receipts" ON public.acct_receipts FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE TRIGGER trg_acct_receipts_updated BEFORE UPDATE ON public.acct_receipts FOR EACH ROW EXECUTE FUNCTION public.acct_touch_updated_at();

CREATE TABLE public.acct_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  expense_number text NOT NULL,
  vendor_name text NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'other',
  amount_spent numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  reference_invoice_no text,
  receipt_attachment_url text,
  notes text,
  is_reversal boolean NOT NULL DEFAULT false,
  reverses_expense_id uuid REFERENCES public.acct_expenses(id) ON DELETE SET NULL,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acct_expenses_company ON public.acct_expenses(company_id, expense_date DESC);
CREATE UNIQUE INDEX idx_acct_expenses_company_number ON public.acct_expenses(company_id, expense_number);
ALTER TABLE public.acct_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins insert acct expenses" ON public.acct_expenses FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) AND is_company_member(company_id));
CREATE POLICY "Admins update acct expenses" ON public.acct_expenses FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) AND is_company_member(company_id));
CREATE POLICY "Members view acct expenses" ON public.acct_expenses FOR SELECT TO authenticated
  USING (is_company_member(company_id));
CREATE POLICY "Super admins manage acct expenses" ON public.acct_expenses FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE TRIGGER trg_acct_expenses_updated BEFORE UPDATE ON public.acct_expenses FOR EACH ROW EXECUTE FUNCTION public.acct_touch_updated_at();

CREATE OR REPLACE FUNCTION public.acct_next_number(_company uuid, _prefix text, _table regclass, _column text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  next_seq int;
BEGIN
  EXECUTE format(
    'SELECT COALESCE(MAX(NULLIF(regexp_replace(%I, ''^%s-%s-'', ''''), '''')::int), 0) + 1 FROM %s WHERE company_id = $1 AND %I LIKE $2',
    _column, _prefix, yr, _table::text, _column
  ) INTO next_seq USING _company, _prefix || '-' || yr || '-%';
  RETURN _prefix || '-' || yr || '-' || lpad(next_seq::text, 4, '0');
END;
$$;
