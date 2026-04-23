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
      company_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          name: string
          organization_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          name: string
          organization_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          name?: string
          organization_code?: string
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
      employee_profiles: {
        Row: {
          company_id: string
          created_at: string
          display_name: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          company_id: string
          created_at: string
          display_name: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "employee_profiles"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
      join_company_profile: {
        Args: {
          _display_name: string
          _email?: string
          _organization_code: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          name: string
          organization_code: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "company_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
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
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          name: string
          organization_code: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "company_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      deskflow_booking_status:
        | "confirmed"
        | "checked_in"
        | "released"
        | "cancelled"
      deskflow_desk_status: "available" | "occupied"
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
      app_role: ["admin", "moderator", "user"],
      deskflow_booking_status: [
        "confirmed",
        "checked_in",
        "released",
        "cancelled",
      ],
      deskflow_desk_status: ["available", "occupied"],
    },
  },
} as const
