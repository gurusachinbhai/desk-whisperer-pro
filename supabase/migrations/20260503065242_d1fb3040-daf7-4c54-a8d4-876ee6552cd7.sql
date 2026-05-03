-- Enums
CREATE TYPE public.support_ticket_type AS ENUM ('incident', 'request');
CREATE TYPE public.support_ticket_priority AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE public.support_ticket_status AS ENUM ('open', 'in_progress', 'on_hold', 'resolved', 'closed');

-- Sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1;

-- Tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL,
  created_by UUID NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  ticket_type public.support_ticket_type NOT NULL DEFAULT 'request',
  priority public.support_ticket_priority NOT NULL DEFAULT 'P3',
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  assignee_user_id UUID,
  assignee_name TEXT,
  assigned_group TEXT,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_company ON public.support_tickets(company_id);
CREATE INDEX idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);

-- Comments table
CREATE TABLE public.support_ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_comments_ticket ON public.support_ticket_comments(ticket_id);

-- Ticket number generator
CREATE OR REPLACE FUNCTION public.generate_support_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _n BIGINT;
BEGIN
  _n := nextval('public.support_ticket_seq');
  RETURN 'TKT-' || to_char(now(), 'YYYY') || '-' || lpad(_n::text, 6, '0');
END;
$$;

-- Trigger: auto ticket number + updated_at + resolved/closed timestamps
CREATE OR REPLACE FUNCTION public.support_tickets_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_support_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.support_tickets_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
    NEW.resolved_at := now();
  END IF;
  IF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
    NEW.closed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_tickets_before_insert
BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_tickets_before_insert();

CREATE TRIGGER trg_support_tickets_before_update
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_tickets_before_update();

-- RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;

-- Tickets policies
CREATE POLICY "Users view own tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Company admins view all tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE POLICY "Super admins view all tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Users create own tickets in their company"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Admins update tickets in their company"
ON public.support_tickets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE POLICY "Super admins update tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Comments policies
CREATE POLICY "View comments on tickets you can see"
ON public.support_ticket_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (
        t.created_by = auth.uid()
        OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(t.company_id))
        OR public.is_super_admin()
      )
      AND (
        is_internal = false
        OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(t.company_id))
        OR public.is_super_admin()
      )
  )
);

CREATE POLICY "Add comments on tickets you can see"
ON public.support_ticket_comments FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (
        t.created_by = auth.uid()
        OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(t.company_id))
        OR public.is_super_admin()
      )
  )
);