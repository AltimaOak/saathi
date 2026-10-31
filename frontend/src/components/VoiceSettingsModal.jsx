import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUPPORTED_LANGUAGES, SPEED_PRESETS, voiceService } from '../services/voiceService';
import { updateVoiceSettings } from '../api/client';

export default function VoiceSettingsModal({
  isOpen,
  onClose,
  merchantId = 1,
  currentSettings = {},
  onSaveSettings,
}) {
  const [selectedLang, setSelectedLang] = useState(currentSettings.preferredLanguage || 'en');
  const [autoVoice, setAutoVoice] = useState(currentSettings.voiceResponseEnabled ?? true);
  const [speedRate, setSpeedRate] = useState(currentSettings.speechRate || 1.0);
  const [selectedVoice, setSelectedVoice] = useState(currentSettings.preferredVoiceIdentifier || '');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Sync with available voices for selected language
  useEffect(() => {
    const voices = voiceService.getVoicesForLanguage(selectedLang);
    setAvailableVoices(voices);
    if (voices.length > 0 && !voices.some((v) => v.voiceURI === selectedVoice)) {
      setSelectedVoice(voices[0].voiceURI);
    }
  }, [selectedLang]);

  // Sync internal state if prop updates
  useEffect(() => {
    if (currentSettings.preferredLanguage) setSelectedLang(currentSettings.preferredLanguage);
    if (currentSettings.voiceResponseEnabled !== undefined) setAutoVoice(currentSettings.voiceResponseEnabled);
    if (currentSettings.speechRate) setSpeedRate(currentSettings.speechRate);
    if (currentSettings.preferredVoiceIdentifier) setSelectedVoice(currentSettings.preferredVoiceIdentifier);
  }, [currentSettings, isOpen]);

  // Stop test voice on unmount or close
  useEffect(() => {
    if (!isOpen) {
      voiceService.stop();
      setIsTestingVoice(false);
    }
  }, [isOpen]);

  const handleTestVoice = () => {
    if (isTestingVoice) {
      voiceService.stop();
      setIsTestingVoice(false);
      return;
    }

    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];
    setIsTestingVoice(true);

    voiceService.speak({
      text: langConfig.testPhrase,
      lang: selectedLang,
      rate: speedRate,
      voiceURI: selectedVoice,
      onStart: () => setIsTestingVoice(true),
      onEnd: () => setIsTestingVoice(false),
      onError: () => setIsTestingVoice(false),
    });
  };

  const handleResetDefaults = () => {
    setSelectedLang('en');
    setAutoVoice(true);
    setSpeedRate(1.0);
    const defaultVoices = voiceService.getVoicesForLanguage('en');
    setSelectedVoice(defaultVoices[0]?.voiceURI || '');
  };

  const handleSave = async () => {
    setSaveStatus('Saving...');
    const payload = {
      preferred_language: selectedLang,
      voice_response_enabled: autoVoice,
      speech_rate: speedRate,
      preferred_voice_identifier: selectedVoice,
    };

    try {
      if (merchantId) {
        await updateVoiceSettings(merchantId, payload);
      }
      if (onSaveSettings) {
        onSaveSettings({
          preferredLanguage: selectedLang,
          voiceResponseEnabled: autoVoice,
          speechRate: speedRate,
          preferredVoiceIdentifier: selectedVoice,
        });
      }
      setSaveStatus('Saved successfully!');
      setTimeout(() => {
        setSaveStatus('');
        onClose();
      }, 600);
    } catch (err) {
      console.warn('Backend settings persist notice:', err);
      // Fallback local persistence
      if (onSaveSettings) {
        onSaveSettings({
          preferredLanguage: selectedLang,
          voiceResponseEnabled: autoVoice,
          speechRate: speedRate,
          preferredVoiceIdentifier: selectedVoice,
        });
      }
      setSaveStatus('Preferences saved locally!');
      setTimeout(() => {
        setSaveStatus('');
        onClose();
      }, 700);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            voiceService.stop();
            onClose();
          }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl"
          role="dialog"
          aria-labelledby="voice-settings-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#0b1b3f] to-[#163a7a] px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffcf40] text-xl font-bold text-[#0b1b3f] shadow-md">
                🎙️
              </span>
              <div>
                <h2 id="voice-settings-title" className="text-lg font-bold">
                  Voice & Language Settings
                </h2>
                <p className="text-xs text-blue-200">Personalize Saathi's speech and dialect</p>
              </div>
            </div>
            <button
              onClick={() => {
                voiceService.stop();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Form Content */}
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-6 py-6">
            {/* Preferred Language */}
            <div>
              <label htmlFor="pref-lang" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Preferred Language
              </label>
              <div className="relative">
                <select
                  id="pref-lang"
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition focus:border-[#00baf2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00baf2]/20"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label} ({lang.native})
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Saathi will reason, respond, and speak to you natively in this language.
              </p>
            </div>

            {/* Auto Voice Responses Toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Automatic Voice Responses</p>
                <p className="text-xs text-slate-500">Automatically read aloud answers as soon as Saathi replies</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoVoice}
                onClick={() => setAutoVoice(!autoVoice)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#00baf2] ${
                  autoVoice ? 'bg-[#00baf2]' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    autoVoice ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Voice Selection */}
            <div>
              <label htmlFor="voice-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Available Voice ({availableVoices.length} detected)
              </label>
              <select
                id="voice-select"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition focus:border-[#00baf2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00baf2]/20"
              >
                {availableVoices.length === 0 ? (
                  <option value="">Default System Natural Voice</option>
                ) : (
                  availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}) {v.default ? '★ Default' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Speech Speed Presets & Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="speed-slider" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Speech Speed
                </label>
                <span className="rounded-full bg-[#00baf2]/10 px-2.5 py-0.5 text-xs font-extrabold text-[#0089b3]">
                  {speedRate.toFixed(2)}x
                </span>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-6 gap-1.5 mb-3">
                {SPEED_PRESETS.map((p) => {
                  const active = Math.abs(speedRate - p.value) < 0.02;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setSpeedRate(p.value)}
                      className={`rounded-xl py-1.5 text-xs font-bold transition ${
                        active
                          ? 'bg-[#0b1b3f] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Slider */}
              <input
                id="speed-slider"
                type="range"
                min="0.75"
                max="1.50"
                step="0.05"
                value={speedRate}
                onChange={(e) => setSpeedRate(parseFloat(e.target.value))}
                className="w-full accent-[#00baf2] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>0.75x (Very slow)</span>
                <span>1.00x (Normal)</span>
                <span>1.50x (Fast)</span>
              </div>
            </div>

            {/* Test Voice Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestVoice}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold shadow-sm transition ${
                  isTestingVoice
                    ? 'border-rose-300 bg-rose-50 text-rose-700 animate-pulse'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{isTestingVoice ? '⏹ Stop Testing' : '🔊 Test Voice Playback'}</span>
              </button>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Reset to Defaults
            </button>
            <div className="flex items-center gap-3">
              {saveStatus && <span className="text-xs font-bold text-emerald-600">{saveStatus}</span>}
              <button
                type="button"
                onClick={handleSave}
                className="rounded-2xl bg-gradient-to-r from-[#00baf2] to-[#0089b3] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#00baf2]/20 hover:shadow-lg transition active:scale-95"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

