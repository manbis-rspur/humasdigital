"use client";

import { useEffect } from "react";

/**
 * Membuka kotak cetak peramban begitu halaman siap.
 *
 * Dari situ formulirnya disimpan sebagai PDF — tanpa perlu Word,
 * dan tanpa perlu perkakas tambahan di server. Peramban sendiri
 * yang membuat PDF-nya, sehingga hasilnya sama persis dengan yang
 * terlihat di layar.
 */
export function PicuCetak() {
  useEffect(() => {
    const jeda = setTimeout(() => window.print(), 400);
    return () => clearTimeout(jeda);
  }, []);

  return (
    <div className="bilah-layar">
      <button type="button" onClick={() => window.print()}>
        Cetak / simpan PDF
      </button>
      <button type="button" onClick={() => window.close()}>
        Tutup
      </button>
    </div>
  );
}
