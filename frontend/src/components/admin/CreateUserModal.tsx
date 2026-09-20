import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { PointOfSale, UserRole, User } from '../../types';
import userService from '../../services/userService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: User | null; // Si présent -> Mode Modification
}

export const CreateUserModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [pointsOfSale, setPointsOfSale] = useState<PointOfSale[]>([]);
  const [formObj, setFormObj] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(initialData?.id);

  // Charger la liste des rôles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const [loadedRoles, loadedPointsOfSale] = await Promise.all([
          userService.listRoles(),
          userService.listPointsOfSale(),
        ]);
        setRoles(loadedRoles);
        setPointsOfSale(loadedPointsOfSale);
      } catch (err) {
        console.error('Erreur chargement rôles:', err);
      }
    };
    if (isOpen) fetchRoles();
  }, [isOpen]);

  // Initialiser les champs selon création ou modification
  useEffect(() => {
    if (initialData) {
      setFormObj({
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        role_id: initialData.role_id || '',
        pin_code: initialData.pin_code || '',
        pos_ids: initialData.pos_ids || [],
      });
    } else {
      setFormObj({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        pin_code: '',
        role_id: roles.length > 0 ? roles[0].id : '',
        pos_ids: [],
      });
    }
  }, [initialData, roles, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        if (initialData?.id) await userService.update(initialData.id, formObj);
      } else {
        await userService.create(formObj as { role_id: string | number });
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      alert('Opération échouée : ' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-4">
          {isEdit ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}
        </h3>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 font-medium">Prénom</label>
            <input
              type="text"
              required
              value={formObj.first_name || ''}
              onChange={(e) => setFormObj({ ...formObj, first_name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Téléphone</label>
            <input
              type="tel"
              value={formObj.phone || ''}
              onChange={(e) => setFormObj({ ...formObj, phone: e.target.value })}
              placeholder="+221 77 000 00 00"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Nom</label>
            <input
              type="text"
              required
              value={formObj.last_name || ''}
              onChange={(e) => setFormObj({ ...formObj, last_name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Email</label>
            <input
              type="email"
              value={formObj.email || ''}
              onChange={(e) => setFormObj({ ...formObj, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
          </div>

          {/* Champ Mot de Passe (masqué en mode édition) */}
          {!isEdit && (
            <div>
              <label className="text-xs text-slate-400 font-medium">Mot de Passe</label>
              <input
                type="password"
                value={formObj.password || ''}
                onChange={(e) => setFormObj({ ...formObj, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
                placeholder="Au moins 6 caractères"
              />
            </div>
          )}

          {/* Sélection du rôle */}
          <div>
            <label className="text-xs text-slate-400 font-medium">Rôle Utilisateur</label>
            <select
              value={formObj.role_id || ''}
              onChange={(e) => setFormObj({ ...formObj, role_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
              required
            >
              <option value="">-- Sélectionner un rôle --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label || r.name || r.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Code PIN (POS)</label>
            <input
              type="text"
              maxLength={6}
              value={formObj.pin_code || ''}
              onChange={(e) => setFormObj({ ...formObj, pin_code: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Postes de vente autorisés</label>
            <select
              multiple
              value={(formObj.pos_ids || []) as string[]}
              onChange={(e) => setFormObj({
                ...formObj,
                pos_ids: Array.from(e.target.selectedOptions, (option) => option.value),
              })}
              className="w-full min-h-24 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
            >
              {pointsOfSale.map((pointOfSale) => (
                <option key={pointOfSale.id} value={pointOfSale.id}>
                  {pointOfSale.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Sélectionnez un ou plusieurs postes avec Ctrl/Cmd.</p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-sm transition-all"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};