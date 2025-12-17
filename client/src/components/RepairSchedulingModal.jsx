import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save } from 'lucide-react';
import { API_URL } from '../config/api';

const RepairSchedulingModal = ({ repair, onClose, onSuccess }) => {
  const [installers, setInstallers] = useState([]);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    selectedInstallers: [],
    notes: ''
  });

  const user = JSON.parse(localStorage.getItem('userInfo'));
  const token = user?.token;
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await axios.get(`${API_URL}/orders/install/team-list`, config);
        setInstallers(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchTeam();
  }, [config]);

  const toggleInstaller = (id) => {
    setFormData((prev) => {
      const current = prev.selectedInstallers;
      return current.includes(id)
        ? { ...prev, selectedInstallers: current.filter((i) => i !== id) }
        : { ...prev, selectedInstallers: [...current, id] };
    });
  };

  const handleSubmit = async () => {
    if (!formData.startDate || !formData.endDate || formData.selectedInstallers.length === 0) {
      return alert('Please select dates and at least one installer');
    }

    try {
      await axios.post(`${API_URL}/repairs/${repair._id}/schedule`, {
        installerIds: formData.selectedInstallers,
        startDate: formData.startDate,
        endDate: formData.endDate,
        notes: formData.notes
      }, config);

      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error scheduling repair');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Schedule repair</h3>
            <p className="text-slate-400 text-sm">#{repair.manualOrderNumber} · {repair.clientName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Start date</label>
              <input
                type="date"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">End date</label>
              <input
                type="date"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Assign team</label>
            <div className="bg-slate-800 border border-slate-600 rounded-xl p-2 max-h-40 overflow-y-auto">
              {installers.map((worker) => (
                <div
                  key={worker._id}
                  onClick={() => toggleInstaller(worker._id)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${formData.selectedInstallers.includes(worker._id)
                    ? 'bg-blue-600/20 border border-blue-500/50'
                    : 'hover:bg-slate-700'
                    }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.selectedInstallers.includes(worker._id)
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-slate-500'
                    }`}>
                    {formData.selectedInstallers.includes(worker._id) && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm text-white">{worker.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Notes</label>
            <textarea
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm"
              rows="3"
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
          >
            <Save size={18} /> Save schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepairSchedulingModal;
