import { cn } from '@/lib/utils';
import { getInstitution } from '@/lib/institutions';

interface InstitutionAvatarProps {
  institutionId?: string | null;
  fallback: string;
  className?: string;
}

export const InstitutionAvatar = ({
  institutionId,
  fallback,
  className,
}: InstitutionAvatarProps) => {
  const institution = getInstitution(institutionId);
  const label = institution?.shortName || fallback.slice(0, 2).toUpperCase();
  const style = institution
    ? {
        background: `linear-gradient(135deg, ${institution.primaryColor}, ${institution.accentColor})`,
      }
    : {
        background: 'linear-gradient(135deg, #334155, #64748B)',
      };

  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-semibold text-white shadow-sm',
        className
      )}
      style={style}
      aria-hidden="true"
    >
      {label}
    </div>
  );
};
