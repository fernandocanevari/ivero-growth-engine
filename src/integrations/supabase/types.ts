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
      analysis_history: {
        Row: {
          authority_score: number
          clarity_score: number
          conversion_score: number
          created_at: string
          experience_score: number
          id: string
          keyword_cloud: Json
          overall_score: number
          perception_snapshot: Json
          positioning_score: number
          user_id: string
        }
        Insert: {
          authority_score?: number
          clarity_score?: number
          conversion_score?: number
          created_at?: string
          experience_score?: number
          id?: string
          keyword_cloud?: Json
          overall_score?: number
          perception_snapshot?: Json
          positioning_score?: number
          user_id: string
        }
        Update: {
          authority_score?: number
          clarity_score?: number
          conversion_score?: number
          created_at?: string
          experience_score?: number
          id?: string
          keyword_cloud?: Json
          overall_score?: number
          perception_snapshot?: Json
          positioning_score?: number
          user_id?: string
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          asaas_customer_id: string
          asaas_subscription_id: string
          carencia_ate: string | null
          created_at: string
          data_inicio: string
          data_vencimento: string | null
          id: string
          plano: string
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id: string
          asaas_subscription_id: string
          carencia_ate?: string | null
          created_at?: string
          data_inicio?: string
          data_vencimento?: string | null
          id?: string
          plano: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string
          asaas_subscription_id?: string
          carencia_ate?: string | null
          created_at?: string
          data_inicio?: string
          data_vencimento?: string | null
          id?: string
          plano?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_reports: {
        Row: {
          ai_engines: Json
          created_at: string
          id: string
          keyword_cloud: Json
          overall_score: number
          pillar_details: Json
          radar_data: Json
          site_url: string
          source: string
          status_label: string
          user_id: string
        }
        Insert: {
          ai_engines?: Json
          created_at?: string
          id?: string
          keyword_cloud?: Json
          overall_score?: number
          pillar_details?: Json
          radar_data?: Json
          site_url?: string
          source?: string
          status_label?: string
          user_id: string
        }
        Update: {
          ai_engines?: Json
          created_at?: string
          id?: string
          keyword_cloud?: Json
          overall_score?: number
          pillar_details?: Json
          radar_data?: Json
          site_url?: string
          source?: string
          status_label?: string
          user_id?: string
        }
        Relationships: []
      }
      brand_settings: {
        Row: {
          brand_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          coverage_city: string | null
          coverage_region: string | null
          coverage_state: string | null
          coverage_type: string
          created_at: string
          id: string
          logo_url: string
          main_competitor: string
          other_competitors: string
          sector: string
          updated_at: string
          user_id: string | null
          website: string
        }
        Insert: {
          brand_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          coverage_city?: string | null
          coverage_region?: string | null
          coverage_state?: string | null
          coverage_type?: string
          created_at?: string
          id?: string
          logo_url?: string
          main_competitor?: string
          other_competitors?: string
          sector?: string
          updated_at?: string
          user_id?: string | null
          website?: string
        }
        Update: {
          brand_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          coverage_city?: string | null
          coverage_region?: string | null
          coverage_state?: string | null
          coverage_type?: string
          created_at?: string
          id?: string
          logo_url?: string
          main_competitor?: string
          other_competitors?: string
          sector?: string
          updated_at?: string
          user_id?: string | null
          website?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          keywords: string
          mentions: number
          name: string
          objective: string
          score: number
          start_date: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          keywords?: string
          mentions?: number
          name: string
          objective?: string
          score?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          keywords?: string
          mentions?: number
          name?: string
          objective?: string
          score?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      client_onboarding: {
        Row: {
          completed: boolean
          created_at: string
          detail_1: string
          detail_2: string
          detail_3: string
          id: string
          question_1: string
          question_2: string
          question_3: string
          skipped_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          detail_1?: string
          detail_2?: string
          detail_3?: string
          id?: string
          question_1?: string
          question_2?: string
          question_3?: string
          skipped_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          detail_1?: string
          detail_2?: string
          detail_3?: string
          id?: string
          question_1?: string
          question_2?: string
          question_3?: string
          skipped_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_onboarding_progress: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          visited_acoes: boolean
          visited_diagnostico: boolean
          visited_score: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          visited_acoes?: boolean
          visited_diagnostico?: boolean
          visited_score?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          visited_acoes?: boolean
          visited_diagnostico?: boolean
          visited_score?: boolean
        }
        Relationships: []
      }
      generated_content: {
        Row: {
          article_md: string
          context_used: Json
          created_at: string
          faq_json: Json
          formats: string[]
          id: string
          model_used: string
          summary_md: string
          tone: string
          topic: string
          user_id: string
        }
        Insert: {
          article_md?: string
          context_used?: Json
          created_at?: string
          faq_json?: Json
          formats?: string[]
          id?: string
          model_used?: string
          summary_md?: string
          tone?: string
          topic?: string
          user_id: string
        }
        Update: {
          article_md?: string
          context_used?: Json
          created_at?: string
          faq_json?: Json
          formats?: string[]
          id?: string
          model_used?: string
          summary_md?: string
          tone?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          site: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string
          phone?: string
          site?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          site?: string
          source?: string
        }
        Relationships: []
      }
      llms_monitoring: {
        Row: {
          alert_email: string
          alerts_sent: number
          created_at: string
          email_alerts: boolean
          frequency: string
          id: string
          last_check_at: string | null
          last_llms_hash: string | null
          last_site_hash: string | null
          llms_present: boolean | null
          monitored_url: string
          next_check_at: string
          paused: boolean
          pending_alert: boolean
          pending_alert_summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_email?: string
          alerts_sent?: number
          created_at?: string
          email_alerts?: boolean
          frequency?: string
          id?: string
          last_check_at?: string | null
          last_llms_hash?: string | null
          last_site_hash?: string | null
          llms_present?: boolean | null
          monitored_url: string
          next_check_at?: string
          paused?: boolean
          pending_alert?: boolean
          pending_alert_summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_email?: string
          alerts_sent?: number
          created_at?: string
          email_alerts?: boolean
          frequency?: string
          id?: string
          last_check_at?: string | null
          last_llms_hash?: string | null
          last_site_hash?: string | null
          llms_present?: boolean | null
          monitored_url?: string
          next_check_at?: string
          paused?: boolean
          pending_alert?: boolean
          pending_alert_summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      llms_monitoring_checks: {
        Row: {
          changes: Json
          checked_at: string
          created_at: string
          id: string
          monitoring_id: string
          status: string
          user_id: string
        }
        Insert: {
          changes?: Json
          checked_at?: string
          created_at?: string
          id?: string
          monitoring_id: string
          status: string
          user_id: string
        }
        Update: {
          changes?: Json
          checked_at?: string
          created_at?: string
          id?: string
          monitoring_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "llms_monitoring_checks_monitoring_id_fkey"
            columns: ["monitoring_id"]
            isOneToOne: false
            referencedRelation: "llms_monitoring"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          celular: string | null
          created_at: string
          display_name: string | null
          id: string
          is_first_login: boolean
          nome_completo: string | null
          nome_empresa: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          celular?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_first_login?: boolean
          nome_completo?: string | null
          nome_empresa?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          celular?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_first_login?: boolean
          nome_completo?: string | null
          nome_empresa?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      propostas: {
        Row: {
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          created_by: string | null
          diagnostico_snapshot: Json
          empresa_nome: string
          empresa_site: string
          expires_at: string
          id: string
          motivo_recusa_categoria:
            | Database["public"]["Enums"]["proposta_motivo_recusa"]
            | null
          motivo_recusa_texto: string | null
          notas_admin: string
          origem: Database["public"]["Enums"]["proposta_origem"]
          plano_sugerido: Database["public"]["Enums"]["proposta_plano"]
          responded_at: string | null
          score_geral: number
          slug: string
          status: Database["public"]["Enums"]["proposta_status"]
          updated_at: string
          valor_negociado: number | null
          valor_proposto: number
          viewed_at: string | null
        }
        Insert: {
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          created_by?: string | null
          diagnostico_snapshot?: Json
          empresa_nome?: string
          empresa_site?: string
          expires_at?: string
          id?: string
          motivo_recusa_categoria?:
            | Database["public"]["Enums"]["proposta_motivo_recusa"]
            | null
          motivo_recusa_texto?: string | null
          notas_admin?: string
          origem?: Database["public"]["Enums"]["proposta_origem"]
          plano_sugerido?: Database["public"]["Enums"]["proposta_plano"]
          responded_at?: string | null
          score_geral?: number
          slug: string
          status?: Database["public"]["Enums"]["proposta_status"]
          updated_at?: string
          valor_negociado?: number | null
          valor_proposto?: number
          viewed_at?: string | null
        }
        Update: {
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          created_by?: string | null
          diagnostico_snapshot?: Json
          empresa_nome?: string
          empresa_site?: string
          expires_at?: string
          id?: string
          motivo_recusa_categoria?:
            | Database["public"]["Enums"]["proposta_motivo_recusa"]
            | null
          motivo_recusa_texto?: string | null
          notas_admin?: string
          origem?: Database["public"]["Enums"]["proposta_origem"]
          plano_sugerido?: Database["public"]["Enums"]["proposta_plano"]
          responded_at?: string | null
          score_geral?: number
          slug?: string
          status?: Database["public"]["Enums"]["proposta_status"]
          updated_at?: string
          valor_negociado?: number | null
          valor_proposto?: number
          viewed_at?: string | null
        }
        Relationships: []
      }
      simulation_results: {
        Row: {
          autoridade: number | null
          clareza: number | null
          conversao: number | null
          created_at: string
          experiencia: number | null
          id: string
          posicionamento: number | null
          resumo: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          autoridade?: number | null
          clareza?: number | null
          conversao?: number | null
          created_at?: string
          experiencia?: number | null
          id?: string
          posicionamento?: number | null
          resumo?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          autoridade?: number | null
          clareza?: number | null
          conversao?: number | null
          created_at?: string
          experiencia?: number | null
          id?: string
          posicionamento?: number | null
          resumo?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      proposta_motivo_recusa:
        | "preco"
        | "momento"
        | "concorrente"
        | "sem_fit"
        | "sem_resposta"
        | "outro"
      proposta_origem: "preview" | "convite"
      proposta_plano: "presenca" | "influencia" | "autoridade" | "dominio"
      proposta_status:
        | "enviada"
        | "visualizada"
        | "em_negociacao"
        | "aceita"
        | "recusada"
        | "expirada"
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
      proposta_motivo_recusa: [
        "preco",
        "momento",
        "concorrente",
        "sem_fit",
        "sem_resposta",
        "outro",
      ],
      proposta_origem: ["preview", "convite"],
      proposta_plano: ["presenca", "influencia", "autoridade", "dominio"],
      proposta_status: [
        "enviada",
        "visualizada",
        "em_negociacao",
        "aceita",
        "recusada",
        "expirada",
      ],
    },
  },
} as const
