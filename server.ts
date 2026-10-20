/**
 * WanderPlan Express Full-Stack Dev Server
 * Mounts Vite middlewares for frontend SPA and provides /api endpoints
 * matching the FastAPI contract for local AI Studio preview.
 */
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory fallback store for trips in preview/demo mode when Supabase is not yet connected
interface InMemTrip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  country?: string;
  duration_days: number;
  budget_tier: string;
  estimated_total_cost: number;
  currency: string;
  travel_style: string;
  party_size: number;
  pace: string;
  cover_image_url?: string;
  cover_image_photographer?: string;
  cover_image_photographer_url?: string;
  created_at: string;
  updated_at: string;
  days: any[];
}

let previewTrips: InMemTrip[] = [];

// ==============================================================================
// 1. HEALTH & STATUS ENDPOINTS
// ==============================================================================
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', app: 'WanderPlan Server', version: '1.0.0' });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/api/services/status', async (_req: Request, res: Response) => {
  const groqKey = process.env.GROQ_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  let groqStatus = 'not_configured';
  let groqMessage = 'GROQ_API_KEY is not configured in environment variables.';
  if (groqKey && groqKey.length > 5) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groqKey}` },
      });
      if (response.ok) {
        groqStatus = 'connected';
        groqMessage = `Connected to Groq AI (${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'}).`;
      } else {
        groqStatus = 'error';
        groqMessage = `Groq rejected key with HTTP ${response.status}.`;
      }
    } catch (err: any) {
      groqStatus = 'error';
      groqMessage = `Network error contacting Groq: ${err.message}`;
    }
  }

  let unsplashStatus = 'not_configured';
  let unsplashMessage = 'UNSPLASH_ACCESS_KEY is not set. Serving curated destination photography.';
  if (unsplashKey && unsplashKey.length > 5) {
    try {
      const response = await fetch('https://api.unsplash.com/search/photos?query=travel&per_page=1', {
        headers: { Authorization: `Client-ID ${unsplashKey}` },
      });
      if (response.ok) {
        unsplashStatus = 'connected';
        const rem = response.headers.get('x-ratelimit-remaining') || 'OK';
        unsplashMessage = `Connected to Unsplash API. Requests remaining: ${rem}`;
      } else {
        unsplashStatus = 'error';
        unsplashMessage = `Unsplash returned HTTP ${response.status}`;
      }
    } catch (err: any) {
      unsplashStatus = 'error';
      unsplashMessage = `Network error contacting Unsplash: ${err.message}`;
    }
  }

  let supabaseStatus = 'not_configured';
  let supabaseMessage = 'SUPABASE_URL or SUPABASE_ANON_KEY is missing.';
  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      if (response.ok) {
        supabaseStatus = 'connected';
        supabaseMessage = 'Connected to Supabase PostgreSQL & Auth.';
      } else {
        supabaseStatus = 'error';
        supabaseMessage = `Supabase returned HTTP ${response.status}`;
      }
    } catch (err: any) {
      supabaseStatus = 'error';
      supabaseMessage = `Connection error: ${err.message}`;
    }
  }

  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    services: {
      groq: {
        name: 'Groq AI',
        configured: Boolean(groqKey && groqKey.length > 5),
        status: groqStatus,
        message: groqMessage,
      },
      unsplash: {
        name: 'Unsplash Images',
        configured: Boolean(unsplashKey && unsplashKey.length > 5),
        status: unsplashStatus,
        message: unsplashMessage,
      },
      supabase: {
        name: 'Supabase Auth & Database',
        configured: Boolean(supabaseUrl && supabaseKey),
        status: supabaseStatus,
        message: supabaseMessage,
      },
    },
    variables: {
      VITE_API_BASE_URL: {
        configured: Boolean(process.env.VITE_API_BASE_URL),
        target: 'Frontend Vercel deployment -> Render backend',
        scope: 'Frontend (Public)',
      },
      VITE_SUPABASE_URL: {
        configured: Boolean(supabaseUrl),
        target: 'Supabase project database & auth endpoint',
        scope: 'Frontend & Backend',
      },
      VITE_SUPABASE_ANON_KEY: {
        configured: Boolean(supabaseKey),
        target: 'Supabase client anonymous public key',
        scope: 'Frontend & Backend',
      },
      GROQ_API_KEY: {
        configured: Boolean(groqKey && groqKey.length > 5),
        target: 'Groq AI inference authorization key',
        scope: 'Backend (Secret)',
      },
      GROQ_MODEL: {
        configured: true,
        value: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        target: 'Groq AI LLM model identifier',
        scope: 'Backend',
      },
      UNSPLASH_ACCESS_KEY: {
        configured: Boolean(unsplashKey && unsplashKey.length > 5),
        target: 'Unsplash destination photo API access key',
        scope: 'Backend (Secret)',
      },
      UNSPLASH_APP_NAME: {
        configured: true,
        value: process.env.UNSPLASH_APP_NAME || 'WanderPlan',
        target: 'Unsplash application identification name',
        scope: 'Backend',
      },
    },
  });
});

