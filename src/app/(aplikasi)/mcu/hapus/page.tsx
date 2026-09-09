import Link from "next/link";
import { wajibAdmin } from "@/lib/auth";
import { wajibMcu } from "@/lib/akses";
import { createAdminClient } from "@/lib/supabase/admin";
import { keteranganHapus } from "@/lib/hapus-mcu-actions";
import { KotakHapus } from "./kotak-hapus";

const waktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function HalamanHapusMcu() {
  await wajibMcu();
  await wajibAdmin();

  const db = createAdminClient();
  const kumpulan = await keteranganHapus();

  const { count } = await db
    .from("mcu_penawaran")
    .select("*", { count: "exact", head: true });

  // Riwayatnya satu untuk seluruh data unit, walaupun dashboardnya
  // dua — di sini yang ditampilkan penghapusan MCU saja.
  const { data: catatan } = await db
    .from("log_hapus_data")
    .select("id, keterangan, jumlah, nama_oleh, pada")
    .eq("jenis", "mcu")
    .order("pada", { ascending: false })
    .limit(20);

  return (
    <div className="max-w-2xl">
      <Link href="/mcu" className="text-sm text-tinta-3 hover:underline">
        ← Kembali ke daftar penawaran
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Hapus Data Penawaran
      </h1>
      <p className="mt-1 text-tinta-2">
        Mengosongkan seluruh penawaran MCU. Dipakai saat menyiapkan sistem —
        bukan saat sudah berjalan.
      </p>

      <div className="mt-6 rounded-lg border-l-2 border-merah bg-permukaan-2 px-4 py-3">
        <p className="text-sm font-medium">Tidak bisa dibatalkan.</p>
        <p className="mt-1 text-sm text-tinta-2">
          Di luar halaman ini tidak ada satu pun cara menghapus penawaran —
          bahkan bagi Admin. Aturannya memang begitu: yang keliru ditandai
          batal, tidak dilenyapkan. Halaman ini satu-satunya pengecualian, dan
          setiap pemakaiannya dicatat.
        </p>
      </div>

      <div className="mt-6">
        <KotakHapus
          nama={kumpulan.nama}
          penegasan={kumpulan.penegasan}
          keterangan={kumpulan.keterangan}
          jumlah={count ?? 0}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Catatan penghapusan
        </h2>
        {(catatan ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-tinta-3">Belum pernah ada penghapusan.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {(catatan ?? []).map((c) => (
              <li key={c.id} className="border-l-2 border-garis pl-3">
                <p className="text-sm">
                  {c.keterangan} — {c.jumlah} baris
                </p>
                <p className="text-xs text-tinta-3">
                  {waktu.format(new Date(c.pada))} · {c.nama_oleh}
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-tinta-3">
          Catatan ini permanen — tidak bisa dihapus oleh siapa pun, termasuk
          Admin.
        </p>
      </section>
    </div>
  );
}
