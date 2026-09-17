import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aman, kirimBerkasTelegram, kirimTelegram } from "@/lib/telegram";
import { jadikanPdf } from "@/lib/markdown-pdf";
import { ambilKop } from "@/lib/kop-data";
import {
  ADMIN_SITUS,
  catatPerubahanJadwal,
  periksaPerubahanJadwal,
  sebutPerubahan,
} from "@/lib/jadwal-telegram";
import {
  perbaikiKalenderLewatTelegram,
  ringkasKalender,
  susunKalenderLewatTelegram,
  type HasilKalender,
} from "@/lib/kalender-telegram";

/**
 * Bot Telegram untuk Humas dan Digital Marketing.
 *
 * Gunanya satu: bisa menyusun dan memperbaiki kalender konten
 * tanpa membuka komputer. Ide yang datang di hari libur tidak
 * perlu menunggu Senin — drafnya sudah ada saat kembali ke meja.
 *
 * Telegram di sini jadi kendali jarak jauh, bukan layar. Perintah
 * dan permintaan perbaikan memang pendek dan enak diketik di HP;
 * kalendernya sendiri sembilan kolom dan belasan ribu huruf, jauh
 * melewati batas satu pesan Telegram — jadi yang dikirim balik
 * ringkasannya, berkas PDF-nya, dan tautan ke drafnya.
 */

export const maxDuration = 60;

const ALAMAT_SITUS =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://humas-pemasaran.vercel.app");

type Kiriman = {
  update_id?: number;
  message?: { text?: string; chat?: { id?: number | string } };
};

const sudah = () => NextResponse.json({ ok: true });

function bantuan(): string {
  return [
    "<b>Cara memakai</b>",
    "",
    "<b>/kalender</b> lalu ceritakan kampanyenya:",
    "<i>/kalender Oktober, angkat Hari Jantung Sedunia, dorong poli jantung, nada hangat</i>",
    "",
    "<b>/perbaiki</b> lalu sebutkan yang kurang:",
    "<i>/perbaiki tambahkan konten donor darah di pekan kedua</i>",
    "",
    "<b>/draf</b> — daftar draf terakhir Anda",
    "",
    "<b>/jadwal</b> lalu sebutkan perubahan jadwal dokternya:",
    "<i>/jadwal Sabtu dr. Nurjannah libur, diganti dr. Wahdini jam 10-12</i>",
    "",
    "<b>/cek</b> — memeriksa apakah perubahan tadi sudah terbit di rspur.co.id",
    "",
    "Hasil kalender masuk ke Draf Bersama dan dikirim balik ke sini sebagai PDF.",
    "Menyetujui dan mengirim ke Koordinator tetap lewat web — itu perlu dibaca utuh.",
    "Jadwal dokter juga tetap Anda ubah sendiri di admin situs; saya mencatat dan memeriksa.",
  ].join("\n");
}

