import { useState } from 'react';
import { useSimulationWebSocket } from './hooks/useSimulationWebSocket';
import { HeaderControls } from './components/HeaderControls';
import { TacticalMap } from './components/TacticalMap';
import { IncidentQueue } from './components/IncidentQueue';
import { EvidencePanel } from './components/EvidencePanel';
import { TouristCompanionModal } from './components/TouristCompanionModal';
import { CustomGeofenceModal } from './components/CustomGeofenceModal';
import { ControlRoomSidebar, type NavSection } from './components/ControlRoomSidebar';
import { ModuleViews } from './components/ModuleViews';
import type { Incident } from './types';

export function App() {
  const { data: simState, isConnected, refreshState } = useSimulationWebSocket();
  const [activeSection, setActiveSection] = useState<NavSection>('COMMAND');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedTouristId, setSelectedTouristId] = useState<string | null>(null);
  const [isCompanionOpen, setIsCompanionOpen] = useState<boolean>(false);
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState<boolean>(false);

  // Synchronize selected incident with live simulation state
  const activeIncident: Incident | null = selectedIncidentId
    ? simState?.incidents.find(i => i.incident_id === selectedIncidentId) || null
    : (simState?.incidents.find(i => i.status !== 'RESOLVED' && i.status !== 'FALSE_ALARM') || null);

  const activeTourist = selectedTouristId
    ? simState?.tourists.find(t => t.tourist_id === selectedTouristId) || null
    : (activeIncident ? simState?.tourists.find(t => t.tourist_id === activeIncident.tourist_id) || null : null);

  const handleSelectTourist = (touristId: string) => {
    setSelectedTouristId(touristId);
    const touristIncident = simState?.incidents.find(
      i => i.tourist_id === touristId && i.status !== 'RESOLVED' && i.status !== 'FALSE_ALARM'
    );
    if (touristIncident) {
      setSelectedIncidentId(touristIncident.incident_id);
    }
  };

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncidentId(incident.incident_id);
    setSelectedTouristId(incident.tourist_id);
  };

  const handleTriggerScenario = async (scenarioName: string) => {
    try {
      await fetch('http://localhost:8000/api/simulation/scenarios/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_name: scenarioName,
          tourist_id: selectedTouristId || 'T-101'
        })
      });
      await refreshState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStageAction = async (action: string, stage?: number) => {
    try {
      await fetch('http://localhost:8000/api/simulation/scenarios/trekking/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, stage })
      });
      setSelectedTouristId('T-101');
      await refreshState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGeofence = async (geofenceId: string) => {
    try {
      await fetch(`http://localhost:8000/api/geofences/${geofenceId}`, {
        method: 'DELETE'
      });
      await refreshState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetGeofences = async () => {
    try {
      await fetch('http://localhost:8000/api/geofences/reset', {
        method: 'POST'
      });
      await refreshState();
    } catch (e) {
      console.error(e);
    }
  };

  const openIncidentsCount = simState?.stats?.open_incidents_count || 0;
  const criticalCount = (simState?.incidents || []).filter(
    i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED' && i.status !== 'FALSE_ALARM'
  ).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F7FB] text-[#1D2939] font-sans antialiased">
      {/* 1. Left Control Room Fixed Navigation Sidebar */}
      <ControlRoomSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        openIncidentsCount={openIncidentsCount}
        criticalCount={criticalCount}
        connected={isConnected}
      />

      {/* 2. Main Operational Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0">
        <div className="p-4 md:p-6 space-y-4 max-w-[1700px] w-full mx-auto">
          {/* Header Controls & Telemetry */}
          <HeaderControls
            state={simState}
            isConnected={isConnected}
            onRefresh={refreshState}
            onTriggerScenario={handleTriggerScenario}
            onOpenTouristCompanion={() => setIsCompanionOpen(true)}
            onStageAction={handleStageAction}
          />

          {/* Tourist Companion Modal */}
          {isCompanionOpen && (
            <TouristCompanionModal
              tourist={activeTourist || (simState?.tourists ? simState.tourists[0] : null)}
              incidents={simState?.incidents || []}
              onClose={() => setIsCompanionOpen(false)}
              onRefresh={async (touristId?: string) => {
                const payload = await refreshState();
                if (payload && payload.incidents) {
                  const targetTid = touristId || activeTourist?.tourist_id || selectedTouristId || 'T-101';
                  setSelectedTouristId(targetTid);
                  const activeInc = [...payload.incidents]
                    .reverse()
                    .find((i: any) => i.tourist_id === targetTid && i.status !== 'RESOLVED' && i.status !== 'FALSE_ALARM');
                  if (activeInc) {
                    setSelectedIncidentId(activeInc.incident_id);
                  }
                }
              }}
            />
          )}

          {/* Dynamic Module Content View */}
          {activeSection === 'COMMAND' && (
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
              {/* Left: Incident Queue (3 cols) */}
              <section className="lg:col-span-3 h-[620px]">
                <IncidentQueue
                  incidents={simState?.incidents || []}
                  selectedIncidentId={activeIncident?.incident_id || null}
                  onSelectIncident={handleSelectIncident}
                />
              </section>

              {/* Center: Tactical Interactive Leaflet Map (5 cols) */}
              <section className="lg:col-span-5 h-[620px]">
                <TacticalMap
                  tourists={simState?.tourists || []}
                  geofences={simState?.geofences || []}
                  responseUnits={simState?.response_units || []}
                  incidents={simState?.incidents || []}
                  selectedTouristId={activeTourist?.tourist_id || null}
                  onSelectTourist={handleSelectTourist}
                  selectedIncident={activeIncident}
                  onOpenCreateGeofence={() => setIsGeofenceModalOpen(true)}
                  onDeleteGeofence={handleDeleteGeofence}
                />
              </section>

              {/* Right: Forensic Evidence & Dispatch Console (4 cols) */}
              <section className="lg:col-span-4 h-[620px]">
                <EvidencePanel
                  incident={activeIncident}
                  tourist={activeTourist}
                  onRefresh={refreshState}
                />
              </section>
            </main>
          )}

          {activeSection === 'INCIDENTS' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
              <section className="lg:col-span-5 h-[650px]">
                <IncidentQueue
                  incidents={simState?.incidents || []}
                  selectedIncidentId={activeIncident?.incident_id || null}
                  onSelectIncident={handleSelectIncident}
                />
              </section>
              <section className="lg:col-span-7 h-[650px]">
                <EvidencePanel
                  incident={activeIncident}
                  tourist={activeTourist}
                  onRefresh={refreshState}
                />
              </section>
            </div>
          )}

          {activeSection === 'MAP' && (
            <div className="h-[750px] w-full">
              <TacticalMap
                tourists={simState?.tourists || []}
                geofences={simState?.geofences || []}
                responseUnits={simState?.response_units || []}
                incidents={simState?.incidents || []}
                selectedTouristId={activeTourist?.tourist_id || null}
                onSelectTourist={handleSelectTourist}
                selectedIncident={activeIncident}
                onOpenCreateGeofence={() => setIsGeofenceModalOpen(true)}
                onDeleteGeofence={handleDeleteGeofence}
              />
            </div>
          )}

          {activeSection !== 'COMMAND' && activeSection !== 'INCIDENTS' && activeSection !== 'MAP' && (
            <ModuleViews
              section={activeSection}
              state={simState}
              onSelectTourist={handleSelectTourist}
              onSwitchToMap={() => setActiveSection('MAP')}
              onOpenCreateGeofence={() => setIsGeofenceModalOpen(true)}
              onDeleteGeofence={handleDeleteGeofence}
              onResetGeofences={handleResetGeofences}
            />
          )}

          {/* Custom Geofence Deployment Modal */}
          {isGeofenceModalOpen && (
            <CustomGeofenceModal
              isOpen={isGeofenceModalOpen}
              onClose={() => setIsGeofenceModalOpen(false)}
              onCreated={async () => {
                await refreshState();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