// ==============================================================================
// 2. UNSPASH IMAGES SEARCH
// ==============================================================================
const CURATED_IMAGES: Record<string, any[]> = {
  tokyo: [
    {
      id: 'tokyo-1',
      url_regular: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
      url_thumb: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80',
      alt_description: 'Tokyo Tower illuminated at dusk',
      attribution: {
        photographer_name: 'Yu Kato',
        photographer_username: 'yukato',
        photographer_profile_url: 'https://unsplash.com/@yukato?utm_source=wanderplan&utm_medium=referral',
        unsplash_referral_url: 'https://unsplash.com/?utm_source=wanderplan&utm_medium=referral',
      },
      is_fallback: true,
    },
  ],
  paris: [
    {
      id: 'paris-1',
      url_regular: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
      url_thumb: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80',
      alt_description: 'Eiffel Tower from Parisian street',
      attribution: {
        photographer_name: 'Anthony Delanoix',
        photographer_username: 'anthonydelanoix',
        photographer_profile_url: 'https://unsplash.com/@anthonydelanoix?utm_source=wanderplan&utm_medium=referral',
        unsplash_referral_url: 'https://unsplash.com/?utm_source=wanderplan&utm_medium=referral',
      },
      is_fallback: true,
    },
  ],
  default: [
    {
      id: 'travel-default',
      url_regular: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
      url_thumb: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80',
      alt_description: 'Traveler overlooking mountain pass',
      attribution: {
        photographer_name: 'Annie Spratt',
        photographer_username: 'anniespratt',
        photographer_profile_url: 'https://unsplash.com/@anniespratt?utm_source=wanderplan&utm_medium=referral',
        unsplash_referral_url: 'https://unsplash.com/?utm_source=wanderplan&utm_medium=referral',
      },
      is_fallback: true,
    },
  ],
};

app.get('/api/images/search', async (req: Request, res: Response) => {
  const query = String(req.query.q || 'travel').trim();
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  if (unsplashKey && unsplashKey.length > 5) {
    try {
      const resp = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' landmark travel')}&per_page=6&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${unsplashKey}`, 'User-Agent': 'WanderPlan/1.0' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        const images = (data.results || []).map((item: any) => ({
          id: item.id,
          url_regular: item.urls?.regular || item.urls?.small,
          url_thumb: item.urls?.thumb || item.urls?.small,
          alt_description: item.alt_description || `View of ${query}`,
          attribution: {
            photographer_name: item.user?.name || 'Photographer',
            photographer_username: item.user?.username || 'traveler',
            photographer_profile_url: `https://unsplash.com/@${item.user?.username || ''}?utm_source=wanderplan&utm_medium=referral`,
            unsplash_referral_url: 'https://unsplash.com/?utm_source=wanderplan&utm_medium=referral',
            download_location: item.links?.download_location,
          },
          is_fallback: false,
        }));
        if (images.length > 0) {
          return res.json({ success: true, data: { query, total_results: data.total, images } });
        }
      }
    } catch (e) {
      console.warn('Unsplash API call failed, using curated fallbacks', e);
    }
  }

  // Fallback
  const qLower = query.toLowerCase();
  const matched = Object.keys(CURATED_IMAGES).find((k) => k !== 'default' && qLower.includes(k));
  const fallbackList = matched ? CURATED_IMAGES[matched] : CURATED_IMAGES.default;

  res.json({
    success: true,
    data: {
      query,
      total_results: fallbackList.length,
      images: fallbackList,
    },
  });
});

