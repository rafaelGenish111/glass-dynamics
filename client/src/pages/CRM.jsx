import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Plus, Package, Clock } from 'lucide-react';
import NewOrderModal from '../components/NewOrderModal';
import { API_URL } from '../config/api';
import { useNavigate } from 'react-router-dom';

const CRM = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('userInfo'));
  const token = user?.token;
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  // Fetch orders for the CRM view
  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/orders`, config);
      setOrders(res.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  // Map visual colors to order status
  const getStatusColor = (status) => {
    switch (status) {
      case 'offer': return 'bg-slate-700 text-slate-300';
      case 'production': return 'bg-amber-500/20 text-amber-400';
      case 'install': return 'bg-blue-500/20 text-blue-400';
      case 'new': return 'bg-blue-500/20 text-blue-400';
      case 'materials_pending': return 'bg-orange-500/20 text-orange-400';
      case 'production_pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'in_production': return 'bg-amber-500/20 text-amber-400';
      case 'ready_for_install': return 'bg-green-500/20 text-green-400';
      case 'scheduled': return 'bg-blue-500/20 text-blue-400';
      case 'installed': return 'bg-purple-500/20 text-purple-400';
      case 'pending_approval': return 'bg-indigo-500/20 text-indigo-400';
      case 'completed': return 'bg-emerald-500/20 text-emerald-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-700 text-white';
    }
  };

  const getStatusTranslation = (status) => {
    const statusKey = `status_${status}`;
    return t(statusKey) || status.toUpperCase();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">{t('crm')}</h2>

        {/* Add-order button (visible only for authorized roles) */}
        {['super_admin', 'admin', 'office'].includes(user.role) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium shadow-lg transition"
          >
            <Plus size={20} /> {t('new_order')}
          </button>
        )}
      </div>

      {/* Orders table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4">{t('order_number')}</th>
              <th className="p-4">{t('client_name')}</th>
              <th className="p-4">{t('address')}</th>
              <th className="p-4 text-center">{t('items')}</th>
              <th className="p-4">{t('status')}</th>
              <th className="p-4">{t('workflow')}</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center">Loading...</td></tr>
            ) : orders.map((order) => (
              <tr key={order._id} className="hover:bg-slate-800/50 transition cursor-pointer" onClick={() => navigate(`/orders/${order._id}`)}>
                <td className="p-4 font-mono text-blue-400">#{order.orderNumber}</td>
                <td className="p-4 font-bold text-white">{order.clientName}</td>
                <td className="p-4 text-sm">{order.clientAddress}</td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-xs border border-slate-700">
                    <Package size={12} /> {order.items.length}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold border border-white/5 ${getStatusColor(order.status)}`}>
                    {getStatusTranslation(order.status)}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-500">Route {order.workflow}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold border border-white/5 ${getStatusColor(order.status)}`}>
                    {getStatusTranslation(order.status)}
                  </span>
                  {/* Dev shortcut button – move offer directly to production */}
                  {order.status === 'offer' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await axios.put(`${API_URL}/orders/${order._id}/status`, { status: 'production' }, { headers: { Authorization: `Bearer ${user.token}` } });
                        fetchOrders();
                      }}
                      className="ml-2 text-[10px] text-blue-400 hover:underline"
                    >
                      Move to Prod
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {!loading && orders.length === 0 && (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500">No orders found. Create one!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Injection */}
      {isModalOpen && (
        <NewOrderModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  );
};

export default CRM;