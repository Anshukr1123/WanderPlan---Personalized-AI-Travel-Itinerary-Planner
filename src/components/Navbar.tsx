/**
 * Top Navigation Bar adhering to the Top Bar Contract (3 zones, gap-8)
 */
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, User, LogOut, ShieldCheck, Plus } from 'lucide-react';

interface NavbarProps {
  currentTab: 'explore' | 'planner' | 'trips' | 'services';
  onSelectTab: (tab: 'explore' | 'planner' | 'trips' | 'services') => void;
  onOpenTripWizard: () => void;
  onOpenAuthModal: () => void;
  onOpenServicesModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenTripWizard,
  onOpenAuthModal,
  onOpenServicesModal,
}) => {
  const { user, signOut, isDemoMode } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand wordmark (single text element) */}
        <button
          onClick={() => onSelectTab('explore')}
          className="text-xl font-bold tracking-tight text-slate-900 transition-colors hover:text-emerald-700 whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <Compass className="h-5 w-5 text-emerald-600" />
          <span>WanderPlan</span>
        </button>

        {/* Zone 2: 4 single-line text links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button
            onClick={() => onSelectTab('explore')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'explore'
                ? 'text-slate-900 border-b-2 border-emerald-600 font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => onSelectTab('planner')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'planner'
                ? 'text-slate-900 border-b-2 border-emerald-600 font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Planner
          </button>
          <button
            onClick={() => onSelectTab('trips')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'trips'
                ? 'text-slate-900 border-b-2 border-emerald-600 font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            My Trips
          </button>
          <button
            onClick={onOpenServicesModal}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              currentTab === 'services'
                ? 'text-slate-900 border-b-2 border-emerald-600 font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <span>Integrations</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenTripWizard}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Trip</span>
              </button>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <span className="text-xs text-slate-600 hidden lg:inline max-w-[120px] truncate font-medium">
                  {user.full_name || user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  title="Sign out"
                  className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-md"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuthModal}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                onClick={onOpenTripWizard}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                Plan a Journey
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
