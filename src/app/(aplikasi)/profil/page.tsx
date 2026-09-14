import { redirect } from "next/navigation";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { FormTelegram } from "./form-telegram";

/**
 * Halaman profil, isinya satu hal saja: menyambungkan Telegram.
 *
 * Foto dan kata sandi sengaja tidak diulang di sini — keduanya
 * sudah ada di Dashboard Manajemen Bisnis dan memakai data yang
 * sama, jadi menyalinnya ke sini hanya membuat dua tempat yang
 * harus dijaga tetap sama.
 */
export default async function HalamanProfil() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await punyaIzin("humas"))) redirect("/tanpa-akses");

  const supabase = await createClient();
  const { data } = await supabase
    .from("pengguna")
    .select("telegram_chat_id")
    .eq("id", pengguna.id)
    .maybeSingle();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil Saya</h1>
        <p className="mt-1 text-tinta-2">
          {pengguna.nama} · {pengguna.jabatan}
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Telegram
          </h2>
          <p className="mt-1 text-sm text-tinta-2">
            Menyambungkan Telegram membuat Anda bisa menyusun dan memperbaiki
            kalender konten tanpa membuka komputer — dan ikut menerima kalender
            yang dibuat rekan satu unit, walaupun sedang libur.
          </p>
        </div>
        <FormTelegram chatIdAwal={data?.telegram_chat_id ?? null} />
      </section>
    </div>
  );
}
