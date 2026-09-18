"use client";

import { useEffect } from "react";

export default function PrintButton({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (autoPrint) window.print();
  }, [autoPrint]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 print:hidden"
    >
      Imprimir ticket / PDF
    </button>
  );
}
