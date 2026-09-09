import { keluar } from "@/lib/auth-actions";

export default function TanpaAkses() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">Akun Anda tidak berhak</h1>
        <p className="mt-2 text-tinta-2">
          Dashboard ini hanya untuk Humas dan Digital Marketing. Kalau Anda
          merasa seharusnya berhak, hubungi Admin sistem.
        </p>
        <form action={keluar} className="mt-6">
          <button
            type="submit"
            className="rounded-lg bg-hijau px-4 py-2.5 font-medium text-white"
          >
            Keluar
          </button>
        </form>
      </div>
    </main>
  );
}
