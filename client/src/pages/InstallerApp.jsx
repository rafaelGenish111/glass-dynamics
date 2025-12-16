import React, { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Camera, CheckCircle, Loader, RefreshCw, FileText } from 'lucide-react';
import { API_URL } from '../config/api';
import NoteModal from '../components/NoteModal';

const InstallerApp = () => {
    const { t } = useTranslation();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState(null);
    const [range, setRange] = useState('today'); // today | tomorrow | week
    const [noteOrderId, setNoteOrderId] = useState(null);

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
            const res = await axios.get(`${API_URL}/orders`, config);
            const myJobs = res.data
                .filter((o) => ['scheduled', 'install'].includes(o.status)) // keep legacy
                .filter(isAssignedToMe)
                .filter((o) => inRange(o.installDateStart));
            setJobs(myJobs);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching jobs:", error);
            setLoading(false);
        }
    }, [config, inRange, isAssignedToMe]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const handleFileUpload = async (e, orderId) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingId(orderId);
        const formData = new FormData();
        formData.append('image', file);
        try {
            const uploadRes = await axios.post(`${API_URL}/upload`, formData);
            await axios.put(`${API_URL}/orders/${orderId}/files`, {
                url: uploadRes.data.url,
                type: 'site_photo',
                name: 'Installation Proof'
            }, config);
            alert(t('file_uploaded'));
            setUploadingId(null);
            fetchJobs();
        } catch (e) {
            console.error(e);
            alert('Upload failed');
            setUploadingId(null);
        }
    };

    const finishJob = async (orderId) => {
        if (!window.confirm(t('finish_job') + '?')) return;
        try {
            await axios.put(`${API_URL}/orders/${orderId}/status`, { status: 'pending_approval' }, config); // Move to pending approval
            fetchJobs();
        } catch (e) {
            console.error(e);
            alert('Error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">{t('my_tasks')}</h2>
                <button onClick={fetchJobs} className="bg-slate-800 p-2 rounded-full text-slate-400 active:scale-95">
                    <RefreshCw size={20} />
                </button>
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
                                    <a
                                        href={masterPlan.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl mb-6 text-center font-bold shadow-lg shadow-indigo-900/40 border border-indigo-400 flex items-center justify-center gap-3 active:scale-95 transition"
                                    >
                                        <FileText size={24} />
                                        <span className="text-lg">{t('view_master_plan')}</span>
                                    </a>
                                )}

                                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl">
                                    {range.toUpperCase()}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1 pr-12">{job.clientName}</h3>

                                <a
                                    href={`https://waze.com/ul?q=${job.clientAddress}`}
                                    target="_blank" rel="noreferrer"
                                    className="text-blue-400 text-sm mb-6 flex items-center gap-2 underline underline-offset-4"
                                >
                                    <MapPin size={16} /> {job.clientAddress}
                                </a>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <a
                                        href={`https://waze.com/ul?q=${job.clientAddress}`}
                                        target="_blank" rel="noreferrer"
                                        className="bg-slate-800 hover:bg-slate-700 text-blue-400 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 border border-slate-700"
                                    >
                                        <MapPin /> Waze
                                    </a>
                                    <a
                                        href={`tel:${job.clientPhone}`}
                                        className="bg-slate-800 hover:bg-slate-700 text-emerald-400 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 border border-slate-700"
                                    >
                                        <Phone /> Call
                                    </a>
                                </div>

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
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, job._id)} />
                                    </label>

                                    <button
                                        onClick={() => finishJob(job._id)}
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
        </div>
    );
};

export default InstallerApp;