app.post('/api/images/track-download', async (req: Request, res: Response) => {
  const { download_location } = req.body || {};
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (download_location && unsplashKey) {
    try {
      await fetch(download_location, {
        headers: { Authorization: `Client-ID ${unsplashKey}` },
      });
    } catch {}
  }
  res.json({ success: true });
});

// ==============================================================================
// 3. GROQ AI ITINERARY GENERATION
// ==============================================================================
app.post('/api/itinerary/generate', async (req: Request, res: Response) => {
  const {
    destination,
    duration_days = 3,
    budget_tier = 'moderate',
    travel_style = 'balanced',
    party_size = 1,
    pace = 'moderate',
    interests = [],
    dietary_preferences,
    accessibility_notes,
    preferred_currency = 'USD',
  } = req.body;

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  if (groqKey && groqKey.length > 5) {
    try {
      const prompt = `Plan a highly detailed, realistic ${duration_days}-day itinerary for ${destination}.
Budget: ${budget_tier}. Style: ${travel_style}. Pace: ${pace}. Currency: ${preferred_currency}.
Interests: ${interests.join(', ') || 'Culture, Food, Local sights'}.
Dietary: ${dietary_preferences || 'None'}.
Accessibility: ${accessibility_notes || 'Standard'}.
Respond STRICTLY with a valid JSON object matching:
{
  "title": "A compelling title",
  "destination": "${destination}",
  "duration_days": ${duration_days},
  "budget_tier": "${budget_tier}",
  "estimated_total_cost": 0,
  "currency": "${preferred_currency}",
  "travel_style": "${travel_style}",
  "overview": "2-3 sentences overview",
  "best_time_to_visit_tips": "Practical tips",
  "daily_budget_guideline": "Daily average spend",
  "days": [
    {
      "day_number": 1,
      "title": "Day Theme/Title",
      "theme": "Theme",
      "daily_summary": "Summary",
      "accommodation_suggestion": "Hotel/area recommendation",
      "estimated_day_cost": 50,
      "activities": [
        {
          "time_slot": "09:00 AM",
          "sort_order": 0,
          "title": "Attraction Name",
          "description": "Rich description",
          "activity_type": "sightseeing",
          "location_name": "${destination}",
          "duration_minutes": 90,
          "estimated_cost": 20,
          "currency": "${preferred_currency}",
          "booking_required": false,
          "tips": "Local insider tip"
        }
      ]
    }
  ]
}`;

      const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            {
              role: 'system',
              content: 'You are an elite travel concierge. Output ONLY clean JSON with no markdown wrapping.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.6,
        }),
      });

      if (groqResp.ok) {
        const groqData = await groqResp.json();
        const content = groqData.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          // Calculate totals
          let totalCost = 0;
          parsed.days = (parsed.days || []).map((day: any, dIdx: number) => {
            let dayCost = 0;
            day.activities = (day.activities || []).map((act: any, aIdx: number) => {
              const cost = Number(act.estimated_cost) || 0;
              dayCost += cost;
              return { ...act, sort_order: aIdx, estimated_cost: cost, currency: preferred_currency };
            });
            totalCost += dayCost;
            return { ...day, day_number: dIdx + 1, estimated_day_cost: dayCost };
          });
          parsed.estimated_total_cost = totalCost;
          return res.json({ success: true, data: parsed });
        }
      }
    } catch (err: any) {
      console.warn('Groq AI call failed, falling back to smart generation template:', err.message);
    }
  }

  // Graceful smart generator template if Groq key is absent or in demo preview
  const days = [];
  const baseCostPerDay = budget_tier === 'luxury' ? 350 : budget_tier === 'backpacker' ? 45 : 120;
  for (let i = 1; i <= duration_days; i++) {
    days.push({
      day_number: i,
      title: i === 1 ? `Arrival & Historic Heart of ${destination}` : i === duration_days ? `Farewell Vistas & Local Markets` : `Day ${i}: Hidden Gems & Cultural Immersion`,
      theme: i === 1 ? 'Introduction & Landmarks' : i === 2 ? 'Art, Architecture & Cuisine' : 'Nature & Local Life',
      daily_summary: `Explore the vibrant highlights of ${destination} with hand-picked spots and culinary stops.`,
      accommodation_suggestion: `Boutique stay in central ${destination}`,
      estimated_day_cost: baseCostPerDay,
      activities: [
        {
          time_slot: '09:00 AM',
          sort_order: 0,
          title: `Iconic Landmark Discovery in ${destination}`,
          description: `Begin the day visiting the celebrated architectural and historic core of ${destination}.`,
          activity_type: 'sightseeing',
          location_name: `Central ${destination}`,
          duration_minutes: 120,
          estimated_cost: Math.round(baseCostPerDay * 0.3),
          currency: preferred_currency,
          booking_required: true,
          tips: 'Arrive early to avoid queues and catch morning light.',
        },
        {
          time_slot: '01:00 PM',
          sort_order: 1,
          title: `Authentic Gastronomy Tasting`,
          description: `Enjoy lunch at a renowned local tavern featuring traditional regional dishes and fresh seasonal ingredients.`,
          activity_type: 'dining',
          location_name: `Historic District`,
          duration_minutes: 75,
          estimated_cost: Math.round(baseCostPerDay * 0.35),
          currency: preferred_currency,
          booking_required: false,
          tips: 'Ask for the daily chef special and seasonal pairing.',
        },
        {
          time_slot: '03:30 PM',
          sort_order: 2,
          title: `Artisanal Quarter & Scenic Stroll`,
          description: `Wander through historic cobblestone lanes, artisan workshops, and scenic viewpoints.`,
          activity_type: 'leisure',
          location_name: `Old Town`,
          duration_minutes: 90,
          estimated_cost: Math.round(baseCostPerDay * 0.15),
          currency: preferred_currency,
          booking_required: false,
          tips: 'Great area for photography and local crafts.',
        },
        {
          time_slot: '07:30 PM',
          sort_order: 3,
          title: `Twilight Dining & Evening Atmosphere`,
          description: `Savor evening atmosphere with dinner overlooking the illuminated city skyline or historic plaza.`,
          activity_type: 'dining',
          location_name: `Riverfront / Skyline Quarter`,
          duration_minutes: 100,
          estimated_cost: Math.round(baseCostPerDay * 0.2),
          currency: preferred_currency,
          booking_required: true,
          tips: 'Reserve an outdoor terrace table around sunset.',
        },
      ],
    });
  }

  res.json({
    success: true,
    data: {
      title: `${duration_days}-Day ${travel_style.charAt(0).toUpperCase() + travel_style.slice(1)} Escape to ${destination}`,
      destination,
      duration_days,
      budget_tier,
      estimated_total_cost: baseCostPerDay * duration_days,
      currency: preferred_currency,
      travel_style,
      overview: `A balanced ${duration_days}-day itinerary designed for exploring the cultural depth, vibrant cuisine, and iconic architecture of ${destination}.`,
      best_time_to_visit_tips: 'Comfortable walking shoes, public transit passes, and advance reservations for major exhibits are recommended.',
      daily_budget_guideline: `Approx ${baseCostPerDay} ${preferred_currency} per day covering admissions, dining, and transit.`,
      days,
    },
  });
});

