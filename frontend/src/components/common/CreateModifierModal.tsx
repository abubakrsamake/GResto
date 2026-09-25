import React, { useState, useEffect } from 'react';
import { X, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import modifierService, { type ModifierGroup } from '../../services/modifierService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateModifierModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const loadGroups = async () => {
      try {
        const data = await modifierService.getModifierGroups();
        setGroups(data);
        if (data.length > 0) setGroupId(data[0].id);
      } catch (err) {
        console.error('Erreur chargement des groupes :', err);
      }
    };
    loadGroups();
    setName('');
    setPrice(0);
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!groupId) {
      setError('Veuillez sélectionner ou créer un groupe au préalable.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await modifierService.createModifier({ name: name.trim(), price: Number(price) || 0, group_id: groupId });
      toast.success('Création effectuée avec succès !');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la création de l\'option.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <PlusCircle className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Nouvelle Option / Accompagnement</h3>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium">Groupe d'appartenance</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Nom de l'option (ex: Frites, Alloco)</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Prix supplémentaire (FCFA)</label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Créer l\'option'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-sm">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};