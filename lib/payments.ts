import { supabase } from "./supabase";

export async function callPayments<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("payments", { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = await (error as any).context?.json?.();
      if (ctx?.error) message = ctx.error;
    } catch {
      // Keep the default message.
    }
    throw new Error(message);
  }
  return data as T;
}
