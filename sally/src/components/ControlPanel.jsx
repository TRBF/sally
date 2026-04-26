import React from 'react';
import logo from '../assets/Logo Sally.jpeg';
import { Flame, ShieldPlus, Navigation, MousePointer2, Trash2, Eraser } from 'lucide-react';

export default function ControlPanel({
  mode,
  setMode,
  hazards,
  safeZones,
  aidZones = [],
  routes,
  onClearAllRoutes,
}) {
  return (
    <div className="control-panel glass-panel">
      <div className="header">
        <h1>SALLY <img src={logo} alt="Logo" style={{ height: '32px', borderRadius: '4px' }} /></h1>
        <p>Disaster Response & Evacuation</p>
      </div>

      <div className="tools">
        <button 
          className={`tool-btn ${mode === 'view' ? 'active' : ''}`}
          onClick={() => setMode('view')}
        >
          <MousePointer2 size={20} />
          Pan & View Map
        </button>
        
        <button 
          className={`tool-btn hazard-btn ${mode === 'add_hazard' ? 'active' : ''}`}
          onClick={() => setMode('add_hazard')}
        >
          <Flame size={20} />
          Place Red Zone (Hazard)
        </button>

        <button 
          className={`tool-btn safe-btn ${mode === 'add_safezone' ? 'active' : ''}`}
          onClick={() => setMode('add_safezone')}
        >
          <ShieldPlus size={20} />
          Establish Safe Zone
        </button>

        <button 
          className={`tool-btn route-btn ${mode === 'add_route' ? 'active' : ''}`}
          onClick={() => setMode('add_route')}
        >
          <Navigation size={20} />
          Draw Evacuation Route
        </button>
      </div>

      <div className="stats">
        <div className="stat-box danger">
          <div className="stat-value">{hazards.length}</div>
          <div className="stat-label">Active Hazards</div>
        </div>
        <div className="stat-box safe">
          <div className="stat-value">{safeZones.length}</div>
          <div className="stat-label">Safe Zones</div>
        </div>
        <div className="stat-box aid">
          <div className="stat-value">{aidZones.length}</div>
          <div className="stat-label">Aid Zones</div>
        </div>
      </div>

      <div
        style={{ flex: 1, minHeight: 12, width: '100%' }}
        aria-hidden
      />

      <div
        className="control-panel-footer"
        style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}
      >
        {routes.length > 0 && (
          <button
            type="button"
            className="tool-btn"
            style={{
              color: 'var(--route, #0f766e)',
              borderColor: 'rgba(15, 118, 110, 0.25)',
              justifyContent: 'center',
            }}
            onClick={() => onClearAllRoutes?.()}
          >
            <Eraser size={16} />
            Clear all routes
          </button>
        )}

        {(hazards.length > 0 || safeZones.length > 0 || routes.length > 0) && (
          <button
            className={`tool-btn ${mode === 'delete_zone' ? 'active' : ''}`}
            style={{
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              justifyContent: 'center',
            }}
            onClick={() => setMode('delete_zone')}
          >
            <Trash2 size={16} />
            Clear zone
          </button>
        )}
      </div>
    </div>
  );
}
