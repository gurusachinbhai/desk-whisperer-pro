
-- Helper: is the current user a manager (has at least one direct report) in this company?
create or replace function public.is_company_manager(_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employee_profiles reports
    where reports.company_id = _company_id
      and reports.manager_id = (
        select ep.id from public.employee_profiles ep
        where ep.user_id = auth.uid() and ep.company_id = _company_id
        limit 1
      )
  );
$$;

-- Training categories (with optional parent for sub-categories)
create table public.training_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  name text not null,
  description text,
  parent_id uuid references public.training_categories(id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index training_categories_company_idx on public.training_categories(company_id);
create index training_categories_parent_idx on public.training_categories(parent_id);

alter table public.training_categories enable row level security;

create policy "Members view training categories"
  on public.training_categories for select to authenticated
  using (public.is_company_member(company_id));

create policy "Admins and managers manage training categories"
  on public.training_categories for all to authenticated
  using (
    public.is_company_member(company_id)
    and (public.has_role(auth.uid(), 'admin'::public.app_role) or public.is_company_manager(company_id))
  )
  with check (
    public.is_company_member(company_id)
    and (public.has_role(auth.uid(), 'admin'::public.app_role) or public.is_company_manager(company_id))
  );

create policy "Super admins manage training categories"
  on public.training_categories for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Training courses
create table public.training_courses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  category_id uuid not null references public.training_categories(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  video_path text,
  video_kind text not null default 'youtube' check (video_kind in ('youtube','link','upload')),
  duration_minutes int,
  created_by uuid,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index training_courses_company_idx on public.training_courses(company_id);
create index training_courses_category_idx on public.training_courses(category_id);

alter table public.training_courses enable row level security;

create policy "Members view training courses"
  on public.training_courses for select to authenticated
  using (public.is_company_member(company_id));

create policy "Admins and managers manage training courses"
  on public.training_courses for all to authenticated
  using (
    public.is_company_member(company_id)
    and (public.has_role(auth.uid(), 'admin'::public.app_role) or public.is_company_manager(company_id))
  )
  with check (
    public.is_company_member(company_id)
    and (public.has_role(auth.uid(), 'admin'::public.app_role) or public.is_company_manager(company_id))
  );

create policy "Super admins manage training courses"
  on public.training_courses for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Storage bucket for uploaded training videos
insert into storage.buckets (id, name, public)
values ('training-videos', 'training-videos', false)
on conflict (id) do nothing;

create policy "Company members read training videos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'training-videos'
    and exists (
      select 1 from public.employee_profiles ep
      where ep.user_id = auth.uid()
        and ep.company_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Admins and managers upload training videos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'training-videos'
    and exists (
      select 1 from public.employee_profiles ep
      where ep.user_id = auth.uid()
        and ep.company_id::text = (storage.foldername(name))[1]
    )
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.is_company_manager(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "Admins and managers delete training videos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'training-videos'
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.is_company_manager(((storage.foldername(name))[1])::uuid)
    )
  );
