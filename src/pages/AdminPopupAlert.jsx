import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function AdminPopupAlert() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || 'N/A';
  const name = searchParams.get('name') || 'Guest';
  const total = searchParams.get('total') || '0';
  const itemsRaw = searchParams.get('items') || '';
  const items = itemsRaw ? decodeURIComponent(itemsRaw).split('\n') : [];

  const [isMuted, setIsMuted] = useState(false);

  // Sound generator
  const playAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5 note
      gain1.gain.setValueAtTime(0.45, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 1.0);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.1); // E6 note
      gain2.gain.setValueAtTime(0.35, audioCtx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.1);
      osc2.stop(audioCtx.currentTime + 1.2);
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  };

  // Run alarm loop
  useEffect(() => {
    if (!isMuted) {
      playAlarm();
      const interval = setInterval(playAlarm, 2200);
      return () => clearInterval(interval);
    }
  }, [isMuted]);

  // Click handler to silence and close
  const handleClose = () => {
    setIsMuted(true);
    window.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900 text-slate-100 flex flex-col justify-between p-5 font-sans overflow-hidden">
      
      {/* Alert Header */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center text-lg animate-bounce">
          🔔
        </span>
        <div>
          <span className="text-[9px] text-amber-500 font-extrabold uppercase tracking-widest block">Desktop Popup Alert</span>
          <h2 className="font-extrabold text-base text-white">New Order Alert! 📥</h2>
        </div>
      </div>

      {/* Massive Yellow Items Card */}
      <div className="flex-grow my-4 bg-amber-400 text-slate-950 p-4 rounded-2xl border-2 border-amber-500 shadow-lg overflow-y-auto flex flex-col justify-center">
        <span className="text-[9px] text-amber-900 font-extrabold uppercase tracking-wider block mb-1">Items:</span>
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="text-lg sm:text-xl font-black tracking-tight leading-tight border-b border-amber-500/25 pb-1.5 last:border-0 last:pb-0">
              {it}
            </li>
          ))}
        </ul>
      </div>

      {/* Customer / Total Info */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-800/80 border border-slate-700/50 px-3 py-2 rounded-xl mb-4 shrink-0">
        <span>Customer: <strong className="text-slate-200">{name}</strong></span>
        <span>Total: <strong className="text-slate-200">₹{total}</strong></span>
        <span>ID: <strong className="text-slate-200 font-mono">{id}</strong></span>
      </div>

      {/* Acknowledge Action Button */}
      <button
        onClick={handleClose}
        className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs rounded-xl transition-all duration-150 uppercase tracking-widest shadow-lg shadow-red-500/10 shrink-0"
      >
        Silence & Close
      </button>

    </div>
  );
}
