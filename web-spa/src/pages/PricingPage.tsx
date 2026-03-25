import { useEffect, useMemo, useState } from 'react';

const PRICING_TITLE = 'QuickMCP Pricing';
const PRICING_STYLE = `
  :root {
    --bg: #f3f7ff;
    --card: #ffffff;
    --line: #dbe6f7;
    --text: #1f2937;
    --muted: #64748b;
    --accent: #2563eb;
    --accent-bg: rgba(37, 99, 235, 0.08);
    --shadow: 0 8px 32px rgba(15, 23, 42, 0.08);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 0;
    border-bottom: 1px solid var(--line);
  }

  .logo {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: var(--text);
  }

  .logo-icon {
    width: 40px;
    height: 40px;
    background: var(--accent);
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  .logo-text {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .nav-link {
    text-decoration: none;
    color: var(--muted);
    font-size: 15px;
    font-weight: 500;
  }

  .nav-link:hover,
  .nav-link.active {
    color: var(--text);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .nav-menu-toggle,
  .nav-mobile-menu {
    display: none;
  }

  @media (min-width: 901px) {
    .nav-menu-toggle,
    .nav-mobile-menu {
      display: none !important;
    }

    .nav-get-started-desktop {
      display: inline-flex !important;
    }
  }

  .btn {
    border: 0;
    border-radius: 10px;
    padding: 11px 18px;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
  }

  .btn-ghost {
    color: var(--text);
    background: transparent;
  }

  .btn-primary {
    color: #fff;
    background: var(--text);
  }

  .hero {
    padding: 56px 0 26px;
    text-align: center;
  }

  .hero h1 {
    font-size: clamp(34px, 8vw, 62px);
    line-height: 1.05;
    letter-spacing: -0.03em;
    margin-bottom: 12px;
    font-weight: 800;
  }

  .hero h1 .serif {
    font-family: "Newsreader", Georgia, serif;
    font-style: italic;
    font-weight: 400;
  }

  .hero p {
    color: var(--muted);
    font-size: 17px;
    max-width: 660px;
    margin: 0 auto;
  }

  .billing-toggle {
    margin: 28px auto 16px;
    width: fit-content;
    padding: 6px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #fff;
    display: flex;
    gap: 6px;
  }

  .billing-option {
    border: 0;
    border-radius: 999px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
  }

  .billing-option.active {
    background: var(--accent);
    color: #fff;
  }

  .discount {
    text-align: center;
    color: #0f766e;
    font-weight: 600;
    margin-bottom: 34px;
    font-size: 14px;
  }

  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
    padding-bottom: 80px;
  }

  .plan {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 24px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .plan.featured {
    border-color: rgba(37, 99, 235, 0.4);
    box-shadow: 0 14px 36px rgba(37, 99, 235, 0.16);
    position: relative;
  }

  .badge {
    position: absolute;
    top: 14px;
    right: 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--accent-bg);
    color: var(--accent);
  }

  .plan-name {
    font-size: 24px;
    letter-spacing: -0.02em;
    margin-bottom: 8px;
    font-weight: 700;
  }

  .plan-desc {
    color: var(--muted);
    font-size: 14px;
    margin-bottom: 18px;
    min-height: 42px;
  }

  .price-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 18px;
    min-height: 50px;
  }

  .price {
    font-size: 38px;
    line-height: 1;
    letter-spacing: -0.03em;
    font-weight: 800;
  }

  .price-note {
    color: var(--muted);
    font-size: 13px;
  }

  .plan .btn {
    width: 100%;
    margin-top: 24px;
    margin-bottom: 18px;
  }

  .plan ul {
    list-style: none;
    display: grid;
    gap: 10px;
    margin-top: auto;
  }

  .plan li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
    color: #334155;
  }

  .plan li i {
    color: #16a34a;
    margin-top: 2px;
  }

  .fine-note {
    margin: 6px auto 72px;
    max-width: 560px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 16px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #ffffff;
    color: var(--muted);
    font-size: 13px;
    text-align: center;
  }

  .fine-note i {
    color: var(--accent);
  }

  .fine-note a {
    text-decoration: none;
    font-weight: 700;
    color: var(--accent);
  }

  .fine-note a:hover {
    text-decoration: underline;
  }

  @media (max-width: 900px) {
    .nav {
      flex-wrap: wrap;
      gap: 12px;
    }

    .nav-links {
      display: none;
    }

    .nav-actions {
      margin-left: auto;
    }

    .nav-actions .btn-ghost,
    .nav-get-started-desktop {
      display: none;
    }

    .nav-menu-toggle {
      display: inline-flex;
      padding: 10px 12px;
    }

    .nav-menu-toggle .label {
      display: none;
    }

    .nav-mobile-menu {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      padding: 10px 12px;
      gap: 10px;
    }

    .nav-mobile-menu.open {
      display: grid;
    }

    .nav-mobile-link {
      text-decoration: none;
      color: var(--muted);
      font-size: 14px;
      font-weight: 500;
      padding: 6px 2px;
    }

    .pricing-grid {
      grid-template-columns: 1fr;
    }
  }
`;

