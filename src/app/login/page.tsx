import { bacaIdentitas } from "@/lib/identitas";
import { gayaWarna } from "@/lib/gaya-warna";
import { FormMasuk } from "./form-masuk";

export default async function HalamanMasuk({ searchParams }: PageProps<"/login">) {
  const q = await searchParams;
  const lanjut = typeof q.lanjut === "string" ? q.lanjut : "/";
  const identitas = await bacaIdentitas();

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      {identitas.warnaUtama && <style>{gayaWarna(identitas.warnaUtama)}</style>}

      <div className="w-full max-w-sm rounded-2xl border border-garis bg-permukaan p-7 shadow-angkat">
        {/* Garis warna rumah sakit di kepala kartu, sama seperti yang
            ada di bibir atas dashboard. */}
        <div className="-mx-7 -mt-7 mb-6 h-1 rounded-t-2xl bg-hijau" />

        {identitas.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={identitas.logoUrl}
            alt=""
            className="mb-5 h-14 w-auto max-w-[10rem] object-contain"
          />
        )}

        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-tinta-3">
          RSPUR
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Humas &amp; Pemasaran
        </h1>
        <p className="mt-2 mb-7 text-sm text-tinta-2">
          Masuk memakai email kantor Anda.
        </p>

        <FormMasuk lanjut={lanjut} />
      </div>
    </main>
  );
}
