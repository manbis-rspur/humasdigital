/**
 * Memperkecil logo tanpa mengubah bentuknya.
 *
 * Berbeda dari foto profil yang dipotong persegi: logo harus utuh,
 * termasuk kalau bentuknya memanjang. Hasilnya disimpan sebagai PNG
 * supaya latar tembus pandang tidak berubah jadi kotak putih.
 */

const SISI_MAKS = 512;

/**
 * Kop surat butuh ukuran jauh lebih besar daripada logo: ia dicetak
 * selebar kertas A4, dan gambar 512 piksel akan terlihat pecah.
 * 1600 piksel setara sekitar 200 titik per inci pada lebar A4.
 */
const SISI_MAKS_KOP = 1600;

export async function kecilkanKop(berkas: File): Promise<File> {
  return kecilkanLogo(berkas, SISI_MAKS_KOP);
}

export async function kecilkanLogo(
  berkas: File,
  sisiMaks: number = SISI_MAKS,
): Promise<File> {
  if (!berkas.type.startsWith("image/")) {
    throw new Error("Berkasnya harus berupa gambar.");
  }

  const gambar = await createImageBitmap(berkas, { imageOrientation: "from-image" });

  const skala = Math.min(1, sisiMaks / Math.max(gambar.width, gambar.height));
  const lebar = Math.round(gambar.width * skala);
  const tinggi = Math.round(gambar.height * skala);

  const kanvas = document.createElement("canvas");
  kanvas.width = lebar;
  kanvas.height = tinggi;

  const kuas = kanvas.getContext("2d");
  if (!kuas) throw new Error("Peramban ini tidak bisa mengolah gambar.");

  kuas.imageSmoothingQuality = "high";
  kuas.drawImage(gambar, 0, 0, lebar, tinggi);
  gambar.close();

  const gumpal = await new Promise<Blob | null>((selesai) =>
    kanvas.toBlob(selesai, "image/png"),
  );

  if (!gumpal) throw new Error("Gagal mengolah gambarnya.");

  return new File([gumpal], "logo.png", { type: "image/png" });
}
