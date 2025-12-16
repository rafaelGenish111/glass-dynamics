import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Plus, Package, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NewOrderModal from '../components/NewOrderModal';
import { API_URL } from '../config/api';

const ActiveOrders = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const userInfo = localStorage.getItem('userInfo');
    const user = userInfo ? JSON.parse(userInfo) : null;

    const fetchOrders = useCallback(async () => {
        if (!user || !user.token) {
            console.error('User not authenticated');
            setLoading(false);
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const res = await axios.get(`${API_URL}/orders`, config);

            // filter only non-completed orders
            const active = res.data.filter(o => o.status !== 'completed');

            setOrders(active);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('userInfo');
                navigate('/login');
            }
            setLoading(false);
        }
    }, [user, navigate]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchOrders();
    }, [fetchOrders]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'offer': return 'bg-slate-700 text-slate-300';
            case 'production': return 'bg-amber-500/20 text-amber-400';
            case 'install': return 'bg-blue-500/20 text-blue-400';
            default: return 'bg-slate-700 text-white';
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">{t('active_orders')}</h2>
                {user && ['super_admin', 'admin', 'office'].includes(user.role) && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium shadow-lg transition"
                    >
                        <Plus size={20} /> {t('new_order')}
                    </button>
                )}
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                        <tr>
                            <th className="p-4">{t('order_number')}</th>
                            <th className="p-4">{t('client_name')}</th>
                            <th className="p-4">{t('address')}</th>
                            <th className="p-4 text-center">{t('items')}</th>
                            <th className="p-4">{t('status')}</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-300 divide-y divide-slate-800">
                        {loading ? (<tr><td colSpan="5" className="p-8 text-center">Loading...</td></tr>) :
                            orders.length === 0 ? (<tr><td colSpan="5" className="p-8 text-center text-slate-500">No open orders. All done! 🎉</td></tr>) :
                                orders.map((order) => {
                                    const itemCount = Array.isArray(order.products)
                                        ? order.products.length
                                        : Array.isArray(order.items)
                                            ? order.items.length
                                            : 0;

                                    const displayOrderNumber = order.manualOrderNumber || order.orderNumber || order._id;

                                    return (
                                        <tr
                                            key={order._id}
                                            onClick={() => navigate(`/orders/${order._id}`)}
                                            className="hover:bg-slate-800/50 transition cursor-pointer"
                                        >
                                            <td className="p-4 font-mono text-blue-400">#{displayOrderNumber}</td>
                                            <td className="p-4 font-bold text-white">{order.clientName}</td>
                                            <td className="p-4">{order.clientAddress}</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-slate-800 px-2 py-1 rounded text-xs border border-slate-700">
                                                    {itemCount}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(order.status)}`}>
                                                    {String(order.status || '').toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && <NewOrderModal onClose={() => setIsModalOpen(false)} onSuccess={fetchOrders} />}
        </div>
    );
};

export default ActiveOrders;