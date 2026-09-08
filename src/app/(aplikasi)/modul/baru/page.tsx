import { wajibHumasPenuh } from "@/lib/akses";
import { PerakitModul } from "../perakit-modul";

export default async function HalamanModulBaru() {
  await wajibHumasPenuh();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Modul Baru</h1>
      <p className="mt-1 mb-8 max-w-xl text-tinta-2">
        Rakit sendiri perkakas AI untuk pekerjaan yang sering berulang. Modul
        yang disimpan bisa dipakai seluruh tim, bukan hanya Anda.
      </p>

      <PerakitModul modul={null} />
    </div>
  );
}
