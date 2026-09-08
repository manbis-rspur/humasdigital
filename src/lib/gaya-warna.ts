/**
 * Menurunkan seluruh warna halaman dari satu warna pilihan.
 *
 * Bukan hanya tombol dan sorotan: latar, garis, dan warna tulisan
 * ikut dicampur sedikit dengan warna itu. Tanpa ini, memilih warna
 * biru hanya mengubah tombolnya, sementara latar halaman tetap
 * beraroma hijau bawaan — dan tampilannya jadi terasa tidak nyambung.
 *
 * Campurannya sengaja tipis (di bawah seperlima). Latar yang terlalu
 * kuat warnanya membuat tulisan susah dibaca dan halaman jadi
 * melelahkan dilihat seharian.
 */
export function gayaWarna(warna: string) {
  const campur = (persen: number, dasar: string) =>
    `color-mix(in srgb, ${warna} ${persen}%, ${dasar})`;

  return `:root{
--color-hijau:${warna};
--color-hijau-muda:${campur(13, "white")};
--color-kertas:${campur(5, "#fbfbfa")};
--color-permukaan:${campur(2, "white")};
--color-permukaan-2:${campur(9, "#f4f4f3")};
--color-garis:${campur(15, "#dcdedd")};
--color-tinta:${campur(9, "#131718")};
--color-tinta-2:${campur(11, "#3b4245")};
--color-tinta-3:${campur(9, "#5e6669")};
}`;
}
