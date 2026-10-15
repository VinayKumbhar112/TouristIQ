import { useEffect, useRef, useState, useCallback } from 'react';
import type { SimulationState } from '../types';

export function useSimulationWebSocket() {
  const [data, setData] = useState<SimulationState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const parseAndSetPayload = useCallback((payload: any) => {
    setData({
      sim_time: payload.sim_time,
      is_paused: payload.is_paused ?? false,
      speed_multiplier: payload.speed_multiplier ?? 1.0,
      tourists: payload.tourists || [],
      incidents: payload.incidents || [],
      response_units: payload.response_units || [],
      geofences: payload.geofences || [],
      stats: payload.stats || {
        total_tourists: (payload.tourists || []).length,
        high_critical_risk_count: (payload.tourists || []).filter((t: any) => t.risk_level === 'HIGH' || t.risk_level === 'CRITICAL').length,
        open_incidents_count: (payload.incidents || []).filter((i: any) => i.status !== 'RESOLVED' && i.status !== 'FALSE_ALARM').length,
        available_units_count: (payload.response_units || []).filter((u: any) => u.status === 'AVAILABLE').length,
      },
      trekking_scenario: payload.trekking_scenario
    });
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/state');
      if (res.ok) {
        const payload = await res.json();
        parseAndSetPayload(payload);
        return payload;
      }
    } catch (e) {
      console.error("Failed to fetch state snapshot:", e);
    }
    return null;
  }, [parseAndSetPayload]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'SIMULATION_TICK' || payload.event === 'INIT_STATE' || payload.event === 'STATE_SNAPSHOT') {
            parseAndSetPayload(payload);
          }
        } catch (err) {
          console.error("Error parsing websocket message:", err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch (e) {
      console.error("WS connection error:", e);
      reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
    }
  }, [parseAndSetPayload]);

  useEffect(() => {
    refreshState();
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect, refreshState]);

  return { data, isConnected, refreshState };
}
