/**
 * Lambang bergaris untuk seluruh dashboard.
 *
 * Sengaja gambar sendiri, bukan emoji: emoji dirupakan berbeda oleh
 * tiap sistem — Windows, Android, dan iPhone punya versinya masing-
 * masing — jadi tampilan yang dilihat satu orang belum tentu sama
 * dengan yang dilihat orang lain, dan warnanya sering bertabrakan
 * dengan warna rumah sakit. Lambang bergaris ini mengikuti warna
 * tulisan di sekitarnya, jadi selalu serasi dan sama di mana pun.
 */

export type NamaIkon =
  | "beranda"
  | "penomoran"
  | "komplain"
  | "mcu"
  | "publikasi"
  | "obrolan"
  | "rekap"
  | "pengguna"
  | "tampilan"
  | "template"
  | "hapus"
  | "lonceng"
  | "keluar"
  | "surat"
  | "unduh"
  | "tambah"
  | "centang"
  | "peringatan"
  | "modul"
  | "laporan"
  | "waktu"
  | "tugas"
  | "panah";

const GAMBAR: Record<NamaIkon, string[]> = {
  beranda: ["M3 10.6 12 3.2l9 7.4", "M5.6 9.4V20.3h12.8V9.4", "M9.8 20.3v-5.6h4.4v5.6"],
  penomoran: ["M4.4 9.2h15.2", "M4.4 14.8h15.2", "M10.2 3.6 8.2 20.4", "M15.8 3.6l-2 16.8"],
  komplain: ["M4 5.4h16v11.2h-8.4L7 20.4v-3.8H4z", "M12 8.4v3.6", "M12 14.4h.01"],
  mcu: [
    "M9.2 4.4h5.6v2.2H9.2z",
    "M9.2 5.5H6.4v14.9h11.2V5.5h-2.8",
    "M12 10.2v5.4",
    "M9.3 12.9h5.4",
  ],
  publikasi: ["M3.6 6.4h16.8v3.6H3.6z", "M5.2 10v10.2h13.6V10", "M10 13.4h4"],
  obrolan: ["M4 5.4h16v10.8h-8.4L7 20.4v-4.2H4z", "M8 9.6h8", "M8 12.6h5"],
  rekap: ["M4 20.2h16", "M7.6 20.2v-5.8", "M12 20.2V8.4", "M16.4 20.2V12"],
  pengguna: [
    "M12 11.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z",
    "M4.8 20.2c0-3.7 3.2-5.6 7.2-5.6s7.2 1.9 7.2 5.6",
  ],
  tampilan: ["M12 3.4c0 0 5.6 5.9 5.6 9.5A5.6 5.6 0 1 1 6.4 12.9c0-3.6 5.6-9.5 5.6-9.5z"],
  template: [
    "M6.4 3.6h7.2l4.8 4.8v12H6.4z",
    "M13.6 3.6v4.8h4.8",
    "M9.2 13h6",
    "M9.2 16.4h6",
  ],
  hapus: [
    "M5.4 7h13.2",
    "M9.6 7V4.4h4.8V7",
    "M7 7l1 13.4h8L17 7",
    "M10.4 10.4v6.6",
    "M13.6 10.4v6.6",
  ],
  lonceng: [
    "M12 3.8a5.2 5.2 0 0 0-5.2 5.2c0 4.6-1.6 5.8-1.6 5.8h13.6s-1.6-1.2-1.6-5.8A5.2 5.2 0 0 0 12 3.8z",
    "M10.2 18a2 2 0 0 0 3.6 0",
  ],
  keluar: ["M14 7.4V5.2H5.4v13.6H14v-2.2", "M10 12h10", "M17 9l3 3-3 3"],
  surat: ["M3.6 6h16.8v12H3.6z", "M3.6 6.6 12 13l8.4-6.4"],
  unduh: ["M12 4v10.4", "M8 10.8l4 4 4-4", "M5 19.8h14"],
  tambah: ["M12 5.4v13.2", "M5.4 12h13.2"],
  centang: ["M5 12.6l4.6 4.6L19 7.6"],
  peringatan: ["M12 4.4 21 19.6H3z", "M12 10.2v4", "M12 16.8h.01"],
  modul: ["M4.4 4.4h6v6h-6z", "M13.6 4.4h6v6h-6z", "M4.4 13.6h6v6h-6z", "M13.6 13.6h6v6h-6z"],
  laporan: [
    "M6.4 3.6h7.2l4.8 4.8v12H6.4z",
    "M13.6 3.6v4.8h4.8",
    "M9.4 17v-3",
    "M12 17v-5.4",
    "M14.6 17v-2",
  ],
  waktu: ["M12 4.4a7.6 7.6 0 1 0 0 15.2 7.6 7.6 0 0 0 0-15.2z", "M12 7.8V12l3 1.8"],
  panah: ["M9.6 6.4l5.6 5.6-5.6 5.6"],
  tugas: [
    "M4.4 8.2l1.9 1.9 3.3-3.4",
    "M4.4 16.2l1.9 1.9 3.3-3.4",
    "M12.8 8h6.8",
    "M12.8 16h6.8",
  ],
};

export default function Ikon({
  nama,
  ukuran = 18,
  className = "",
}: {
  nama: NamaIkon;
  ukuran?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={ukuran}
      height={ukuran}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {GAMBAR[nama].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
