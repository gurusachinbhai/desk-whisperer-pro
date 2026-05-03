-- Allow all members of a company to view (read) desk reservations within that company
-- so employees can see which seats are already booked by colleagues.
CREATE POLICY "Company members view company desk reservations"
ON public.desk_reservations
FOR SELECT
TO authenticated
USING (public.is_company_member(company_id));