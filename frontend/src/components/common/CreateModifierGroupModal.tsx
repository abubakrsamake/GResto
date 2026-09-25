import React, { useState, useEffect, type SubmitEvent } from 'react';
import { X, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import modifierService from '../../services/modifierService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateModifierGroupModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [minSelection, setMinSelection] = useState(0);
  const [maxSelection, setMaxSelection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setIsRequired(false);
    setMinSelection(0);
    setMaxSelection(1);
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const computedMin = isRequired && minSelection === 0 ? 1 : Number(minSelection);
    const computedMax = Math.max(computedMin, Number(maxSelection) || 1);

    try {
      // Assure le respect des contraintes Pydantic (min_selection <= max_selection)
      await modifierService.createModifierGroup({
        name: name.trim(),
        is_required: isRequired,
        min_selection: computedMin,
        max_selection: computedMax,
      });
      toast.success('Création effectuée avec succès !');
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Validation échouée (422)');
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
          <Layers className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Nouveau Groupe d'Options</h3>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium">Nom du groupe</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRequired"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-0"
            />
            <label htmlFor="isRequired" className="text-xs text-slate-300 font-medium cursor-pointer">
              Choix obligatoire ?
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium">Sélection min</label>
              <input
                type="number"
                min="0"
                value={minSelection}
                onChange={(e) => setMinSelection(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium">Sélection max</label>
              <input
                type="number"
                min="1"
                value={maxSelection}
                onChange={(e) => setMaxSelection(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Créer le groupe'}
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