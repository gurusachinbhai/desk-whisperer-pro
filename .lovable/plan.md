## Goal
Restructure the Admin tab into a clean sidebar-navigated console (similar to the Fincor/greytHR screenshot you shared) with grouped sections for onboarding, resignations, employee search, and desk/seat configuration.

## New Admin layout

```
┌────────────────────────┬─────────────────────────────────────────┐
│ FINCOR-style sidebar   │  Main panel (changes per section)       │
│ ─ Dashboard            │                                         │
│ ─ Employee Onboarding  │  • Generate Employee ID                 │
│   • Add Employee       │  • Work email                           │
│   • KYC & UAN          │  • UAN number                           │
│ ─ Resignation Sign-off │  • KYC document upload                  │
│ ─ Employee Search      │                                         │
│ ─ Departments & Proj.  │                                         │
│ ─ Documents (Payroll)  │                                         │
│ ─ Booking · Open Desk  │                                         │
│   • Floors / Areas     │                                         │
│   • Seat Master (A1..) │                                         │
│ ─ Announcements        │                                         │
│ ─ Reports              │                                         │
│ ─ Billing              │                                         │
└────────────────────────┴─────────────────────────────────────────┘
```

The sidebar collapses on mobile to a top drawer; on desktop it's pinned on the **left** by default. (The screenshot shows a left sidebar — confirming "right side menu" actually means a side menu navigation pattern.)

## What changes

### 1. New `AdminSidebar` component
- Collapsible groups, active highlight (primary color), icons from lucide
- Sections: Dashboard, Onboarding, Resignations, Employee Search, Departments, Documents, Open Desk, Announcements, Reports, Billing

### 2. New `AdminOnboardingPanel`
- Form: Display name, work email, auto-generated **Employee ID** (e.g. `EMP-{company}-{seq}`), UAN number, optional photo
- KYC upload (PAN/Aadhaar files → `employee-documents` bucket)
- Creates `employee_profiles` row + KYC row in one go

### 3. New `AdminResignationsPanel`
- Lists employees with status `resigned|notice|exited`
- "Initiate sign-off" button → sets `resignation_date`, `last_working_day`, `exit_status`
- Sign-off checklist (assets returned, FnF, exit interview) stored as JSON
- Filter by date range

### 4. New `AdminEmployeeSearchPanel`
- Search across all (current + past) employees by name / email / employee ID / UAN
- Shows status badge (Active / Notice / Exited), join & exit dates
- Click row → drawer with full profile + KYC + documents

### 5. New `AdminSeatMasterPanel` (Open Desk)
- Define alphanumeric seat numbers (e.g. `A-101`, `B2-15`) per floor + area
- Bulk add (range like `A-101..A-120`)
- Edit / disable / remove seats
- These become the canonical pick-list shown to employees in Booking

### 6. Schema additions
- `employee_profiles`: `employee_code TEXT`, `uan_number TEXT`, `resignation_date DATE`, `last_working_day DATE`, `exit_status TEXT`, `exit_checklist JSONB`
- New `desk_seats` table: `id, company_id, floor, area, seat_label (alphanumeric), is_active`
- RLS: company members read; admins write
- Function `generate_employee_code(company_id)` returns next sequential code

### 7. Wiring
- Replace existing `renderAdminPanel()` with sidebar + content router keyed off a new `adminSection` state
- Existing panels (Departments, Documents, Announcements composer, Floors, Reports, Billing) move into the new sidebar slots — no logic changes
- Booking flow on Home reads from `desk_seats` when populated, falls back to current free-text seat input

## Technical notes
- All client-side state, no breaking API changes
- Migration runs first; types regenerate automatically
- `Index.tsx` gets ~150 lines lighter as admin sub-panels move to dedicated files
- Mobile: sidebar becomes a slide-over `Sheet`

## Out of scope (ask if you want them)
- Automated email to onboarded employee with credentials
- E-signature on resignation letter
- PDF export of FnF statement
