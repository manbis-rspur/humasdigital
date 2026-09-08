import { createClient } from "@/lib/supabase/server";

export type Identitas = {
  logoUrl: string | null;
  warnaUtama: string | null;
};

/**
 * Logo dan warna dashboard ini.
 *
 * Disimpan pada kolom tersendiri, terpisah dari milik Dashboard
 * Manajemen Bisnis — keduanya dashboard yang berbeda, dan mengganti
 * tampilan yang satu tidak seharusnya mengubah yang lain.
 */
export async function bacaIdentitas(): Promise<Identitas> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pengaturan_sistem")
    .select("logo_humas_url, warna_humas")
    .eq("id", 1)
    .maybeSingle();

  return {
    logoUrl: data?.logo_humas_url ?? null,
    warnaUtama: data?.warna_humas ?? null,
  };
}