type BillingMode = 'monthly' | 'annual';

export function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billing, setBilling] = useState<BillingMode>('monthly');

  const proPrice = useMemo(() => (billing === 'annual' ? 'US$23' : 'US$29'), [billing]);
  const proPriceNote = useMemo(
    () => (billing === 'annual' ? '/ month, billed yearly' : '/ month'),
    [billing]
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = PRICING_TITLE;

    const fontPreconnectA = document.createElement('link');
    fontPreconnectA.setAttribute('data-react-pricing-head', 'true');
    fontPreconnectA.rel = 'preconnect';
    fontPreconnectA.href = 'https://fonts.googleapis.com';
    document.head.appendChild(fontPreconnectA);

    const fontPreconnectB = document.createElement('link');
    fontPreconnectB.setAttribute('data-react-pricing-head', 'true');
    fontPreconnectB.rel = 'preconnect';
    fontPreconnectB.href = 'https://fonts.gstatic.com';
    fontPreconnectB.crossOrigin = '';
    document.head.appendChild(fontPreconnectB);

    const fontCss = document.createElement('link');
    fontCss.setAttribute('data-react-pricing-head', 'true');
    fontCss.rel = 'stylesheet';
    fontCss.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:ital,wght@0,400;1,400&display=swap';
    document.head.appendChild(fontCss);

    return () => {
      fontPreconnectA.remove();
      fontPreconnectB.remove();
      fontCss.remove();
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMobileMenuOpen(false);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      <style data-react-pricing-style>{PRICING_STYLE}</style>

      <div className="container">
        <nav className="nav">
          <a href="/landing" className="logo">
            <span className="logo-icon">
              <i className="fas fa-rocket"></i>
            </span>
            <span className="logo-text">QuickMCP</span>
          </a>

          <div className="nav-links">
            <a href="/landing#prompts" className="nav-link">Use Cases</a>
            <a href="/landing#how" className="nav-link">How It Works</a>
            <a href="/landing#integrations" className="nav-link">Integrations</a>
            <a href="/pricing" className="nav-link active">Pricing</a>
            <a href="/landing#faq" className="nav-link">FAQ</a>
          </div>

          <div className="nav-actions">
            <a href="/login" className="btn btn-ghost">Sign In</a>
            <a href="/login" className="btn btn-primary nav-get-started-desktop">Get Started</a>
            <button
              type="button"
              id="navMenuToggle"
              className="btn btn-primary nav-menu-toggle"
              aria-expanded={mobileMenuOpen ? 'true' : 'false'}
              aria-controls="navMobileMenu"
              onClick={() => setMobileMenuOpen((value) => !value)}
            >
              <span className="label">Menu</span>
              <i className="fas fa-bars"></i>
            </button>
          </div>

          <div id="navMobileMenu" className={`nav-mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
            <a href="/login" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Sign In</a>
            <a href="/landing#prompts" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Use Cases</a>
            <a href="/landing#how" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="/landing#integrations" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Integrations</a>
            <a href="/pricing" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="/landing#faq" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          </div>
        </nav>
      </div>

      <main className="container">
        <section className="hero">
          <h1>
            Start free, <span className="serif">grow</span> as you go
          </h1>
          <p>
            Flexible plans for teams building MCP-powered workflows across apps, APIs, databases, and enterprise systems.
          </p>
          <div className="billing-toggle" role="tablist" aria-label="Billing period">
            <button
              type="button"
              id="monthlyBtn"
              className={`billing-option${billing === 'monthly' ? ' active' : ''}`}
              aria-selected={billing === 'monthly' ? 'true' : 'false'}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              id="annualBtn"
              className={`billing-option${billing === 'annual' ? ' active' : ''}`}
              aria-selected={billing === 'annual' ? 'true' : 'false'}
              onClick={() => setBilling('annual')}
            >
              Annually
            </button>
          </div>
          <div className="discount">20% Off on an annual subscription</div>
        </section>

        <section className="pricing-grid">
          <article className="plan">
            <h2 className="plan-name">Something</h2>
            <p className="plan-desc">For individual builders and early experiments.</p>
            <div className="price-row">
              <div className="price">US$0</div>
              <div className="price-note">/ month</div>
            </div>
            <ul>
              <li><i className="fas fa-check"></i><span>10 free credits every month</span></li>
              <li><i className="fas fa-check"></i><span>Access to core app connectors</span></li>
              <li><i className="fas fa-check"></i><span>Community support</span></li>
            </ul>
            <a href="/login" className="btn btn-ghost" style={{ border: '1px solid var(--line)' }}>Get started for free</a>
          </article>

          <article className="plan featured">
            <span className="badge">Most Popular</span>
            <h2 className="plan-name">Anything</h2>
            <p className="plan-desc">For growing teams shipping real automations.</p>
            <div className="price-row">
              <div className="price" id="proPrice">{proPrice}</div>
              <div className="price-note" id="proPriceNote">{proPriceNote}</div>
            </div>
            <ul>
              <li><i className="fas fa-check"></i><span><strong id="proCredits">2500</strong> monthly credits included</span></li>
              <li><i className="fas fa-check"></i><span>All integrations and workflow tooling</span></li>
              <li><i className="fas fa-check"></i><span>Priority support</span></li>
              <li><i className="fas fa-check"></i><span>Usage analytics and team visibility</span></li>
            </ul>
            <a href="/login" className="btn btn-primary">Go Pro</a>
          </article>

          <article className="plan">
            <h2 className="plan-name">Everything</h2>
            <p className="plan-desc">For enterprise deployments and advanced governance.</p>
            <div className="price-row">
              <div className="price">Custom</div>
            </div>
            <ul>
              <li><i className="fas fa-check"></i><span>Custom credit and volume packages</span></li>
              <li><i className="fas fa-check"></i><span>SSO, RBAC, and enterprise controls</span></li>
              <li><i className="fas fa-check"></i><span>Dedicated support and onboarding</span></li>
              <li><i className="fas fa-check"></i><span>Private deployment options</span></li>
            </ul>
            <a href="mailto:quickmcp@gmail.com" className="btn btn-ghost" style={{ border: '1px solid var(--line)' }}>Contact us</a>
          </article>
        </section>

        <p className="fine-note">
          <i className="fas fa-envelope-open-text" aria-hidden="true"></i>
          Need a tailored plan? Talk to us at <a href="mailto:quickmcp@gmail.com">quickmcp@gmail.com</a>
        </p>
      </main>
    </>
  );
}
