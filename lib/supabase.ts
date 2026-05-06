import { createClient } from "@supabase/supabase-js";
import type { StateStorage } from "zustand/middleware";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supabaseStorage: StateStorage = {
  getItem: async (name) => {
    const { data } = await supabase
      .from("app_state")
      .select("value")
      .eq("key", name)
      .single();
    return data?.value ?? null;
  },
  setItem: async (name, value) => {
    await supabase
      .from("app_state")
      .upsert({ key: name, value }, { onConflict: "key" });
  },
  removeItem: async (name) => {
    await supabase.from("app_state").delete().eq("key", name);
  },
};
