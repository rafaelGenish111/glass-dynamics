import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { X, Save } from 'lucide-react';
import { API_URL } from '../config/api';

const NoteModal = ({ orderId, stage = 'general', onClose, onSaved }) => {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem('userInfo'));
  const token = user?.token;
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API_URL}/orders/${orderId}/notes`, { stage, text }, config);
      setText('');
      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      alert('Error saving note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white">Add note</h3>
            <p className="text-xs text-slate-400 mt-1">Stage: {stage}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X />
          </button>
        </div>

        <div className="p-5">
          <textarea
            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a note..."
          />
        </div>

        <div className="p-5 border-t border-slate-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !text.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold inline-flex items-center gap-2"
          >
            <Save size={18} /> Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;


