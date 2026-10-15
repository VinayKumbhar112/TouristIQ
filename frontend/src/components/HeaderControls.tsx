import React from 'react';
import {
  Users,
  AlertOctagon,
  ShieldAlert,
  Radio,
  Play,
  Pause,
  RotateCcw,
  Smartphone,
  ChevronRight,
  Clock
} from 'lucide-react';
import type { SimulationState } from '../types';
import { MetricCard } from './DesignSystemUI';
import { BrandEmblem } from './BrandEmblem';

interface HeaderControlsProps {
  state: SimulationState | null;
  isConnected: boolean;
  onRefresh: () => void;
  onTriggerScenario: (name: string) => void;
  onOpenTouristCompanion: () => void;
  onStageAction: (action: string, stage?: number) => void;
}

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  state,
  isConnected,
  onRefresh,
  onTriggerScenario,
  onOpenTouristCompanion,
  onStageAction
}) => {
  const stats = state?.stats || {
    total_tourists: 0,
    high_critical_risk_count: 0,
    open_incidents_count: 0,
    available_units_count: 0
  };

  const currentScenStage = state?.trekking_scenario?.current_stage || 1;

  const handleSimAction = async (action: string, speed?: number) => {
    try {
      await fetch('http://localhost:8000/api/simulation/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, speed })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const simDate = state?.sim_time ? new Date(state.sim_time * 1000) : new Date();

  return (
    <div className="space-y-3.5">
      {/* 1. Global Tactical Command Bar */}
      <header className="bg-white rounded-xl border border-[#DCE3EC] px-5 py-3 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Sector & Telemetry Identity */}
        <div className="flex items-center gap-3.5">
          <BrandEmblem size="md" variant="dark" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-[#1D2939]">
                Vasota Fort — Koyna Sanctuary Sector Command
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isConnected
                  ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                  : 'bg-red-50 text-[#B91C1C] border border-red-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#15803D] animate-ping' : 'bg-[#B91C1C]'}`} />
                {isConnected ? 'TELEMETRY SYNCED' : 'DISCONNECTED'}
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Live AI Anomaly Detection, Circular & Polygon Geo-fences across Met Indavali Trail and Shivsagar Lake
            </p>
          </div>
        </div>

        {/* Right: Simulation Controls & Tourist Companion */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Simulation Clock & Running Pill */}
          <div className="flex items-center gap-1.5 bg-[#F4F7FB] border border-[#DCE3EC] rounded-lg px-3 py-1.5 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-[#667085]" />
            <span className="text-[#667085]">CLOCK:</span>
            <span className="text-[#1D2939] font-bold">{simDate.toLocaleTimeString()}</span>
            <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
              state?.is_paused
                ? 'bg-amber-100 text-[#B45309] border border-amber-300'
                : 'bg-emerald-100 text-[#15803D] border border-emerald-300'
            }`}>
              {state?.is_paused ? 'PAUSED' : 'LIVE TICK'}
            </span>
          </div>

          {/* Resume/Pause Button */}
          <button
            onClick={() => handleSimAction(state?.is_paused ? 'resume' : 'pause')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              state?.is_paused
                ? 'bg-[#2563EB] text-white border-transparent hover:bg-blue-700'
                : 'bg-white text-[#1D2939] border-[#DCE3EC] hover:bg-slate-50'
            }`}
          >
            {state?.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{state?.is_paused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Step Button */}
          <button
            onClick={() => handleSimAction('step')}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white text-[#1D2939] border border-[#DCE3EC] hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
            title="Step +5 seconds"
          >
            Step +5s
          </button>

          {/* Reset Button */}
          <button
            onClick={() => handleSimAction('reset')}
            className="p-2 text-[#667085] hover:text-[#1D2939] rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-[#DCE3EC] cursor-pointer"
            title="Reset Simulation Engine"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Tourist Mobile Device Simulator */}
          <button
            onClick={onOpenTouristCompanion}
            className="ml-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0F766E] text-white hover:bg-teal-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Tourist Mobile</span>
          </button>
        </div>
      </header>

      {/* 2. Compact Operational Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <MetricCard
          label="Monitored Tourists"
          value={stats.total_tourists}
          subtext="Active in Vasota Fort Corridor"
          icon={Users}
          accentColor="blue"
        />
        <MetricCard
          label="Elevated Risk"
          value={stats.high_critical_risk_count}
          subtext="Multi-hazard compounded &gt;50"
          icon={ShieldAlert}
          accentColor={stats.high_critical_risk_count > 0 ? 'red' : 'green'}
          badge={stats.high_critical_risk_count > 0 ? `${stats.high_critical_risk_count} FLAG` : 'NOMINAL'}
        />
        <MetricCard
          label="Open Incidents"
          value={stats.open_incidents_count}
          subtext="Awaiting response action"
          icon={AlertOctagon}
          accentColor={stats.open_incidents_count > 0 ? 'red' : 'green'}
          badge={stats.open_incidents_count > 0 ? `${stats.open_incidents_count} ACTION` : 'ALL CLEAR'}
        />
        <MetricCard
          label="Response Readiness"
          value={stats.available_units_count}
          subtext="Police, Med, Rescue on standby"
          icon={Radio}
          accentColor="green"
        />
      </div>

      {/* 3. Simulation Scenario Triggers */}
      <div className="bg-white rounded-xl border border-[#DCE3EC] px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085]">
            Simulation Scenarios:
          </span>
          {state?.trekking_scenario?.stage_title && (
            <span className="text-[11px] font-bold text-[#1D2939] px-2.5 py-0.5 rounded-full bg-[#F4F7FB] border border-[#DCE3EC]">
              Stage {currentScenStage}/8: {state.trekking_scenario.stage_title}
            </span>
          )}
        </div>

        {/* Quick Scenario Triggers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onStageAction('next')}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <span>Next Stage</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onTriggerScenario('trekking_escalation')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-50 text-[#1D2939] border border-[#DCE3EC] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Remote Trek Divergence
          </button>
          <button
            onClick={() => onTriggerScenario('sos_immediate')}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-50 text-[#B91C1C] border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
          >
            Immediate SOS Panic
          </button>
          <button
            onClick={() => onTriggerScenario('crowd_surge')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-teal-50 text-[#0F766E] border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer"
          >
            Bamnoli Jetty Crowd Surge
          </button>
          <button
            onClick={() => onTriggerScenario('false_alarm_cafe')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-50 text-[#1D2939] border border-[#DCE3EC] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cafe Rest (False Alarm)
          </button>
        </div>
      </div>
    </div>
  );
};
