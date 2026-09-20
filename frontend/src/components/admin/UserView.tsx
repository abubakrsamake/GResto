import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Edit3, Trash2, Phone } from 'lucide-react';
import LoginView from '../LoginView';
import { CreateUserModal } from './CreateUserModal';
import type { User } from '../../types';
import userService from '../../services/userService';

export default function UserView() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const token = localStorage.getItem('token');

  // Chargement des utilisateurs
  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setUsers(await userService.list());
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
    const interval = window.setInterval(loadUsers, 30_000);
    return () => window.clearInterval(interval);
  }, [loadUsers]);

  if (!token) return <LoginView onLoginSuccess={() => window.location.reload()} />;

  // Recherche d'un utilisateur
  const filteredUsers = users.filter((u) =>
    `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Actions
  const handleOpenCreate = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      await userService.remove(id);
      loadUsers();
    } catch (e: any) {
      alert('Suppression échouée : ' + (e.response?.data?.detail || e.message));
    }
  };

  return (
    <div className="p-6 bg-slate-950 min-h-full text-slate-100">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-amber-400" />
          <h2 className="text-xl font-black text-white">Gestion des Utilisateurs</h2>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
        >
          + Créer utilisateur
        </button>
      </div>

      {/* Barre de Recherche et Rafraîchissement */}
      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white flex-1 focus:outline-none focus:border-amber-400/50"
          placeholder="Rechercher par nom, prénom ou email..."
        />
        <button
          onClick={loadUsers}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="bg-slate-950 text-xs uppercase text-amber-400 font-bold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Nom & Prénom</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Présence</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-950/60 text-purple-300 border border-purple-800/50">
                      {typeof u.role === 'string'
                        ? u.role
                        : u.role?.label || u.role?.name || u.role?.code || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.email || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{u.phone || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${u.is_online ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span className={`h-2 w-2 rounded-full ${u.is_online ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      {u.is_online ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg bg-indigo-950/50 text-indigo-400 hover:bg-indigo-900/50 transition-colors"
                        title="Modifier"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded-lg bg-rose-950/50 text-rose-400 hover:bg-rose-900/50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Composant Modal de création/édition */}
      <CreateUserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={loadUsers}
        initialData={selectedUser}
      />
    </div>
  );
}