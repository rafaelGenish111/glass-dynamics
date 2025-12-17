import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { Wrench, Plus, X, UploadCloud, ExternalLink, AlertTriangle } from 'lucide-react';
import { API_URL } from '../config/api';
import RepairSchedulingModal from '../components/RepairSchedulingModal';

const Repairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ manualOrderNumber: '', contactedAt: '', problem: '', estimatedWorkDays: 1 });

  const [selected, setSelected] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);

  const [scheduleRepair, setScheduleRepair] = useState(null);

  const user = JSON.parse(localStorage.getItem('userInfo'));
  const token = user?.token;
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchRepairs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/repairs`, { ...config, params: query ? { q: query } : undefined });
      setRepairs(res.data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [config, query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRepairs();
  }, [fetchRepairs]);

  const createRepair = async () => {
    if (!createForm.manualOrderNumber.trim() || !createForm.problem.trim()) {
      alert('Order # and problem are required');
      return;
    }
    try {
      const contactedAt = createForm.contactedAt || new Date().toISOString().slice(0, 10);
      await axios.post(`${API_URL}/repairs`, {
        manualOrderNumber: createForm.manualOrderNumber.trim(),
        contactedAt,
        problem: createForm.problem.trim(),
        estimatedWorkDays: Number(createForm.estimatedWorkDays) || 1
      }, config);
      setCreateOpen(false);
      setCreateForm({ manualOrderNumber: '', contactedAt: '', problem: '', estimatedWorkDays: 1 });
      fetchRepairs();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Error creating repair');
    }
  };

  const approve = async (repairId) => {
    try {
      await axios.post(`${API_URL}/repairs/${repairId}/approve`, {}, config);
      fetchRepairs();
    } catch (e) {
      console.error(e);
      alert('Error approving repair');
    }
  };

  const close = async (repairId) => {
    if (!window.confirm('Close this repair ticket?')) return;
    try {
      await axios.post(`${API_URL}/repairs/${repairId}/close`, {}, config);
      fetchRepairs();
    } catch (e) {
      console.error(e);
      alert('Error closing repair');
    }
  };

  const addNote = async () => {
    if (!selected || !noteText.trim()) return;
    try {
      await axios.post(`${API_URL}/repairs/${selected._id}/notes`, { text: noteText.trim() }, config);
      setNoteText('');
      const refreshed = await axios.get(`${API_URL}/repairs/${selected._id}`, config);
      setSelected(refreshed.data);
    } catch (e) {
      console.error(e);
      alert('Error adding note');
    }
  };

  const uploadMedia = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;

    setMediaUploading(true);
    const fd = new FormData();
    fd.append('image', file);

    try {
      const uploadRes = await axios.post(`${API_URL}/upload`, fd);
      const isVideo = file.type.startsWith('video/');
      await axios.post(`${API_URL}/repairs/${selected._id}/media`, {
        url: uploadRes.data.url,
        type: isVideo ? 'video' : 'photo',
        name: file.name
      }, config);
      const refreshed = await axios.get(`${API_URL}/repairs/${selected._id}`, config);
      setSelected(refreshed.data);
      setMediaUploading(false);
    } catch (err) {
      console.error(err);
      setMediaUploading(false);
      alert('Upload failed');
    }
  };

  const markIssue = async (repair) => {
    const reason = window.prompt('Issue reason (will be visible in scheduling):', repair?.issue?.reason || '');
    if (reason === null) return;
    try {
      await axios.put(`${API_URL}/repairs/${repair._id}/issue`, { isIssue: true, reason }, config);
      fetchRepairs();
      if (selected?._id === repair._id) {
        const refreshed = await axios.get(`${API_URL}/repairs/${repair._id}`, config);
        setSelected(refreshed.data);
      }
    } catch (err) {
      console.error(err);
      alert('Error updating issue');
    }
  };

  const resolveIssue = async (repair) => {
    if (!window.confirm('Resolve this issue?')) return;
    try {
      await axios.put(`${API_URL}/repairs/${repair._id}/issue`, { isIssue: false }, config);
      fetchRepairs();
      if (selected?._id === repair._id) {
        const refreshed = await axios.get(`${API_URL}/repairs/${repair._id}`, config);
        setSelected(refreshed.data);
      }
    } catch (err) {
      console.error(err);
      alert('Error updating issue');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Wrench className="text-amber-500" /> Repairs
        </h2>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2"
        >
          <Plus size={18} /> New repair ticket
        </button>
      </div>

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by order #, client, or problem"
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4">Order #</th>
              <th className="p-4">Client</th>
              <th className="p-4">Contacted</th>
              <th className="p-4">Problem</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading...</td></tr>
            ) : repairs.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500">No repair tickets.</td></tr>
            ) : (
              repairs.map((r) => {
                const hasIssue = Boolean(r.issue?.isIssue);
                return (
                  <tr
                    key={r._id}
                    className={`cursor-pointer transition ${hasIssue ? 'bg-red-950/30 hover:bg-red-950/40' : 'hover:bg-slate-800/30'}`}
                    onClick={() => setSelected(r)}
                  >
                    <td className="p-4 font-mono text-amber-300">#{r.manualOrderNumber}</td>
                    <td className="p-4 font-semibold text-white">{r.clientName}</td>
                    <td className="p-4">{r.contactedAt ? new Date(r.contactedAt).toLocaleDateString() : '—'}</td>
                    <td className="p-4 truncate max-w-[420px]">{r.problem}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-700 bg-slate-800">{String(r.status).toUpperCase()}</span>
                        {hasIssue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-900/40 bg-red-900/20 text-red-200">
                            <AlertTriangle size={12} /> ISSUE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {r.status === 'open' && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); approve(r._id); }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            Approve to scheduling
                          </button>
                        )}
                        {r.status === 'ready_to_schedule' && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setScheduleRepair(r); }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            Schedule
                          </button>
                        )}
                        {r.status !== 'closed' && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); close(r._id); }}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">New repair ticket</h3>
                <p className="text-xs text-slate-400 mt-1">Create a repair ticket by order number.</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Order #</label>
                <input
                  value={createForm.manualOrderNumber}
                  onChange={(e) => setCreateForm((p) => ({ ...p, manualOrderNumber: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                  placeholder="e.g. 2024-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Contacted date</label>
                  <input
                    type="date"
                    value={createForm.contactedAt}
                    onChange={(e) => setCreateForm((p) => ({ ...p, contactedAt: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Work days</label>
                  <input
                    type="number"
                    value={createForm.estimatedWorkDays}
                    onChange={(e) => setCreateForm((p) => ({ ...p, estimatedWorkDays: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Problem</label>
                <textarea
                  value={createForm.problem}
                  onChange={(e) => setCreateForm((p) => ({ ...p, problem: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                  rows="4"
                  placeholder="Describe the issue..."
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex justify-end gap-3">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button type="button" onClick={createRepair} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold">Create</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Repair ticket</h3>
                <p className="text-xs text-slate-400 mt-1">#{selected.manualOrderNumber} · {selected.clientName}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">Problem</div>
                <div className="text-white font-medium mt-1">{selected.problem}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.issue?.isIssue ? (
                  <button
                    type="button"
                    onClick={() => resolveIssue(selected)}
                    className="bg-red-900/30 hover:bg-red-900/40 text-red-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-900/40"
                  >
                    Resolve issue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => markIssue(selected)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                  >
                    Mark issue
                  </button>
                )}

                {selected.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => approve(selected._id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                  >
                    Approve to scheduling
                  </button>
                )}
                {selected.status === 'ready_to_schedule' && (
                  <button
                    type="button"
                    onClick={() => setScheduleRepair(selected)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                  >
                    Schedule
                  </button>
                )}
                {selected.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => close(selected._id)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                  >
                    Close
                  </button>
                )}
              </div>

              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white font-bold">Media</div>
                  <label className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 inline-flex items-center gap-2 cursor-pointer">
                    <UploadCloud size={14} /> {mediaUploading ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={uploadMedia} />
                  </label>
                </div>
                <div className="mt-3 space-y-2">
                  {(selected.media || []).length === 0 ? (
                    <div className="text-sm text-slate-500">No media yet.</div>
                  ) : (
                    selected.media.map((m, idx) => (
                      <a
                        key={idx}
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="text-slate-200 truncate">{m.name || m.type}</span>
                        <span className="text-slate-400 inline-flex items-center gap-1">Open <ExternalLink size={12} /></span>
                      </a>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <div className="text-white font-bold mb-2">Notes</div>
                <div className="space-y-2">
                  {(selected.notes || []).slice().reverse().map((n, idx) => (
                    <div key={idx} className="text-sm text-slate-300 border border-slate-800 rounded-lg p-3 bg-slate-900">
                      <div className="text-xs text-slate-500 mb-1">{n.createdBy || '—'} · {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                      <div>{n.text}</div>
                    </div>
                  ))}
                  {(selected.notes || []).length === 0 && <div className="text-sm text-slate-500">No notes.</div>}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add note..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {scheduleRepair && (
        <RepairSchedulingModal
          repair={scheduleRepair}
          onClose={() => setScheduleRepair(null)}
          onSuccess={() => {
            setScheduleRepair(null);
            fetchRepairs();
          }}
        />
      )}
    </div>
  );
};

export default Repairs;
