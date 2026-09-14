import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ambilDariWeb } from "@/lib/dokter-web";
import { ambilLayananDariWeb } from "@/lib/layanan-web";
import { kosongkanDokter, tanamDokter, tanamLayanan } from "@/lib/dokter-simpan";

/**
 * Menyelaraskan daftar dokter dengan situs rspur.co.id, sekali
 * sehari.
 *
 * Dijalankan penjadwal Vercel, bukan orang — jadi tidak ada sesi
 * yang bisa diperiksa, dan aturan tabel dilewati memakai kunci
 * layanan. Penjaganya kunci rahasia di kepala permintaan.
 *
 * Daftarnya diganti seluruhnya, bukan digabung: dokter yang sudah
 * tidak diumumkan lagi di situs memang harus berhenti muncul di
 * konten. Itulah seluruh alasan penyelarasan ini ada.
 */
export async function GET(permintaan: Request) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia) {
    return NextResponse.json({ ok: false, pesan: "CRON_SECRET belum diisi." }, { status: 500 });
  }

  if (permintaan.headers.get("authorization") !== `Bearer ${rahasia}`) {
    return new NextResponse("Tidak berhak.", { status: 401 });
  }

  const dibaca = await ambilDariWeb();
  if (dibaca.dokter === null) {
    // Bukan 500: situs sedang tidak bisa dihubungi itu keadaan
    // wajar, dan daftar lama tetap terpakai sampai besok.
    return NextResponse.json({ ok: false, pesan: dibaca.pesan });
  }

  const supabase = createAdminClient();

  const galatKosong = await kosongkanDokter(supabase);
  if (galatKosong) return NextResponse.json({ ok: false, pesan: galatKosong }, { status: 500 });

  const hasil = await tanamDokter(supabase, dibaca.dokter);
  if (hasil.pesan) return NextResponse.json({ ok: false, pesan: hasil.pesan }, { status: 500 });

  // Daftar layanan menyusul, dan kegagalannya tidak membatalkan
  // penyelarasan dokter yang sudah berhasil.
  const layanan = await ambilLayananDariWeb();
  const hasilLayanan = layanan.layanan
    ? await tanamLayanan(supabase, layanan.layanan)
    : { jumlah: 0, pesan: layanan.pesan };

  return NextResponse.json({
    ok: true,
    dokter: hasil.jumlah,
    poliklinik: new Set(dibaca.dokter.map((d) => d.poliklinik)).size,
    layanan: hasilLayanan.jumlah,
    catatanLayanan: hasilLayanan.pesan ?? undefined,
  });
}
