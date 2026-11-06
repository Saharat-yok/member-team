import { useId, useSyncExternalStore } from 'react';
import { getToast, subscribe } from '../lib/toast.js';

export const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none ' +
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 aria-invalid:border-red-500';

export function Field({ label, error, as: Tag = 'input', ...props }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      <Tag id={id} className={inputCls} aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined} {...props} />
      {error && <p id={`${id}-err`} className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

const VARIANTS = {
  primary: 'bg-indigo-600 text-white active:bg-indigo-700 disabled:opacity-60',
  ghost: 'text-slate-600 active:bg-slate-100',
  danger: 'text-red-600 active:bg-red-50',
};

export const Button = ({ variant = 'primary', className = '', ...props }) => (
  <button className={`min-h-11 rounded-xl px-4 font-medium transition-colors ${VARIANTS[variant]} ${className}`} {...props} />
);

export const Spinner = ({ full }) => (
  <div role="status" aria-label="กำลังโหลด" className={`grid place-items-center ${full ? 'h-dvh' : 'py-10'}`}>
    <div className="size-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
  </div>
);

export function Toaster() {
  const msg = useSyncExternalStore(subscribe, getToast);
  return (
    <div aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(9.5rem_+_env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-24">
      {msg && <p className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{msg}</p>}
    </div>
  );
}
