/**
 * Hero Section with Quickstart Destination Search and Curated Destinations
 */
import React, { useState } from 'react';
import { Search, Sparkles, MapPin, Compass, ArrowRight, ShieldCheck, Zap, Database } from 'lucide-react';

interface HeroSectionProps {
  onQuickPlan: (destination: string) => void;
  onOpenTripWizard: () => void;
  onOpenServicesModal: () => void;
}

const FEATURED_DESTINATIONS = [
  {
    name: 'Kyoto, Japan',
    tag: 'Zen Temples & Bamboo Groves',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    days: 4,
    tier: 'Moderate',
  },
  {
    name: 'Amalfi Coast, Italy',
    tag: 'Cliffside Vistas & Lemon Groves',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
    days: 5,
    tier: 'Luxury',
  },
  {
    name: 'Paris, France',
    tag: 'Art Museums & Historic Bistros',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
    days: 3,
    tier: 'Moderate',
  },
  {
    name: 'Banff National Park, Canada',
    tag: 'Glacial Lakes & Alpine Trails',
    image: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80',
    days: 5,
    tier: 'Adventure',
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onQuickPlan,
  onOpenTripWizard,
  onOpenServicesModal,
}) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onQuickPlan(query.trim());
    } else {
      onOpenTripWizard();
    }
  };

  return (
    <div className="space-y-16 py-6">
      {/* Hero Headline & Search Container */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 px-6 py-16 sm:px-12 sm:py-24 text-white text-center shadow-xl">
        {/* Subtle background image overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80"
            alt="Travel inspiration"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-25 filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/60" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Groq AI + Supabase PostgreSQL + Unsplash Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight text-balance">
            Personalized Travel Itineraries Engineered in Seconds
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Experience structured day-by-day travel journeys tailored to your budget tier, pace, and interests. Complete with verified timings, cost breakdowns, and live Unsplash destination photography.
          </p>

          {/* Quickstart Destination Search */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto pt-2">
            <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
              <div className="relative w-full flex-1">
                <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-emerald-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Where do you want to explore? (e.g. Rome, Tokyo)"
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-transparent text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white hover:bg-emerald-50 rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>Plan Journey</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Tech Integration Proof Pill */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <button
              onClick={onOpenServicesModal}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Groq Llama-3.3-70b</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenServicesModal}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span>Supabase RLS & Auth</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenServicesModal}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              <span>Render & Vercel Ready</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Destinations Showcase */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Curated Destinations</h2>
            <p className="text-xs text-slate-500">
              Select any destination to generate a customized itinerary immediately.
            </p>
          </div>
          <button
            onClick={onOpenTripWizard}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Custom Planner</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURED_DESTINATIONS.map((dest) => (
            <div
              key={dest.name}
              onClick={() => onQuickPlan(dest.name)}
              className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                <img
                  src={dest.image}
                  alt={dest.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-0.5">
                    {dest.tier} · {dest.days} Days
                  </span>
                  <h3 className="text-sm font-bold text-white">{dest.name}</h3>
                  <p className="text-[11px] text-slate-200 truncate">{dest.tag}</p>
                </div>
              </div>

              <div className="p-3 bg-white flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>Start Itinerary</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
