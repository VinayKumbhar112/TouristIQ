import React, { useState } from 'react';
import type { TouristProfile, Incident } from '../types';
import { ShieldCheck, AlertCircle, Check, Compass, Radio, MapPin, AlertTriangle } from 'lucide-react';

interface TouristCompanionModalProps {
  tourist: TouristProfile | null;
  incidents?: Incident[];
  onClose: () => void;
  onRefresh: (touristId?: string) => void;
}

const QUICK_NOTES = [
  'Trail markers unclear near ridge junction',
  'Need checkpoint timing & sunset advisory',
  'Resting near Met Indavali path; all okay'
];

export const TouristCompanionModal: React.FC<TouristCompanionModalProps> = ({
  tourist,
  incidents = [],
  onClose,
  onRefresh
}) => {
  const [guidanceNote, setGuidanceNote] = useState<string>('Unsure of route markers near Vasota Fort. Requesting trail guidance.');
  const [localGuidanceActive, setLocalGuidanceActive] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!tourist) return null;

  const activeGuidanceIncident = incidents.find(
    i => i.tourist_id === tourist.tourist_id &&
         i.type === 'ASSISTANCE_REQUEST' &&
         i.status !== 'RESOLVED' &&
         i.status !== 'FALSE_ALARM'
  );

  const isServerGuidanceActive = !!activeGuidanceIncident || 
    (tourist.last_assessment_reason?.toLowerCase().includes('guidance') ?? false) || 
    (tourist.last_assessment_reason?.toLowerCase().includes('advisory') ?? false);
  const isGuidanceSession = localGuidanceActive || isServerGuidanceActive;

  const handleSafetyResponse = async (isSafe: boolean) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const msg = isSafe 
        ? 'I am safe and on the marked trail.' 
        : (guidanceNote.trim() || 'Need route guidance near Vasota Fort trail');
        
      const res = await fetch(`http://localhost:8000/api/tourists/${tourist.tourist_id}/safety-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_safe: isSafe, message: msg })
      });
      
      if (res.ok) {
        if (isSafe) {
          setLocalGuidanceActive(false);
          setStatusMessage('Confirmed safe. Control room advisory closed.');
        } else {
          setLocalGuidanceActive(true);
          setStatusMessage('Guidance ticket dispatched to Satara Police & Forest Patrol.');
        }
        onRefresh(tourist.tourist_id);
      }
    } catch (e) {
      console.error(e);
      setStatusMessage('Network error communicating with safety engine.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSOS = async () => {
    setLoading(true);
    try {
      await fetch(`http://localhost:8000/api/simulation/scenarios/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_name: 'sos_immediate', tourist_id: tourist.tourist_id })
      });
      setStatusMessage('CRITICAL SOS TRANSMITTED! Rescue squads alerted.');
      onRefresh(tourist.tourist_id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      {/* Smartphone Device Mockup Container */}
      <div className="w-full max-w-sm bg-[#101B2D] border-4 border-slate-700 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[670px] relative">
        {/* Top Speaker Bezel */}
        <div className="h-6 bg-[#101B2D] flex items-center justify-center shrink-0">
          <div className="w-16 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Smartphone Screen Canvas */}
        <div className="flex-1 bg-[#F4F7FB] flex flex-col overflow-y-auto">
          {/* App Header Bar */}
          <div className="bg-[#101B2D] text-white px-4 py-3 flex items-center justify-between border-b border-[#1B2A42]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-xs">Sahyadri & Vasota Trek Guide</h3>
                <span className="text-[10px] text-slate-400 font-mono">Digital Tourist ID Companion</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-[#18263D] cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Main Mobile App Body */}
          <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Tourist ID Profile Card */}
              <div className="bg-white rounded-xl p-3 border border-[#DCE3EC] shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#1D2939]">{tourist.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-[#15803D] border border-emerald-200">
                    ID: {tourist.tourist_id}
                  </span>
                </div>
                <div className="mt-2 text-xs text-[#667085] space-y-1">
                  <div>Nationality: <strong className="text-[#1D2939]">{tourist.nationality}</strong></div>
                  <div>Emergency Contact: <strong className="text-[#1D2939]">{tourist.emergency_contact}</strong></div>
                  <div className="font-mono text-[10px] text-[#667085] truncate pt-1 border-t border-[#DCE3EC]">
                    Hash: {tourist.digital_id_hash}
                  </div>
                </div>
              </div>

              {/* Status Message Toast if present */}
              {statusMessage && (
                <div className="p-2.5 rounded-lg bg-blue-50 text-[#2563EB] text-[11px] font-bold text-center border border-blue-200">
                  {statusMessage}
                </div>
              )}

              {/* Dynamic Branch: Guidance Active View vs Proactive Prompt */}
              {isGuidanceSession ? (
                /* ACTIVE GUIDANCE OPERATIONAL CARD */
                <div className="bg-white rounded-xl p-4 border border-amber-300 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Compass className="w-5 h-5 text-[#B45309] animate-spin" style={{ animationDuration: '6s' }} />
                      <div>
                        <span className="text-xs font-bold text-[#1D2939] block">Trail Guidance Active</span>
                        <span className="text-[10px] font-mono text-[#B45309] font-semibold">Priority: Medium Advisory</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      DISPATCHED
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs space-y-1.5 text-[#1D2939]">
                    <div className="flex items-center gap-1.5 text-[#B45309] font-bold text-[11px]">
                      <Radio className="w-3.5 h-3.5" />
                      <span>Satara Police & Koyna Sanctuary Monitored</span>
                    </div>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      Your position is tracked along the Vasota Fort trail. Stand by on the path while forest rangers monitor your sector.
                    </p>
                    <div className="text-[10px] font-mono text-slate-700 pt-1 border-t border-amber-200/80 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#B45309]" />
                        <span>{tourist.current_location?.lat.toFixed(4)}°, {tourist.current_location?.lon.toFixed(4)}°</span>
                      </span>
                      <span>Squad: <strong>Forest Patrol Bravo</strong></span>
                    </div>
                  </div>

                  {/* Incoming Official Trail Advisory if sent by Control Room */}
                  {(tourist.last_assessment_reason && (tourist.last_assessment_reason.includes('Advisory Received') || tourist.last_assessment_reason.includes('Advisory Transmitted') || tourist.last_assessment_reason.includes('OFFICER-SATARA-HQ'))) && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-[#15803D] font-bold text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Official Route Advisory from Control Room</span>
                        </span>
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          LIVE
                        </span>
                      </div>
                      <p className="text-xs text-[#1D2939] italic font-semibold leading-relaxed bg-white/80 p-2 rounded border border-emerald-200">
                        "{tourist.last_assessment_reason.replace(/^Advisory (?:Received from|Transmitted by) [^:]+:\s*'?/, '').replace(/'?$/, '')}"
                      </p>
                      <p className="text-[10px] text-[#667085]">
                        Satara Command Center verified this waypoint path for your sector.
                      </p>
                    </div>
                  )}

                  {/* Resolution Action */}
                  <button
                    onClick={() => handleSafetyResponse(true)}
                    disabled={loading}
                    className="w-full py-2.5 px-3 text-xs font-bold rounded-lg bg-[#15803D] text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>I Found the Trail / I Am Safe</span>
                  </button>
                </div>
              ) : (
                /* PROACTIVE SAFETY CHECK-IN / NEED GUIDANCE ENTRY */
                <div className="bg-white rounded-xl p-4 border border-[#DCE3EC] shadow-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#B45309]" />
                    <span className="text-xs font-bold text-[#1D2939]">Proactive Safety Check-In</span>
                  </div>
                  <p className="text-xs text-[#667085] leading-relaxed">
                    Extended resting or slight deviation detected on Vasota trail. Select your condition:
                  </p>

                  {/* Quick Select Chips */}
                  <div className="flex flex-wrap gap-1">
                    {QUICK_NOTES.map(note => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => setGuidanceNote(note)}
                        className={`text-[10px] px-2 py-1 rounded-md text-left transition-colors border cursor-pointer ${
                          guidanceNote === note 
                            ? 'bg-blue-50 border-[#2563EB] text-[#2563EB] font-bold'
                            : 'bg-slate-50 border-[#DCE3EC] text-[#667085] hover:bg-slate-100'
                        }`}
                      >
                        {note}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={guidanceNote}
                    onChange={e => setGuidanceNote(e.target.value)}
                    placeholder="Describe trail condition or guidance needed..."
                    className="w-full text-xs p-2.5 border border-[#DCE3EC] rounded-lg text-[#1D2939] bg-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                    rows={2}
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleSafetyResponse(true)}
                      disabled={loading}
                      className="py-2.5 px-3 text-xs font-bold rounded-lg bg-[#15803D] text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>I Am Safe</span>
                    </button>

                    <button
                      onClick={() => handleSafetyResponse(false)}
                      disabled={loading}
                      className="py-2.5 px-3 text-xs font-bold rounded-lg bg-[#B45309] text-white hover:bg-amber-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Need Guidance</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Red SOS Panic Trigger Always Accessible at Bottom */}
            <div className="pt-2">
              <button
                onClick={handleTriggerSOS}
                disabled={loading}
                className="w-full py-3 px-4 text-xs font-extrabold uppercase tracking-wider rounded-xl bg-[#B91C1C] text-white hover:bg-red-800 transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer animate-pulse"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Emergency SOS Distress Call</span>
              </button>
              <p className="text-[10px] text-center text-[#667085] mt-1.5">
                Instantly transmits coordinates to Police Control Room & Mountain Rescue.
              </p>
            </div>
          </div>
        </div>

        {/* Smartphone Home Notch */}
        <div className="h-6 bg-[#101B2D] flex items-center justify-center shrink-0">
          <div className="w-24 h-1 rounded-full bg-slate-700" />
        </div>
      </div>
    </div>
  );
};
