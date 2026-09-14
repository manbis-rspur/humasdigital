import "server-only";
import PizZip from "pizzip";
import { HARI, type DokterBaca, type LembarDokter, type Sesi } from "@/lib/dokter";

/**
 * Membaca jadwal poliklinik dari berkas Excel bagian pelayanan.
 *
 * Pembaca Excel yang sudah ada (berkas-data.ts) sengaja tidak
 * dipakai di sini: ia membuang letak kolom, padahal justru letak
 * kolomlah yang menentukan sebuah jam itu jam hari Senin atau hari
 * Kamis. Excel tidak menuliskan sel yang kosong sama sekali, jadi
 * membaca sel berurutan tanpa melihat huruf kolomnya membuat jadwal
 * bergeser sehari setiap ada sel yang dikosongkan.
 *
 * Bentuk berkasnya: satu baris judul poliklinik yang digabung ke
 * bawah (jadi hanya terisi di baris dokter pertama), lalu satu baris
 * per dokter, lalu kadang satu baris lagi tanpa nama untuk sesi
 * kedua di hari yang sama.
 */

function teksDalam(xml: string): string {
  return [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    .map((m) => m[1])
    .join("")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Huruf kolom dari alamat sel: "AB12" -> "AB". */
function kolomDari(alamat: string): string {
  return /^[A-Z]+/.exec(alamat)?.[0] ?? "";
}

type Baris = Map<string, string>;

/** Membongkar satu lembar jadi baris-baris berisi peta huruf kolom -> isi. */
function bacaLembar(xml: string, bersama: string[]): Baris[] {
  const hasil: Baris[] = [];

  for (const potong of xml.split(/<row[ >]/).slice(1)) {
    const sel: Baris = new Map();

    // Sel kosong ditulis menutup sendiri (<c r="A58"/>). Tanpa
    // cabang kedua di bawah, pola serakah itu menelan sel
    // sesudahnya — dan yang tertelan justru sel berisi.
    for (const m of potong.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const sifat = m[1];
      const dalam = m[2] ?? "";
      const alamat = /r="([A-Z]+\d+)"/.exec(sifat)?.[1];
      if (!alamat) continue;

      const nilai = /<v[^>]*>([\s\S]*?)<\/v>/.exec(dalam)?.[1] ?? "";
      let isi: string;

      if (/t="s"/.test(sifat)) isi = bersama[Number(nilai)] ?? "";
      else if (/t="inlineStr"/.test(sifat)) isi = teksDalam(dalam);
      else isi = nilai.trim();

      isi = isi.replace(/\s+/g, " ").trim();
      if (isi !== "") sel.set(kolomDari(alamat), isi);
    }

    hasil.push(sel);
  }

  return hasil;
}

/** "14.00 -16.00" dan "08.00  - 11.00" jadi "14.00 - 16.00". */
function rapikanJam(nilai: string): string | null {
  const isi = nilai.replace(/\s+/g, " ").trim();
  if (isi === "" || isi === "-" || isi === "–") return null;

  // Hanya yang benar-benar berupa rentang jam. Sel jadwal kadang
  // dipakai menulis keterangan ("Tutup 15 Agustus, digantikan
  // oleh..."), dan itu bukan jam praktik.
  const cocok = /^(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})$/.exec(isi);
  if (!cocok) return null;

  const dua = (n: string) => n.padStart(2, "0");
  return `${dua(cocok[1])}.${cocok[2]} - ${dua(cocok[3])}.${cocok[4]}`;
}

/** Nama yang bukan nama: sisa titik, garis, atau nomor urut. */
function namaMasukAkal(nilai: string): boolean {
  return /[a-zA-Z]/.test(nilai) && nilai.replace(/[^a-zA-Z]/g, "").length >= 3;
}

/**
 * Membaca seluruh lembar dalam satu berkas.
 *
 * Berkas jadwal biasanya berisi lebih dari satu lembar — jadwal
 * tetap, jadwal sementara, poliklinik eksekutif — dan yang tahu
 * lembar mana yang sedang berlaku hanya orangnya, bukan programnya.
 */
export function bacaBerkasDokter(isi: ArrayBuffer): LembarDokter[] {
  const zip = new PizZip(isi);

  const bersama: string[] = [];
  const berkasBersama = zip.file("xl/sharedStrings.xml");
  if (berkasBersama) {
    for (const potong of berkasBersama.asText().split(/<si[ >]/).slice(1)) {
      bersama.push(teksDalam(potong));
    }
  }

  // Nama lembar ada di workbook.xml, urutannya sama dengan urutan
  // r:id-nya — yang pada berkas Excel biasa juga urutan sheet1,
  // sheet2, dan seterusnya.
  const namaLembar = [
    ...(zip.file("xl/workbook.xml")?.asText() ?? "").matchAll(
      /<sheet[^>]*\sname="([^"]*)"/g,
    ),
  ].map((m) => m[1]);

  const lembar = zip
    .file(/^xl\/worksheets\/sheet\d+\.xml$/)
    .sort((a, b) => {
      const nomor = (n: string) => Number(/sheet(\d+)\.xml$/.exec(n)?.[1] ?? 0);
      return nomor(a.name) - nomor(b.name);
    });

  return lembar.map((l, urutan) => ({
    nama: namaLembar[urutan] ?? `Lembar ${urutan + 1}`,
    dokter: dariBaris(bacaLembar(l.asText(), bersama)),
  }));
}

