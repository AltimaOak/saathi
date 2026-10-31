import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Sticker from '../components/Sticker';
import VoiceSettingsModal from '../components/VoiceSettingsModal';
import VoicePlaybackBar from '../components/VoicePlaybackBar';
import FraudModal from '../components/FraudModal';
import { SUPPORTED_LANGUAGES, voiceService } from '../services/voiceService';
import {
  getGreetingMessage,
  executeChatScenario,
  playPaytmChime,
  getNowTime,
  getNowTimeAmPm,
} from '../api/mock';

/* ---------- constants ---------- */

const QUICK_CHIPS = [
  'Verify payment screenshot',
  'My settlement is late',
  'My refund is stuck',
  'I want a loan for my shop',
  'Mera paisa nahi aaya',
  'Soundbox se awaz nahi aa rahi',
  'Need urgent human manager',
];

const QUICK_ACTIONS = [
  ['Verify payment screenshot', 'Verify payment screenshot for UTR 430198271049'],
  ['Soundbox diagnostic', 'Soundbox light red ho gayi hai aur voice nahi aa rahi'],
  ['Check settlement', 'My settlement is late'],
  ['Dispute a UPI payment', 'Customer paid ₹1,450 but settlement stuck'],
  ['Check loan limit', 'I want a loan for my shop'],
];

const PLACEHOLDERS = {
  en: 'Ask about settlements, refunds, Soundbox, verify payments or loans',
  hi: 'भुगतान सत्यापन, सेटलमेंट या साउंडबॉक्स के बारे में पूछें',
  hinglish: 'Payment verify karna ho ya settlement, poochhein',
  mr: 'पेमेंट व्हेरिफिकेशन, सेटलमेंट किंवा साउंडबॉक्सबद्दल विचारा',
};

const CHIP_ICONS = {
  'Verify payment screenshot': '🛡️',
  'My settlement is late': '⏱️',
  'My refund is stuck': '↩️',
  'I want a loan for my shop': '🏪',
  'Mera paisa nahi aaya': '💸',
  'Soundbox se awaz nahi aa rahi': '🔊',
  'Need urgent human manager': '🧑‍💼',
};

const TILES = [
  ['🛡️', 'Verify Payment', 'Check receipt / UTR', 'Verify payment screenshot for UTR 430198271049', 'from-emerald-50 to-white'],
  ['💰', 'Settlements', 'Track late payouts', 'My settlement is late', 'from-sky-50 to-white'],
  ['↩️', 'Refunds', 'Find a stuck refund', 'My refund is stuck', 'from-violet-50 to-white'],
  ['🏪', 'Shop loan', 'Check your offer', 'I want a loan for my shop', 'from-amber-50 to-white'],
  ['🔊', 'Soundbox', 'Fix voice alerts', 'Soundbox se awaz nahi aa rahi', 'from-emerald-50 to-white'],
];

const CARD_ICONS = {
  settlement: '🏦',
  soundbox_payout: '🔊',
  refund: '↩️',
  loan: '🏪',
  soundbox: '📟',
  human_desk: '🧑‍💼',
  profile_sync: '✅',
  payment_verification: '🛡️',
};

const LANGS = [
  ['en', 'EN'],
  ['hi', 'हिंदी'],
  ['hinglish', 'Hinglish'],
  ['mr', 'मराठी'],
  ['ta', 'தமிழ்'],
  ['te', 'తెలుగు'],
  ['bn', 'বাংলা'],
  ['gu', 'ગુજરાતી'],
  ['kn', 'ಕನ್ನಡ'],
  ['ml', 'മലയാളം'],
  ['pa', 'ਪੰਜਾਬੀ'],
];

