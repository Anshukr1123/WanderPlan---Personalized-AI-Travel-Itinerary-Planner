/**
 * TypeScript Interfaces for WanderPlan Application
 */

export interface UnsplashAttribution {
  photographer_name: string;
  photographer_username: string;
  photographer_profile_url: string;
  unsplash_referral_url: string;
  download_location?: string;
}

export interface DestinationImage {
  id: string;
  url_regular: string;
  url_thumb: string;
  url_full?: string;
  alt_description?: string;
  attribution: UnsplashAttribution;
  is_fallback: boolean;
}

export interface Activity {
  id?: string;
  day_id?: string;
  trip_id?: string;
  time_slot: string;
  sort_order: number;
  title: string;
  description: string;
  activity_type: 'sightseeing' | 'dining' | 'transportation' | 'leisure' | 'culture';
  location_name?: string;
  duration_minutes: number;
  estimated_cost: number;
  currency: string;
  booking_required: boolean;
  tips?: string;
}

export interface ItineraryDay {
  id?: string;
  trip_id?: string;
  day_number: number;
  date?: string;
  title: string;
  theme?: string;
  daily_summary?: string;
  accommodation_suggestion?: string;
  estimated_day_cost: number;
  activities: Activity[];
}

export interface Trip {
  id: string;
  user_id?: string;
  title: string;
  destination: string;
  country?: string;
  start_date?: string;
  end_date?: string;
  duration_days: number;
  budget_tier: 'backpacker' | 'moderate' | 'luxury' | 'ultra-luxury';
  estimated_total_cost: number;
  currency: string;
  travel_style: string;
  party_size: number;
  pace: 'relaxed' | 'moderate' | 'fast-paced';
  cover_image_url?: string;
  cover_image_photographer?: string;
  cover_image_photographer_url?: string;
  overview?: string;
  best_time_to_visit_tips?: string;
  daily_budget_guideline?: string;
  notes?: string;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
  days: ItineraryDay[];
}

export interface GenerationParams {
  destination: string;
  country?: string;
  duration_days: number;
  budget_tier: 'backpacker' | 'moderate' | 'luxury' | 'ultra-luxury';
  travel_style: string;
  party_size: number;
  pace: 'relaxed' | 'moderate' | 'fast-paced';
  interests: string[];
  dietary_preferences?: string;
  accessibility_notes?: string;
  preferred_currency: string;
  start_date?: string;
}

export interface ServiceCheck {
  name: string;
  configured: boolean;
  status: 'connected' | 'not_configured' | 'error';
  message: string;
  details?: Record<string, any>;
}

export interface VariableCheck {
  configured: boolean;
  target: string;
  scope: string;
  value?: string;
}

export interface SystemHealthStatus {
  status: string;
  environment: string;
  services: {
    groq: ServiceCheck;
    unsplash: ServiceCheck;
    supabase: ServiceCheck;
  };
  variables?: Record<string, VariableCheck>;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_demo?: boolean;
}
