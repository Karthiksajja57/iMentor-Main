// frontend/src/components/layout/LLMSelectionModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../../contexts/AppStateContext.jsx';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import {
    Save, KeyRound, AlertCircle, HardDrive,
    Zap, Cloud, Server, Loader2, Circle, CheckCircle2, XCircle
} from 'lucide-react';
import Modal from '../core/Modal.jsx';
import Button from '../core/Button.jsx';

const PROVIDERS = [
    { id: 'gemini',    name: 'Gemini',    Icon: Cloud,  keyPlaceholder: 'Leave blank to use default server key' },
    { id: 'local_llm', name: 'Local LLM', Icon: HardDrive },
    { id: 'groq',      name: 'Groq',      Icon: Zap,   keyPlaceholder: 'gsk_...' },
];

function LLMSelectionModal({ isOpen, onClose }) {
    const { selectedLLM: currentLLM, switchLLM: setGlobalLLMPreference } = useAppState();

    const [provider, setProvider] = useState(currentLLM || 'gemini');
    const [apiKey, setApiKey] = useState('');
    const [keyStatus, setKeyStatus] = useState('idle'); // idle | checking | valid | invalid
    const [keyError, setKeyError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setProvider(currentLLM || 'gemini');
            setApiKey('');
            setKeyStatus('idle');
            setKeyError('');
            setSaveError('');
        }
    }, [isOpen, currentLLM]);

    // Reset key state when provider changes
    useEffect(() => {
        setApiKey('');
        setKeyStatus('idle');
        setKeyError('');
        setSaveError('');
    }, [provider]);

    const providerMeta = PROVIDERS.find(p => p.id === provider);

    // Validate API key via authenticated endpoint (only when user enters a custom key)
    const validateKey = useCallback(async (key) => {
        const trimmed = (key ?? apiKey).trim();
        if (!trimmed || provider === 'local_llm') return;

        setKeyStatus('checking');
        setKeyError('');
        try {
            const result = await api.validateLLMProviderConnection({
                provider,
                apiKey: trimmed,
            });
            if (result.ok) {
                setKeyStatus('valid');
            } else {
                setKeyStatus('invalid');
                setKeyError(result.message || 'Invalid API key.');
            }
        } catch (err) {
            setKeyStatus('invalid');
            setKeyError(err.response?.data?.message || err.message || 'Validation failed.');
        }
    }, [apiKey, provider]);

    const handleSave = async () => {
        setSaving(true);
        setSaveError('');

        // If user explicitly typed a custom key, it must be validated
        if (apiKey.trim() && keyStatus !== 'valid') {
            setSaveError('Please verify your custom API key first (press Tab after typing).');
            setSaving(false);
            return;
        }

        try {
            const configData = { llmProvider: provider };
            if (apiKey.trim()) {
                configData.apiKey = apiKey.trim();
            }
            await api.updateUserLLMConfig(configData);
            setGlobalLLMPreference(provider);
            toast.success(`Active LLM: ${providerMeta?.name}${apiKey.trim() ? ' (Custom key)' : ' (Server key)'}`);
            onClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to save.';
            setSaveError(msg);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // Apply is enabled when:
    // - No custom key entered (uses server key by default)
    // - OR a valid custom key was entered
    const canSave = !apiKey.trim() || keyStatus === 'valid';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <span className="flex items-center gap-2 text-base font-semibold tracking-wide text-white">
                    <Server size={17} className="text-indigo-400" />
                    AI Model & Provider Settings
                </span>
            }
            size="md"
            footerContent={
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 text-sm rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!canSave || saving}
                        className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white transition-all shadow-md ${
                            canSave && !saving
                                ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:opacity-95 shadow-indigo-500/25 active:scale-95'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>Apply</span>
                    </button>
                </div>
            }
        >
            <div className="space-y-4 text-slate-200">

                {/* ── Provider tabs ── */}
                <div className="grid grid-cols-3 gap-2">
                    {PROVIDERS.map(({ id, name, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setProvider(id)}
                            disabled={saving}
                            className={`rounded-xl px-3 py-3 border transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                                provider === id
                                    ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-300 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                            } ${saving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <Icon size={18} className={provider === id ? 'text-indigo-400' : 'text-slate-400'} />
                            <span className="text-xs font-semibold">
                                {name}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── Gemini: Server default (Recommended) ── */}
                {provider === 'gemini' && (
                    <div className="flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/25 p-4 text-sm text-indigo-200">
                        <Cloud size={18} className="mt-0.5 flex-shrink-0 text-indigo-400" />
                        <div>
                            <div className="flex items-center gap-2 font-semibold text-white">
                                <span>Default Server Key Active</span>
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">Ready</span>
                            </div>
                            <p className="text-xs text-indigo-300/80 mt-1 leading-relaxed">
                                iMentor includes Google Gemini access automatically. You do <strong>not</strong> need to provide an API key. Simply click <strong>Apply</strong> to continue.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Local LLM: info ── */}
                {provider === 'local_llm' && (
                    <div className="flex items-start gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 text-sm text-slate-300">
                        <HardDrive size={18} className="mt-0.5 flex-shrink-0 text-slate-400" />
                        <div>
                            <p className="font-semibold text-white">Local Ollama / vLLM Mode</p>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                For developers running a local Ollama or vLLM server on localhost:11434. In cloud deployments, Gemini is recommended.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Optional Custom API Key input ── */}
                {provider !== 'local_llm' && (
                    <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                                Optional Custom {providerMeta?.name} API Key
                            </label>
                            <span className="text-[11px] text-slate-500">Optional</span>
                        </div>
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                                <KeyRound size={14} className="text-indigo-400/80" />
                            </div>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={e => {
                                    setApiKey(e.target.value);
                                    setKeyStatus('idle');
                                    setKeyError('');
                                }}
                                onBlur={() => { if (apiKey.trim()) validateKey(apiKey); }}
                                disabled={saving}
                                placeholder="Leave blank to use default server key"
                                className="w-full h-11 rounded-xl bg-slate-900/90 border border-slate-700/80 pl-10 pr-10 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                            />
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                {keyStatus === 'checking' && <Loader2 size={15} className="animate-spin text-indigo-400" />}
                                {keyStatus === 'valid'    && <CheckCircle2 size={15} className="text-emerald-400" />}
                                {keyStatus === 'invalid'  && <XCircle size={15} className="text-rose-400" />}
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Leave blank to use the built-in server key. Only enter a key if you wish to use your personal quota.
                        </p>
                    </div>
                )}

                {/* ── Key status box (when user types a custom key) ── */}
                {provider !== 'local_llm' && apiKey.trim().length > 0 && (
                    <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Custom Key Verification</div>
                        {keyStatus === 'idle' && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Circle size={10} />Tab out or click away to test custom key
                            </div>
                        )}
                        {keyStatus === 'checking' && (
                            <div className="flex items-center gap-2 text-xs text-indigo-300">
                                <Loader2 size={13} className="animate-spin" />Validating custom key…
                            </div>
                        )}
                        {keyStatus === 'valid' && (
                            <div className="flex items-center gap-2 text-xs text-emerald-300">
                                <CheckCircle2 size={13} />Custom key is verified — ready to save
                            </div>
                        )}
                        {keyStatus === 'invalid' && (
                            <div className="flex items-center gap-2 text-xs text-rose-400">
                                <AlertCircle size={13} />{keyError || 'Invalid API key'}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Save error ── */}
                {saveError && (
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs rounded-xl bg-rose-950/40 border border-rose-500/20 text-rose-300">
                        <AlertCircle size={14} className="flex-shrink-0" />
                        {saveError}
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default LLMSelectionModal;
