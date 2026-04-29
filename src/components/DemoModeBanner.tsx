import { MonitorPlay } from 'lucide-react';

export const DemoModeBanner = () => {
  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-4">
      <div className="flex items-start gap-3">
        <MonitorPlay className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
        <div>
          <p className="font-medium text-sky-900 dark:text-sky-100">Demo web režim</p>
          <p className="text-sm text-sky-900/80 dark:text-sky-100/80">
            Tato ukázka běží v prohlížeči bez desktopové databáze. Finance, investice i vzhled si
            můžeš plně proklikat, ale funkce jako lokální zálohy nebo práce se systémovými
            složkami jsou dostupné jen v desktopové verzi.
          </p>
        </div>
      </div>
    </div>
  );
};
