import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { StorageSyncPanel } from './components/StorageSyncPanel';

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthScreen = lazy(() =>
  import("./components/auth/AuthScreen").then((module) => ({ default: module.AuthScreen }))
);

const queryClient = new QueryClient();

const RouteFallback = ({ label }: { label: string }) => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {label}
    </div>
  </div>
);

const AppRoutes = () => {
  const { isCloudEnabled, isLoading, authError, session } = useAuth();
  const visualTheme = (typeof window !== 'undefined' && window.localStorage.getItem('finance_visual_theme')) || 'dark-blue';
  const authBypassEnabled =
    typeof window !== 'undefined' &&
    import.meta.env.DEV &&
    window.location.hash.includes('testBypass=1');

  if (isCloudEnabled && !authBypassEnabled && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Ověřuji přihlášení…
        </div>
      </div>
    );
  }

  if (isCloudEnabled && !authBypassEnabled && !session) {
    return (
      <Suspense fallback={<RouteFallback label="Načítám přihlášení…" />}>
        <AuthScreen visualTheme={visualTheme} initialError={authError} />
      </Suspense>
    );
  }

  return (
    <HashRouter>
      <StorageSyncPanel key={session?.user.id ?? 'local'} />
      <Suspense fallback={<RouteFallback label="Načítám aplikaci…" />}>
        <Routes>
          <Route path="/" element={<Index key={session?.user.id ?? 'local'} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
