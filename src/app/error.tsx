"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-100 text-2xl text-red-600">
          !
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Algo salió mal</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Ocurrió un problema inesperado. Intenta nuevamente en unos segundos.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
