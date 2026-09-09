import { notFound } from "next/navigation";
import { wajibMcu } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { bacaKop } from "@/lib/identitas";
import {
  hitungPenawaran,
  rupiah,
  terbilangRupiah,
  type RincianItem,
} from "@/lib/mcu";
import { PicuCetak } from "./picu-cetak";
import { gayaCetak } from "./gaya";

const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Penanda tangan surat penawaran.
 *
 * Ditulis di sini, bukan diambil dari akun yang sedang membuka
 * halaman: yang menandatangani penawaran adalah pemegang jabatan
 * Marketing, siapa pun yang kebetulan mencetaknya. Kalau orangnya
 * berganti, satu tempat ini yang diubah.
 */
const PENANDA_TANGAN = {
  nama: "Nanda Monica Putri, S.E",
  jabatan: "Marketing",
};

export default async function SuratPenawaran({
  params,
}: PageProps<"/mcu/[id]/cetak">) {
  await wajibMcu();
  const { id } = await params;

  const supabase = await createClient();
  const { data: p } = await supabase
    .from("mcu_penawaran")
    .select("*, nomor:nomor_id(nomor_lengkap)")
    .eq("id", Number(id))
    .maybeSingle();

  if (!p) notFound();

  const nomor = Array.isArray(p.nomor) ? p.nomor[0] : p.nomor;
  const rincian = (p.rincian ?? []) as RincianItem[];

  const h = hitungPenawaran(rincian, {
    hargaPaket: p.harga_paket,
    jumlahPeserta: p.jumlah_peserta,
    kenaPpn: p.kena_ppn,
    ppnPersen: Number(p.ppn_persen),
  });

  const kop = await bacaKop();
  const tanggal = tanggalPanjang.format(new Date(`${p.tanggal_surat}T00:00:00`));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: gayaCetak }} />
      <PicuCetak />

      <div className="lembar">
        {kop.kopUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={kop.kopUrl} alt="" className="kop-gambar" />
        ) : (
          <div className="kop">
            {kop.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={kop.logoUrl} alt="" className="kop-logo" />
            )}
            <p className="kop-alamat">
              {kop.alamatKop ?? "RS Pertamedika Ummi Rosnati"}
            </p>
          </div>
        )}

        <div className="kepala">
          <table>
            <tbody>
              <tr>
                <td>Nomor</td>
                <td>:</td>
                <td>{nomor?.nomor_lengkap ?? "—"}</td>
              </tr>
              <tr>
                <td>Lampiran</td>
                <td>:</td>
                <td>1 (satu) berkas</td>
              </tr>
              <tr>
                <td>Hal</td>
                <td>:</td>
                <td>
                  <strong>Penawaran Kerja Sama Medical Check-Up</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="tanggal">Banda Aceh, {tanggal}</p>
        </div>

        <div className="tujuan">
          <p>Kepada Yth.</p>
          <p className="nama">{p.rekanan}</p>
          <p>di Tempat</p>
        </div>

        <p className="paragraf">Dengan hormat,</p>

        <p className="paragraf">
          Sehubungan dengan program pemeriksaan kesehatan berkala bagi karyawan
          di lingkungan {p.rekanan}, bersama ini kami dari RS Pertamedika Ummi
          Rosnati menyampaikan penawaran kerja sama layanan Medical Check-Up
          {p.jenis_pemeriksaan ? ` ${p.jenis_pemeriksaan}` : ""} dengan rincian
          sebagai berikut.
        </p>

        {rincian.length > 0 && (
          <table className="rincian">
            <thead>
              <tr>
                <th style={{ width: "10mm" }}>No</th>
                <th>Jenis Pemeriksaan</th>
              </tr>
            </thead>
            <tbody>
              {rincian.map((r, i) => (
                <tr key={`${r.nama}-${i}`}>
                  <td className="nomor">{i + 1}</td>
                  <td>{r.nama}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Yang tercetak di surat hanya harga yang ditawarkan. Biaya
            pokok, laba, dan margin sengaja tidak pernah ikut — angka
            itu urusan dalam rumah sakit, bukan urusan rekanan. */}
        <table className="biaya">
          <tbody>
            <tr>
              <td>Harga paket per peserta</td>
              <td>{rupiah(h.hargaPaket)}</td>
            </tr>
            <tr>
              <td>Jumlah peserta</td>
              <td>{p.jumlah_peserta} orang</td>
            </tr>
            {p.kena_ppn && (
              <tr>
                <td>PPN {Number(p.ppn_persen)}%</td>
                <td>{rupiah(h.totalPpn)}</td>
              </tr>
            )}
            <tr className="jumlah">
              <td>Total biaya</td>
              <td>{rupiah(h.totalTagihan)}</td>
            </tr>
          </tbody>
        </table>

        <p className="terbilang">Terbilang: {terbilangRupiah(h.totalTagihan)}.</p>

        {p.catatan && <p className="catatan">{p.catatan}</p>}

        <p className="paragraf">
          Penawaran ini berlaku selama 30 (tiga puluh) hari sejak tanggal surat.
          Pelaksanaan pemeriksaan dapat diatur sesuai jadwal yang disepakati
          bersama, baik di rumah sakit maupun di lokasi perusahaan.
        </p>

        <p className="paragraf">
          Demikian penawaran ini kami sampaikan. Besar harapan kami dapat
          menjalin kerja sama yang baik dalam menjaga kesehatan karyawan
          {" "}{p.rekanan}. Atas perhatian dan kerja samanya, kami ucapkan
          terima kasih.
        </p>

        <div className="ttd">
          <div className="ttd-kotak">
            <p>Hormat kami,</p>
            <p>RS Pertamedika Ummi Rosnati</p>
            <p className="ttd-nama">{PENANDA_TANGAN.nama}</p>
            <p>{PENANDA_TANGAN.jabatan}</p>
          </div>
        </div>
      </div>
    </>
  );
}
