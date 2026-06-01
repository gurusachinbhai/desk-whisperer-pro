
-- Helper: check if current user belongs to Sales department in given company
CREATE OR REPLACE FUNCTION public.is_sales_member(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_profiles ep
    JOIN public.departments d ON d.id = ep.department_id
    WHERE ep.user_id = auth.uid()
      AND ep.company_id = _company_id
      AND lower(d.name) = 'sales'
  )
$$;

CREATE TABLE public.sales_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  product_name text NOT NULL,
  seller_user_id uuid,
  seller_name text NOT NULL,
  buyer_name text NOT NULL,
  buyer_contact text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  entry_type text NOT NULL DEFAULT 'sale', -- 'sale' or 'return'
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_entries TO authenticated;
GRANT ALL ON public.sales_entries TO service_role;

ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;

-- Sales department members can view their company's sales
CREATE POLICY "Sales members view sales entries"
ON public.sales_entries FOR SELECT TO authenticated
USING (public.is_sales_member(company_id));

-- Admins view all company sales
CREATE POLICY "Admins view sales entries"
ON public.sales_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

-- Managers (anyone who is a manager of others in company) view all company sales
CREATE POLICY "Managers view sales entries"
ON public.sales_entries FOR SELECT TO authenticated
USING (public.is_company_manager(company_id));

-- Sales members insert own entries
CREATE POLICY "Sales members insert sales entries"
ON public.sales_entries FOR INSERT TO authenticated
WITH CHECK (public.is_sales_member(company_id) AND created_by = auth.uid());

-- Sales members update own; admins update any
CREATE POLICY "Sales members update own sales entries"
ON public.sales_entries FOR UPDATE TO authenticated
USING (public.is_sales_member(company_id) AND created_by = auth.uid())
WITH CHECK (public.is_sales_member(company_id) AND created_by = auth.uid());

CREATE POLICY "Admins manage sales entries"
ON public.sales_entries FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE POLICY "Super admins manage sales entries"
ON public.sales_entries FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_sales_entries_updated_at
BEFORE UPDATE ON public.sales_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sales_entries_company ON public.sales_entries(company_id, sale_date DESC);
CREATE INDEX idx_sales_entries_seller ON public.sales_entries(company_id, seller_user_id);
