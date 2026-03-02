import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, useMantineColorScheme } from '@mantine/core';
import {
  IconRocket,
  IconChecklist,
  IconFolders,
  IconTarget,
  IconLayoutDashboard,
  IconChartLine,
  IconRefresh,
  IconSun,
  IconBrain,
  IconMessageChatbot,
  IconSparkles,
  IconMenu2,
  IconX,
} from '@tabler/icons-react';
import { type LandingLang, getLandingT, detectLang } from '@/lib/landing-i18n';
import s from './LandingPage.module.css';

const featureIcons = [
  <IconChecklist size={22} />,
  <IconFolders size={22} />,
  <IconTarget size={22} />,
  <IconLayoutDashboard size={22} />,
  <IconChartLine size={22} />,
  <IconRefresh size={22} />,
];

const aiIcons = [
  <IconSun size={20} />,
  <IconBrain size={20} />,
  <IconChartLine size={20} />,
  <IconMessageChatbot size={20} />,
];

export function LandingPage() {
  const navigate = useNavigate();
  const { setColorScheme } = useMantineColorScheme();
  const [lang, setLang] = useState<LandingLang>(detectLang);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const t = getLandingT(lang);

  // Force light theme on landing
  useEffect(() => {
    setColorScheme('light');
  }, [setColorScheme]);

  // Navbar scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const switchLang = useCallback(() => {
    const next = lang === 'ru' ? 'en' : 'ru';
    setLang(next);
    localStorage.setItem('landing-lang', next);
  }, [lang]);

  const goLogin = () => navigate('/login');

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={s.landing}>
      {/* ── Navbar ── */}
      <nav className={`${s.navbar} ${scrolled ? s.navbarScrolled : ''}`}>
        <div className={s.navInner}>
          <div className={s.logo}>
            <div className={s.logoIcon}>
              <IconRocket size={18} />
            </div>
            TodoPilot
          </div>

          <div className={s.navLinks}>
            <a className={s.navLink} onClick={() => scrollTo('features')} style={{ cursor: 'pointer' }}>
              {t.nav.features}
            </a>
            <a className={s.navLink} onClick={() => scrollTo('how-it-works')} style={{ cursor: 'pointer' }}>
              {t.nav.howItWorks}
            </a>
            <a className={s.navLink} onClick={() => scrollTo('ai')} style={{ cursor: 'pointer' }}>
              {t.nav.ai}
            </a>
          </div>

          <div className={s.navActions}>
            <button className={s.langSwitch} onClick={switchLang}>
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
            <Button variant="subtle" size="sm" onClick={goLogin}>
              {t.nav.login}
            </Button>
            <Button size="sm" onClick={goLogin} style={{ display: mobileOpen ? 'none' : undefined }}>
              {t.nav.start}
            </Button>

            <div className={s.mobileMenu}>
              <Button
                variant="subtle"
                size="sm"
                px={8}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
              </Button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div style={{ padding: '8px 24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a className={s.navLink} onClick={() => scrollTo('features')} style={{ cursor: 'pointer' }}>
              {t.nav.features}
            </a>
            <a className={s.navLink} onClick={() => scrollTo('how-it-works')} style={{ cursor: 'pointer' }}>
              {t.nav.howItWorks}
            </a>
            <a className={s.navLink} onClick={() => scrollTo('ai')} style={{ cursor: 'pointer' }}>
              {t.nav.ai}
            </a>
            <Button size="sm" onClick={goLogin} mt={4}>
              {t.nav.start}
            </Button>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className={s.hero}>
        <div className={s.heroBadge}>
          <IconSparkles size={14} />
          {t.hero.badge}
        </div>
        <h1 className={s.heroTitle}>
          {t.hero.title}
          <br />
          <span className={s.heroAccent}>{t.hero.titleAccent}</span>
        </h1>
        <p className={s.heroSubtitle}>{t.hero.subtitle}</p>
        <div className={s.heroCta}>
          <Button size="lg" radius="md" onClick={goLogin}>
            {t.hero.cta}
          </Button>
          <Button size="lg" radius="md" variant="default" onClick={() => scrollTo('features')}>
            {t.hero.demo}
          </Button>
        </div>

        <div className={s.sectionImage}>
          <img src="/landing/hero.svg" alt="TodoPilot — вид «Сегодня» со списком задач" />
        </div>
      </section>

      {/* ── Features ── */}
      <div className={s.sectionAlt}>
        <section className={s.sectionAltInner} id="features">
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>{t.features.title}</h2>
            <p className={s.sectionSubtitle}>{t.features.subtitle}</p>
          </div>

          <div className={s.featuresGrid}>
            {t.features.items.map((item, i) => (
              <div className={s.featureCard} key={i}>
                <div className={s.featureIcon}>{featureIcons[i]}</div>
                <h3 className={s.featureTitle}>{item.title}</h3>
                <p className={s.featureDesc}>{item.description}</p>
              </div>
            ))}
          </div>

          <div className={s.sectionImage}>
            <img src="/landing/features.svg" alt="TodoPilot — экран проектов" />
          </div>
        </section>
      </div>

      {/* ── How it works ── */}
      <section className={s.section} id="how-it-works">
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>{t.howItWorks.title}</h2>
          <p className={s.sectionSubtitle}>{t.howItWorks.subtitle}</p>
        </div>

        <div className={s.stepsGrid}>
          {t.howItWorks.steps.map((step) => (
            <div className={s.stepCard} key={step.step}>
              <div className={s.stepNumber}>{step.step}</div>
              <h3 className={s.stepTitle}>{step.title}</h3>
              <p className={s.stepDesc}>{step.description}</p>
            </div>
          ))}
        </div>

        <div className={s.sectionImage}>
          <img src="/landing/goals.svg" alt="TodoPilot — экран целей с прогресс-барами" />
        </div>
      </section>

      {/* ── AI ── */}
      <div className={s.sectionAlt}>
        <section className={s.sectionAltInner} id="ai">
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>{t.ai.title}</h2>
            <p className={s.sectionSubtitle}>{t.ai.subtitle}</p>
          </div>

          <div className={s.featuresSplit}>
            <div className={s.aiGrid}>
              {t.ai.items.map((item, i) => (
                <div className={s.aiCard} key={i}>
                  <div className={s.aiCardIcon}>{aiIcons[i]}</div>
                  <h3 className={s.aiCardTitle}>{item.title}</h3>
                  <p className={s.aiCardDesc}>{item.description}</p>
                </div>
              ))}
            </div>

            <div className={s.sectionImageSmall}>
              <img src="/landing/ai-chat.svg" alt="TodoPilot — AI-чат с рекомендациями" />
            </div>
          </div>
        </section>
      </div>

      {/* ── CTA ── */}
      <section className={s.cta}>
        <div className={s.ctaInner}>
          <h2 className={s.ctaTitle}>{t.cta.title}</h2>
          <p className={s.ctaSubtitle}>{t.cta.subtitle}</p>
          <Button size="lg" radius="md" variant="white" color="indigo" onClick={goLogin}>
            {t.cta.button}
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>
            <div className={s.logo}>
              <div className={s.logoIcon}>
                <IconRocket size={18} />
              </div>
              TodoPilot
            </div>
            <p className={s.footerDesc}>{t.footer.description}</p>
          </div>

          <div>
            <h4 className={s.footerColTitle}>{t.footer.product}</h4>
            <a className={s.footerLink} onClick={() => scrollTo('features')} style={{ cursor: 'pointer' }}>
              {t.footer.features}
            </a>
            <a className={s.footerLink} href="#" onClick={(e) => e.preventDefault()}>
              {t.footer.pricing}
            </a>
            <a className={s.footerLink} href="#" onClick={(e) => e.preventDefault()}>
              {t.footer.changelog}
            </a>
          </div>

          <div>
            <h4 className={s.footerColTitle}>{t.footer.support}</h4>
            <a className={s.footerLink} href="#" onClick={(e) => e.preventDefault()}>
              {t.footer.docs}
            </a>
            <a className={s.footerLink} href="#" onClick={(e) => e.preventDefault()}>
              {t.footer.contact}
            </a>
            <a className={s.footerLink} href="#" onClick={(e) => e.preventDefault()}>
              {t.footer.privacy}
            </a>
          </div>

          <div>
            <h4 className={s.footerColTitle}>{t.footer.legal}</h4>
            <a className={s.footerLink} href="#" onClick={(e) => e.preventDefault()}>
              {t.footer.terms}
            </a>
            <a className={s.footerLink} href="#" onClick={(e) => e.preventDefault()}>
              {t.footer.privacyPolicy}
            </a>
          </div>
        </div>

        <div className={s.footerBottom}>
          &copy; {new Date().getFullYear()} TodoPilot. {t.footer.rights}
        </div>
      </footer>
    </div>
  );
}
