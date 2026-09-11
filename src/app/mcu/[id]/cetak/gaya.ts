/**
 * Tampilan surat penawaran.
 *
 * Ditulis terpisah dari Tailwind karena halaman ini punya aturannya
 * sendiri: ukuran kertas A4, huruf serif untuk surat resmi, dan
 * warna hitam putih apa adanya. Warna aplikasi sengaja tidak dipakai
 * — surat yang keluar atas nama rumah sakit harus selalu terlihat
 * sama, berapa pun warna yang sedang dipilih di menu Tampilan.
 */
export const gayaCetak = `
  @page { size: A4 portrait; margin: 12mm; }

  /* Peramban membuang warna latar saat mencetak kecuali diminta
     tegas — pilihan "Background graphics" di kotak cetak Chrome
     bawaannya mati, dan tanpa baris ini kepala tabel serta baris
     jumlah keluar putih polos. */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  body { background: #e5e5e5; margin: 0; }

  .lembar {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 14mm 18mm;
    background: #fff;
    color: #000;
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.45;
    box-sizing: border-box;
  }

  .kop-gambar {
    display: block; width: 100%; height: auto; margin-bottom: 4mm;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  .kop { display: flex; align-items: center; gap: 6mm; border-bottom: 1.5pt solid #000; padding-bottom: 3mm; margin-bottom: 6mm; }
  .kop-logo { height: 20mm; width: auto; max-width: 40mm; object-fit: contain; }
  .kop-alamat { margin: 0; font-size: 9pt; line-height: 1.4; white-space: pre-line; }

  .kepala { display: flex; justify-content: space-between; gap: 10mm; margin-bottom: 6mm; }
  .kepala table { border-collapse: collapse; }
  .kepala td { padding: 0.3mm 0; vertical-align: top; }
  .kepala td:first-child { width: 22mm; }
  .kepala td:nth-child(2) { width: 4mm; }
  .tanggal { text-align: right; white-space: nowrap; }

  .tujuan { margin-bottom: 5mm; }
  .tujuan p { margin: 0; }
  .tujuan .nama { font-weight: bold; }

  p.paragraf { margin: 0 0 3.5mm; text-align: justify; text-indent: 10mm; }

  .rincian { width: 100%; border-collapse: collapse; margin: 3mm 0 5mm; font-size: 10.5pt; }
  .rincian th, .rincian td { border: 0.8pt solid #000; padding: 1.6mm 2.5mm; }
  .rincian th { background: #e8e8e8; text-align: center; font-weight: bold;
                -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rincian td.nomor { width: 10mm; text-align: center; }
  .rincian td.angka { width: 34mm; text-align: right; white-space: nowrap; }

  .biaya { width: 100%; border-collapse: collapse; margin: 3mm 0 4mm; font-size: 10.5pt; }
  .biaya td { padding: 1.4mm 2.5mm; border: 0.8pt solid #000; }
  .biaya td:first-child { width: 60%; }
  .biaya td:last-child { text-align: right; white-space: nowrap; }
  .biaya tr.jumlah td { font-weight: bold; background: #e8e8e8;
                        -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .terbilang { margin: 0 0 4mm; font-style: italic; font-size: 10.5pt; }

  .catatan { margin: 0 0 4mm; white-space: pre-wrap; }

  .ttd { margin-top: 10mm; display: flex; justify-content: flex-end; }
  .ttd-kotak { width: 70mm; text-align: center; }
  .ttd-kotak p { margin: 0; }
  .ttd-nama { margin-top: 22mm !important; font-weight: bold; text-decoration: underline; }

  .bilah-layar {
    position: fixed; top: 10px; right: 10px; z-index: 10;
    display: flex; gap: 8px;
    font-family: Arial, Helvetica, sans-serif;
  }
  .bilah-layar button {
    border: 1px solid #999; background: #fff; color: #111;
    border-radius: 4px; padding: 8px 14px; font-size: 13px; cursor: pointer;
  }
  .bilah-layar button:hover { background: #f0f0f0; }

  @media print {
    body { background: #fff; }
    .lembar { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
    .bilah-layar { display: none; }
  }
`;
