-- CRM: Customers
CREATE TABLE public.crm_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  status TEXT NOT NULL DEFAULT 'lead',
  source TEXT,
  owner_user_id UUID,
  owner_name TEXT,
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customers TO authenticated;
GRANT ALL ON public.crm_customers TO service_role;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view crm customers" ON public.crm_customers FOR SELECT TO authenticated USING (is_company_member(company_id));
CREATE POLICY "Admins manage crm customers" ON public.crm_customers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));
CREATE POLICY "Super admins manage crm customers" ON public.crm_customers FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- CRM: Deals
CREATE TABLE public.crm_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  customer_id UUID,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'new',
  value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  expected_close_date DATE,
  probability INTEGER DEFAULT 50,
  owner_user_id UUID,
  owner_name TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_deals TO authenticated;
GRANT ALL ON public.crm_deals TO service_role;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view crm deals" ON public.crm_deals FOR SELECT TO authenticated USING (is_company_member(company_id));
CREATE POLICY "Admins manage crm deals" ON public.crm_deals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));
CREATE POLICY "Super admins manage crm deals" ON public.crm_deals FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Inventory items
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  quantity NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC,
  currency TEXT NOT NULL DEFAULT 'INR',
  location TEXT,
  supplier TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view inventory items" ON public.inventory_items FOR SELECT TO authenticated USING (is_company_member(company_id));
CREATE POLICY "Admins manage inventory items" ON public.inventory_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));
CREATE POLICY "Super admins manage inventory items" ON public.inventory_items FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Inventory movements (stock in/out)
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  item_id UUID NOT NULL,
  movement_type TEXT NOT NULL DEFAULT 'in',
  quantity NUMERIC NOT NULL DEFAULT 0,
  reference TEXT,
  notes TEXT,
  performed_by UUID,
  performed_by_name TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view inventory moves" ON public.inventory_movements FOR SELECT TO authenticated USING (is_company_member(company_id));
CREATE POLICY "Admins manage inventory moves" ON public.inventory_movements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));
CREATE POLICY "Super admins manage inventory moves" ON public.inventory_movements FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Trigger to keep stock updated
CREATE OR REPLACE FUNCTION public.apply_inventory_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE public.inventory_items SET quantity = quantity + NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE public.inventory_items SET quantity = quantity - NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.movement_type = 'adjust' THEN
    UPDATE public.inventory_items SET quantity = NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_apply_inventory_movement
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_movement();

-- updated_at triggers
CREATE TRIGGER trg_crm_customers_updated BEFORE UPDATE ON public.crm_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_deals_updated BEFORE UPDATE ON public.crm_deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_items_updated BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unique SKU per company
CREATE UNIQUE INDEX idx_inventory_items_company_sku ON public.inventory_items(company_id, sku);
CREATE INDEX idx_crm_customers_company ON public.crm_customers(company_id);
CREATE INDEX idx_crm_deals_company ON public.crm_deals(company_id);
CREATE INDEX idx_inventory_movements_item ON public.inventory_movements(item_id);