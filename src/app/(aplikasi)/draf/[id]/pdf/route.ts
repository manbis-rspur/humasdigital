import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jadikanPdf } from "@/lib/markdown-pdf";
import { ambilKop } from "@/lib/kop-data";

/**
 * Mengunduh naskah draf sebagai PDF, dengan kop surat pilihan.
 *
 * Izinnya tidak diperiksa di sini melainkan oleh aturan tabelnya:
 * kueri di bawah memakai sesi orang yang meminta, dan draf yang
 * bukan haknya tidak akan terbaca sama sekali.
 */
export async function GET(
  permintaan: Request,
  { params }: RouteContext<"/draf/[id]/pdf">,
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("draf")
    .select("judul, isi")
    .eq("id", Number(id))
    .maybeSingle();

  if (!data?.isi) {
    return new NextResponse("Draf ini tidak punya naskah teks.", { status: 404 });
  }

  const dipilih = new URL(permintaan.url).searchParams.get("kop");
  // "tanpa" berarti sengaja tanpa kop — berbeda dari tidak memilih,
  // yang berarti pakai kop bawaan.
  const kop = dipilih === "tanpa" ? null : await ambilKop(Number(dipilih) || null);

  let berkas: Uint8Array;
  try {
    berkas = jadikanPdf(data.judul as string, data.isi as string, kop);
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : String(galat);
    return new NextResponse(`PDF gagal dibuat: ${pesan}`, { status: 500 });
  }

  const nama = (data.judul as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

  return new NextResponse(berkas as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nama || "draf"}.pdf"`,
    },
  });
}