app.post('/api/itinerary/regenerate-day', async (req: Request, res: Response) => {
  const { destination, day_number, currency = 'USD', custom_instructions } = req.body;
  res.json({
    success: true,
    data: {
      day_number,
      title: `Alternative Day ${day_number}: Curated ${custom_instructions || 'Expedition'} in ${destination}`,
      theme: 'Alternative Highlights',
      daily_summary: `Refreshed plan: ${custom_instructions || 'Tailored with alternate cultural experiences and leisure stops.'}`,
      accommodation_suggestion: `Stay in ${destination}`,
      estimated_day_cost: 95,
      activities: [
        {
          time_slot: '09:30 AM',
          sort_order: 0,
          title: `Neighborhood Explorer & Market Walk`,
          description: `Discover local morning life and specialty produce markets in ${destination}.`,
          activity_type: 'culture',
          location_name: destination,
          duration_minutes: 90,
          estimated_cost: 20,
          currency,
          booking_required: false,
          tips: 'Try freshly prepared morning delicacies.',
        },
        {
          time_slot: '01:30 PM',
          sort_order: 1,
          title: `Contemporary Art & Design Gallery`,
          description: `Visit modern exhibits and curated collections.`,
          activity_type: 'sightseeing',
          location_name: destination,
          duration_minutes: 100,
          estimated_cost: 25,
          currency,
          booking_required: false,
          tips: 'Audio guides available in multiple languages.',
        },
        {
          time_slot: '06:00 PM',
          sort_order: 2,
          title: `Sunset Viewpoint & Apertivo`,
          description: `Relax at high vantage point with panoramic views as dusk falls.`,
          activity_type: 'leisure',
          location_name: destination,
          duration_minutes: 80,
          estimated_cost: 30,
          currency,
          booking_required: false,
          tips: 'Ideal photo opportunity during golden hour.',
        },
      ],
    },
  });
});

