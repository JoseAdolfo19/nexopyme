type FormAlertProps = {
  type?: "error" | "success" | "info";
  title?: string;
  message: string;
};

const styles = {
  error: {
    container: "border-red-200 bg-red-50 text-red-700",
    badge: "bg-red-100 text-red-700",
  },
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  info: {
    container: "border-sky-200 bg-sky-50 text-sky-700",
    badge: "bg-sky-100 text-sky-700",
  },
} as const;

export function FormAlert({ type = "error", title, message }: FormAlertProps) {
  if (!message) return null;

  const palette = styles[type];

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${palette.container}`}>
      <span className={`mt-0.5 inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${palette.badge}`}>
        {type === "error" ? "!" : type === "success" ? "✓" : "i"}
      </span>
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? "mt-0.5" : ""}>{message}</p>
      </div>
    </div>
  );
}
