/**
 * Saved Trips Management & History View
 */
import React from 'react';
import { Trip } from '../types';
import { MapPin, Calendar, DollarSign, Trash2, ArrowRight, Plus, Compass } from 'lucide-react';

interface TripHistoryViewProps {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onOpenTripWizard: () => void;
}

export const TripHistoryView: React.FC<TripHistoryViewProps> = ({
  trips,
  onSelectTrip,
  onDeleteTrip,
  onOpenTripWizard,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">My Travel Plans</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Saved trips persisted in your account ({trips.length} {trips.length === 1 ? 'trip' : 'trips'})
          </p>
        </div>
        <button
          onClick={onOpenTripWizard}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Itinerary</span>
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-slate-300 rounded-2xl p-8 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Compass className="h-6 w-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">No saved itineraries yet</h3>
            <p className="text-xs text-slate-500">
              Start planning your journey using Groq AI, personalized travel styles, and Unsplash imagery.
            </p>
          </div>
          <button
            onClick={onOpenTripWizard}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create Your First Trip</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                  <img
                    src={trip.cover_image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'}
                    alt={trip.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[11px] font-medium text-emerald-300 flex items-center gap-1 mb-0.5">
                      <MapPin className="h-3 w-3" />
                      {trip.destination}
                    </span>
                    <h3 className="text-sm font-bold truncate text-white">{trip.title}</h3>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{trip.duration_days} Days · {trip.travel_style}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {trip.currency} {trip.estimated_total_cost.toLocaleString()}
                    </span>
                  </div>

                  {trip.overview && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {trip.overview}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between mt-2">
                <button
                  onClick={() => onDeleteTrip(trip.id)}
                  title="Delete trip"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => onSelectTrip(trip)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <span>View Itinerary</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
