import { useEffect, useState } from 'react';
import { Check, Printer, RotateCcw, Save, Store } from 'lucide-react';

export interface RestaurantSettings {
    restaurantName: string;
    address: string;
    phone: string;
    currency: string;
    defaultPosId: string;
    printerMode: 'desktop' | 'browser';
    autoPrint: boolean;
}

const defaultSettings: RestaurantSettings = {
    restaurantName: 'GRestaurant',
    address: '',
    phone: '',
    currency: 'FCFA',
    defaultPosId: '',
    printerMode: 'desktop',
    autoPrint: true,
};

const settingsKey = 'grestaurant.settings';

export function getRestaurantSettings(): RestaurantSettings {
    try {
        const saved = localStorage.getItem(settingsKey);
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
        return defaultSettings;
    }
}

interface SettingViewProps {
    mode?: 'admin' | 'pos';
}

export default function SettingView({ mode = 'admin' }: SettingViewProps) {
    const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setSettings(getRestaurantSettings());
    }, []);

    const update = <K extends keyof RestaurantSettings>(key: K, value: RestaurantSettings[K]) => {
        setSettings((current) => ({ ...current, [key]: value }));
        setSaved(false);
    };

    const saveSettings = (event: React.FormEvent) => {
        event.preventDefault();
        const normalized = { ...settings };
        localStorage.setItem(settingsKey, JSON.stringify(normalized));
        setSettings(normalized);
        setSaved(true);
        window.dispatchEvent(new Event('grestaurant-settings-updated'));
    };

    const resetSettings = () => {
        localStorage.removeItem(settingsKey);
        setSettings(defaultSettings);
        setSaved(false);
    };

    return (
        <div className="h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 text-slate-100">
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Configuration</p>
                    <h2 className="mt-1 text-2xl font-black text-white">{mode === 'pos' ? 'Paramètres du terminal POS' : 'Paramètres du restaurant'}</h2>
                    <p className="mt-1 text-sm text-slate-400">Ces réglages sont conservés sur ce terminal et utilisés pour la caisse.</p>
                </div>

                <form onSubmit={saveSettings} className="space-y-6">
                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
                        <div className="mb-5 flex items-center gap-3">
                            <Store className="h-5 w-5 text-indigo-400" />
                            <div>
                                <h3 className="font-bold text-white">Identité du restaurant</h3>
                                <p className="text-xs text-slate-500">Informations affichées sur les tickets.</p>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-sm text-slate-300 sm:col-span-2">Nom du restaurant
                                <input required value={settings.restaurantName} onChange={(e) => update('restaurantName', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-indigo-500" />
                            </label>
                            <label className="text-sm text-slate-300">Adresse
                                <input value={settings.address} onChange={(e) => update('address', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-indigo-500" />
                            </label>
                            <label className="text-sm text-slate-300">Téléphone
                                <input value={settings.phone} onChange={(e) => update('phone', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-indigo-500" />
                            </label>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
                        <div className="mb-5 flex items-center gap-3">
                            <span className="text-xl font-black text-emerald-400">%</span>
                            <div><h3 className="font-bold text-white">Ventes et affichage</h3><p className="text-xs text-slate-500">Valeurs utilisées dans les montants de la caisse.</p></div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <p className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-400 sm:col-span-2">
                                La TVA se règle sur chaque produit. Le prix saisi pour un produit ou une variante est TTC.
                            </p>
                            <label className="text-sm text-slate-300">Devise
                                <select value={settings.currency} onChange={(e) => update('currency', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-indigo-500">
                                    <option>FCFA</option><option>EUR</option><option>USD</option>
                                </select>
                            </label>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
                        <div className="mb-5 flex items-center gap-3"><Printer className="h-5 w-5 text-amber-400" /><div><h3 className="font-bold text-white">Impression</h3><p className="text-xs text-slate-500">Le système desktop reste le mode recommandé.</p></div></div>
                        <div className="space-y-4">
                            <label className="text-sm text-slate-300">Mode d’impression
                                <select value={settings.printerMode} onChange={(e) => update('printerMode', e.target.value as RestaurantSettings['printerMode'])} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-indigo-500">
                                    <option value="desktop">Imprimante desktop ESC/POS</option><option value="browser">Impression navigateur</option>
                                </select>
                            </label>
                            <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={settings.autoPrint} onChange={(e) => update('autoPrint', e.target.checked)} className="h-4 w-4 accent-indigo-500" /> Imprimer automatiquement après validation du paiement</label>
                        </div>
                    </section>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                        <button type="button" onClick={resetSettings} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800"><RotateCcw className="h-4 w-4" /> Réinitialiser</button>
                        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"><Save className="h-4 w-4" /> {saved ? 'Paramètres enregistrés' : 'Enregistrer'}</button>
                    </div>
                    {saved && <p className="flex items-center justify-end gap-2 text-sm text-emerald-400"><Check className="h-4 w-4" /> Configuration sauvegardée sur ce terminal.</p>}
                </form>
            </div>
        </div>
    );
}