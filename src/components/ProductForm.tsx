"use client";

import { useActionState } from "react";
import { createProductAction, updateProductAction } from "@/app/actions/products";
import { Input, Select, Textarea, Switch, Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { useState } from "react";

type Props = {
  categories: { id: string; name: string }[];
  product?: {
    id: string;
    name: string;
    description: string | null;
    categoryId: string | null;
    code: string | null;
    brand: string | null;
    type: string;
    unit: string;
    purchasePrice: string | number;
    salePrice: string | number;
    stock: string | number;
    minStock: string | number;
    trackStock: boolean;
  };
};

export default function ProductForm({ categories, product }: Props) {
  const action = product ? updateProductAction : createProductAction;
  const [formState, formAction] = useActionState(action, {});
  const [trackStock, setTrackStock] = useState(product?.trackStock ?? true);
  const isService = product?.type === "servicio";

  return (
    <form action={formAction} className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo">
          <Select name="type" defaultValue={product?.type ?? "producto"} disabled={isService}>
            <option value="producto">Producto físico</option>
            <option value="servicio">Servicio</option>
          </Select>
        </Field>
        <Field label="Unidad de medida">
          <Select name="unit" defaultValue={product?.unit ?? "UNIDAD"}>
            <option value="UNIDAD">Unidad</option>
            <option value="KG">Kilogramo</option>
            <option value="GR">Gramo</option>
            <option value="L">Litro</option>
            <option value="M">Metro</option>
            <option value="HORA">Hora</option>
            <option value="PAQUETE">Paquete</option>
          </Select>
        </Field>
      </div>

      <Input label="Nombre *" name="name" defaultValue={product?.name} placeholder="Ej: Chullo artesanal" required />
      <Textarea label="Descripción" name="description" defaultValue={product?.description ?? ""} placeholder="Opcional" />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoría">
          <Select name="category_id" defaultValue={product?.categoryId ?? ""}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Input label="Código" name="code" defaultValue={product?.code ?? ""} placeholder="Ej: ART-001" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Precio de compra (S/)" name="purchase_price" type="number" step="0.01" min="0" defaultValue={product?.purchasePrice ?? ""} placeholder="Ej: 10.00" />
        <Input label="Precio de venta (S/) *" name="sale_price" type="number" step="0.01" min="0" defaultValue={product?.salePrice ?? ""} placeholder="Ej: 35.00" required />
      </div>

      {trackStock && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Stock inicial" name="stock" type="number" step="0.01" min="0" defaultValue={product?.stock ?? ""} placeholder="Ej: 20" />
          <Input label="Stock mínimo (alerta)" name="min_stock" type="number" step="0.01" min="0" defaultValue={product?.minStock ?? ""} placeholder="Ej: 5" />
        </div>
      )}

      <Switch
        label="¿Controlar stock?"
        description="Actívalo para productos físicos que se agotan"
        checked={trackStock}
        onChange={setTrackStock}
        name="track_stock"
      />

      {formState.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formState.error}</p>
      )}

      <div className="pt-2">
        <SubmitButton fullWidth size="lg">
          {product ? "Guardar cambios" : "Guardar producto"}
        </SubmitButton>
      </div>
    </form>
  );
}