import React, { useState } from 'react';
import type { Incident } from '../types';
import { Search, MapPin, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { SeverityBadge, StatusBadge } from './DesignSystemUI';

interface IncidentQueueProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (incident: Incident) => void;
}

export const IncidentQueue: React.FC<IncidentQueueProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filtered = incidents.filter(inc => {
    if (filter === 'ACTIVE' && (inc.status === 'RESOLVED' || inc.status === 'FALSE_ALARM')) return false;
    if (filter === 'GUIDANCE' && inc.type !== 'ASSISTANCE_REQUEST') return false;
    if (filter === 'CRITICAL' && inc.severity !== 'CRITICAL') return false;
    if (filter === 'RESOLVED' && inc.status !== 'RESOLVED' && inc.status !== 'FALSE_ALARM') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inc.incident_id.toLowerCase().includes(q) ||
        inc.tourist_name.toLowerCase().includes(q) ||
        inc.tourist_id.toLowerCase().includes(q) ||
        inc.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-[#DCE3EC] shadow-sm flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-[#DCE3EC] bg-[#F8FAFC] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-bold text-[#1D2939] uppercase tracking-wide">
              Incident Response Queue
            </h2>
          </div>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-[#1D2939]">
            {filtered.length} Total
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#667085] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by ID, tourist, type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#DCE3EC] rounded-lg text-[#1D2939] placeholder-[#667085] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px] font-medium overflow-x-auto pt-0.5">
          {['ALL', 'ACTIVE', 'GUIDANCE', 'CRITICAL', 'RESOLVED'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-mono font-bold ${
                filter === tab
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-white text-[#667085] border border-[#DCE3EC] hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#DCE3EC] p-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[#667085]">
            <CheckCircle2 className="w-8 h-8 text-[#15803D] mb-2" />
            <p className="text-xs font-bold text-[#1D2939]">All nominal in this sector</p>
            <p className="text-[11px] text-[#667085] mt-1">
              No incidents match the active search filter.
            </p>
          </div>
        ) : (
          filtered.map(inc => {
            const isSelected = inc.incident_id === selectedIncidentId;
            const dt = new Date(inc.created_at * 1000);

            return (
              <div
                key={inc.incident_id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3 transition-all cursor-pointer rounded-lg m-1 border ${
                  isSelected
                    ? 'bg-blue-50/70 border-[#2563EB] shadow-xs'
                    : 'bg-white border-transparent hover:bg-[#F4F7FB] hover:border-[#DCE3EC]'
                }`}
              >
                {/* Header row: Tourist Name + Severity */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-[#1D2939] truncate flex items-center gap-1.5">
                      <span>{inc.tourist_name}</span>
                      <span className="font-mono text-[10px] text-[#667085] font-normal">
                        ({inc.tourist_id})
                      </span>
                    </h3>
                    <span className="text-[11px] font-mono font-semibold text-[#667085] truncate block mt-0.5">
                      {inc.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <SeverityBadge severity={inc.severity} size="sm" />
                </div>

                {/* Status + Risk Score Row */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <StatusBadge status={inc.status} />
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <span className="text-[#667085]">RISK:</span>
                    <strong className={`font-bold ${
                      inc.risk_score >= 75 ? 'text-[#B91C1C]' :
                      inc.risk_score >= 50 ? 'text-[#C2410C]' :
                      inc.risk_score >= 25 ? 'text-[#B45309]' : 'text-[#15803D]'
                    }`}>
                      {inc.risk_score.toFixed(0)}
                    </strong>
                  </div>
                </div>

                {/* Bottom Metadata: Location / Timestamp */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#667085]">
                  <span className="flex items-center gap-1 truncate font-mono">
                    <MapPin className="w-3 h-3 text-[#2563EB] shrink-0" />
                    <span>{inc.location.lat.toFixed(3)}, {inc.location.lon.toFixed(3)}</span>
                  </span>
                  <span className="font-mono text-[10px] shrink-0">
                    {dt.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
