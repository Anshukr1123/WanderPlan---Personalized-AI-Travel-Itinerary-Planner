/**
 * Services and Integrations Management Modal
 * Real-time verification of Supabase, Groq, Unsplash, Vercel, and Render connections.
 */
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SystemHealthStatus } from '../types';
import { CheckCircle2, AlertCircle, XCircle, RefreshCw, X, Server, Database, Sparkles, Image, ExternalLink, Copy, Check } from 'lucide-react';

interface ServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServicesModal: React.FC<ServicesModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<SystemHealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getServicesStatus();
      setStatus(res);
    } catch (err: any) {
      setError(err.message || 'Failed to ping services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const renderBadge = (serviceStatus: 'connected' | 'not_configured' | 'error') => {
    switch (serviceStatus) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Connected
          </span>
        );
      case 'not_configured':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            Needs Setup
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            Connection Error
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Service Integrations & Diagnostics</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Retest All</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Supabase */}
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-900">Supabase</span>
                  </div>
                  {status && renderBadge(status.services.supabase.status)}
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  {status ? status.services.supabase.message : 'Checking connection...'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
                PostgreSQL · Auth · RLS
              </div>
            </div>

            {/* 2. Groq AI */}
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-900">Groq AI</span>
                  </div>
                  {status && renderBadge(status.services.groq.status)}
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  {status ? status.services.groq.message : 'Checking model availability...'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
                Model: llama-3.3-70b-versatile
              </div>
            </div>

            {/* 3. Unsplash */}
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-900">Unsplash</span>
                  </div>
                  {status && renderBadge(status.services.unsplash.status)}
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  {status ? status.services.unsplash.message : 'Checking Unsplash API...'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
                Attribution & High-Res Photos
              </div>
            </div>
          </div>

          {/* Environment Variables Audit Section */}
          <div className="p-4 border border-slate-200 rounded-lg bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Environment Variables Status</h3>
                <p className="text-xs text-slate-500">
                  Target configuration status for frontend and backend deployments.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">7 Keys Tracked</span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden text-xs">
              {[
                {
                  key: 'VITE_API_BASE_URL',
                  scope: 'Frontend (Vercel)',
                  desc: 'Points frontend to deployed Render API (relative /api in dev)',
                  configured: Boolean(status?.variables?.VITE_API_BASE_URL?.configured),
                },
                {
                  key: 'VITE_SUPABASE_URL',
                  scope: 'Frontend & Backend',
                  desc: 'Supabase PostgreSQL & Auth project endpoint URL',
                  configured: Boolean(status?.variables?.VITE_SUPABASE_URL?.configured),
                },
                {
                  key: 'VITE_SUPABASE_ANON_KEY',
                  scope: 'Frontend & Backend',
                  desc: 'Supabase anonymous public key (safe for browser with RLS)',
                  configured: Boolean(status?.variables?.VITE_SUPABASE_ANON_KEY?.configured),
                },
                {
                  key: 'GROQ_API_KEY',
                  scope: 'Backend (Render)',
                  desc: 'Server-side key for Groq AI inference from console.groq.com',
                  configured: Boolean(status?.variables?.GROQ_API_KEY?.configured),
                },
                {
                  key: 'GROQ_MODEL',
                  scope: 'Backend',
                  desc: 'Selected LLM: llama-3.3-70b-versatile',
                  configured: true,
                },
                {
                  key: 'UNSPLASH_ACCESS_KEY',
                  scope: 'Backend (Render)',
                  desc: 'Server-side key for destination image search with attribution',
                  configured: Boolean(status?.variables?.UNSPLASH_ACCESS_KEY?.configured),
                },
                {
                  key: 'UNSPLASH_APP_NAME',
                  scope: 'Backend',
                  desc: 'App identifier for Unsplash API: WanderPlan',
                  configured: true,
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-2.5 bg-slate-50/40 hover:bg-slate-50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-semibold text-slate-900">{item.key}</code>
                      <span className="text-[10px] text-slate-500 bg-slate-200/80 px-1.5 py-0.2 rounded font-medium">
                        {item.scope}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                  <div>
                    {item.configured ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        <Check className="h-3 w-3 text-emerald-600" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                        Not Set
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deployment Blueprint Quick Reference */}
          <div className="p-4 border border-slate-200 rounded-lg bg-white space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Production Deployment Setup</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-800">1. Backend on Render</span>
                  <span className="text-[11px] text-emerald-600 font-medium">FastAPI Python</span>
                </div>
                <p className="text-slate-600 mb-2">
                  Configured in <code className="bg-slate-200 px-1 py-0.5 rounded">render.yaml</code> with command:
                </p>
                <div className="flex items-center justify-between bg-slate-900 text-slate-100 p-2 rounded text-[11px] font-mono">
                  <span>uvicorn app.main:app --host 0.0.0.0 --port $PORT</span>
                  <button
                    onClick={() => copyToClipboard('uvicorn app.main:app --host 0.0.0.0 --port $PORT', 'render-start')}
                    className="p-1 hover:text-white"
                  >
                    {copiedKey === 'render-start' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-800">2. Frontend on Vercel</span>
                  <span className="text-[11px] text-emerald-600 font-medium">React + Vite</span>
                </div>
                <p className="text-slate-600 mb-2">
                  Configured in <code className="bg-slate-200 px-1 py-0.5 rounded">vercel.json</code>. Set environment variable:
                </p>
                <div className="flex items-center justify-between bg-slate-900 text-slate-100 p-2 rounded text-[11px] font-mono">
                  <span>VITE_API_BASE_URL=https://your-api.onrender.com</span>
                  <button
                    onClick={() => copyToClipboard('VITE_API_BASE_URL=https://your-api.onrender.com', 'vercel-env')}
                    className="p-1 hover:text-white"
                  >
                    {copiedKey === 'vercel-env' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Supabase SQL Migration instruction */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800">Supabase SQL Schema Ready</span>
                  <p className="text-xs text-slate-500">
                    File located at <code className="text-slate-700 bg-slate-100 px-1 rounded">supabase/migrations/20261020000000_create_travel_planner_schema.sql</code>
                  </p>
                </div>
                <a
                  href="https://supabase.com/dashboard/project/_/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <span>Open Supabase SQL Editor</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
