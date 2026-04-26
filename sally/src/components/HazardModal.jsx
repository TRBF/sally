import React, { useState } from 'react';
import { Flame, User, Car, Bike, Bus } from 'lucide-react';

const HAZARD_TYPES = ['Wildfire', 'Flood', 'Earthquake', 'Chemical Spill'];
const RISK_GRADES = ['Low', 'Medium', 'High', 'Critical'];

export default function HazardModal({ location, onSave, onCancel, mode = 'create', initialValues = null }) {
  const isEdit = mode === 'edit';

  const [type, setType] = useState(initialValues?.type ?? 'Wildfire');
  const [expansionRate, setExpansionRate] = useState(initialValues?.expansionRate ?? 0.5);
  const [radius, setRadius] = useState(
    initialValues?.radius != null ? initialValues.radius / 1000 : 1
  );
  const [riskGrade, setRiskGrade] = useState(initialValues?.riskGrade ?? 'High');
  const [restrictions, setRestrictions] = useState(
    initialValues?.restrictions ?? {
      people: false,
      car: false,
      bicycle: false,
      bus: false,
    }
  );

  const toggleRestriction = (key) => {
    setRestrictions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      lat: location.lat,
      lng: location.lng,
      type,
      expansionRate: parseFloat(expansionRate),
      radius: parseFloat(radius) * 1000,
      riskGrade,
      restrictions,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <h2>
          <Flame color="var(--hazard)" size={24} />{' '}
          {isEdit ? 'Edit Hazard Zone' : 'Add Hazard Zone'}
        </h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Hazard Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {HAZARD_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Expansion Rate (km/h)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={expansionRate}
              onChange={(e) => setExpansionRate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Initial Radius (km)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Risk Grade</label>
            <select value={riskGrade} onChange={(e) => setRiskGrade(e.target.value)}>
              {RISK_GRADES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Travel Restrictions</label>
            <div className="restriction-buttons">
              <button
                type="button"
                className={`restrict-btn ${restrictions.people ? 'active' : ''}`}
                onClick={() => toggleRestriction('people')}
                title="Restrict Pedestrians"
              >
                <User size={20} />
              </button>
              <button
                type="button"
                className={`restrict-btn ${restrictions.car ? 'active' : ''}`}
                onClick={() => toggleRestriction('car')}
                title="Restrict Cars"
              >
                <Car size={20} />
              </button>
              <button
                type="button"
                className={`restrict-btn ${restrictions.bicycle ? 'active' : ''}`}
                onClick={() => toggleRestriction('bicycle')}
                title="Restrict Bicycles"
              >
                <Bike size={20} />
              </button>
              <button
                type="button"
                className={`restrict-btn ${restrictions.bus ? 'active' : ''}`}
                onClick={() => toggleRestriction('bus')}
                title="Restrict Buses"
              >
                <Bus size={20} />
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-submit danger">
              {isEdit ? 'Save Changes' : 'Create Hazard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
