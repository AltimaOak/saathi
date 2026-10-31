/**
 * Saathi Voice Service
 * Comprehensive SpeechSynthesis and Web Speech API manager.
 * Supports 11 Indian languages, dynamic voice discovery, speed adjustment (0.75x-1.50x),
 * and audio playback lifecycle controls.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', bcp47: ['en-IN', 'en-GB', 'en-US'], testPhrase: 'Hello! I am Saathi, your Paytm voice assistant. All your merchant services are active.' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', bcp47: ['hi-IN', 'hi'], testPhrase: 'नमस्ते! मैं साथी हूँ, आपका पेटीएम वॉइस असिस्टेंट। आपके सभी भुगतान और साउंडबॉक्स अलर्ट ठीक चल रहे हैं।' },
  { code: 'hinglish', label: 'Hinglish', native: 'Hinglish', bcp47: ['hi-IN', 'en-IN'], testPhrase: 'Namaste! Main Saathi hoon, aapka Paytm voice assistant. Aapke saare payments bilkul theek chal rahe hain.' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', bcp47: ['mr-IN', 'mr', 'hi-IN'], testPhrase: 'नमस्कार! मी साथी आहे, आपला पेटीएम व्हॉइस असिस्टंट. आपले सर्व व्यवहार सुरळीत सुरू आहेत.' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', bcp47: ['ta-IN', 'ta'], testPhrase: 'வணக்கம்! நான் சாத்தி, உங்கள் பேடிஎம் வாய்ஸ் அசிஸ்டண்ட். உங்கள் வணிக சேவைகள் அனைத்தும் சரியாக உள்ளன.' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', bcp47: ['te-IN', 'te'], testPhrase: 'నమస్కారం! నేను సాథిని, మీ పేటీఎం వాయిస్ అసిస్టెంట్. మీ వ్యాపార లావాదేవీలు సజావుగా సాగుతున్నాయి.' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', bcp47: ['bn-IN', 'bn-BD', 'bn'], testPhrase: 'নমস্কার! আমি সাথী, আপনার পেটিএম ভয়েস সহকারী। আপনার সমস্ত পরিষেবা স্বাভাবিকভাবে চলছে।' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', bcp47: ['gu-IN', 'gu'], testPhrase: 'નમસ્તે! હું સાથી છું, આપનો પેટીએમ વૉઇસ આસિસ્ટન્ટ. આપના બધા વ્યવહારો બરાબર ચાલી રહ્યા છે.' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', bcp47: ['kn-IN', 'kn'], testPhrase: 'ನಮಸ್ಕಾರ! ನಾನು ಸಾಥಿ, ನಿಮ್ಮ ಪೇಟಿಎಂ ವಾಯ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್. ನಿಮ್ಮ ಎಲ್ಲಾ ವಹಿವಾಟುಗಳು ಸುಸೂತ್ರವಾಗಿ ನಡೆಯುತ್ತಿವೆ.' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', bcp47: ['ml-IN', 'ml'], testPhrase: 'നമസ്കാരം! ഞാൻ സാഥി, നിങ്ങളുടെ പേടിഎം വോയ്‌സ് അസിസ്റ്റന്റ്. നിങ്ങളുടെ സേവനങ്ങൾ സാധാരണ നിലയിൽ പ്രവർത്തിക്കുന്നു.' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', bcp47: ['pa-IN', 'pa'], testPhrase: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਾਥੀ ਹਾਂ, ਤੁਹਾਡਾ ਪੇਟੀਐਮ ਵੌਇਸ ਅਸਿਸਟੈਂਟ। ਤੁਹਾਡੇ ਸਾਰੇ ਭੁਗਤਾਨ ਬਿਲਕੁਲ ਠੀਕ ਚੱਲ ਰਹੇ ਹਨ।' },
];

export const SPEED_PRESETS = [
  { value: 0.75, label: '0.75x', desc: 'Very slow' },
  { value: 0.90, label: '0.90x', desc: 'Slow' },
  { value: 1.00, label: '1.00x', desc: 'Normal' },
  { value: 1.15, label: '1.15x', desc: 'Slightly fast' },
  { value: 1.25, label: '1.25x', desc: 'Fast' },
  { value: 1.50, label: '1.50x', desc: 'Very fast' },
];

class VoiceService {
  constructor() {
    this.voices = [];
    this.currentUtterance = null;
    this.speakingState = 'idle'; // 'idle' | 'speaking' | 'paused'
    this.listeners = new Set();
    this.initialized = false;
    this._initVoices();
  }

  _initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      this.voices = window.speechSynthesis.getVoices() || [];
      this.initialized = true;
      this._notifyStateChange();
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  getVoices() {
    if (this.voices.length === 0 && typeof window !== 'undefined' && window.speechSynthesis) {
      this.voices = window.speechSynthesis.getVoices() || [];
    }
    return this.voices;
  }

  getVoicesForLanguage(langCode) {
    const allVoices = this.getVoices();
    const config = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    if (!config) return allVoices;

    const bcpCodes = config.bcp47.map((c) => c.toLowerCase());
    const matched = allVoices.filter((v) => {
      const vLang = (v.lang || '').toLowerCase();
      return bcpCodes.some((code) => vLang === code || vLang.startsWith(code));
    });

    if (matched.length > 0) return matched;

    // Secondary fallback: check if name mentions the language
    const nameMatch = allVoices.filter((v) => {
      const vName = (v.name || '').toLowerCase();
      return vName.includes(config.label.toLowerCase()) || vName.includes(config.code);
    });
    if (nameMatch.length > 0) return nameMatch;

    // Default fallback: English or first available voice
    return allVoices.filter((v) => (v.lang || '').toLowerCase().startsWith('en')) || allVoices.slice(0, 3);
  }

  findBestVoice(langCode, preferredVoiceURI = '') {
    const candidateVoices = this.getVoicesForLanguage(langCode);
    if (candidateVoices.length === 0) return null;

    if (preferredVoiceURI) {
      const exact = candidateVoices.find((v) => v.voiceURI === preferredVoiceURI || v.name === preferredVoiceURI);
      if (exact) return exact;
    }

    // Prefer Indian English / Hindi / local voices over generic US/GB
    const inVoice = candidateVoices.find((v) => (v.lang || '').toLowerCase().includes('in'));
    if (inVoice) return inVoice;

    return candidateVoices[0];
  }

  cleanTextForSpeech(rawText) {
    if (!rawText) return '';
    return rawText
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove markdown bold
      .replace(/\*(.*?)\*/g, '$1') // remove italic
      .replace(/`([^`]+)`/g, '$1') // remove code formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove markdown links
      .replace(/₹/g, 'Rupees ') // clarify currency symbol
      .replace(/•/g, '') // remove bullets
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // remove emojis
      .replace(/\s+/g, ' ')
      .trim();
  }

  speak({
    text,
    lang = 'en',
    rate = 1.0,
    voiceURI = '',
    onStart,
    onEnd,
    onError,
    onPause,
    onResume,
  }) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onError) onError(new Error('SpeechSynthesis not supported on this browser'));
      return;
    }

    // Stop ongoing speech
    this.stop();

    const clean = this.cleanTextForSpeech(text);
    if (!clean) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    const chosenVoice = this.findBestVoice(lang, voiceURI);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    } else {
      const cfg = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
      utterance.lang = cfg?.bcp47?.[0] || 'en-IN';
    }

    // Clamp speed rate strictly between 0.75 and 1.50
    const clampedRate = Math.max(0.75, Math.min(1.50, Number(rate) || 1.0));
    utterance.rate = clampedRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.speakingState = 'speaking';
      this._notifyStateChange();
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.speakingState = 'idle';
      this.currentUtterance = null;
      this._notifyStateChange();
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      // Interrupted errors happen normally when stopping/switching
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', e.error || e);
      }
      this.speakingState = 'idle';
      this.currentUtterance = null;
      this._notifyStateChange();
      if (onError) onError(e);
    };

    utterance.onpause = () => {
      this.speakingState = 'paused';
      this._notifyStateChange();
      if (onPause) onPause();
    };

    utterance.onresume = () => {
      this.speakingState = 'speaking';
      this._notifyStateChange();
      if (onResume) onResume();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  pause() {
    if (typeof window !== 'undefined' && window.speechSynthesis && this.speakingState === 'speaking') {
      window.speechSynthesis.pause();
      this.speakingState = 'paused';
      this._notifyStateChange();
    }
  }

  resume() {
    if (typeof window !== 'undefined' && window.speechSynthesis && this.speakingState === 'paused') {
      window.speechSynthesis.resume();
      this.speakingState = 'speaking';
      this._notifyStateChange();
    }
  }

  stop() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.speakingState = 'idle';
      this.currentUtterance = null;
      this._notifyStateChange();
    }
  }

  getState() {
    return {
      state: this.speakingState,
      isSpeaking: this.speakingState === 'speaking',
      isPaused: this.speakingState === 'paused',
      isIdle: this.speakingState === 'idle',
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  _notifyStateChange() {
    const current = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    });
  }
}

export const voiceService = new VoiceService();

