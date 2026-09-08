import { NextResponse } from "next/server";
import { izinHumas } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { jadikanWord } from "@/lib/markdown-docx";

/**
 * Mengunduh satu dokumen riwayat sebagai berkas Word.
 *
 * Izinnya diperiksa di sini juga, bukan hanya di halaman — alamat
 * seperti ini bisa dibuka langsung.
 */
export async function GET(
  _permintaan: Request,
  { params }: RouteContext<"/riwayat/[id]/word">,
) {
  if ((await izinHumas()) === "tidak") {
    return new NextResponse("Tidak berhak membuka dokumen ini.", { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("riwayat_ai")
    .select("judul, hasil, modul_judul")
    .eq("id", Number(id))
    .maybeSingle();

  if (!data) return new NextResponse("Dokumen tidak ditemukan.", { status: 404 });

  const berkas = await jadikanWord(data.judul, data.hasil);

  const nama = `${data.modul_judul}-${data.judul}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return new NextResponse(new Uint8Array(berkas), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nama}.docx"`,
    },
  });
}