app.post('/api/itinerary/regenerate-activity', async (req: Request, res: Response) => {
  const { destination, time_slot = 'Morning', currency = 'USD', custom_instructions, current_activity } = req.body;
  res.json({
    success: true,
    data: {
      time_slot,
      sort_order: current_activity?.sort_order || 0,
      title: `Alternative Experience: ${custom_instructions || 'Artisan Workshop'}`,
      description: `A fresh alternative tailored to your preferences: discover intimate local spots in ${destination}.`,
      activity_type: 'culture',
      location_name: destination,
      duration_minutes: 90,
      estimated_cost: current_activity?.estimated_cost || 25,
      currency,
      booking_required: false,
      tips: 'Recommended by local residents.',
    },
  });
});

// ==============================================================================
// 4. TRIPS PERSISTENCE ENDPOINTS
// ==============================================================================
app.get('/api/trips', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && authHeader) {
    try {
      const resp = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/trips?select=*&order=created_at.desc`, {
        headers: { apikey: supabaseKey, Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      if (resp.ok) {
        const data = await resp.json();
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local memory store', e);
    }
  }

  res.json({ success: true, data: previewTrips });
});

app.get('/api/trips/:id', async (req: Request, res: Response) => {
  const tripId = req.params.id;
  const found = previewTrips.find((t) => t.id === tripId);
  if (found) {
    return res.json({ success: true, data: found });
  }
  res.status(404).json({ success: false, message: 'Trip not found.' });
});

app.post('/api/trips', async (req: Request, res: Response) => {
  const tripPayload = req.body;
  const newId = `trip-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const fullTrip: InMemTrip = {
    ...tripPayload,
    id: newId,
    user_id: tripPayload.user_id || 'demo-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    days: tripPayload.days || [],
  };

  previewTrips.unshift(fullTrip);
  res.status(201).json({ success: true, data: fullTrip });
});

app.delete('/api/trips/:id', async (req: Request, res: Response) => {
  const tripId = req.params.id;
  previewTrips = previewTrips.filter((t) => t.id !== tripId);
  res.json({ success: true, message: 'Trip deleted.' });
});

app.patch('/api/trips/activities/:id', (req: Request, res: Response) => {
  const activityId = req.params.id;
  const updates = req.body;
  // Update in local preview state
  for (const trip of previewTrips) {
    for (const day of trip.days || []) {
      const act = (day.activities || []).find((a: any) => a.id === activityId);
      if (act) {
        Object.assign(act, updates);
        return res.json({ success: true, data: act });
      }
    }
  }
  res.json({ success: true, data: { id: activityId, ...updates } });
});

// ==============================================================================
// 5. VITE MIDDLEWARE INTEGRATION (Dev server mode)
// ==============================================================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WanderPlan] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
