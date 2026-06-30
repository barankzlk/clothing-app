/**
 * Database types for the Supabase schema. These mirror the SQL migration in
 * supabase/migrations/0001_init.sql. They are written by hand (rather than
 * generated) so the repo type-checks without a live Supabase connection; if
 * you change the schema, run `supabase gen types typescript` and reconcile.
 */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
      favorites: {
        Row: Favorite;
        Insert: FavoriteInsert;
        Update: Partial<FavoriteInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  body_shape: string | null;
  clothing_size_top: string | null;
  clothing_size_bottom: string | null;
  shoe_size_eu: number | null;
  style_tags: string[];
  fabric_preferences: string[];
  budget_max_eur: number | null;
  style_notes: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  email?: string | null;
  name?: string | null;
  gender?: string | null;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  body_shape?: string | null;
  clothing_size_top?: string | null;
  clothing_size_bottom?: string | null;
  shoe_size_eu?: number | null;
  style_tags?: string[];
  fabric_preferences?: string[];
  budget_max_eur?: number | null;
  style_notes?: string | null;
  onboarding_complete?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  title: string | null;
  price: string | null;
  shop: string | null;
  url: string | null;
  image_url: string | null;
  reason: string | null;
  search_query: string | null;
  created_at: string;
};

export type FavoriteInsert = {
  id?: string;
  user_id: string;
  title?: string | null;
  price?: string | null;
  shop?: string | null;
  url?: string | null;
  image_url?: string | null;
  reason?: string | null;
  search_query?: string | null;
  created_at?: string;
};

/** Shape of a single product returned by the /api/search route. */
export type SearchProduct = {
  title: string;
  shop: string;
  price: string;
  url: string;
  image_url: string | null;
  reason: string;
  /** Optional shop logo (Clearbit). Card derives one from the shop name too. */
  shop_logo?: string | null;
};
