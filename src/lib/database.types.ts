import type { Space, SpaceMembership } from "@/features/spaces/space.types";
import type { DevelopmentAttachment } from "@/features/attachments/attachment.types";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      spaces: { Row: Space; Insert: never; Update: never; Relationships: [] };
      space_members: { Row: SpaceMembership; Insert: never; Update: never; Relationships: [] };
      platform_admins: { Row: { user_id: string }; Insert: never; Update: never; Relationships: [] };
      space_copy_jobs: { Row: { id: string; source_kind: string; source_id: string; source_space_id: string; target_space_id: string; created_by: string; status: string; result: Json; created_at: string; completed_at: string | null }; Insert: never; Update: never; Relationships: [] };

      development_attachments: {
        Row: DevelopmentAttachment;
        Insert: {
          id?: string; development_id: string; user_id: string; space_id?: string; file_name: string;
          content_type?: string; size_bytes: number; status?: "pending" | "ready";
          created_at?: string; deleted_at?: string | null;
        };
        Update: { status?: "pending" | "ready"; deleted_at?: string | null };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          space_id: string;
          id: string;
          user_id: string;
          name: string;
          code: string | null;
          description: string | null;
          instance_url: string | null;
          environment: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          space_id?: string;
          id?: string;
          user_id: string;
          name: string;
          code?: string | null;
          description?: string | null;
          instance_url?: string | null;
          environment?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          code?: string | null;
          description?: string | null;
          instance_url?: string | null;
          environment?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stories: {
        Row: {
          space_id: string;
          id: string;
          user_id: string;
          client_id: string;
          reference: string | null;
          title: string;
          description: string | null;
          functional_need: string | null;
          technical_solution: string | null;
          status: string;
          priority: string | null;
          estimated_uo: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          space_id?: string;
          id?: string;
          user_id: string;
          client_id: string;
          reference?: string | null;
          title: string;
          description?: string | null;
          functional_need?: string | null;
          technical_solution?: string | null;
          status?: string;
          priority?: string | null;
          estimated_uo?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reference?: string | null;
          title?: string;
          description?: string | null;
          functional_need?: string | null;
          technical_solution?: string | null;
          status?: string;
          priority?: string | null;
          estimated_uo?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      developments: {
        Row: {
          space_id: string;
          id: string;
          user_id: string;
          story_id: string;
          client_id: string;
          title: string;
          development_type: string;
          target_table: string | null;
          application_scope: string | null;
          update_set: string | null;
          short_description: string | null;
          technical_notes: string | null;
          status: string;
          config: Json;
          raw_xml: string | null;
          xml_import_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          space_id?: string;
          id?: string;
          user_id: string;
          story_id: string;
          client_id: string;
          title: string;
          development_type: string;
          target_table?: string | null;
          application_scope?: string | null;
          update_set?: string | null;
          short_description?: string | null;
          technical_notes?: string | null;
          status?: string;
          config?: Json;
          raw_xml?: string | null;
          xml_import_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          development_type?: string;
          target_table?: string | null;
          application_scope?: string | null;
          update_set?: string | null;
          short_description?: string | null;
          technical_notes?: string | null;
          status?: string;
          config?: Json;
          raw_xml?: string | null;
          xml_import_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      xml_imports: {
        Row: {
          space_id: string;
          id: string;
          user_id: string;
          client_id: string | null;
          story_id: string | null;
          filename: string;
          raw_xml: string;
          parsed_summary: Json;
          created_developments_count: number;
          status: string;
          created_at: string;
        };
        Insert: {
          space_id?: string;
          id?: string;
          user_id: string;
          client_id?: string | null;
          story_id?: string | null;
          filename: string;
          raw_xml: string;
          parsed_summary?: Json;
          created_developments_count?: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          client_id?: string | null;
          story_id?: string | null;
          parsed_summary?: Json;
          created_developments_count?: number;
          status?: string;
        };
        Relationships: [];
      };
      list_layouts: {
        Row: {
          id: string;
          user_id: string;
          entity: string;
          name: string;
          columns: Json;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entity: string;
          name: string;
          columns?: Json;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          columns?: Json;
          is_default?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_company_space: { Args: { p_name: string; p_color?: string; p_logo_url?: string | null }; Returns: string };
      update_company_space: { Args: { p_space: string; p_name: string; p_color: string; p_logo_url?: string | null }; Returns: undefined };
      set_space_member: { Args: { p_space: string; p_email: string; p_role?: string | null }; Returns: undefined };
      list_space_members: { Args: { p_space: string }; Returns: { user_id: string; email: string; full_name: string | null; role: string }[] };
      preview_space_copy_batch: { Args: { p_kind: string; p_ids: string[]; p_target: string }; Returns: Json };
      begin_space_copy_batch: { Args: { p_kind: string; p_ids: string[]; p_target: string }; Returns: string };
      preview_space_copy: { Args: { p_kind: string; p_id: string; p_target: string }; Returns: Json };
      begin_space_copy: { Args: { p_kind: string; p_id: string; p_target: string; p_client?: string | null; p_story?: string | null }; Returns: string };
      get_space_copy_files: { Args: { p_job: string }; Returns: Json };
      finish_space_copy: { Args: { p_job: string }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
