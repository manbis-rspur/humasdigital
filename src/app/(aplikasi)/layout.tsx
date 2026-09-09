import Link from "next/link";
import Ikon from "@/components/ikon";
import Kedip from "@/components/kedip";
import Lonceng from "@/components/lonceng";
import Navigasi, { type ButirMenu } from "@/components/navigasi";
import { keluar } from "@/lib/auth-actions";
import { bolehSosmed, penggunaBerhak } from "@/lib/akses";
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

export default async function LayoutAplikasi({ children }: LayoutProps<"/">) {
  const pengguna = await penggunaBerhak();
  const identitas = await bacaIdentitas();
  const menu: ButirMenu[] = (await bolehSosmed())
    ? [MENU[0], MENU_SOSMED, MENU[1], MENU[2]]
    : [...MENU];

  const lonceng = await bacaLonceng();

  return (
    <div className="flex min-h-full flex-col">
      {identitas.warnaUtama && <style>{gayaWarna(identitas.warnaUtama)}</style>}

      <Kedip />

      <header className="sticky top-0 z-40 border-b border-garis bg-permukaan/95 backdrop-blur">
        {/* Garis warna rumah sakit di bibir atas layar. */}
        <div className="h-[3px] bg-hijau" />

        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-2.5">
          <Link href="/" className="mr-auto flex items-center gap-3">
            {identitas.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={identitas.logoUrl}
                alt=""
                className="h-9 w-auto max-w-[7rem] object-contain"
              />
            )}
            <span className="block">
              <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-tinta-3">
                RSPUR
              </span>
              <span className="block font-medium">Humas &amp; Digital Marketing</span>
            </span>
          </Link>

          <Navigasi menu={menu} />

          <div className="flex items-center gap-2.5 border-l border-garis pl-4">
            <Lonceng daftar={lonceng.daftar} baru={lonceng.baru} />

            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-sm font-medium">{pengguna.nama}</span>
              <span className="block text-xs text-tinta-3">{pengguna.jabatan}</span>
            </span>

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
          Humas &amp; Digital Marketing — RS Pertamedika Ummi Rosnati
        </p>
      </footer>
    </div>
  );
}
