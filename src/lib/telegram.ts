import "server-only";

/**
 * Mengirim pesan lewat bot Telegram.
 *
 * Token botnya hanya ada di pengaturan peladen dan tidak pernah
 * sampai ke peramban maupun ke database: ia rahasia milik aplikasi,
 * bukan data unit.
 */

const ALAMAT = "https://api.telegram.org";

export function tokenTelegramAda(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** Membuat tulisan aman dipasang pada pesan ber-HTML Telegram. */
export function aman(teks: string): string {
  return teks
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type HasilKirim = { ok: true } | { ok: false; pesan: string };

export async function kirimTelegram(
  chatId: string,
  teks: string,
): Promise<HasilKirim> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return {
      ok: false,
      pesan:
        "Token bot Telegram belum dipasang. Isi TELEGRAM_BOT_TOKEN di pengaturan Vercel, lalu naikkan ulang aplikasinya.",
    };
  }

  try {
    const jawaban = await fetch(`${ALAMAT}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: teks,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (jawaban.ok) return { ok: true };

    // Telegram menjelaskan penolakannya dengan kalimat yang cukup
    // jelas — diteruskan apa adanya, karena menerjemahkannya jadi
    // "gagal mengirim" justru menghapus petunjuknya.
    const isi = (await jawaban.json().catch(() => null)) as
      | { description?: string }
      | null;

    return {
      ok: false,
      pesan: terjemahkan(jawaban.status, isi?.description ?? ""),
    };
  } catch (galat) {
    return {
      ok: false,
      pesan: galat instanceof Error ? galat.message : String(galat),
    };
  }
}

function terjemahkan(status: number, keterangan: string): string {
  if (keterangan.includes("chat not found")) {
    return "Nomor percakapannya tidak dikenali. Pastikan Anda sudah menekan Start di bot itu lebih dulu — Telegram melarang bot memulai percakapan.";
  }

  if (keterangan.includes("bot was blocked")) {
    return "Bot ini diblokir di Telegram Anda. Buka percakapannya lalu tekan Restart.";
  }

  if (status === 401) {
    return "Token botnya ditolak Telegram. Periksa TELEGRAM_BOT_TOKEN di pengaturan Vercel.";
  }

  return `Telegram menolak (kode ${status})${keterangan ? `: ${keterangan}` : ""}.`;
}

/**
 * Mengirim berkas lewat bot Telegram.
 *
 * Dipakai mengirim kalender dalam bentuk PDF. Naskah kalender jauh
 * melewati batas satu pesan Telegram (4.096 huruf), dan tabel
 * sembilan kolom tidak mungkin terbaca sebagai tulisan biasa di
 * layar HP — jadi yang dikirim berkasnya, bukan isinya.
 */
export async function kirimBerkasTelegram(
  chatId: string,
  namaBerkas: string,
  isi: Uint8Array,
  keterangan: string,
): Promise<HasilKirim> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, pesan: "Token bot Telegram belum dipasang." };

  const kiriman = new FormData();
  kiriman.append("chat_id", chatId);
  kiriman.append("parse_mode", "HTML");
  // Telegram memotong keterangan berkas pada 1.024 huruf, dan
  // memotongnya sendiri lebih baik daripada ditolak seluruhnya.
  kiriman.append("caption", keterangan.slice(0, 1000));
  kiriman.append(
    "document",
    new Blob([new Uint8Array(isi)], { type: "application/pdf" }),
    namaBerkas,
  );

  try {
    const jawaban = await fetch(`${ALAMAT}/bot${token}/sendDocument`, {
      method: "POST",
      body: kiriman,
    });

    if (jawaban.ok) return { ok: true };

    const isiJawaban = (await jawaban.json().catch(() => null)) as
      | { description?: string }
      | null;

    return {
      ok: false,
      pesan: terjemahkan(jawaban.status, isiJawaban?.description ?? ""),
    };
  } catch (galat) {
    return { ok: false, pesan: galat instanceof Error ? galat.message : String(galat) };
  }
}
