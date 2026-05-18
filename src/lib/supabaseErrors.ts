const isFetchFailure = (error: unknown) =>
  error instanceof TypeError && /fetch/i.test(error.message);

export const formatSupabaseError = (error: unknown) => {
  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();

    if (normalized.includes('error sending confirmation email')) {
      return 'Supabase nedokázal odeslat potvrzovací e-mail. Nejčastější příčina je nenastavené vlastní SMTP, překročený limit výchozího SMTP nebo nepovolená cílová adresa.';
    }

    if (normalized.includes('email address not authorized')) {
      return 'Tato e-mailová adresa není povolená pro výchozí Supabase SMTP. Bez vlastního SMTP umí Supabase posílat maily jen omezeně a typicky jen na povolené adresy.';
    }
  }

  if (isFetchFailure(error)) {
    return 'Nepodařilo se spojit se Supabase. Zkontroluj VITE_SUPABASE_URL, připojení k internetu a že projekt v Supabase skutečně existuje a běží.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Neznámá chyba připojení k Supabase.';
};
