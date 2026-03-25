import { useEffect } from 'react';

const LANDING_TITLE = "QuickMCP - AI-Powered MCP Server Generator";
const LANDING_STYLE = "\n    :root {\n      --bg: #f3f7ff;\n      --bg-soft: #ffffff;\n      --card: #ffffff;\n      --line: #dbe6f7;\n      --text: #1f2937;\n      --text-secondary: #475569;\n      --muted: #64748b;\n      --accent: #2563eb;\n      --accent-soft: #60a5fa;\n      --accent-bg: rgba(37, 99, 235, 0.08);\n      --shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.04);\n      --shadow: 0 8px 32px rgba(15, 23, 42, 0.08);\n      --shadow-lg: 0 24px 64px rgba(15, 23, 42, 0.12);\n    }\n\n    * {\n      box-sizing: border-box;\n      margin: 0;\n      padding: 0;\n    }\n\n    body {\n      background: var(--bg);\n      color: var(--text);\n      font-family: \"Inter\", -apple-system, BlinkMacSystemFont, sans-serif;\n      overflow-x: hidden;\n      line-height: 1.5;\n    }\n\n    /* Background Effects */\n    .bg-effects {\n      position: fixed;\n      inset: 0;\n      z-index: 0;\n      pointer-events: none;\n      overflow: hidden;\n      background: radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.12), transparent 62%);\n      filter: saturate(118%) contrast(106%);\n    }\n\n    .gradient-orb {\n      position: absolute;\n      border-radius: 50%;\n      filter: blur(46px);\n      opacity: 0;\n      will-change: transform;\n    }\n\n    .gradient-orb.one {\n      width: 44vmax;\n      height: 44vmax;\n      top: -10vmax;\n      left: -8vmax;\n      background: radial-gradient(circle at 35% 35%, rgba(245, 217, 122, 0.68), rgba(245, 217, 122, 0.32) 46%, transparent 74%);\n      animation: blobDropOne 18s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;\n    }\n\n    .gradient-orb.two {\n      width: 42vmax;\n      height: 42vmax;\n      top: 8vmax;\n      left: 22vmax;\n      background: radial-gradient(circle at 40% 30%, rgba(240, 160, 192, 0.64), rgba(240, 160, 192, 0.3) 46%, transparent 74%);\n      animation: blobDropTwo 20s cubic-bezier(0.22, 0.61, 0.36, 1) 3s infinite;\n    }\n\n    .gradient-orb.three {\n      width: 46vmax;\n      height: 46vmax;\n      bottom: -12vmax;\n      right: -10vmax;\n      background: radial-gradient(circle at 50% 45%, rgba(212, 160, 240, 0.64), rgba(212, 160, 240, 0.3) 46%, transparent 74%);\n      animation: blobDropThree 22s cubic-bezier(0.22, 0.61, 0.36, 1) 6s infinite;\n    }\n\n    @keyframes blobDropOne {\n      0% {\n        transform: translate3d(0, 0, 0) scale(0.2);\n        opacity: 0;\n      }\n      18% {\n        opacity: 0.62;\n      }\n      55% {\n        transform: translate3d(14vw, 12vh, 0) scale(1.25);\n        opacity: 0.5;\n      }\n      100% {\n        transform: translate3d(28vw, 24vh, 0) scale(2.3);\n        opacity: 0;\n      }\n    }\n\n    @keyframes blobDropTwo {\n      0% {\n        transform: translate3d(0, 0, 0) scale(0.22);\n        opacity: 0;\n      }\n      20% {\n        opacity: 0.58;\n      }\n      58% {\n        transform: translate3d(-16vw, 14vh, 0) scale(1.3);\n        opacity: 0.46;\n      }\n      100% {\n        transform: translate3d(-32vw, 24vh, 0) scale(2.4);\n        opacity: 0;\n      }\n    }\n\n    @keyframes blobDropThree {\n      0% {\n        transform: translate3d(0, 0, 0) scale(0.2);\n        opacity: 0;\n      }\n      16% {\n        opacity: 0.56;\n      }\n      60% {\n        transform: translate3d(-20vw, -16vh, 0) scale(1.35);\n        opacity: 0.44;\n      }\n      100% {\n        transform: translate3d(-34vw, -28vh, 0) scale(2.5);\n        opacity: 0;\n      }\n    }\n\n    /* Layout */\n    .container {\n      position: relative;\n      z-index: 1;\n      max-width: 1200px;\n      margin: 0 auto;\n      padding: 0 24px;\n    }\n\n    /* Navigation */\n    .nav {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      padding: 20px 0;\n      border-bottom: 1px solid var(--line);\n    }\n\n    .logo {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      text-decoration: none;\n      color: var(--text);\n    }\n\n    .logo-icon {\n      width: 40px;\n      height: 40px;\n      background: var(--accent);\n      border-radius: 10px;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      color: white;\n      font-size: 18px;\n      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);\n    }\n\n    .logo-text {\n      font-weight: 800;\n      font-size: 22px;\n      letter-spacing: -0.02em;\n    }\n\n    .nav-links {\n      display: flex;\n      align-items: center;\n      gap: 32px;\n    }\n\n    .nav-link {\n      text-decoration: none;\n      color: var(--text-secondary);\n      font-weight: 500;\n      font-size: 15px;\n      transition: color 0.2s;\n    }\n\n    .nav-link:hover {\n      color: var(--text);\n    }\n\n    .nav-actions {\n      display: flex;\n      align-items: center;\n      gap: 16px;\n    }\n\n    .nav-menu-toggle,\n    .nav-mobile-menu {\n      display: none;\n    }\n\n    @media (min-width: 901px) {\n      .nav-menu-toggle,\n      .nav-mobile-menu {\n        display: none !important;\n      }\n\n      .nav-get-started-desktop {\n        display: inline-flex !important;\n      }\n    }\n\n    .btn {\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      gap: 8px;\n      padding: 12px 20px;\n      border-radius: 10px;\n      font-weight: 600;\n      font-size: 14px;\n      text-decoration: none;\n      transition: all 0.2s;\n      cursor: pointer;\n      border: none;\n    }\n\n    .btn-ghost {\n      color: var(--text);\n      background: transparent;\n    }\n\n    .btn-ghost:hover {\n      background: var(--accent-bg);\n      color: var(--accent);\n    }\n\n    .btn-primary {\n      background: var(--text);\n      color: white;\n    }\n\n    .btn-primary:hover {\n      background: #1a1918;\n      transform: translateY(-1px);\n    }\n\n    .btn-accent {\n      background: var(--accent);\n      color: white;\n      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);\n    }\n\n    .btn-accent:hover {\n      background: #1d4ed8;\n      transform: translateY(-1px);\n      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);\n    }\n\n    /* Hero Section */\n    .hero {\n      padding: 80px 0 60px;\n      text-align: center;\n    }\n\n    .hero-badge {\n      display: inline-flex;\n      align-items: center;\n      gap: 8px;\n      padding: 8px 16px;\n      background: var(--accent-bg);\n      border: 1px solid rgba(37, 99, 235, 0.2);\n      border-radius: 100px;\n      font-size: 13px;\n      font-weight: 600;\n      color: var(--accent);\n      margin-bottom: 24px;\n    }\n\n    .hero-badge i {\n      font-size: 12px;\n    }\n\n    .hero-title {\n      font-size: clamp(42px, 8vw, 72px);\n      font-weight: 800;\n      line-height: 1.05;\n      letter-spacing: -0.03em;\n      margin-bottom: 24px;\n      max-width: 900px;\n      margin-left: auto;\n      margin-right: auto;\n    }\n\n    .hero-title .highlight {\n      color: var(--accent);\n    }\n\n    .hero-title .serif {\n      font-family: \"Newsreader\", Georgia, serif;\n      font-style: italic;\n      font-weight: 400;\n    }\n\n    .type-cursor {\n      display: inline-block;\n      margin-left: 2px;\n      color: var(--accent);\n      animation: blink 1s steps(1, end) infinite;\n    }\n\n    @keyframes blink {\n      50% { opacity: 0; }\n    }\n\n    .hero-subtitle {\n      font-size: 18px;\n      color: var(--text-secondary);\n      max-width: 600px;\n      margin: 0 auto 40px;\n      line-height: 1.6;\n    }\n\n    .hero-actions {\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      gap: 16px;\n      flex-wrap: wrap;\n    }\n\n    .hero-actions .btn {\n      padding: 14px 28px;\n      font-size: 15px;\n    }\n\n    /* Prompt Cards Section */\n    .prompts-section {\n      padding: 40px 0 80px;\n    }\n\n    .section-header {\n      text-align: center;\n      margin-bottom: 48px;\n    }\n\n    .section-label {\n      display: inline-block;\n      font-size: 12px;\n      font-weight: 700;\n      text-transform: uppercase;\n      letter-spacing: 0.1em;\n      color: var(--muted);\n      margin-bottom: 12px;\n    }\n\n    .section-title {\n      font-size: clamp(28px, 5vw, 42px);\n      font-weight: 800;\n      letter-spacing: -0.02em;\n      margin-bottom: 16px;\n    }\n\n    .section-subtitle {\n      font-size: 16px;\n      color: var(--text-secondary);\n      max-width: 500px;\n      margin: 0 auto;\n    }\n\n    .prompt-grid {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));\n      gap: 20px;\n    }\n\n    .prompt-card {\n      background: var(--card);\n      border: 1px solid var(--line);\n      border-radius: 16px;\n      padding: 24px;\n      display: flex;\n      flex-direction: column;\n      height: 100%;\n      transition: all 0.3s;\n      position: relative;\n      overflow: hidden;\n    }\n\n    .prompt-card:hover {\n      border-color: rgba(37, 99, 235, 0.3);\n      box-shadow: var(--shadow);\n      transform: translateY(-2px);\n    }\n\n    .prompt-card-header {\n      display: flex;\n      align-items: flex-start;\n      gap: 16px;\n      margin-bottom: 16px;\n    }\n\n    .prompt-icon {\n      width: 48px;\n      height: 48px;\n      border-radius: 12px;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      background: #ffffff;\n      border: 1px solid var(--line);\n      flex-shrink: 0;\n      overflow: hidden;\n    }\n\n    .prompt-icon img {\n      width: 42px;\n      height: 42px;\n      object-fit: contain;\n      border-radius: 4px;\n    }\n\n    .prompt-meta {\n      flex: 1;\n    }\n\n    .prompt-app {\n      font-size: 13px;\n      font-weight: 600;\n      color: var(--muted);\n      margin-bottom: 4px;\n    }\n\n    .prompt-title {\n      font-size: 18px;\n      font-weight: 700;\n      color: var(--text);\n      line-height: 1.3;\n    }\n\n    .prompt-description {\n      font-size: 14px;\n      color: var(--text-secondary);\n      line-height: 1.6;\n      margin-bottom: 20px;\n    }\n\n    .prompt-footer {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      margin-top: auto;\n    }\n\n    .prompt-users {\n      display: flex;\n      align-items: center;\n      gap: 8px;\n      font-size: 13px;\n      color: var(--muted);\n    }\n\n    .prompt-users i {\n      color: var(--accent);\n    }\n\n    .prompt-cta {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 10px 16px;\n      background: var(--text);\n      color: white;\n      border-radius: 8px;\n      font-size: 13px;\n      font-weight: 600;\n      text-decoration: none;\n      transition: all 0.2s;\n    }\n\n    .prompt-cta:hover {\n      background: var(--accent);\n      transform: translateX(2px);\n    }\n\n    .prompt-cta i {\n      font-size: 11px;\n      transition: transform 0.2s;\n    }\n\n    .prompt-cta:hover i {\n      transform: translateX(3px);\n    }\n\n    /* How It Works Section */\n    .how-section {\n      padding: 80px 0;\n      background: var(--bg-soft);\n      border-top: 1px solid var(--line);\n      border-bottom: 1px solid var(--line);\n    }\n\n    .steps-grid {\n      display: grid;\n      grid-template-columns: repeat(3, 1fr);\n      gap: 40px;\n      margin-top: 48px;\n    }\n\n    .step {\n      text-align: center;\n      position: relative;\n    }\n\n    .step-number {\n      width: 56px;\n      height: 56px;\n      background: var(--accent);\n      color: white;\n      border-radius: 16px;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      font-size: 24px;\n      font-weight: 800;\n      margin: 0 auto 20px;\n      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.25);\n    }\n\n    .step-title {\n      font-size: 20px;\n      font-weight: 700;\n      margin-bottom: 12px;\n    }\n\n    .step-desc {\n      font-size: 15px;\n      color: var(--text-secondary);\n      line-height: 1.6;\n    }\n\n    /* Integrations Section */\n    .integrations-section {\n      padding: 80px 0;\n    }\n\n    .integrations-wrap {\n      background: var(--card);\n      border: 1px solid var(--line);\n      border-bottom: none;\n      border-radius: 20px;\n      padding: 32px;\n      overflow: hidden;\n    }\n\n    .integrations-header {\n      text-align: center;\n      margin-bottom: 32px;\n    }\n\n    .integrations-title {\n      font-size: clamp(28px, 5vw, 42px);\n      font-weight: 800;\n      letter-spacing: -0.02em;\n      margin-bottom: 16px;\n    }\n\n    .integrations-subtitle {\n      font-size: 15px;\n      color: var(--text-secondary);\n    }\n\n    .marquee-container {\n      overflow: hidden;\n      mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);\n    }\n\n    .marquee-row {\n      padding: 8px 0;\n    }\n\n    .marquee {\n      display: flex;\n      width: max-content;\n      gap: 12px;\n    }\n\n    .marquee.left {\n      animation: marquee-left 50s linear infinite;\n    }\n\n    .marquee.right {\n      animation: marquee-right 45s linear infinite;\n    }\n\n    @keyframes marquee-left {\n      from { transform: translateX(0); }\n      to { transform: translateX(-50%); }\n    }\n\n    @keyframes marquee-right {\n      from { transform: translateX(-50%); }\n      to { transform: translateX(0); }\n    }\n\n    .integration-chip {\n      display: inline-flex;\n      align-items: center;\n      gap: 10px;\n      padding: 10px 18px;\n      background: var(--bg);\n      border: 1px solid var(--line);\n      border-radius: 100px;\n      font-size: 14px;\n      font-weight: 600;\n      color: var(--text);\n      white-space: nowrap;\n      transition: all 0.2s;\n    }\n\n    .integration-chip:hover {\n      border-color: var(--accent);\n      background: var(--accent-bg);\n    }\n\n    .integration-chip img {\n      width: 22px;\n      height: 22px;\n      border-radius: 6px;\n      object-fit: contain;\n    }\n\n    .server-tech {\n      margin-top: 36px;\n      text-align: center;\n    }\n\n    .server-tech-title {\n      font-size: clamp(28px, 5vw, 42px);\n      font-weight: 800;\n      letter-spacing: -0.02em;\n      margin-bottom: 12px;\n    }\n\n    .server-tech-subtitle {\n      font-size: 15px;\n      color: var(--text-secondary);\n      margin-bottom: 16px;\n    }\n\n    .server-tech-chip {\n      display: inline-flex;\n      align-items: center;\n      gap: 8px;\n      padding: 12px 18px;\n      border-radius: 999px;\n      border: 1px solid var(--line);\n      background: #fff;\n      color: var(--text);\n      font-size: 14px;\n      font-weight: 600;\n      white-space: nowrap;\n    }\n\n    .server-tech-chip img {\n      width: 20px;\n      height: 20px;\n      object-fit: contain;\n      border-radius: 4px;\n    }\n\n    .marquee.tech-left {\n      animation: marquee-left 150s linear infinite;\n    }\n\n    .marquee.tech-right {\n      animation: marquee-right 150s linear infinite;\n    }\n\n    .server-tech .marquee-row {\n      padding: 14px 0;\n    }\n\n    /* FAQ Section */\n    .faq-section {\n      padding: 80px 0;\n      background: transparent;\n      border-top: none;\n    }\n\n    .install-anywhere-spotlight {\n      position: relative;\n      margin: -22px auto 28px;\n      max-width: 660px;\n      border-radius: 18px;\n      padding: 1px;\n      background: linear-gradient(120deg, #1d4ed8, #2563eb, #38bdf8, #1d4ed8);\n      background-size: 240% 240%;\n      animation: installGradientShift 7s ease infinite;\n      box-shadow: 0 14px 30px rgba(14, 116, 248, 0.2);\n    }\n\n    .install-anywhere-spotlight::before {\n      content: '';\n      position: absolute;\n      inset: -16px;\n      border-radius: 24px;\n      z-index: -1;\n      background: radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.3), transparent 70%);\n      filter: blur(14px);\n      pointer-events: none;\n    }\n\n    .install-anywhere-trigger {\n      width: 100%;\n      border: none;\n      border-radius: 17px;\n      background: linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(3, 105, 161, 0.95));\n      color: #ffffff;\n      padding: 14px 16px;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      gap: 16px;\n      cursor: pointer;\n      transition: transform 0.2s ease, box-shadow 0.2s ease;\n      text-align: center;\n      position: relative;\n    }\n\n    .install-anywhere-trigger:hover {\n      transform: translateY(-2px);\n      box-shadow: 0 20px 36px rgba(15, 23, 42, 0.28);\n    }\n\n    .install-anywhere-copy {\n      display: grid;\n      gap: 6px;\n      align-items: center;\n      width: 100%;\n      padding: 0 44px;\n    }\n\n    .install-anywhere-title {\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      gap: 10px;\n      font-size: 22px;\n      line-height: 1.1;\n      font-weight: 800;\n      letter-spacing: -0.02em;\n    }\n\n    .install-anywhere-subtitle {\n      font-size: 12px;\n      color: rgba(255, 255, 255, 0.86);\n    }\n\n    .install-anywhere-chevron {\n      width: 34px;\n      height: 34px;\n      border-radius: 10px;\n      border: 1px solid rgba(255, 255, 255, 0.22);\n      background: rgba(255, 255, 255, 0.14);\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      flex-shrink: 0;\n      font-size: 13px;\n      position: absolute;\n      right: 12px;\n      top: 50%;\n      transform: translateY(-50%);\n    }\n\n    @keyframes installGradientShift {\n      0% { background-position: 0% 50%; }\n      50% { background-position: 100% 50%; }\n      100% { background-position: 0% 50%; }\n    }\n\n    .install-modal {\n      position: fixed;\n      inset: 0;\n      z-index: 140;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      padding: 20px;\n      opacity: 0;\n      visibility: hidden;\n      pointer-events: none;\n      transition: opacity 0.2s ease, visibility 0.2s ease;\n    }\n\n    .install-modal.open {\n      opacity: 1;\n      visibility: visible;\n      pointer-events: auto;\n    }\n\n    .install-modal-backdrop {\n      position: absolute;\n      inset: 0;\n      background: rgba(15, 23, 42, 0.48);\n      backdrop-filter: blur(2px);\n    }\n\n    .install-modal-panel {\n      position: relative;\n      width: min(560px, 100%);\n      background: #ffffff;\n      border: 1px solid var(--line);\n      border-radius: 18px;\n      box-shadow: var(--shadow-lg);\n      padding: 22px;\n      overflow: visible;\n    }\n\n    .install-modal-view.hidden {\n      display: none;\n    }\n\n    .install-modal.detail-active .install-modal-panel {\n      padding-top: 56px;\n    }\n\n    .install-modal-back {\n      position: absolute;\n      top: 14px;\n      left: 14px;\n      height: 32px;\n      border: 1px solid var(--line);\n      border-radius: 10px;\n      background: #ffffff;\n      color: var(--muted);\n      cursor: pointer;\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      gap: 6px;\n      padding: 0 10px;\n      font-size: 12px;\n      font-weight: 600;\n      transition: all 0.2s ease;\n    }\n\n    .install-modal-back:hover {\n      color: var(--text);\n      border-color: rgba(37, 99, 235, 0.35);\n      background: #eff6ff;\n    }\n\n    .install-modal-back.hidden {\n      display: none;\n    }\n\n    .install-modal-close {\n      position: absolute;\n      top: 14px;\n      right: 14px;\n      width: 32px;\n      height: 32px;\n      border: 1px solid var(--line);\n      border-radius: 10px;\n      background: #ffffff;\n      color: var(--muted);\n      cursor: pointer;\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      transition: all 0.2s ease;\n    }\n\n    .install-modal-close:hover {\n      color: var(--text);\n      border-color: rgba(37, 99, 235, 0.35);\n      background: #eff6ff;\n    }\n\n    .install-modal-heading {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      font-size: 22px;\n      font-weight: 800;\n      letter-spacing: -0.02em;\n      margin-bottom: 8px;\n      color: var(--text);\n    }\n\n    .install-modal-heading i {\n      color: var(--accent);\n      font-size: 18px;\n    }\n\n    .install-modal-subtitle {\n      color: var(--text-secondary);\n      font-size: 14px;\n      margin-bottom: 16px;\n    }\n\n    .install-channels {\n      display: grid;\n      gap: 10px;\n    }\n\n    .install-channel-group {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      flex-wrap: nowrap;\n    }\n\n    .install-channel-label {\n      font-size: 19px;\n      font-weight: 800;\n      color: var(--text);\n      letter-spacing: -0.01em;\n      padding-left: 2px;\n      flex: 0 0 auto;\n    }\n\n    .install-channel-group .install-channel-row {\n      flex: 1 1 auto;\n      min-width: 0;\n    }\n\n    .install-channel-row {\n      width: 100%;\n      border: 1px solid var(--line);\n      border-radius: 14px;\n      background: #ffffff;\n      padding: 11px 13px;\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 16px;\n      cursor: pointer;\n      transition: all 0.2s ease;\n    }\n\n    .install-channel-row:hover {\n      border-color: rgba(37, 99, 235, 0.36);\n      background: #f8fbff;\n      transform: translateX(2px);\n    }\n\n    .install-channel-main {\n      display: inline-flex;\n      align-items: center;\n      gap: 12px;\n      min-width: 0;\n    }\n\n    .install-channel-icon {\n      width: 30px;\n      height: 30px;\n      border-radius: 8px;\n      border: 1px solid var(--line);\n      object-fit: contain;\n      background: #fff;\n      flex-shrink: 0;\n      padding: 3px;\n    }\n\n    .install-channel-title {\n      font-size: 15px;\n      font-weight: 700;\n      color: var(--text);\n    }\n\n    .install-channel-text {\n      display: grid;\n      gap: 2px;\n      text-align: left;\n    }\n\n    .install-channel-subtitle {\n      font-size: 12px;\n      font-weight: 600;\n      color: var(--text-secondary);\n      line-height: 1.2;\n    }\n\n    .install-channel-arrow {\n      color: var(--muted);\n      font-size: 12px;\n    }\n\n    .install-modal-actions {\n      margin-top: 14px;\n      margin-bottom: 16px;\n      display: flex;\n      justify-content: center;\n    }\n\n    .install-primary-btn {\n      border: none;\n      border-radius: 12px;\n      background: linear-gradient(135deg, #1d4ed8, #0369a1);\n      color: #ffffff;\n      font-size: 13px;\n      font-weight: 700;\n      padding: 10px 14px;\n      cursor: pointer;\n      transition: transform 0.2s ease, box-shadow 0.2s ease;\n      box-shadow: 0 10px 20px rgba(29, 78, 216, 0.22);\n    }\n\n    .install-primary-btn:hover {\n      transform: translateY(-1px);\n      box-shadow: 0 14px 26px rgba(29, 78, 216, 0.28);\n    }\n\n    .install-step-list {\n      display: grid;\n      gap: 14px;\n      position: relative;\n      padding-left: 52px;\n      margin-top: 6px;\n    }\n\n    .install-step-list::before {\n      content: '';\n      position: absolute;\n      left: 16px;\n      top: 8px;\n      bottom: 8px;\n      width: 2px;\n      background: linear-gradient(180deg, rgba(37, 99, 235, 0.45), rgba(14, 165, 233, 0.15));\n      border-radius: 999px;\n    }\n\n    .install-step {\n      position: relative;\n      border: 1px solid var(--line);\n      border-radius: 14px;\n      padding: 14px;\n      background: #ffffff;\n    }\n\n    .install-step-index {\n      position: absolute;\n      left: -52px;\n      top: 12px;\n      width: 30px;\n      height: 30px;\n      border-radius: 999px;\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      font-size: 13px;\n      font-weight: 800;\n      color: #ffffff;\n      background: linear-gradient(135deg, #1d4ed8, #0284c7);\n      box-shadow: 0 8px 20px rgba(30, 64, 175, 0.3);\n      margin-bottom: 0;\n      line-height: 1;\n    }\n\n    .install-step-title {\n      font-size: 16px;\n      font-weight: 700;\n      color: var(--text);\n      margin-bottom: 10px;\n      line-height: 1.35;\n    }\n\n    .install-step-desc {\n      font-size: 13px;\n      color: var(--text-secondary);\n      line-height: 1.55;\n      margin-bottom: 12px;\n    }\n\n    .install-step-copy-row {\n      border: 1px solid var(--line);\n      border-radius: 10px;\n      background: #f8fafc;\n      padding: 10px;\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 10px;\n    }\n\n    .install-step-url {\n      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;\n      color: #0f172a;\n      font-size: 14px;\n      font-weight: 400;\n      overflow-wrap: anywhere;\n    }\n\n    .install-steps-scroll {\n      max-height: min(64vh, 560px);\n      overflow-y: auto;\n      padding-right: 6px;\n    }\n\n    .install-steps-scroll::-webkit-scrollbar {\n      width: 8px;\n    }\n\n    .install-steps-scroll::-webkit-scrollbar-thumb {\n      background: rgba(148, 163, 184, 0.45);\n      border-radius: 999px;\n    }\n\n    .install-steps-scroll::-webkit-scrollbar-track {\n      background: transparent;\n    }\n\n    .install-guide-media {\n      margin: 10px 0 0;\n      display: grid;\n      gap: 8px;\n    }\n\n    .install-guide-media img {\n      width: 100%;\n      height: auto;\n      border-radius: 10px;\n      border: 1px solid rgba(148, 163, 184, 0.3);\n      background: #f8fafc;\n    }\n\n    .install-step-details {\n      font-size: 13px;\n      color: var(--text-secondary);\n      line-height: 1.55;\n      margin-top: 8px;\n      margin-bottom: 0;\n      padding-left: 18px;\n    }\n\n    .install-copy-btn {\n      border: 1px solid rgba(37, 99, 235, 0.28);\n      border-radius: 8px;\n      background: #ffffff;\n      color: #1d4ed8;\n      font-size: 12px;\n      font-weight: 700;\n      padding: 6px 10px;\n      cursor: pointer;\n      transition: all 0.2s ease;\n      white-space: nowrap;\n    }\n\n    .install-copy-btn:hover {\n      background: #eff6ff;\n      border-color: rgba(37, 99, 235, 0.45);\n    }\n\n    .install-signin-btn {\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      border: none;\n      border-radius: 10px;\n      background: #0f172a;\n      color: #ffffff;\n      font-size: 13px;\n      font-weight: 700;\n      text-decoration: none;\n      padding: 10px 12px;\n      transition: all 0.2s ease;\n    }\n\n    .install-signin-btn:hover {\n      background: #1e293b;\n      transform: translateY(-1px);\n    }\n\n    .install-signin-row {\n      display: inline-flex;\n      align-items: center;\n      gap: 10px;\n      position: relative;\n    }\n\n    .token-help-wrap {\n      position: relative;\n      display: inline-flex;\n      align-items: center;\n    }\n\n    .token-help-icon {\n      width: 24px;\n      height: 24px;\n      border-radius: 999px;\n      border: 1px solid rgba(15, 23, 42, 0.18);\n      background: #ffffff;\n      color: #334155;\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      font-size: 12px;\n      cursor: pointer;\n      transition: all 0.2s ease;\n    }\n\n    .token-help-icon:hover,\n    .token-help-icon:focus-visible {\n      color: #0f172a;\n      border-color: rgba(37, 99, 235, 0.45);\n      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);\n      outline: none;\n    }\n\n    .token-help-preview {\n      position: absolute;\n      bottom: calc(100% + 12px);\n      right: 0;\n      width: min(560px, 86vw);\n      border-radius: 12px;\n      border: 1px solid var(--line);\n      background: #ffffff;\n      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.24);\n      padding: 6px;\n      opacity: 0;\n      visibility: hidden;\n      transform: translateY(6px);\n      transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;\n      z-index: 180;\n      pointer-events: none;\n    }\n\n    .token-help-preview img {\n      width: 100%;\n      height: auto;\n      display: block;\n      border-radius: 8px;\n      border: 1px solid rgba(148, 163, 184, 0.25);\n      background: #f8fafc;\n    }\n\n    .token-help-wrap:hover .token-help-preview,\n    .token-help-wrap:focus-within .token-help-preview {\n      opacity: 1;\n      visibility: visible;\n      transform: translateY(0);\n      pointer-events: auto;\n    }\n\n    .token-help-wrap.token-help-down .token-help-preview {\n      top: calc(100% + 10px);\n      bottom: auto;\n      right: 0;\n      transform: translateY(-6px);\n    }\n\n    .token-help-wrap.token-help-down:hover .token-help-preview,\n    .token-help-wrap.token-help-down:focus-within .token-help-preview {\n      transform: translateY(0);\n    }\n\n    .token-help-wrap.token-help-global .token-help-preview {\n      display: none;\n    }\n\n    .token-help-floating-preview {\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: min(560px, calc(100vw - 24px));\n      border-radius: 12px;\n      border: 1px solid var(--line);\n      background: #ffffff;\n      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.24);\n      padding: 6px;\n      opacity: 0;\n      visibility: hidden;\n      transform: translateY(6px);\n      transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;\n      z-index: 260;\n      pointer-events: none;\n    }\n\n    .token-help-floating-preview.open {\n      opacity: 1;\n      visibility: visible;\n      transform: translateY(0);\n    }\n\n    .token-help-floating-preview img {\n      width: 100%;\n      height: auto;\n      display: block;\n      border-radius: 8px;\n      border: 1px solid rgba(148, 163, 184, 0.25);\n      background: #f8fafc;\n    }\n\n    .faq-grid {\n      display: grid;\n      grid-template-columns: repeat(2, 1fr);\n      gap: 16px;\n      margin-top: 48px;\n      align-items: start;\n    }\n\n    .faq-item {\n      background: var(--card);\n      border: 1px solid var(--line);\n      border-radius: 14px;\n      overflow: hidden;\n      transition: all 0.2s;\n    }\n\n    .faq-item:hover {\n      border-color: rgba(37, 99, 235, 0.2);\n    }\n\n    .faq-item[open] {\n      border-color: var(--accent);\n      box-shadow: var(--shadow-sm);\n    }\n\n    .faq-item summary {\n      list-style: none;\n      padding: 20px 24px;\n      font-weight: 600;\n      font-size: 15px;\n      cursor: pointer;\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 16px;\n    }\n\n    .faq-item summary::-webkit-details-marker {\n      display: none;\n    }\n\n    .faq-item summary::after {\n      content: '+';\n      font-size: 20px;\n      color: var(--muted);\n      font-weight: 500;\n      transition: transform 0.2s;\n    }\n\n    .faq-item[open] summary::after {\n      content: '-';\n      color: var(--accent);\n    }\n\n    .faq-answer {\n      padding: 0 24px 20px;\n      font-size: 14px;\n      color: var(--text-secondary);\n      line-height: 1.7;\n    }\n\n    /* CTA Section */\n    .cta-section {\n      padding: 80px 0;\n    }\n\n    .cta-card {\n      background: var(--text);\n      border-radius: 24px;\n      padding: 64px;\n      text-align: center;\n      position: relative;\n      overflow: hidden;\n    }\n\n    .cta-card::before {\n      content: '';\n      position: absolute;\n      top: -50%;\n      right: -30%;\n      width: 400px;\n      height: 400px;\n      background: var(--accent);\n      border-radius: 50%;\n      filter: blur(100px);\n      opacity: 0.3;\n    }\n\n    .cta-content {\n      position: relative;\n      z-index: 1;\n    }\n\n    .cta-title {\n      font-size: clamp(28px, 5vw, 40px);\n      font-weight: 800;\n      color: white;\n      margin-bottom: 16px;\n      letter-spacing: -0.02em;\n    }\n\n    .cta-subtitle {\n      font-size: 16px;\n      color: rgba(255, 255, 255, 0.7);\n      margin-bottom: 32px;\n      max-width: 500px;\n      margin-left: auto;\n      margin-right: auto;\n    }\n\n    .cta-actions {\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      gap: 16px;\n      flex-wrap: wrap;\n    }\n\n    .cta-actions .btn-accent {\n      background: var(--accent);\n      padding: 16px 32px;\n      font-size: 16px;\n    }\n\n    .cta-actions .btn-ghost {\n      color: white;\n      border: 1px solid rgba(255, 255, 255, 0.2);\n      padding: 16px 32px;\n      font-size: 16px;\n    }\n\n    .cta-actions .btn-ghost:hover {\n      background: rgba(255, 255, 255, 0.1);\n      border-color: rgba(255, 255, 255, 0.3);\n      color: white;\n    }\n\n    /* Footer */\n    .footer {\n      padding: 40px 0;\n      border-top: 1px solid var(--line);\n      text-align: center;\n    }\n\n    .footer-text {\n      font-size: 14px;\n      color: var(--muted);\n    }\n\n    .footer-text a {\n      color: var(--accent);\n      text-decoration: none;\n    }\n\n    /* Responsive */\n    @media (max-width: 900px) {\n      .nav-links {\n        display: none;\n      }\n\n      .nav {\n        flex-wrap: wrap;\n        gap: 12px;\n      }\n\n      .nav-actions {\n        margin-left: auto;\n      }\n\n      .nav-actions .btn-ghost,\n      .nav-get-started-desktop {\n        display: none;\n      }\n\n      .nav-menu-toggle {\n        display: inline-flex;\n        padding: 10px 12px;\n        font-size: 13px;\n      }\n\n      .nav-menu-toggle .label {\n        display: none;\n      }\n\n      .nav-mobile-menu {\n        width: 100%;\n        border: 1px solid var(--line);\n        border-radius: 12px;\n        background: #ffffff;\n        padding: 10px 12px;\n        gap: 10px;\n      }\n\n      .nav-mobile-menu.open {\n        display: grid;\n      }\n\n      .nav-mobile-link {\n        text-decoration: none;\n        color: var(--text-secondary);\n        font-size: 14px;\n        font-weight: 500;\n        padding: 6px 2px;\n      }\n\n      .nav-mobile-link:hover {\n        color: var(--text);\n      }\n\n      .steps-grid {\n        grid-template-columns: 1fr;\n        gap: 32px;\n      }\n\n      .faq-grid {\n        grid-template-columns: 1fr;\n      }\n\n      .prompt-grid {\n        grid-template-columns: 1fr;\n      }\n\n      .cta-card {\n        padding: 40px 24px;\n      }\n    }\n\n    @media (max-width: 600px) {\n      .hero {\n        padding: 48px 0 40px;\n      }\n\n      .hero-actions {\n        flex-direction: column;\n        width: 100%;\n      }\n\n      .hero-actions .btn {\n        width: 100%;\n      }\n\n      .cta-actions {\n        flex-direction: column;\n      }\n\n      .cta-actions .btn {\n        width: 100%;\n      }\n\n      .install-anywhere-spotlight {\n        margin: -14px auto 16px;\n        border-radius: 16px;\n      }\n\n      .install-anywhere-trigger {\n        border-radius: 15px;\n        padding: 12px 14px;\n      }\n\n      .install-anywhere-copy {\n        padding: 0 34px;\n      }\n\n      .install-anywhere-title {\n        font-size: 18px;\n      }\n\n      .install-anywhere-subtitle {\n        font-size: 11px;\n      }\n\n      .install-modal-panel {\n        padding: 18px;\n      }\n\n      .install-step-list {\n        padding-left: 44px;\n      }\n\n      .install-step-list::before {\n        left: 13px;\n      }\n\n      .install-step-index {\n        left: -44px;\n        width: 26px;\n        height: 26px;\n        font-size: 12px;\n      }\n\n      .install-steps-scroll {\n        max-height: min(58vh, 460px);\n      }\n\n    }\n  ";
const LANDING_SCRIPT = "\n    (() => {\n      const hash = window.location.hash || '';\n      const hasSupabaseToken = hash.includes('access_token=');\n      if (hasSupabaseToken) {\n        const params = new URLSearchParams(hash.replace(/^#/, ''));\n        const accessToken = params.get('access_token') || '';\n        if (accessToken) {\n          fetch('/api/auth/oauth/session', {\n            method: 'POST',\n            headers: { 'Content-Type': 'application/json' },\n            body: JSON.stringify({ accessToken })\n          })\n            .then((response) => response.ok ? response.json() : Promise.reject(new Error('session_failed')))\n            .then((body) => {\n              const apiNext = typeof body?.data?.next === 'string' ? body.data.next : '';\n              const next = apiNext.startsWith('/') ? apiNext : '/oauth/authorize/complete';\n              window.location.replace(next);\n            })\n            .catch(() => {\n              // Fallback to login page; keep hash so login page can retry session creation.\n              window.location.replace(`/login${window.location.hash}`);\n            });\n          return;\n        }\n      }\n\n      const navMenuToggle = document.getElementById('navMenuToggle');\n      const navMobileMenu = document.getElementById('navMobileMenu');\n      const installAnywhereModal = document.getElementById('installAnywhereModal');\n      const openInstallAnywhereModal = document.getElementById('openInstallAnywhereModal');\n      const installModalViewChooser = document.getElementById('installModalViewChooser');\n      const installModalViewApiKey = document.getElementById('installModalViewApiKey');\n      const installModalViewChatgpt = document.getElementById('installModalViewChatgpt');\n      const installModalViewClaudeWeb = document.getElementById('installModalViewClaudeWeb');\n      const installModalBackBtn = document.getElementById('installModalBackBtn');\n      const openApiKeyFlowBtn = document.getElementById('openApiKeyFlowBtn');\n      const openChatgptFlowBtn = document.getElementById('openChatgptFlowBtn');\n      const openClaudeWebFlowBtn = document.getElementById('openClaudeWebFlowBtn');\n      const copyMcpUrlBtn = document.getElementById('copyMcpUrlBtn');\n      const copyMcpUrlBtnChatgpt = document.getElementById('copyMcpUrlBtnChatgpt');\n      const copyMcpUrlBtnClaudeWeb = document.getElementById('copyMcpUrlBtnClaudeWeb');\n      const tokenHelpFloatingPreview = document.getElementById('tokenHelpFloatingPreview');\n      const tokenHelpFloatingImg = tokenHelpFloatingPreview ? tokenHelpFloatingPreview.querySelector('img') : null;\n\n      const setInstallModalView = (view) => {\n        if (!installModalViewChooser || !installModalViewApiKey || !installModalViewChatgpt || !installModalViewClaudeWeb) return;\n        const isApiKey = view === 'api-key';\n        const isChatgpt = view === 'chatgpt';\n        const isClaudeWeb = view === 'claude-web';\n        const isChooser = view === 'chooser';\n        installModalViewChooser.classList.toggle('hidden', !isChooser);\n        installModalViewApiKey.classList.toggle('hidden', !isApiKey);\n        installModalViewChatgpt.classList.toggle('hidden', !isChatgpt);\n        installModalViewClaudeWeb.classList.toggle('hidden', !isClaudeWeb);\n        if (installAnywhereModal) {\n          installAnywhereModal.classList.toggle('detail-active', !isChooser);\n        }\n        if (installModalBackBtn) {\n          installModalBackBtn.classList.toggle('hidden', isChooser);\n        }\n      };\n\n      const setInstallModalOpen = (isOpen) => {\n        if (!installAnywhereModal) return;\n        installAnywhereModal.classList.toggle('open', isOpen);\n        installAnywhereModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');\n        if (!isOpen) setInstallModalView('chooser');\n      };\n\n      if (installAnywhereModal && openInstallAnywhereModal) {\n        openInstallAnywhereModal.addEventListener('click', () => {\n          setInstallModalView('chooser');\n          setInstallModalOpen(true);\n        });\n        installAnywhereModal.querySelectorAll('[data-install-modal-close]').forEach((node) => {\n          node.addEventListener('click', () => setInstallModalOpen(false));\n        });\n        if (openApiKeyFlowBtn) {\n          openApiKeyFlowBtn.addEventListener('click', () => setInstallModalView('api-key'));\n        }\n        if (openChatgptFlowBtn) {\n          openChatgptFlowBtn.addEventListener('click', () => setInstallModalView('chatgpt'));\n        }\n        if (openClaudeWebFlowBtn) {\n          openClaudeWebFlowBtn.addEventListener('click', () => setInstallModalView('claude-web'));\n        }\n        if (installModalBackBtn) {\n          installModalBackBtn.addEventListener('click', () => setInstallModalView('chooser'));\n        }\n\n        const bindCopyMcpUrl = (button) => {\n          if (!button) return;\n          button.addEventListener('click', async () => {\n            const text = 'https://www.quickmcp.ai/mcp';\n            try {\n              if (navigator.clipboard?.writeText) {\n                await navigator.clipboard.writeText(text);\n              } else {\n                const tempInput = document.createElement('textarea');\n                tempInput.value = text;\n                tempInput.setAttribute('readonly', 'true');\n                tempInput.style.position = 'absolute';\n                tempInput.style.left = '-9999px';\n                document.body.appendChild(tempInput);\n                tempInput.select();\n                document.execCommand('copy');\n                document.body.removeChild(tempInput);\n              }\n              const original = button.textContent;\n              button.textContent = 'Copied';\n              setTimeout(() => { button.textContent = original || 'Copy'; }, 1200);\n            } catch {}\n          });\n        };\n\n        bindCopyMcpUrl(copyMcpUrlBtn);\n        bindCopyMcpUrl(copyMcpUrlBtnChatgpt);\n        bindCopyMcpUrl(copyMcpUrlBtnClaudeWeb);\n\n        const hideFloatingPreview = () => {\n          if (!tokenHelpFloatingPreview) return;\n          tokenHelpFloatingPreview.classList.remove('open');\n          tokenHelpFloatingPreview.setAttribute('aria-hidden', 'true');\n        };\n\n        const showFloatingPreview = (wrap) => {\n          if (!tokenHelpFloatingPreview || !tokenHelpFloatingImg || !wrap) return;\n          const sourceImg = wrap.querySelector('.token-help-preview img');\n          if (!sourceImg) return;\n\n          tokenHelpFloatingImg.src = sourceImg.getAttribute('src') || '';\n          tokenHelpFloatingImg.alt = sourceImg.getAttribute('alt') || 'Token generate guide preview';\n          tokenHelpFloatingPreview.classList.add('open');\n          tokenHelpFloatingPreview.setAttribute('aria-hidden', 'false');\n\n          requestAnimationFrame(() => {\n            const padding = 12;\n            const triggerRect = wrap.getBoundingClientRect();\n            const previewRect = tokenHelpFloatingPreview.getBoundingClientRect();\n            const viewportWidth = window.innerWidth;\n            const viewportHeight = window.innerHeight;\n\n            let left = triggerRect.right - previewRect.width;\n            if (left < padding) left = padding;\n            if (left + previewRect.width > viewportWidth - padding) {\n              left = Math.max(padding, viewportWidth - previewRect.width - padding);\n            }\n\n            let top = triggerRect.bottom + 10;\n            if (top + previewRect.height > viewportHeight - padding) {\n              top = Math.max(padding, triggerRect.top - previewRect.height - 10);\n            }\n\n            tokenHelpFloatingPreview.style.left = `${left}px`;\n            tokenHelpFloatingPreview.style.top = `${top}px`;\n          });\n        };\n\n        document.querySelectorAll('.token-help-wrap.token-help-global').forEach((wrap) => {\n          const icon = wrap.querySelector('.token-help-icon');\n          wrap.addEventListener('mouseenter', () => showFloatingPreview(wrap));\n          wrap.addEventListener('mouseleave', () => hideFloatingPreview());\n          if (icon) {\n            icon.addEventListener('focus', () => showFloatingPreview(wrap));\n            icon.addEventListener('blur', () => {\n              setTimeout(() => {\n                if (!wrap.matches(':hover')) hideFloatingPreview();\n              }, 80);\n            });\n          }\n        });\n\n        window.addEventListener('resize', hideFloatingPreview);\n        window.addEventListener('scroll', hideFloatingPreview, true);\n        document.addEventListener('keydown', (event) => {\n          if (event.key === 'Escape') {\n            hideFloatingPreview();\n            setInstallModalOpen(false);\n          }\n        });\n      }\n\n      if (navMenuToggle && navMobileMenu) {\n        navMenuToggle.addEventListener('click', () => {\n          const isOpen = navMobileMenu.classList.toggle('open');\n          navMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');\n        });\n\n        navMobileMenu.querySelectorAll('a').forEach((link) => {\n          link.addEventListener('click', () => {\n            navMobileMenu.classList.remove('open');\n            navMenuToggle.setAttribute('aria-expanded', 'false');\n          });\n        });\n\n        window.addEventListener('resize', () => {\n          if (window.innerWidth > 900) {\n            navMobileMenu.classList.remove('open');\n            navMenuToggle.setAttribute('aria-expanded', 'false');\n          }\n        });\n      }\n\n      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n      const parts = [\n        { id: 'hero-type-part-1', text: 'Now your AI can ' },\n        { id: 'hero-type-part-2', text: 'connect' },\n        { id: 'hero-type-part-3', text: ' to ' },\n        { id: 'hero-type-part-4', text: 'anything' }\n      ];\n\n      if (reduceMotion) {\n        parts.forEach((part) => {\n          const el = document.getElementById(part.id);\n          if (el) el.textContent = part.text;\n        });\n      } else {\n        const queue = parts\n          .map((part) => {\n            const el = document.getElementById(part.id);\n            if (el) el.textContent = '';\n            return { ...part, el, index: 0 };\n          })\n          .filter((part) => part.el);\n\n        let partIndex = 0;\n        const speedMs = 55;\n\n        const tick = () => {\n          if (partIndex >= queue.length) return;\n          const current = queue[partIndex];\n          current.index += 1;\n          current.el.textContent = current.text.slice(0, current.index);\n          if (current.index >= current.text.length) partIndex += 1;\n          setTimeout(tick, speedMs);\n        };\n\n        tick();\n      }\n\n      const left = document.getElementById('server-tech-marquee-left');\n      const right = document.getElementById('server-tech-marquee-right');\n      if (!left || !right) return;\n      right.innerHTML = left.innerHTML;\n    })();\n  ";

