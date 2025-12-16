import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, CheckCircle, Package } from 'lucide-react';
import { API_URL } from '../config/api';

const Suppliers = () => {
    const { t } = useTranslation();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem('userInfo'));
    const token = user?.token;
    const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

    const fetchBatching = useCallback(async () => {
        try {
            // API_URL already includes '/api', so we only append '/orders/...'
            const res = await axios.get(`${API_URL}/orders/batching`, config);
            setSuppliers(res.data); // data is grouped by supplier on the server
            setLoading(false);
        } catch (error) {
            console.error('Error fetching batching list:', error);
            setLoading(false);
        }
    }, [config]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchBatching();
    }, [fetchBatching]);

    const handleOrderAll = async (supplierName) => {
        if (!window.confirm(`Generate Purchase Order for ${supplierName}?`)) return;

        try {
            // API_URL already includes '/api'
            await axios.post(`${API_URL}/orders/batch-order`, { supplier: supplierName }, config);
            alert('Success! Items marked as ordered.');
            fetchBatching(); // refresh view
        } catch (error) {
            console.error('Error processing batch order:', error);
            alert('Error processing order');
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-white mb-2">{t('purchasing_center')}</h2>
            <p className="text-slate-400 mb-8">Smart Batching System</p>

            {loading ? (
                <div className="text-white">Loading...</div>
            ) : suppliers.length === 0 ? (
                <div className="bg-slate-800 p-8 rounded-2xl text-center border border-slate-700">
                    <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
                    <h3 className="text-xl text-white font-bold">{t('no_pending_items')}</h3>
                    <p className="text-slate-400 mt-2">All active orders have their materials ordered!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {suppliers.map((group) => (
                        <div key={group._id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-blue-500/50 transition">

                            {/* Header */}
                            <div className="p-6 bg-slate-800/50 flex justify-between items-center border-b border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 text-blue-400">
                                        <ShoppingCart size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{t('supplier_group')}: {group._id}</h3>
                                        <p className="text-sm text-slate-400">{group.totalItems} {t('items_pending')}</p>
                                    </div>
                                </div>

                                {/* Order Button */}
                                <button
                                    onClick={() => handleOrderAll(group._id)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition active:scale-95"
                                >
                                    {t('order_all')}
                                </button>
                            </div>

                            {/* Items Table */}
                            <div className="p-4">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-slate-500 text-xs uppercase">
                                        <tr>
                                            <th className="pb-2">{t('client')}</th>
                                            <th className="pb-2">{t('product')}</th>
                                            <th className="pb-2">{t('description')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-300 divide-y divide-slate-800">
                                        {group.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="py-3 font-medium text-white">{item.clientName} <span className="text-slate-500 text-xs">(#{item.orderNumber})</span></td>
                                                <td className="py-3">{item.productType}</td>
                                                <td className="py-3 text-slate-400">{item.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Suppliers;