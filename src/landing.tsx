import './landing-style.css';
import landingIllustration from './assets/landing-illustration.png';
import {useEffect, useRef} from 'react';

type LandingProps = {
  onStartOwner: () => void;
  onSignIn: () => void;
};

// This public example is deliberately separate from saved reports and account data.
const sampleAmounts = [
  ['Room revenue', '₹8,000'],
  ['Food revenue', '₹1,500'],
  ['Guest cash', '₹2,500'],
  ['Guest UPI', '₹7,000'],
  ['Expenses', '₹450'],
] as const;

const sampleMonthAmounts = [
  ['Room revenue', '₹2,40,000'],
  ['Food revenue', '₹45,000'],
  ['Guest cash', '₹75,000'],
  ['Guest UPI', '₹2,10,000'],
  ['Expenses', '₹13,500'],
] as const;

const sampleDailyMessage = [
  'Example daily summary — 12 May 2027',
  ...sampleAmounts.map(([label, amount]) => `${label}: ${amount}`),
  'Sales vs money: Matches',
].join('\n');

const plans = [
  {name: 'Monthly', amount: '₹399', oldAmount: '₹499', bestValue: false},
  {name: 'Yearly', amount: '₹3,990', oldAmount: '₹4,990', bestValue: true},
] as const;

const planContactLink = (name: string, amount: string) =>
  `https://wa.me/?text=${encodeURIComponent(`Hi, I'm interested in the ${name} plan (${amount} per property).`)}`;

export function Landing({onStartOwner, onSignIn}: LandingProps) {
  const pricingRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const pricing = pricingRef.current;
    if (!pricing || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      pricing.querySelectorAll<HTMLElement>('.landing-plan').forEach((card, index) => {
        if (typeof card.animate !== 'function') return;
        animations.push(card.animate([
          {transform: 'perspective(900px) rotateX(6deg) translateY(10px)', clipPath: 'inset(0 0 24% 0 round 16px)', opacity: .8, offset: 0},
          {transform: 'perspective(900px) rotateX(2deg) translateY(6px)', clipPath: 'inset(0 0 14% 0 round 16px)', opacity: 1, offset: .25},
          {transform: 'perspective(900px) rotateX(0deg) translateY(2px)', clipPath: 'inset(0 0 3% 0 round 16px)', opacity: 1, offset: .7},
          {transform: 'none', clipPath: 'inset(0 0 0 0 round 16px)', opacity: 1, offset: 1},
        ], {duration: 640, delay: index * 80, easing: 'cubic-bezier(0.16, 1, 0.3, 1)'}));
      });
    }, {threshold: .1});
    observer.observe(pricing);
    return () => {observer.disconnect(); animations.forEach(animation => animation.cancel());};
  }, []);
  return (
    <section className="landing-page" aria-labelledby="landing-headline">
      <header>
        <h1 id="landing-headline"><span>Turn Your Paper DSR</span>{' '}<span>into a Digital DSR</span></h1>
        <p className="landing-subheadline">Your team uploads the DSR. AI checks the numbers. You get the important update on WhatsApp</p>
      </header>

      <div className="landing-actions">
        <button type="button" className="primary-action" onClick={onStartOwner}>Start as owner</button>
        <button type="button" className="secondary" onClick={onSignIn}>Sign in</button>
      </div>

      <figure className="landing-illustration">
        <img src={landingIllustration} width={1536} height={1024} alt="A paper report at a hotel desk being read on a phone." decoding="async" />
      </figure>

      <section aria-labelledby="landing-steps-heading">
        <h2 id="landing-steps-heading">How it works</h2>
        <ol className="landing-steps">
          <li>
            <span className="landing-step-number" aria-hidden="true">1</span>
            <p>The manager photographs the paper DSR.</p>
          </li>
          <li>
            <span className="landing-step-number" aria-hidden="true">2</span>
            <p>AI reads it. The manager checks the numbers.</p>
          </li>
          <li>
            <span className="landing-step-number" aria-hidden="true">3</span>
            <p>The manager sends the day on WhatsApp. You see the month on your dashboard.</p>
          </li>
        </ol>
      </section>

      <section className="landing-example" aria-labelledby="landing-sample-heading">
        <h2 id="landing-sample-heading">Sample receipt</h2>
        <p className="landing-example-note">Made-up numbers to show how a day looks.</p>
        <article className="day-receipt landing-sample" aria-labelledby="landing-sample-date">
          <header>
            <p className="receipt-hotel">Example day</p>
            <h3 className="receipt-date" id="landing-sample-date">12 May 2027</h3>
          </header>
          <dl className="receipt-amounts">
            {sampleAmounts.map(([label, amount]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{amount}</dd>
              </div>
            ))}
          </dl>
          <div className="sales-money-check" data-tone="matches">
            <span>Sales vs money</span>
            <span className="sales-money-badge">Matches</span>
          </div>
        </article>
      </section>

      <section className="landing-more" aria-labelledby="landing-owner-heading">
        <h2 id="landing-owner-heading">What the owner gets</h2>
        <p className="landing-section-copy">A daily summary on WhatsApp and saved totals for the month.</p>
        <p className="landing-example-note">Both examples use made-up numbers. They are not real hotel records.</p>
        <h3>Sample WhatsApp daily summary</h3>
        <pre className="landing-message">{sampleDailyMessage}</pre>
        <h3>Sample month total — May 2027</h3>
        <dl className="landing-month-amounts">
          {sampleMonthAmounts.map(([label, amount]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{amount}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="landing-more" aria-labelledby="landing-privacy-heading">
        <h2 id="landing-privacy-heading">Your data stays private</h2>
        <p className="landing-section-copy">We don’t save your uploaded photos. Each property can access only its own saved days.</p>
      </section>

      <section className="landing-more landing-pricing" aria-labelledby="landing-price-heading" ref={pricingRef}>
        <h2 id="landing-price-heading">Price</h2>
        <div className="landing-plans">
          {plans.map((plan, index) => (
            <div key={plan.name}>
              {plan.oldAmount && <p className="landing-plan-offer">Launch offer</p>}
              <article className={`landing-plan${plan.bestValue ? ' landing-plan-best' : ''}`} aria-labelledby={`landing-plan-${index}`}>
              <div className="landing-plan-header">
                <h3 id={`landing-plan-${index}`}>{plan.name}</h3>
                {plan.bestValue && <span className="landing-plan-tag">Best value, 2 months free</span>}
              </div>
              <p className="landing-plan-amount">{plan.oldAmount && <><s>{plan.oldAmount}</s>{' '}</>}<span>{plan.amount}</span></p>
              <p className="landing-plan-unit">Per property</p>
              <a className="landing-plan-contact secondary" href={planContactLink(plan.name, plan.amount)} target="_blank" rel="noopener noreferrer">Talk to me on WhatsApp</a>
              </article>
            </div>
          ))}
        </div>
        <p className="landing-pricing-note">Opens WhatsApp. Choose your contact.</p>
      </section>

      <section className="landing-more landing-final" aria-label="Get started">
        <button type="button" className="primary-action" onClick={onStartOwner}>Start as owner</button>
      </section>
    </section>
  );
}
