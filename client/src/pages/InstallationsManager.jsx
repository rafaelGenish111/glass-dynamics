import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Truck, Calendar, CheckCircle, Clock, FileText, AlertTriangle, Search } from 'lucide-react';
import SchedulingModal from '../components/SchedulingModal';
import { API_URL } from '../config/api';
import NoteModal from '../components/NoteModal';
import { useNavigate } from 'react-router-dom';
import MasterPlanPreviewModal from '../components/MasterPlanPreviewModal';
import RepairSchedulingModal from '../components/RepairSchedulingModal';

const InstallationsManager = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [activeBucket, setActiveBucket] = useState('ready_for_install');
  const [noteOrderId, setNoteOrderId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('userInfo'));
  const token = user?.token;
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
  const POLL_MS = 20000;

  const fetchOrders = useCallback(async () => {
    try {
      const [ordersRes, repairsRes] = await Promise.all([
        axios.get(`${API_URL}/orders`, config),
        axios.get(`${API_URL}/repairs`, config)
      ]);
      setOrders(ordersRes.data);
      setRepairs(repairsRes.data);
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  }, [config]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
    const id = setInterval(() => {
      fetchOrders();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [fetchOrders]);

  // Approvals are handled in /approvals

  const buckets = useMemo(() => {
    const readyOrders = orders.filter(o => o.status === 'ready_for_install').map((o) => ({ ...o, __type: 'order' }));
    const scheduledOrders = orders.filter(o => o.status === 'scheduled').map((o) => ({ ...o, __type: 'order' }));
    const pendingApproval = orders.filter(o => o.status === 'pending_approval').map((o) => ({ ...o, __type: 'order' }));

    const readyRepairs = repairs.filter((r) => r.status === 'ready_to_schedule').map((r) => ({ ...r, __type: 'repair' }));
    const scheduledRepairs = repairs.filter((r) => r.status === 'scheduled').map((r) => ({ ...r, __type: 'repair' }));

    const ready = [...readyOrders, ...readyRepairs];
    const scheduled = [...scheduledOrders, ...scheduledRepairs];
    return { ready, scheduled, pendingApproval };
  }, [orders, repairs]);

  const rows = useMemo(() => {
    if (activeBucket === 'scheduled') return buckets.scheduled;
    if (activeBucket === 'pending_approval') return buckets.pendingApproval;
    return buckets.ready;
  }, [activeBucket, buckets]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((o) => {
      const num = String(o.manualOrderNumber || o.orderNumber || o._id || '').toLowerCase();
      const name = String(o.clientName || '').toLowerCase();
      return num.includes(q) || name.includes(q);
    });
  }, [query, rows]);

  const isOverdue = useCallback((order) => {
    if (!order) return false;
    if (order.status !== 'scheduled') return false;
    const end = order.installDateEnd ? new Date(order.installDateEnd) : null;
    const start = order.installDateStart ? new Date(order.installDateStart) : null;
    const now = new Date();
    const deadline = end && !Number.isNaN(end.getTime()) ? end : start;
    if (!deadline || Number.isNaN(deadline.getTime())) return false;
    return deadline.getTime() < now.getTime();
  }, []);

  const markIssue = async (order) => {
    const reason = window.prompt(t('sched_issue_reason') + ':', order?.issue?.reason || '');
    if (reason === null) return;
    try {
      const url = order.__type === 'repair'
        ? `${API_URL}/repairs/${order._id}/issue`
        : `${API_URL}/orders/${order._id}/issue`;
      await axios.put(url, { isIssue: true, reason }, config);
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert('Error updating issue');
    }
  };

  const resolveIssue = async (order) => {
    if (!window.confirm(t('resolve_this_issue'))) return;
    try {
      const url = order.__type === 'repair'
        ? `${API_URL}/repairs/${order._id}/issue`
        : `${API_URL}/orders/${order._id}/issue`;
      await axios.put(url, { isIssue: false }, config);
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert('Error updating issue');
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Truck className="text-emerald-500" /> {t('installations_center')}
        </h2>
        <button
          type="button"
          onClick={fetchOrders}
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold border border-slate-700"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('sched_search_placeholder')}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Bucket switch */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveBucket('ready_for_install')}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${activeBucket === 'ready_for_install'
            ? 'bg-slate-800 text-white border-slate-700'
            : 'bg-transparent text-slate-400 border-slate-800 hover:bg-slate-900'
            }`}
        >
          <span className="inline-flex items-center gap-2"><Clock size={16} /> {t('col_ready')} ({buckets.ready.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveBucket('scheduled')}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${activeBucket === 'scheduled'
            ? 'bg-slate-800 text-white border-slate-700'
            : 'bg-transparent text-slate-400 border-slate-800 hover:bg-slate-900'
            }`}
        >
          <span className="inline-flex items-center gap-2"><Calendar size={16} /> {t('col_scheduled')} ({buckets.scheduled.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveBucket('pending_approval')}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${activeBucket === 'pending_approval'
            ? 'bg-slate-800 text-white border-slate-700'
            : 'bg-transparent text-slate-400 border-slate-800 hover:bg-slate-900'
            }`}
        >
          <span className="inline-flex items-center gap-2"><CheckCircle size={16} /> {t('col_pending_approval')} ({buckets.pendingApproval.length})</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex-1">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4">{t('order_col')}</th>
              <th className="p-4">{t('client')}</th>
              <th className="p-4">{t('work_days')}</th>
              <th className="p-4">{t('new_deposit_date')}</th>
              <th className="p-4">{t('sched_date')}</th>
              <th className="p-4">{t('region')}</th>
              <th className="p-4">{t('sched_action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-400">Loading...</td></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-500">No orders in this stage.</td></tr>
            ) : (
              filteredRows.map((order) => {
                const displayOrderNumber = order.manualOrderNumber || order.orderNumber || order._id;
                const depositPaidAt = order.depositPaidAt ? new Date(order.depositPaidAt).toLocaleDateString() : '—';
                const scheduledAt = order.installDateStart ? new Date(order.installDateStart).toLocaleDateString() : '—';
                const masterPlan = order.__type === 'order' ? (order.files && order.files.find((f) => f.type === 'master_plan')) : null;
                const hasIssue = Boolean(order.issue?.isIssue);
                const overdue = isOverdue(order);
                const rowDanger = hasIssue || overdue;
                const isRepair = order.__type === 'repair';

                return (
                  <tr
                    key={order._id}
                    className={`transition ${rowDanger ? 'bg-red-950/30 hover:bg-red-950/40' : 'hover:bg-slate-800/30'}`}
                  >
                    <td className="p-4 font-mono text-blue-400">
                      <div className="flex items-center gap-2">
                        #{displayOrderNumber}
                        {isRepair && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-800/40 bg-amber-900/20 text-amber-200">
                            REPAIR
                          </span>
                        )}
                        {(hasIssue || overdue) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-900/40 bg-red-900/20 text-red-200">
                            <AlertTriangle size={12} />
                            {hasIssue ? 'ISSUE' : 'OVERDUE'}
                          </span>
                        )}
                      </div>
                      {hasIssue && order.issue?.reason && (
                        <div className="text-xs text-red-200/80 mt-1">{t('sched_issue_reason')}: {order.issue.reason}</div>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-white">{order.clientName}</td>
                    <td className="p-4">{isRepair ? (order.estimatedWorkDays ?? 1) : (order.estimatedInstallationDays ?? 1)}</td>
                    <td className="p-4">{depositPaidAt}</td>
                    <td className="p-4">{activeBucket === 'scheduled' ? scheduledAt : '—'}</td>
                    <td className="p-4">{order.region || '—'}</td>
                    <td className="p-4">
                      {activeBucket === 'ready_for_install' && (
                        <div className="flex flex-wrap gap-2">
                          {masterPlan && (
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(masterPlan.url)}
                              className="bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                            >
                              <FileText size={14} /> Plan
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (isRepair) setSelectedRepair(order);
                              else setSelectedOrder(order);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            {isRepair ? 'Schedule repair' : t('schedule_job')}
                          </button>
                          {!isRepair && (
                            <button
                              type="button"
                              onClick={() => setNoteOrderId(order._id)}
                              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                            >
                              Add note
                            </button>
                          )}
                        </div>
                      )}

                      {activeBucket === 'pending_approval' && (
                        <div className="flex flex-wrap gap-2">
                          {masterPlan && (
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(masterPlan.url)}
                              className="bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                            >
                              <FileText size={14} /> Plan
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate('/approvals')}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                          >
                            {t('sched_review')}
                          </button>
                        </div>
                      )}

                      {activeBucket === 'scheduled' && (
                        <div className="flex flex-wrap gap-2 items-center">
                          {masterPlan && (
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(masterPlan.url)}
                              className="bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                            >
                              <FileText size={14} /> Plan
                            </button>
                          )}
                          {hasIssue ? (
                            <button
                              type="button"
                              onClick={() => resolveIssue(order)}
                              className="bg-red-900/30 hover:bg-red-900/40 text-red-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-900/40"
                            >
                              {t('sched_resolve_issue')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => markIssue(order)}
                              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                            >
                              {t('sched_mark_issue')}
                            </button>
                          )}
                          <span className="text-slate-500 text-xs">{t('scheduled')}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <SchedulingModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={fetchOrders}
        />
      )}

      {selectedRepair && (
        <RepairSchedulingModal
          repair={selectedRepair}
          onClose={() => setSelectedRepair(null)}
          onSuccess={fetchOrders}
        />
      )}

      {noteOrderId && (
        <NoteModal
          orderId={noteOrderId}
          stage="scheduling"
          onClose={() => setNoteOrderId(null)}
          onSaved={fetchOrders}
        />
      )}

      {previewUrl && (
        <MasterPlanPreviewModal
          url={previewUrl}
          title="Master plan"
          onClose={() => setPreviewUrl('')}
        />
      )}
    </div>
  );
};

export default InstallationsManager;