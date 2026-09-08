"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type HasilMasuk = { pesan: string | null };

/** Memproses formulir masuk. Pesan galat ditulis untuk dibaca orang, bukan mesin. */
export async function masuk(
  _sebelumnya: HasilMasuk,
  formData: FormData,
): Promise<HasilMasuk> {
  const email = String(formData.get("email") ?? "").trim();
  const sandi = String(formData.get("sandi") ?? "");
  const lanjut = String(formData.get("lanjut") ?? "/");

  if (!email || !sandi) {
    return { pesan: "Email dan kata sandi harus diisi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: sandi,
  });

  if (error) {
    return {
      pesan:
        error.message === "Invalid login credentials"
          ? "Email atau kata sandi tidak cocok."
          : `Tidak bisa masuk: ${error.message}`,
    };
  }

  redirect(lanjut.startsWith("/") ? lanjut : "/");
}

export async function keluar() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
