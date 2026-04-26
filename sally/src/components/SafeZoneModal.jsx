import React, { useState } from 'react';
import { ShieldPlus } from 'lucide-react';

export default function SafeZoneModal({ location, onSave, onCancel, mode = 'create', initialValues = null }) {
  const isEdit = mode === 'edit';

  const [name, setName] = useState(initialValues?.name ?? '');
  const [radius, setRadius] = useState(
    initialValues?.radius != null ? initialValues.radius / 1000 : 0.5
  );
  const [capacity, setCapacity] = useState(initialValues?.capacity ?? 500);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      lat: location.lat,
      lng: location.lng,
      name: name.trim(),
      radius: parseFloat(radius) * 1000,
      capacity: parseInt(capacity, 10),
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <h2>
          <ShieldPlus color="var(--safe)" size={24} />{' '}
          {isEdit ? 'Edit Safe Zone' : 'Establish Safe Zone'}
        </h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cluj Arena Assembly Point"
            />
          </div>

          <div className="form-group">
            <label>Capacity Radius (km)</label>
            <input
              type="number"
              min="0.05"
              step="0.05"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Capacity (people)</label>
            <input
              type="number"
              min="0"
              step="50"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-submit success">
              {isEdit ? 'Save Changes' : 'Create Safe Zone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
