import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Truck, CheckSquare, ChevronDown, ChevronUp, User, Calendar, FileText } from 'lucide-react';
import { API_URL } from '../config/api';
import MasterPlanPreviewModal from '../components/MasterPlanPreviewModal';

const PurchasingTracking = () => {
    const { t } = useTranslation();
    const [suppliers, setSuppliers] = useState([]);
    const [expandedSupplier, setExpandedSupplier] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    const user = JSON.parse(localStorage.getItem('userInfo'));
    const token = user?.token;
    const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
    const POLL_MS = 20000;

    const fetchData = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/orders/procurement/tracking`, config);
            setSuppliers(res.data);
        } catch (error) { console.error(error); }
    }, [config]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
        const id = setInterval(() => {
            fetchData();
        }, POLL_MS);
        return () => clearInterval(id);
    }, [fetchData]);

    const toggleArrival = async (orderId, materialId, currentStatus) => {
        const nextStatus = !currentStatus;
        const msg = nextStatus
            ? 'Confirm this item was received?'
            : 'Mark this item as NOT received?';
        if (!window.confirm(msg)) return;

        try {
            await axios.post(`${API_URL}/orders/procurement/arrive-item`, {
                orderId, materialId, isArrived: nextStatus
            }, config);
            fetchData(); // refresh
        } catch (e) {
            console.error(e);
            alert('Error updating status');
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Truck className="text-emerald-500" /> {t('purchasing_receiving_title')}
                </h2>
                <button
                    type="button"
                    onClick={fetchData}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold border border-slate-700"
                >
                    {t('refresh')}
                </button>
            </div>

            <div className="space-y-4">
                {suppliers.map(group => (
                    <div key={group._id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">

                        {/* Supplier Header */}
                        <div
                            onClick={() => setExpandedSupplier(expandedSupplier === group._id ? null : group._id)}
                            className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-800/50 transition"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-emerald-500 font-bold border border-slate-700">
                                    {group._id.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{group._id}</h3>
                                    <p className="text-sm text-slate-400">{group.items.filter(i => !i.isArrived).length} {t('purchasing_items_transit')}</p>
                                </div>
                            </div>
                            {expandedSupplier === group._id ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
                        </div>

                        {/* Items Checklist (Expandable) */}
                        {expandedSupplier === group._id && (
                            <div className="border-t border-slate-800 bg-slate-950/30 p-4">
                                <div className="space-y-2">
                                    {group.items.map((item, idx) => (
                                        <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${item.isArrived ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-slate-900 border-slate-800'}`}>

                                            <div className="flex items-center gap-4">
                                                {item.masterPlanUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewUrl(item.masterPlanUrl)}
                                                        className="w-8 h-8 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white flex items-center justify-center border border-indigo-500/40"
                                                        title="View master plan"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => toggleArrival(item.orderId, item.materialId, item.isArrived)}
                                                    className={`w-6 h-6 rounded border flex items-center justify-center transition ${item.isArrived ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 hover:border-emerald-500'}`}
                                                >
                                                    {item.isArrived && <CheckSquare size={14} />}
                                                </button>

                                                <div>
                                                    <p className={`text-sm font-medium ${item.isArrived ? 'text-slate-500 line-through' : 'text-white'}`}>
                                                        {item.quantity}x {item.description}
                                                    </p>
                                                    <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                                        <span className="text-blue-400 font-mono">#{item.orderNumber}</span>
                                                        <span>{item.clientName}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right text-xs text-slate-500">
                                                <div className="flex items-center justify-end gap-1"><User size={10} /> {item.orderedBy}</div>
                                                <div className="flex items-center justify-end gap-1"><Calendar size={10} /> {new Date(item.orderedAt).toLocaleDateString()}</div>
                                                {item.isArrived && item.arrivedAt && (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Calendar size={10} /> Received: {new Date(item.arrivedAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {suppliers.length === 0 && <div className="text-white text-center py-10">No open purchasing orders</div>}
            </div>

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

export default PurchasingTracking;