import { useState, useEffect } from 'react';
import { Receipt, Check, Clock, Plus, X, Banknote, RefreshCw } from 'lucide-react';
import sessionService, { type RegisterSession } from '../services/sessionService';

export default function SessionsView() {
  const [registers, setRegisters] = useState<{ id: string; name: string }[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('');
  const [sessions, setSessions] = useState<RegisterSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  // Chargement des caisses et des sessions ouvertes
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessionsData, registersData] = await Promise.all([
        sessionService.listOpen(),
        sessionService.getRegisters(),
      ]);
      setSessions(sessionsData);
      setRegisters(registersData);

      // Sélectionne la première caisse par défaut si aucune n'est sélectionnée
      if (registersData.length > 0 && !selectedRegisterId) {
        setSelectedRegisterId(registersData[0].id);
      }
    } catch (e) {
      console.error('Erreur de chargement des données', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenSession = async () => {
    if (!selectedRegisterId) {
      alert('Veuillez sélectionner une caisse valide.');
      return;
    }

    try {
      await sessionService.open({
        register_id: selectedRegisterId,
        opening_amount: parseFloat(openingAmount) || 0,
      });
      setOpeningAmount('');
      fetchData();
    } catch (e: any) {
      alert('Erreur ouverture session : ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleCloseSession = async () => {
    if (!selectedSession) return;

    setIsClosing(true);
    try {
      await sessionService.close({
        session_id: selectedSession,
        actual_amount: parseFloat(actualAmount) || 0,
        notes: notes.trim() ? notes : null,
      });
      setCloseModalOpen(false);
      setActualAmount('');
      setNotes('');
      setSelectedSession(null);
      fetchData();
    } catch (e: any) {
      alert('Erreur clôture session : ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="h-full w-full bg-slate-950 text-slate-100 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Gestion des Sessions & Clôtures</h1>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition"
            title="Actualiser"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Formulaire d'ouverture de session */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400" /> Ouvrir une session
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Caisse</label>
              <select
                value={selectedRegisterId}
                onChange={(e) => setSelectedRegisterId(e.target.value)}
                className="w-full bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 text-sm"
              >
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name || `Caisse ${r.id.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fonds de caisse (FCFA)</label>
              <input
                type="number"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="25000"
                className="w-full bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <button
              onClick={handleOpenSession}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition text-sm"
            >
              Ouvrir la session
            </button>
          </div>
        </div>

        {/* Liste des sessions ouvertes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" /> Sessions ouvertes
          </h3>
          {loading ? (
            <p className="text-slate-500 text-sm py-4 text-center">Chargement des sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">Aucune session ouverte pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-indigo-500/40 transition"
                >
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Session ID · {s.id.slice(0, 8)}...</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Ouverture : {s.created_at ? new Date(s.created_at).toLocaleString('fr-FR') : 'Non renseignée'}
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold mt-1">
                      Fonds initial : {s.opening_amount ? s.opening_amount.toLocaleString() : '0'} FCFA
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                      {s.status}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedSession(s.id);
                        setCloseModalOpen(true);
                      }}
                      disabled={s.status !== 'OPEN'}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition"
                      title="Clôturer la session"
                    >
                      <Banknote className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Clôture */}
        {closeModalOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isClosing && setCloseModalOpen(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-indigo-900/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Banknote className="h-6 w-6 text-emerald-400" /> Clôture de session
                </h2>
                <button
                  onClick={() => setCloseModalOpen(false)}
                  disabled={isClosing}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Montant réel compté en caisse (FCFA)</label>
                  <input
                    type="number"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    placeholder="Ex: 45200"
                    className="w-full bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Notes / Remarques</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ecart constaté, remarques..."
                    rows={2}
                    className="w-full bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 text-sm resize-none"
                  />
                </div>
                <button
                  onClick={handleCloseSession}
                  disabled={isClosing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  {isClosing ? 'Clôture en cours...' : 'Clôturer la session (Z de caisse)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}