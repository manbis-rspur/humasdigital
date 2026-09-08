"use client";

import { useActionState } from "react";
import { masuk, type HasilMasuk } from "@/lib/auth-actions";

const awal: HasilMasuk = { pesan: null };

export function FormMasuk({ lanjut }: { lanjut: string }) {
  const [hasil, kirim, sedang] = useActionState(masuk, awal);

  return (
    <form action={kirim} className="flex flex-col gap-4">
      <input type="hidden" name="lanjut" value={lanjut} />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Kata sandi
        </span>
        <input
          name="sandi"
          type="password"
          autoComplete="current-password"
          required
          className="rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
        />
      </label>

      {hasil.pesan && (
        <p className="rounded border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
          {hasil.pesan}
        </p>
      )}

      <button
        type="submit"
        disabled={sedang}
        className="rounded bg-hijau px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Sedang masuk…" : "Masuk"}
      </button>
    </form>
  );
}
