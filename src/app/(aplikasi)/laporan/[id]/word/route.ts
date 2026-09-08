import { NextResponse } from "next/server";
import { bolehSosmed } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { jadikanWord } from "@/lib/markdown-docx";
import { NAMA_BULAN } from "@/lib/sosmed";

export async function GET(
  _permintaan: Request,
  { params }: RouteContext<"/laporan/[id]/word">,
) {
  if (!(await bolehSosmed())) return new NextResponse("Tidak berhak.", { status: 403 });

  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("laporan_sosmed")
    .select("bulan, tahun, hasil")
    .eq("id", Number(id))
    .maybeSingle();

  if (!data?.hasil) {
    return new NextResponse("Laporan ini belum disusun.", { status: 404 });
  }

  const judul = `Laporan Media Sosial RSPUR — ${NAMA_BULAN[data.bulan]} ${data.tahun}`;
  const berkas = await jadikanWord(judul, data.hasil);

  return new NextResponse(new Uint8Array(berkas), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="laporan-sosmed-${data.tahun}-${String(data.bulan).padStart(2, "0")}.docx"`,
    },
  });
}
