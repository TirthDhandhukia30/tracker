import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface AnimatedCheckmarkProps {
  checked: boolean;
  size?: number;
  className?: string;
  onToggle?: () => void;
}

export function AnimatedCheckmark({
  checked,
  size = 24,
  className,
  onToggle,
}: AnimatedCheckmarkProps) {
  const prefersReducedMotion = useReducedMotion();

  const pathVariants = {
    unchecked: { pathLength: 0, opacity: 0 },
    checked: { pathLength: 1, opacity: 1 },
  };

  const boxVariants = {
    unchecked: { 
      scale: 1,
      backgroundColor: 'transparent',
      borderColor: 'hsl(var(--muted-foreground) / 0.3)',
    },
    checked: { 
      scale: [1, 1.1, 1],
      backgroundColor: 'hsl(var(--primary))',
      borderColor: 'hsl(var(--primary))',
    },
  };

  return (
    <motion.button
      onClick={onToggle}
      className={cn(
        'relative rounded-lg border-2 flex items-center justify-center transition-shadow',
        checked && 'shadow-glow',
        className
      )}
      style={{ width: size, height: size }}
      initial={false}
      animate={checked ? 'checked' : 'unchecked'}
      variants={prefersReducedMotion ? {} : boxVariants}
      transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
      aria-checked={checked}
      role="checkbox"
    >
      <motion.svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M5 12l5 5L19 7"
          variants={prefersReducedMotion ? {} : pathVariants}
          initial={false}
          animate={checked ? 'checked' : 'unchecked'}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 300, damping: 20, delay: checked ? 0.1 : 0 }
          }
        />
      </motion.svg>
    </motion.button>
  );
}

// Confetti burst effect for completing all habits
export function CompletionBurst({ trigger }: { trigger: boolean }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || !trigger) return null;

  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const distance = 40 + Math.random() * 20;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-primary"
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: particle.x,
            y: particle.y,
            scale: particle.scale,
            opacity: 0,
            rotate: particle.rotation,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
