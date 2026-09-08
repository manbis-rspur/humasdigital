import Link from "next/link";
import { keluar } from "@/lib/auth-actions";
import { bolehSosmed, penggunaBerhak } from "@/lib/akses";
import { bacaIdentitas } from "@/lib/identitas";
import { gayaWarna } from "@/lib/gaya-warna";

const MENU = [
  { href: "/", label: "Modul" },
  { href: "/riwayat", label: "Riwayat Dokumen" },
  { href: "/tampilan", label: "Tampilan" },
] as const;

/** Hanya untuk Digital Marketing. */
const MENU_SOSMED = { href: "/laporan", label: "Laporan Media Sosial" } as const;

export default async function LayoutAplikasi({ children }: LayoutProps<"/">) {
  const pengguna = await penggunaBerhak();
  const identitas = await bacaIdentitas();
  const menu = (await bolehSosmed()) ? [MENU[0], MENU_SOSMED, MENU[1], MENU[2]] : [...MENU];

  return (
    <div className="flex min-h-full flex-col">
      {identitas.warnaUtama && <style>{gayaWarna(identitas.warnaUtama)}</style>}

      <header className="border-b border-garis bg-permukaan">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
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

          <nav className="flex flex-wrap gap-1">
            {menu.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="rounded px-3 py-1.5 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
              >
                {m.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 border-l border-garis pl-4">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-sm font-medium">{pengguna.nama}</span>
              <span className="block text-xs text-tinta-3">{pengguna.jabatan}</span>
            </span>
            <form action={keluar}>
              <button
                type="submit"
                className="rounded border border-garis px-2.5 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
