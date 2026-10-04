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
      agenda: {
        Row: {
          created_at: string
          id: number
          kode: string | null
          legacy_id: string | null
          nama_agenda: string
          pic: string | null
          status: string
          tanggal: string
          tipe: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          kode?: string | null
          legacy_id?: string | null
          nama_agenda: string
          pic?: string | null
          status?: string
          tanggal: string
          tipe?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          kode?: string | null
          legacy_id?: string | null
          nama_agenda?: string
          pic?: string | null
          status?: string
          tanggal?: string
          tipe?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      berani_document_rows: {
        Row: {
          created_at: string
          data: Json
          document_id: number
          id: number
          row_index: number
        }
        Insert: {
          created_at?: string
          data?: Json
          document_id: number
          id?: number
          row_index: number
        }
        Update: {
          created_at?: string
          data?: Json
          document_id?: number
          id?: number
          row_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "berani_document_rows_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "berani_update_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      berani_programs: {
        Row: {
          active: boolean
          created_at: string
          id: number
          name: string
          slug: string
          sort_order: number
          summary: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: number
          name: string
          slug: string
          sort_order?: number
          summary?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: number
          name?: string
          slug?: string
          sort_order?: number
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      berani_update_documents: {
        Row: {
          columns: Json
          created_at: string
          display_title: string | null
          document_kind: string | null
          extracted_text: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          id: number
          metadata: Json
          mime_type: string | null
          row_count: number
          sheet_name: string | null
          summary: string | null
          update_id: number
        }
        Insert: {
          columns?: Json
          created_at?: string
          display_title?: string | null
          document_kind?: string | null
          extracted_text?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          id?: number
          metadata?: Json
          mime_type?: string | null
          row_count?: number
          sheet_name?: string | null
          summary?: string | null
          update_id: number
        }
        Update: {
          columns?: Json
          created_at?: string
          display_title?: string | null
          document_kind?: string | null
          extracted_text?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          id?: number
          metadata?: Json
          mime_type?: string | null
          row_count?: number
          sheet_name?: string | null
          summary?: string | null
          update_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "berani_update_documents_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "berani_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      berani_update_rows: {
        Row: {
          created_at: string
          data: Json
          id: number
          row_index: number
          update_id: number
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: number
          row_index: number
          update_id: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: number
          row_index?: number
          update_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "berani_update_rows_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "berani_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      berani_update_sections: {
        Row: {
          created_at: string
          document_id: number | null
          id: number
          payload: Json
          section_key: string | null
          section_type: string
          sort_order: number
          title: string
          update_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id?: number | null
          id?: number
          payload?: Json
          section_key?: string | null
          section_type: string
          sort_order?: number
          title: string
          update_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: number | null
          id?: number
          payload?: Json
          section_key?: string | null
          section_type?: string
          sort_order?: number
          title?: string
          update_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "berani_update_sections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "berani_update_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "berani_update_sections_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "berani_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      berani_updates: {
        Row: {
          columns: Json
          created_at: string
          extracted_text: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: number
          mime_type: string | null
          opd_name: string | null
          period_label: string | null
          program_id: number
          row_count: number
          sheet_name: string | null
          source_key: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          extracted_text?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: number
          mime_type?: string | null
          opd_name?: string | null
          period_label?: string | null
          program_id: number
          row_count?: number
          sheet_name?: string | null
          source_key?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          columns?: Json
          created_at?: string
          extracted_text?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: number
          mime_type?: string | null
          opd_name?: string | null
          period_label?: string | null
          program_id?: number
          row_count?: number
          sheet_name?: string | null
          source_key?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "berani_updates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "berani_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_references: {
        Row: {
          berani_program_id: number | null
          created_at: string
          detail: string | null
          id: number
          key_facts: string | null
          opd_name: string
          program_label: string | null
          reference_urls: Json
          sort_order: number
          source_key: string | null
          source_label: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          berani_program_id?: number | null
          created_at?: string
          detail?: string | null
          id?: number
          key_facts?: string | null
          opd_name: string
          program_label?: string | null
          reference_urls?: Json
          sort_order?: number
          source_key?: string | null
          source_label?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          berani_program_id?: number | null
          created_at?: string
          detail?: string | null
          id?: number
          key_facts?: string | null
          opd_name?: string
          program_label?: string | null
          reference_urls?: Json
          sort_order?: number
          source_key?: string | null
          source_label?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_references_berani_program_id_fkey"
            columns: ["berani_program_id"]
            isOneToOne: false
            referencedRelation: "berani_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_notes: {
        Row: {
          content: string
          created_at: string
          entity_key: string
          feature_key: string
          id: number
          title: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          entity_key?: string
          feature_key: string
          id?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          entity_key?: string
          feature_key?: string
          id?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      isu_strategis: {
        Row: {
          created_at: string
          id: number
          kode: string | null
          legacy_id: string | null
          nama_isu: string
          opd_terkait: string | null
          prioritas: string | null
          ringkasan: string | null
          status_monitoring: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          kode?: string | null
          legacy_id?: string | null
          nama_isu: string
          opd_terkait?: string | null
          prioritas?: string | null
          ringkasan?: string | null
          status_monitoring?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          kode?: string | null
          legacy_id?: string | null
          nama_isu?: string
          opd_terkait?: string | null
          prioritas?: string | null
          ringkasan?: string | null
          status_monitoring?: string
          updated_at?: string
        }
        Relationships: []
      }
      kunjungan: {
        Row: {
          anggota_tim: string | null
          created_at: string
          id: number
          kode: string | null
          legacy_id: string | null
          link_notulen: string | null
          nama_opd: string
          notulen_pdf_name: string | null
          notulen_pdf_path: string | null
          notulen_text: string | null
          pejabat: string | null
          source_key: string | null
          status: string
          tanggal: string
          tanggal_estimasi: boolean
          tanggal_sumber: string | null
          topik: string
          updated_at: string
        }
        Insert: {
          anggota_tim?: string | null
          created_at?: string
          id?: number
          kode?: string | null
          legacy_id?: string | null
          link_notulen?: string | null
          nama_opd: string
          notulen_pdf_name?: string | null
          notulen_pdf_path?: string | null
          notulen_text?: string | null
          pejabat?: string | null
          source_key?: string | null
          status?: string
          tanggal: string
          tanggal_estimasi?: boolean
          tanggal_sumber?: string | null
          topik: string
          updated_at?: string
        }
        Update: {
          anggota_tim?: string | null
          created_at?: string
          id?: number
          kode?: string | null
          legacy_id?: string | null
          link_notulen?: string | null
          nama_opd?: string
          notulen_pdf_name?: string | null
          notulen_pdf_path?: string | null
          notulen_text?: string | null
          pejabat?: string | null
          source_key?: string | null
          status?: string
          tanggal?: string
          tanggal_estimasi?: boolean
          tanggal_sumber?: string | null
          topik?: string
          updated_at?: string
        }
        Relationships: []
      }
      kunjungan_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string | null
          file_size: number | null
          id: number
          kunjungan_id: number
          mime_type: string
          source_type: string
          source_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path?: string | null
          file_size?: number | null
          id?: number
          kunjungan_id: number
          mime_type?: string
          source_type?: string
          source_url?: string | null
          title?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          id?: number
          kunjungan_id?: number
          mime_type?: string
          source_type?: string
          source_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "kunjungan_documents_kunjungan_id_fkey"
            columns: ["kunjungan_id"]
            isOneToOne: false
            referencedRelation: "kunjungan"
            referencedColumns: ["id"]
          },
        ]
      }
      media_monitoring: {
        Row: {
          berani_program_id: number | null
          created_at: string
          id: number
          issue_category: string
          judul_berita: string
          kode: string | null
          legacy_id: string | null
          link_berita: string | null
          nama_media: string | null
          opd_name: string | null
          sentimen: string
          tanggal: string
          updated_at: string
        }
        Insert: {
          berani_program_id?: number | null
          created_at?: string
          id?: number
          issue_category?: string
          judul_berita: string
          kode?: string | null
          legacy_id?: string | null
          link_berita?: string | null
          nama_media?: string | null
          opd_name?: string | null
          sentimen?: string
          tanggal: string
          updated_at?: string
        }
        Update: {
          berani_program_id?: number | null
          created_at?: string
          id?: number
          issue_category?: string
          judul_berita?: string
          kode?: string | null
          legacy_id?: string | null
          link_berita?: string | null
          nama_media?: string | null
          opd_name?: string | null
          sentimen?: string
          tanggal?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_monitoring_berani_program_id_fkey"
            columns: ["berani_program_id"]
            isOneToOne: false
            referencedRelation: "berani_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      opd_aliases: {
        Row: {
          alias: string
          alias_normalized: string | null
          created_at: string
          id: number
          opd_id: number
        }
        Insert: {
          alias: string
          alias_normalized?: string | null
          created_at?: string
          id?: number
          opd_id: number
        }
        Update: {
          alias?: string
          alias_normalized?: string | null
          created_at?: string
          id?: number
          opd_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "opd_aliases_opd_id_fkey"
            columns: ["opd_id"]
            isOneToOne: false
            referencedRelation: "opd_master"
            referencedColumns: ["id"]
          },
        ]
      }
      opd_finding_documents: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_name: string
          file_path: string
          file_size: number | null
          finding_id: number
          id: number
          mime_type: string | null
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          finding_id: number
          id?: number
          mime_type?: string | null
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          finding_id?: number
          id?: number
          mime_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opd_finding_documents_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "opd_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      opd_findings: {
        Row: {
          berani_program_id: number | null
          category: string
          created_at: string
          detail: string | null
          finding_date: string
          id: number
          opd_name: string
          source_label: string | null
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          berani_program_id?: number | null
          category?: string
          created_at?: string
          detail?: string | null
          finding_date?: string
          id?: number
          opd_name: string
          source_label?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          berani_program_id?: number | null
          category?: string
          created_at?: string
          detail?: string | null
          finding_date?: string
          id?: number
          opd_name?: string
          source_label?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opd_findings_berani_program_id_fkey"
            columns: ["berani_program_id"]
            isOneToOne: false
            referencedRelation: "berani_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      opd_master: {
        Row: {
          acronym: string | null
          active: boolean
          created_at: string
          display_name: string
          entity_type: string
          id: number
          official_name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          acronym?: string | null
          active?: boolean
          created_at?: string
          display_name: string
          entity_type?: string
          id?: number
          official_name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          acronym?: string | null
          active?: boolean
          created_at?: string
          display_name?: string
          entity_type?: string
          id?: number
          official_name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      rekomendasi: {
        Row: {
          created_at: string
          id: number
          judul: string
          kode: string | null
          legacy_id: string | null
          link_doc: string | null
          opd_terkait: string | null
          pic: string | null
          ringkasan: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          judul: string
          kode?: string | null
          legacy_id?: string | null
          link_doc?: string | null
          opd_terkait?: string | null
          pic?: string | null
          ringkasan?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          judul?: string
          kode?: string | null
          legacy_id?: string | null
          link_doc?: string | null
          opd_terkait?: string | null
          pic?: string | null
          ringkasan?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      renstra_documents: {
        Row: {
          created_at: string
          drive_file_id: string | null
          file_size: number | null
          id: number
          is_primary: boolean
          mime_type: string
          renstra_opd_id: number
          sort_order: number
          source_url: string
          title: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          file_size?: number | null
          id?: never
          is_primary?: boolean
          mime_type: string
          renstra_opd_id: number
          sort_order?: number
          source_url: string
          title: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          file_size?: number | null
          id?: never
          is_primary?: boolean
          mime_type?: string
          renstra_opd_id?: number
          sort_order?: number
          source_url?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "renstra_documents_renstra_opd_id_fkey"
            columns: ["renstra_opd_id"]
            isOneToOne: false
            referencedRelation: "renstra_opd"
            referencedColumns: ["id"]
          },
        ]
      }
      renstra_opd: {
        Row: {
          active: boolean
          aliases: string[]
          created_at: string
          document_count: number
          id: number
          opd_name: string
          period_end: number | null
          period_label: string | null
          period_start: number | null
          short_name: string
          slug: string
          sort_order: number
          source_drive_id: string | null
          source_kind: string
          source_title: string
          source_url: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          aliases?: string[]
          created_at?: string
          document_count?: number
          id?: never
          opd_name: string
          period_end?: number | null
          period_label?: string | null
          period_start?: number | null
          short_name: string
          slug: string
          sort_order?: number
          source_drive_id?: string | null
          source_kind: string
          source_title: string
          source_url: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          aliases?: string[]
          created_at?: string
          document_count?: number
          id?: never
          opd_name?: string
          period_end?: number | null
          period_label?: string | null
          period_start?: number | null
          short_name?: string
          slug?: string
          sort_order?: number
          source_drive_id?: string | null
          source_kind?: string
          source_title?: string
          source_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      tim_analisis: {
        Row: {
          active: boolean
          bio: string | null
          created_at: string
          cv_path: string | null
          cv_url: string | null
          id: number
          kode: string | null
          legacy_id: string | null
          link_cv: string | null
          link_foto: string | null
          nama: string
          peran: string | null
          photo_path: string | null
          photo_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          created_at?: string
          cv_path?: string | null
          cv_url?: string | null
          id?: number
          kode?: string | null
          legacy_id?: string | null
          link_cv?: string | null
          link_foto?: string | null
          nama: string
          peran?: string | null
          photo_path?: string | null
          photo_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          created_at?: string
          cv_path?: string | null
          cv_url?: string | null
          id?: number
          kode?: string | null
          legacy_id?: string | null
          link_cv?: string | null
          link_foto?: string | null
          nama?: string
          peran?: string | null
          photo_path?: string | null
          photo_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_overview: {
        Row: {
          isu_rendah: number | null
          isu_sedang: number | null
          isu_tinggi: number | null
          media_negatif: number | null
          media_netral: number | null
          media_positif: number | null
          total_agenda: number | null
          total_isu: number | null
          total_kunjungan: number | null
          total_media: number | null
          total_policy_brief: number | null
          total_tim: number | null
        }
        Relationships: []
      }
      dashboard_stats: {
        Row: {
          total_agenda: number | null
          total_isu: number | null
          total_kunjungan: number | null
          total_media: number | null
          total_policy_brief: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ah_admin_change_pin: { Args: { p_new_pin: string }; Returns: boolean }
      ah_admin_login: {
        Args: { p_pin: string }
        Returns: {
          error_code: string
          expires_at: string
          session_token: string
          success: boolean
        }[]
      }
      ah_admin_logout: { Args: never; Returns: boolean }
      ah_admin_session_check: { Args: never; Returns: boolean }
      canonical_opd_name: { Args: { input_name: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
