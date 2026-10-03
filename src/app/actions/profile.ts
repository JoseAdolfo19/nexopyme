"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security";

export type ProfileActionResult = { error?: string; ok?: boolean };

export async function updateProfileAction(
  _prev: ProfileActionResult,
  formData: FormData,
): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión no válida." };

  const name = String(formData.get("name") ?? "").trim();
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");

  if (name.length < 2) return { error: "El nombre debe tener al menos 2 caracteres." };

  if (newPassword) {
    // Limitar intentos de cambio de contraseña por usuario (fuerza bruta
    // de la contraseña actual).
    const rl = rateLimit(`profile-password:${user.id}`, { limit: 5, windowMs: 15 * 60_000 });
    if (!rl.ok) {
      return { error: "Demasiados intentos para cambiar la contraseña. Espera unos minutos." };
    }
    if (newPassword.length < 8) {
      return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return { error: "La contraseña actual no es correcta." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 12) } : {}),
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  return { ok: true };
}
