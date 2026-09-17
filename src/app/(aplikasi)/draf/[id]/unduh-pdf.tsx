"use client";

import { useState } from "react";
import Link from "next/link";
import Ikon from "@/components/ikon";
import type { KopSurat } from "@/lib/kop-surat";

/**
 * Mengunduh naskah draf sebagai PDF, dengan kop surat pilihan.
 *
 * Kopnya dipilih di sini, bukan dipasang mati: modul yang sama
 * juga dipakai menyusun konten untuk rumah sakit atau klinik lain,
 * dan dokumen untuk mereka jelas tidak boleh berkop RSPUR.
 */
export function UnduhPdf({ drafId, kop }: { drafId: number; kop: KopSurat[] }) {
  const bawaan = kop.find((k) => k.bawaan);
  const [pilih, setPilih] = useState<string>(
    bawaan ? String(bawaan.id) : kop[0] ? String(kop[0].id) : "tanpa",
  );

  const kecil =
    "rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {kop.length > 0 && (
        <label className="flex items-center gap-1.5 text-xs text-tinta-3">
          Kop
          <select
            value={pilih}
            onChange={(e) => setPilih(e.target.value)}
            className="rounded border border-garis bg-permukaan px-2 py-1 text-xs outline-none focus:border-hijau"
          >
            {kop.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
                {k.bawaan ? " (bawaan)" : ""}
              </option>
            ))}
            <option value="tanpa">Tanpa kop</option>
          </select>
        </label>
      )}

      <a
        href={`/draf/${drafId}/pdf?kop=${pilih}`}
        className={`${kecil} inline-flex items-center gap-1.5`}
      >
        <Ikon nama="unduh" ukuran={14} />
        Unduh PDF
      </a>

      {/* Selama belum ada kop, ini tombol penuh — bukan tulisan
          kecil di ujung baris. Yang belum pernah memasang kop tidak
          tahu ada halaman itu, dan tautan samar di antara deretan
          tombol tidak akan pernah terlihat. Sesudah ada kopnya,
          barulah ia menyusut jadi tautan biasa. */}
      {kop.length === 0 ? (
        <Link
          prefetch={false}
          href="/kop-surat"
          className="inline-flex items-center gap-1.5 rounded border border-hijau px-3 py-1.5 text-xs font-medium text-hijau hover:bg-hijau-muda"
        >
          <Ikon nama="tambah" ukuran={13} />
          Pasang kop surat
        </Link>
      ) : (
        <Link
          prefetch={false}
          href="/kop-surat"
          className="text-xs text-tinta-3 hover:text-tinta"
        >
          Kelola kop surat
        </Link>
      )}
    </div>
  );
}
