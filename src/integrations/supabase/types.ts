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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      goal_store_targets: {
        Row: {
          current_value: number | null
          goal_id: string
          id: string
          store_id: string
          target_value: number
        }
        Insert: {
          current_value?: number | null
          goal_id: string
          id?: string
          store_id: string
          target_value: number
        }
        Update: {
          current_value?: number | null
          goal_id?: string
          id?: string
          store_id?: string
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_store_targets_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_store_targets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number | null
          description: string | null
          end_date: string
          goal_type: string
          id: string
          is_active: boolean | null
          start_date: string
          target_value: number
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          end_date: string
          goal_type: string
          id?: string
          is_active?: boolean | null
          start_date: string
          target_value: number
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          end_date?: string
          goal_type?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_replies: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reply_text: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reply_text: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reply_text?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_replies_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      message_store_targets: {
        Row: {
          acknowledged_at: string | null
          id: string
          is_acknowledged: boolean | null
          is_read: boolean | null
          message_id: string
          read_at: string | null
          store_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          id?: string
          is_acknowledged?: boolean | null
          is_read?: boolean | null
          message_id: string
          read_at?: string | null
          store_id: string
        }
        Update: {
          acknowledged_at?: string | null
          id?: string
          is_acknowledged?: boolean | null
          is_read?: boolean | null
          message_id?: string
          read_at?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_store_targets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_store_targets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          message_type: Database["public"]["Enums"]["message_type"]
          require_acknowledgment: boolean | null
          sender_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          require_acknowledgment?: boolean | null
          sender_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          require_acknowledgment?: boolean | null
          sender_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_daily_performance: {
        Row: {
          actual_sales: number | null
          created_at: string
          date: string
          id: string
          store_id: string
          target_sales: number | null
          updated_at: string
        }
        Insert: {
          actual_sales?: number | null
          created_at?: string
          date?: string
          id?: string
          store_id: string
          target_sales?: number | null
          updated_at?: string
        }
        Update: {
          actual_sales?: number | null
          created_at?: string
          date?: string
          id?: string
          store_id?: string
          target_sales?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_daily_performance_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          region: string | null
          store_code: string
          store_name: string
          store_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          region?: string | null
          store_code: string
          store_name: string
          store_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          region?: string | null
          store_code?: string
          store_name?: string
          store_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_checklist_items: {
        Row: {
          created_at: string
          id: string
          item_text: string
          order_index: number | null
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_text: string
          order_index?: number | null
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_text?: string
          order_index?: number | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_proofs: {
        Row: {
          created_at: string
          id: string
          proof_type: string
          proof_url: string | null
          proof_value: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["proof_status"] | null
          task_assignment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proof_type: string
          proof_url?: string | null
          proof_value?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["proof_status"] | null
          task_assignment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proof_type?: string
          proof_url?: string | null
          proof_value?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["proof_status"] | null
          task_assignment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_proofs_task_assignment_id_fkey"
            columns: ["task_assignment_id"]
            isOneToOne: false
            referencedRelation: "task_store_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      task_store_assignments: {
        Row: {
          completed_at: string | null
          id: string
          is_on_time: boolean | null
          status: Database["public"]["Enums"]["task_status"] | null
          store_id: string
          task_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_on_time?: boolean | null
          status?: Database["public"]["Enums"]["task_status"] | null
          store_id: string
          task_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_on_time?: boolean | null
          status?: Database["public"]["Enums"]["task_status"] | null
          store_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_store_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          campaign_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          is_campaign: boolean | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          recurrence: Database["public"]["Enums"]["task_recurrence"] | null
          require_checklist: boolean | null
          require_comments: boolean | null
          require_numeric_input: boolean | null
          require_photo: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_campaign?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          recurrence?: Database["public"]["Enums"]["task_recurrence"] | null
          require_checklist?: boolean | null
          require_comments?: boolean | null
          require_numeric_input?: boolean | null
          require_photo?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          campaign_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_campaign?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          recurrence?: Database["public"]["Enums"]["task_recurrence"] | null
          require_checklist?: boolean | null
          require_comments?: boolean | null
          require_numeric_input?: boolean | null
          require_photo?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_store_access: {
        Row: {
          can_access_all_stores: boolean | null
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          can_access_all_stores?: boolean | null
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          can_access_all_stores?: boolean | null
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_store: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_store_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "hq_admin" | "hq_staff" | "area_manager" | "performance_viewer"
      message_type: "announcement" | "actionable"
      proof_status: "pending_approval" | "approved" | "rejected"
      task_priority: "low" | "medium" | "high" | "critical"
      task_recurrence: "none" | "daily" | "weekly" | "monthly"
      task_status: "pending" | "in_progress" | "completed" | "overdue"
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
      app_role: ["hq_admin", "hq_staff", "area_manager", "performance_viewer"],
      message_type: ["announcement", "actionable"],
      proof_status: ["pending_approval", "approved", "rejected"],
      task_priority: ["low", "medium", "high", "critical"],
      task_recurrence: ["none", "daily", "weekly", "monthly"],
      task_status: ["pending", "in_progress", "completed", "overdue"],
    },
  },
} as const
