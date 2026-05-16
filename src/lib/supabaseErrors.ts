const isFetchFailure = (error: unknown) =>
  error instanceof TypeError && /fetch/i.test(error.message);

export const formatSupabaseError = (error: unknown) => {
  if (isFetchFailure(error)) {
    return 'Nepodařilo se spojit se Supabase. Zkontroluj VITE_SUPABASE_URL, připojení k internetu a že projekt v Supabase skutečně existuje a běží.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Neznámá chyba připojení k Supabase.';
};
