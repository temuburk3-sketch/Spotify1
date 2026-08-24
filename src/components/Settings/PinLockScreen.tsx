import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';
import { verifyPIN, setAppLockedState } from '../../services/recommendationService';

interface PinLockScreenProps {
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (verifyPIN(pin)) {
      setAppLockedState(false);
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 8) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      if (verifyPIN(nextPin)) {
        setTimeout(() => {
          setAppLockedState(false);
          onUnlock();
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm flex flex-col items-center text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-white">SoundPulse Kilitli</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Kişisel müzik alanınıza erişmek için PIN parolanızı girin
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="flex items-center justify-center gap-3 my-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                pin.length > idx
                  ? error
                    ? 'bg-red-500 scale-110'
                    : 'bg-emerald-400 scale-110 shadow-sm shadow-emerald-400'
                  : 'bg-neutral-800 border border-neutral-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 font-semibold animate-shake">
            Hatalı PIN. Lütfen tekrar deneyin.
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
            <button
              key={btn}
              onClick={() => {
                if (btn === 'C') {
                  setPin('');
                  setError(false);
                } else if (btn === '⌫') {
                  handleBackspace();
                } else {
                  handleDigit(btn);
                }
              }}
              className="h-14 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 active:bg-neutral-700 text-white font-bold text-lg border border-neutral-800 transition flex items-center justify-center"
            >
              {btn}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Kişisel Veri ve Gizlilik Koruması</span>
        </div>
      </motion.div>
    </div>
  );
};
