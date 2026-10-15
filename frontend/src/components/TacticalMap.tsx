import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Circle,
  Polyline,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { Layers, Eye, EyeOff, Navigation, Plus, Trash2 } from 'lucide-react';
import type { TouristProfile, Geofence, ResponseUnit, Incident } from '../types';

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Map Center for Vasota Fort / Met Indavali / Koyna Wildlife Sanctuary Sector
const MAP_CENTER: [number, number] = [17.6680, 73.7080];

// Semantic color tokens matching Design System:
// LOW = green (#15803D), MEDIUM = amber (#B45309), HIGH = orange-red (#C2410C), CRITICAL = red (#B91C1C)
function createTouristIcon(riskLevel: string, isSos: boolean, isSelected: boolean, isGuidance: boolean = false) {
  let bgColor = '#15803D'; // emerald green
  if (riskLevel === 'MEDIUM' || isGuidance) bgColor = '#B45309'; // amber
  if (riskLevel === 'HIGH') bgColor = '#C2410C'; // orange-red
  if (riskLevel === 'CRITICAL' || isSos) bgColor = '#B91C1C'; // critical red

  let pulseClass = '';
  if (riskLevel === 'CRITICAL' || isSos) {
    pulseClass = 'custom-pulse-marker';
  } else if (isGuidance || riskLevel === 'MEDIUM') {
    pulseClass = 'custom-pulse-marker-amber';
  }

  const size = isSelected ? 26 : 20;
  const label = isSos ? '!' : (isGuidance ? '?' : 'T');

  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div class="${pulseClass}" style="
        background-color: ${bgColor};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${isSelected ? '3px solid #2563EB' : '2px solid #FFFFFF'};
        box-shadow: 0 2px 6px rgba(16, 27, 45, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: ${isSelected ? '12px' : '10px'};
        font-family: monospace;
      ">
        ${label}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function createUnitIcon(unitType: string, status: string) {
  let color = '#2563EB'; // police blue
  if (unitType === 'MOUNTAIN_RESCUE') color = '#7C3AED'; // purple
  if (unitType === 'MEDICAL') color = '#E11D48'; // rose
  if (unitType === 'RANGER') color = '#0D9488'; // teal

  const isBusy = status !== 'AVAILABLE';

  return L.divIcon({
    className: 'custom-leaflet-unit',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 6px;
        border: 2px solid ${isBusy ? '#F59E0B' : '#FFFFFF'};
        box-shadow: 0 2px 6px rgba(16, 27, 45, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 900;
        font-size: 10px;
        font-family: monospace;
      ">
        ${unitType === 'MOUNTAIN_RESCUE' ? 'M' : unitType === 'POLICE' ? 'P' : unitType === 'MEDICAL' ? 'A' : 'R'}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

interface TacticalMapProps {
  tourists: TouristProfile[];
  geofences: Geofence[];
  responseUnits: ResponseUnit[];
  incidents: Incident[];
  selectedTouristId: string | null;
  onSelectTourist: (id: string) => void;
  selectedIncident: Incident | null;
  onOpenCreateGeofence?: () => void;
  onDeleteGeofence?: (id: string) => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  tourists,
  geofences,
  responseUnits,
  incidents = [],
  selectedTouristId,
  onSelectTourist,
  selectedIncident,
  onOpenCreateGeofence,
  onDeleteGeofence
}) => {
  const [showGeofences, setShowGeofences] = useState<boolean>(true);
  const [showUnits, setShowUnits] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);

  const selectedTourist = tourists.find(t => t.tourist_id === selectedTouristId);
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-[#DCE3EC] shadow-sm bg-[#F4F7FB] flex flex-col">
      {/* Top Floating Sector Bar */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-[#DCE3EC] px-3 py-1.5 rounded-lg shadow-sm pointer-events-auto">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D2939] pr-2 border-r border-[#DCE3EC]">
          <Navigation className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Vasota Fort — Koyna Sanctuary Sector</span>
        </div>

        {/* Layer Toggles */}
        <button
          onClick={() => setShowGeofences(!showGeofences)}
          className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer font-mono ${
            showGeofences
              ? 'bg-blue-50 text-[#2563EB] border border-blue-200'
              : 'bg-slate-100 text-[#667085]'
          }`}
        >
          {showGeofences ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Geofences</span>
        </button>

        <button
          onClick={() => setShowUnits(!showUnits)}
          className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer font-mono ${
            showUnits
              ? 'bg-purple-50 text-purple-700 border border-purple-200'
              : 'bg-slate-100 text-[#667085]'
          }`}
        >
          {showUnits ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Response Squads</span>
        </button>

        <button
          onClick={() => setShowRoutes(!showRoutes)}
          className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer font-mono ${
            showRoutes
              ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
              : 'bg-slate-100 text-[#667085]'
          }`}
        >
          {showRoutes ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Planned Trail</span>
        </button>

        {onOpenCreateGeofence && (
          <button
            onClick={onOpenCreateGeofence}
            className="ml-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#2563EB] text-white hover:bg-blue-700 flex items-center gap-1 transition-all cursor-pointer font-mono shadow-xs"
            title="Deploy custom geofence perimeter"
          >
            <Plus className="w-3 h-3" />
            <span>+ Custom Geofence</span>
          </button>
        )}
      </div>

      <MapContainer
        center={MAP_CENTER}
        zoom={13}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full flex-1 min-h-[500px]"
        style={{ minHeight: '500px', width: '100%', height: '100%' }}
      >
        <MapResizeHandler />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl}
          maxZoom={19}
        />

        {/* 1. Geofences Rendering */}
        {showGeofences && geofences.map(gf => {
          if (gf.type === 'circle' && gf.center && gf.radius_meters) {
            let color = '#B45309'; // caution amber
            if (gf.category === 'danger') color = '#C2410C';
            if (gf.category === 'restricted') color = '#B91C1C';
            if (gf.category === 'crowd') color = '#7C3AED';

            return (
              <Circle
                key={gf.id}
                center={[gf.center.lat, gf.center.lon]}
                radius={gf.radius_meters}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: gf.category === 'crowd' ? 0.22 : 0.15,
                  weight: 2,
                  dashArray: gf.category === 'restricted' ? '4, 4' : undefined
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1 p-1">
                    <p className="font-bold text-[#1D2939]">{gf.name}</p>
                    <p className="text-[#667085] leading-snug">{gf.description}</p>
                    {gf.category === 'crowd' && (
                      <div className="pt-1 border-t border-[#DCE3EC]">
                        <span className="font-mono text-[10px] font-bold text-[#1D2939]">
                          Density: {((gf.crowd_density || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white bg-[#101B2D]">
                        {gf.category} Zone
                      </span>
                      {onDeleteGeofence && gf.id.startsWith('gf_custom_') && (
                        <button
                          onClick={() => onDeleteGeofence(gf.id)}
                          className="px-2 py-0.5 text-[10px] font-bold text-red-600 hover:bg-red-50 rounded flex items-center gap-1 cursor-pointer transition-colors"
                          title="Remove custom geofence"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          }

          if (gf.type === 'polygon' && gf.polygon_points) {
            const positions: [number, number][] = gf.polygon_points.map(pt => [pt.lat, pt.lon]);
            const color = gf.category === 'danger' ? '#B91C1C' : '#B45309';

            return (
              <Polygon
                key={gf.id}
                positions={positions}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.18,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1 p-1">
                    <p className="font-bold text-[#1D2939]">{gf.name}</p>
                    <p className="text-[#667085] leading-snug">{gf.description}</p>
                    {gf.weather_hazard && (
                      <p className="text-[#B45309] font-bold mt-1">Hazard: {gf.weather_hazard}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white bg-[#101B2D]">
                        {gf.category} Zone
                      </span>
                      {onDeleteGeofence && gf.id.startsWith('gf_custom_') && (
                        <button
                          onClick={() => onDeleteGeofence(gf.id)}
                          className="px-2 py-0.5 text-[10px] font-bold text-red-600 hover:bg-red-50 rounded flex items-center gap-1 cursor-pointer transition-colors"
                          title="Remove custom geofence"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          }
          return null;
        })}

        {/* 2. Planned Route Polyline */}
        {showRoutes && selectedTourist?.planned_route?.points && (
          <Polyline
            positions={selectedTourist.planned_route.points.map(pt => [pt.lat, pt.lon])}
            pathOptions={{ color: '#2563EB', weight: 3, dashArray: '6, 6', opacity: 0.85 }}
          />
        )}

        {/* 3. Incident Location Pulse Ring */}
        {selectedIncident && (
          <Circle
            center={[selectedIncident.location.lat, selectedIncident.location.lon]}
            radius={220}
            pathOptions={{ color: '#B91C1C', fillColor: '#B91C1C', fillOpacity: 0.25, weight: 2 }}
          />
        )}

        {/* 4. Tourist Markers */}
        {tourists.map(tourist => {
          if (!tourist.current_location) return null;
          const isSos = tourist.risk_factors?.sos_triggered !== undefined || tourist.risk_score === 100;
          const isSelected = tourist.tourist_id === selectedTouristId;
          const guidanceInc = incidents.find(
            i => i.tourist_id === tourist.tourist_id && i.type === 'ASSISTANCE_REQUEST' && i.status !== 'RESOLVED' && i.status !== 'FALSE_ALARM'
          );
          const isGuidance = !!guidanceInc || tourist.risk_level === 'MEDIUM';

          return (
            <Marker
              key={tourist.tourist_id}
              position={[tourist.current_location.lat, tourist.current_location.lon]}
              icon={createTouristIcon(tourist.risk_level, isSos, isSelected, isGuidance)}
              eventHandlers={{
                click: () => onSelectTourist(tourist.tourist_id)
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 p-1 min-w-[190px]">
                  <div className="flex items-center justify-between gap-2 border-b border-[#DCE3EC] pb-1">
                    <span className="font-bold text-[#1D2939]">{tourist.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white font-mono ${
                      tourist.risk_level === 'CRITICAL' ? 'bg-[#B91C1C]' :
                      tourist.risk_level === 'HIGH' ? 'bg-[#C2410C]' :
                      tourist.risk_level === 'MEDIUM' ? 'bg-[#B45309]' : 'bg-[#15803D]'
                    }`}>
                      {tourist.risk_level} ({tourist.risk_score})
                    </span>
                  </div>
                  {isGuidance && (
                    <div className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px] flex items-center gap-1">
                      <span>🟡</span>
                      <span>Trail Guidance Requested</span>
                    </div>
                  )}
                  <p className="text-[#667085]">ID: <span className="font-mono font-semibold text-[#1D2939]">{tourist.tourist_id}</span> • {tourist.persona_type}</p>
                  <p className="text-[#667085]">Deviation: <span className="font-semibold text-[#1D2939]">{tourist.current_route_deviation_meters.toFixed(0)} m</span></p>
                  <p className="text-[#667085]">Inactivity: <span className="font-semibold text-[#1D2939]">{tourist.inactivity_minutes.toFixed(0)} mins</span></p>
                  <p className="text-[#667085] italic text-[11px] pt-1 border-t border-[#DCE3EC]">{tourist.last_assessment_reason}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 5. Response Unit Markers */}
        {showUnits && responseUnits.map(unit => (
          <Marker
            key={unit.unit_id}
            position={[unit.current_location.lat, unit.current_location.lon]}
            icon={createUnitIcon(unit.type, unit.status)}
          >
            <Popup>
              <div className="text-xs space-y-1 p-1">
                <div className="font-bold text-[#1D2939]">{unit.name}</div>
                <div className="text-[#667085]">Unit Type: <span className="font-semibold">{unit.type}</span></div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full ${unit.status === 'AVAILABLE' ? 'bg-[#15803D]' : 'bg-[#B45309]'}`} />
                  <span className="font-bold uppercase text-[10px] text-[#1D2939] font-mono">{unit.status}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Bottom-Left Selected Tourist HUD Pill */}
      {selectedTourist && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs border border-[#DCE3EC] rounded-lg p-3 text-xs text-[#1D2939] shadow-md max-w-xs pointer-events-auto">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-bold truncate text-[#1D2939]">{selectedTourist.name}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200">
              {selectedTourist.tourist_id}
            </span>
          </div>
          <div className="text-[11px] text-[#667085] flex items-center gap-3">
            <span>Dev: <strong className="text-[#1D2939]">{selectedTourist.current_route_deviation_meters.toFixed(0)}m</strong></span>
            <span>Idle: <strong className="text-[#1D2939]">{selectedTourist.inactivity_minutes.toFixed(0)}m</strong></span>
            <span>Risk: <strong className="text-[#2563EB] font-bold">{selectedTourist.risk_score}</strong></span>
          </div>
        </div>
      )}

      {/* Tactical Map Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-xs border border-[#DCE3EC] rounded-lg p-3 text-xs text-[#1D2939] space-y-1.5 shadow-md pointer-events-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#667085] mb-1 flex items-center gap-1.5 font-mono">
          <Layers className="w-3 h-3 text-[#2563EB]" />
          <span>Operational Legend</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" /> <span>Low (Safe)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]" /> <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C2410C]" /> <span>High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C] animate-pulse" /> <span>Critical SOS</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#DCE3EC] text-[10px] text-[#667085]">
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-purple-600 text-[9px] flex items-center justify-center font-bold text-white">M</span>
            Rescue
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-[#2563EB] text-[9px] flex items-center justify-center font-bold text-white">P</span>
            Police
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 text-[9px] flex items-center justify-center font-bold text-white">A</span>
            Med
          </span>
        </div>
      </div>
    </div>
  );
};
