import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Halaman yang boleh dibuka tanpa login. */
const TERBUKA = ["/login", "/auth", "/tanpa-akses"];

/**
 * Berjalan sebelum setiap halaman dibuka:
 * 1. menyegarkan sesi login supaya orang tidak tiba-tiba terlempar keluar,
 * 2. mengembalikan pengunjung yang belum login ke halaman /login.
 *
 * Pemeriksaan peran dilakukan di halamannya masing-masing (lihat
 * `wajibAdmin`), karena proxy tidak membaca database.
 *
 * Di Next.js 16 berkas ini bernama proxy.ts — dulu middleware.ts.
 */
export async function proxy(request: NextRequest) {
  // Kredensial Supabase belum diisi — biarkan lewat, halaman utama
  // akan menampilkan petunjuk pengisian.
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const halamanTerbuka = TERBUKA.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !halamanTerbuka) {
    const tujuan = request.nextUrl.clone();
    tujuan.pathname = "/login";
    tujuan.searchParams.set("lanjut", path);
    return NextResponse.redirect(tujuan);
  }

  return response;
}

export const config = {
  matcher: [
    // Semua halaman kecuali berkas statis dan gambar.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
