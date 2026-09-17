import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jadikanPdf } from "@/lib/markdown-pdf";
import { jadikanWord } from "@/lib/markdown-docx";
import { ambilKop } from "@/lib/kop-data";
import { pisahBagian } from "@/lib/konsep-teks";

/**
 * Mengunduh SATU bagian dari sebuah draf, sebagai PDF atau Word.
 *
 * Isian "judul" menentukan bagiannya. Dikosongkan berarti
 * kalendernya saja — tanpa konsep-konsep yang menempel di
 * bawahnya.
 *
 * Kenapa dipisah begitu: konsep punya unduhannya sendiri, dan yang
 * diserahkan ke desainer cuma satu konten. Kalender yang membawa
 * serta lima konsep membuat penerimanya harus mencari bagiannya
 * sendiri — dan yang diserahkan ke rapat manajemen justru
 * sebaliknya, kalendernya saja tanpa naskah produksi.
 *
 * Izinnya dijaga aturan tabel: kueri di bawah memakai sesi orang
 * yang meminta, dan draf yang bukan haknya tidak terbaca sama
 * sekali.
 */
export async function GET(
  permintaan: Request,
  { params }: RouteContext<"/draf/[id]/bagian">,
) {
  const { id } = await params;
  const alamat = new URL(permintaan.url);
  const judul = alamat.searchParams.get("judul") ?? "";
  const bentuk = alamat.searchParams.get("bentuk") === "word" ? "word" : "pdf";

  const supabase = await createClient();
  const { data } = await supabase
    .from("draf")
    .select("judul, isi")
    .eq("id", Number(id))
    .maybeSingle();

  if (!data?.isi) {
    return new NextResponse("Draf ini tidak punya naskah teks.", { status: 404 });
  }

  const semua = pisahBagian(data.isi as string);

  // Judul kosong: kalendernya saja. Bagian tanpa judul memang
  // hanya kalendernya — konsep selalu ditempel berjudul.
  const isiBagian =
    judul === ""
      ? semua
          .filter((b) => b.judul === "")
          .map((b) => b.isi)
          .join("\n\n")
          .trim()
      : (semua.find((b) => b.judul === judul)?.isi ?? null);

  if (!isiBagian) {
    return new NextResponse("Bagian itu tidak ada di draf ini.", { status: 404 });
  }

  const bagian = { isi: isiBagian };

  const nama =
    (judul || (data.judul as string))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "konsep";

  const dipilih = alamat.searchParams.get("kop");
  const kop = dipilih === "tanpa" ? null : await ambilKop(Number(dipilih) || null);

  if (bentuk === "word") {
    const berkas = await jadikanWord(judul || (data.judul as string), bagian.isi, kop);
    return new NextResponse(new Uint8Array(berkas), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${nama}.docx"`,
      },
    });
  }

  let berkas: Uint8Array;
  try {
    berkas = jadikanPdf(judul || (data.judul as string), bagian.isi, kop);
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : String(galat);
    return new NextResponse(`PDF gagal dibuat: ${pesan}`, { status: 500 });
  }

  return new NextResponse(berkas as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nama}.pdf"`,
    },
  });
}
