import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Check, ChevronDown, ChevronUp, X, FileText } from 'lucide-react';
import { API_URL } from '../config/api';
import NoteModal from '../components/NoteModal';
import MasterPlanPreviewModal from '../components/MasterPlanPreviewModal';

const PendingMaterials = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSupplier, setExpandedSupplier] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [orderMeta, setOrderMeta] = useState({ orderedBy: '', orderedAt: '' });
  const [noteOrderId, setNoteOrderId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const user = JSON.parse(localStorage.getItem('userInfo'));
  const token = user?.token;
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchItems = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/orders/procurement/pending`, config);
      setItems(res.data);
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  }, [config]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const key = item.supplier || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const openOrderModal = (item) => {
    const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    setSelectedItem(item);
    setOrderMeta({
      orderedBy: user?.name || '',
      orderedAt: today
    });
  };

  const closeOrderModal = () => {
    setSelectedItem(null);
    setOrderMeta({ orderedBy: '', orderedAt: '' });
  };

  const submitOrder = async () => {
    if (!selectedItem) return;
    try {
      await axios.post(`${API_URL}/orders/procurement/order-item`, {
        orderId: selectedItem.orderId,
        materialId: selectedItem.materialId,
        orderedBy: orderMeta.orderedBy,
        orderedAt: orderMeta.orderedAt
      }, config);
      closeOrderModal();
      fetchItems(); // refresh
    } catch (e) {
      console.error(e);
      alert(t('error'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
        <ShoppingCart className="text-orange-500" /> {t('pending_title')}
      </h2>

      <div className="space-y-4">
        {grouped.map(([supplierName, supplierItems]) => (
          <div key={supplierName} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setExpandedSupplier(expandedSupplier === supplierName ? null : supplierName)}
              className="w-full p-5 flex justify-between items-center cursor-pointer hover:bg-slate-800/50 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-orange-400 font-bold border border-slate-700">
                  {supplierName.charAt(0)}
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">{supplierName}</h3>
                  <p className="text-sm text-slate-400">{supplierItems.length} {t('pending_items_to_order')}</p>
                </div>
              </div>
              {expandedSupplier === supplierName ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
            </button>

            {expandedSupplier === supplierName && (
              <div className="border-t border-slate-800 bg-slate-950/30 p-4 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="py-2 pr-4">{t('pending_col_date')}</th>
                      <th className="py-2 pr-4">{t('pending_col_order')}</th>
                      <th className="py-2 pr-4">{t('client')}</th>
                      <th className="py-2 pr-4">{t('pending_col_type')}</th>
                      <th className="py-2 pr-4">{t('pending_col_desc')}</th>
                      <th className="py-2 pr-4">{t('pending_col_qty')}</th>
                      <th className="py-2 pr-0">{t('pending_col_action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {supplierItems.map((item, idx) => (
                      <tr key={`${item.orderId}-${item.materialId}-${idx}`} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 pr-4 whitespace-nowrap text-slate-500">{new Date(item.orderDate).toLocaleDateString()}</td>
                        <td className="py-3 pr-4 font-mono text-blue-400">#{item.orderNumber}</td>
                        <td className="py-3 pr-4 font-semibold text-white">{item.clientName}</td>
                        <td className="py-3 pr-4">
                          <span className="text-[10px] uppercase bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            {item.materialType}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{item.description}</td>
                        <td className="py-3 pr-4">{item.quantity}</td>
                        <td className="py-3 pr-0">
                          <div className="flex items-center gap-2">
                            {item.masterPlanUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewUrl(item.masterPlanUrl)}
                                className="bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                                title={t('master_plan')}
                              >
                                <FileText size={14} /> {t('plan')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openOrderModal(item)}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-lg"
                            >
                              <Check size={14} /> {t('pending_mark_ordered')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setNoteOrderId(item.orderId)}
                              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700"
                            >
                              {t('pending_col_note')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && !loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500">
            {t('no_pending_items')}
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">{t('pending_mark_ordered')}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  #{selectedItem.orderNumber} · {selectedItem.clientName} · {selectedItem.description}
                </p>
              </div>
              <button type="button" onClick={closeOrderModal} className="text-slate-400 hover:text-white">
                <X />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{t('pending_ordered_by')}</label>
                <input
                  type="text"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                  value={orderMeta.orderedBy}
                  onChange={(e) => setOrderMeta((prev) => ({ ...prev, orderedBy: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">{t('pending_ordered_date')}</label>
                <input
                  type="date"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                  value={orderMeta.orderedAt}
                  onChange={(e) => setOrderMeta((prev) => ({ ...prev, orderedAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex justify-end gap-3">
              <button type="button" onClick={closeOrderModal} className="px-4 py-2 text-slate-400 hover:text-white">
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={submitOrder}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold inline-flex items-center gap-2"
              >
                <Check size={18} /> {t('pending_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {noteOrderId && (
        <NoteModal
          orderId={noteOrderId}
          stage="procurement"
          onClose={() => setNoteOrderId(null)}
          onSaved={fetchItems}
        />
      )}

      {previewUrl && (
        <MasterPlanPreviewModal
          url={previewUrl}
          title={t('master_plan')}
          onClose={() => setPreviewUrl('')}
        />
      )}
    </div>
  );
};

export default PendingMaterials;