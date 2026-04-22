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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
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
