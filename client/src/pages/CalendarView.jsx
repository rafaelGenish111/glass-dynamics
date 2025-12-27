import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
// שינוי קריטי: טעינת השפה מהנתיב המלא
import 'moment/dist/locale/es'; 
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { API_URL } from '../config/api';

// הגדרת תחילת השבוע ליום שני (1 = Monday) לפני יצירת ה-localizer
moment.locale('en', {
    week: {
        dow: 1, // Monday is the first day of the week
    }
});
moment.locale('es', {
    week: {
        dow: 1, // Monday is the first day of the week
    }
});

// מגדירים את ה-Localizer מחוץ לקומפוננטה
const localizer = momentLocalizer(moment);

const CalendarView = () => {
    const { t, i18n } = useTranslation();
    const [events, setEvents] = useState([]);
    const [showInstallations, setShowInstallations] = useState(true);
    
    // שליפת המשתמש
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('userInfo'));
        } catch (e) {
            return null;
        }
    }, []);

    const token = user?.token;
    const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

    // זיהוי השפה הנוכחית (es או en)
    const currentLang = (i18n.language || 'en').startsWith('es') ? 'es' : 'en';

    // עדכון שפת ה-Moment בכל פעם שהשפה משתנה
    // הגדרת תחילת השבוע ליום שני (1 = Monday)
    useEffect(() => {
        console.log('Switching calendar language to:', currentLang);
        moment.locale(currentLang, {
            week: {
                dow: 1, // Monday is the first day of the week
            }
        });
    }, [currentLang]);

    const isRestricted = ['installer', 'production'].includes(user?.role);

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        try {
            const [ordersRes, repairsRes] = await Promise.all([
                axios.get(`${API_URL}/orders`, config),
                axios.get(`${API_URL}/repairs`, config)
            ]);

            let relevantOrders = ordersRes.data;
            let relevantRepairs = repairsRes.data;

            if (isRestricted) {
                relevantOrders = ordersRes.data.filter((order) => {
                    const installers = Array.isArray(order.installers) ? order.installers : [];
                    return installers.some((inst) => {
                        const id = typeof inst === 'string' ? inst : inst?._id;
                        return String(id) === String(user?._id);
                    });
                });

                relevantRepairs = repairsRes.data.filter((r) => {
                    const installers = Array.isArray(r.installers) ? r.installers : [];
                    return installers.some((inst) => String(inst) === String(user?._id));
                });
            }

            const calendarEvents = relevantOrders
                .filter((order) => order.installDateStart && order.installDateEnd)
                .map((order) => {
                    const displayOrderNumber = order.manualOrderNumber || order.orderNumber || '';
                    return {
                        id: order._id,
                        type: 'installation',
                        title: `${order.clientName} (${displayOrderNumber})`,
                        start: new Date(order.installDateStart),
                        end: new Date(order.installDateEnd),
                        resource: { ...order, __type: 'order' },
                        allDay: true
                    };
                });

            const repairEvents = relevantRepairs
                .filter((r) => r.installDateStart && r.installDateEnd)
                .map((r) => ({
                    id: r._id,
                    type: 'repair',
                    title: `REPAIR: ${r.clientName} (${r.manualOrderNumber})`,
                    start: new Date(r.installDateStart),
                    end: new Date(r.installDateEnd),
                    resource: { ...r, __type: 'repair' },
                    allDay: true
                }));

            setEvents([...calendarEvents, ...repairEvents]);
        } catch (e) {
            console.error(e);
        }
    }, [config, isRestricted, user?._id, token]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const visibleEvents = useMemo(() => {
        if (!showInstallations) return [];
        return events;
    }, [events, showInstallations]);

    // הגדרת הודעות הכפתורים (תרגום הממשק של היומן)
    const messages = useMemo(() => ({
        next: currentLang === 'es' ? 'Siguiente' : 'Next',
        previous: currentLang === 'es' ? 'Anterior' : 'Back',
        today: currentLang === 'es' ? 'Hoy' : 'Today',
        month: currentLang === 'es' ? 'Mes' : 'Month',
        week: currentLang === 'es' ? 'Semana' : 'Week',
        day: currentLang === 'es' ? 'Día' : 'Day',
        agenda: currentLang === 'es' ? 'Agenda' : 'Agenda',
        date: currentLang === 'es' ? 'Fecha' : 'Date',
        time: currentLang === 'es' ? 'Hora' : 'Time',
        event: currentLang === 'es' ? 'Evento' : 'Event',
        noEventsInRange: currentLang === 'es' ? 'No hay eventos.' : 'No events in this range.',
        showMore: total => `+${total} ${currentLang === 'es' ? 'más' : 'more'}`
    }), [currentLang]);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <CalendarIcon className="text-blue-500" /> {t('calendar')}
            </h2>

            {['super_admin', 'admin', 'office'].includes(user?.role) && (
                <div className="mb-4 flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                            type="checkbox"
                            checked={showInstallations}
                            onChange={(e) => setShowInstallations(e.target.checked)}
                            className="accent-blue-500"
                        />
                        Installations
                    </label>
                </div>
            )}

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex-1 text-white">
                <Calendar
                    key={currentLang} // מחייב רינדור מחדש כשמשנים שפה
                    localizer={localizer}
                    events={visibleEvents}
                    culture={currentLang} // מעביר את השפה ליומן
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    messages={messages}
                    eventPropGetter={(event) => {
                        if (event.type === 'repair') {
                            return { style: { backgroundColor: '#92400e', borderColor: '#92400e' } };
                        }
                        return {};
                    }}
                    onSelectEvent={(event) => {
                        if (event.type === 'repair') window.location.href = `/repairs`;
                        else window.location.href = `/orders/${event.id}`;
                    }}
                />
            </div>
        </div>
    );
};

export default CalendarView;