"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { kecilkanLogo } from "@/lib/kecilkan-logo";
import { warnaDariGambar, jadikanTerbaca, kontrasDenganPutih } from "@/lib/warna";
import { simpanIdentitas } from "@/lib/identitas-actions";

const MAKS_ASLI = 10 * 1024 * 1024;
const BAWAAN = "#1b6156";

export function FormIdentitas({
  logoAwal,
  warnaAwal,
}: {
  logoAwal: string | null;
  warnaAwal: string | null;
}) {
  const router = useRouter();
  const berkasRef = useRef<HTMLInputElement>(null);

  const [logo, setLogo] = useState(logoAwal);
  const [warna, setWarna] = useState(warnaAwal ?? BAWAAN);
  const [usulan, setUsulan] = useState<string[]>([]);
  const [pesan, setPesan] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function pilih(berkas: File) {
    setGalat(null);
    setPesan(null);

    if (berkas.size > MAKS_ASLI) {
      setGalat("Berkasnya terlalu besar. Maksimal 10 MB.");
      return;
    }

    setSibuk(true);
    try {
      const kecil = await kecilkanLogo(berkas);

      // Warna dicari dari logo yang sudah diperkecil, lalu tiap
      // usulan digelapkan seperlunya supaya tulisan putih di
      // atasnya tetap terbaca.
      const mentah = await warnaDariGambar(kecil);
      const rapi = [...new Set(mentah.map(jadikanTerbaca))];
      setUsulan(rapi);

      const db = createClient();
      const jalur = `logo/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

      const { error } = await db.storage.from("publik").upload(jalur, kecil, {
        contentType: "image/png",
        upsert: false,
      });

      if (error) {
        setGalat("Gagal mengunggah: " + error.message);
        return;
      }

      const { data } = db.storage.from("publik").getPublicUrl(jalur);
      setLogo(data.publicUrl);

      const warnaBaru = rapi[0] ?? warna;
      setWarna(warnaBaru);

      const h = await simpanIdentitas(data.publicUrl, warnaBaru);
      if (h.ok) {
        setPesan(
          rapi.length > 1
            ? "Logo tersimpan. Warnanya sudah diambil dari logo — pilih yang lain di bawah kalau kurang cocok."
            : "Logo tersimpan.",
        );
        router.refresh();
      } else {
        setGalat(h.pesan);
      }
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal mengolah gambar.");
    } finally {
      setSibuk(false);
      if (berkasRef.current) berkasRef.current.value = "";
    }
  }

  async function pakaiWarna(pilihan: string) {
    setSibuk(true);
    setGalat(null);
    setPesan(null);
    setWarna(pilihan);

    const h = await simpanIdentitas(logo, pilihan);
    if (h.ok) {
      setPesan("Warna aplikasi sudah diganti.");
      router.refresh();
    } else {
      setGalat(h.pesan);
    }
    setSibuk(false);
  }

  async function buangLogo() {
    setSibuk(true);
    const h = await simpanIdentitas(null, warna);
    if (h.ok) {
      setLogo(null);
      setUsulan([]);
      setPesan("Logo dihapus.");
      router.refresh();
    } else {
      setGalat(h.pesan);
    }
    setSibuk(false);
  }

  const daftarWarna = [...new Set([...usulan, warna, BAWAAN])];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Logo
        </h2>

        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-garis bg-permukaan p-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Logo RSPUR" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-tinta-3">Belum ada</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sibuk}
                onClick={() => berkasRef.current?.click()}
                className="rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {sibuk ? "Memproses…" : logo ? "Ganti logo" : "Unggah logo"}
              </button>
              {logo && (
                <button
                  type="button"
                  disabled={sibuk}
                  onClick={buangLogo}
                  className="rounded-lg border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-60"
                >
                  Hapus logo
                </button>
              )}
            </div>
            <p className="text-xs text-tinta-3">
              PNG dengan latar tembus pandang paling bagus. Maksimal 10 MB.
            </p>
          </div>
        </div>

        <input
          ref={berkasRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const b = e.target.files?.[0];
            if (b) pilih(b);
          }}
        />
      </section>

      <section className="flex flex-col gap-4 border-t border-garis pt-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Warna dashboard
          </h2>
          <p className="mt-1 text-sm text-tinta-2">
            {usulan.length > 0
              ? "Warna di bawah diambil dari logo yang baru diunggah. Semuanya sudah disesuaikan supaya tulisan putih di atasnya tetap terbaca."
              : "Unggah logo untuk mendapat usulan warna, atau pakai warna bawaan."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {daftarWarna.map((w) => (
            <button
              key={w}
              type="button"
              disabled={sibuk}
              onClick={() => pakaiWarna(w)}
              style={{ background: w }}
              className={`flex h-16 w-24 flex-col items-center justify-center rounded text-[0.7rem] font-medium text-white transition disabled:opacity-60 ${
                w === warna ? "ring-2 ring-tinta ring-offset-2" : ""
              }`}
              aria-label={`Pakai warna ${w}`}
            >
              <span className="font-mono">{w}</span>
              {w === warna && <span className="mt-0.5">terpakai</span>}
              {w === BAWAAN && w !== warna && <span className="mt-0.5">bawaan</span>}
            </button>
          ))}
        </div>

        <p className="text-xs text-tinta-3">
          Kontras warna terpilih dengan tulisan putih:{" "}
          {kontrasDenganPutih(warna).toFixed(1)} banding 1 — ambang yang lazim
          dipakai adalah 4,5.
        </p>
      </section>

      {pesan && <p className="text-sm text-hijau">{pesan}</p>}
      {galat && <p className="text-sm text-merah">{galat}</p>}
    </div>
  );
}
