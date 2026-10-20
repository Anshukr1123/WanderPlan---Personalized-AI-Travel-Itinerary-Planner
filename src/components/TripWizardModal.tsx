/**
 * Multi-Step Trip Generator Wizard with Unsplash Image Selector and Groq AI Integration
 */
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { DestinationImage, GenerationParams, Trip } from '../types';
import { X, Sparkles, MapPin, Calendar, DollarSign, Compass, Users, Check, ArrowRight, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';

interface TripWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripGenerated: (trip: Trip) => void;
  initialDestination?: string;
}

const POPULAR_DESTINATIONS = [
  'Tokyo, Japan',
  'Paris, France',
  'Rome, Italy',
  'Kyoto, Japan',
  'Amalfi Coast, Italy',
  'Banff, Canada',
  'Barcelona, Spain',
  'Reykjavik, Iceland',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

const TRAVEL_STYLES = [
  { id: 'balanced', label: 'Balanced Explorer', desc: 'Mix of iconic landmarks, dining, and scenic strolls' },
  { id: 'cultural', label: 'Cultural & Historic', desc: 'Museums, ancient heritage, and local traditions' },
  { id: 'culinary', label: 'Culinary & Gastronomy', desc: 'Food markets, regional specialties, and wine/tea tastings' },
  { id: 'adventurous', label: 'Adventure & Outdoors', desc: 'Hiking, viewpoints, and thrilling excursions' },
  { id: 'relaxed', label: 'Relaxed & Wellness', desc: 'Leisurely pace, thermal baths, parks, and cafes' },
];

const BUDGET_TIERS: Array<{ id: 'backpacker' | 'moderate' | 'luxury' | 'ultra-luxury'; label: string; desc: string }> = [
  { id: 'backpacker', label: 'Backpacker', desc: 'Budget-friendly hostels, transit, and street food' },
  { id: 'moderate', label: 'Moderate', desc: 'Comfortable boutique stays, local bistros, and key tours' },
  { id: 'luxury', label: 'Luxury', desc: 'Premium 4-5★ hotels, signature restaurants, and private guides' },
  { id: 'ultra-luxury', label: 'Ultra Luxury', desc: 'Five-star resorts, Michelin dining, and concierge transit' },
];

const INTEREST_TAGS = [
  'Art & Architecture',
  'Historic Sites',
  'Local Street Food',
  'Scenic Photography',
  'Nature & Gardens',
  'Coffee & Cafes',
  'Nightlife & Speakeasies',
  'Shopping & Crafts',
  'Waterfronts & Beaches',
];

export const TripWizardModal: React.FC<TripWizardModalProps> = ({
  isOpen,
  onClose,
  onTripGenerated,
  initialDestination = '',
}) => {
  const [step, setStep] = useState<number>(1);
  const [destination, setDestination] = useState<string>(initialDestination || '');
  const [durationDays, setDurationDays] = useState<number>(4);
  const [startDate, setStartDate] = useState<string>('');
  const [budgetTier, setBudgetTier] = useState<'backpacker' | 'moderate' | 'luxury' | 'ultra-luxury'>('moderate');
  const [currency, setCurrency] = useState<string>('USD');
  const [partySize, setPartySize] = useState<number>(2);
  const [pace, setPace] = useState<'relaxed' | 'moderate' | 'fast-paced'>('moderate');
  const [travelStyle, setTravelStyle] = useState<string>('balanced');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Art & Architecture', 'Local Street Food']);
  const [dietary, setDietary] = useState<string>('');
  const [accessibility, setAccessibility] = useState<string>('');

  // Unsplash photos search
  const [photos, setPhotos] = useState<DestinationImage[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<DestinationImage | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationPhase, setGenerationPhase] = useState<string>('Synthesizing destination insights...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDestination) {
      setDestination(initialDestination);
    }
  }, [initialDestination]);

  useEffect(() => {
    if (destination.length >= 2 && step === 4) {
      searchPhotos(destination);
    }
  }, [destination, step]);

  const searchPhotos = async (query: string) => {
    setLoadingPhotos(true);
    try {
      const res = await api.searchImages(query, 6);
      setPhotos(res.images || []);
      if (res.images && res.images.length > 0 && !selectedPhoto) {
        setSelectedPhoto(res.images[0]);
      }
    } catch (err) {
      console.warn('Failed to load photos:', err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  if (!isOpen) return null;

  const toggleInterest = (tag: string) => {
    if (selectedInterests.includes(tag)) {
      setSelectedInterests(selectedInterests.filter((t) => t !== tag));
    } else {
      setSelectedInterests([...selectedInterests, tag]);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);

    const phases = [
      'Querying Groq AI for destination highlights...',
      'Structuring day-by-day itinerary & timings...',
      'Calculating daily budget estimates...',
      'Finalizing accommodations & logistics...',
    ];

    let phaseIdx = 0;
    const interval = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % phases.length;
      setGenerationPhase(phases[phaseIdx]);
    }, 1800);

    try {
      const params: GenerationParams = {
        destination,
        duration_days: durationDays,
        budget_tier: budgetTier,
        travel_style: travelStyle,
        party_size: partySize,
        pace,
        interests: selectedInterests,
        dietary_preferences: dietary,
        accessibility_notes: accessibility,
        preferred_currency: currency,
        start_date: startDate || undefined,
      };

      const result = await api.generateItinerary(params);

      // Attach chosen cover photo if present
      if (selectedPhoto) {
        result.cover_image_url = selectedPhoto.url_regular;
        result.cover_image_photographer = selectedPhoto.attribution.photographer_name;
        result.cover_image_photographer_url = selectedPhoto.attribution.photographer_profile_url;
        // Trigger download tracking per Unsplash guidelines
        if (selectedPhoto.attribution.download_location) {
          api.trackDownload(selectedPhoto.attribution.download_location);
        }
      }

      clearInterval(interval);
      setIsGenerating(false);
      onTripGenerated(result);
      onClose();
    } catch (err: any) {
      clearInterval(interval);
      setIsGenerating(false);
      setError(err.message || 'Generation failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Personalized Trip Planner
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium text-slate-800">
            <span>Step {step} of 4:</span>
            <span>
              {step === 1 && 'Destination & Dates'}
              {step === 2 && 'Budget & Logistics'}
              {step === 3 && 'Style & Preferences'}
              {step === 4 && 'Imagery & Finalize'}
            </span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  step >= i ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          {isGenerating ? (
            <div className="py-16 text-center space-y-4">
              <div className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Crafting Your Custom Itinerary
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {generationPhase}
              </p>
              <div className="text-[11px] text-slate-400">
                Powered by Groq AI and destination logistics engine
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Destination & Dates */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Where would you like to travel?
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Kyoto, Japan or Florence, Italy"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    {/* Quick Suggestions */}
                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] text-slate-400">Popular:</span>
                      {POPULAR_DESTINATIONS.slice(0, 4).map((dest) => (
                        <button
                          key={dest}
                          type="button"
                          onClick={() => setDestination(dest)}
                          className="text-[11px] text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
                        >
                          {dest}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Duration (Days): <span className="text-emerald-600 font-bold">{durationDays} days</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="14"
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                        <span>1 day</span>
                        <span>7 days</span>
                        <span>14 days</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Target Start Date (Optional)
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Budget & Logistics */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-2">
                      Budget Tier
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {BUDGET_TIERS.map((tier) => (
                        <div
                          key={tier.id}
                          onClick={() => setBudgetTier(tier.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            budgetTier === tier.id
                              ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-900">{tier.label}</span>
                            {budgetTier === tier.id && <Check className="h-4 w-4 text-emerald-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500">{tier.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Travelers
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={partySize}
                          onChange={(e) => setPartySize(Number(e.target.value))}
                          className="w-full pl-8 pr-2 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Pace
                      </label>
                      <select
                        value={pace}
                        onChange={(e) => setPace(e.target.value as any)}
                        className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="relaxed">Relaxed (2-3 spots)</option>
                        <option value="moderate">Moderate (3-4 spots)</option>
                        <option value="fast-paced">Fast-Paced (4-5 spots)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Travel Style & Interests */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-2">
                      Travel Style
                    </label>
                    <div className="space-y-2">
                      {TRAVEL_STYLES.map((style) => (
                        <div
                          key={style.id}
                          onClick={() => setTravelStyle(style.id)}
                          className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                            travelStyle === style.id
                              ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{style.label}</span>
                            <span className="text-[11px] text-slate-500">{style.desc}</span>
                          </div>
                          {travelStyle === style.id && <Check className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-2">
                      Interests & Highlights
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {INTEREST_TAGS.map((tag) => {
                        const active = selectedInterests.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleInterest(tag)}
                            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                              active
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">
                        Dietary Preferences
                      </label>
                      <input
                        type="text"
                        value={dietary}
                        onChange={(e) => setDietary(e.target.value)}
                        placeholder="e.g. Vegetarian, Halal, Gluten-free"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">
                        Accessibility Notes
                      </label>
                      <input
                        type="text"
                        value={accessibility}
                        onChange={(e) => setAccessibility(e.target.value)}
                        placeholder="e.g. Wheelchair access, step-free"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Imagery & Finalize */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-800">
                        Select Destination Cover Imagery (Unsplash)
                      </label>
                      <button
                        type="button"
                        onClick={() => searchPhotos(destination)}
                        className="text-[11px] text-emerald-600 hover:underline font-medium"
                      >
                        Refresh Photos
                      </button>
                    </div>

                    {loadingPhotos ? (
                      <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        <span>Searching Unsplash for {destination}...</span>
                      </div>
                    ) : photos.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                        No destination photos found. A default travel landscape will be used.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {photos.map((p) => {
                          const isSelected = selectedPhoto?.id === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedPhoto(p)}
                              className={`relative group rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                                isSelected ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/20' : 'border-transparent hover:opacity-90'
                              }`}
                            >
                              <img
                                src={p.url_thumb}
                                alt={p.alt_description || destination}
                                referrerPolicy="no-referrer"
                                className="w-full h-24 object-cover"
                              />
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white p-0.5 rounded-full shadow">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5">
                                <p className="text-[10px] text-white/90 truncate">
                                  Photo by {p.attribution.photographer_name}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedPhoto && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Photo selected by{' '}
                        <a
                          href={selectedPhoto.attribution.photographer_profile_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 underline"
                        >
                          {selectedPhoto.attribution.photographer_name}
                        </a>{' '}
                        on{' '}
                        <a
                          href={selectedPhoto.attribution.unsplash_referral_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 underline"
                        >
                          Unsplash
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Summary preview */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                    <div className="font-semibold text-slate-800">Trip Summary Overview:</div>
                    <div className="text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Destination: <strong>{destination}</strong></span>
                      <span>·</span>
                      <span>Duration: <strong>{durationDays} Days</strong></span>
                      <span>·</span>
                      <span>Tier: <strong>{budgetTier}</strong></span>
                      <span>·</span>
                      <span>Currency: <strong>{currency}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation */}
        {!isGenerating && (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                disabled={!destination.trim()}
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!destination.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-md disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>Generate Itinerary</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
