import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Truck, Calendar, CheckCircle, Clock } from 'lucide-react';
import SchedulingModal from '../components/SchedulingModal';
import { API_URL } from '../config/api';
import NoteModal from '../components/NoteModal';

const InstallationsManager = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeBucket, setActiveBucket] = useState('ready_for_install');
  const [noteOrderId, setNoteOrderId] = useState(null);
  const user = JSON.parse(localStorage.getItem('userInfo'));
  const token = user?.token;
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/orders`, config);
      setOrders(res.data);
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  }, [config]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Legacy (kept for backwards compatibility)
  const handleApprove = async (orderId) => {
    if (!window.confirm(t('approve_close') + '?')) return;
    try {
      await axios.post(`${API_URL}/orders/install/approve`, { orderId }, config);
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert('Error approving');
    }
  };

  const buckets = useMemo(() => {
    const ready = orders.filter(o => o.status === 'ready_for_install');
    const scheduled = orders.filter(o => o.status === 'scheduled');
    const pendingApproval = orders.filter(o => o.status === 'pending_approval');
    return { ready, scheduled, pendingApproval };
  }, [orders]);

  const rows = useMemo(() => {
    if (activeBucket === 'scheduled') return buckets.scheduled;
    if (activeBucket === 'pending_approval') return buckets.pendingApproval;
    return buckets.ready;
  }, [activeBucket, buckets]);

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
        <Truck className="text-emerald-500" /> {t('installations_center')}
      </h2>

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
              <th className="p-4">Order #</th>
              <th className="p-4">Client</th>
              <th className="p-4">Work days</th>
              <th className="p-4">Deposit paid</th>
              <th className="p-4">Deposit date</th>
              <th className="p-4">Region</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-500">No orders in this stage.</td></tr>
            ) : (
              rows.map((order) => {
                const displayOrderNumber = order.manualOrderNumber || order.orderNumber || order._id;
                const depositPaid = Boolean(order.depositPaid);
                const depositPaidAt = order.depositPaidAt ? new Date(order.depositPaidAt).toLocaleDateString() : '—';

                return (
                  <tr key={order._id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-mono text-blue-400">#{displayOrderNumber}</td>
                    <td className="p-4 font-semibold text-white">{order.clientName}</td>
                    <td className="p-4">{order.estimatedInstallationDays ?? 1}</td>
                    <td className="p-4">{depositPaid ? 'Yes' : 'No'}</td>
                    <td className="p-4">{depositPaid ? depositPaidAt : '—'}</td>
                    <td className="p-4">{order.region || '—'}</td>
                    <td className="p-4">
                      {activeBucket === 'ready_for_install' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            {t('schedule_job')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setNoteOrderId(order._id)}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                          >
                            Add note
                          </button>
                        </div>
                      )}

                      {activeBucket === 'pending_approval' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(order._id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          {t('approve_close')}
                        </button>
                      )}

                      {activeBucket === 'scheduled' && (
                        <span className="text-slate-500 text-xs">Scheduled</span>
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

      {noteOrderId && (
        <NoteModal
          orderId={noteOrderId}
          stage="scheduling"
          onClose={() => setNoteOrderId(null)}
          onSaved={fetchOrders}
        />
      )}
    </div>
  );
};

export default InstallationsManager;