const cardFields = {
  settlement: [['Amount', 'amount'], ['Credited to', 'bank'], ['UTR', 'utr'], ['IFSC', 'ifsc']],
  soundbox_payout: [['Amount', 'amount'], ['Customer', 'customer'], ['Reference', 'utr']],
  refund: [['Amount', 'amount'], ['Recipient', 'customer'], ['UPI ID', 'vpa'], ['NPCI UTR', 'utr']],
  loan: [['Loan amount', 'amount'], ['Daily deduction', 'dailyDeduction'], ['Interest', 'interest'], ['KYC agent', 'agent'], ['Visit', 'doorstepVisit']],
  soundbox: [['Device', 'device'], ['Battery', 'battery'], ['Network', 'network'], ['Diagnostics', 'volume']],
  human_desk: [['Amount in review', 'amount'], ['Desk officer', 'officer'], ['Ticket', 'ticketId'], ['Next action', 'action']],
  profile_sync: [['Device', 'device']],
  payment_verification: [
    ['Amount Claimed', 'amount'],
    ['Reference (UTR)', 'utr'],
    ['Risk Level', 'risk'],
    ['Recommended Action', 'action'],
    ['System Verification', 'explanation'],
  ],
};

const cardTone = {
  human_desk: 'border-rose-200 bg-rose-50/70',
  loan: 'border-amber-200 bg-amber-50/70',
  payment_verification: 'border-sky-200 bg-sky-50/70',
  default: 'border-slate-200 bg-slate-50',
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00baf2] focus-visible:ring-offset-2';

const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

const personalise = (text, name) => text.replace('रमेश', name).replace('Ramesh', name);

/* ---------- small pieces ---------- */

function DetailCard({ card }) {
  if (!card) return null;
  const fields = (cardFields[card.type] || []).filter(([, k]) => card[k] != null && card[k] !== '');
  
  let tone = cardTone[card.type] || cardTone.default;
  if (card.type === 'payment_verification') {
    if (card.status === 'VERIFIED_RECEIVED') {
      tone = 'border-emerald-300 bg-emerald-50/80';
    } else if (card.status === 'PENDING') {
      tone = 'border-amber-300 bg-amber-50/80';
    } else {
      tone = 'border-rose-300 bg-rose-50/80';
    }
  }

  return (
    <section className={`mt-2 w-full overflow-hidden rounded-2xl border shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-base shadow-sm ring-1 ring-black/5">
              {CARD_ICONS[card.type] || '📄'}
            </span>
            {card.title || 'Support details'}
          </p>
          {card.type === 'profile_sync' && card.device && (
            <p className="mt-0.5 text-xs text-slate-500">{card.device}</p>
          )}
        </div>
        {card.status && (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/5">
            {card.status}
          </span>
        )}
      </div>
      {card.type !== 'profile_sync' && fields.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-black/5 bg-white/60 px-4 py-3 sm:grid-cols-2">
          {fields.map(([label, key]) => (
            <div key={key} className="min-w-0">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className={`mt-0.5 break-words text-sm font-semibold ${key === 'amount' ? 'text-base text-slate-900' : 'text-slate-700'}`}>
                {card[key]}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function StatusPill({ statusType, statusBadge }) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    escalated: 'bg-amber-50 text-amber-800 ring-amber-200',
    processing: 'bg-sky-50 text-sky-700 ring-sky-200',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  const label =
    statusType === 'success' ? 'Solved by Saathi' : statusType === 'escalated' ? 'Handed to human' : statusBadge;
  return (
    <span className={`inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${styles[statusType] || styles.neutral}`}>
      {statusType === 'processing' && <span className="mr-2 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-sky-500" />}
      <span className="truncate">{label}</span>
    </span>
  );
}

function Avatar({ saathi, initial }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${saathi ? 'bg-[#ffcf40] text-[#0b1b3f]' : 'bg-[#0b1b3f] text-white'
        }`}
    >
      {saathi ? 'S' : initial}
    </div>
  );
}

