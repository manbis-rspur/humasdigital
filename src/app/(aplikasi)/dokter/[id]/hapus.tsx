"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import { hapusDokter } from "@/lib/dokter-actions";

/**
 * Menghapus satu dokter.
 *
 * Kebanyakan yang ingin dilakukan orang di sini sebenarnya
 * "padamkan", bukan "hapus" — makanya bedanya disebut terang-terangan
 * sebelum tombolnya ditekan.
 */
export function TombolHapusDokter({ id, nama }: { id: number; nama: string }) {
  const [pesan, setPesan] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();
  const arahkan = useRouter();

  return (
    <div className="flex flex-col items-end gap-2">
      <form
        action={(formData) =>
          mulai(async () => {
            const hasil = await hapusDokter(formData);
            if (hasil.ok) arahkan.push("/dokter");
            else setPesan(hasil.pesan);
          })
        }
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={sedang}
          className="flex items-center gap-1.5 rounded-lg border border-merah px-3 py-1.5 text-xs font-medium text-merah hover:bg-[#f6e7e6] disabled:opacity-60"
        >
          <Ikon nama="hapus" ukuran={14} />
          {sedang ? "Menghapus…" : `Hapus ${nama}`}
        </button>
      </form>

      <p className="text-xs text-tinta-3">
        Kalau beliau hanya sedang cuti atau jadwalnya tutup sementara, padamkan
        saja — jadwalnya tidak perlu diketik ulang nanti.
      </p>

      {pesan && <p className="text-sm text-merah">{pesan}</p>}
    </div>
  );
}
