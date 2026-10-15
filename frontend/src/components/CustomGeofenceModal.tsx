import React, { useState } from 'react';
import { X, ShieldAlert, Compass, Plus, Trash2, MapPin, CheckCircle2 } from 'lucide-react';
import type { Geofence, Coordinates } from '../types';

interface CustomGeofenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (geofence: Geofence) => void;
  initialCenter?: Coordinates;
}

const PRESET_LOCATIONS = [
  { name: 'Met Indavali Trailhead', lat: 17.6717, lon: 73.7172 },
  { name: 'Vasota Fort Citadel', lat: 17.6633, lon: 73.6969 },
  { name: 'Kala Chor Cliff Flank', lat: 17.6650, lon: 73.6920 },
  { name: 'Bamnoli Boat Jetty Hub', lat: 17.7270, lon: 73.7460 },
  { name: 'Shivsagar Lake Shore', lat: 17.6740, lon: 73.7230 },
];

export const CustomGeofenceModal: React.FC<CustomGeofenceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialCenter
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'circle' | 'polygon'>('circle');
  const [category, setCategory] = useState<'danger' | 'restricted' | 'caution' | 'safe' | 'crowd'>('danger');
  const [description, setDescription] = useState('');
  const [weatherHazard, setWeatherHazard] = useState<string>('none');
  
  // Circle params
  const [centerLat, setCenterLat] = useState<number>(initialCenter?.lat || 17.6650);
  const [centerLon, setCenterLon] = useState<number>(initialCenter?.lon || 73.6920);
  const [radiusMeters, setRadiusMeters] = useState<number>(300);

  // Polygon params
  const [polygonPoints, setPolygonPoints] = useState<Coordinates[]>([
    { lat: 17.6680, lon: 73.6930 },
    { lat: 17.6720, lon: 73.6910 },
    { lat: 17.6710, lon: 73.6970 }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddVertex = () => {
    const last = polygonPoints[polygonPoints.length - 1] || { lat: 17.6680, lon: 73.6930 };
    setPolygonPoints([...polygonPoints, { lat: +(last.lat + 0.0015).toFixed(4), lon: +(last.lon + 0.0015).toFixed(4) }]);
  };

  const handleRemoveVertex = (index: number) => {
    if (polygonPoints.length <= 3) {
      setErrorMsg('A polygon requires at least 3 vertices.');
      return;
    }
    setErrorMsg(null);
    setPolygonPoints(polygonPoints.filter((_, i) => i !== index));
  };

  const handleVertexChange = (index: number, field: 'lat' | 'lon', value: number) => {
    const updated = [...polygonPoints];
    updated[index] = { ...updated[index], [field]: value };
    setPolygonPoints(updated);
  };

  const handleSelectPreset = (p: typeof PRESET_LOCATIONS[0]) => {
    setCenterLat(p.lat);
    setCenterLon(p.lon);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please specify a recognizable geofence name.');
      return;
    }

    const customId = `gf_custom_${Date.now()}`;
    const payload: Geofence = {
      id: customId,
      name: name.trim(),
      type,
      category,
      description: description.trim() || `Operator-defined ${category} perimeter`,
      weather_hazard: weatherHazard !== 'none' ? weatherHazard : undefined,
      crowd_density: category === 'crowd' ? 0.65 : 0.0,
      center: type === 'circle' ? { lat: centerLat, lon: centerLon } : undefined,
      radius_meters: type === 'circle' ? radiusMeters : undefined,
      polygon_points: type === 'polygon' ? polygonPoints : undefined
    };

    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:8000/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create geofence');
      }

      const created = await res.json();
      onCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating geofence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#DCE3EC] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-[#101B2D] px-6 py-4 flex items-center justify-between text-white border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#2563EB]/20 text-[#60A5FA]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Deploy Custom Geofence</h2>
              <p className="text-xs text-slate-400">Establish dynamic safety perimeters, cliffs, and hazard corridors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-[#B91C1C] flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-[#1D2939] mb-1">Geofence Name</label>
              <input
                type="text"
                placeholder="e.g. Babu Kada Precipice Watch"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE3EC] focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#1D2939] mb-1">Safety Classification</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE3EC] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="danger">🔴 Danger Zone (Wildlife, Cliffs)</option>
                <option value="restricted">⛔ Restricted (Strict No-Entry)</option>
                <option value="caution">🟡 Caution (Water Fluctuation, Slippery)</option>
                <option value="safe">🟢 Safe Corridor (Assembly, Shelters)</option>
                <option value="crowd">🟣 Crowd Surge Area (Jetty, Promenades)</option>
              </select>
            </div>
          </div>

          {/* Geometry Selector */}
          <div>
            <label className="block font-bold text-[#1D2939] mb-1">Geofence Geometry</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('circle')}
                className={`py-2 px-3 rounded-lg border font-bold text-center transition-all ${
                  type === 'circle'
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                    : 'bg-white text-[#1D2939] border-[#DCE3EC] hover:bg-slate-50'
                }`}
              >
                ⭕ Circular Radial Zone
              </button>
              <button
                type="button"
                onClick={() => setType('polygon')}
                className={`py-2 px-3 rounded-lg border font-bold text-center transition-all ${
                  type === 'polygon'
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                    : 'bg-white text-[#1D2939] border-[#DCE3EC] hover:bg-slate-50'
                }`}
              >
                🔷 Multi-Point Polygon
              </button>
            </div>
          </div>

          {/* Circle Parameters */}
          {type === 'circle' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1D2939]">Circle Coordinate Center</span>
                <span className="text-[10px] text-[#667085]">Quick presets:</span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                {PRESET_LOCATIONS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className="px-2 py-1 text-[11px] font-medium rounded-md bg-white border border-[#DCE3EC] text-[#1D2939] hover:bg-blue-50 hover:border-blue-200 transition-colors inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3 text-[#2563EB]" />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#667085] mb-0.5">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={centerLat}
                    onChange={e => setCenterLat(parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-[#DCE3EC] bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#667085] mb-0.5">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={centerLon}
                    onChange={e => setCenterLon(parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-[#DCE3EC] bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#1D2939] mb-1">
                  <span>Perimeter Radius: <span className="font-mono text-[#2563EB]">{radiusMeters} meters</span></span>
                  <span className="text-[#667085]">50m – 2500m</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="25"
                  value={radiusMeters}
                  onChange={e => setRadiusMeters(parseInt(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Polygon Parameters */}
          {type === 'polygon' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1D2939]">Boundary Vertices ({polygonPoints.length})</span>
                <button
                  type="button"
                  onClick={handleAddVertex}
                  className="px-2 py-1 text-[11px] font-bold rounded bg-[#2563EB] text-white hover:bg-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Vertex</span>
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {polygonPoints.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-center font-mono font-bold text-[#667085] text-[11px]">#{idx + 1}</span>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Lat"
                      value={pt.lat}
                      onChange={e => handleVertexChange(idx, 'lat', parseFloat(e.target.value))}
                      className="flex-1 px-2.5 py-1 text-xs font-mono rounded border border-[#DCE3EC] bg-white"
                      required
                    />
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Lon"
                      value={pt.lon}
                      onChange={e => handleVertexChange(idx, 'lon', parseFloat(e.target.value))}
                      className="flex-1 px-2.5 py-1 text-xs font-mono rounded border border-[#DCE3EC] bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveVertex(idx)}
                      disabled={polygonPoints.length <= 3}
                      className="p-1 rounded text-[#667085] hover:text-red-600 disabled:opacity-30 cursor-pointer"
                      title="Remove vertex"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Environmental Hazard & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-[#1D2939] mb-1">Associated Hazard (Optional)</label>
              <select
                value={weatherHazard}
                onChange={e => setWeatherHazard(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE3EC] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="none">None / Standard Zone</option>
                <option value="landslide_risk">⚠️ Landslide & Rockfall Hazard</option>
                <option value="heavy_rain">🌧️ Heavy Sahyadri Rain & Fog</option>
                <option value="flash_flood">🌊 Backwater Surge / Flash Flood</option>
                <option value="wildlife_movement">🐆 Wildlife / Leopard Corridor</option>
                <option value="steep_cliff">⛰️ Steep Ridge & Unfenced Dropoff</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1D2939] mb-1">Operational Description</label>
              <input
                type="text"
                placeholder="e.g. Trigger warnings if trekkers cross past 16:00"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE3EC] focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[#DCE3EC] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-[#DCE3EC] text-[#1D2939] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Deploying...' : 'Deploy Geofence'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
