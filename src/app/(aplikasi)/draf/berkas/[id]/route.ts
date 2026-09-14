import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mengambil satu berkas revisi draf.
 *
 * Izinnya tidak diperiksa di sini melainkan oleh aturan tabelnya:
 * kueri di bawah memakai sesi orang yang meminta, dan baris yang
 * bukan haknya tidak akan terbaca sama sekali.
 */
export async function GET(
  _permintaan: Request,
  { params }: RouteContext<"/draf/berkas/[id]">,
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("draf_revisi")
    .select("berkas_jalur, berkas_nama")
    .eq("id", Number(id))
    .maybeSingle();

  if (!data?.berkas_jalur) {
    return new NextResponse("Berkas tidak ditemukan.", { status: 404 });
  }

  const { data: isi, error } = await createAdminClient()
    .storage.from("dokumen")
    .download(data.berkas_jalur);

  if (error || !isi) {
    return new NextResponse("Berkasnya tidak bisa dibaca.", { status: 500 });
  }

  return new NextResponse(new Uint8Array(await isi.arrayBuffer()), {
    headers: {
      "Content-Type": isi.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${data.berkas_nama}"`,
    },
  });
}
