"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kirimTelegram } from "@/lib/telegram";
import type { Balasan } from "@/lib/hasil";

/**
 * Menyambungkan Telegram sendiri ke bot Humas & Digital Marketing.
 *
 * Nomor percakapannya disimpan di baris pengguna — baris yang sama
 * yang dipakai Dashboard Manajemen Bisnis, karena keduanya memakai
 * database yang sama. Jadi yang sudah menyambungkan di sana tidak
 * perlu menyambungkan lagi di sini.
 */
export async function simpanTelegram(_s: Balasan, formData: FormData): Promise<Balasan> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { ok: false, pesan: "Sesi Anda sudah berakhir. Masuk lagi." };

  const chatId = String(formData.get("telegram_chat_id") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("simpan_telegram", { p_chat_id: chatId });

  if (error) {
    return {
      ok: false,
      pesan: error.message.includes("harus berupa angka")
        ? "Nomor percakapannya harus berupa angka. Tekan Start di bot, nomornya disebutkan di sana."
        : `Gagal disimpan: ${error.message}`,
    };
  }

  revalidatePath("/profil");
  return {
    ok: true,
    pesan: chatId === "" ? "Telegram diputus." : "Telegram tersambung.",
  };
}

/** Mengirim satu pesan percobaan, supaya ketahuan benar-benar sampai. */
export async function kirimUjiTelegram(): Promise<Balasan> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { ok: false, pesan: "Sesi Anda sudah berakhir. Masuk lagi." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("pengguna")
    .select("telegram_chat_id")
    .eq("id", pengguna.id)
    .maybeSingle();

  const chatId = data?.telegram_chat_id;
  if (!chatId) return { ok: false, pesan: "Simpan dulu nomor percakapan Telegram Anda." };

  const kirim = await kirimTelegram(
    chatId,
    [
      `Halo ${pengguna.nama.split(",")[0]}. Telegram Anda sudah tersambung ke Dashboard Humas &amp; Pemasaran.`,
      "",
      "Mulai dengan <b>/kalender</b> lalu ceritakan kampanyenya, atau <b>/bantuan</b> untuk melihat seluruh perintahnya.",
    ].join("\n"),
  );

  return kirim.ok
    ? { ok: true, pesan: "Terkirim. Periksa Telegram Anda." }
    : { ok: false, pesan: kirim.pesan };
}
