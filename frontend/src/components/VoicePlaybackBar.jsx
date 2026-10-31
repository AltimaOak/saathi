import React, { useState, useEffect } from 'react';
import { voiceService } from '../services/voiceService';

export default function VoicePlaybackBar({
  text,
  lang = 'en',
  rate = 1.0,
  voiceURI = '',
  onSpeedChange,
}) {
  const [playbackState, setPlaybackState] = useState('idle'); // 'idle' | 'speaking' | 'paused'
  const [currentSpeed, setCurrentSpeed] = useState(rate);

  useEffect(() => {
    setCurrentSpeed(rate);
  }, [rate]);

  useEffect(() => {
    const unsub = voiceService.subscribe((stateObj) => {
      setPlaybackState(stateObj.state);
    });
    return () => unsub();
  }, []);

  const handlePlayOrResume = () => {
    if (playbackState === 'paused') {
      voiceService.resume();
    } else {
      voiceService.speak({
        text,
        lang,
        rate: currentSpeed,
        voiceURI,
      });
    }
  };

  const handlePause = () => {
    voiceService.pause();
  };

  const handleStop = () => {
    voiceService.stop();
  };

  const handleReplay = () => {
    voiceService.stop();
    setTimeout(() => {
      voiceService.speak({
        text,
        lang,
        rate: currentSpeed,
        voiceURI,
      });
    }, 100);
  };

  const cycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const currentIndex = speeds.findIndex((s) => Math.abs(s - currentSpeed) < 0.05);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setCurrentSpeed(nextSpeed);
    if (onSpeedChange) onSpeedChange(nextSpeed);
    if (playbackState === 'speaking') {
      // Restart at new speed
      voiceService.stop();
      setTimeout(() => {
        voiceService.speak({
          text,
          lang,
          rate: nextSpeed,
          voiceURI,
        });
      }, 80);
    }
  };

  const isSpeaking = playbackState === 'speaking';
  const isPaused = playbackState === 'paused';

  return (
    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
      <div className="flex items-center gap-1.5">
        {/* Play/Pause/Resume Toggle */}
        {!isSpeaking && !isPaused ? (
          <button
            type="button"
            onClick={handlePlayOrResume}
            title="Read aloud"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00baf2]/10 font-bold text-[#0089b3] hover:bg-[#00baf2]/20 transition active:scale-95"
          >
            ▶
          </button>
        ) : isSpeaking ? (
          <button
            type="button"
            onClick={handlePause}
            title="Pause speech"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 font-bold text-amber-800 hover:bg-amber-200 transition active:scale-95"
          >
            ⏸
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePlayOrResume}
            title="Resume speech"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00baf2] font-bold text-white hover:bg-[#0089b3] transition active:scale-95"
          >
            ▶
          </button>
        )}

        {/* Stop Button */}
        {(isSpeaking || isPaused) && (
          <button
            type="button"
            onClick={handleStop}
            title="Stop playback"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition active:scale-95"
          >
            ⏹
          </button>
        )}

        {/* Replay Button */}
        <button
          type="button"
          onClick={handleReplay}
          title="Replay from start"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition active:scale-95"
        >
          🔄
        </button>

        {/* Audio Wave Indicator */}
        {isSpeaking && (
          <div className="flex items-center gap-0.5 px-1.5" title="Speaking">
            <span className="h-3 w-1 animate-pulse rounded-full bg-[#00baf2]" style={{ animationDelay: '0ms' }} />
            <span className="h-4 w-1 animate-pulse rounded-full bg-[#00baf2]" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-1 animate-pulse rounded-full bg-[#00baf2]" style={{ animationDelay: '300ms' }} />
            <span className="h-4 w-1 animate-pulse rounded-full bg-[#00baf2]" style={{ animationDelay: '75ms' }} />
          </div>
        )}

        {isPaused && (
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
            Paused
          </span>
        )}
      </div>

      {/* Speed Pill */}
      <button
        type="button"
        onClick={cycleSpeed}
        title="Cycle speech speed (0.75x, 1.0x, 1.25x, 1.5x)"
        className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition"
      >
        {currentSpeed.toFixed(2)}x
      </button>
    </div>
  );
}

