import Link from "next/link";
import { wajibHumas } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { hapusRiwayat } from "@/lib/humas-actions";
import { TampilHasil } from "@/components/tampil-hasil";

const waktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function HalamanRiwayat({
  searchParams,
}: PageProps<"/riwayat">) {
  await wajibHumas();
  const q = await searchParams;
  const dibuka = typeof q.dokumen === "string" ? Number(q.dokumen) : null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("riwayat_ai")
    .select("id, modul_judul, judul, hasil, pada, pengguna:oleh(nama)")
    .order("pada", { ascending: false })
    .limit(100);

  const riwayat = data ?? [];
  const terbuka = riwayat.find((r) => r.id === dibuka);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link href="/" className="text-sm text-tinta-3 hover:underline">
          ← Kembali ke daftar modul
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Riwayat Dokumen</h1>
        <p className="mt-1 text-tinta-2">
          Seratus dokumen terakhir yang disusun tim. Tersimpan di server, jadi
          tetap ada walau berganti komputer.
        </p>
      </div>

      {terbuka && (
        <div className="flex flex-col gap-3 rounded border border-garis bg-permukaan-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
              {terbuka.modul_judul} · {waktu.format(new Date(terbuka.pada))}
            </p>
            <Link href="/riwayat" className="text-sm text-tinta-3 hover:underline">
              Tutup
            </Link>
          </div>
          <TampilHasil
            judul={terbuka.judul}
            hasil={terbuka.hasil}
            namaBerkas="dokumen-humas"
            riwayatId={terbuka.id}
          />
        </div>
      )}

      {riwayat.length === 0 ? (
        <div className="rounded border border-garis bg-permukaan px-5 py-10 text-center">
          <p className="font-medium">Belum ada dokumen tersimpan.</p>
          <p className="mt-1 text-sm text-tinta-3">
            Dokumen tersimpan sendiri setiap kali sebuah modul dijalankan.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {riwayat.map((r) => {
            const oleh = Array.isArray(r.pengguna) ? r.pengguna[0] : r.pengguna;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-garis bg-permukaan px-4 py-3"
              >
                <div className="mr-auto min-w-0">
                  <Link
                    href={`/riwayat?dokumen=${r.id}`}
                    className="font-medium hover:underline"
                  >
                    {r.judul}
                  </Link>
                  <p className="text-xs text-tinta-3">
                    {r.modul_judul} · {waktu.format(new Date(r.pada))}
                    {oleh && ` · ${oleh.nama}`}
                  </p>
                </div>
                <form action={hapusRiwayat}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="text-xs text-tinta-3 hover:text-merah"
                  >
                    hapus
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
