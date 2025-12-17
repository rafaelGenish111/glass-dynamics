import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, MapPin, Phone, Mail, Package, FileText, CheckCircle,
  Loader, Image as ImageIcon,
  FileCheck, UploadCloud, ExternalLink, MessageSquare, ClipboardList, Plus, Trash2, Save
} from 'lucide-react';
import { API_URL } from '../config/api';

const ClientCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteStage, setNoteStage] = useState('general');
  const [takeListDraft, setTakeListDraft] = useState([]);
  const [newTakeItem, setNewTakeItem] = useState('');
  const [savingTakeList, setSavingTakeList] = useState(false);
  const user = JSON.parse(localStorage.getItem('userInfo'));
  const token = user?.token;
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/orders/${id}`, config);
      setOrder(res.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, [config, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (!order) return;
    const existing = Array.isArray(order.installTakeList) ? order.installTakeList : [];
    if (existing.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTakeListDraft(existing);
      return;
    }
    // Start empty – user adds items as needed
    setTakeListDraft([]);
  }, [order]);

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      await axios.post(`${API_URL}/orders/${id}/notes`, { stage: noteStage, text: noteText }, config);
      setNoteText('');
      setNoteStage('general');
      fetchOrder();
    } catch (e) {
      console.error(e);
      alert('Error saving note');
    }
  };

  const saveTakeList = async () => {
    setSavingTakeList(true);
    try {
      await axios.put(`${API_URL}/orders/${id}/install-take-list`, { installTakeList: takeListDraft }, config);
      setSavingTakeList(false);
      fetchOrder();
    } catch (e) {
      console.error(e);
      setSavingTakeList(false);
      alert('Error saving installation checklist');
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingType(type);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadRes = await axios.post(`${API_URL}/upload`, formData);
      await axios.put(`${API_URL}/orders/${id}/files`, {
        url: uploadRes.data.url,
        type: type,
        name: file.name
      }, config);

      setUploadingType(null);
      alert(type === 'master_plan' ? t('plan_updated') : t('file_uploaded'));
      fetchOrder();
    } catch (error) {
      console.error(error);
      alert(t('upload_error'));
      setUploadingType(null);
    }
  };

  if (loading) return <div className="text-white p-8">Loading...</div>;
  if (!order) return <div className="text-white p-8">Order not found</div>;

  const masterPlan = order.files && order.files.find(f => f.type === 'master_plan');
  const otherFiles = order.files ? order.files.filter(f => f.type !== 'master_plan') : [];
  const displayOrderNumber = order.manualOrderNumber || order.orderNumber || order._id;

  const managementLink = (() => {
    switch (order.status) {
      case 'materials_pending':
        return { label: 'Open pending items', path: '/procurement/pending' };
      case 'production_pending':
      case 'in_production':
      case 'production':
        return { label: 'Open production', path: '/production' };
      case 'ready_for_install':
      case 'scheduled':
        return { label: 'Open scheduling', path: '/installations' };
      case 'install':
        return { label: 'Open calendar', path: '/calendar' };
      case 'pending_approval':
        return { label: 'Open approvals', path: '/approvals' };
      case 'completed':
        return { label: 'Open completed orders', path: '/completed' };
      default:
        return null;
    }
  })();

  return (
    <div className="max-w-6xl mx-auto text-slate-100 pb-10">

      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition">
          <ArrowLeft size={20} /> {t('back_to_list')}
        </button>

        {managementLink && (
          <button
            type="button"
            onClick={() => navigate(managementLink.path)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold border border-slate-700"
          >
            {managementLink.label}
          </button>
        )}
      </div>

      {/* Header */}
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl mb-6 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white">{order.clientName}</h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2"><MapPin size={16} /> {order.clientAddress}</p>
            <p className="text-slate-400 flex items-center gap-2"><Phone size={16} /> {order.clientPhone}</p>
            {order.clientEmail && (
              <span className="flex items-center gap-2 hover:text-blue-400 transition cursor-pointer" title="Click to email">
                <Mail size={16} className="text-blue-500" />
                <a href={`mailto:${order.clientEmail}`}>{order.clientEmail}</a>
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-slate-500">#{displayOrderNumber}</div>
            <span className={`px-3 py-1 rounded text-sm uppercase font-bold border inline-block mt-2 ${order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-600/20 text-blue-300 border-blue-500/30'}`}>
              {order.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* RIGHT COLUMN: Master Plan + Items */}
        <div className="lg:col-span-2 space-y-6">

          {/* Master Plan Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl border border-indigo-500/50 p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><FileCheck size={100} /></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileCheck className="text-indigo-400" /> {t('master_plan')}
                </h3>
                <p className="text-indigo-200 text-sm mt-1">{t('master_plan_desc')}</p>
              </div>

              <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold cursor-pointer shadow-lg transition flex items-center gap-2">
                {uploadingType === 'master_plan' ? <Loader className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                {masterPlan ? t('replace_plan') : t('upload_plan')}
                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'master_plan')} disabled={!!uploadingType} />
              </label>
            </div>

            {masterPlan ? (
              <div className="mt-6 bg-slate-950/50 rounded-xl p-4 flex items-center justify-between border border-indigo-500/30">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-500/20 p-3 rounded-lg text-indigo-300"><FileText size={24} /></div>
                  <div>
                    <p className="font-bold text-white truncate max-w-[200px]">{masterPlan.name}</p>
                    <p className="text-slate-400 text-xs">{new Date(masterPlan.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <a href={masterPlan.url} target="_blank" rel="noreferrer" className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition">
                  {t('open_plan')}
                </a>
              </div>
            ) : (
              <div className="mt-6 border-2 border-dashed border-indigo-500/30 rounded-xl h-20 flex items-center justify-center text-indigo-300/50 text-sm">
                {t('no_plan')}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
            <h3 className="font-bold mb-6 flex items-center gap-2 text-lg"><Package className="text-blue-400" /> {t('items')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs uppercase bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="p-3">{t('product')}</th>
                    <th className="p-3">{t('description')}</th>
                    <th className="p-3">{t('supplier')}</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {(Array.isArray(order.materials) ? order.materials : (order.items || [])).map((item, i) => {
                    const productLabel = item.productType || item.materialType || item.type || '-';
                    const supplierLabel = item.supplier || '-';
                    const isOrdered = typeof item.isOrdered === 'boolean' ? item.isOrdered : false;

                    return (
                      <tr key={i}>
                        <td className="p-3 font-medium text-white">{productLabel}</td>
                        <td className="p-3">{item.description}</td>
                        <td className="p-3 text-blue-300">{supplierLabel}</td>
                        <td className="p-3">{isOrdered ? '✅' : '⏳'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Notes */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2 text-lg"><MessageSquare className="text-cyan-400" /> Order notes</h3>
            </div>

            <div className="space-y-3 mb-5">
              {(order.notes || []).length === 0 ? (
                <div className="text-slate-500 text-sm">No notes yet.</div>
              ) : (
                (order.notes || []).slice().reverse().map((n, idx) => (
                  <div key={idx} className="bg-slate-950/30 border border-slate-800 rounded-xl p-4">
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                      <span className="uppercase">{n.stage || 'general'}</span>
                      <span>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                    </div>
                    <div className="text-slate-200 text-sm whitespace-pre-wrap">{n.text}</div>
                    <div className="text-xs text-slate-500 mt-2">by {n.createdBy || 'System'}</div>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className="text-xs text-slate-400 block mb-1">Stage</label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm"
                  value={noteStage}
                  onChange={(e) => setNoteStage(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="order">Order</option>
                  <option value="procurement">Procurement</option>
                  <option value="production">Production</option>
                  <option value="scheduling">Scheduling</option>
                  <option value="installation">Installation</option>
                  <option value="approval">Approval</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs text-slate-400 block mb-1">Add note</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm"
                  rows="3"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a note..."
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={addNote}
                disabled={!noteText.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-bold"
              >
                Save note
              </button>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Gallery */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg flex flex-col h-full">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-lg"><ImageIcon className="text-purple-400" /> {t('files_media')}</h3>
          <p className="text-xs text-slate-500 mb-4">{t('files_desc')}</p>

          <div className="flex-1 space-y-3 mb-6 overflow-y-auto min-h-[200px] max-h-[400px] pr-2 custom-scrollbar">
            {otherFiles.length > 0 ? (
              otherFiles.map((file, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-purple-500/30 transition group">
                  <div className="w-12 h-12 bg-slate-700 rounded-lg overflow-hidden shrink-0 border border-slate-600">
                    {file.type === 'site_photo' || file.url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img src={file.url} alt="file" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400"><FileText size={20} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{file.name}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">{new Date(file.uploadedAt).toLocaleDateString()}</p>
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 mt-1 border border-slate-600">
                      {file.type === 'site_photo' ? 'Photo' : 'Doc'}
                    </span>
                  </div>
                  <a href={file.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
                    <ExternalLink size={18} />
                  </a>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-10 border-2 border-dashed border-slate-800 rounded-xl">{t('no_files_yet')}</div>
            )}
          </div>

          <label className={`block w-full border border-dashed ${uploadingType === 'document' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-600 hover:border-purple-500 hover:bg-slate-800'} text-slate-300 p-4 rounded-xl transition text-sm text-center cursor-pointer relative`}>
            {uploadingType === 'document' ? (
              <span className="flex items-center justify-center gap-2"><Loader className="animate-spin" size={16} /> {t('uploading')}...</span>
            ) : (
              <span className="flex items-center justify-center gap-2 font-medium">+ {t('upload_doc')}</span>
            )}
            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'document')} disabled={!!uploadingType} />
          </label>
        </div>

        {/* What to take to installation */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-bold flex items-center gap-2 text-lg">
              <ClipboardList className="text-emerald-400" /> What to take to installation
            </h3>
            <button
              type="button"
              onClick={saveTakeList}
              disabled={savingTakeList}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold border border-slate-700 inline-flex items-center gap-2"
            >
              <Save size={16} /> {savingTakeList ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="space-y-2">
            {takeListDraft.map((it, idx) => (
              <div key={`${it.label}-${idx}`} className="flex items-center justify-between gap-3 bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
                <label className="flex items-center gap-3 text-sm text-slate-200 w-full">
                  <input
                    type="checkbox"
                    className="accent-emerald-500"
                    checked={Boolean(it.done)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setTakeListDraft((prev) => prev.map((p, i) => (i === idx ? { ...p, done: checked } : p)));
                    }}
                  />
                  <span className={it.done ? 'line-through text-slate-500' : ''}>{it.label}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setTakeListDraft((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-slate-500 hover:text-red-400"
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={newTakeItem}
              onChange={(e) => setNewTakeItem(e.target.value)}
              placeholder="Add item..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => {
                const label = newTakeItem.trim();
                if (!label) return;
                setTakeListDraft((prev) => [...prev, { label, done: false }]);
                setNewTakeItem('');
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold inline-flex items-center gap-2"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClientCard;