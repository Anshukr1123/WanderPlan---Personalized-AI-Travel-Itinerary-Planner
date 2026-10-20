/**
 * WanderPlan Main Application Entry Point
 * Personalized AI Travel Itinerary Planner
 */
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { TripDetailView } from './components/TripDetailView';
import { TripHistoryView } from './components/TripHistoryView';
import { TripWizardModal } from './components/TripWizardModal';
import { ServicesModal } from './components/ServicesModal';
import { AuthModal } from './components/AuthModal';
import { Trip } from './types';
import { api } from './lib/api';
import { Compass, Sparkles, Shield, Database, Plus } from 'lucide-react';

function WanderPlanApp() {
  const { user, sessionToken, isDemoMode } = useAuth();
  const [currentTab, setCurrentTab] = useState<'explore' | 'planner' | 'trips' | 'services'>('explore');
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState<boolean>(false);

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardDestination, setWizardDestination] = useState<string>('');
  const [isServicesOpen, setIsServicesOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // Load trips on mount or when auth changes
  useEffect(() => {
    loadSavedTrips();
  }, [sessionToken, user]);

  const loadSavedTrips = async () => {
    setLoadingTrips(true);
    try {
      const data = await api.listTrips(sessionToken);
      setTrips(data || []);
      // If we don't have an active trip and there are saved trips, select the most recent one
      if (!currentTrip && data && data.length > 0) {
        setCurrentTrip(data[0]);
      }
    } catch (err) {
      console.warn('Failed to load trips:', err);
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleTripGenerated = async (newTrip: Trip) => {
    setCurrentTrip(newTrip);
    setCurrentTab('planner');
    // Automatically persist to backend
    try {
      const saved = await api.saveTrip(newTrip, sessionToken);
      if (saved?.id) {
        setTrips((prev) => [saved, ...prev.filter((t) => t.id !== saved.id)]);
      }
    } catch (err) {
      console.warn('Automatic trip save:', err);
    }
  };

  const handleSaveTrip = async (tripToSave: Trip) => {
    const saved = await api.saveTrip(tripToSave, sessionToken);
    if (saved?.id) {
      setTrips((prev) => [saved, ...prev.filter((t) => t.id !== saved.id)]);
      setCurrentTrip(saved);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await api.deleteTrip(tripId, sessionToken);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      if (currentTrip?.id === tripId) {
        setCurrentTrip(null);
        setCurrentTab('trips');
      }
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  };

  const handleQuickPlan = (dest: string) => {
    setWizardDestination(dest);
    setIsWizardOpen(true);
  };

  const handleOpenNewWizard = () => {
    setWizardDestination('');
    setIsWizardOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-emerald-600 selection:text-white">
      {/* Demo Mode Notice Banner (Discreet top banner when using guest mode) */}
      {isDemoMode && (
        <div className="bg-slate-900 text-slate-300 text-[11px] px-4 py-1.5 flex items-center justify-between border-b border-slate-800">
          <div className="mx-auto flex items-center gap-2">
            <span className="font-semibold text-emerald-400">Preview Mode:</span>
            <span>Local guest mode active. Connect Supabase, Groq, and Unsplash in Integrations for production persistence.</span>
            <button
              onClick={() => setIsServicesOpen(true)}
              className="ml-2 font-medium text-emerald-400 hover:text-emerald-300 underline"
            >
              Configure Keys & Services
            </button>
          </div>
        </div>
      )}

      {/* Navigation Top Bar Contract */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'services') {
            setIsServicesOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        onOpenTripWizard={handleOpenNewWizard}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenServicesModal={() => setIsServicesOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'explore' && (
          <HeroSection
            onQuickPlan={handleQuickPlan}
            onOpenTripWizard={handleOpenNewWizard}
            onOpenServicesModal={() => setIsServicesOpen(true)}
          />
        )}

        {currentTab === 'planner' && (
          <>
            {currentTrip ? (
              <TripDetailView
                trip={currentTrip}
                onUpdateTrip={(updated) => {
                  setCurrentTrip(updated);
                  setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                }}
                onSaveTrip={handleSaveTrip}
                onBackToExplore={() => setCurrentTab('explore')}
              />
            ) : (
              <div className="py-24 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8 space-y-4 max-w-md mx-auto my-12">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Compass className="h-6 w-6" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">No active itinerary selected</h2>
                <p className="text-xs text-slate-500">
                  Generate a tailored day-by-day journey or select one of your saved trips.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleOpenNewWizard}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Plan New Trip</span>
                  </button>
                  {trips.length > 0 && (
                    <button
                      onClick={() => setCurrentTab('trips')}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Browse Saved Trips
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {currentTab === 'trips' && (
          <TripHistoryView
            trips={trips}
            onSelectTrip={(selected) => {
              setCurrentTrip(selected);
              setCurrentTab('planner');
            }}
            onDeleteTrip={handleDeleteTrip}
            onOpenTripWizard={handleOpenNewWizard}
          />
        )}
      </main>

      {/* Quiet Production Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">WanderPlan</span>
            <span aria-hidden="true">·</span>
            <span>Personalized AI Travel Itinerary Planner</span>
          </div>

          <div className="flex items-center gap-6 text-slate-600">
            <button
              onClick={() => setIsServicesOpen(true)}
              className="hover:text-emerald-700 transition-colors"
            >
              Integrations & Diagnostics
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-700 transition-colors"
            >
              GitHub Deployment
            </a>
            <a
              href="https://render.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-700 transition-colors"
            >
              Render API
            </a>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-700 transition-colors"
            >
              Vercel Frontend
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TripWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onTripGenerated={handleTripGenerated}
        initialDestination={wizardDestination}
      />

      <ServicesModal
        isOpen={isServicesOpen}
        onClose={() => setIsServicesOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WanderPlanApp />
    </AuthProvider>
  );
}
