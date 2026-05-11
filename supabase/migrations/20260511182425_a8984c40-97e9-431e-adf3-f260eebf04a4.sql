-- Add partial unique index to prevent duplicate emails within the same company
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_profiles_company_email
  ON public.employee_profiles(company_id, email)
  WHERE email IS NOT NULL;

-- Also add a helpful comment
COMMENT ON INDEX public.idx_employee_profiles_company_email IS 'Prevents duplicate employee emails within the same company';