import Link from "next/link";
import Ikon from "@/components/ikon";
import Kedip from "@/components/kedip";
import Lonceng from "@/components/lonceng";
import Navigasi, { type ButirMenu } from "@/components/navigasi";
import { keluar } from "@/lib/auth-actions";
import { bolehMcu, bolehSosmed, penggunaBerhak, punyaIzin } from "@/lib/akses";
import { bacaIdentitas } from "@/lib/identitas";
import { bacaLonceng } from "@/lib/notifikasi";
import { gayaWarna } from "@/lib/gaya-warna";

const MENU: ButirMenu[] = [
  { href: "/", label: "Modul", ikon: "modul" },
  { href: "/riwayat", label: "Riwayat Dokumen", ikon: "template" },
  { href: "/tampilan", label: "Tampilan", ikon: "tampilan" },
];

/** Hanya untuk Digital Marketing. */
const MENU_SOSMED: ButirMenu = {
  href: "/laporan",
  label: "Laporan Media Sosial",
  ikon: "laporan",
};

/** Hanya untuk pemegang izin MCU — Marketing. */
const MENU_MCU: ButirMenu = { href: "/mcu", label: "MCU", ikon: "mcu" };

/** Hanya Humas dan Digital Marketing — bukan Koordinator, bukan Admin. */
const MENU_DRAF: ButirMenu = { href: "/draf", label: "Draf Bersama", ikon: "obrolan" };

/** Sumber nama dokter dan layanan yang boleh disebut AI dalam konten. */
const MENU_DOKTER: ButirMenu = {
  href: "/dokter",
  label: "Dokter & Layanan",
  ikon: "pengguna",
};

/** Hari kesehatan dan isu yang sedang ramai, bahan usulan tema. */
const MENU_ISU: ButirMenu = { href: "/isu", label: "Bahan Tema", ikon: "waktu" };

/** Kop surat untuk berkas PDF yang diunduh dari draf. */
const MENU_KOP: ButirMenu = { href: "/kop-surat", label: "Kop Surat", ikon: "surat" };

export default async function LayoutAplikasi({ children }: LayoutProps<"/">) {
  const pengguna = await penggunaBerhak();
  const identitas = await bacaIdentitas();
  const menu: ButirMenu[] = (await bolehSosmed())
    ? [MENU[0], MENU_SOSMED, MENU[1], MENU[2]]
    : [...MENU];

  if (await bolehMcu()) menu.splice(1, 0, MENU_MCU);
  if (await punyaIzin("humas")) {
    menu.splice(1, 0, MENU_DRAF, MENU_DOKTER, MENU_ISU, MENU_KOP);
  }

  const lonceng = await bacaLonceng();

  return (
    <div className="flex min-h-full flex-col">
      {identitas.warnaUtama && <style>{gayaWarna(identitas.warnaUtama)}</style>}

      <Kedip />

      <header className="sticky top-0 z-40 border-b border-garis bg-permukaan/95 backdrop-blur">
        {/* Garis warna rumah sakit di bibir atas layar. */}
        <div className="h-[3px] bg-hijau" />

        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-2.5">
          <Link prefetch={false} href="/" className="mr-auto flex items-center gap-3">
            {identitas.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={identitas.logoUrl}
                alt=""
                className="h-9 w-auto max-w-[7rem] object-contain"
              />
            )}
            <span className="block font-medium">Humas &amp; Pemasaran</span>
          </Link>

          <Navigasi menu={menu} />

          <div className="flex items-center gap-2.5 border-l border-garis pl-4">
            <Lonceng daftar={lonceng.daftar} baru={lonceng.baru} />

            <Link
              prefetch={false}
              href="/profil"
              className="hidden rounded-lg px-2 py-1 text-right leading-tight hover:bg-permukaan-2 sm:block"
              title="Profil saya"
            >
              <span className="block text-sm font-medium">{pengguna.nama}</span>
              <span className="block text-xs text-tinta-3">{pengguna.jabatan}</span>
            </Link>

            <form action={keluar}>
              <button
                type="submit"
                aria-label="Keluar"
                title="Keluar"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-garis text-tinta-2 hover:bg-permukaan-2"
              >
                <Ikon nama="keluar" ukuran={17} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>

      <footer className="border-t border-garis px-5 py-4">
        <p className="mx-auto max-w-6xl text-xs text-tinta-3">
          Humas &amp; Pemasaran — RS Pertamedika Ummi Rosnati
        </p>
      </footer>
    </div>
  );
}
