import React from 'react';
import {
  Users,
  Compass,
  Radio,
  FileText,
  Lock,
  Layers,
  Search,
  ShieldCheck,
  ArrowRight,
  Eye,
  Plus,
  Trash2,
  RotateCcw
} from 'lucide-react';
import type { SimulationState } from '../types';
import { SeverityBadge } from './DesignSystemUI';

interface ModuleViewsProps {
  section: string;
  state: SimulationState | null;
  onSelectTourist: (id: string) => void;
  onSwitchToMap: () => void;
  onOpenCreateGeofence?: () => void;
  onDeleteGeofence?: (id: string) => void;
  onResetGeofences?: () => void;
}

export const ModuleViews: React.FC<ModuleViewsProps> = ({
  section,
  state,
  onSelectTourist,
  onSwitchToMap,
  onOpenCreateGeofence,
  onDeleteGeofence,
  onResetGeofences
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  // 1. TOURISTS REGISTRY TABLE
  if (section === 'TOURISTS') {
    const tourists = (state?.tourists || []).filter(t => {
      const q = searchTerm.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.tourist_id.toLowerCase().includes(q) ||
        t.nationality.toLowerCase().includes(q) ||
        t.persona_type.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-[#1D2939] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#2563EB]" />
              Registered Tourist Manifest & Live Safety Telemetry
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Active tourists tracked across Vasota Fort and Koyna Wildlife Sanctuary trails with live route deviation, battery state and digital ID hash.
            </p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, name, nationality..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DCE3EC] rounded-lg text-[#1D2939] placeholder-[#667085] focus:outline-none focus:border-[#2563EB] w-72"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#DCE3EC] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[#667085] uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Tourist / ID</th>
                  <th className="py-3 px-4 font-semibold">Persona / Age</th>
                  <th className="py-3 px-4 font-semibold">Risk Level</th>
                  <th className="py-3 px-4 font-semibold">Route Deviation</th>
                  <th className="py-3 px-4 font-semibold">Inactivity</th>
                  <th className="py-3 px-4 font-semibold">Latest Observation</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC]">
                {tourists.map(t => (
                  <tr key={t.tourist_id} className="hover:bg-[#F4F7FB] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1D2939]">{t.name}</div>
                      <div className="font-mono text-[11px] text-[#667085]">{t.tourist_id} • {t.nationality}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-medium text-[#1D2939]">{t.persona_type}</span>
                      <div className="text-[11px] text-[#667085]">{t.age} yrs • Contact: {t.emergency_contact}</div>
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={t.risk_level} size="sm" />
                      <span className="ml-2 font-mono font-bold text-[#1D2939]">{t.risk_score}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#1D2939]">
                      {t.current_route_deviation_meters.toFixed(0)} m
                    </td>
                    <td className="py-3 px-4 font-mono text-[#1D2939]">
                      {t.inactivity_minutes.toFixed(0)} mins
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[#667085]" title={t.last_assessment_reason}>
                      {t.last_assessment_reason}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          onSelectTourist(t.tourist_id);
                          onSwitchToMap();
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#2563EB] text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Locate</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. CROWD INTELLIGENCE
  if (section === 'CROWD') {
    const crowdGeofences = (state?.geofences || []).filter(g => g.category === 'crowd');
    const highDensityCount = crowdGeofences.filter(g => (g.crowd_density || 0) > 0.8).length;

    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm">
          <h2 className="text-lg font-bold text-[#1D2939] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#2563EB]" />
            Crowd Density Monitoring & Surge Prevention
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Real-time pedestrian capacity thresholds computed from tourist GPS telemetry across high-traffic pedestrian nodes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm">
            <span className="text-xs font-bold text-[#667085] uppercase font-mono">Monitored Zones</span>
            <div className="text-2xl font-bold font-mono text-[#1D2939] mt-1">{crowdGeofences.length}</div>
            <span className="text-[11px] text-[#667085]">Active tourist hotspots</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm">
            <span className="text-xs font-bold text-[#667085] uppercase font-mono">Surge Warnings (&gt;80%)</span>
            <div className={`text-2xl font-bold font-mono mt-1 ${highDensityCount > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
              {highDensityCount}
            </div>
            <span className="text-[11px] text-[#667085]">Zones requiring crowd marshals</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm">
            <span className="text-xs font-bold text-[#667085] uppercase font-mono">Automated Protocol</span>
            <div className="text-sm font-bold text-[#1D2939] mt-2">Dynamic Diversions Ready</div>
            <span className="text-[11px] text-[#667085]">Early warning push notifications</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {crowdGeofences.map(gf => {
            const density = (gf.crowd_density || 0) * 100;
            const isCritical = density > 80;
            return (
              <div key={gf.id} className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#1D2939] text-sm">{gf.name}</h3>
                    <p className="text-xs text-[#667085]">{gf.description}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    isCritical ? 'bg-red-50 text-[#B91C1C] border border-red-200 animate-pulse' : 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                  }`}>
                    {density.toFixed(0)}% CAPACITY
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-[#667085]">
                    <span>Occupancy Level</span>
                    <span className="font-mono text-[#1D2939]">{density.toFixed(1)}% / 100%</span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${isCritical ? 'bg-[#B91C1C]' : 'bg-[#2563EB]'}`}
                      style={{ width: `${Math.min(100, density)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#DCE3EC] flex items-center justify-between text-xs text-[#667085]">
                  <span>Threshold: 80% Max</span>
                  <button
                    onClick={onSwitchToMap}
                    className="text-[#2563EB] hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <span>View on Tactical Map</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. GEOFENCE ZONES
  if (section === 'GEOFENCES') {
    const geofences = state?.geofences || [];
    const hasCustomZones = geofences.some(g => g.id.startsWith('gf_custom_'));

    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#1D2939] flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#2563EB]" />
              Active Geofence Boundaries & Hazard Perimeters
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Geometric multi-polygon zones, restricted cliffs, hazard corridors and dynamic custom perimeters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onResetGeofences && hasCustomZones && (
              <button
                onClick={onResetGeofences}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#DCE3EC] text-[#667085] hover:text-[#1D2939] hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Reset all geofences back to system defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            )}

            {onOpenCreateGeofence && (
              <button
                onClick={onOpenCreateGeofence}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Deploy Custom Geofence</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {geofences.map(gf => {
            const isCustom = gf.id.startsWith('gf_custom_');
            return (
              <div key={gf.id} className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm space-y-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-[#667085] border border-[#DCE3EC]">
                          {gf.type.toUpperCase()} • {gf.category.toUpperCase()}
                        </span>
                        {isCustom && (
                          <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200">
                            CUSTOM PERIMETER
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-[#1D2939] text-sm mt-1">{gf.name}</h3>
                    </div>
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      gf.category === 'danger' || gf.category === 'restricted' ? 'bg-[#B91C1C]' :
                      gf.category === 'caution' ? 'bg-[#B45309]' : 'bg-[#15803D]'
                    }`} />
                  </div>

                  <p className="text-xs text-[#667085] leading-relaxed">{gf.description}</p>

                  {gf.weather_hazard && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                      Active Hazard: {gf.weather_hazard}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#DCE3EC] text-[11px] text-[#667085] flex items-center justify-between font-mono">
                  <span>{gf.radius_meters ? `Radius: ${gf.radius_meters}m` : `Vertices: ${gf.polygon_points?.length || 0}`}</span>
                  <div className="flex items-center gap-2">
                    {onDeleteGeofence && isCustom && (
                      <button
                        onClick={() => onDeleteGeofence(gf.id)}
                        className="text-red-600 hover:text-red-700 font-sans font-semibold inline-flex items-center gap-0.5 hover:underline cursor-pointer"
                        title="Delete custom geofence"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                    <button onClick={onSwitchToMap} className="text-[#2563EB] font-sans font-semibold hover:underline cursor-pointer">
                      Inspect
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. RESPONSE UNITS
  if (section === 'UNITS') {
    const units = state?.response_units || [];
    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm">
          <h2 className="text-lg font-bold text-[#1D2939] flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#2563EB]" />
            First Response Units & Dispatch Fleet Readiness
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Emergency response units across Police, Mountain Rescue, Medical Ambulance and Forest Rangers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {units.map(u => {
            const isAvail = u.status === 'AVAILABLE';
            return (
              <div key={u.unit_id} className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#667085]">{u.unit_id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    isAvail ? 'bg-emerald-50 text-[#15803D] border border-emerald-200' : 'bg-amber-50 text-[#B45309] border border-amber-200'
                  }`}>
                    {u.status}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-[#1D2939] text-sm">{u.name}</h3>
                  <span className="text-xs text-[#667085]">{u.type} Squad</span>
                </div>
                <div className="pt-2 border-t border-[#DCE3EC] text-xs font-mono text-[#667085] flex items-center justify-between">
                  <span>GPS: {u.current_location.lat.toFixed(3)}, {u.current_location.lon.toFixed(3)}</span>
                  <button onClick={onSwitchToMap} className="text-[#2563EB] font-sans font-semibold hover:underline">
                    Locate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 5. DIGITAL TOURIST ID
  if (section === 'DIGITAL_ID') {
    const tourists = state?.tourists || [];
    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm">
          <h2 className="text-lg font-bold text-[#1D2939] flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#2563EB]" />
            Blockchain-Anchored Digital Tourist Identity Verification
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Tamper-proof cryptographic hashes representing verified KYC & digital permits without storing raw biometric data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tourists.map(t => (
            <div key={t.tourist_id} className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#1D2939] text-sm">{t.name}</h3>
                  <span className="text-xs text-[#667085]">ID: {t.tourist_id} • {t.nationality}</span>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-[#15803D] border border-emerald-200 font-mono text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  VERIFIED
                </span>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC] space-y-1.5 font-mono text-xs">
                <div className="text-[11px] text-[#667085] uppercase">Digital ID Permit Hash</div>
                <div className="text-[#1D2939] break-all font-semibold select-all">
                  {t.digital_id_hash}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[#667085]">
                <div>Permit Status: <strong className="text-[#1D2939]">Valid Season Pass</strong></div>
                <div>Consent Stamped: <strong className="text-[#15803D]">Yes (Opt-in)</strong></div>
                <div>Emergency Contact: <strong className="text-[#1D2939]">{t.emergency_contact}</strong></div>
                <div>Persona Type: <strong className="text-[#1D2939] capitalize">{t.persona_type}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 6. AUDIT & FORENSICS
  if (section === 'AUDIT') {
    const incidents = state?.incidents || [];
    const allTimelineEntries: Array<{ incId: string; entry: any }> = [];
    incidents.forEach(inc => {
      (inc.timeline || []).forEach(item => {
        allTimelineEntries.push({ incId: inc.incident_id, entry: item });
      });
    });
    allTimelineEntries.sort((a, b) => b.entry.timestamp - a.entry.timestamp);

    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-sm">
          <h2 className="text-lg font-bold text-[#1D2939] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#2563EB]" />
            Chronological Control Room Audit & Evidence Trail
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Immutable log of all detection triggers, officer acknowledgements, unit dispatch orders and resolution summaries.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#DCE3EC] shadow-sm p-4 space-y-3">
          <div className="text-xs font-mono font-bold text-[#667085] uppercase">
            Logged Operations: {allTimelineEntries.length} events
          </div>

          <div className="divide-y divide-[#DCE3EC]">
            {allTimelineEntries.map((item, idx) => {
              const dt = new Date(item.entry.timestamp * 1000);
              return (
                <div key={idx} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#2563EB]">{item.incId}</span>
                      <span className="font-bold text-xs text-[#1D2939]">{item.entry.action}</span>
                      {item.entry.severity && <SeverityBadge severity={item.entry.severity} size="sm" />}
                    </div>
                    <p className="text-xs text-[#667085]">
                      Actor: <strong className="text-[#1D2939]">{item.entry.actor || 'SYSTEM'}</strong>
                      {item.entry.reason && ` • Reason: ${item.entry.reason}`}
                      {item.entry.note && ` • Note: ${item.entry.note}`}
                      {item.entry.resolution && ` • Resolution: ${item.entry.resolution}`}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-[#667085] shrink-0">
                    {dt.toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
