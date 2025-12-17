import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, CheckCircle, Clock, Phone, MapPin,
  Mail, User, Package, Calendar
} from 'lucide-react';
import { API_URL } from '../config/api';

const CustomerProfile = () => {
  const { name } = useParams(); // Client name from URL
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('userInfo'));

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user || !user.token) {
        console.error('User not authenticated');
        setLoading(false);
        navigate('/login');
        return;
      }

      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get(`${API_URL}/orders/customers/${encodeURIComponent(name)}/history`, config);
        setHistory(res.data || []);
        setLoading(false);
      } catch (error) {
        console.error(error);
        if (error.response?.status === 401) {
          localStorage.removeItem('userInfo');
          navigate('/login');
        }
        setLoading(false);
      }
    };
    fetchHistory();
  }, [name, navigate, user]);

  if (loading) return <div className="text-white p-8 text-center">Loading Profile...</div>;

  // Get details from the latest order
  const clientDetails = history.length > 0 ? history[0] : {};

  const getStatusColor = (status) => {
    switch (status) {
      case 'offer': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      case 'production': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'install': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'completed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      default: return 'text-white';
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">

      {/* Back Button */}
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition">
        <ArrowLeft size={20} /> Back to Customers
      </button>

      {/* --- HEADER: Client Details --- */}
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="bg-slate-700 p-4 rounded-2xl border border-slate-600 shadow-inner">
            <User size={48} className="text-purple-400" />
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-4">{decodeURIComponent(name)}</h1>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Phone */}
              <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Phone size={18} /></div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <a href={`tel:${clientDetails.clientPhone}`} className="text-slate-200 hover:text-white font-medium">
                    {clientDetails.clientPhone || 'N/A'}
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><Mail size={18} /></div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <a href={`mailto:${clientDetails.clientEmail}`} className="text-slate-200 hover:text-white font-medium truncate max-w-[150px] block">
                    {clientDetails.clientEmail || '-'}
                  </a>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400"><MapPin size={18} /></div>
                <div>
                  <p className="text-xs text-slate-500">Address</p>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientDetails.clientAddress || '')}`} target="_blank" rel="noreferrer" className="text-slate-200 hover:text-white font-medium truncate max-w-[180px] block">
                    {clientDetails.clientAddress || 'N/A'}
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Stats Side */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center min-w-[120px]">
            <div className="text-3xl font-bold text-white">{history.length}</div>
            <div className="text-xs text-slate-400">Total Orders</div>
          </div>
        </div>
      </div>

      {/* --- Order History List --- */}
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Package className="text-blue-500" /> Order History
      </h3>

      <div className="space-y-4">
        {(history || []).map(order => {
          const itemCount = Array.isArray(order.products)
            ? order.products.length
            : Array.isArray(order.items)
              ? order.items.length
              : Array.isArray(order.materials)
                ? order.materials.length
                : 0;

          const workflowLabel = order.workflow ? `Route ${order.workflow}` : '';

          return (
            <div
              key={order._id}
              onClick={() => navigate(`/orders/${order._id}`)}
              className="group bg-slate-800 border border-slate-700 p-5 rounded-xl flex flex-col md:flex-row justify-between items-center cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/80 transition shadow-lg hover:shadow-blue-900/10"
            >
              <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-slate-400 font-mono text-sm">
                  #{order.orderNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
                    <Calendar size={14} /> {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-slate-500 text-xs">
                    {itemCount} items{workflowLabel ? ` • ${workflowLabel}` : ''}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`px-4 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 ${getStatusColor(order.status)}`}>
                {order.status === 'completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                {order.status.toUpperCase()}
              </div>

              {/* Arrow Icon */}
              <div className="hidden md:block text-slate-600 group-hover:text-blue-400 transition transform group-hover:translate-x-1">
                <ArrowLeft size={20} className="rotate-180" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerProfile;