import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import logoBlue from '@/assets/logo_figr_blue.svg';
import logoOrange from '@/assets/logo_figr_orange.svg';
import logoLight from '@/assets/logo_figr_light.svg';

interface AuthScreenProps {
  visualTheme: string;
  initialError?: string | null;
}

const resolveLogo = (visualTheme: string) => {
  if (visualTheme === 'warm-orange') return logoOrange;
  if (visualTheme === 'dark-blue') return logoBlue;
  return logoLight;
};

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Neznámá chyba.');

export const AuthScreen = ({ visualTheme, initialError = null }: AuthScreenProps) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  const logoSrc = useMemo(() => resolveLogo(visualTheme), [visualTheme]);

  useEffect(() => {
    const isDark = visualTheme !== 'light';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.surface = visualTheme;
  }, [visualTheme]);

  useEffect(() => {
    setErrorMessage(initialError);
  }, [initialError]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      if (activeTab === 'signin') {
        await signIn(email.trim(), password);
        setMessage('Přihlášení proběhlo úspěšně.');
      } else if (activeTab === 'signup') {
        const result = await signUp(email.trim(), password, username.trim());
        setMessage(
          result.needsEmailConfirmation
            ? 'Účet byl vytvořen. Potvrď e-mail a potom se přihlas.'
            : 'Účet byl vytvořen a je rovnou přihlášený.'
        );
      } else {
        await resetPassword(email.trim());
        setMessage('Na e-mail byl odeslán odkaz pro nastavení nového hesla.');
      }
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border-border/70 bg-card/90 shadow-[var(--shadow-soft)]">
        <CardHeader className="space-y-4">
          <div className="w-[168px]">
            <img src={logoSrc} alt="FIGR" className="block h-auto w-full object-contain" />
          </div>
          <div className="space-y-2">
            <CardTitle>Přihlášení do FIGR</CardTitle>
            <p className="text-sm text-muted-foreground">
              Přístup k datům je navázaný na účet. Po přihlášení se načtou cloudová data uložená v Supabase.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Přihlášení</TabsTrigger>
              <TabsTrigger value="signup">Registrace</TabsTrigger>
              <TabsTrigger value="reset">Změna hesla</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <TabsContent value="signin" className="mt-0 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Přihlas se e-mailem a heslem. Lokální data se při prvním přihlášení použijí jako základ pro cloudovou synchronizaci.
                </p>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => {
                    setActiveTab('reset');
                    setMessage(null);
                    setErrorMessage(null);
                  }}
                >
                  Zapomněl jsem heslo / změnit heslo
                </button>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Vytvoř nový účet. Uživatelské jméno se bude zobrazovat v pravém horním rohu aplikace.
                </p>
              </TabsContent>

              <TabsContent value="reset" className="mt-0 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Zadej e-mail a aplikace odešle odkaz pro nastavení nového hesla.
                </p>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => {
                    setActiveTab('signin');
                    setMessage(null);
                    setErrorMessage(null);
                  }}
                >
                  Zpět na přihlášení
                </button>
              </TabsContent>

              {activeTab === 'signup' ? (
                <div className="space-y-2">
                  <Label htmlFor="auth-username">Uživatelské jméno</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="auth-username"
                      autoComplete="nickname"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="auth-email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {activeTab !== 'reset' ? (
                <div className="space-y-2">
                  <Label htmlFor="auth-password">Heslo</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="auth-password"
                      type="password"
                      autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pl-9"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              ) : null}

              {message ? <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{message}</div> : null}
              {errorMessage ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : null}

              {activeTab === 'signup' ? (
                <div className="rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                  Pokud registrace skončí chybou při odesílání potvrzovacího e-mailu, problém je obvykle v SMTP nastavení Supabase.
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {activeTab === 'signin' && 'Přihlásit se'}
                {activeTab === 'signup' && 'Vytvořit účet'}
                {activeTab === 'reset' && 'Odeslat odkaz'}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
