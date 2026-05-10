export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          company_id: string
          created_at: string
          id: string
          location: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
          user_name: string
          work_date: string
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          company_id: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_name: string
          work_date?: string
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          company_id?: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_name?: string
          work_date?: string
        }
        Relationships: []
      }
      company_profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          name: string
          organization_code: string
          postal_code: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          name: string
          organization_code: string
          postal_code?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          name?: string
          organization_code?: string
          postal_code?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      desk_reservations: {
        Row: {
          area: string
          booking_date: string
          company_id: string
          created_at: string
          desk_label: string
          floor: string | null
          id: string
          notes: string | null
          slot_end_hour: number | null
          slot_start_hour: number | null
          status: string
          time_slot: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          area?: string
          booking_date: string
          company_id: string
          created_at?: string
          desk_label: string
          floor?: string | null
          id?: string
          notes?: string | null
          slot_end_hour?: number | null
          slot_start_hour?: number | null
          status?: string
          time_slot?: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          area?: string
          booking_date?: string
          company_id?: string
          created_at?: string
          desk_label?: string
          floor?: string | null
          id?: string
          notes?: string | null
          slot_end_hour?: number | null
          slot_start_hour?: number | null
          status?: string
          time_slot?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      desk_seats: {
        Row: {
          area: string | null
          company_id: string
          created_at: string
          created_by: string | null
          floor: string | null
          id: string
          is_active: boolean
          notes: string | null
          seat_label: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          floor?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          seat_label: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          floor?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          seat_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      deskflow_bookings: {
        Row: {
          booked_at: string
          client_session_id: string
          created_at: string
          desk_id: string
          id: string
          status: Database["public"]["Enums"]["deskflow_booking_status"]
          time_slot: string
          updated_at: string
        }
        Insert: {
          booked_at?: string
          client_session_id: string
          created_at?: string
          desk_id: string
          id?: string
          status?: Database["public"]["Enums"]["deskflow_booking_status"]
          time_slot: string
          updated_at?: string
        }
        Update: {
          booked_at?: string
          client_session_id?: string
          created_at?: string
          desk_id?: string
          id?: string
          status?: Database["public"]["Enums"]["deskflow_booking_status"]
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deskflow_bookings_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "deskflow_desks"
            referencedColumns: ["id"]
          },
        ]
      }
      deskflow_companies: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      deskflow_desks: {
        Row: {
          code: string
          created_at: string
          features: string[]
          floor_id: string
          id: string
          label: string
          status: Database["public"]["Enums"]["deskflow_desk_status"]
          updated_at: string
          x_position: string
          y_position: string
        }
        Insert: {
          code: string
          created_at?: string
          features?: string[]
          floor_id: string
          id?: string
          label: string
          status?: Database["public"]["Enums"]["deskflow_desk_status"]
          updated_at?: string
          x_position: string
          y_position: string
        }
        Update: {
          code?: string
          created_at?: string
          features?: string[]
          floor_id?: string
          id?: string
          label?: string
          status?: Database["public"]["Enums"]["deskflow_desk_status"]
          updated_at?: string
          x_position?: string
          y_position?: string
        }
        Relationships: [
          {
            foreignKeyName: "deskflow_desks_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "deskflow_floors"
            referencedColumns: ["id"]
          },
        ]
      }
      deskflow_floors: {
        Row: {
          capacity_limit: number
          company_id: string
          created_at: string
          id: string
          location: string
          name: string
          updated_at: string
        }
        Insert: {
          capacity_limit: number
          company_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          updated_at?: string
        }
        Update: {
          capacity_limit?: number
          company_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deskflow_floors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "deskflow_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          company_id: string
          created_at: string
          doc_month: number | null
          doc_type: string
          doc_year: number | null
          employee_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          title: string
          updated_at: string
          uploaded_by: string
          uploaded_by_name: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          doc_month?: number | null
          doc_type: string
          doc_year?: number | null
          employee_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
          uploaded_by_name?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          doc_month?: number | null
          doc_type?: string
          doc_year?: number | null
          employee_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          uploaded_by_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      employee_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string
          created_at: string
          employee_email: string
          employee_name: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id: string
          created_at?: string
          employee_email: string
          employee_name: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string
          created_at?: string
          employee_email?: string
          employee_name?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_kyc: {
        Row: {
          aadhar_number: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_ifsc: string | null
          bank_name: string | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          pan_number: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          aadhar_number?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          pan_number?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          aadhar_number?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          pan_number?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      employee_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          department_id: string | null
          display_name: string
          email: string | null
          employee_code: string | null
          exit_checklist: Json | null
          exit_status: string | null
          id: string
          last_working_day: string | null
          manager_id: string | null
          phone: string | null
          photo_url: string | null
          project_id: string | null
          resignation_date: string | null
          status: string
          uan_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          department_id?: string | null
          display_name: string
          email?: string | null
          employee_code?: string | null
          exit_checklist?: Json | null
          exit_status?: string | null
          id?: string
          last_working_day?: string | null
          manager_id?: string | null
          phone?: string | null
          photo_url?: string | null
          project_id?: string | null
          resignation_date?: string | null
          status?: string
          uan_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          department_id?: string | null
          display_name?: string
          email?: string | null
          employee_code?: string | null
          exit_checklist?: Json | null
          exit_status?: string | null
          id?: string
          last_working_day?: string | null
          manager_id?: string | null
          phone?: string | null
          photo_url?: string | null
          project_id?: string | null
          resignation_date?: string | null
          status?: string
          uan_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          company_id: string
          created_at: string
          days: number
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_name: string | null
          reviewer_note: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days?: number
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_name?: string | null
          reviewer_note?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days?: number
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_name?: string | null
          reviewer_note?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_profiles: {
        Row: {
          annual_ctc: number
          basic: number
          company_id: string
          created_at: string
          effective_from: string
          employee_id: string
          hra: number
          id: string
          notes: string | null
          other_allowance: number
          other_deduction: number
          pf_deduction: number
          professional_tax: number
          special_allowance: number
          tax_regime: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          annual_ctc?: number
          basic?: number
          company_id: string
          created_at?: string
          effective_from?: string
          employee_id: string
          hra?: number
          id?: string
          notes?: string | null
          other_allowance?: number
          other_deduction?: number
          pf_deduction?: number
          professional_tax?: number
          special_allowance?: number
          tax_regime?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          annual_ctc?: number
          basic?: number
          company_id?: string
          created_at?: string
          effective_from?: string
          employee_id?: string
          hra?: number
          id?: string
          notes?: string | null
          other_allowance?: number
          other_deduction?: number
          pf_deduction?: number
          professional_tax?: number
          special_allowance?: number
          tax_regime?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      support_ticket_comments: {
        Row: {
          attachments: string[]
          author_name: string
          author_user_id: string
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          attachments?: string[]
          author_name: string
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          attachments?: string[]
          author_name?: string
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_group: string | null
          assignee_name: string | null
          assignee_user_id: string | null
          category: string | null
          closed_at: string | null
          company_id: string
          contact_type: string | null
          created_at: string
          created_by: string
          description: string
          hold_reason: string | null
          id: string
          location: string | null
          opened_for: string | null
          priority: Database["public"]["Enums"]["support_ticket_priority"]
          requester_email: string | null
          requester_name: string
          resolution: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["support_ticket_status"]
          subcategory: string | null
          subject: string
          ticket_number: string
          ticket_type: Database["public"]["Enums"]["support_ticket_type"]
          updated_at: string
        }
        Insert: {
          assigned_group?: string | null
          assignee_name?: string | null
          assignee_user_id?: string | null
          category?: string | null
          closed_at?: string | null
          company_id: string
          contact_type?: string | null
          created_at?: string
          created_by: string
          description: string
          hold_reason?: string | null
          id?: string
          location?: string | null
          opened_for?: string | null
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          requester_email?: string | null
          requester_name: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subcategory?: string | null
          subject: string
          ticket_number: string
          ticket_type?: Database["public"]["Enums"]["support_ticket_type"]
          updated_at?: string
        }
        Update: {
          assigned_group?: string | null
          assignee_name?: string | null
          assignee_user_id?: string | null
          category?: string | null
          closed_at?: string | null
          company_id?: string
          contact_type?: string | null
          created_at?: string
          created_by?: string
          description?: string
          hold_reason?: string | null
          id?: string
          location?: string | null
          opened_for?: string | null
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          requester_email?: string | null
          requester_name?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subcategory?: string | null
          subject?: string
          ticket_number?: string
          ticket_type?: Database["public"]["Enums"]["support_ticket_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_employee_invite: {
        Args: { _display_name?: string; _email?: string; _invite_token: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          department_id: string | null
          display_name: string
          email: string | null
          employee_code: string | null
          exit_checklist: Json | null
          exit_status: string | null
          id: string
          last_working_day: string | null
          manager_id: string | null
          phone: string | null
          photo_url: string | null
          project_id: string | null
          resignation_date: string | null
          status: string
          uan_number: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "employee_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_company: {
        Args: { _company_id: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          name: string
          organization_code: string
          postal_code: string | null
          state: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "company_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_employee: {
        Args: { _employee_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          department_id: string | null
          display_name: string
          email: string | null
          employee_code: string | null
          exit_checklist: Json | null
          exit_status: string | null
          id: string
          last_working_day: string | null
          manager_id: string | null
          phone: string | null
          photo_url: string | null
          project_id: string | null
          resignation_date: string | null
          status: string
          uan_number: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "employee_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      attach_user_to_employee_record: {
        Args: { _employee_email: string; _organization_code: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          department_id: string | null
          display_name: string
          email: string | null
          employee_code: string | null
          exit_checklist: Json | null
          exit_status: string | null
          id: string
          last_working_day: string | null
          manager_id: string | null
          phone: string | null
          photo_url: string | null
          project_id: string | null
          resignation_date: string | null
          status: string
          uan_number: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "employee_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_desk_reservation: {
        Args: {
          _area: string
          _booking_date: string
          _company_id: string
          _desk_label: string
          _floor: string
          _notes?: string
          _time_slot: string
          _user_name: string
        }
        Returns: {
          area: string
          booking_date: string
          company_id: string
          created_at: string
          desk_label: string
          floor: string | null
          id: string
          notes: string | null
          slot_end_hour: number | null
          slot_start_hour: number | null
          status: string
          time_slot: string
          updated_at: string
          user_id: string
          user_name: string
        }
        SetofOptions: {
          from: "*"
          to: "desk_reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_employee_invite: {
        Args: {
          _company_id: string
          _employee_email: string
          _employee_name: string
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string
          created_at: string
          employee_email: string
          employee_name: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "employee_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      desk_reservation_json_text: {
        Args: { _key: string; _notes: string }
        Returns: string
      }
      desk_reservation_shift_end: {
        Args: { _time_slot: string }
        Returns: number
      }
      desk_reservation_shift_start: {
        Args: { _time_slot: string }
        Returns: number
      }
      deskflow_book_desk: {
        Args: {
          _client_session_id: string
          _desk_id: string
          _time_slot: string
        }
        Returns: {
          booked_at: string
          client_session_id: string
          created_at: string
          desk_id: string
          id: string
          status: Database["public"]["Enums"]["deskflow_booking_status"]
          time_slot: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deskflow_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_employee_code: { Args: { _company_id: string }; Returns: string }
      generate_support_ticket_number: { Args: never; Returns: string }
      get_platform_stats: { Args: never; Returns: Json }
      grant_super_admin: { Args: { _email: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      join_company_profile: {
        Args: {
          _display_name: string
          _email?: string
          _organization_code: string
        }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          name: string
          organization_code: string
          postal_code: string | null
          state: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "company_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      lookup_company_by_code: {
        Args: { _organization_code: string }
        Returns: {
          id: string
          name: string
          organization_code: string
        }[]
      }
      lookup_employee_for_login: {
        Args: { _identifier: string; _organization_code: string }
        Returns: {
          company_id: string
          company_name: string
          display_name: string
          employee_email: string
        }[]
      }
      register_company_profile: {
        Args: {
          _company_name: string
          _display_name: string
          _domain?: string
          _email?: string
          _organization_code: string
        }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          name: string
          organization_code: string
          postal_code: string | null
          state: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "company_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_expired_desk_reservations: {
        Args: { _company_id: string }
        Returns: number
      }
      revoke_super_admin: { Args: { _user_id: string }; Returns: boolean }
      signup_employee_record: {
        Args: {
          _company_name: string
          _display_name: string
          _employee_email: string
          _organization_code: string
          _phone?: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          department_id: string | null
          display_name: string
          email: string | null
          employee_code: string | null
          exit_checklist: Json | null
          exit_status: string | null
          id: string
          last_working_day: string | null
          manager_id: string | null
          phone: string | null
          photo_url: string | null
          project_id: string | null
          resignation_date: string | null
          status: string
          uan_number: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "employee_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      suspend_company: {
        Args: { _company_id: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          name: string
          organization_code: string
          postal_code: string | null
          state: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "company_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      suspend_employee: {
        Args: { _employee_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          department_id: string | null
          display_name: string
          email: string | null
          employee_code: string | null
          exit_checklist: Json | null
          exit_status: string | null
          id: string
          last_working_day: string | null
          manager_id: string | null
          phone: string | null
          photo_url: string | null
          project_id: string | null
          resignation_date: string | null
          status: string
          uan_number: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "employee_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
      deskflow_booking_status:
        | "confirmed"
        | "checked_in"
        | "released"
        | "cancelled"
      deskflow_desk_status: "available" | "occupied"
      support_ticket_priority: "P1" | "P2" | "P3" | "P4"
      support_ticket_status:
        | "new"
        | "open"
        | "in_progress"
        | "on_hold"
        | "resolved"
        | "closed"
        | "cancelled"
      support_ticket_type: "incident" | "request"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "super_admin"],
      deskflow_booking_status: [
        "confirmed",
        "checked_in",
        "released",
        "cancelled",
      ],
      deskflow_desk_status: ["available", "occupied"],
      support_ticket_priority: ["P1", "P2", "P3", "P4"],
      support_ticket_status: [
        "new",
        "open",
        "in_progress",
        "on_hold",
        "resolved",
        "closed",
        "cancelled",
      ],
      support_ticket_type: ["incident", "request"],
    },
  },
} as const
