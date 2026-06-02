-- Helper: is current user the direct manager of seller in this company?
CREATE OR REPLACE FUNCTION public.is_manager_of_user(_company_id uuid, _seller_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_profiles seller
    JOIN public.employee_profiles mgr ON mgr.id = seller.manager_id
    WHERE seller.company_id = _company_id
      AND seller.user_id = _seller_user_id
      AND mgr.user_id = auth.uid()
  )
$$;

-- Allow sales members to delete their own entries
CREATE POLICY "Sales members delete own sales entries"
ON public.sales_entries FOR DELETE TO authenticated
USING (public.is_sales_member(company_id) AND created_by = auth.uid());

-- Managers can update sales entries created by their direct reports
CREATE POLICY "Managers update team sales entries"
ON public.sales_entries FOR UPDATE TO authenticated
USING (public.is_manager_of_user(company_id, seller_user_id))
WITH CHECK (public.is_manager_of_user(company_id, seller_user_id));

-- Managers can delete sales entries created by their direct reports
CREATE POLICY "Managers delete team sales entries"
ON public.sales_entries FOR DELETE TO authenticated
USING (public.is_manager_of_user(company_id, seller_user_id));