function MessageBubble({ message, merchantName, merchantInitial, animate, lang, rate, voiceURI, onSpeedChange }) {
  const isSaathi = message.sender === 'saathi';
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`mx-auto flex w-full max-w-3xl items-start gap-3 ${isSaathi ? '' : 'flex-row-reverse'}`}
    >
      <Avatar saathi={isSaathi} initial={merchantInitial} />
      <div className={`flex min-w-0 max-w-[88%] flex-col sm:max-w-[80%] ${isSaathi ? 'items-start' : 'items-end'}`}>
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{isSaathi ? 'Saathi' : merchantName}</span>
          <span>{message.time}</span>
          {!isSaathi && <span className="text-sky-600" aria-label="Read">✓✓</span>}
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 text-[15px] leading-6 ${isSaathi
            ? 'rounded-tl-sm border border-slate-200/80 bg-white text-slate-800 shadow-[0_6px_18px_-8px_rgba(11,27,63,0.2)]'
            : 'rounded-tr-sm bg-gradient-to-br from-[#0b1b3f] to-[#1f4fa3] text-white shadow-md shadow-[#0b1b3f]/20'
            }`}
        >
          <p className="whitespace-pre-line break-words">{message.text}</p>
        </div>
        {message.card && <DetailCard card={message.card} />}
        {isSaathi && message.text && (
          <VoicePlaybackBar
            text={message.text}
            lang={lang}
            rate={rate}
            voiceURI={voiceURI}
            onSpeedChange={onSpeedChange}
          />
        )}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-3" role="status">
      <Avatar saathi />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
        {[0, 120, 240].map((d) => (
          <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
        ))}
        <span className="ml-1.5">Checking your request</span>
      </div>
    </div>
  );
}

function ReceiptPanel({ currentCase, merchant, open, onToggle, receiptEndRef, reduceMotion }) {
  const last = currentCase.steps.length - 1;
  const processing = currentCase.statusType === 'processing';
  return (
    <aside className="relative min-w-0 overflow-hidden rounded-3xl border border-white bg-[#fffef9] shadow-[0_24px_60px_-24px_rgba(11,27,63,0.35)] xl:sticky xl:top-6">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="receipt-body"
        className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 text-left xl:cursor-default ${focusRing}`}
      >
        <div>
          <p className="font-bold text-[#0b1b3f]">What Saathi did</p>
          <p className="mt-0.5 text-xs text-slate-500">Every action, in order</p>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <StatusPill statusType={currentCase.statusType} statusBadge={currentCase.statusBadge} />
          <span className="text-lg leading-none text-slate-400 xl:hidden" aria-hidden="true">{open ? '−' : '+'}</span>
        </div>
      </button>

      <div id="receipt-body" className={`${open ? 'block' : 'hidden'} xl:block`}>
        <dl className="grid grid-cols-2 gap-3 border-y border-dashed border-slate-300 bg-[#f6f9fe] px-4 py-3">
          <div>
            <dt className="text-xs text-slate-500">Case ID</dt>
            <dd className="mt-0.5 break-all font-mono text-xs font-semibold text-slate-700">{currentCase.caseId}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Terminal</dt>
            <dd className="mt-0.5 break-all font-mono text-xs font-semibold text-slate-700">{merchant?.terminalId || 'PTM-8821'}</dd>
          </div>
          {currentCase.amount != null && (
            <div className="col-span-2 border-t border-slate-200 pt-3">
              <dt className="text-xs text-slate-500">Transaction amount</dt>
              <dd className="mt-0.5 bg-gradient-to-r from-[#0b1b3f] to-[#1f6fd6] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">{currentCase.amount}</dd>
            </div>
          )}
        </dl>

        <ol className="max-h-[420px] overflow-y-auto px-4 py-3" aria-live="polite">
          {currentCase.steps.length === 0 ? (
            <li className="py-10 text-center">
              <p className="text-sm font-medium text-slate-600">No actions yet</p>
              <p className="mt-1 text-xs text-slate-400">Send a message to see what Saathi checks.</p>
            </li>
          ) : (
            currentCase.steps.map((step, i) => {
              const active = i === last && processing;
              return (
                <motion.li
                  key={`${currentCase.caseId}-${i}`}
                  initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 }}
                  className="relative flex gap-3 pb-4 last:pb-1"
                >
                  <div className="relative flex w-5 shrink-0 justify-center">
                    <span className={`z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" /> : '✓'}
                    </span>
                    {i < last && <span className="absolute top-5 h-full w-px bg-slate-200" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[13px] leading-5 text-slate-700">{step.label}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{step.time}</p>
                  </div>
                </motion.li>
              );
            })
          )}
          <div ref={receiptEndRef} />
        </ol>

        <p className="border-t border-dashed border-slate-300 px-4 py-4 text-center text-xs tracking-wide text-slate-400">
          Thank you for choosing Saathi 💙
        </p>
      </div>
    </aside>
  );
}

/* ---------- page ---------- */

export const DemoChatPage = () => {
  const { currentMerchant, updateMerchantVoiceProfile } = useAuth();
  const reduceMotion = useReducedMotion();
  const firstName = currentMerchant?.name?.split(' ')[0] || 'Ramesh';
  const merchantInitial = (currentMerchant?.name?.charAt(0) || 'M').toUpperCase();

  const [voiceSettings, setVoiceSettings] = useState({
    preferredLanguage: currentMerchant?.preferredLanguage || 'en',
    voiceResponseEnabled: currentMerchant?.voiceResponseEnabled ?? true,
    speechRate: currentMerchant?.speechRate || 1.0,
    preferredVoiceIdentifier: currentMerchant?.preferredVoiceIdentifier || '',
  });

  const [lang, setLang] = useState(currentMerchant?.preferredLanguage || 'en');
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [isFraudModalOpen, setIsFraudModalOpen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState(clock);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [isExecutingTools, setIsExecutingTools] = useState(false);
  const [currentCase, setCurrentCase] = useState({ caseId: 'CASE-4091', statusBadge: 'System ready', statusType: 'neutral', amount: null, steps: [] });

  const messagesEndRef = useRef(null);
  const receiptEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const busy = isTyping || isExecutingTools;

  useEffect(() => {
    if (currentMerchant?.preferredLanguage) {
      setLang(currentMerchant.preferredLanguage);
      setVoiceSettings({
        preferredLanguage: currentMerchant.preferredLanguage || 'en',
        voiceResponseEnabled: currentMerchant.voiceResponseEnabled ?? true,
        speechRate: currentMerchant.speechRate || 1.0,
        preferredVoiceIdentifier: currentMerchant.preferredVoiceIdentifier || '',
      });
    }
  }, [currentMerchant]);

  useEffect(() => {
    const id = setInterval(() => setCurrentTimeStr(clock()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { recognitionRef.current = null; return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    const langCfg = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    rec.lang = langCfg?.bcp47?.[0] || 'en-IN';
    rec.onstart = () => { setIsListening(true); setRecordingDuration(0); };
    rec.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInputVal(t.trim());
    };
    rec.onerror = rec.onend = () => { setIsListening(false); setRecordingDuration(0); };
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch { } };
  }, [lang]);

  useEffect(() => {
    if (!isListening) return;
    const t = setInterval(() => setRecordingDuration((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [isListening]);

  const loadGreeting = useCallback(
    (label, isInit) => {
      let active = true;
      getGreetingMessage(lang)
        .then((g) => {
          if (!active) return;
          setMessages([{ ...g, text: personalise(g.text, firstName), time: getNowTimeAmPm() }]);
          const shop = currentMerchant?.shopName || 'Store';
          setCurrentCase({
            caseId: 'INIT-8821',
            statusBadge: isInit ? `Ready for ${shop}` : 'System idle',
            statusType: 'neutral',
            amount: null,
            steps: [{ label: label || `Connected to ${shop} terminal (${currentMerchant?.city || 'Terminal'}) [${lang.toUpperCase()}]`, time: getNowTime() }],
          });
        })
        .catch(console.error);
      return () => { active = false; };
    },
    [lang, firstName, currentMerchant]
  );

  useEffect(() => loadGreeting(null, true), [loadGreeting]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'end' }); }, [messages, isTyping, reduceMotion]);
  useEffect(() => { receiptEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'end' }); }, [currentCase.steps, reduceMotion]);
  useEffect(() => () => clearTimeout(recordingTimeoutRef.current), []);

  const stopListening = () => {
    clearTimeout(recordingTimeoutRef.current);
    try { recognitionRef.current?.stop(); } catch { }
    setIsListening(false);
  };

  const handleSendMessage = async (textToSend, customCard = null) => {
    const text = (textToSend ?? inputVal).trim();
    if (!text || busy) return;
    setInputVal('');
    setActionsOpen(false);
    if (isListening) stopListening();

    setMessages((prev) => [...prev, { id: `usr-${Date.now()}`, sender: 'merchant', time: getNowTimeAmPm(), text, status: 'read' }]);
    setIsTyping(true);
    setIsExecutingTools(true);
    setCurrentCase({
      caseId: `CASE-${Math.floor(1000 + Math.random() * 9000)}`,
      statusBadge: 'Checking support systems',
      statusType: 'processing',
      amount: null,
      steps: [{ label: `Merchant asked: “${text}”`, time: getNowTime() }],
    });

    try {
      const scenario = await executeChatScenario(text, lang);
      for (const step of scenario.steps || []) {
        await new Promise((r) => setTimeout(r, 550));
        setCurrentCase((prev) => ({ ...prev, caseId: scenario.caseId || prev.caseId, amount: scenario.amount ?? prev.amount, steps: [...prev.steps, step] }));
      }
      await new Promise((r) => setTimeout(r, 250));
      if (soundEnabled) playPaytmChime();
      setMessages((prev) => [...prev, { id: `saa-${Date.now()}`, sender: 'saathi', time: getNowTimeAmPm(), text: scenario.reply, card: scenario.card || customCard }]);
      setCurrentCase((prev) => ({ ...prev, statusBadge: scenario.statusBadge, statusType: scenario.statusType }));

      // Automatically speak the response if voice responses are enabled (Section 15.7)
      if (voiceSettings.voiceResponseEnabled) {
        voiceService.speak({
          text: scenario.reply,
          lang: lang,
          rate: voiceSettings.speechRate,
          voiceURI: voiceSettings.preferredVoiceIdentifier,
        });
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, sender: 'saathi', time: getNowTimeAmPm(), text: 'Something went wrong on our side. Please send your message again.' }]);
      setCurrentCase((prev) => ({ ...prev, statusBadge: 'Request failed', statusType: 'neutral' }));
    } finally {
      setIsTyping(false);
      setIsExecutingTools(false);
      inputRef.current?.focus();
    }
  };

  const simulateVoiceRecording = () => {
    setIsListening(true);
    setInputVal('');
    recordingTimeoutRef.current = setTimeout(() => {
      const phrases = {
        en: 'Mera paisa nahi aaya',
        hi: 'मेरा सुबह का ₹8,450 नहीं आया',
        hinglish: 'Mera subah ka payout nahi aaya',
        mr: 'माझे पैसे अजून जमा झाले नाहीत',
        ta: 'எனது பணம் இன்னும் வரவில்லை',
        te: 'నా చెల్లింపు ఇంకా రాలేదు',
        bn: 'আমার পেমেন্ট এখনও আসেনি',
        gu: 'મારા પૈસા હજુ આવ્યા નથી',
        kn: 'ನನ್ನ ಹಣ ಇನ್ನೂ ಬಂದಿಲ್ಲ',
        ml: 'എന്റെ പണം ഇതുവരെ വന്നിട്ടില്ല',
        pa: 'ਮੇਰਾ ਪੈਸਾ ਅਜੇ ਤੱਕ ਨਹੀਂ ਆਇਆ',
      };
      const transcript = phrases[lang] || phrases.en;
      setInputVal(transcript);
      setIsListening(false);
      recordingTimeoutRef.current = setTimeout(() => handleSendMessage(transcript), 350);
    }, 2200);
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      if (inputVal.trim()) handleSendMessage(inputVal);
    } else if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch { simulateVoiceRecording(); }
    } else simulateVoiceRecording();
  };

  const toolbarBtn =
    `rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${focusRing}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff3fd_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#fff3c4_0%,transparent_40%)] bg-[#f1f5fa] text-[#0b1b3f]">
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header */}
        <header className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1b3f] via-[#12306b] to-[#1c4fa8] px-5 py-6 text-white shadow-[0_20px_50px_-20px_rgba(11,27,63,0.6)] sm:px-8 sm:py-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#00baf2]/30 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[#ffcf40]/25 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Sticker rotate="-rotate-1" color="bg-yellow">Saathi · Merchant Desk</Sticker>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-white/20 backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
                  Terminal connected
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Namaste, {firstName} 👋</h1>
              <p className="mt-1 max-w-xl truncate text-sm text-blue-100/80">
                {currentMerchant?.shopName || 'Merchant terminal'} · Ask in your language and watch Saathi work, step by step.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFraudModalOpen(true)}
                className={`${toolbarBtn} !border-emerald-300/40 !bg-emerald-500/20 !text-emerald-100 backdrop-blur hover:!bg-emerald-500/30 flex items-center gap-1.5`}
                title="Verify customer screenshot or UTR reference against internal ledger"
              >
                <span>🛡️</span>
                <span className="font-semibold">Verify Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setIsVoiceSettingsOpen(true)}
                className={`${toolbarBtn} !border-white/20 !bg-white/10 !text-white backdrop-blur hover:!bg-white/20 flex items-center gap-1.5`}
                title="Voice & Language Settings"
              >
                <span>🎙️</span>
                <span className="hidden sm:inline">Voice</span>
                <span className="rounded bg-[#ffcf40] px-1.5 py-0.5 text-[10px] font-black text-[#0b1b3f] uppercase">
                  {lang}
                </span>
              </button>

              <button type="button" aria-pressed={soundEnabled} onClick={() => { setSoundEnabled((v) => !v); if (!soundEnabled) playPaytmChime(); }} className={`${toolbarBtn} !border-white/20 !bg-white/10 !text-white backdrop-blur hover:!bg-white/20`}>
                {soundEnabled ? '🔔 Sound on' : '🔕 Sound off'}
              </button>
              <button type="button" onClick={() => playPaytmChime()} className={`${toolbarBtn} !border-white/20 !bg-white/10 !text-white backdrop-blur hover:!bg-white/20`}>Test chime</button>
              
              <div role="group" aria-label="Language" className="hidden lg:flex rounded-xl bg-white/10 p-0.5 ring-1 ring-white/20 backdrop-blur">
                {LANGS.slice(0, 4).map(([code, label]) => (
                  <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)}
                    className={`rounded-[10px] px-2.5 py-1 text-xs font-semibold transition ${focusRing} ${lang === code ? 'bg-[#ffcf40] text-[#0b1b3f] shadow' : 'text-white/80 hover:bg-white/10'}`}>
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsVoiceSettingsOpen(true)}
                  className="rounded-[10px] px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
                  title="More regional languages"
                >
                  More...
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Chat */}
          <section
            aria-label="Chat with Saathi"
            className="flex h-[calc(100dvh-210px)] min-h-[560px] min-w-0 flex-col overflow-hidden rounded-3xl border border-white bg-white shadow-[0_24px_60px_-24px_rgba(11,27,63,0.35)] xl:h-[780px]"
          >
            <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 sm:px-6 border-b border-slate-100">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffcf40] text-base font-black text-[#0b1b3f] ring-4 ring-[#ffcf40]/30">S</div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-bold">
                    Saathi
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">Merchant help desk · {currentTimeStr}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadGreeting(`Session reset for ${currentMerchant?.shopName || 'terminal'}`, false)}
                className={`rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${focusRing}`}
              >
                New chat
              </button>
            </div>

            {/* Mobile-only live status, so progress is visible without opening the log */}
            <button
              type="button"
              onClick={() => setAuditOpen((v) => !v)}
              className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600 xl:hidden"
            >
              <StatusPill statusType={currentCase.statusType} statusBadge={currentCase.statusBadge} />
              <span className="font-medium text-sky-700">{auditOpen ? 'Hide' : 'View'} actions</span>
            </button>

            <div className="flex-1 space-y-5 overflow-y-auto bg-[linear-gradient(180deg,#f6f9fe_0%,#fdfbf4_100%)] px-3 py-5 sm:px-6" role="log" aria-live="polite" aria-label="Conversation">
              <div className="flex justify-center">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                  Secure merchant support · Today
                </span>
              </div>
              {messages.length <= 1 && !busy && (
                <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 pl-0 sm:grid-cols-4 sm:pl-11">
                  {TILES.map(([icon, title, sub, query, grad]) => (
                    <button key={title} type="button" onClick={() => handleSendMessage(query)}
                      className={`group rounded-2xl border border-slate-200 bg-gradient-to-br ${grad} p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#00baf2] hover:shadow-md motion-reduce:transition-none ${focusRing}`}>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg shadow-sm ring-1 ring-slate-100">{icon}</span>
                      <p className="mt-2 text-sm font-bold text-[#0b1b3f]">{title}</p>
                      <p className="text-xs text-slate-500">{sub}</p>
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  merchantName={firstName === 'Ramesh' && !currentMerchant?.name ? 'You' : firstName}
                  merchantInitial={merchantInitial}
                  animate={i > 0 && !reduceMotion}
                  lang={lang}
                  rate={voiceSettings.speechRate}
                  voiceURI={voiceSettings.preferredVoiceIdentifier}
                  onSpeedChange={(newSpeed) => {
                    setVoiceSettings((prev) => ({ ...prev, speechRate: newSpeed }));
                    updateMerchantVoiceProfile({ speechRate: newSpeed });
                  }}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-slate-200 bg-white px-3 pb-3 pt-3 sm:px-6 sm:pb-4">
              <div className="mx-auto max-w-3xl">
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={busy}
                      onClick={() => handleSendMessage(chip)}
                      className={`shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-600 shadow-sm transition hover:border-[#00baf2] hover:bg-sky-50 hover:text-[#0b1b3f] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                    >
                      <span aria-hidden="true" className="mr-1.5">{CHIP_ICONS[chip]}</span>{chip}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {actionsOpen && (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
                        {QUICK_ACTIONS.map(([label, query]) => (
                          <button
                            key={label}
                            type="button"
                            disabled={busy}
                            onClick={() => handleSendMessage(query)}
                            className={`rounded-lg bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:ring-[#00baf2] disabled:opacity-50 ${focusRing}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isListening && (
                  <div className="mb-2 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="status">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600 motion-reduce:animate-none" />
                      Listening, {recordingDuration}s
                    </span>
                    <button type="button" onClick={() => { stopListening(); setInputVal(''); }} className={`rounded font-semibold ${focusRing}`}>
                      Cancel
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white p-1.5 transition focus-within:border-[#00baf2] focus-within:ring-4 focus-within:ring-[#00baf2]/15"
                >
                  <button
                    type="button"
                    onClick={() => setActionsOpen((v) => !v)}
                    aria-expanded={actionsOpen}
                    aria-label="Quick actions"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition ${focusRing} ${actionsOpen ? 'rotate-45 bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    +
                  </button>
                  <input
                    ref={inputRef}
                    id="chat-message-input"
                    name="message"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    disabled={busy || isListening}
                    aria-label="Message"
                    placeholder={PLACEHOLDERS[lang]}
                    className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-[15px] text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={handleMicToggle}
                    disabled={busy}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                    aria-pressed={isListening}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-40 ${focusRing} ${isListening ? 'bg-rose-100 text-rose-700' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <rect x="9" y="3" width="6" height="12" rx="3" />
                      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    disabled={!inputVal.trim() || busy || isListening}
                    className={`flex h-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00baf2] to-[#1f6fd6] px-5 text-sm font-bold text-white shadow-md shadow-sky-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 ${focusRing}`}
                  >
                    Send
                  </button>
                </form>
                <p className="mt-2 text-center text-xs text-slate-400">Saathi can make mistakes. Check transaction details before acting on them.</p>
              </div>
            </div>
          </section>

          <ReceiptPanel
            currentCase={currentCase}
            merchant={currentMerchant}
            open={auditOpen}
            onToggle={() => setAuditOpen((v) => !v)}
            receiptEndRef={receiptEndRef}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>

      {/* Voice & Language Settings Modal (Sections 15.2 - 15.9) */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        merchantId={currentMerchant?.id === 'merchant-priya' ? 2 : currentMerchant?.id === 'merchant-vikram' ? 3 : 1}
        currentSettings={voiceSettings}
        onSaveSettings={(newSettings) => {
          setVoiceSettings(newSettings);
          if (newSettings.preferredLanguage) {
            setLang(newSettings.preferredLanguage);
          }
          updateMerchantVoiceProfile(newSettings);
        }}
      />

      {/* Fraud & Payment Claim Verification Modal (Phase 1) */}
      <FraudModal
        isOpen={isFraudModalOpen}
        onClose={() => setIsFraudModalOpen(false)}
        merchantId={currentMerchant?.id === 'merchant-priya' ? 2 : currentMerchant?.id === 'merchant-vikram' ? 3 : 1}
        onSendToChat={(msg) => handleSendMessage(msg)}
      />
    </main>
  );
};

export default DemoChatPage;