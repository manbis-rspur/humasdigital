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

      <div className="w-full max-w-sm">
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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Humas &amp; Digital Marketing
        </h1>
        <p className="mt-2 mb-8 text-tinta-2">Masuk memakai email kantor Anda.</p>

        <FormMasuk lanjut={lanjut} />
      </div>
    </main>
  );
}