export function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = LANDING_TITLE;

    const fontPreconnectA = document.createElement('link');
    fontPreconnectA.setAttribute('data-react-landing-head', 'true');
    fontPreconnectA.rel = 'preconnect';
    fontPreconnectA.href = 'https://fonts.googleapis.com';
    document.head.appendChild(fontPreconnectA);

    const fontPreconnectB = document.createElement('link');
    fontPreconnectB.setAttribute('data-react-landing-head', 'true');
    fontPreconnectB.rel = 'preconnect';
    fontPreconnectB.href = 'https://fonts.gstatic.com';
    fontPreconnectB.crossOrigin = '';
    document.head.appendChild(fontPreconnectB);

    const fontCss = document.createElement('link');
    fontCss.setAttribute('data-react-landing-head', 'true');
    fontCss.rel = 'stylesheet';
    fontCss.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:ital,wght@0,400;1,400&display=swap';
    document.head.appendChild(fontCss);

    const faCss = document.createElement('link');
    faCss.setAttribute('data-react-landing-head', 'true');
    faCss.rel = 'stylesheet';
    faCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    document.head.appendChild(faCss);

    const scriptNode = document.createElement('script');
    scriptNode.setAttribute('data-react-landing-script', 'true');
    scriptNode.textContent = LANDING_SCRIPT;
    document.body.appendChild(scriptNode);

    return () => {
      scriptNode.remove();
      fontPreconnectA.remove();
      fontPreconnectB.remove();
      fontCss.remove();
      faCss.remove();
      document.title = previousTitle;
    };
  }, []);

  return (
    <>
      <style data-react-landing-style>{LANDING_STYLE}</style>
      <div className="bg-effects" aria-hidden="true">
          <div className="gradient-orb one"></div>
          <div className="gradient-orb two"></div>
          <div className="gradient-orb three"></div>
        </div>
      
      
        <div className="container">
          <nav className="nav">
            <a href="/landing" className="logo">
              <span className="logo-icon">
                <i className="fas fa-rocket"></i>
              </span>
              <span className="logo-text">QuickMCP</span>
            </a>
      
            <div className="nav-links">
              <a href="#prompts" className="nav-link">Use Cases</a>
              <a href="#how" className="nav-link">How It Works</a>
              <a href="#integrations" className="nav-link">Integrations</a>
              <a href="/pricing" className="nav-link">Pricing</a>
              <a href="#faq" className="nav-link">FAQ</a>
            </div>
      
            <div className="nav-actions">
              <a href="/login" className="btn btn-ghost">Sign In</a>
              <a href="/login" className="btn btn-primary nav-get-started-desktop">Get Started</a>
              <button type="button" id="navMenuToggle" className="btn btn-primary nav-menu-toggle" aria-expanded="false" aria-controls="navMobileMenu">
                <span className="label">Menu</span>
                <i className="fas fa-bars"></i>
              </button>
            </div>
      
            <div id="navMobileMenu" className="nav-mobile-menu">
              <a href="/login" className="nav-mobile-link">Sign In</a>
              <a href="#prompts" className="nav-mobile-link">Use Cases</a>
              <a href="#how" className="nav-mobile-link">How It Works</a>
              <a href="#integrations" className="nav-mobile-link">Integrations</a>
              <a href="/pricing" className="nav-mobile-link">Pricing</a>
              <a href="#faq" className="nav-mobile-link">FAQ</a>
            </div>
          </nav>
        </div>
      
      
        <section className="hero">
          <div className="container">
            <span className="hero-badge">
              <i className="fas fa-sparkles"></i>
              AI-Powered MCP Server Generator
            </span>
            <h1 className="hero-title">
              <span id="hero-type-part-1"></span><span className="highlight" id="hero-type-part-2"></span><span id="hero-type-part-3"></span><span className="serif" id="hero-type-part-4"></span><span className="type-cursor" aria-hidden="true">|</span>
            </h1>
            <p className="hero-subtitle">
              Generate MCP servers from APIs and databases. Connect Claude, Cursor, and other AI tools to your entire stack in minutes.
            </p>
            <div className="hero-actions">
              <a href="/login" className="btn btn-accent">
                <i className="fas fa-rocket"></i>
                Start Building Free
              </a>
              <a href="#prompts" className="btn btn-ghost">
                Explore Use Cases
                <i className="fas fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </section>
      
      
        <section id="prompts" className="prompts-section">
          <div className="container">
            <div className="section-header">
              <span className="section-label">Popular Prompts</span>
              <h2 className="section-title">Connect apps, automation happens</h2>
              <p className="section-subtitle">Real prompts that work. Try them with your AI assistant.</p>
            </div>
      
            <div className="prompt-grid">
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <div className="prompt-icon gmail">
                    <img src="/images/app/gmail.png" alt="Gmail" />
                  </div>
                  <div className="prompt-meta">
                    <div className="prompt-app">Gmail Integration</div>
                    <div className="prompt-title">Send emails with Gmail</div>
                  </div>
                </div>
                <p className="prompt-description">
                  "Draft and send an email to my team about tomorrow's meeting, include the agenda from my notes."
                </p>
                <div className="prompt-footer">
                  <span className="prompt-users">
                    <i className="fas fa-users"></i>
                    892+ users
                  </span>
                  <a href="/login" className="prompt-cta">
                    Try
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
              </div>
      
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <div className="prompt-icon slack">
                    <img src="/images/app/slack.png" alt="Slack" />
                  </div>
                  <div className="prompt-meta">
                    <div className="prompt-app">Slack Integration</div>
                    <div className="prompt-title">Post updates to Slack</div>
                  </div>
                </div>
                <p className="prompt-description">
                  "Post a summary of today's completed tasks to the #dev channel with relevant mentions."
                </p>
                <div className="prompt-footer">
                  <span className="prompt-users">
                    <i className="fas fa-users"></i>
                    1.2k+ users
                  </span>
                  <a href="/login" className="prompt-cta">
                    Try
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
              </div>
      
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <div className="prompt-icon database">
                    <img src="/images/app/postgresql.png" alt="PostgreSQL" />
                  </div>
                  <div className="prompt-meta">
                    <div className="prompt-app">PostgreSQL Integration</div>
                    <div className="prompt-title">Query your database</div>
                  </div>
                </div>
                <p className="prompt-description">
                  "Show me all users who signed up last week and their subscription status from the database."
                </p>
                <div className="prompt-footer">
                  <span className="prompt-users">
                    <i className="fas fa-users"></i>
                    756+ users
                  </span>
                  <a href="/login" className="prompt-cta">
                    Try
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
              </div>
      
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <div className="prompt-icon notion">
                    <img src="/images/app/notion.png" alt="Notion" />
                  </div>
                  <div className="prompt-meta">
                    <div className="prompt-app">Notion Integration</div>
                    <div className="prompt-title">Update Notion pages</div>
                  </div>
                </div>
                <p className="prompt-description">
                  "Create a new page in my Projects database with today's meeting notes and action items."
                </p>
                <div className="prompt-footer">
                  <span className="prompt-users">
                    <i className="fas fa-users"></i>
                    634+ users
                  </span>
                  <a href="/login" className="prompt-cta">
                    Try
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
              </div>
      
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <div className="prompt-icon calendar">
                    <img src="/images/app/googlecalendar.png" alt="Google Calendar" />
                  </div>
                  <div className="prompt-meta">
                    <div className="prompt-app">Google Calendar</div>
                    <div className="prompt-title">Manage calendar events</div>
                  </div>
                </div>
                <p className="prompt-description">
                  "Schedule a 30-minute sync with Sarah next week, find a time that works for both of us."
                </p>
                <div className="prompt-footer">
                  <span className="prompt-users">
                    <i className="fas fa-users"></i>
                    543+ users
                  </span>
                  <a href="/login" className="prompt-cta">
                    Try
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
              </div>
      
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <div className="prompt-icon api">
                    <img src="/images/app/graphql.png" alt="Custom API" />
                  </div>
                  <div className="prompt-meta">
                    <div className="prompt-app">Custom API</div>
                    <div className="prompt-title">Connect any REST API</div>
                  </div>
                </div>
                <p className="prompt-description">
                  "Fetch the latest analytics from our internal API and create a summary report."
                </p>
                <div className="prompt-footer">
                  <span className="prompt-users">
                    <i className="fas fa-users"></i>
                    421+ users
                  </span>
                  <a href="/login" className="prompt-cta">
                    Try
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      
      
        <section id="how" className="how-section">
          <div className="container">
            <div className="section-header">
              <span className="section-label">How It Works</span>
              <h2 className="section-title">Three steps to AI automation</h2>
              <p className="section-subtitle">From zero to production MCP server in minutes.</p>
            </div>
      
            <div className="steps-grid">
              <div className="step">
                <div className="step-number">1</div>
                <h3 className="step-title">Connect your source</h3>
                <p className="step-desc">Link APIs, databases, or third-party services. We support REST, GraphQL, PostgreSQL, MySQL, and more.</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <h3 className="step-title">Generate MCP tools</h3>
                <p className="step-desc">QuickMCP automatically creates type-safe tools with proper schemas. Test them instantly in our playground.</p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <h3 className="step-title">Deploy & use</h3>
                <p className="step-desc">Get your MCP server endpoint. Connect it to Claude, Cursor, or any MCP-compatible AI assistant.</p>
              </div>
            </div>
          </div>
        </section>
      
      
        <section id="integrations" className="integrations-section">
          <div className="container">
            <div className="integrations-wrap">
              <div className="integrations-header">
                <span className="section-label">Integrations</span>
                <h2 className="integrations-title">Works with your entire stack</h2>
                <p className="integrations-subtitle">Connect the tools you already use and love.</p>
              </div>
      
              <div className="marquee-container">
                <div className="marquee-row">
                  <div className="marquee left">
                    <span className="integration-chip"><img src="/images/app/vscode.png" alt="VSCode" />VSCode</span>
                    <span className="integration-chip"><img src="/images/app/claude.png" alt="Claude" />Claude</span>
                    <span className="integration-chip"><img src="/images/app/cursor.png" alt="Cursor" />Cursor</span>
                    <span className="integration-chip"><img src="/images/app/whatsappbusiness.png" alt="Whatsapp" />Whatsapp</span>
                    <span className="integration-chip"><img src="/images/app/openai.png" alt="OpenAI" />OpenAI</span>
                    <span className="integration-chip"><img src="/images/app/n8n.png" alt="N8N" />N8N</span>
                    <span className="integration-chip"><img src="/images/app/mcp.png" alt="MCP" />MCP</span>
                    <span className="integration-chip"><img src="/images/app/windsorf.png" alt="Windsurf" />Windsurf</span>
                    <span className="integration-chip"><img src="/images/app/intellij.png" alt="IntelliJ" />IntelliJ</span>
                    <span className="integration-chip"><img src="/images/app/githubcopilot.png" alt="GitHub Copilot" />GitHub Copilot</span>
                    <span className="integration-chip"><img src="/images/app/zededitor.png" alt="Zed" />Zed</span>
                    <span className="integration-chip"><img src="/images/app/vscode.png" alt="VSCode" />VSCode</span>
                    <span className="integration-chip"><img src="/images/app/claude.png" alt="Claude" />Claude</span>
                    <span className="integration-chip"><img src="/images/app/cursor.png" alt="Cursor" />Cursor</span>
                    <span className="integration-chip"><img src="/images/app/whatsappbusiness.png" alt="Whatsapp" />Whatsapp</span>
                    <span className="integration-chip"><img src="/images/app/openai.png" alt="OpenAI" />OpenAI</span>
                    <span className="integration-chip"><img src="/images/app/n8n.png" alt="N8N" />N8N</span>
                    <span className="integration-chip"><img src="/images/app/mcp.png" alt="MCP" />MCP</span>
                    <span className="integration-chip"><img src="/images/app/windsorf.png" alt="Windsurf" />Windsurf</span>
                    <span className="integration-chip"><img src="/images/app/intellij.png" alt="IntelliJ" />IntelliJ</span>
                    <span className="integration-chip"><img src="/images/app/githubcopilot.png" alt="GitHub Copilot" />GitHub Copilot</span>
                    <span className="integration-chip"><img src="/images/app/zededitor.png" alt="Zed" />Zed</span>
                  </div>
                </div>
      
                <div className="marquee-row">
                  <div className="marquee right">
                    <span className="integration-chip"><img src="/images/app/slack.png" alt="Slack" />Slack</span>
                    <span className="integration-chip"><img src="/images/app/telegram.png" alt="Telegram" />Telegram</span>
                    <span className="integration-chip"><img src="/images/app/discord.png" alt="Discord" />Discord</span>
                    <span className="integration-chip"><img src="/images/app/microsoftteams.png" alt="Teams" />Teams</span>
                    <span className="integration-chip"><img src="/images/app/zapier.png" alt="Zapier" />Zapier</span>
                    <span className="integration-chip"><img src="/images/app/make.png" alt="Make" />Make</span>
                    <span className="integration-chip"><img src="/images/app/pipedream.png" alt="Pipedream" />Pipedream</span>
                    <span className="integration-chip"><img src="/images/app/activepieces.png" alt="Activepieces" />Activepieces</span>
                    <span className="integration-chip"><img src="/images/app/androidstudio.png" alt="Android Studio" />Android Studio</span>
                    <span className="integration-chip"><img src="/images/app/antigravity.png" alt="Antigravity" />Antigravity</span>
                    <span className="integration-chip"><img src="/images/app/slack.png" alt="Slack" />Slack</span>
                    <span className="integration-chip"><img src="/images/app/telegram.png" alt="Telegram" />Telegram</span>
                    <span className="integration-chip"><img src="/images/app/discord.png" alt="Discord" />Discord</span>
                    <span className="integration-chip"><img src="/images/app/microsoftteams.png" alt="Teams" />Teams</span>
                    <span className="integration-chip"><img src="/images/app/zapier.png" alt="Zapier" />Zapier</span>
                    <span className="integration-chip"><img src="/images/app/make.png" alt="Make" />Make</span>
                    <span className="integration-chip"><img src="/images/app/pipedream.png" alt="Pipedream" />Pipedream</span>
                    <span className="integration-chip"><img src="/images/app/activepieces.png" alt="Activepieces" />Activepieces</span>
                    <span className="integration-chip"><img src="/images/app/androidstudio.png" alt="Android Studio" />Android Studio</span>
                    <span className="integration-chip"><img src="/images/app/antigravity.png" alt="Antigravity" />Antigravity</span>
                  </div>
                </div>
              </div>
      
              <div className="server-tech">
                <h3 className="server-tech-title">Build MCP servers from your data and APIs</h3>
                <p className="server-tech-subtitle">Use every source available in New Server, from databases and APIs to SaaS tools and AI platforms.</p>
                <div className="marquee-container">
                  <div className="marquee-row">
                    <div className="marquee tech-left" id="server-tech-marquee-left">
                      <span className="server-tech-chip"><img src="/images/app/airtable.png" alt="Airtable" />Airtable</span>
                      <span className="server-tech-chip"><img src="/images/app/applenotes.png" alt="Apple Notes" />Apple Notes</span>
                      <span className="server-tech-chip"><img src="/images/app/applereminders.png" alt="Apple Reminders" />Apple Reminders</span>
                      <span className="server-tech-chip"><img src="/images/app/asana.png" alt="Asana" />Asana</span>
                      <span className="server-tech-chip"><img src="/images/app/azure_openai.png" alt="Azure AI" />Azure AI</span>
                      <span className="server-tech-chip"><img src="/images/app/bearnotes.png" alt="Bear Notes" />Bear Notes</span>
                      <span className="server-tech-chip"><img src="/images/app/bitbucket.png" alt="Bitbucket" />Bitbucket</span>
                      <span className="server-tech-chip"><img src="/images/app/claude.png" alt="Claude" />Claude</span>
                      <span className="server-tech-chip"><img src="/images/app/clickup.png" alt="ClickUp" />ClickUp</span>
                      <span className="server-tech-chip"><img src="/images/app/cohere.png" alt="Cohere" />Cohere</span>
                      <span className="server-tech-chip"><img src="/images/app/confluence.png" alt="Confluence" />Confluence</span>
                      <span className="server-tech-chip"><img src="/images/app/db2.png" alt="DB2" />DB2</span>
                      <span className="server-tech-chip"><img src="/images/app/deepseek.png" alt="DeepSeek" />DeepSeek</span>
                      <span className="server-tech-chip"><img src="/images/app/discord.png" alt="Discord" />Discord</span>
                      <span className="server-tech-chip"><img src="/images/app/dockerhub.png" alt="Docker Hub" />Docker Hub</span>
                      <span className="server-tech-chip"><img src="/images/app/dropbox.png" alt="Dropbox" />Dropbox</span>
                      <span className="server-tech-chip"><img src="/images/app/elasticsearch.png" alt="Elasticsearch" />Elasticsearch</span>
                      <span className="server-tech-chip"><img src="/images/app/facebook.png" alt="Facebook" />Facebook</span>
                      <span className="server-tech-chip"><img src="/images/app/falai.png" alt="Fal.ai" />Fal.ai</span>
                      <span className="server-tech-chip"><img src="/images/app/gdrive.png" alt="Google Drive" />Google Drive</span>
                      <span className="server-tech-chip"><img src="/images/app/gemini.png" alt="Gemini" />Gemini</span>
                      <span className="server-tech-chip"><img src="/images/app/github.png" alt="GitHub" />GitHub</span>
                      <span className="server-tech-chip"><img src="/images/app/gitlab.png" alt="GitLab" />GitLab</span>
                      <span className="server-tech-chip"><img src="/images/app/gmail.png" alt="Gmail" />Gmail</span>
                      <span className="server-tech-chip"><img src="/images/app/googlecalendar.png" alt="Google Calendar" />Google Calendar</span>
                      <span className="server-tech-chip"><img src="/images/app/googledocs.png" alt="Google Docs" />Google Docs</span>
                      <span className="server-tech-chip"><img src="/images/app/googlesheets.png" alt="Google Sheets" />Google Sheets</span>
                      <span className="server-tech-chip"><img src="/images/app/gradle.png" alt="Gradle" />Gradle</span>
                      <span className="server-tech-chip"><img src="/images/app/grafana.png" alt="Grafana" />Grafana</span>
                      <span className="server-tech-chip"><img src="/images/app/graphql.png" alt="GraphQL" />GraphQL</span>
                      <span className="server-tech-chip"><img src="/images/app/grok.png" alt="Grok" />Grok</span>
                      <span className="server-tech-chip"><img src="/images/app/groq.png" alt="Groq" />Groq</span>
                      <span className="server-tech-chip"><img src="/images/app/hazelcast.png" alt="Hazelcast" />Hazelcast</span>
                      <span className="server-tech-chip"><img src="/images/app/huggingface.png" alt="Hugging Face" />Hugging Face</span>
                      <span className="server-tech-chip"><img src="/images/app/imessage.png" alt="iMessage" />iMessage</span>
                      <span className="server-tech-chip"><img src="/images/app/instagram.png" alt="Instagram" />Instagram</span>
                      <span className="server-tech-chip"><img src="/images/app/jenkins.png" alt="Jenkins" />Jenkins</span>
                      <span className="server-tech-chip"><img src="/images/app/jira.png" alt="Jira" />Jira</span>
                      <span className="server-tech-chip"><img src="/images/app/kafka.png" alt="Kafka" />Kafka</span>
                      <span className="server-tech-chip"><img src="/images/app/kubernetes.png" alt="Kubernetes" />Kubernetes</span>
                      <span className="server-tech-chip"><img src="/images/app/linear.png" alt="Linear" />Linear</span>
                      <span className="server-tech-chip"><img src="/images/app/linkedin.png" alt="LinkedIn" />LinkedIn</span>
                      <span className="server-tech-chip"><img src="/images/app/llama.png" alt="Llama" />Llama</span>
                      <span className="server-tech-chip"><img src="/images/app/maven.png" alt="Maven" />Maven</span>
                      <span className="server-tech-chip"><img src="/images/app/microsoftteams.png" alt="Microsoft Teams" />Microsoft Teams</span>
                      <span className="server-tech-chip"><img src="/images/app/mistral.png" alt="Mistral" />Mistral</span>
                      <span className="server-tech-chip"><img src="/images/app/monday.png" alt="Monday" />Monday</span>
                      <span className="server-tech-chip"><img src="/images/app/mssql.png" alt="SQL Server" />SQL Server</span>
                      <span className="server-tech-chip"><img src="/images/app/mysql.png" alt="MySQL" />MySQL</span>
                      <span className="server-tech-chip"><img src="/images/app/n8n.png" alt="n8n" />n8n</span>
                      <span className="server-tech-chip"><img src="/images/app/notion.png" alt="Notion" />Notion</span>
                      <span className="server-tech-chip"><img src="/images/app/npm.png" alt="npm" />npm</span>
                      <span className="server-tech-chip"><img src="/images/app/nuget.png" alt="NuGet" />NuGet</span>
                      <span className="server-tech-chip"><img src="/images/app/obsidian.png" alt="Obsidian" />Obsidian</span>
                      <span className="server-tech-chip"><img src="/images/app/openai.png" alt="OpenAI" />OpenAI</span>
                      <span className="server-tech-chip"><img src="/images/app/openrouter.png" alt="OpenRouter" />OpenRouter</span>
                      <span className="server-tech-chip"><img src="/images/app/opensearch.png" alt="OpenSearch" />OpenSearch</span>
                      <span className="server-tech-chip"><img src="/images/app/openshift.png" alt="OpenShift" />OpenShift</span>
                      <span className="server-tech-chip"><img src="/images/app/oracle.png" alt="Oracle" />Oracle</span>
                      <span className="server-tech-chip"><img src="/images/app/perplexity.png" alt="Perplexity" />Perplexity</span>
                      <span className="server-tech-chip"><img src="/images/app/postgresql.png" alt="PostgreSQL" />PostgreSQL</span>
                      <span className="server-tech-chip"><img src="/images/app/prometheus.png" alt="Prometheus" />Prometheus</span>
                      <span className="server-tech-chip"><img src="/images/app/reddit.png" alt="Reddit" />Reddit</span>
                      <span className="server-tech-chip"><img src="/images/app/redis.png" alt="Redis" />Redis</span>
                      <span className="server-tech-chip"><img src="/images/app/rss.png" alt="RSS" />RSS</span>
                      <span className="server-tech-chip"><img src="/images/app/signal.png" alt="Signal" />Signal</span>
                      <span className="server-tech-chip"><img src="/images/app/slack.png" alt="Slack" />Slack</span>
                      <span className="server-tech-chip"><img src="/images/app/soap.png" alt="SOAP" />SOAP</span>
                      <span className="server-tech-chip"><img src="/images/app/sqlite.png" alt="SQLite" />SQLite</span>
                      <span className="server-tech-chip"><img src="/images/app/supabase.png" alt="Supabase" />Supabase</span>
                      <span className="server-tech-chip"><img src="/images/app/telegram.png" alt="Telegram" />Telegram</span>
                      <span className="server-tech-chip"><img src="/images/app/things3.png" alt="Things3" />Things3</span>
                      <span className="server-tech-chip"><img src="/images/app/threads.png" alt="Threads" />Threads</span>
                      <span className="server-tech-chip"><img src="/images/app/tiktok.png" alt="TikTok" />TikTok</span>
                      <span className="server-tech-chip"><img src="/images/app/together.png" alt="Together AI" />Together AI</span>
                      <span className="server-tech-chip"><img src="/images/app/trello.png" alt="Trello" />Trello</span>
                      <span className="server-tech-chip"><img src="/images/app/whatsappbusiness.png" alt="WhatsApp" />WhatsApp</span>
                      <span className="server-tech-chip"><img src="/images/app/x.png" alt="X" />X</span>
                      <span className="server-tech-chip"><img src="/images/app/youtube.png" alt="YouTube" />YouTube</span>
                      <span className="server-tech-chip"><img src="/images/app/zoom.png" alt="Zoom" />Zoom</span>
                      <span className="server-tech-chip"><img src="/images/app/airtable.png" alt="Airtable" />Airtable</span>
                      <span className="server-tech-chip"><img src="/images/app/applenotes.png" alt="Apple Notes" />Apple Notes</span>
                      <span className="server-tech-chip"><img src="/images/app/applereminders.png" alt="Apple Reminders" />Apple Reminders</span>
                      <span className="server-tech-chip"><img src="/images/app/asana.png" alt="Asana" />Asana</span>
                      <span className="server-tech-chip"><img src="/images/app/azure_openai.png" alt="Azure AI" />Azure AI</span>
                      <span className="server-tech-chip"><img src="/images/app/bearnotes.png" alt="Bear Notes" />Bear Notes</span>
                      <span className="server-tech-chip"><img src="/images/app/bitbucket.png" alt="Bitbucket" />Bitbucket</span>
                      <span className="server-tech-chip"><img src="/images/app/claude.png" alt="Claude" />Claude</span>
                      <span className="server-tech-chip"><img src="/images/app/clickup.png" alt="ClickUp" />ClickUp</span>
                      <span className="server-tech-chip"><img src="/images/app/cohere.png" alt="Cohere" />Cohere</span>
                      <span className="server-tech-chip"><img src="/images/app/confluence.png" alt="Confluence" />Confluence</span>
                      <span className="server-tech-chip"><img src="/images/app/db2.png" alt="DB2" />DB2</span>
                      <span className="server-tech-chip"><img src="/images/app/deepseek.png" alt="DeepSeek" />DeepSeek</span>
                      <span className="server-tech-chip"><img src="/images/app/discord.png" alt="Discord" />Discord</span>
                      <span className="server-tech-chip"><img src="/images/app/dockerhub.png" alt="Docker Hub" />Docker Hub</span>
                      <span className="server-tech-chip"><img src="/images/app/dropbox.png" alt="Dropbox" />Dropbox</span>
                      <span className="server-tech-chip"><img src="/images/app/elasticsearch.png" alt="Elasticsearch" />Elasticsearch</span>
                      <span className="server-tech-chip"><img src="/images/app/facebook.png" alt="Facebook" />Facebook</span>
                      <span className="server-tech-chip"><img src="/images/app/falai.png" alt="Fal.ai" />Fal.ai</span>
                      <span className="server-tech-chip"><img src="/images/app/gdrive.png" alt="Google Drive" />Google Drive</span>
                      <span className="server-tech-chip"><img src="/images/app/gemini.png" alt="Gemini" />Gemini</span>
                      <span className="server-tech-chip"><img src="/images/app/github.png" alt="GitHub" />GitHub</span>
                      <span className="server-tech-chip"><img src="/images/app/gitlab.png" alt="GitLab" />GitLab</span>
                      <span className="server-tech-chip"><img src="/images/app/gmail.png" alt="Gmail" />Gmail</span>
                      <span className="server-tech-chip"><img src="/images/app/googlecalendar.png" alt="Google Calendar" />Google Calendar</span>
                      <span className="server-tech-chip"><img src="/images/app/googledocs.png" alt="Google Docs" />Google Docs</span>
                      <span className="server-tech-chip"><img src="/images/app/googlesheets.png" alt="Google Sheets" />Google Sheets</span>
                      <span className="server-tech-chip"><img src="/images/app/gradle.png" alt="Gradle" />Gradle</span>
                      <span className="server-tech-chip"><img src="/images/app/grafana.png" alt="Grafana" />Grafana</span>
                      <span className="server-tech-chip"><img src="/images/app/graphql.png" alt="GraphQL" />GraphQL</span>
                      <span className="server-tech-chip"><img src="/images/app/grok.png" alt="Grok" />Grok</span>
                      <span className="server-tech-chip"><img src="/images/app/groq.png" alt="Groq" />Groq</span>
                      <span className="server-tech-chip"><img src="/images/app/hazelcast.png" alt="Hazelcast" />Hazelcast</span>
                      <span className="server-tech-chip"><img src="/images/app/huggingface.png" alt="Hugging Face" />Hugging Face</span>
                      <span className="server-tech-chip"><img src="/images/app/imessage.png" alt="iMessage" />iMessage</span>
                      <span className="server-tech-chip"><img src="/images/app/instagram.png" alt="Instagram" />Instagram</span>
                      <span className="server-tech-chip"><img src="/images/app/jenkins.png" alt="Jenkins" />Jenkins</span>
                      <span className="server-tech-chip"><img src="/images/app/jira.png" alt="Jira" />Jira</span>
                      <span className="server-tech-chip"><img src="/images/app/kafka.png" alt="Kafka" />Kafka</span>
                      <span className="server-tech-chip"><img src="/images/app/kubernetes.png" alt="Kubernetes" />Kubernetes</span>
                      <span className="server-tech-chip"><img src="/images/app/linear.png" alt="Linear" />Linear</span>
                      <span className="server-tech-chip"><img src="/images/app/linkedin.png" alt="LinkedIn" />LinkedIn</span>
                      <span className="server-tech-chip"><img src="/images/app/llama.png" alt="Llama" />Llama</span>
                      <span className="server-tech-chip"><img src="/images/app/maven.png" alt="Maven" />Maven</span>
                      <span className="server-tech-chip"><img src="/images/app/microsoftteams.png" alt="Microsoft Teams" />Microsoft Teams</span>
                      <span className="server-tech-chip"><img src="/images/app/mistral.png" alt="Mistral" />Mistral</span>
                      <span className="server-tech-chip"><img src="/images/app/monday.png" alt="Monday" />Monday</span>
                      <span className="server-tech-chip"><img src="/images/app/mssql.png" alt="SQL Server" />SQL Server</span>
                      <span className="server-tech-chip"><img src="/images/app/mysql.png" alt="MySQL" />MySQL</span>
                      <span className="server-tech-chip"><img src="/images/app/n8n.png" alt="n8n" />n8n</span>
                      <span className="server-tech-chip"><img src="/images/app/notion.png" alt="Notion" />Notion</span>
                      <span className="server-tech-chip"><img src="/images/app/npm.png" alt="npm" />npm</span>
                      <span className="server-tech-chip"><img src="/images/app/nuget.png" alt="NuGet" />NuGet</span>
                      <span className="server-tech-chip"><img src="/images/app/obsidian.png" alt="Obsidian" />Obsidian</span>
                      <span className="server-tech-chip"><img src="/images/app/openai.png" alt="OpenAI" />OpenAI</span>
                      <span className="server-tech-chip"><img src="/images/app/openrouter.png" alt="OpenRouter" />OpenRouter</span>
                      <span className="server-tech-chip"><img src="/images/app/opensearch.png" alt="OpenSearch" />OpenSearch</span>
                      <span className="server-tech-chip"><img src="/images/app/openshift.png" alt="OpenShift" />OpenShift</span>
                      <span className="server-tech-chip"><img src="/images/app/oracle.png" alt="Oracle" />Oracle</span>
                      <span className="server-tech-chip"><img src="/images/app/perplexity.png" alt="Perplexity" />Perplexity</span>
                      <span className="server-tech-chip"><img src="/images/app/postgresql.png" alt="PostgreSQL" />PostgreSQL</span>
                      <span className="server-tech-chip"><img src="/images/app/prometheus.png" alt="Prometheus" />Prometheus</span>
                      <span className="server-tech-chip"><img src="/images/app/reddit.png" alt="Reddit" />Reddit</span>
                      <span className="server-tech-chip"><img src="/images/app/redis.png" alt="Redis" />Redis</span>
                      <span className="server-tech-chip"><img src="/images/app/rss.png" alt="RSS" />RSS</span>
                      <span className="server-tech-chip"><img src="/images/app/signal.png" alt="Signal" />Signal</span>
                      <span className="server-tech-chip"><img src="/images/app/slack.png" alt="Slack" />Slack</span>
                      <span className="server-tech-chip"><img src="/images/app/soap.png" alt="SOAP" />SOAP</span>
                      <span className="server-tech-chip"><img src="/images/app/sqlite.png" alt="SQLite" />SQLite</span>
                      <span className="server-tech-chip"><img src="/images/app/supabase.png" alt="Supabase" />Supabase</span>
                      <span className="server-tech-chip"><img src="/images/app/telegram.png" alt="Telegram" />Telegram</span>
                      <span className="server-tech-chip"><img src="/images/app/things3.png" alt="Things3" />Things3</span>
                      <span className="server-tech-chip"><img src="/images/app/threads.png" alt="Threads" />Threads</span>
                      <span className="server-tech-chip"><img src="/images/app/tiktok.png" alt="TikTok" />TikTok</span>
                      <span className="server-tech-chip"><img src="/images/app/together.png" alt="Together AI" />Together AI</span>
                      <span className="server-tech-chip"><img src="/images/app/trello.png" alt="Trello" />Trello</span>
                      <span className="server-tech-chip"><img src="/images/app/whatsappbusiness.png" alt="WhatsApp" />WhatsApp</span>
                      <span className="server-tech-chip"><img src="/images/app/x.png" alt="X" />X</span>
                      <span className="server-tech-chip"><img src="/images/app/youtube.png" alt="YouTube" />YouTube</span>
                      <span className="server-tech-chip"><img src="/images/app/zoom.png" alt="Zoom" />Zoom</span>
                    </div>
                  </div>
                  <div className="marquee-row">
                    <div className="marquee tech-right" id="server-tech-marquee-right"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      
        <div className="install-anywhere-spotlight">
          <button type="button" id="openInstallAnywhereModal" className="install-anywhere-trigger">
            <span className="install-anywhere-copy">
              <span className="install-anywhere-title">
                <i className="fas fa-download" aria-hidden="true"></i>
                Use QuickMCP Anywhere
              </span>
              <span className="install-anywhere-subtitle">OpenAI, Claude, IDEs, MCP</span>
            </span>
            <span className="install-anywhere-chevron" aria-hidden="true">
              <i className="fas fa-arrow-right"></i>
            </span>
          </button>
        </div>
      
      
        <section id="faq" className="faq-section">
          <div className="container">
            <div className="section-header">
              <span className="section-label">FAQ</span>
              <h2 className="section-title">Got questions?</h2>
              <p className="section-subtitle">Everything you need to know about QuickMCP.</p>
            </div>
      
            <div className="faq-grid">
              <details className="faq-item">
                <summary>What is QuickMCP and how does it work?</summary>
                <div className="faq-answer">QuickMCP connects to 500+ apps, including Gmail, Slack, GitHub, and Notion, and turns your data into structured actions your AI assistant can safely execute through MCP (Model Context Protocol).<br /><br />Just sign in, connect your apps, and ask your AI to complete real business workflows like "Analyze products in the database," "Segment customers by behavior," "Generate sales insights from recent orders," or "Identify churn-risk accounts." QuickMCP can also run as an MCP server in compatible AI tools.</div>
              </details>
      
              <details className="faq-item">
                <summary>How do I get started?</summary>
                <div className="faq-answer">Create an account, connect your first tool or database, generate actions, and test them from your AI client in minutes. No coding required for basic setups.</div>
              </details>
      
              <details className="faq-item">
                <summary>What can I connect to QuickMCP?</summary>
                <div className="faq-answer">You can connect databases like PostgreSQL, MySQL, MSSQL, and Oracle; message brokers like Kafka and RabbitMQ; in-memory data grids like Redis and Hazelcast; container platforms like OpenShift and Kubernetes; plus REST APIs and GraphQL endpoints.</div>
              </details>
      
              <details className="faq-item">
                <summary>Which AI assistants are supported?</summary>
                <div className="faq-answer">QuickMCP works with any MCP-compatible AI assistant including Claude Desktop, Cursor, VSCode with Claude extension, and other tools that support the MCP protocol.</div>
              </details>
      
              <details className="faq-item">
                <summary>Is my data secure?</summary>
                <div className="faq-answer">Yes. Access is controlled with authentication and token policies. Integrations are scoped to only the resources you explicitly allow. Your credentials are encrypted at rest.</div>
              </details>
      
              <details className="faq-item">
                <summary>Do I need coding skills?</summary>
                <div className="faq-answer">Basic setup is no-code friendly. For advanced customization, you can modify generated tools and server behavior using TypeScript or Python.</div>
              </details>
      
              <details className="faq-item">
                <summary>Can I use multiple integrations together?</summary>
                <div className="faq-answer">Yes. You can connect and orchestrate multiple services in one workflow and call them from the same MCP session for complex automations.</div>
              </details>
      
              <details className="faq-item">
                <summary>What if my app isn't supported?</summary>
                <div className="faq-answer">You can integrate any app using custom API connectors or database connections. QuickMCP generates MCP tools from any REST API specification.</div>
              </details>
            </div>
          </div>
        </section>
      
        <div id="installAnywhereModal" className="install-modal" aria-hidden="true">
          <div className="install-modal-backdrop" data-install-modal-close></div>
          <div className="install-modal-panel" role="dialog" aria-modal="true" aria-labelledby="installAnywhereTitle">
            <button type="button" id="installModalBackBtn" className="install-modal-back hidden" aria-label="Back to install options">
              <i className="fas fa-arrow-left" aria-hidden="true"></i>
              Back
            </button>
            <button type="button" className="install-modal-close" data-install-modal-close aria-label="Close installation modal">
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
            <div id="installModalViewChooser" className="install-modal-view">
              <h3 id="installAnywhereTitle" className="install-modal-heading">
                <i className="fas fa-download" aria-hidden="true"></i>
                Use QuickMCP Anywhere
              </h3>
              <p className="install-modal-subtitle">Choose where you want to install QuickMCP integrations.</p>
              <div className="install-modal-actions">
                <button type="button" id="openApiKeyFlowBtn" className="install-primary-btn">Get Api Key</button>
              </div>
              <div className="install-channels">
                <div className="install-channel-group">
                  <span className="install-channel-label">OpenAI</span>
                  <button type="button" id="openChatgptFlowBtn" className="install-channel-row">
                    <span className="install-channel-main">
                      <img src="/images/app/openai.png" alt="ChatGPT" className="install-channel-icon" />
                      <span className="install-channel-text">
                        <span className="install-channel-title">ChatGPT</span>
                        <span className="install-channel-subtitle">Developer Mode</span>
                      </span>
                    </span>
                    <i className="fas fa-chevron-right install-channel-arrow" aria-hidden="true"></i>
                  </button>
                </div>
                <div className="install-channel-group">
                  <span className="install-channel-label">Claude</span>
                  <button type="button" id="openClaudeWebFlowBtn" className="install-channel-row">
                    <span className="install-channel-main">
                      <img src="/images/app/claude.png" alt="Claude Web" className="install-channel-icon" />
                      <span className="install-channel-title">Claude Web</span>
                    </span>
                    <i className="fas fa-chevron-right install-channel-arrow" aria-hidden="true"></i>
                  </button>
                  <button type="button" id="openClaudeDesktopFlowBtn" className="install-channel-row">
                    <span className="install-channel-main">
                      <img src="/images/app/claude.png" alt="Claude Desktop" className="install-channel-icon" />
                      <span className="install-channel-title">Claude Desktop</span>
                    </span>
                    <i className="fas fa-chevron-right install-channel-arrow" aria-hidden="true"></i>
                  </button>
                </div>
                <button type="button" className="install-channel-row">
                  <span className="install-channel-main">
                    <img src="/images/app/vscode.png" alt="IDEs" className="install-channel-icon" />
                    <span className="install-channel-title">IDEs</span>
                  </span>
                  <i className="fas fa-chevron-right install-channel-arrow" aria-hidden="true"></i>
                </button>
                <button type="button" className="install-channel-row">
                  <span className="install-channel-main">
                    <img src="/images/app/mcp.png" alt="MCP" className="install-channel-icon" />
                    <span className="install-channel-title">MCP</span>
                  </span>
                  <i className="fas fa-chevron-right install-channel-arrow" aria-hidden="true"></i>
                </button>
              </div>
            </div>
      
            <div id="installModalViewApiKey" className="install-modal-view hidden">
              <h3 className="install-modal-heading">
                <i className="fas fa-key" aria-hidden="true"></i>
                Get Api Key
              </h3>
              <div className="install-step-list">
                <section className="install-step">
                  <div className="install-step-index">1</div>
                  <h4 className="install-step-title">Copy the MCP URL</h4>
                  <div className="install-step-copy-row">
                    <code className="install-step-url">https://www.quickmcp.ai/mcp</code>
                    <button type="button" id="copyMcpUrlBtn" className="install-copy-btn">Copy</button>
                  </div>
                </section>
      
                <section className="install-step">
                  <div className="install-step-index">2</div>
                  <h4 className="install-step-title">Generate a signed token for Authorization header</h4>
                  <p className="install-step-desc">Sign in to generate an Authorization header token for your MCP client.</p>
                  <div className="install-signin-row">
                    <a href="/authorization" className="install-signin-btn">Sign in and Generate Token</a>
                    <span className="token-help-wrap">
                      <button type="button" className="token-help-icon" aria-label="Show token generate guide">
                        <i className="fas fa-circle-question" aria-hidden="true"></i>
                      </button>
                      <span className="token-help-preview" role="tooltip">
                        <img src="/images/install/token-generate/token-generate.png" alt="Token generate guide preview" />
                      </span>
                    </span>
                  </div>
                </section>
      
                <section className="install-step">
                  <div className="install-step-index">3</div>
                  <h4 className="install-step-title">Use it with your favourite agentic SDK or MCP client</h4>
                </section>
              </div>
            </div>
      
            <div id="installModalViewChatgpt" className="install-modal-view hidden">
              <h3 className="install-modal-heading">
                <i className="fas fa-comments" aria-hidden="true"></i>
                ChatGPT Developer Mode
              </h3>
              <p className="install-modal-subtitle">Install QuickMCP in ChatGPT by following these steps.</p>
              <div className="install-steps-scroll">
                <div className="install-step-list">
                  <section className="install-step">
                    <div className="install-step-index">1</div>
                    <h4 className="install-step-title">Generate Token</h4>
                    <p className="install-step-desc">Sign in to generate an Authorization header token for your MCP client.</p>
                    <div className="install-signin-row">
                      <a href="/authorization" className="install-signin-btn">Sign in and Generate Token</a>
                      <span className="token-help-wrap token-help-down token-help-global">
                        <button type="button" className="token-help-icon" aria-label="Show token generate guide">
                          <i className="fas fa-circle-question" aria-hidden="true"></i>
                        </button>
                        <span className="token-help-preview" role="tooltip">
                          <img src="/images/install/token-generate/token-generate.png" alt="Token generate guide preview" />
                        </span>
                      </span>
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">2</div>
                    <h4 className="install-step-title">Copy the MCP URL</h4>
                    <div className="install-step-copy-row">
                      <code className="install-step-url">https://www.quickmcp.ai/mcp</code>
                      <button type="button" id="copyMcpUrlBtnChatgpt" className="install-copy-btn">Copy</button>
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">3</div>
                    <h4 className="install-step-title">Click on Advanced Settings</h4>
                    <p className="install-step-desc">Go to Settings &gt; Apps and click on Advanced Settings.</p>
                    <div className="install-guide-media">
                      <img src="/images/install/chatgpt-web/step0.png" alt="ChatGPT settings page" />
                      <img src="/images/install/chatgpt-web/step1.png" alt="ChatGPT advanced settings" />
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">4</div>
                    <h4 className="install-step-title">Enable Developer mode and click Create app</h4>
                    <p className="install-step-desc">Enable the Developer mode toggle and click on Create app.</p>
                    <div className="install-guide-media">
                      <img src="/images/install/chatgpt-web/step2.png" alt="Enable developer mode in ChatGPT" />
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">5</div>
                    <h4 className="install-step-title">Enter the details and click Create</h4>
                    <div className="install-guide-media">
                      <img src="/images/install/chatgpt-web/step4.png" alt="Create app form in ChatGPT" />
                    </div>
                    <p className="install-step-desc">Fill in the following details:</p>
                    <ul className="install-step-details">
                      <li>Name: QuickMCP</li>
                      <li>MCP Server URL: Paste the URL from step 2</li>
                      <li>Authentication: OAuth</li>
                      <li>Keep Client ID and Client Secret empty</li>
                      <li>Check "I understand and want to continue"</li>
                      <li>Click Create</li>
                    </ul>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">6</div>
                    <h4 className="install-step-title">Click Allow access</h4>
                    <p className="install-step-desc">Click on Allow access to authorize ChatGPT to connect with QuickMCP.</p>
                    <div className="install-guide-media">
                      <img src="/images/install/chatgpt-web/step5.png" alt="Allow access prompt" />
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">7</div>
                    <h4 className="install-step-title">QuickMCP is now connected</h4>
                    <p className="install-step-desc">QuickMCP is now connected to ChatGPT. You can view the connection details and available actions.</p>
                    <div className="install-guide-media">
                      <img src="/images/install/chatgpt-web/step6.png" alt="QuickMCP connected in ChatGPT" />
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">8</div>
                    <h4 className="install-step-title">Go back to chat, click + More, and select QuickMCP</h4>
                    <p className="install-step-desc">Go back to chat, click on the + icon, then click More, and select QuickMCP. You'll need to do this for every new chat.</p>
                    <div className="install-guide-media">
                      <img src="/images/install/chatgpt-web/step7.png" alt="Select QuickMCP from chat menu" />
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">9</div>
                    <h4 className="install-step-title">Try it out!</h4>
                    <p className="install-step-desc">Try something like "Hey QuickMCP, fetch my latest emails from Gmail" and start using 1000+ apps inside ChatGPT.</p>
                    <div className="install-guide-media">
                      <img src="/images/install/chatgpt-web/step8.png" alt="Try QuickMCP in ChatGPT" />
                    </div>
                  </section>
                </div>
              </div>
            </div>
      
            <div id="installModalViewClaudeWeb" className="install-modal-view hidden">
              <h3 className="install-modal-heading">
                <i className="fas fa-globe" aria-hidden="true"></i>
                Claude Web
              </h3>
              <p className="install-modal-subtitle">Install QuickMCP in Claude Web by following these steps.</p>
              <div className="install-steps-scroll">
                <div className="install-step-list">
                  <section className="install-step">
                    <div className="install-step-index">1</div>
                    <h4 className="install-step-title">Copy the MCP URL</h4>
                    <div className="install-step-copy-row">
                      <code className="install-step-url">https://www.quickmcp.ai/mcp</code>
                      <button type="button" id="copyMcpUrlBtnClaudeWeb" className="install-copy-btn">Copy</button>
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">2</div>
                    <h4 className="install-step-title">In Claude Web Settings, under Connectors click on “Add custom connector"</h4>
                    <div className="install-guide-media">
                      <img src="/images/install/claude-web/step0.png" alt="Claude Web connectors settings" />
                      <img src="/images/install/claude-web/step1.png" alt="Add custom connector in Claude Web" />
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">3</div>
                    <h4 className="install-step-title">Add QuickMCP to Claude Web</h4>
                    <p className="install-step-desc">Paste the MCP URL and token into Claude Web MCP settings, then save and start using your tools.</p>
                    <div className="install-guide-media">
                      <img src="/images/install/claude-web/step2.png" alt="Claude Web custom connector form" />
                      <img src="/images/install/claude-web/step3.png" alt="Claude Web connector saved" />
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">4</div>
                    <h4 className="install-step-title">Click on "Connect" or if it is connected click "Disconnect" then "Connect".</h4>
                    <p className="install-step-desc">Sometimes Claude Web does not show tools until the connector is reconnected.</p>
                    <div className="install-guide-media">
                      <img src="/images/install/claude-web/step4.png" alt="Reconnect connector in Claude Web" />
                      <img src="/images/install/claude-web/step5.png" alt="Tools visible after reconnect in Claude Web" />
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">5</div>
                    <h4 className="install-step-title">Click Allow access</h4>
                    <p className="install-step-desc">Click on Allow access to authorize Claude to connect with QuickMCP.</p>
                    <div className="install-guide-media">
                      <img src="/images/install/chatgpt-web/step5.png" alt="Allow access prompt" />
                    </div>
                  </section>
      
                  <section className="install-step">
                    <div className="install-step-index">6</div>
                    <h4 className="install-step-title">QuickMCP is now connected</h4>
                    <p className="install-step-desc">QuickMCP is now connected to Claude Web. You can view the connector details and available tools.</p>
                    <div className="install-guide-media">
                      <img src="/images/install/claude-web/step6.png" alt="QuickMCP connected in Claude Web" />
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="tokenHelpFloatingPreview" className="token-help-floating-preview" aria-hidden="true">
          <img src="" alt="" />
        </div>
      
      
        <section className="cta-section">
          <div className="container">
            <div className="cta-card">
              <div className="cta-content">
                <h2 className="cta-title">Ready to connect your AI to everything?</h2>
                <p className="cta-subtitle">Start building your MCP servers today. No credit card required.</p>
                <div className="cta-actions">
                  <a href="/login" className="btn btn-accent">
                    <i className="fas fa-rocket"></i>
                    Get Started Free
                  </a>
                  <a href="mailto:quickmcp@gmail.com" className="btn btn-ghost">
                    Contact Sales
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      
      
        <footer className="footer">
          <div className="container">
            <p className="footer-text">
              Built with <span style={{ color: "var(--accent)" }}>&#10084;</span> by QuickMCP Team &middot;
              <a href="mailto:quickmcp@gmail.com">quickmcp@gmail.com</a>
            </p>
          </div>
        </footer>
    </>
  );
}
