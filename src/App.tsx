import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthScreen } from "./components/auth/AuthScreen";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isCloudEnabled, isLoading, authError, session } = useAuth();
  const visualTheme = (typeof window !== 'undefined' && window.localStorage.getItem('finance_visual_theme')) || 'dark-blue';
  const authBypassEnabled =
    typeof window !== 'undefined' &&
    (window.localStorage.getItem('figr_auth_bypass') === 'true' || window.location.hash.includes('testBypass=1'));

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
    return <AuthScreen visualTheme={visualTheme} initialError={authError} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
