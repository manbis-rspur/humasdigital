"use client";

import { useState } from "react";
import Ikon from "@/components/ikon";
import { FormDokter } from "./form-dokter";

/**
 * Formulir dokter baru, disembunyikan sampai diminta.
 *
 * Pekerjaan sehari-hari di halaman ini membaca daftar, bukan
 * menambah dokter. Formulir yang selalu terbuka mendorong daftarnya
 * turun jauh ke bawah tanpa alasan.
 */
export function DokterBaru({ daftarPoli }: { daftarPoli: string[] }) {
  const [buka, setBuka] = useState(false);

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="flex w-fit items-center gap-2 rounded-lg border border-garis bg-permukaan px-4 py-2 text-sm font-medium hover:bg-permukaan-2"
      >
        <Ikon nama="tambah" ukuran={15} />
        Tambah dokter
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Dokter baru</h2>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="text-sm text-tinta-3 hover:text-tinta"
        >
          Tutup
        </button>
      </div>
      <FormDokter daftarPoli={daftarPoli} />
    </section>
  );
}