function namaBerkas(judul: string): string {
  const bersih = judul
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${bersih || "kalender"}.pdf`;
}

/** Membalas hasil penyusunan: ringkasan, tautan, lalu berkasnya. */
async function balasHasil(chat: string, h: HasilKalender, kepala: string) {
  const baris = [
    `✅ <b>${kepala}</b>`,
    "",
    aman(h.judul),
    ringkasKalender(h.hasil ?? ""),
    "",
    `Buka &amp; sunting: ${ALAMAT_SITUS}/draf/${h.drafId}`,
  ];

  if (h.pesan) baris.push("", `⚠️ ${aman(h.pesan)}`);

  await kirimTelegram(chat, baris.join("\n"));

  try {
    const pdf = jadikanPdf(h.judul, h.hasil ?? "", await ambilKop());
    await kirimBerkasTelegram(chat, namaBerkas(h.judul), pdf, aman(h.judul));
  } catch (galat) {
    // Berkasnya gagal dibuat, tapi kalendernya sudah tersimpan.
    // Menyebut itu terang jauh lebih baik daripada diam, karena
    // yang menunggu berkas akan mengira seluruhnya gagal.
    const pesan = galat instanceof Error ? galat.message : String(galat);
    await kirimTelegram(
      chat,
      `PDF-nya gagal dibuat (${aman(pesan)}), tapi kalendernya sudah tersimpan di draf.`,
    );
  }
}

/**
 * Mengabari rekan satu unit bahwa ada kalender baru.
 *
 * Draf Bersama itu ruang kerja berdua. Kalender yang disusun pada
 * hari libur tapi tidak diketahui siapa pun sampai Senin cuma
 * setengah berguna — yang ditunggu justru masukan dari sebelah.
 *
 * Berkasnya ikut dikirim, bukan cuma tautannya: yang sedang libur
 * membuka PDF di HP jauh lebih mungkin daripada membuka dashboard.
 */
async function kabariRekan(
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  db: any,
  penyusunId: number,
  penyusunNama: string,
  h: HasilKalender,
) {
  const { data: rekan } = await db
    .from("pengguna")
    .select("id, nama, telegram_chat_id, akses_modul!inner(modul)")
    .eq("akses_modul.modul", "humas")
    .neq("id", penyusunId)
    .not("telegram_chat_id", "is", null);

  if (!rekan || rekan.length === 0) return;

  let pdf: Uint8Array | null = null;
  try {
    pdf = jadikanPdf(h.judul, h.hasil ?? "", await ambilKop());
  } catch {
    // Tanpa berkas pun kabarnya tetap layak dikirim.
  }

  const pesan = [
    `📄 <b>Kalender baru dari ${aman(penyusunNama.split(",")[0])}</b>`,
    "",
    aman(h.judul),
    ringkasKalender(h.hasil ?? ""),
    "",
    `Baca &amp; beri masukan: ${ALAMAT_SITUS}/draf/${h.drafId}`,
  ].join("\n");

  for (const r of rekan as { telegram_chat_id: string }[]) {
    await kirimTelegram(r.telegram_chat_id, pesan);
    if (pdf) {
      await kirimBerkasTelegram(r.telegram_chat_id, namaBerkas(h.judul), pdf, aman(h.judul));
    }
  }
}

export async function POST(permintaan: Request) {
  const rahasia = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!rahasia) return sudah();

  if (permintaan.headers.get("x-telegram-bot-api-secret-token") !== rahasia) {
    return new NextResponse("Tidak berhak.", { status: 401 });
  }

  let isi: Kiriman;
  try {
    isi = (await permintaan.json()) as Kiriman;
  } catch {
    return sudah();
  }

  const chatId = isi.message?.chat?.id;
  const teks = (isi.message?.text ?? "").trim();
  if (chatId === undefined || teks === "") return sudah();

  const chat = String(chatId);
  const db = createAdminClient();

  /**
   * Nomor pesan dicatat lebih dulu, sebelum apa pun dikerjakan.
   *
   * Menyusun kalender butuh setengah menit, dan Telegram mengirim
   * ulang pesan yang belum dijawab. Nomor yang sudah tercatat
   * berarti pesan itu sedang dikerjakan — kiriman ulangnya berhenti
   * di sini, bukan jadi kalender kedua.
   */
  if (typeof isi.update_id === "number") {
    const { error } = await db
      .from("telegram_pesan")
      .insert({ update_id: isi.update_id });

    // Hanya nomor kembar yang berarti "sudah dikerjakan". Sebab
    // lain — tabelnya belum ada, database sedang terganggu —
    // tidak boleh membuat bot diam total tanpa ada yang tahu;
    // lebih baik dikerjakan dengan risiko kembar daripada
    // perintahnya hilang tanpa jejak.
    if (error?.code === "23505") return sudah();
  }

  const { data: pengguna } = await db
    .from("pengguna")
    .select("id, nama")
    .eq("telegram_chat_id", chat)
    .maybeSingle();

  if (!pengguna) {
    await kirimTelegram(
      chat,
      [
        "Nomor percakapan ini belum tersambung ke Dashboard Humas &amp; Pemasaran.",
        "",
        `Nomor percakapan Anda: <b>${chat}</b>`,
        "",
        `Buka ${ALAMAT_SITUS} dan tempelkan nomor itu di halaman Profil.`,
      ].join("\n"),
    );
    return sudah();
  }

  // Draf Bersama hanya untuk Humas dan Digital Marketing, dan bot
  // ini tidak boleh jadi pintu belakang yang melewati aturan itu.
  const { data: izin } = await db
    .from("akses_modul")
    .select("modul")
    .eq("pengguna_id", pengguna.id)
    .eq("modul", "humas")
    .maybeSingle();

  if (!izin) {
    await kirimTelegram(
      chat,
      "Bot ini hanya untuk Humas dan Digital Marketing.",
    );
    return sudah();
  }

  const spasi = teks.indexOf(" ");
  const perintah = (spasi === -1 ? teks : teks.slice(0, spasi)).toLowerCase().split("@")[0];
  const sisa = spasi === -1 ? "" : teks.slice(spasi + 1).trim();

  if (perintah === "/start") {
    await kirimTelegram(
      chat,
      `Halo ${aman(pengguna.nama.split(",")[0])}. Telegram Anda sudah tersambung.\n\n${bantuan()}`,
    );
    return sudah();
  }

  if (perintah === "/bantuan" || perintah === "/help") {
    await kirimTelegram(chat, bantuan());
    return sudah();
  }

  if (perintah === "/draf") {
    const { data: daftar } = await db
      .from("draf")
      .select("id, judul, status, dibuat_pada")
      .eq("dibuat_oleh", pengguna.id)
      .order("dibuat_pada", { ascending: false })
      .limit(5);

    if (!daftar || daftar.length === 0) {
      await kirimTelegram(chat, "Belum ada draf yang Anda buat.");
      return sudah();
    }

    await kirimTelegram(
      chat,
      ["<b>Draf terakhir Anda</b>", ""]
        .concat(
          daftar.map(
            (d) =>
              `• ${aman(d.judul)} — ${aman(d.status)}\n  ${ALAMAT_SITUS}/draf/${d.id}`,
          ),
        )
        .join("\n"),
    );
    return sudah();
  }

  if (perintah === "/jadwal") {
    if (sisa === "") {
      await kirimTelegram(
        chat,
        "Sebutkan perubahannya sesudah perintahnya. Contoh:\n<i>/jadwal Sabtu dr. Nurjannah libur, diganti dr. Wahdini jam 10-12</i>",
      );
      return sudah();
    }

    const hasil = await catatPerubahanJadwal(pengguna.id, sisa);

    if (!hasil.ok) {
      await kirimTelegram(chat, `Gagal: ${aman(hasil.pesan)}`);
      return sudah();
    }

    const baris = ["📋 <b>Perubahan yang perlu diterapkan</b>", ""];

    hasil.dicatat.forEach((p, urutan) => {
      baris.push(
        `${urutan + 1}. <b>${aman(p.dokter_nama)}</b>` +
          (p.poliklinik ? ` — ${aman(p.poliklinik)}` : ""),
        `   ${aman(sebutPerubahan(p))}`,
      );
    });

    if (hasil.belumCocok.length > 0) {
      baris.push(
        "",
        `⚠️ Nama ini tidak ada di daftar dokter: ${aman(hasil.belumCocok.join(", "))}. ` +
          `Saya tetap catat, tapi periksa ejaannya.`,
      );
    }

    if (hasil.pesan) baris.push("", `⚠️ ${aman(hasil.pesan)}`);

    baris.push(
      "",
      `Ubah di admin situs: ${ADMIN_SITUS}`,
      "Sudah diubah? Balas <b>/cek</b> — saya baca ulang situsnya.",
    );

    await kirimTelegram(chat, baris.join("\n"));
    return sudah();
  }

  if (perintah === "/cek") {
    await kirimTelegram(chat, "Sedang membaca rspur.co.id…");

    const hasil = await periksaPerubahanJadwal();

    if (!hasil.ok) {
      await kirimTelegram(chat, `Gagal memeriksa: ${aman(hasil.pesan)}`);
      return sudah();
    }

    if (hasil.pesan) {
      await kirimTelegram(chat, hasil.pesan);
      return sudah();
    }

    const baris: string[] = [];

    if (hasil.sudah.length > 0) {
      baris.push("✅ <b>Sudah terbit di situs</b>");
      for (const { p } of hasil.sudah) {
        baris.push(`• ${aman(p.dokter_nama)} — ${aman(sebutPerubahan(p))}`);
      }
      baris.push("");
    }

    if (hasil.belum.length > 0) {
      baris.push("⚠️ <b>Belum berubah di situs</b>");
      for (const { p, sekarang } of hasil.belum) {
        baris.push(
          `• ${aman(p.dokter_nama)} — ${aman(sebutPerubahan(p))}`,
          `   sekarang masih: ${aman(sekarang)}`,
        );
      }
      baris.push("", `Ubah di admin situs: ${ADMIN_SITUS}`);
    }

    if (hasil.ragu.length > 0) {
      baris.push("", "❓ <b>Tidak bisa saya pastikan sendiri</b>");
      for (const p of hasil.ragu) {
        baris.push(`• ${aman(p.instruksi.slice(0, 120))}`);
      }
    }

    await kirimTelegram(chat, baris.join("\n"));
    return sudah();
  }

  if (perintah === "/kalender" || perintah === "/perbaiki") {
    if (sisa === "") {
      await kirimTelegram(
        chat,
        perintah === "/kalender"
          ? "Ceritakan kampanyenya sesudah perintahnya. Contoh:\n<i>/kalender Oktober, angkat Hari Jantung Sedunia, dorong poli jantung</i>"
          : "Sebutkan yang perlu diperbaiki. Contoh:\n<i>/perbaiki tambahkan konten donor darah di pekan kedua</i>",
      );
      return sudah();
    }

    await kirimTelegram(
      chat,
      perintah === "/kalender"
        ? "Sedang disusun, sekitar setengah menit…"
        : "Sedang diperbaiki, sekitar setengah menit…",
    );

    const hasil =
      perintah === "/kalender"
        ? await susunKalenderLewatTelegram(pengguna.id, sisa)
        : await perbaikiKalenderLewatTelegram(pengguna.id, sisa);

    if (!hasil.ok) {
      await kirimTelegram(chat, `Gagal: ${aman(hasil.pesan)}`);
      return sudah();
    }

    await balasHasil(
      chat,
      hasil,
      perintah === "/kalender" ? "Kalender tersusun" : "Draf diperbaiki",
    );

    // Hanya kalender baru yang dikabarkan ke rekan. Tiap perbaikan
    // kecil ikut dikabarkan berarti rekan dibanjiri berkas yang
    // hampir sama — dan yang dibanjiri berhenti membaca.
    if (perintah === "/kalender") {
      await kabariRekan(db, pengguna.id, pengguna.nama, hasil);
    }

    // Sekalian membuang catatan pesan lama, supaya tidak perlu
    // penjadwal tersendiri yang jatahnya memang terbatas.
    await db.rpc("bersihkan_telegram_pesan");
    return sudah();
  }

  await kirimTelegram(
    chat,
    perintah.startsWith("/")
      ? `Perintah ${aman(perintah)} belum ada.\n\n${bantuan()}`
      : `Mulai dengan sebuah perintah supaya tidak salah tafsir.\n\n${bantuan()}`,
  );
  return sudah();
}
