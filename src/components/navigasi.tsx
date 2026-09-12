"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Ikon, { type NamaIkon } from "@/components/ikon";

export type ButirMenu = {
  href: string;
  label: string;
  ikon: NamaIkon;
};

/**
 * Menu utama, dengan penanda halaman yang sedang dibuka.
 *
 * Penandanya perlu tahu alamat sekarang, dan itu cuma diketahui di
 * sisi peramban — jadi bagian ini saja yang dijadikan komponen
 * peramban, sementara isi menunya tetap disusun di peladen menurut
 * izin masing-masing orang.
 */
export default function Navigasi({ menu }: { menu: ButirMenu[] }) {
  const jalur = usePathname();

  function sedangDibuka(href: string): boolean {
    if (href === "/") return jalur === "/";
    // Cocokkan per ruas, supaya /mcu tidak ikut menyala saat membuka
    // halaman lain yang kebetulan berawalan huruf yang sama.
    const pangkal = `/${href.split("/")[1]}`;
    return jalur === pangkal || jalur.startsWith(`${pangkal}/`);
  }

  return (
    <nav className="flex flex-wrap items-center gap-0.5">
      {menu.map((m) => {
        const aktif = sedangDibuka(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            /* Tanpa ini, Next.js memuat lebih dulu SELURUH halaman di
               menu begitu kepala halaman terlihat. Sepuluh menu berarti
               sepuluh halaman digambar penuh di peladen untuk satu
               kunjungan — beban yang tidak terpakai, dan yang lebih
               buruk: sepuluh pemeriksaan sesi berbarengan. */
            prefetch={false}
            aria-current={aktif ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
              aktif
                ? "bg-hijau-muda text-hijau"
                : "text-tinta-2 hover:bg-permukaan-2"
            }`}
          >
            <Ikon nama={m.ikon} ukuran={16} />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
