"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createSaleAction } from "@/app/actions/sales";
import { Button } from "@/components/ui/Button";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatSoles } from "@/lib/format";
import { cn } from "@/lib/cn";

type ProductItem = {
  id: string;
  name: string;
  salePrice: number;
  stock: number;
  type: string;
  unit: string;
};

type CustomerOption = {
  id: string;
  name: string;
  docNumber: string | null;
  docType: string;
};

type CartLine = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  stock: number;
  unit: string;
  type: string;
};

export default function SaleForm({
  products,
  customers,
}: {
  products: ProductItem[];
  customers: CustomerOption[];
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [docType, setDocType] = useState("boleta");
  const [customerId, setCustomerId] = useState("");
  const [formState, formAction] = useActionState(createSaleAction, {});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 20);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.id && q.includes(p.id.slice(0, 4))))
      .slice(0, 20);
  }, [query, products]);

  const addToCart = (p: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.stock && p.type === "producto") return prev;
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { productId: p.id, name: p.name, quantity: 1, price: Number(p.salePrice), stock: Number(p.stock), unit: p.unit, type: p.type }];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const q = Math.max(0, Math.min(l.quantity + delta, l.type === "producto" ? l.stock : 999));
          return { ...l, quantity: q };
        })
        .filter((l) => l.quantity > 0)
    );
  };

  const setPrice = (productId: string, price: number) => {
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, price } : l)));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, l) => acc + l.quantity * l.price, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* COLUMNA IZQUIERDA: productos */}
      <div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Buscar producto..."
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:max-h-[420px]">
            {filtered.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-neutral-500">
                No encontramos productos. Regístralos en "Mis productos".
              </p>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="flex flex-col rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-brand-500 hover:shadow-sm"
              >
                <span className="text-2xl">{p.type === "servicio" ? "💼" : "📦"}</span>
                <span className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-800">{p.name}</span>
                <span className="mt-1 text-sm font-bold text-brand-600">{formatSoles(p.salePrice)}</span>
                {p.type === "producto" && (
                  <span className="text-[11px] text-neutral-400">Stock: {Number(p.stock)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA: carrito */}
      <div className="space-y-4">
        <form action={formAction} className="rounded-2xl border border-neutral-200 bg-white p-4">
          {/* Cliente */}
          <div className="mb-3">
            <label className="mb-1 block text-sm font-semibold text-neutral-700">Cliente</label>
            <select
              name="customer_id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base"
            >
              <option value="">Cliente ocasional (sin datos)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.docNumber ? `· ${c.docType} ${c.docNumber}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Carrito */}
          {cart.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-neutral-200 py-10 text-center">
              <p className="text-3xl">🛒</p>
              <p className="mt-2 font-medium text-neutral-600">Tu venta está vacía</p>
              <p className="text-sm text-neutral-400">Toca un producto para agregarlo</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {cart.map((l) => (
                <li key={l.productId} className="py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-neutral-800">{l.name}</p>
                    <button type="button" onClick={() => changeQty(l.productId, -999)} className="text-xs text-neutral-400 hover:text-red-600">
                      ✕
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => changeQty(l.productId, -1)} className="size-8 rounded-lg border border-neutral-300 font-bold text-neutral-600 hover:bg-neutral-50">
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={l.quantity}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v > 0) changeQty(l.productId, v - l.quantity);
                        }}
                        className="w-14 rounded-lg border border-neutral-300 px-2 py-1 text-center"
                      />
                      <button type="button" onClick={() => changeQty(l.productId, 1)} className="size-8 rounded-lg border border-neutral-300 font-bold text-neutral-600 hover:bg-neutral-50">
                        +
                      </button>
                      <span className="text-xs text-neutral-400">{l.unit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-neutral-400">S/</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={l.price}
                        onChange={(e) => setPrice(l.productId, Number(e.target.value))}
                        className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-right"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Método de pago */}
          {cart.length > 0 && (
            <div className="mt-3">
              <label className="mb-1 block text-sm font-semibold text-neutral-700">Método de pago</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-2.5 text-xs font-semibold",
                      paymentMethod === m.value
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                    )}
                  >
                    <span className="text-lg">{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="payment_method" value={paymentMethod} />
              <input type="hidden" name="doc_type" value={docType} />
            </div>
          )}

          {/* Tipo de comprobante */}
          {cart.length > 0 && (
            <div className="mt-3">
              <label className="mb-1 block text-sm font-semibold text-neutral-700">Comprobante</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "boleta", label: "🧾 Boleta" },
                  { value: "factura", label: "📄 Factura" },
                  { value: "proforma", label: "📝 Proforma" },
                  { value: "nota_pedido", label: "📋 Nota de pedido" },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setDocType(t.value)}
                    className={cn(
                      "rounded-xl border-2 px-4 py-2.5 text-sm font-semibold",
                      docType === t.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Items ocultos para el server action */}
          {cart.map((l, i) => (
            <div key={l.productId} className="hidden">
              <input name={`items[${i}][product_id]`} value={l.productId} readOnly />
              <input name={`items[${i}][quantity]`} value={l.quantity} readOnly />
              <input name={`items[${i}][price]`} value={l.price} readOnly />
            </div>
          ))}

          {/* Total */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
            <span className="text-lg font-semibold text-neutral-600">TOTAL</span>
            <span className="text-2xl font-extrabold text-neutral-900">{formatSoles(subtotal)}</span>
          </div>

          {formState.error && (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formState.error}</p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" size="lg" onClick={clearCart} disabled={cart.length === 0}>
              Limpiar
            </Button>
            <Button type="submit" variant="success" size="lg" disabled={cart.length === 0}>
              Registrar venta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}