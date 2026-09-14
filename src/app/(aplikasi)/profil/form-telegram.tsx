"use client";

import { useActionState, useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import { kirimUjiTelegram, simpanTelegram } from "@/lib/profil-actions";

const awal = { ok: false, pesan: "" };

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function FormTelegram({ chatIdAwal }: { chatIdAwal: string | null }) {
  const [hasil, kirim, sedang] = useActionState(simpanTelegram, awal);
  const [uji, setUji] = useState<{ ok: boolean; pesan: string } | null>(null);
  const [menguji, mulai] = useTransition();

  const tersambung = Boolean(chatIdAwal);

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-1.5 text-sm text-tinta-2">
        <li>
          1. Buka <b>@humas_digital_bot</b> di Telegram, lalu tekan{" "}
          <b>Start</b>.
        </li>
        <li>2. Bot akan menyebutkan nomor percakapan Anda. Salin nomornya.</li>
        <li>3. Tempelkan di kotak bawah ini, lalu tekan Sambungkan.</li>
      </ol>

      <form action={kirim} className="flex flex-wrap gap-2">
        <input
          name="telegram_chat_id"
          defaultValue={chatIdAwal ?? ""}
          inputMode="numeric"
          placeholder="Nomor percakapan — misalnya 123456789"
          className={`${gaya} min-w-64 flex-1`}
        />
        <button
          type="submit"
          disabled={sedang}
          className="rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Menyimpan…" : tersambung ? "Ganti" : "Sambungkan"}
        </button>
      </form>

      {hasil.pesan && (
        <p className={`text-sm ${hasil.ok ? "text-hijau" : "text-merah"}`}>
          {hasil.pesan}
        </p>
      )}

      {tersambung && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={menguji}
            onClick={() => mulai(async () => setUji(await kirimUjiTelegram()))}
            className="flex items-center gap-1.5 rounded-lg border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-60"
          >
            <Ikon nama="surat" ukuran={14} />
            {menguji ? "Mengirim…" : "Kirim pesan percobaan"}
          </button>
          {uji && (
            <span className={`text-sm ${uji.ok ? "text-hijau" : "text-merah"}`}>
              {uji.pesan}
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-tinta-3">
        Nomor ini sama dengan yang dipakai Dashboard Manajemen Bisnis — sekali
        disambungkan, kedua botnya mengenali Anda.
      </p>
    </div>
  );
}
