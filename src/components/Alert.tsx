export type AlertType = 'success' | 'warning' | 'error';

const STYLES: Record<AlertType, string> = {
  success:
    'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300',
  warning:
    'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300',
  error:
    'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400',
};

function AlertIcon({ type }: { type: AlertType }) {
  if (type === 'success') {
    return (
      <>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5l2.5 2.5 5-5" />
      </>
    );
  }
  if (type === 'warning') {
    return (
      <>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 8v4.5" />
        <circle cx="12" cy="15.75" r="0.75" fill="currentColor" stroke="none" />
      </>
    );
  }
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M9.75 9.75l4.5 4.5M14.25 9.75l-4.5 4.5" />
    </>
  );
}

export default function Alert({ type, message }: { type: AlertType; message: string }) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${STYLES[type]}`}
    >
      <svg
        className="mt-0.5 h-5 w-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        <AlertIcon type={type} />
      </svg>
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}
