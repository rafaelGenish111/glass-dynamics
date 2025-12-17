import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, X, Receipt, CreditCard, FileText } from 'lucide-react';
import { API_URL } from '../config/api';
import NoteModal from '../components/NoteModal';
import MasterPlanPreviewModal from '../components/MasterPlanPreviewModal';

const OrderApprovals = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ isIssued: false, invoiceNumber: '', isPaid: false, amount: '' });
  const [noteOrderId, setNoteOrderId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const user = JSON.parse(localStorage.getItem('userInfo'));
  const token = user?.token;
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/orders`, config);
      setOrders(res.data.filter((o) => o.status === 'pending_approval'));
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [config]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openModal = (order) => {
    const fi = order.finalInvoice || {};
    setSelected(order);
    setForm({
      isIssued: Boolean(fi.isIssued),
      invoiceNumber: fi.invoiceNumber || '',
      isPaid: Boolean(fi.isPaid),
      amount: fi.amount ?? ''
    });
  };

  const closeModal = () => {
    setSelected(null);
    setForm({ isIssued: false, invoiceNumber: '', isPaid: false, amount: '' });
  };

  const save = async () => {
    if (!selected) return;
    try {
      await axios.put(`${API_URL}/orders/${selected._id}/final-invoice`, {
        isIssued: Boolean(form.isIssued),
        invoiceNumber: form.invoiceNumber,
        isPaid: Boolean(form.isPaid),
        amount: form.amount
      }, config);
      closeModal();
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert('Error saving approval');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
        <CheckCircle className="text-emerald-500" /> Financial approvals
      </h2>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4">Order #</th>
              <th className="p-4">Client</th>
              <th className="p-4">Region</th>
              <th className="p-4">Invoice</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500">No orders waiting for approval.</td></tr>
            ) : (
              orders.map((o) => {
                const displayOrderNumber = o.manualOrderNumber || o.orderNumber || o._id;
                const fi = o.finalInvoice || {};
                const masterPlan = o.files && o.files.find((f) => f.type === 'master_plan');
                return (
                  <tr key={o._id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-mono text-blue-400">#{displayOrderNumber}</td>
                    <td className="p-4 font-semibold text-white">{o.clientName}</td>
                    <td className="p-4">{o.region || '—'}</td>
                    <td className="p-4">
                      {fi.isIssued ? `Issued (${fi.invoiceNumber || '—'})` : 'Not issued'}
                    </td>
                    <td className="p-4">
                      {fi.isPaid
                        ? `Paid (${fi.amount ?? '—'})`
                        : `Not paid${typeof fi.amount === 'number' ? ` (${fi.amount})` : ''}`}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
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
                          onClick={() => openModal(o)}
                          className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() => setNoteOrderId(o._id)}
                          className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                        >
                          Add note
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Approve order</h3>
                <p className="text-xs text-slate-400 mt-1">{selected.clientName}</p>
              </div>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-white">
                <X />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-950/30 rounded-xl border border-slate-800 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.isIssued}
                    onChange={(e) => setForm((p) => ({ ...p, isIssued: e.target.checked }))}
                    className="accent-emerald-500"
                  />
                  <span className="inline-flex items-center gap-2"><Receipt size={16} /> Invoice issued</span>
                </label>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Invoice number</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                    value={form.invoiceNumber}
                    onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                    placeholder="e.g. INV-12345"
                  />
                </div>
              </div>

              <div className="bg-slate-950/30 rounded-xl border border-slate-800 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.isPaid}
                    onChange={(e) => setForm((p) => ({ ...p, isPaid: e.target.checked }))}
                    className="accent-emerald-500"
                  />
                  <span className="inline-flex items-center gap-2"><CreditCard size={16} /> Customer paid</span>
                </label>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Amount paid</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">
                When invoice is issued and payment is marked as paid (with amount), the order will move to Completed Orders.
              </p>
            </div>

            <div className="p-5 border-t border-slate-800 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {noteOrderId && (
        <NoteModal
          orderId={noteOrderId}
          stage="approval"
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

export default OrderApprovals;

