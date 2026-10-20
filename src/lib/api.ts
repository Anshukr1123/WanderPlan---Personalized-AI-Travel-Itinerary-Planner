/**
 * API client communicating with WanderPlan backend (FastAPI on Render or local Express).
 */
import { DestinationImage, GenerationParams, ItineraryDay, SystemHealthStatus, Trip } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function getHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  /**
   * Test third-party service connectivity (Groq, Unsplash, Supabase).
   */
  async getServicesStatus(): Promise<SystemHealthStatus> {
    const res = await fetch(`${API_BASE}/api/services/status`);
    if (!res.ok) {
      throw new Error(`Failed to check service status: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Search destination images with Unsplash attribution.
   */
  async searchImages(query: string, limit: number = 6): Promise<{ query: string; total_results: number; images: DestinationImage[] }> {
    const res = await fetch(`${API_BASE}/api/images/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Image search failed: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Trigger Unsplash download tracking per developer guidelines.
   */
  async trackDownload(downloadLocation?: string): Promise<void> {
    if (!downloadLocation) return;
    try {
      await fetch(`${API_BASE}/api/images/track-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ download_location: downloadLocation }),
      });
    } catch {}
  },

  /**
   * Generate structured itinerary using Groq AI.
   */
  async generateItinerary(params: GenerationParams): Promise<Trip> {
    const res = await fetch(`${API_BASE}/api/itinerary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      let errMsg = `Generation failed (${res.status})`;
      try {
        const errorJson = await res.json();
        errMsg = errorJson.detail?.message || errorJson.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Regenerate a single day with custom user feedback instructions.
   */
  async regenerateDay(
    destination: string,
    dayNumber: number,
    durationDays: number,
    budgetTier: string,
    travelStyle: string,
    currency: string,
    existingDay?: ItineraryDay,
    customInstructions?: string
  ): Promise<ItineraryDay> {
    const res = await fetch(`${API_BASE}/api/itinerary/regenerate-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination,
        day_number: dayNumber,
        duration_days: durationDays,
        budget_tier: budgetTier,
        travel_style: travelStyle,
        currency,
        existing_day: existingDay,
        custom_instructions: customInstructions,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to regenerate day: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Regenerate an individual activity.
   */
  async regenerateActivity(
    destination: string,
    dayTitle: string,
    timeSlot: string,
    currency: string,
    currentActivity: any,
    customInstructions?: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/api/itinerary/regenerate-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination,
        day_title: dayTitle,
        time_slot: timeSlot,
        currency,
        current_activity: currentActivity,
        custom_instructions: customInstructions,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to regenerate activity: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Fetch all saved trips for the authenticated user.
   */
  async listTrips(token?: string | null): Promise<Trip[]> {
    const res = await fetch(`${API_BASE}/api/trips`, {
      headers: getHeaders(token),
    });
    if (!res.ok) {
      throw new Error(`Failed to load trips: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || [];
  },

  /**
   * Fetch single trip with nested days and activities.
   */
  async getTrip(tripId: string, token?: string | null): Promise<Trip> {
    const res = await fetch(`${API_BASE}/api/trips/${tripId}`, {
      headers: getHeaders(token),
    });
    if (!res.ok) {
      throw new Error(`Failed to load trip details: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Persist a trip and its itinerary.
   */
  async saveTrip(trip: Partial<Trip>, token?: string | null): Promise<Trip> {
    const res = await fetch(`${API_BASE}/api/trips`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(trip),
    });
    if (!res.ok) {
      throw new Error(`Failed to save trip: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Delete a saved trip.
   */
  async deleteTrip(tripId: string, token?: string | null): Promise<void> {
    const res = await fetch(`${API_BASE}/api/trips/${tripId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      throw new Error(`Failed to delete trip: ${res.statusText}`);
    }
  },

  /**
   * Edit a specific activity.
   */
  async updateActivity(activityId: string, updates: any, token?: string | null): Promise<any> {
    const res = await fetch(`${API_BASE}/api/trips/activities/${activityId}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error(`Failed to update activity: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  },
};
