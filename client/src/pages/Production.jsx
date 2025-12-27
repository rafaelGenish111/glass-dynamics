import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Hammer, CheckCircle, Save } from 'lucide-react';
import { API_URL } from '../config/api';

const Production = () => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draftNotes, setDraftNotes] = useState({});
    const [savingId, setSavingId] = useState(null);
    const user = JSON.parse(localStorage.getItem('userInfo'));
    const token = user?.token;
    const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
    const POLL_MS = 20000;

    const fetchProductionOrders = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/orders`, config);
            const statusesForProduction = new Set(['materials_pending', 'production_pending', 'production', 'in_production']);
            const prodOrders = res.data.filter((o) => statusesForProduction.has(o.status));
            setOrders(prodOrders);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    }, [config]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchProductionOrders();
        const id = setInterval(() => {
            fetchProductionOrders();
        }, POLL_MS);
        return () => clearInterval(id);
    }, [fetchProductionOrders]);

    const finishProduction = async (orderId) => {
        if (!window.confirm(t('finish_production_confirm'))) return;
        try {
            await axios.put(`${API_URL}/orders/${orderId}/status`, { status: 'ready_for_install' }, config);
            fetchProductionOrders();
        } catch (e) {
            console.error(e);
            alert(t('error_updating_status'));
        }
    };

    const isRelevant = (order, types) => {
        const materials = Array.isArray(order.materials) ? order.materials : [];
        return materials.some((m) => types.includes(m.materialType));
    };

    const getChecklistValue = (order, key, relevant) => {
        const v = order?.productionChecklist?.[key];
        if (typeof v === 'boolean') return v;
        // Auto-Done if not relevant
        return relevant ? false : true;
    };

    const updateChecklist = async (order, patch) => {
        try {
            await axios.put(`${API_URL}/orders/${order._id}/production`, { productionChecklist: patch }, config);
            fetchProductionOrders();
        } catch (e) {
            console.error(e);
            alert(t('error_saving_production'));
        }
    };

    const saveProductionNote = async (order) => {
        const text = (draftNotes[order._id] ?? order.productionNote ?? '').trimEnd();
        setSavingId(order._id);
        try {
            await axios.put(`${API_URL}/orders/${order._id}/production`, { productionNote: text }, config);
            setSavingId(null);
            fetchProductionOrders();
        } catch (e) {
            console.error(e);
            setSavingId(null);
            alert(t('error_saving_note'));
        }
    };

    return (
        <div className="pb-10">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Hammer className="text-amber-500" size={32} /> {t('production_floor')}
                </h2>
                <button
                    type="button"
                    onClick={fetchProductionOrders}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold border border-slate-700"
                >
                    {t('refresh')}
                </button>
            </div>

            {loading ? (
                <div className="text-white">{t('loading')}</div>
            ) : orders.length === 0 ? (
                <div className="bg-slate-800 p-12 rounded-2xl text-center border border-slate-700 opacity-50">
                    <Hammer className="mx-auto text-slate-500 mb-4" size={64} />
                    <h3 className="text-2xl text-white font-bold">{t('no_production')}</h3>
                </div>
            ) : (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                            <tr>
                                <th className="p-4">{t('order_col')}</th>
                                <th className="p-4">{t('client')}</th>
                                <th className="p-4">{t('glass')}</th>
                                <th className="p-4">{t('paint')}</th>
                                <th className="p-4">{t('materials')}</th>
                                <th className="p-4">{t('production_note')}</th>
                                <th className="p-4">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {orders.map((order) => {
                                const displayOrderNumber = order.manualOrderNumber || order.orderNumber || order._id;

                                const glassRelevant = isRelevant(order, ['Glass']);
                                const paintRelevant = isRelevant(order, ['Paint']);
                                const materialsRelevant = isRelevant(order, ['Aluminum', 'Hardware', 'Other']);

                                const glassDone = getChecklistValue(order, 'glassDone', glassRelevant);
                                const paintDone = getChecklistValue(order, 'paintDone', paintRelevant);
                                const materialsDone = getChecklistValue(order, 'materialsDone', materialsRelevant);

                                const canReady = Boolean(glassDone && paintDone && materialsDone);
                                const currentNote = draftNotes[order._id] ?? (order.productionNote || '');

                                return (
                                    <tr key={order._id} className="hover:bg-slate-800/30 transition">
                                        <td className="p-4 font-mono text-amber-400">#{displayOrderNumber}</td>
                                        <td className="p-4 font-semibold text-white">{order.clientName}</td>
                                        <td className="p-4">
                                            <button
                                                type="button"
                                                onClick={() => updateChecklist(order, { glassDone: !glassDone })}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${glassDone
                                                    ? 'bg-emerald-600/20 text-emerald-200 border-emerald-700'
                                                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                                                    }`}
                                                title={glassRelevant ? '' : 'Auto-done (not relevant)'}
                                            >
                                                {glassDone ? t('done') : t('not_done')}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                type="button"
                                                onClick={() => updateChecklist(order, { paintDone: !paintDone })}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${paintDone
                                                    ? 'bg-emerald-600/20 text-emerald-200 border-emerald-700'
                                                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                                                    }`}
                                                title={paintRelevant ? '' : 'Auto-done (not relevant)'}
                                            >
                                                {paintDone ? t('done') : t('not_done')}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                type="button"
                                                onClick={() => updateChecklist(order, { materialsDone: !materialsDone })}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${materialsDone
                                                    ? 'bg-emerald-600/20 text-emerald-200 border-emerald-700'
                                                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                                                    }`}
                                                title={materialsRelevant ? '' : 'Auto-done (not relevant)'}
                                            >
                                                {materialsDone ? t('done') : t('not_done')}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={currentNote}
                                                    onChange={(e) => setDraftNotes((prev) => ({ ...prev, [order._id]: e.target.value }))}
                                                    placeholder={t('production_note') + '..."'}
                                                    className="w-full min-w-[220px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => saveProductionNote(order)}
                                                    disabled={savingId === order._id}
                                                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-bold border border-slate-700 inline-flex items-center gap-1"
                                                    title={t('save')}
                                                >
                                                    <Save size={14} /> {t('save')}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!canReady) {
                                                            alert(t('please_mark_all_done'));
                                                            return;
                                                        }
                                                        finishProduction(order._id);
                                                    }}
                                                    className={`text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${canReady
                                                        ? 'bg-emerald-600 hover:bg-emerald-500'
                                                        : 'bg-slate-700 cursor-not-allowed opacity-60'
                                                        }`}
                                                >
                                                    <CheckCircle size={14} /> {t('prod_ready_schedule')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Production;