"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

export type TableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export function Table<T extends { id: string | number }>({
  caption,
  columns,
  rows,
  emptyMessage = "Nothing to show yet.",
}: {
  caption: string;
  columns: TableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[600px] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-5 py-3.5 font-semibold ${column.className ?? ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.id} className="text-slate-700">
                {columns.map((column) => (
                  <td key={column.key} className={`px-5 py-4 ${column.className ?? ""}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={Math.max(columns.length, 1)}
                className="px-5 py-12 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const closeHandler = useRef(onClose);

  useEffect(() => {
    closeHandler.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeHandler.current();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onKeyDown={(event) => {
          if (event.key !== "Tab" || !dialog.current) return;
          const focusable = dialog.current.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
          );
          if (!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Form({
  onSubmit,
  children,
  className = "",
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      className={`space-y-4 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(event);
      }}
    >
      {children}
    </form>
  );
}

export function FileUploader({
  label = "Choose a file",
  accept,
  onFileSelect,
  maxSizeMb = 5,
}: {
  label?: string;
  accept?: string;
  onFileSelect: (file: File | null) => void;
  maxSizeMb?: number;
}) {
  const inputId = useId();
  const errorId = useId();
  const [error, setError] = useState("");

  return (
    <div>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 px-5 py-7 text-center hover:border-indigo-400 focus-within:outline-2 focus-within:outline-indigo-600"
      >
        <span className="mb-1 font-semibold text-slate-800">{label}</span>
        <span className="text-sm text-slate-500">
          Select a file up to {maxSizeMb} MB {accept ? `(${accept})` : ""}
        </span>
        <input
          id={inputId}
          type="file"
          accept={accept}
          aria-describedby={error ? errorId : undefined}
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            if (file && file.size > maxSizeMb * 1024 * 1024) {
              setError(`File is larger than ${maxSizeMb} MB.`);
              onFileSelect(null);
              event.currentTarget.value = "";
              return;
            }
            setError("");
            onFileSelect(file);
          }}
        />
      </label>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
