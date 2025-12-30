import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Camera, CheckCircle, Loader, RefreshCw, FileText, ClipboardList, X, Save, Menu, Calendar, User } from 'lucide-react';
import { API_URL } from '../config/api';
import NoteModal from '../components/NoteModal';
import MasterPlanPreviewModal from '../components/MasterPlanPreviewModal';

const InstallerApp = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState(null);
    const [range, setRange] = useState('today'); // today | tomorrow | week
    const [noteOrderId, setNoteOrderId] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [takeListJob, setTakeListJob] = useState(null);
    const [takeListDraft, setTakeListDraft] = useState([]);
    const [savingTakeList, setSavingTakeList] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const user = JSON.parse(localStorage.getItem('userInfo'));
    const token = user?.token;
    const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

    const isAssignedToMe = useCallback((order) => {
        const installers = Array.isArray(order.installers) ? order.installers : [];
        return installers.some((inst) => {
            const id = typeof inst === 'string' ? inst : inst?._id;
            return String(id) === String(user?._id);
        });
    }, [user?._id]);

    const inRange = useCallback((dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return false;

        const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        const today = startOfDay(new Date());

        if (range === 'today') {
            const end = new Date(today);
            end.setDate(end.getDate() + 1);
            return d >= today && d < end;
        }
        if (range === 'tomorrow') {
            const start = new Date(today);
            start.setDate(start.getDate() + 1);
            const end = new Date(today);
            end.setDate(end.getDate() + 2);
            return d >= start && d < end;
        }
        // week
        const end = new Date(today);
        end.setDate(end.getDate() + 7);
        return d >= today && d < end;
    }, [range]);

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, repairsRes] = await Promise.all([
                axios.get(`${API_URL}/orders`, config),
                axios.get(`${API_URL}/repairs`, config)
            ]);

            const myOrderJobs = ordersRes.data
                .filter((o) => ['scheduled', 'install'].includes(o.status)) // keep legacy
                .filter(isAssignedToMe)
                .filter((o) => inRange(o.installDateStart))
                .map((o) => ({ ...o, __type: 'order' }));

            const myRepairJobs = repairsRes.data
                .filter((r) => ['scheduled', 'in_progress'].includes(r.status))
                .filter((r) => {
                    const installers = Array.isArray(r.installers) ? r.installers : [];
                    return installers.some((inst) => String(inst) === String(user?._id));
                })
                .filter((r) => inRange(r.installDateStart))
                .map((r) => ({ ...r, __type: 'repair' }));

            setJobs([...myOrderJobs, ...myRepairJobs]);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching jobs:", error);
            setLoading(false);
        }
    }, [config, inRange, isAssignedToMe, user?._id]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const handleFileUpload = async (e, job) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingId(job._id);
        const formData = new FormData();
        formData.append('image', file);
        try {
            const uploadRes = await axios.post(`${API_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (job.__type === 'repair') {
                await axios.post(`${API_URL}/repairs/${job._id}/media`, {
                    url: uploadRes.data.url,
                    type: 'photo',
                    name: file.name || 'Installation proof'
                }, config);
            } else {
                await axios.put(`${API_URL}/orders/${job._id}/files`, {
                    url: uploadRes.data.url,
                    type: 'site_photo',
                    name: 'Installation Proof'
                }, config);
            }
            alert(t('file_uploaded'));
            setUploadingId(null);
            fetchJobs();
        } catch (e) {
            console.error('Upload error:', e);
            const errorMessage = e.response?.data?.message || e.message || 'Upload failed';
            alert(errorMessage);
            setUploadingId(null);
        }
    };

    const finishJob = async (job) => {
        if (!window.confirm(t('finish_job') + '?')) return;
        try {
            if (job.__type === 'repair') {
                await axios.post(`${API_URL}/repairs/${job._id}/close`, {}, config);
            } else {
                await axios.put(`${API_URL}/orders/${job._id}/status`, { status: 'pending_approval' }, config); // Move to pending approval
            }
            fetchJobs();
        } catch (e) {
            console.error(e);
            alert('Error');
        }
    };

    const openTakeList = (job) => {
        const list = Array.isArray(job.installTakeList) ? job.installTakeList : [];
        setTakeListJob(job);
        setTakeListDraft(list);
    };

    const closeTakeList = () => {
        setTakeListJob(null);
        setTakeListDraft([]);
        setSavingTakeList(false);
    };

    const saveTakeList = async () => {
        if (!takeListJob) return;
        setSavingTakeList(true);
        try {
            await axios.put(`${API_URL}/orders/${takeListJob._id}/install-take-list`, {
                installTakeList: takeListDraft
            }, config);
            setSavingTakeList(false);
            closeTakeList();
            fetchJobs();
        } catch (e) {
            console.error(e);
            setSavingTakeList(false);
            alert('Error saving checklist');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
            {/* Header with Logo and Hamburger Menu */}
            <div className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between mb-4">
                <img src="/logo.jpg" alt="Dynamica" className="h-10 object-contain" />
                <div className="flex items-center gap-2">
                    <button onClick={fetchJobs} className="bg-slate-800 p-2 rounded-full text-slate-400 active:scale-95">
                        <RefreshCw size={20} />
                    </button>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className="bg-slate-800 p-2 rounded-full text-slate-400 active:scale-95"
                    >
                        <Menu size={20} />
                    </button>
                </div>
            </div>

            {/* Hamburger Menu Dropdown */}
            {isMenuOpen && (
                <div className="fixed top-16 right-4 z-50 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 min-w-[200px]">
                    <button
                        onClick={() => {
                            navigate('/calendar');
                            setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-white transition"
                    >
                        <Calendar size={20} />
                        <span>{t('sidebar_calendar')}</span>
                    </button>
                    <button
                        onClick={() => {
                            setShowProfile(true);
                            setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-white transition"
                    >
                        <User size={20} />
                        <span>Profile</span>
                    </button>
                </div>
            )}

            {/* Profile Modal */}
            {showProfile && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Profile</h3>
                            <button onClick={() => setShowProfile(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Name</label>
                                <div className="text-white font-medium">{user?.name || '-'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Email</label>
                                <div className="text-white font-medium">{user?.email || '-'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Phone</label>
                                <div className="text-white font-medium">{user?.phone || '-'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Role</label>
                                <div className="text-white font-medium">{user?.role || '-'}</div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowProfile(false)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close menu when clicking outside */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                ></div>
            )}

            <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">{t('my_tasks')}</h2>
                </div>

            <div className="flex gap-2 mb-6">
                <button
                    type="button"
                    onClick={() => setRange('today')}
                    className={`px-4 py-2 rounded-2xl text-sm font-bold border transition ${range === 'today' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                >
                    Today
                </button>
                <button
                    type="button"
                    onClick={() => setRange('tomorrow')}
                    className={`px-4 py-2 rounded-2xl text-sm font-bold border transition ${range === 'tomorrow' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                >
                    Tomorrow
                </button>
                <button
                    type="button"
                    onClick={() => setRange('week')}
                    className={`px-4 py-2 rounded-2xl text-sm font-bold border transition ${range === 'week' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                >
                    Next 7 days
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center mt-20 text-slate-400">
                    <Loader className="animate-spin mb-4" size={32} />
                    <p>Loading...</p>
                </div>
            ) : jobs.length === 0 ? (
                <div className="text-center text-slate-500 mt-20 bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
                    <CheckCircle className="mx-auto mb-4 text-slate-600" size={48} />
                    <p className="text-lg font-medium">{t('no_installs')}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {jobs.map(job => {
                        // Check for Master Plan
                        const masterPlan = job.files && job.files.find(f => f.type === 'master_plan');

                        return (
                            <div key={job._id} className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">

                                {/* --- MASTER PLAN BANNER (THE NEW PART) --- */}
                                {masterPlan && (
                                    <button
                                        type="button"
                                        onClick={() => setPreviewUrl(masterPlan.url)}
                                        className="w-full block bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-2xl mb-6 text-center font-bold shadow-lg shadow-indigo-900/40 border border-indigo-400 flex items-center justify-center gap-3 active:scale-95 transition"
                                    >
                                        <FileText size={24} />
                                        <span className="text-xl">{t('view_master_plan')}</span>
                                    </button>
                                )}

                                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl">
                                    {range.toUpperCase()}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1 pr-12">{job.clientName}</h3>
                                {job.__type === 'repair' && (
                                    <div className="text-xs font-bold text-amber-300 mb-2">REPAIR</div>
                                )}

                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.clientAddress || '')}`}
                                    target="_blank" rel="noreferrer"
                                    className="text-blue-400 text-sm mb-6 flex items-center gap-2 underline underline-offset-4"
                                >
                                    <MapPin size={16} /> {job.clientAddress}
                                </a>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.clientAddress || '')}`}
                                        target="_blank" rel="noreferrer"
                                        className="bg-slate-800 hover:bg-slate-700 text-blue-400 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 border border-slate-700"
                                    >
                                        <MapPin /> Google Maps
                                    </a>
                                    <a
                                        href={`tel:${job.clientPhone}`}
                                        className="bg-slate-800 hover:bg-slate-700 text-emerald-400 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 border border-slate-700"
                                    >
                                        <Phone /> Call
                                    </a>
                                </div>

                                {/* Installation checklist (collapsed -> modal) */}
                                {job.__type !== 'repair' && Array.isArray(job.installTakeList) && job.installTakeList.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => openTakeList(job)}
                                        className="w-full mb-4 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-bold text-sm border border-slate-700 inline-flex items-center justify-center gap-2"
                                    >
                                        <ClipboardList size={18} /> Installation checklist
                                    </button>
                                )}

                                {/* Existing Photos Gallery */}
                                {job.files && job.files.filter(f => f.type !== 'master_plan').length > 0 && (
                                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                        {job.files.filter(f => f.type !== 'master_plan').map((file, idx) => (
                                            <a key={idx} href={file.url} target="_blank" rel="noreferrer" className="block w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-slate-600 shadow-sm">
                                                <img src={file.url} alt="proof" className="w-full h-full object-cover" />
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Upload & Finish */}
                                <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                    <label className="block w-full bg-slate-800 border-2 border-dashed border-slate-600 active:border-blue-500 text-slate-400 py-4 rounded-xl text-center cursor-pointer transition mb-3">
                                        {uploadingId === job._id ? (
                                            <span className="flex items-center justify-center gap-2 text-blue-400"><Loader className="animate-spin" /> {t('uploading')}</span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2"><Camera /> {t('upload_proof')}</span>
                                        )}
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, job)} />
                                    </label>

                                    <button
                                        onClick={() => finishJob(job)}
                                        className="w-full bg-emerald-600 active:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
                                    >
                                        <CheckCircle /> {t('finish_job')}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setNoteOrderId(job._id)}
                                        className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm border border-slate-700"
                                    >
                                        Add note
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {noteOrderId && (
                <NoteModal
                    orderId={noteOrderId}
                    stage="installation"
                    onClose={() => setNoteOrderId(null)}
                    onSaved={fetchJobs}
                />
            )}

            {previewUrl && (
                <MasterPlanPreviewModal
                    url={previewUrl}
                    title="Master plan"
                    onClose={() => setPreviewUrl('')}
                />
            )}

            {takeListJob && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white">Installation checklist</h3>
                                <p className="text-xs text-slate-400 mt-1">{takeListJob.clientName}</p>
                            </div>
                            <button type="button" onClick={closeTakeList} className="text-slate-400 hover:text-white">
                                <X />
                            </button>
                        </div>

                        <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
                            {takeListDraft.length === 0 ? (
                                <div className="text-slate-500 text-sm">No checklist items.</div>
                            ) : (
                                takeListDraft.map((it, idx) => (
                                    <label key={`${it.label}-${idx}`} className="flex items-center gap-3 bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200">
                                        <input
                                            type="checkbox"
                                            className="accent-emerald-500"
                                            checked={Boolean(it.done)}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setTakeListDraft((prev) => prev.map((p, i) => (i === idx ? { ...p, done: checked } : p)));
                                            }}
                                        />
                                        <span className={it.done ? 'line-through text-slate-500' : ''}>{it.label}</span>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="p-5 border-t border-slate-800 flex justify-end gap-3">
                            <button type="button" onClick={closeTakeList} className="px-4 py-2 text-slate-400 hover:text-white">
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={saveTakeList}
                                disabled={savingTakeList}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold inline-flex items-center gap-2"
                            >
                                <Save size={18} /> {savingTakeList ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default InstallerApp;