function dariBaris(baris: Baris[]): DokterBaca[] {
  // Baris kepala dikenali dari tulisannya, bukan dari nomor barisnya.
  // Berkas jadwal punya beberapa baris kosong dan baris kop di atas,
  // dan jumlahnya berubah tiap kali berkasnya dirapikan.
  let kepala = -1;
  let kolomNama = "";
  let kolomPoli = "";

  for (let i = 0; i < baris.length && kepala === -1; i++) {
    for (const [kolom, isi] of baris[i]) {
      const rapi = isi.toLowerCase();
      if (rapi === "nama dokter") {
        kepala = i;
        kolomNama = kolom;
      } else if (rapi === "poliklinik") {
        kolomPoli = kolom;
      }
    }
    if (kepala === -1) kolomPoli = "";
  }

  if (kepala === -1 || kolomNama === "" || kolomPoli === "") return [];

  // Nama hari dicari di baris kepala dan dua baris di atasnya.
  // "Minggu" sering ditulis menggantung satu baris lebih tinggi
  // karena kolomnya ditambahkan belakangan.
  const kolomHari = new Map<string, number>();
  for (let i = Math.max(0, kepala - 2); i <= kepala; i++) {
    for (const [kolom, isi] of baris[i]) {
      const rapi = isi.toLowerCase().replace(/['’]/g, "");
      const nomor = HARI.findIndex(
        (h) => h !== "" && h.toLowerCase() === (rapi === "jumat" ? "jumat" : rapi),
      );
      if (nomor > 0 && !kolomHari.has(kolom)) kolomHari.set(kolom, nomor);
    }
  }

  if (kolomHari.size === 0) return [];

  const hasil: DokterBaca[] = [];
  let poli = "";
  let sekarang: DokterBaca | null = null;

  for (let i = kepala + 1; i < baris.length; i++) {
    const sel = baris[i];

    const poliBaru = sel.get(kolomPoli);
    if (poliBaru && namaMasukAkal(poliBaru)) {
      // Nama poliklinik yang panjang kadang disambung ke sel di
      // bawahnya: "Spesialis Anestesi dan Terapi Intensif" lalu
      // "( Jam Kerja )". Sambungan itu selalu dalam kurung, jadi
      // dirangkai, bukan dianggap poliklinik baru.
      poli = poliBaru.startsWith("(") && poli !== "" ? `${poli} ${poliBaru}` : poliBaru;
    }

    const sesi: Sesi[] = [];
    for (const [kolom, hari] of kolomHari) {
      const jam = rapikanJam(sel.get(kolom) ?? "");
      if (jam) sesi.push({ hari, jam });
    }

    const nama = sel.get(kolomNama) ?? "";

    if (nama !== "" && namaMasukAkal(nama)) {
      // Poliklinik kosong berarti judulnya digabung ke bawah dari
      // baris di atasnya — dokter ini masih milik poli yang sama.
      sekarang = { poliklinik: poli || "Lainnya", nama, jadwal: sesi };
      hasil.push(sekarang);
    } else if (sekarang && sesi.length > 0) {
      // Baris tanpa nama tapi berisi jam: sesi kedua dokter di atasnya.
      sekarang.jadwal.push(...sesi);
    }
  }

  return gabungKembar(hasil);
}

/**
 * Satu nama kadang tertulis dua kali dengan ejaan huruf besar yang
 * berbeda ("dr. Nora" dan "dr.NORA"). Yang belakangan tidak bisa
 * disimpan karena namanya dianggap sudah ada, jadi digabung di sini
 * selagi masih terbaca.
 */
function gabungKembar(daftar: DokterBaca[]): DokterBaca[] {
  const peta = new Map<string, DokterBaca>();

  for (const d of daftar) {
    const kunci = `${d.poliklinik.toLowerCase()}|${d.nama.toLowerCase().replace(/[\s.,]/g, "")}`;
    const ada = peta.get(kunci);

    if (!ada) {
      peta.set(kunci, d);
      continue;
    }

    for (const s of d.jadwal) {
      if (!ada.jadwal.some((x) => x.hari === s.hari && x.jam === s.jam)) {
        ada.jadwal.push(s);
      }
    }
  }

  return [...peta.values()];
}
