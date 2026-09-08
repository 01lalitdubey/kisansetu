import { Link } from 'react-router-dom';
import { useT } from '../../i18n';

export function Footer() {
  const { t } = useT();

  const links = [
    { label: t('landing.footer.linkFarmer'), to: '/farmer/auth' },
    { label: t('landing.footer.linkOfficer'), to: '/officer/dashboard' },
    { label: t('landing.footer.linkAdmin'), to: '/admin/dashboard' },
    { label: t('landing.footer.linkAbout'), to: '/#final' },
    { label: t('landing.footer.linkContact'), to: '/#final' },
    { label: t('landing.footer.linkPrivacy'), to: '/#final' },
    { label: t('landing.footer.linkTerms'), to: '/#final' },
  ];

  return (
    <footer className="relative z-20 bg-[var(--lp-green-900)] py-12 text-white/70">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xl font-extrabold tracking-tight text-white">KisanSetu AI</p>
            <p className="mt-1.5 max-w-xs text-sm text-white/55">{t('landing.footer.tagline')}</p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-semibold">
            {links.map((l) => (
              <Link key={l.label} to={l.to} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/40">
          <p>{t('landing.footer.prototypeNote')}</p>
          <p className="mt-1">{t('landing.footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
