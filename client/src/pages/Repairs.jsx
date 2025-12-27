import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Wrench, Plus, X, UploadCloud, ExternalLink, AlertTriangle } from 'lucide-react';
import { API_URL } from '../config/api';
import RepairSchedulingModal from '../components/RepairSchedulingModal';

const Repairs = () => {
  const { t } = useTranslation();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    manualOrderNumber: '',
    clientName: '',
    clientPhone: '',
    clientAddress: '',
    contactedAt: '',
    problem: '',
    estimatedWorkDays: 1,
    warrantyStatus: 'in_warranty',
    paymentNote: ''
  });
  const [createFiles, setCreateFiles] = useState([]);
  const [creating, setCreating] = useState(false);
  const [orderSuggestion, setOrderSuggestion] = useState(null);

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

  const lookupOrder = async (orderNumber) => {
    if (!orderNumber || orderNumber.trim().length === 0) {
      setOrderSuggestion(null);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/orders`, config);
      const order = res.data.find(o => o.manualOrderNumber === orderNumber.trim());
      if (order) {
        setOrderSuggestion({
          clientName: order.clientName || '',
          clientPhone: order.clientPhone || '',
          clientAddress: order.clientAddress || '',
          region: order.region || ''
        });
      } else {
        setOrderSuggestion(null);
      }
    } catch (e) {
      console.error(e);
      setOrderSuggestion(null);
    }
  };

  const createRepair = async () => {
    if (!createForm.manualOrderNumber.trim() || !createForm.problem.trim() || !createForm.clientName.trim()) {
      alert(`${t('order_col')}, ${t('client_name')} and ${t('problem').toLowerCase()} are required`);
      return;
    }
    try {
      setCreating(true);
      const contactedAt = createForm.contactedAt || new Date().toISOString().slice(0, 10);
      const created = await axios.post(`${API_URL}/repairs`, {
        manualOrderNumber: createForm.manualOrderNumber.trim(),
        clientName: createForm.clientName.trim(),
        clientPhone: createForm.clientPhone.trim(),
        clientAddress: createForm.clientAddress.trim(),
        region: createForm.region || '',
        contactedAt,
        problem: createForm.problem.trim(),
        estimatedWorkDays: Number(createForm.estimatedWorkDays) || 1,
        warrantyStatus: createForm.warrantyStatus,
        paymentNote: createForm.paymentNote
      }, config);

      const repairId = created?.data?._id;
      if (repairId && Array.isArray(createFiles) && createFiles.length > 0) {
        for (const file of createFiles) {
          const fd = new FormData();
          fd.append('image', file);
          const uploadRes = await axios.post(`${API_URL}/upload`, fd);

          const isVideo = file.type.startsWith('video/');
          const isPdf = file.type === 'application/pdf';
          const mediaType = isVideo ? 'video' : (isPdf ? 'document' : 'photo');

          await axios.post(`${API_URL}/repairs/${repairId}/media`, {
            url: uploadRes.data.url,
            type: mediaType,
            name: file.name
          }, config);
        }
      }

      setCreateOpen(false);
      setCreateForm({ manualOrderNumber: '', clientName: '', clientPhone: '', clientAddress: '', contactedAt: '', problem: '', estimatedWorkDays: 1, warrantyStatus: 'in_warranty', paymentNote: '' });
      setCreateFiles([]);
      setOrderSuggestion(null);
      setCreating(false);
      fetchRepairs();
    } catch (e) {
      console.error(e);
      setCreating(false);
      alert(e.response?.data?.message || t('error_creating_repair'));
    }
  };

  const approve = async (repairId) => {
    try {
      await axios.post(`${API_URL}/repairs/${repairId}/approve`, {}, config);
      fetchRepairs();
    } catch (e) {
      console.error(e);
      alert(t('error_approving_repair'));
    }
  };

  const close = async (repairId) => {
    if (!window.confirm(t('close_repair_ticket'))) return;
    try {
      await axios.post(`${API_URL}/repairs/${repairId}/close`, {}, config);
      fetchRepairs();
    } catch (e) {
      console.error(e);
      alert(t('error_closing_repair'));
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
      alert(t('error') + ': ' + t('notes').toLowerCase());
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
      const isPdf = file.type === 'application/pdf';
      await axios.post(`${API_URL}/repairs/${selected._id}/media`, {
        url: uploadRes.data.url,
        type: isVideo ? 'video' : (isPdf ? 'document' : 'photo'),
        name: file.name
      }, config);
      const refreshed = await axios.get(`${API_URL}/repairs/${selected._id}`, config);
      setSelected(refreshed.data);
      setMediaUploading(false);
    } catch (err) {
      console.error(err);
      setMediaUploading(false);
      alert(t('error') + ': ' + t('upload').toLowerCase());
    }
  };

  const markIssue = async (repair) => {
    const reason = window.prompt(t('issue_reason_prompt'), repair?.issue?.reason || '');
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
    if (!window.confirm(t('resolve_this_issue'))) return;
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
          <Wrench className="text-amber-500" /> {t('repairs')}
        </h2>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2"
        >
          <Plus size={18} /> {t('new_repair_ticket')}
        </button>
      </div>

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search_by_order_client')}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4">{t('order_col')}</th>
              <th className="p-4">{t('client')}</th>
              <th className="p-4">{t('contacted')}</th>
              <th className="p-4">{t('problem')}</th>
              <th className="p-4">{t('status')}</th>
              <th className="p-4">{t('action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">{t('loading')}</td></tr>
            ) : repairs.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500">{t('no_repair_tickets')}</td></tr>
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
                        <span className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-700 bg-slate-800">
                          {r.status === 'open' ? t('status_open') :
                           r.status === 'ready_to_schedule' ? t('status_ready_to_schedule') :
                           r.status === 'scheduled' ? t('status_repair_scheduled') :
                           r.status === 'in_progress' ? t('status_in_progress') :
                           r.status === 'closed' ? t('status_closed') :
                           String(r.status).toUpperCase()}
                        </span>
                        {hasIssue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-900/40 bg-red-900/20 text-red-200">
                            <AlertTriangle size={12} /> {t('issue')}
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
                            {t('approve_to_scheduling')}
                          </button>
                        )}
                        {r.status === 'ready_to_schedule' && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setScheduleRepair(r); }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            {t('schedule')}
                          </button>
                        )}
                        {r.status !== 'closed' && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); close(r._id); }}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                          >
                            {t('close')}
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
                <h3 className="text-lg font-bold text-white">{t('new_repair_ticket')}</h3>
                <p className="text-xs text-slate-400 mt-1">{t('create_repair_ticket')}</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{t('order_col')}</label>
                <input
                  value={createForm.manualOrderNumber}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, manualOrderNumber: e.target.value }));
                    lookupOrder(e.target.value);
                  }}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                  placeholder="e.g. 2024-100"
                />
                {orderSuggestion && (
                  <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700/50 rounded-lg text-xs text-blue-200">
                    {t('order_found_suggestion')}: {orderSuggestion.clientName} ({orderSuggestion.clientPhone})
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">{t('client_name')} *</label>
                <input
                  value={createForm.clientName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, clientName: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                  placeholder={t('client_name')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t('phone')}</label>
                  <input
                    value={createForm.clientPhone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, clientPhone: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                    placeholder={t('phone')}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t('address')}</label>
                  <input
                    value={createForm.clientAddress}
                    onChange={(e) => setCreateForm((p) => ({ ...p, clientAddress: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                    placeholder={t('address')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t('contacted_date')}</label>
                  <input
                    type="date"
                    value={createForm.contactedAt}
                    onChange={(e) => setCreateForm((p) => ({ ...p, contactedAt: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t('work_days_label')}</label>
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
                <label className="text-xs text-slate-400 block mb-1">{t('warranty')}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm((p) => ({ ...p, warrantyStatus: 'in_warranty' }))}
                    className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold border transition ${createForm.warrantyStatus === 'in_warranty'
                      ? 'bg-emerald-600/20 text-emerald-200 border-emerald-700'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                  >
                    {t('in_warranty')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm((p) => ({ ...p, warrantyStatus: 'out_of_warranty' }))}
                    className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold border transition ${createForm.warrantyStatus === 'out_of_warranty'
                      ? 'bg-amber-600/20 text-amber-200 border-amber-700'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                  >
                    {t('out_of_warranty')}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">{t('payment_note')}</label>
                <input
                  value={createForm.paymentNote}
                  onChange={(e) => setCreateForm((p) => ({ ...p, paymentNote: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                  placeholder="e.g. Customer pays for replacement glass"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">{t('attachments')}</label>
                <label className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-sm font-bold border border-slate-700 inline-flex items-center gap-2 cursor-pointer">
                  <UploadCloud size={16} /> {t('add_image_document')}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      setCreateFiles((prev) => [...prev, ...files].slice(0, 10));
                      e.target.value = '';
                    }}
                  />
                </label>
                {createFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {createFiles.map((f, idx) => (
                      <div key={`${f.name}-${idx}`} className="flex items-center justify-between bg-slate-950/40 border border-slate-800 rounded-lg px-3 py-2 text-sm">
                        <span className="text-slate-200 truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setCreateFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-white"
                        >
                          {t('remove')}
                        </button>
                      </div>
                    ))}
                    <div className="text-xs text-slate-500">{t('files_will_upload')}</div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">{t('problem')}</label>
                <textarea
                  value={createForm.problem}
                  onChange={(e) => setCreateForm((p) => ({ ...p, problem: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                  rows="4"
                  placeholder={t('describe_issue')}
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex justify-end gap-3">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">{t('cancel')}</button>
              <button
                type="button"
                onClick={createRepair}
                disabled={creating}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-bold"
              >
                {creating ? t('creating') : t('create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">{t('repair_ticket')}</h3>
                <p className="text-xs text-slate-400 mt-1">#{selected.manualOrderNumber} · {selected.clientName}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">{t('problem')}</div>
                <div className="text-white font-medium mt-1">{selected.problem}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">{t('warranty')}</div>
                  <div className="text-white font-medium mt-1">
                    {selected.warrantyStatus === 'out_of_warranty' ? t('out_of_warranty') : t('in_warranty')}
                  </div>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">{t('payment_note')}</div>
                  <div className="text-white font-medium mt-1">{selected.paymentNote || '—'}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.issue?.isIssue ? (
                  <button
                    type="button"
                    onClick={() => resolveIssue(selected)}
                    className="bg-red-900/30 hover:bg-red-900/40 text-red-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-900/40"
                  >
                    {t('resolve_issue')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => markIssue(selected)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                  >
                    {t('mark_issue')}
                  </button>
                )}

                {selected.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => approve(selected._id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                  >
                    {t('approve_to_scheduling')}
                  </button>
                )}
                {selected.status === 'ready_to_schedule' && (
                  <button
                    type="button"
                    onClick={() => setScheduleRepair(selected)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                  >
                    {t('schedule')}
                  </button>
                )}
                {selected.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => close(selected._id)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                  >
                    {t('close')}
                  </button>
                )}
              </div>

              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white font-bold">{t('media')}</div>
                  <label className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 inline-flex items-center gap-2 cursor-pointer">
                    <UploadCloud size={14} /> {mediaUploading ? t('uploading') : t('upload')}
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={uploadMedia} />
                  </label>
                </div>
                <div className="mt-3 space-y-2">
                  {(selected.media || []).length === 0 ? (
                    <div className="text-sm text-slate-500">{t('no_media_yet')}</div>
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
                        <span className="text-slate-400 inline-flex items-center gap-1">{t('open')} <ExternalLink size={12} /></span>
                      </a>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <div className="text-white font-bold mb-2">{t('notes')}</div>
                <div className="space-y-2">
                  {(selected.notes || []).slice().reverse().map((n, idx) => (
                    <div key={idx} className="text-sm text-slate-300 border border-slate-800 rounded-lg p-3 bg-slate-900">
                      <div className="text-xs text-slate-500 mb-1">{n.createdBy || '—'} · {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                      <div>{n.text}</div>
                    </div>
                  ))}
                  {(selected.notes || []).length === 0 && <div className="text-sm text-slate-500">{t('no_notes')}</div>}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={t('add_note_placeholder')}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold"
                  >
                    {t('add')}
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



