ALTER TYPE public.support_ticket_status ADD VALUE IF NOT EXISTS 'new' BEFORE 'open';
ALTER TYPE public.support_ticket_status ADD VALUE IF NOT EXISTS 'cancelled';