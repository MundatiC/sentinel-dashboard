import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary-container text-on-primary-container hover:brightness-110',
  secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
  danger: 'bg-error-container text-on-error-container hover:brightness-110',
  ghost: 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
};

export function Button({
  variant = 'secondary',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        // min-h-9 + padding keeps a comfortable click target; disabled buttons look and act disabled
        'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 font-label-default text-label-default transition disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
