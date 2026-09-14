import { ambilDariWeb } from "./dokter-web.ts";
import { ringkasJadwal } from "../src/lib/dokter.ts";

const h = await ambilDariWeb();
if (h.dokter === null) { console.log("GAGAL:", h.pesan); process.exit(1); }

console.log("dokter:", h.dokter.length);
const poli = new Set(h.dokter.map((d) => d.poliklinik));
console.log("poliklinik:", poli.size);
console.log("tanpa jadwal:", h.dokter.filter((d) => d.jadwal.length === 0).length);
console.log("total sesi:", h.dokter.reduce((n, d) => n + d.jadwal.length, 0));
console.log();
for (const d of h.dokter.slice(0, 8)) {
  console.log(`  [${d.poliklinik}] ${d.nama} :: ${ringkasJadwal(d.jadwal) || "(tanpa jadwal)"}`);
}
console.log("\ndaftar poliklinik:");
for (const p of [...poli].sort()) console.log("  -", p);
