import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Cancel01Icon, LockKeyIcon } from 'hugeicons-react';

// SHA-256 hash of the correct PIN - not reversible
const PIN_HASH = '7611f1a57f80b0a87b4178e2e5f16bafa30dd0d9947d99f953c091d8c96abd0e';
const PIN_LENGTH = 4;
const LOCKOUT_DURATION = 30000; // 30 seconds
const MAX_ATTEMPTS = 5;

// Hash function using Web Crypto API
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface PinLockProps {
  onUnlock: () => void;
}

export function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Handle lockout timer
  useEffect(() => {
    if (lockoutEnd) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, lockoutEnd - Date.now());
        setTimeLeft(Math.ceil(remaining / 1000));
        if (remaining <= 0) {
          setLockoutEnd(null);
          setAttempts(0);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [lockoutEnd]);

  const handleNumberPress = useCallback((num: string) => {
    if (lockoutEnd) return;
    if (pin.length >= PIN_LENGTH) return;

    haptics.light();
    const newPin = pin + num;
    setPin(newPin);
    setError(false);

    if (newPin.length === PIN_LENGTH) {
      // Hash and verify asynchronously
      hashPin(newPin).then(hash => {
        if (hash === PIN_HASH) {
          haptics.success();
          onUnlock();
        } else {
          haptics.error();
          setError(true);
          setAttempts(prev => {
            const newAttempts = prev + 1;
            if (newAttempts >= MAX_ATTEMPTS) {
              setLockoutEnd(Date.now() + LOCKOUT_DURATION);
            }
            return newAttempts;
          });
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 500);
        }
      });
    }
  }, [pin, onUnlock, lockoutEnd]);

  const handleDelete = useCallback(() => {
    if (lockoutEnd) return;
    if (pin.length > 0) {
      haptics.light();
      setPin(prev => prev.slice(0, -1));
      setError(false);
    }
  }, [pin.length, lockoutEnd]);

  const isLocked = lockoutEnd !== null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Background gradient matching the app theme */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at top, hsl(var(--primary) / 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, hsl(var(--accent) / 0.05) 0%, transparent 40%)
          `
        }}
      />

      {/* Main content */}
      <div className="relative flex flex-col items-center px-6">
        {/* Lock icon */}
        <div className="glass-card w-20 h-20 rounded-full flex items-center justify-center mb-6">
          <LockKeyIcon className="w-8 h-8 text-primary" />
        </div>

        {/* Title */}
        <h1 className="text-foreground text-2xl font-semibold mb-2">
          {isLocked ? 'Locked Out' : 'Enter Passcode'}
        </h1>

        <p className="text-muted-foreground text-sm mb-8">
          {isLocked
            ? `Try again in ${timeLeft} seconds`
            : attempts > 0 && !error
              ? `${MAX_ATTEMPTS - attempts} attempts remaining`
              : 'Enter your 4-digit passcode'
          }
        </p>

        {/* PIN dots */}
        <div className="flex gap-4 mb-10">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-200",
                error
                  ? "bg-destructive"
                  : pin.length > i
                    ? "bg-primary scale-110"
                    : "bg-muted-foreground/30",
                error && "animate-shake"
              )}
            />
          ))}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((key) => {
            if (key === '') {
              return <div key="empty" className="w-20 h-20" />;
            }

            if (key === 'delete') {
              return (
                <button
                  key="delete"
                  onClick={handleDelete}
                  disabled={isLocked || pin.length === 0}
                  className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-200",
                    "text-muted-foreground hover:text-foreground",
                    "hover:bg-muted/50 active:scale-95",
                    (isLocked || pin.length === 0) && "opacity-30 pointer-events-none"
                  )}
                >
                  <Cancel01Icon className="w-6 h-6" />
                </button>
              );
            }

            const letters = getLettersForNumber(key);

            return (
              <button
                key={key}
                onClick={() => handleNumberPress(key)}
                disabled={isLocked}
                className={cn(
                  "w-20 h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-200",
                  "glass-card border-border/50",
                  "hover:scale-105 active:scale-95",
                  isLocked && "opacity-30 pointer-events-none"
                )}
              >
                <span className="text-foreground text-2xl font-medium">{key}</span>
                {letters && (
                  <span className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase mt-0.5">
                    {letters}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Cancel button */}
        {pin.length > 0 && !isLocked && (
          <button
            onClick={() => setPin('')}
            className="mt-8 text-muted-foreground text-sm hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function getLettersForNumber(num: string): string | null {
  const letters: Record<string, string> = {
    '2': 'ABC',
    '3': 'DEF',
    '4': 'GHI',
    '5': 'JKL',
    '6': 'MNO',
    '7': 'PQRS',
    '8': 'TUV',
    '9': 'WXYZ',
  };
  return letters[num] || null;
}
