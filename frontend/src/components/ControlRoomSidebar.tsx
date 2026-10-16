import React from 'react';
import {
  ShieldAlert,
  MapPin,
  Users,
  Compass,
  Radio,
  FileText,
  Activity,
  Layers,
  Lock
} from 'lucide-react';
import { BrandEmblem } from './BrandEmblem';

export type NavSection = 'COMMAND' | 'INCIDENTS' | 'MAP' | 'TOURISTS' | 'CROWD' | 'GEOFENCES' | 'UNITS' | 'DIGITAL_ID' | 'AUDIT';

interface ControlRoomSidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  openIncidentsCount: number;
  criticalCount: number;
  connected: boolean;
}

export const ControlRoomSidebar: React.FC<ControlRoomSidebarProps> = ({
  activeSection,
  onSelectSection,
  openIncidentsCount,
  criticalCount,
  connected
}) => {
  const navItems = [
    {
      id: 'COMMAND' as NavSection,
      label: 'Command Center',
      icon: Activity,
      badge: openIncidentsCount > 0 ? `${openIncidentsCount}` : undefined,
      badgeColor: criticalCount > 0 ? 'bg-[#B91C1C] text-white' : 'bg-[#2563EB] text-white'
    },
    {
      id: 'INCIDENTS' as NavSection,
      label: 'Incident Queue',
      icon: ShieldAlert,
      badge: criticalCount > 0 ? `${criticalCount} SOS` : (openIncidentsCount > 0 ? `${openIncidentsCount}` : undefined),
      badgeColor: criticalCount > 0 ? 'bg-[#B91C1C] text-white animate-pulse' : 'bg-[#2563EB] text-white'
    },
    {
      id: 'MAP' as NavSection,
      label: 'Live Tactical Map',
      icon: MapPin
    },
    {
      id: 'TOURISTS' as NavSection,
      label: 'Tourist Registry',
      icon: Users
    },
    {
      id: 'CROWD' as NavSection,
      label: 'Crowd Intelligence',
      icon: Layers
    },
    {
      id: 'GEOFENCES' as NavSection,
      label: 'Geofence Zones',
      icon: Compass
    },
    {
      id: 'UNITS' as NavSection,
      label: 'Response Units',
      icon: Radio
    },
    {
      id: 'DIGITAL_ID' as NavSection,
      label: 'Digital Tourist ID',
      icon: Lock
    },
    {
      id: 'AUDIT' as NavSection,
      label: 'Audit & Forensics',
      icon: FileText
    }
  ];

  return (
    <aside className="w-64 bg-[#101B2D] text-slate-300 flex flex-col shrink-0 border-r border-[#1B2A42] select-none">
      {/* Top Brand Header */}
      <div className="h-16 px-4 flex items-center gap-3 border-b border-[#1B2A42]">
        <BrandEmblem size="md" variant="dark" />
        <div className="flex flex-col">
          <span className="font-bold text-white text-[14px] tracking-wide leading-tight flex items-center gap-1.5">
            TouristIQ
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">HQ</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider">
            SAFETY INTELLIGENCE
          </span>
        </div>
      </div>

      {/* Control Room Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          OPERATIONAL MODULES
        </div>
        {navItems.map(item => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-[#18263D] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-700 text-white'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Dispatch Officer Status & System Telemetry */}
      <div className="p-3 border-t border-[#1B2A42] bg-[#0C1523] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-mono">STATION:</span>
          <span className="font-bold text-slate-200">HQ-KOYNA-BAMNOLI</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-mono">ROLE:</span>
          <span className="font-bold text-slate-200">INCIDENT CONTROLLER</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[#1B2A42]/60 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#15803D]' : 'bg-[#B91C1C]'}`} />
            <span className={connected ? 'text-emerald-400' : 'text-red-400'}>
              {connected ? 'NETWORK SYNC' : 'OFFLINE'}
            </span>
          </div>
          <span className="text-slate-500">v1.2.4</span>
        </div>
      </div>
    </aside>
  );
};
