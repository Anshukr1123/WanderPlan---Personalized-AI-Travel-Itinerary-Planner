/**
 * Rich Day-by-Day Interactive Itinerary View
 * Includes day tabs, activity cards, day regeneration, single activity regeneration, and edit modal.
 */
import React, { useState } from 'react';
import { Trip, ItineraryDay, Activity } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ActivityEditModal } from './ActivityEditModal';
import { ExportModal } from './ExportModal';
import {
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  RefreshCw,
  Plus,
  Share2,
  Trash2,
  Edit3,
  Bookmark,
  Check,
  Building,
  Info,
  Compass,
  Sparkles,
  Ticket,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface TripDetailViewProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onSaveTrip: (trip: Trip) => Promise<void>;
  onBackToExplore?: () => void;
}

export const TripDetailView: React.FC<TripDetailViewProps> = ({
  trip,
  onUpdateTrip,
  onSaveTrip,
  onBackToExplore,
}) => {
  const { sessionToken } = useAuth();
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Day regeneration prompt state
  const [showRegenDayPrompt, setShowRegenDayPrompt] = useState<boolean>(false);
  const [regenDayInstructions, setRegenDayInstructions] = useState<string>('');
  const [isRegeneratingDay, setIsRegeneratingDay] = useState<boolean>(false);

  // Single activity regeneration state
  const [regeneratingActivityId, setRegeneratingActivityId] = useState<string | null>(null);

  const activeDay = (trip.days || []).find((d) => d.day_number === selectedDayNumber) || trip.days?.[0];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveTrip(trip);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateDay = async () => {
    if (!activeDay) return;
    setIsRegeneratingDay(true);
    try {
      const refreshedDay = await api.regenerateDay(
        trip.destination,
        activeDay.day_number,
        trip.duration_days,
        trip.budget_tier,
        trip.travel_style,
        trip.currency,
        activeDay,
        regenDayInstructions
      );

      const updatedDays = trip.days.map((d) =>
        d.day_number === activeDay.day_number ? { ...refreshedDay, id: d.id, trip_id: d.trip_id } : d
      );

      // Recalculate total cost
      const newTotal = updatedDays.reduce((acc, d) => acc + (d.estimated_day_cost || 0), 0);
      onUpdateTrip({
        ...trip,
        days: updatedDays,
        estimated_total_cost: Math.round(newTotal * 100) / 100,
      });

      setShowRegenDayPrompt(false);
      setRegenDayInstructions('');
    } catch (err) {
      console.error('Failed to regenerate day:', err);
    } finally {
      setIsRegeneratingDay(false);
    }
  };

  const handleRegenerateActivity = async (activity: Activity) => {
    if (!activity.id && !activity.title) return;
    const actKey = activity.id || activity.title;
    setRegeneratingActivityId(actKey);

    try {
      const replaced = await api.regenerateActivity(
        trip.destination,
        activeDay?.title || 'Daily Highlights',
        activity.time_slot,
        trip.currency,
        activity,
        'Offer an inspiring alternative experience that fits the schedule'
      );

      const updatedDays = trip.days.map((d) => {
        if (d.day_number !== selectedDayNumber) return d;
        const updatedActs = d.activities.map((a) => {
          if ((a.id && a.id === activity.id) || a.title === activity.title) {
            return { ...replaced, id: a.id, day_id: a.day_id, trip_id: a.trip_id };
          }
          return a;
        });
        const dayCost = updatedActs.reduce((acc, a) => acc + (a.estimated_cost || 0), 0);
        return { ...d, activities: updatedActs, estimated_day_cost: dayCost };
      });

      const newTotal = updatedDays.reduce((acc, d) => acc + (d.estimated_day_cost || 0), 0);
      onUpdateTrip({
        ...trip,
        days: updatedDays,
        estimated_total_cost: Math.round(newTotal * 100) / 100,
      });
    } catch (err) {
      console.error('Failed to regenerate activity:', err);
    } finally {
      setRegeneratingActivityId(null);
    }
  };

  const handleSaveActivityEdit = (updatedActivity: Activity) => {
    const updatedDays = trip.days.map((d) => {
      if (d.day_number !== selectedDayNumber) return d;
      const updatedActs = d.activities.map((a) =>
        (a.id && a.id === updatedActivity.id) || a.title === updatedActivity.title ? updatedActivity : a
      );
      const dayCost = updatedActs.reduce((acc, a) => acc + (a.estimated_cost || 0), 0);
      return { ...d, activities: updatedActs, estimated_day_cost: dayCost };
    });

    const newTotal = updatedDays.reduce((acc, d) => acc + (d.estimated_day_cost || 0), 0);
    onUpdateTrip({
      ...trip,
      days: updatedDays,
      estimated_total_cost: Math.round(newTotal * 100) / 100,
    });
  };

  const handleDeleteActivity = (actTitle: string, actId?: string) => {
    const updatedDays = trip.days.map((d) => {
      if (d.day_number !== selectedDayNumber) return d;
      const filtered = d.activities.filter((a) => (actId ? a.id !== actId : a.title !== actTitle));
      const dayCost = filtered.reduce((acc, a) => acc + (a.estimated_cost || 0), 0);
      return { ...d, activities: filtered, estimated_day_cost: dayCost };
    });

    const newTotal = updatedDays.reduce((acc, d) => acc + (d.estimated_day_cost || 0), 0);
    onUpdateTrip({
      ...trip,
      days: updatedDays,
      estimated_total_cost: Math.round(newTotal * 100) / 100,
    });
  };

  const handleAddActivity = () => {
    if (!activeDay) return;
    const newAct: Activity = {
      id: `act-${Date.now()}`,
      day_id: activeDay.id,
      trip_id: trip.id,
      time_slot: '02:00 PM',
      sort_order: (activeDay.activities || []).length,
      title: 'New Activity Spot',
      description: 'Add specific details, exhibits, or local sights to visit.',
      activity_type: 'sightseeing',
      location_name: trip.destination,
      duration_minutes: 60,
      estimated_cost: 0,
      currency: trip.currency,
      booking_required: false,
    };

    setEditingActivity(newAct);
  };

  return (
    <div className="space-y-8">
      {/* Hero Header with Unsplash Photo */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md">
        <div className="h-64 sm:h-80 w-full relative">
          <img
            src={trip.cover_image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=80'}
            alt={trip.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
        </div>

        {/* Header Overlay Content */}
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end text-white space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="flex items-center gap-1 font-semibold text-white">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              {trip.destination}
            </span>
            <span aria-hidden="true">·</span>
            <span>{trip.duration_days} Days</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{trip.budget_tier} Tier</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{trip.travel_style}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white max-w-3xl">
            {trip.title}
          </h1>

          {trip.overview && (
            <p className="text-xs sm:text-sm text-slate-200 max-w-3xl line-clamp-2">
              {trip.overview}
            </p>
          )}

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-200">
              <div>
                <span className="text-[11px] text-slate-400 block uppercase tracking-wider">Est. Total</span>
                <span className="text-base font-bold text-emerald-400">
                  {trip.currency} {trip.estimated_total_cost.toLocaleString()}
                </span>
              </div>
              <div className="hidden sm:block border-l border-white/20 pl-4">
                <span className="text-[11px] text-slate-400 block uppercase tracking-wider">Pace</span>
                <span className="capitalize">{trip.pace}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors shadow-sm"
              >
                {saveSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5 text-slate-700" />
                    <span>{isSaving ? 'Saving...' : 'Save Trip'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsExportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Export & Print</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unsplash Attribution badge in top corner */}
        {trip.cover_image_photographer && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] text-white/80">
            Photo by{' '}
            <a
              href={trip.cover_image_photographer_url || 'https://unsplash.com'}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white"
            >
              {trip.cover_image_photographer}
            </a>{' '}
            on Unsplash
          </div>
        )}
      </div>

      {/* Travel Insight Strip */}
      {trip.best_time_to_visit_tips && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3">
          <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950">
            <span className="font-semibold block mb-0.5">Destination Insider Guidance:</span>
            <span>{trip.best_time_to_visit_tips}</span>
          </div>
        </div>
      )}

      {/* Day Tabs Bar (Interactive filter tabs) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
        {(trip.days || []).map((day) => {
          const isActive = day.day_number === selectedDayNumber;
          return (
            <button
              key={day.day_number}
              onClick={() => setSelectedDayNumber(day.day_number)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Day {day.day_number}
            </button>
          );
        })}
      </div>

      {/* Active Day Header & Regeneration Toolbar */}
      {activeDay && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="font-semibold text-emerald-700">Day {activeDay.day_number}</span>
                {activeDay.theme && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{activeDay.theme}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Day Budget: {trip.currency} {activeDay.estimated_day_cost}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">{activeDay.title}</h2>
              {activeDay.daily_summary && (
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">{activeDay.daily_summary}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowRegenDayPrompt(!showRegenDayPrompt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                <span>Regenerate Day</span>
              </button>
              <button
                onClick={handleAddActivity}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600" />
                <span>Add Activity</span>
              </button>
            </div>
          </div>

          {/* Accommodation Card */}
          {activeDay.accommodation_suggestion && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3 text-xs">
              <Building className="h-4 w-4 text-slate-500 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Accommodation Recommendation:</span>{' '}
                <span className="text-slate-600">{activeDay.accommodation_suggestion}</span>
              </div>
            </div>
          )}

          {/* Inline Day Regeneration Prompt */}
          {showRegenDayPrompt && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900">
                  Custom AI Feedback for Day {activeDay.day_number}
                </span>
                <button
                  onClick={() => setShowRegenDayPrompt(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
              <input
                type="text"
                value={regenDayInstructions}
                onChange={(e) => setRegenDayInstructions(e.target.value)}
                placeholder="e.g. Include an afternoon cooking class and more scenic photography spots"
                className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleRegenerateDay}
                  disabled={isRegeneratingDay}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRegeneratingDay ? 'animate-spin' : ''}`} />
                  <span>{isRegeneratingDay ? 'Regenerating...' : 'Regenerate Day with Groq AI'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Activities List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Activities Timeline ({activeDay.activities?.length || 0})
            </h3>

            {(!activeDay.activities || activeDay.activities.length === 0) ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <p className="text-xs text-slate-500">No activities on this day yet.</p>
                <button
                  onClick={handleAddActivity}
                  className="mt-2 text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Add your first activity
                </button>
              </div>
            ) : (
              activeDay.activities.map((activity, idx) => {
                const isRegeneratingThis = regeneratingActivityId === (activity.id || activity.title);
                return (
                  <div
                    key={activity.id || idx}
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      {/* Meta line */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-900 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-emerald-600" />
                          {activity.time_slot}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{activity.duration_minutes} mins</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{activity.activity_type}</span>
                        {activity.location_name && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-0.5 text-slate-600 truncate max-w-[200px]">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {activity.location_name}
                            </span>
                          </>
                        )}
                        {activity.booking_required && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-700 font-medium flex items-center gap-0.5">
                              <Ticket className="h-3 w-3" /> Booking Required
                            </span>
                          </>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{activity.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{activity.description}</p>

                      {activity.tips && (
                        <div className="mt-1 text-[11px] text-emerald-800 bg-emerald-50/60 px-2 py-1 rounded inline-block">
                          💡 <strong>Tip:</strong> {activity.tips}
                        </div>
                      )}
                    </div>

                    {/* Right side: Cost and Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-xs font-mono tabular-nums font-semibold text-slate-900">
                        {activity.currency} {activity.estimated_cost}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRegenerateActivity(activity)}
                          disabled={isRegeneratingThis}
                          title="Generate alternative with Groq AI"
                          className="p-1.5 text-slate-400 hover:text-emerald-700 rounded transition-colors"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isRegeneratingThis ? 'animate-spin text-emerald-600' : ''}`} />
                        </button>
                        <button
                          onClick={() => setEditingActivity(activity)}
                          title="Edit activity"
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteActivity(activity.title, activity.id)}
                          title="Delete activity"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {editingActivity && (
        <ActivityEditModal
          activity={editingActivity}
          currency={trip.currency}
          isOpen={Boolean(editingActivity)}
          onClose={() => setEditingActivity(null)}
          onSave={handleSaveActivityEdit}
        />
      )}

      {/* Export / Print Modal */}
      <ExportModal
        trip={trip}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
