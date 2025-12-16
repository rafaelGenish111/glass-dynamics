import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, AlertCircle, User, Edit2, X, Eye, EyeOff, Save } from 'lucide-react';
import { API_URL } from '../config/api';

const AdminPanel = () => {
  const { t } = useTranslation();
  
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: 'installer', language: 'es' });
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false); // לעין בטופס יצירה

  // State לעריכה
  const [editingUser, setEditingUser] = useState(null); // המשתמש שנערך כרגע
  const [editForm, setEditForm] = useState({}); // הנתונים בטופס העריכה
  const [showEditPassword, setShowEditPassword] = useState(false); // לעין בטופס עריכה

  const user = JSON.parse(localStorage.getItem('userInfo'));
  const config = { headers: { Authorization: `Bearer ${user.token}` } };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/users`, config);
      setUsers(res.data);
    } catch (error) { console.error("Error fetching users"); }
  };

  useEffect(() => { fetchUsers(); }, []);

  // יצירת משתמש
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/auth/create-user`, formData, config);
      setMessage({ type: 'success', text: 'User created successfully' });
      setFormData({ name: '', email: '', phone: '', password: '', role: 'installer', language: 'es' });
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error' });
    }
  };

  // פתיחת מודאל עריכה
  const openEditModal = (u) => {
    setEditingUser(u);
    // טוענים את הנתונים הקיימים, אבל סיסמה משאירים ריקה (כי מעדכנים רק אם רוצים)
    setEditForm({ 
      name: u.name, 
      email: u.email, 
      phone: u.phone || '', 
      role: u.role, 
      language: u.language,
      password: '' // ריק כברירת מחדל
    });
  };

  // שמירת עריכה
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/auth/users/${editingUser._id}`, editForm, config);
      alert('User updated successfully!');
      setEditingUser(null); // סגירת מודאל
      fetchUsers(); // רענון
    } catch (error) {
      alert('Error updating user');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
          case 'super_admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
          case 'admin': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
          case 'installer': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
          case 'production': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
          default: return 'bg-slate-700 text-slate-300';
      }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <Shield className="text-blue-500" /> {t('admin_panel')}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- CREATE USER FORM --- */}
        <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl sticky top-4">
                <h3 className="text-xl text-white font-bold mb-6 flex items-center gap-2">
              <User size={20} /> {t('create_user')}
                </h3>

                {message && (
                <div className={`p-3 rounded-lg mb-4 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">{t('name')}</label>
                        <input type="text" required className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm" 
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">{t('email')}</label>
                        <input type="email" required className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm" 
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Phone</label>
                        <input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm" 
                  value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    
                    {/* Password with Eye */}
                    <div className="relative">
                        <label className="text-xs text-slate-400 block mb-1">{t('password')}</label>
                        <input type={showPassword ? "text" : "password"} required className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm pr-10" 
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[26px] text-slate-500 hover:text-white">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">{t('role')}</label>
                            <select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm"
                    value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                <option value="installer">Installer</option>
                                <option value="production">Production</option>
                                <option value="office">Office</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Lang</label>
                            <select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm"
                    value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })}>
                                <option value="es">ES</option>
                                <option value="en">EN</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl mt-2 transition shadow-lg">
                        {t('create_user')}
                    </button>
                </form>
            </div>
        </div>

        {/* --- USERS LIST --- */}
        <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
                <div className="p-5 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">מצבת כוח אדם ({users.length})</h3>
                </div>
                
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/30 text-slate-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Email / Phone</th>
                            <th className="p-4">Role</th>
                            <th className="p-4 w-10">Edit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                        {users.map(u => (
                            <tr key={u._id} className="hover:bg-slate-800/30 transition">
                                <td className="p-4 font-bold text-white flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    {u.name}
                                </td>
                                <td className="p-4">
                                    <div className="font-mono text-xs text-slate-200">{u.email}</div>
                                    <div className="text-[10px] text-slate-500">{u.phone || '-'}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getRoleBadge(u.role)}`}>
                                        {u.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => openEditModal(u)} className="bg-slate-800 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition border border-slate-700">
                        <Edit2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>

      {/* --- EDIT USER MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                    <h3 className="text-xl font-bold text-white">Edit User: {editingUser.name}</h3>
                    <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white"><X /></button>
                </div>

                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Name</label>
                            <input type="text" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white" 
                    value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Phone</label>
                            <input type="text" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white" 
                    value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Email (Login)</label>
                        <input type="email" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white" 
                  value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>

                    {/* Password Reset Section */}
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-700/50">
                        <label className="text-xs text-orange-400 block mb-1 font-bold">Reset Password (Optional)</label>
                        <div className="relative">
                            <input type={showEditPassword ? "text" : "password"} 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white pr-10 placeholder-slate-600" 
                                placeholder="Leave empty to keep current password"
                    value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                            <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-[10px] text-slate-500 hover:text-white">
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Role</label>
                            <select className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white"
                    value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                                <option value="installer">Installer</option>
                                <option value="production">Production</option>
                                <option value="office">Office</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Language</label>
                            <select className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white"
                    value={editForm.language} onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}>
                                <option value="es">ES</option>
                                <option value="en">EN</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                  <Save size={18} /> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;