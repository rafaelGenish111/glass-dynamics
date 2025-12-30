import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Search, CheckCircle, Package, Hammer, Save, User, FileText, ExternalLink } from 'lucide-react';
import { API_URL } from '../config/api';

const NewOrderModal = ({ onClose, onSuccess }) => {
    const { t } = useTranslation();
    const user = JSON.parse(localStorage.getItem('userInfo'));
    const token = user?.token;
    const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

    // --- FORM STATE ---
    const [formData, setFormData] = useState({
        manualOrderNumber: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        clientAddress: '',
        region: '',
        depositPaid: false,
        depositPaidAt: '',
        deposit: 0, // legacy - kept for backwards compatibility
        estimatedInstallationDays: 1
    });

    // Table 1: Client Products (No Location field)
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({ type: '', description: '', quantity: 1 });

    // Table 2: Materials (Only Glass, Paint, Other)
    const [materials, setMaterials] = useState([]);
    const [newMaterial, setNewMaterial] = useState({ materialType: 'Glass', description: '', supplier: '', quantity: 1 });

    // Helpers
    const [suppliersList, setSuppliersList] = useState([]);
    const [clientSuggestions, setClientSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Master plan upload (PDF only)
    const [masterPlanFile, setMasterPlanFile] = useState(null);
    const masterPlanPreviewUrl = useMemo(() => {
        if (!masterPlanFile) return '';
        return URL.createObjectURL(masterPlanFile);
    }, [masterPlanFile]);

    // --- LOAD DATA ---
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const res = await axios.get(`${API_URL}/suppliers`, config);
                setSuppliersList(res.data);
            } catch (e) { console.error(e); }
        };
        fetchSuppliers();
    }, [config]);

    useEffect(() => {
        if (!masterPlanPreviewUrl) return undefined;
        return () => URL.revokeObjectURL(masterPlanPreviewUrl);
    }, [masterPlanPreviewUrl]);

    // --- CLIENT SEARCH (BY NAME) ---
    const handleNameChange = async (e) => {
        const value = e.target.value;
        setFormData({ ...formData, clientName: value });

        if (value.length > 1) {
            try {
                const res = await axios.get(`${API_URL}/orders/clients/search?query=${value}`, config);
                setClientSuggestions(res.data);
                setShowSuggestions(true);
            } catch (e) { console.error(e); }
        } else {
            setShowSuggestions(false);
        }
    };

    const selectClient = (client) => {
        // Only set the client name, don't auto-fill other fields
        setFormData({
            ...formData,
            clientName: client._id
        });
        setShowSuggestions(false);
    };

    // --- ADD / REMOVE ITEMS ---
    const addProduct = () => {
        if (!newProduct.type) return;
        setProducts([...products, newProduct]);
        setNewProduct({ type: '', description: '', quantity: 1 });
    };

    const addMaterial = () => {
        if (!newMaterial.description) return;
        // Default supplier if empty
        const matToAdd = { ...newMaterial, supplier: newMaterial.supplier || 'General' };
        setMaterials([...materials, matToAdd]);
        setNewMaterial({ materialType: 'Glass', description: '', supplier: '', quantity: 1 });
    };

    const removeProduct = (idx) => setProducts(products.filter((_, i) => i !== idx));
    const removeMaterial = (idx) => setMaterials(materials.filter((_, i) => i !== idx));

    // --- SUBMIT ---
    const handleSubmit = async () => {
        if (!formData.manualOrderNumber || !formData.clientName) return alert(t('order_number_name_required'));
        // Validation: Ensure at least one material if needed, or just warn
        if (materials.length === 0 && !window.confirm(t('no_materials_warning'))) return;

        try {
            const created = await axios.post(`${API_URL}/orders`, {
                ...formData,
                products,
                materials
            }, config);

            const orderId = created?.data?._id;
            if (orderId && masterPlanFile) {
                try {
                    const fd = new FormData();
                    fd.append('image', masterPlanFile);
                    const uploadRes = await axios.post(`${API_URL}/upload`, fd, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    await axios.put(`${API_URL}/orders/${orderId}/files`, {
                        url: uploadRes.data.url,
                        type: 'master_plan',
                        name: masterPlanFile.name || 'Master plan'
                    }, config);
                } catch (e) {
                    console.error('Upload error:', e);
                    const errorMessage = e.response?.data?.message || e.message || t('order_created_plan_failed');
                    alert(errorMessage);
                }
            }

            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || t('error_creating_order'));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 w-full max-w-5xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[95vh]">

                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-white">{t('active_add_new')}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-8">

                    {/* SECTION 1: Client & Order Info */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                        {/* Manual Order # */}
                        <div className="md:col-span-1">
                            <label className="text-xs text-blue-400 block mb-1 font-bold">{t('new_manual_order_num')}</label>
                            <input type="text" className="w-full bg-slate-950 border border-blue-500/50 rounded-lg p-2 text-white font-mono"
                                value={formData.manualOrderNumber} onChange={e => setFormData({ ...formData, manualOrderNumber: e.target.value })}
                                placeholder="e.g. 2024-100" />
                        </div>
                        <div className="md:col-span-3"></div>

                        {/* Client Name (Searchable) */}
                        <div className="md:col-span-2 relative">
                            <label className="text-xs text-slate-400 block mb-1">{t('client_name')}</label>
                            <div className="relative">
                                <input type="text" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white pl-8"
                                    value={formData.clientName} onChange={handleNameChange} placeholder={t('search_by_name')} />
                                <User className="absolute left-2 top-2.5 text-slate-500" size={14} />
                            </div>

                            {/* Suggestions */}
                            {showSuggestions && clientSuggestions.length > 0 && (
                                <div className="absolute z-10 w-full bg-slate-800 border border-slate-600 rounded-lg mt-1 shadow-xl max-h-40 overflow-y-auto">
                                    {clientSuggestions.map((c, i) => (
                                        <div key={i} onClick={() => selectClient(c)}
                                            className="p-2 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 border-b border-slate-700/50 last:border-0">
                                            <span className="font-bold">{c._id}</span>
                                            <span className="text-slate-500 ml-2 text-xs">({c.phone})</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">{t('phone')}</label>
                            <input type="text" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                                value={formData.clientPhone} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} />
                        </div>

                        {/* Region */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">{t('new_region')}</label>
                            <input type="text" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                                value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })} placeholder={t('area')} />
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                            <label className="text-xs text-slate-400 block mb-1">{t('address')}</label>
                            <input type="text" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                                value={formData.clientAddress} onChange={e => setFormData({ ...formData, clientAddress: e.target.value })} />
                        </div>

                        {/* Deposit */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">{t('deposit_paid')}</label>
                            <label className="flex items-center gap-2 text-sm text-slate-200 bg-slate-800 border border-slate-600 rounded-lg p-2">
                                <input
                                    type="checkbox"
                                    checked={Boolean(formData.depositPaid)}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setFormData({
                                            ...formData,
                                            depositPaid: checked,
                                            depositPaidAt: checked ? (formData.depositPaidAt || new Date().toISOString().slice(0, 10)) : ''
                                        });
                                    }}
                                    className="accent-emerald-500"
                                />
                                <span>{t('paid')}</span>
                            </label>
                        </div>

                        {/* Deposit Date */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">{t('new_deposit_date')}</label>
                            <input
                                type="date"
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white disabled:opacity-50"
                                value={formData.depositPaidAt}
                                disabled={!formData.depositPaid}
                                onChange={(e) => setFormData({ ...formData, depositPaidAt: e.target.value })}
                            />
                        </div>

                        {/* Est. Days */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">{t('new_est_work_days')}</label>
                            <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white"
                                value={formData.estimatedInstallationDays} onChange={e => setFormData({ ...formData, estimatedInstallationDays: e.target.value })} />
                        </div>
                    </div>

                    {/* Master Plan */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-white font-bold">
                                <FileText size={18} />
                                <span>{t('new_master_plan')}</span>
                            </div>
                            {masterPlanPreviewUrl ? (
                                <a
                                    href={masterPlanPreviewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-300 hover:text-indigo-200 text-sm inline-flex items-center gap-1"
                                >
                                    {t('preview')} <ExternalLink size={12} />
                                </a>
                            ) : (
                                <span className="text-xs text-slate-500">{t('optional')}</span>
                            )}
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <label className="block w-full bg-slate-800 border-2 border-dashed border-slate-600 hover:border-indigo-500 text-slate-300 py-3 rounded-xl text-center cursor-pointer transition">
                                <span className="font-bold">{t('new_upload_plan')}</span>
                                <div className="text-xs text-slate-400 mt-1">PDF only</div>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file && file.type !== 'application/pdf') {
                                            alert('Only PDF files are allowed for master plan');
                                            e.target.value = '';
                                            return;
                                        }
                                        setMasterPlanFile(file || null);
                                    }}
                                />
                            </label>

                            {masterPlanPreviewUrl && masterPlanFile ? (
                                <div className="rounded-xl overflow-hidden border border-slate-700 bg-black/30">
                                    <div className="w-full h-48 bg-black flex flex-col items-center justify-center">
                                        <FileText className="text-indigo-400 mb-2" size={48} />
                                        <span className="text-sm text-slate-300 mb-2">{masterPlanFile?.name}</span>
                                        <a
                                            href={masterPlanPreviewUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                                        >
                                            {t('preview')} <ExternalLink size={12} />
                                        </a>
                                    </div>
                                    <div className="p-2 text-xs text-slate-400 flex items-center justify-between">
                                        <span className="truncate">{masterPlanFile?.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setMasterPlanFile(null)}
                                            className="text-slate-300 hover:text-white"
                                        >
                                            {t('remove')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500 border border-slate-800 rounded-xl p-4">
                                    {t('new_no_plan')}
                                </div>
                            )}
                        </div>
                    </div>

                    <hr className="border-slate-800" />

                    {/* SECTION 2: Client Products */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Package className="text-purple-400" /> {t('new_products_title')}</h3>

                        {/* Input Row */}
                        <div className="flex flex-col md:flex-row gap-2 mb-3 bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <input type="text" placeholder={t('type_window_door')} className="flex-1 bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                value={newProduct.type} onChange={e => setNewProduct({ ...newProduct, type: e.target.value })} />

                            <input type="text" placeholder={t('new_col_desc')} className="flex-[2] bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} />

                            <input type="number" placeholder={t('qty')} className="w-20 bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                value={newProduct.quantity} onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })} />

                            <button onClick={addProduct} className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded"><Plus /></button>
                        </div>

                        {/* Table */}
                        {products.length > 0 && (
                            <div className="bg-slate-900 rounded border border-slate-800">
                                {products.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 border-b border-slate-800 text-sm text-slate-300 last:border-0">
                                        <span>{p.quantity}x <b>{p.type}</b> - {p.description}</span>
                                        <button onClick={() => removeProduct(i)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: Materials */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Hammer className="text-orange-400" /> {t('new_materials_title')}</h3>

                        <div className="flex flex-col md:flex-row gap-2 mb-3 bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <select className="bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                value={newMaterial.materialType} onChange={e => setNewMaterial({ ...newMaterial, materialType: e.target.value })}>
                                <option value="Glass">{t('new_mat_glass')}</option>
                                <option value="Paint">{t('new_mat_paint')}</option>
                                <option value="Other">{t('new_mat_other')}</option>
                            </select>

                            <input type="text" placeholder={t('material_description')} className="flex-[2] bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                value={newMaterial.description} onChange={e => setNewMaterial({ ...newMaterial, description: e.target.value })} />

                            <select className="flex-1 bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                value={newMaterial.supplier} onChange={e => setNewMaterial({ ...newMaterial, supplier: e.target.value })}>
                                <option value="">{t('new_select_supplier')}</option>
                                {suppliersList.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                            </select>

                            <input type="number" placeholder={t('qty')} className="w-20 bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                value={newMaterial.quantity} onChange={e => setNewMaterial({ ...newMaterial, quantity: e.target.value })} />

                            <button onClick={addMaterial} className="bg-orange-600 hover:bg-orange-500 text-white p-2 rounded"><Plus /></button>
                        </div>

                        {materials.length > 0 && (
                            <div className="bg-slate-900 rounded border border-slate-800">
                                {materials.map((m, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 border-b border-slate-800 text-sm text-slate-300 last:border-0">
                                        <span className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase bg-slate-800 px-1 rounded border border-slate-700">{m.materialType}</span>
                                            {m.quantity}x {m.description}
                                        </span>
                                        <span className="text-orange-400 text-xs">{m.supplier}</span>
                                        <button onClick={() => removeMaterial(i)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                <div className="p-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-900 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2 text-slate-400 hover:text-white">{t('cancel')}</button>
                    <button onClick={handleSubmit} className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg flex items-center gap-2">
                        <Save size={18} /> {t('new_btn_create')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewOrderModal;