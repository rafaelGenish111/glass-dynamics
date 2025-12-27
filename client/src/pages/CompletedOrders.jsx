import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';

const CompletedOrders = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('userInfo'));
  const token = user?.token;
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/orders`, config);
      setOrders(res.data.filter((o) => o.status === 'completed'));
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [config]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
        <CheckCircle className="text-emerald-500" /> {t('completed_orders')}
      </h2>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4">{t('order_col')}</th>
              <th className="p-4">{t('client')}</th>
              <th className="p-4">{t('region')}</th>
              <th className="p-4">{t('completed_closed')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-400">{t('loading')}</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500">{t('no_completed_orders')}</td></tr>
            ) : (
              orders.map((o) => {
                const displayOrderNumber = o.manualOrderNumber || o.orderNumber || o._id;
                return (
                  <tr
                    key={o._id}
                    className="hover:bg-slate-800/30 transition cursor-pointer"
                    onClick={() => navigate(`/orders/${o._id}`)}
                  >
                    <td className="p-4 font-mono text-emerald-300">#{displayOrderNumber}</td>
                    <td className="p-4 font-semibold text-white">{o.clientName}</td>
                    <td className="p-4">{o.region || '—'}</td>
                    <td className="p-4 text-slate-500">{o.updatedAt ? new Date(o.updatedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompletedOrders;




