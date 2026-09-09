"use client";

import { useEffect } from "react";

/**
 * Memberi tanda bahwa tombol memang tertekan.
 *
 * Satu penyimak untuk seluruh halaman, dipasang sekali di tata letak.
 * Alternatifnya menambahkan kelas di setiap tombol satu per satu —
 * dan tombol yang dibuat bulan depan pasti terlewat.
 *
 * Dipasang pada tahap capture supaya tetap jalan walaupun tombolnya
 * menghentikan penyebaran peristiwa, dan memakai pointerdown supaya
 * kedipnya muncul saat ditekan, bukan setelah dilepas.
 */
export default function Kedip() {
  useEffect(() => {
    const jeda = new Map<Element, number>();

    function tekan(e: Event) {
      const sasaran = e.target;
      if (!(sasaran instanceof Element)) return;

      const tombol = sasaran.closest(
        'button, a[href], summary, [role="button"], label[for]',
      );
      if (!tombol) return;
      if (tombol.hasAttribute("disabled")) return;
      if (tombol.getAttribute("aria-disabled") === "true") return;

      // Animasi yang sedang berjalan harus dihentikan dan dipaksa
      // dihitung ulang; tanpa ini, tekanan kedua beruntun tidak
      // memicu apa pun karena kelasnya sudah terpasang.
      window.clearTimeout(jeda.get(tombol));
      tombol.classList.remove("ditekan");
      void (tombol as HTMLElement).offsetWidth;
      tombol.classList.add("ditekan");

      jeda.set(
        tombol,
        window.setTimeout(() => {
          tombol.classList.remove("ditekan");
          jeda.delete(tombol);
        }, 320),
      );
    }

    document.addEventListener("pointerdown", tekan, true);
    return () => {
      document.removeEventListener("pointerdown", tekan, true);
      jeda.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return null;
}
