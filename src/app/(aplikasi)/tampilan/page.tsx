import { wajibHumasPenuh } from "@/lib/akses";
import { bacaIdentitas } from "@/lib/identitas";
import { FormIdentitas } from "./form-identitas";

export default async function HalamanTampilan() {
  await wajibHumasPenuh();
  const identitas = await bacaIdentitas();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Tampilan</h1>
      <p className="mt-1 mb-8 text-tinta-2">
        Logo dan warna dashboard ini. Terpisah dari Dashboard Manajemen Bisnis —
        mengubahnya di sini tidak mengubah tampilan di sana.
      </p>

      <FormIdentitas logoAwal={identitas.logoUrl} warnaAwal={identitas.warnaUtama} />
    </div>
  );
}
