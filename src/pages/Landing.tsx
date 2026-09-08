import { useEffect } from 'react';
import './../components/landing/landing.css';
import { Nav } from '../components/landing/Nav';
import { Hero } from '../components/landing/Hero';
import { ProblemSection } from '../components/landing/ProblemSection';
import { HowItWorks } from '../components/landing/HowItWorks';
import { DashboardPreview } from '../components/landing/DashboardPreview';
import { QueueSection } from '../components/landing/QueueSection';
import { CentresSection } from '../components/landing/CentresSection';
import { TransportSection } from '../components/landing/TransportSection';
import { PaymentSection } from '../components/landing/PaymentSection';
import { LanguageSection } from '../components/landing/LanguageSection';
import { RolesSection } from '../components/landing/RolesSection';
import { ImpactSection } from '../components/landing/ImpactSection';
import { FinalCTA } from '../components/landing/FinalCTA';
import { Footer } from '../components/landing/Footer';

/**
 * KisanSetu AI — public landing page. Static, image-led AgriTech
 * presentation (no 3D / WebGL / scroll-jacking). Landing-only — no
 * dashboard / API / auth / Stripe / Supabase / Maps logic is changed here;
 * role links point at the existing routes.
 */
export default function Landing() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="lp">
      <Nav />
      <main className="relative">
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <DashboardPreview />
        <QueueSection />
        <CentresSection />
        <TransportSection />
        <PaymentSection />
        <LanguageSection />
        <RolesSection />
        <ImpactSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
