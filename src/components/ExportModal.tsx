/**
 * Itinerary Export and Print Modal (Markdown, JSON, Print)
 */
import React, { useState } from 'react';
import { Trip } from '../types';
import { X, Copy, Check, Printer, FileText, Download } from 'lucide-react';

interface ExportModalProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ trip, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !trip) return null;

  const generateMarkdown = (): string => {
    let md = `# ${trip.title}\n\n`;
    md += `**Destination:** ${trip.destination}  \n`;
    md += `**Duration:** ${trip.duration_days} Days  \n`;
    md += `**Budget Tier:** ${trip.budget_tier}  \n`;
    md += `**Estimated Total:** ${trip.estimated_total_cost} ${trip.currency}  \n`;
    md += `**Travel Style:** ${trip.travel_style} · **Pace:** ${trip.pace}  \n\n`;

    if (trip.overview) {
      md += `### Overview\n${trip.overview}\n\n`;
    }

    if (trip.best_time_to_visit_tips) {
      md += `> **Travel Tips:** ${trip.best_time_to_visit_tips}\n\n`;
    }

    md += `---\n\n## Daily Itinerary\n\n`;

    (trip.days || []).forEach((day) => {
      md += `### Day ${day.day_number}: ${day.title}\n`;
      if (day.theme) md += `*Theme: ${day.theme}*  \n`;
      if (day.daily_summary) md += `${day.daily_summary}\n\n`;
      if (day.accommodation_suggestion) {
        md += `🏨 **Suggested Stay:** ${day.accommodation_suggestion}\n\n`;
      }

      md += `| Time | Activity | Location | Est. Cost | Booking Required |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\n`;
      (day.activities || []).forEach((act) => {
        md += `| ${act.time_slot} | **${act.title}** - ${act.description.replace(/\|/g, '-')} | ${act.location_name || '-'} | ${act.estimated_cost} ${act.currency} | ${act.booking_required ? 'Yes' : 'No'} |\n`;
      });

      md += `\n*Estimated Day Total: ${day.estimated_day_cost} ${trip.currency}*\n\n`;
    });

    md += `\n---\n*Curated with WanderPlan*`;
    return md;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trip, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${trip.destination.toLowerCase().replace(/[^a-z0-9]/g, '_')}_itinerary.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150 print:bg-white print:p-0">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] print:max-h-none print:shadow-none print:border-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">Export & Share Itinerary</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors text-xs font-semibold text-slate-800"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
              <span>{copied ? 'Copied Markdown!' : 'Copy as Markdown'}</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors text-xs font-semibold text-slate-800"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Export JSON File</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors text-xs font-semibold text-slate-800"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          {/* Markdown Preview Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 print:hidden">
              Formatted Markdown Preview
            </label>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-72 whitespace-pre-wrap selection:bg-emerald-700">
              {generateMarkdown()}
            </pre>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
