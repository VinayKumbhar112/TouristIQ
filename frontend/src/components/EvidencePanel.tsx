import React, { useState, useEffect } from 'react';
import type { Incident, RecommendedUnit, TouristProfile } from '../types';
import {
  ShieldAlert,
  Info,
  Clock,
  Compass,
  Radio,
  History,
  AlertOctagon,
  Phone,
  UserCheck,
  Send,
  CheckCircle2
} from 'lucide-react';
import { SeverityBadge } from './DesignSystemUI';

interface EvidencePanelProps {
  incident: Incident | null;
  tourist: TouristProfile | null;
  onRefresh: () => void;
}

const WORKFLOW_STEPS = ['NEW', 'ACKNOWLEDGED', 'TEAM_ASSIGNED', 'RESPONDING', 'RESOLVED'];

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  incident,
  tourist,
  onRefresh
}) => {
  const [recommendedUnits, setRecommendedUnits] = useState<RecommendedUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [officerNote, setOfficerNote] = useState<string>('');
  const [guidanceAdvisoryText, setGuidanceAdvisoryText] = useState<string>(
    'Follow yellow painted rock cairns toward Met Indavali ridge. Avoid steep right cliff edge.'
  );
  const [advisorySent, setAdvisorySent] = useState<boolean>(false);
  const [resolutionSummary, setResolutionSummary] = useState<string>('');
  const [falseAlarmReason, setFalseAlarmReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showFalseAlarmModal, setShowFalseAlarmModal] = useState<boolean>(false);
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);

  useEffect(() => {
    if (incident?.incident_id) {
      fetch(`http://localhost:8000/api/incidents/${incident.incident_id}/recommended-units`)
        .then(res => res.json())
        .then(data => {
          setRecommendedUnits(data || []);
          if (data && data.length > 0) {
            setSelectedUnitId(data[0].unit.unit_id);
          }
        })
        .catch(err => console.error('Error loading units:', err));
    }
  }, [incident?.incident_id]);

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-white border border-[#DCE3EC] rounded-xl text-center text-[#667085] shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-[#DCE3EC] flex items-center justify-center text-[#2563EB] mb-3">
          <Info className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-[#1D2939] text-sm">Forensic Evidence & Dispatch Console</h3>
        <p className="text-xs text-[#667085] mt-1.5 max-w-xs leading-relaxed">
          Select an incident from the queue or click a marker on the tactical map to examine explainable multi-hazard risk signals and dispatch field squads.
        </p>
      </div>
    );
  }

  const evidence = incident.evidence_breakdown || {};
  const currentStepIdx = WORKFLOW_STEPS.indexOf(
    incident.status === 'UNDER_INVESTIGATION' ? 'ACKNOWLEDGED' : incident.status
  );

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      await fetch(`http://localhost:8000/api/incidents/${incident.incident_id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officer_id: 'DISPATCH-HQ-01', note: officerNote || 'Acknowledged by Control Room' })
      });
      setOfficerNote('');
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUnit = async () => {
    if (!selectedUnitId) return;
    setLoading(true);
    try {
      await fetch(`http://localhost:8000/api/incidents/${incident.incident_id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officer_id: 'DISPATCH-HQ-01', unit_id: selectedUnitId })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    setLoading(true);
    try {
      await fetch(`http://localhost:8000/api/incidents/${incident.incident_id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officer_id: 'DISPATCH-HQ-01', eta_minutes: 12 })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    setLoading(true);
    try {
      await fetch(`http://localhost:8000/api/incidents/${incident.incident_id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officer_id: 'DISPATCH-HQ-01', summary: resolutionSummary || 'Tourist rescued safely.' })
      });
      setShowResolveModal(false);
      setResolutionSummary('');
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFalseAlarm = async () => {
    setLoading(true);
    try {
      await fetch(`http://localhost:8000/api/incidents/${incident.incident_id}/false-alarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officer_id: 'DISPATCH-HQ-01', reason: falseAlarmReason || 'Tourist was simply taking rest at designated tea stall.' })
      });
      setShowFalseAlarmModal(false);
      setFalseAlarmReason('');
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTransmitGuidance = async () => {
    if (!guidanceAdvisoryText.trim() || !incident) return;
    setLoading(true);
    try {
      await fetch(`http://localhost:8000/api/incidents/${incident.incident_id}/transmit-guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officer_id: 'OFFICER-SATARA-HQ',
          guidance_message: guidanceAdvisoryText
        })
      });
      setAdvisorySent(true);
      onRefresh();
      setTimeout(() => setAdvisorySent(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#DCE3EC] shadow-sm flex flex-col h-full overflow-hidden">
      {/* Panel Top Header */}
      <div className="p-4 border-b border-[#DCE3EC] bg-[#F8FAFC] space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#2563EB]">{incident.incident_id}</span>
              <SeverityBadge severity={incident.severity} size="sm" />
            </div>
            <h2 className="text-base font-bold text-[#1D2939] mt-0.5">{incident.tourist_name}</h2>
            <p className="text-xs text-[#667085] font-mono">
              Type: {incident.type.replace(/_/g, ' ')} • ID: {incident.tourist_id}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono font-bold uppercase text-[#667085]">Compound Score</span>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1D2939]">
              {incident.risk_score.toFixed(0)} <span className="text-xs text-[#667085] font-normal">/ 100</span>
            </div>
          </div>
        </div>

        {/* 5-Step Operational Lifecycle Stepper */}
        <div className="pt-2 border-t border-[#DCE3EC]">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#667085] mb-1">
            <span>RESPONSE LIFECYCLE</span>
            <span className="text-[#1D2939]">{incident.status}</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isPast = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div
                  key={step}
                  className={`h-2 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-[#2563EB]'
                      : isPast
                      ? 'bg-[#15803D]'
                      : 'bg-[#DCE3EC]'
                  }`}
                  title={step}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Forensic Evidence Breakdown & Action Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tourist Contact & Digital Permit Info */}
        {tourist && (
          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC] space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-semibold text-[#1D2939]">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Verified Tourist Profile</span>
              </span>
              <span className="font-mono text-[11px] text-[#667085]">{tourist.nationality} • {tourist.age} yrs</span>
            </div>
            <div className="text-[#667085] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#667085]" />
                <span>Emergency: <strong>{tourist.emergency_contact}</strong></span>
              </span>
              <span className="font-mono text-[10px] text-[#15803D] font-bold">DIGITAL ID VERIFIED</span>
            </div>
          </div>
        )}

        {/* Why Was This Flagged? Explainable Signals */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] font-mono mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Forensic Evidence Telemetry</span>
          </h3>

          <div className="space-y-2">
            {/* Assistance Request / Trail Guidance Signal */}
            {(incident.type === 'ASSISTANCE_REQUEST' || evidence.request_type === 'TRAIL_GUIDANCE' || evidence.tourist_message) && (
              <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-xs space-y-2">
                <div className="flex items-center justify-between text-amber-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#B45309]" />
                    <span>Tourist Trail Guidance Request</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-200 text-amber-950 uppercase font-bold">
                    Advisory Support
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-[#1D2939]">
                  <span className="text-[10px] uppercase font-bold text-[#667085] block font-mono">Tourist In-App Inquiry:</span>
                  <p className="text-xs italic font-medium mt-0.5">
                    "{evidence.tourist_message || incident.notes[0] || 'Need route guidance along Vasota trail'}"
                  </p>
                </div>
                <div className="text-[11px] text-amber-900 space-y-1 bg-amber-100/60 p-2 rounded border border-amber-200">
                  <div className="font-bold">Standard Operating Protocol:</div>
                  <div>• Non-emergency trail advisory. No high-alert sirens required.</div>
                  <div>• Verify GPS trail coordinates & dispatch Forest Patrol Bravo or transmit waypoint guide.</div>
                </div>
              </div>
            )}

            {/* Deviation Signal */}
            {evidence.deviation_meters !== undefined && (
              <div className="p-2.5 rounded-lg border border-[#DCE3EC] bg-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#C2410C]" />
                  <div>
                    <span className="font-bold text-[#1D2939]">Trail Deviation</span>
                    <p className="text-[11px] text-[#667085]">Off designated Vasota trail</p>
                  </div>
                </div>
                <div className="font-mono font-bold text-[#1D2939] text-right">
                  {evidence.deviation_meters.toFixed(0)} m
                  <span className="block text-[10px] text-[#667085] font-normal">Threshold: 250m</span>
                </div>
              </div>
            )}

            {/* Inactivity Signal */}
            {evidence.inactivity_minutes !== undefined && (
              <div className="p-2.5 rounded-lg border border-[#DCE3EC] bg-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#B45309]" />
                  <div>
                    <span className="font-bold text-[#1D2939]">Prolonged Inactivity</span>
                    <p className="text-[11px] text-[#667085]">Stationary without check-in</p>
                  </div>
                </div>
                <div className="font-mono font-bold text-[#1D2939] text-right">
                  {evidence.inactivity_minutes.toFixed(0)} mins
                  <span className="block text-[10px] text-[#667085] font-normal">Threshold: 15 mins</span>
                </div>
              </div>
            )}

            {/* Geofence Breach */}
            {evidence.breached_geofences && evidence.breached_geofences.length > 0 && (
              <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#B91C1C]">
                  <AlertOctagon className="w-4 h-4" />
                  <span>Geofence Hazard Breach: {evidence.breached_geofences.join(', ')}</span>
                </div>
              </div>
            )}

            {/* Signal Loss */}
            {evidence.signal_delay_seconds !== undefined && evidence.signal_delay_seconds > 60 && (
              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs flex items-center justify-between">
                <div className="font-bold text-amber-900">Blackout Telemetry Gap</div>
                <div className="font-mono font-bold text-amber-900">{evidence.signal_delay_seconds.toFixed(0)}s silence</div>
              </div>
            )}

            {/* SOS Trigger */}
            {evidence.sos_triggered && (
              <div className="p-2.5 rounded-lg border border-red-300 bg-red-50 text-xs font-bold text-[#B91C1C] flex items-center gap-1.5 animate-pulse">
                <AlertOctagon className="w-4 h-4" />
                <span>DIRECT SOS PANIC BUTTON ACTIVATED BY TOURIST</span>
              </div>
            )}
          </div>
        </div>

        {/* Tactical Response Action Station */}
        <div className="pt-3 border-t border-[#DCE3EC] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] font-mono">
            {incident.type === 'ASSISTANCE_REQUEST' ? 'Guidance Advisory Response Console' : 'Emergency Tactical Dispatch Station'}
          </h3>

          {/* 1. SPECIALIZED NON-EMERGENCY GUIDANCE WORKFLOW */}
          {incident.type === 'ASSISTANCE_REQUEST' ? (
            <div className="space-y-3 p-3.5 rounded-xl border border-amber-300 bg-amber-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Compass className="w-4 h-4 text-[#B45309]" />
                  <span>Trail Guidance & Direction Advisory</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                  NON-EMERGENCY
                </span>
              </div>

              {/* Quick Guidance Presets */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block font-mono">
                  Quick Advisory Templates:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Follow yellow painted rock cairns toward Met Indavali ridge. Avoid steep right cliff edge.',
                    'Koyna Sanctuary Forest Patrol Bravo is stationing at the 2km checkpoint ahead. Remain on marked trail.',
                    'Sunset approaching (18:30). Begin gradual descent back toward Bamnoli boat jetty.'
                  ].map(tmpl => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() => setGuidanceAdvisoryText(tmpl)}
                      className={`text-[10px] px-2 py-1 rounded text-left border transition-colors cursor-pointer ${
                        guidanceAdvisoryText === tmpl
                          ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold'
                          : 'bg-white text-[#667085] border-[#DCE3EC] hover:bg-slate-100'
                      }`}
                    >
                      {tmpl.split('.')[0]}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Guidance Message Textarea */}
              <textarea
                value={guidanceAdvisoryText}
                onChange={e => setGuidanceAdvisoryText(e.target.value)}
                placeholder="Enter directional instructions or waypoint coordinates for tourist device..."
                className="w-full text-xs p-2.5 border border-[#DCE3EC] rounded-lg text-[#1D2939] bg-white focus:outline-none focus:border-[#2563EB]"
                rows={2}
              />

              {/* Transmit Button */}
              <button
                onClick={handleTransmitGuidance}
                disabled={loading || !guidanceAdvisoryText.trim()}
                className="w-full py-2.5 px-3 text-xs font-bold rounded-lg bg-[#B45309] text-white hover:bg-amber-700 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Trail Guidance to Tourist Mobile</span>
              </button>

              {advisorySent && (
                <div className="p-2 rounded-lg bg-emerald-50 text-[#15803D] border border-emerald-200 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Advisory transmitted to Tourist Companion app!</span>
                </div>
              )}

              {/* Optional Field Check: Forest Ranger Patrol */}
              <div className="pt-2 border-t border-amber-200/80 space-y-1.5">
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block font-mono">
                  Optional Field Verification:
                </span>
                <div className="flex gap-2">
                  <select
                    value={selectedUnitId}
                    onChange={e => setSelectedUnitId(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-white border border-[#DCE3EC] rounded-lg text-[#1D2939]"
                  >
                    {recommendedUnits.map(item => (
                      <option key={item.unit.unit_id} value={item.unit.unit_id}>
                        {item.unit.name} ({item.unit.type}) — {item.distance_km.toFixed(1)} km
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignUnit}
                    disabled={loading || !selectedUnitId}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
                  >
                    Assign Patrol
                  </button>
                </div>
              </div>

              {/* Conclude & Resolve Guidance */}
              <div className="pt-2 border-t border-amber-200/80 flex gap-2">
                <button
                  onClick={() => {
                    setResolutionSummary('Trail directions transmitted to tourist. Tourist confirmed route markers and resumed safe trekking.');
                    setShowResolveModal(true);
                  }}
                  className="flex-1 py-1.5 px-3 text-xs font-bold rounded-lg bg-[#15803D] text-white hover:bg-green-700 transition-colors cursor-pointer"
                >
                  ✓ Conclude Guidance & Resolve
                </button>
                <button
                  onClick={() => setShowFalseAlarmModal(true)}
                  className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-white text-[#667085] border border-[#DCE3EC] hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : (
            /* 2. EMERGENCY / SOS TACTICAL EXTRACTION WORKFLOW */
            <div className="space-y-3">
              {/* Action Step 1: Acknowledge */}
              {incident.status === 'NEW' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Optional dispatch operator note..."
                    value={officerNote}
                    onChange={e => setOfficerNote(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#DCE3EC] rounded-lg text-[#1D2939] focus:outline-none focus:border-[#2563EB]"
                  />
                  <button
                    onClick={handleAcknowledge}
                    disabled={loading}
                    className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                  >
                    Acknowledge & Open Investigation
                  </button>
                </div>
              )}

              {/* Action Step 2: Assign Tactical Unit */}
              {(incident.status === 'ACKNOWLEDGED' || incident.status === 'UNDER_INVESTIGATION') && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#1D2939] block">
                    Select Nearest Tactical Unit:
                  </label>
                  <select
                    value={selectedUnitId}
                    onChange={e => setSelectedUnitId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#DCE3EC] rounded-lg text-[#1D2939] focus:outline-none focus:border-[#2563EB]"
                  >
                    {recommendedUnits.map(item => (
                      <option key={item.unit.unit_id} value={item.unit.unit_id}>
                        {item.unit.name} ({item.unit.type}) — {item.distance_km.toFixed(1)} km ({item.unit.status})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignUnit}
                    disabled={loading || !selectedUnitId}
                    className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                  >
                    Assign Response Unit
                  </button>
                </div>
              )}

              {/* Action Step 3: Dispatch Unit En Route */}
              {incident.status === 'TEAM_ASSIGNED' && (
                <button
                  onClick={handleDispatch}
                  disabled={loading}
                  className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-[#0F766E] text-white hover:bg-teal-700 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Radio className="w-4 h-4" />
                  <span>Dispatch Squad En Route (ETA 12m)</span>
                </button>
              )}

              {/* Action Step 4: Resolve or Mark False Alarm */}
              {incident.status !== 'RESOLVED' && incident.status !== 'FALSE_ALARM' && incident.status !== 'NEW' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="flex-1 py-1.5 px-3 text-xs font-bold rounded-lg bg-[#15803D] text-white hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => setShowFalseAlarmModal(true)}
                    className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-slate-100 text-[#1D2939] border border-[#DCE3EC] hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    False Alarm
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Audit Timeline */}
        {incident.timeline && incident.timeline.length > 0 && (
          <div className="pt-3 border-t border-[#DCE3EC] space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] font-mono flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Incident Audit Log</span>
            </h3>
            <div className="divide-y divide-[#DCE3EC] text-xs">
              {incident.timeline.map((entry, idx) => {
                const dt = new Date(entry.timestamp * 1000);
                return (
                  <div key={idx} className="py-1.5 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#1D2939]">{entry.action}</span>
                      <span className="text-[11px] text-[#667085] block">
                        {entry.actor && `By ${entry.actor}`} {entry.reason && `• ${entry.reason}`}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#667085] shrink-0">
                      {dt.toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Resolve Incident */}
      {showResolveModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-[#DCE3EC] p-5 max-w-md w-full shadow-xl space-y-3">
            <h3 className="font-bold text-base text-[#1D2939]">Close Incident Case as Resolved</h3>
            <p className="text-xs text-[#667085]">
              Document the resolution notes and ensure safety verification is confirmed with field squads.
            </p>
            <textarea
              value={resolutionSummary}
              onChange={e => setResolutionSummary(e.target.value)}
              placeholder="e.g. Tourist guided back to primary trail by Ranger Unit R-01. Vitals nominal."
              className="w-full h-24 p-2.5 text-xs border border-[#DCE3EC] rounded-lg text-[#1D2939] focus:outline-none focus:border-[#2563EB]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-[#1D2939]"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#15803D] text-white hover:bg-green-700"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mark False Alarm */}
      {showFalseAlarmModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-[#DCE3EC] p-5 max-w-md w-full shadow-xl space-y-3">
            <h3 className="font-bold text-base text-[#1D2939]">Classify as False Alarm</h3>
            <p className="text-xs text-[#667085]">
              Explain rationale for classifying anomaly as non-hazardous (e.g. voluntary rest stop).
            </p>
            <input
              type="text"
              value={falseAlarmReason}
              onChange={e => setFalseAlarmReason(e.target.value)}
              placeholder="e.g. Tourist stopped for refreshments at licensed cafe."
              className="w-full p-2.5 text-xs border border-[#DCE3EC] rounded-lg text-[#1D2939] focus:outline-none focus:border-[#2563EB]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowFalseAlarmModal(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-[#1D2939]"
              >
                Cancel
              </button>
              <button
                onClick={handleFalseAlarm}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#B45309] text-white hover:bg-amber-700"
              >
                Confirm False Alarm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
