const fs = require('fs');
const path = require('path');

const escudoBase64 = fs.readFileSync(path.join(__dirname, '../../apps/web/src/assets/escudo_base64.txt'), 'utf8').trim();

const previewHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SINEC · Presentación del Sistema EBR / BPM (Preview Oficial)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-dark: #001220;
      --navy-deep: #002B49;
      --navy-surface: #04385f;
      --navy-card: rgba(4, 56, 95, 0.45);
      --navy-glass: rgba(0, 43, 73, 0.7);
      --cyan-bright: #00B4D8;
      --cyan-glow: rgba(0, 180, 216, 0.35);
      --teal-accent: #00C896;
      --teal-glow: rgba(0, 200, 150, 0.3);
      --amber: #F59E0B;
      --amber-glow: rgba(245, 158, 11, 0.3);
      --crimson: #EF4444;
      --crimson-glow: rgba(239, 68, 68, 0.3);
      --text-white: #FFFFFF;
      --text-muted: #94A3B8;
      --text-dim: #64748B;
      --border-glass: rgba(255, 255, 255, 0.12);
      --border-glow: rgba(0, 180, 216, 0.4);
      --radius-lg: 20px;
      --radius-md: 14px;
      --radius-sm: 8px;
      --transition-smooth: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      user-select: none;
    }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--primary-dark);
      color: var(--text-white);
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* Ambient Background Mesh */
    .bg-mesh {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      background: 
        radial-gradient(circle at 15% 20%, rgba(0, 119, 182, 0.25) 0%, transparent 45%),
        radial-gradient(circle at 85% 75%, rgba(0, 200, 150, 0.18) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(0, 43, 73, 0.5) 0%, transparent 60%),
        linear-gradient(180deg, #000E1A 0%, #001A2C 100%);
    }

    .bg-grid {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      opacity: 0.08;
      background-size: 40px 40px;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 1px, transparent 1px);
    }

    /* Header Bar */
    header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      background: rgba(0, 18, 32, 0.75);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-glass);
      z-index: 50;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .brand-logo {
      height: 38px;
      width: auto;
      filter: drop-shadow(0 2px 8px rgba(0, 180, 216, 0.4));
    }

    .brand-divider {
      width: 1px;
      height: 24px;
      background: var(--border-glass);
    }

    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.5px;
      color: var(--text-white);
    }

    .brand-badge {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 20px;
      background: rgba(0, 200, 150, 0.15);
      border: 1px solid rgba(0, 200, 150, 0.4);
      color: var(--teal-accent);
    }

    .progress-bar-container {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.08);
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--cyan-bright), var(--teal-accent));
      box-shadow: 0 0 10px var(--cyan-glow);
      transition: width 0.4s ease;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-icon {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-glass);
      color: var(--text-white);
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: var(--transition-smooth);
    }

    .btn-icon:hover {
      background: rgba(0, 180, 216, 0.2);
      border-color: var(--cyan-bright);
      transform: translateY(-1px);
    }

    /* Presentation Viewport */
    main {
      flex: 1;
      position: relative;
      margin-top: 64px;
      margin-bottom: 64px;
      width: 100vw;
      overflow: hidden;
      z-index: 10;
    }

    .slides-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .slide {
      position: absolute;
      inset: 0;
      padding: 32px 64px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transform: scale(0.96) translateX(40px);
      transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), 
                  transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                  visibility 0.5s;
      overflow-y: auto;
    }

    .slide.active {
      opacity: 1;
      visibility: visible;
      transform: scale(1) translateX(0);
      z-index: 2;
    }

    .slide.prev {
      transform: scale(0.96) translateX(-40px);
    }

    /* Common Slide Elements */
    .slide-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--cyan-bright);
      margin-bottom: 10px;
    }

    .slide-title {
      font-family: 'Outfit', sans-serif;
      font-size: 38px;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #FFFFFF 30%, #BAE6FD 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .slide-subtitle {
      font-size: 16px;
      color: var(--text-muted);
      line-height: 1.5;
      max-width: 820px;
      margin-bottom: 28px;
    }

    /* Glass Cards */
    .glass-card {
      background: var(--navy-card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-lg);
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: var(--transition-smooth);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    }

    .glass-card:hover {
      border-color: rgba(0, 180, 216, 0.5);
      box-shadow: 0 16px 40px rgba(0, 180, 216, 0.15);
      transform: translateY(-3px);
    }

    .glass-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    }

    /* SLIDE 1: PORTADA */
    .hero-container {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 40px;
      align-items: center;
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
    }

    .hero-badge-live {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 30px;
      background: rgba(0, 180, 216, 0.12);
      border: 1px solid rgba(0, 180, 216, 0.35);
      font-size: 12px;
      font-weight: 600;
      color: var(--cyan-bright);
      margin-bottom: 18px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--teal-accent);
      box-shadow: 0 0 10px var(--teal-accent);
      animation: pulseAnim 2s infinite;
    }

    @keyframes pulseAnim {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.6; }
    }

    .hero-title {
      font-family: 'Outfit', sans-serif;
      font-size: 48px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }

    .hero-title span {
      background: linear-gradient(135deg, var(--cyan-bright) 0%, var(--teal-accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-desc {
      font-size: 16px;
      color: #CBD5E1;
      line-height: 1.6;
      margin-bottom: 28px;
    }

    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
    }

    .team-card {
      background: rgba(4, 40, 68, 0.5);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: var(--transition-smooth);
    }

    .team-card:hover {
      background: rgba(0, 119, 182, 0.25);
      border-color: var(--cyan-bright);
      transform: translateX(4px);
    }

    .team-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284C7, #0D9488);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      color: #fff;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }

    .team-info h4 {
      font-size: 13.5px;
      font-weight: 700;
      color: #fff;
    }

    .team-info p {
      font-size: 11px;
      color: var(--text-muted);
    }

    .hero-media-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 42px 30px;
    }

    .hero-media-card img {
      max-width: 180px;
      height: auto;
      filter: drop-shadow(0 15px 35px rgba(0, 180, 216, 0.45));
      margin-bottom: 24px;
      animation: floatLogo 6s ease-in-out infinite;
    }

    @keyframes floatLogo {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }

    .inst-title {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #FFFFFF;
      margin-bottom: 6px;
    }

    .inst-sub {
      font-size: 13px;
      color: var(--cyan-bright);
      margin-bottom: 22px;
    }

    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

    .meta-pill {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      padding: 6px 12px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-glass);
      color: #CBD5E1;
    }

    /* SLIDE 2: PROBLEMA VS SOLUCIÓN */
    .compare-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
    }

    .card-problem {
      border-left: 4px solid var(--crimson);
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(4, 56, 95, 0.35) 100%);
    }

    .card-solution {
      border-left: 4px solid var(--teal-accent);
      background: linear-gradient(180deg, rgba(0, 200, 150, 0.09) 0%, rgba(4, 56, 95, 0.45) 100%);
    }

    .card-header-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    .badge-problem {
      background: rgba(239, 68, 68, 0.18);
      color: #F87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }

    .badge-solution {
      background: rgba(0, 200, 150, 0.18);
      color: var(--teal-accent);
      border: 1px solid rgba(0, 200, 150, 0.4);
    }

    .card-title-lg {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .item-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 20px;
    }

    .item-list li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 14px;
      line-height: 1.45;
      color: #E2E8F0;
    }

    .item-icon {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      margin-top: 1px;
    }

    .icon-fail {
      background: rgba(239, 68, 68, 0.2);
      color: #F87171;
    }

    .icon-success {
      background: rgba(0, 200, 150, 0.2);
      color: var(--teal-accent);
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border-glass);
    }

    .stat-box {
      text-align: center;
      padding: 10px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: var(--radius-sm);
    }

    .stat-val {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #fff;
    }

    .stat-val.fail { color: #F87171; }
    .stat-val.ok { color: var(--teal-accent); }

    .stat-lbl {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* SLIDE 3: QUIÉN USA EL SISTEMA */
    .roles-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
    }

    .role-card {
      background: rgba(3, 37, 63, 0.55);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-md);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      transition: var(--transition-smooth);
    }

    .role-card:hover {
      border-color: var(--cyan-bright);
      background: rgba(4, 56, 95, 0.85);
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(0, 180, 216, 0.2);
    }

    .role-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .role-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(0, 180, 216, 0.2), rgba(0, 200, 150, 0.2));
      border: 1px solid rgba(0, 180, 216, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--cyan-bright);
    }

    .role-badge {
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: #94A3B8;
    }

    .role-name {
      font-family: 'Outfit', sans-serif;
      font-size: 17px;
      font-weight: 700;
      color: #fff;
    }

    .role-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.45;
      flex: 1;
    }

    .role-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .role-tag {
      font-size: 10.5px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(0, 180, 216, 0.12);
      color: #BAE6FD;
    }

    /* SLIDE 4: MOTOR DE RIESGO & SIMULADOR */
    .risk-engine-grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 32px;
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
      align-items: start;
    }

    .formula-card {
      background: rgba(3, 30, 50, 0.6);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-lg);
      padding: 24px;
    }

    .formula-display {
      background: #000E1A;
      border: 1px solid rgba(0, 180, 216, 0.3);
      border-radius: var(--radius-md);
      padding: 20px;
      text-align: center;
      margin-bottom: 20px;
      box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
    }

    .formula-main {
      font-family: 'Outfit', sans-serif;
      font-size: 32px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: 1px;
    }

    .formula-main span {
      color: var(--cyan-bright);
    }

    .formula-sub {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--teal-accent);
      margin-top: 6px;
    }

    .formula-expl-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-size: 13px;
      color: #CBD5E1;
      line-height: 1.45;
    }

    .formula-expl-item {
      display: flex;
      gap: 10px;
    }

    .formula-key {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: var(--cyan-bright);
      min-width: 32px;
    }

    /* Simulator Panel */
    .sim-panel {
      background: rgba(4, 46, 77, 0.55);
      border: 1px solid rgba(0, 180, 216, 0.35);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.35);
    }

    .sim-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .sim-header h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }

    .sim-badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(0, 200, 150, 0.15);
      color: var(--teal-accent);
      border: 1px solid rgba(0, 200, 150, 0.3);
      font-weight: 600;
    }

    .slider-group {
      margin-bottom: 20px;
    }

    .slider-label {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #E2E8F0;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .slider-label span.val {
      font-family: 'JetBrains Mono', monospace;
      color: var(--cyan-bright);
    }

    input[type=range] {
      width: 100%;
      height: 8px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.12);
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
    }

    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--cyan-bright);
      cursor: pointer;
      box-shadow: 0 0 12px var(--cyan-bright);
      border: 2px solid #fff;
      transition: transform 0.1s;
    }

    input[type=range]::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    .sim-result-box {
      margin-top: 24px;
      padding: 20px;
      border-radius: var(--radius-md);
      background: #000E1A;
      border: 1px solid var(--border-glass);
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 16px;
      align-items: center;
      transition: border-color 0.4s ease;
    }

    .result-score-block {
      text-align: center;
      border-right: 1px solid var(--border-glass);
      padding-right: 16px;
    }

    .result-rt-val {
      font-family: 'Outfit', sans-serif;
      font-size: 44px;
      font-weight: 800;
      line-height: 1;
      transition: color 0.4s ease;
    }

    .result-rt-lbl {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-top: 6px;
    }

    .result-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .risk-level-badge {
      display: inline-block;
      align-self: flex-start;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.4s ease;
    }

    .freq-info {
      font-size: 13px;
      color: #E2E8F0;
    }

    .freq-info strong {
      color: #fff;
    }

    /* Footer Controls */
    footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      background: rgba(0, 18, 32, 0.75);
      backdrop-filter: blur(16px);
      border-top: 1px solid var(--border-glass);
      z-index: 50;
    }

    .nav-hints {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
      color: var(--text-dim);
    }

    .kbd {
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border-glass);
      font-family: 'JetBrains Mono', monospace;
      color: #CBD5E1;
      font-size: 11px;
    }

    .hud-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .slide-counter {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 600;
      color: #E2E8F0;
      min-width: 70px;
      text-align: center;
    }

    .btn-nav {
      background: rgba(0, 180, 216, 0.15);
      border: 1px solid rgba(0, 180, 216, 0.35);
      color: #fff;
      padding: 8px 18px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: var(--transition-smooth);
    }

    .btn-nav:hover:not(:disabled) {
      background: var(--cyan-bright);
      color: var(--primary-dark);
      box-shadow: 0 0 15px var(--cyan-glow);
    }

    .btn-nav:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      border-color: var(--border-glass);
    }

    /* Overview Mode */
    .overview-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 14, 26, 0.96);
      backdrop-filter: blur(20px);
      z-index: 100;
      display: none;
      padding: 60px 40px;
      overflow-y: auto;
    }

    .overview-overlay.active {
      display: block;
    }

    .overview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto 30px auto;
    }

    .overview-header h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
    }

    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .overview-card {
      background: var(--navy-surface);
      border: 2px solid var(--border-glass);
      border-radius: var(--radius-md);
      padding: 16px;
      cursor: pointer;
      transition: var(--transition-smooth);
      position: relative;
    }

    .overview-card:hover {
      border-color: var(--cyan-bright);
      transform: scale(1.03);
    }

    .overview-card.current {
      border-color: var(--teal-accent);
      box-shadow: 0 0 20px var(--teal-glow);
    }

    .ov-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--cyan-bright);
      margin-bottom: 6px;
    }

    .ov-title {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }

    /* Responsive adjustments */
    @media (max-width: 1024px) {
      .hero-container, .compare-container, .risk-engine-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
      .roles-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .slide {
        padding: 24px 32px;
      }
      .hero-title {
        font-size: 36px;
      }
    }
  </style>
</head>
<body>

  <!-- Ambient Backgrounds -->
  <div class="bg-mesh"></div>
  <div class="bg-grid"></div>

  <!-- Header -->
  <header>
    <div class="brand-group">
      <img src="${escudoBase64}" alt="DIGEMAPS Escudo" class="brand-logo">
      <div class="brand-title">SINEC · MSP / DIGEMAPS</div>
      <div class="brand-divider"></div>
      <div class="brand-badge">EBR / BPM · PREVIEW</div>
    </div>
    
    <div class="progress-bar-container">
      <div class="progress-bar-fill" id="progressBar" style="width: 25%;"></div>
    </div>

    <div class="header-actions">
      <button class="btn-icon" id="btnOverview" title="Vista de Mosaico (O)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </button>
      <button class="btn-icon" id="btnFullscreen" title="Pantalla Completa (F)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>
    </div>
  </header>

  <!-- Viewport -->
  <main id="slidesContainer">
    <div class="slides-wrapper">

      <!-- SLIDE 1: PORTADA OFICIAL -->
      <section class="slide active" data-index="1" data-title="Portada Institucional">
        <div class="hero-container">
          <div class="hero-left">
            <div class="hero-badge-live">
              <span class="pulse-dot"></span>
              SISTEMA OFICIAL EN PRODUCCIÓN · 2026
            </div>
            <h1 class="hero-title">
              Evaluación Basada en Riesgo <span>(EBR / BPM)</span>
            </h1>
            <p class="hero-desc">
              Plataforma tecnológica de fiscalización sanitaria, cálculo determinista de riesgo probabilístico y auditoría en tiempo real para la República Dominicana.
            </p>
            
            <div class="team-grid">
              <div class="team-card">
                <div class="team-avatar">DF</div>
                <div class="team-info">
                  <h4>Diana Ferreras</h4>
                  <p>Líder · Proceso & BPM</p>
                </div>
              </div>
              <div class="team-card">
                <div class="team-avatar">GD</div>
                <div class="team-info">
                  <h4>Gabriela Duverge</h4>
                  <p>Backend & Data Engine</p>
                </div>
              </div>
              <div class="team-card">
                <div class="team-avatar">AF</div>
                <div class="team-info">
                  <h4>Ashley Franco</h4>
                  <p>Frontend · PWA Offline</p>
                </div>
              </div>
              <div class="team-card">
                <div class="team-avatar">JM</div>
                <div class="team-info">
                  <h4>Jorge Melo</h4>
                  <p>Frontend & Arquitectura</p>
                </div>
              </div>
              <div class="team-card">
                <div class="team-avatar">RT</div>
                <div class="team-info">
                  <h4>Rowlis Trinidad</h4>
                  <p>Calidad QA & DevOps</p>
                </div>
              </div>
            </div>
          </div>

          <div class="hero-right">
            <div class="glass-card hero-media-card">
              <img src="${escudoBase64}" alt="Escudo Oficial DIGEMAPS">
              <div class="inst-title">MINISTERIO DE SALUD PÚBLICA</div>
              <div class="inst-sub">Viceministerio de Garantía de la Calidad · DIGEMAPS</div>
              <div class="meta-pills">
                <span class="meta-pill">v2.4.0 Estable</span>
                <span class="meta-pill">Entrega: 25 Sep 2026</span>
                <span class="meta-pill">PWA Offline First</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SLIDE 2: PROBLEMA REAL VS SOLUCIÓN -->
      <section class="slide" data-index="2" data-title="Problema Real vs. Solución">
        <div style="max-width: 1280px; margin: 0 auto; width: 100%;">
          <div class="slide-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            DIAGNÓSTICO SECTOR SALUD
          </div>
          <h2 class="slide-title">El Problema Real vs. Nuestra Solución</h2>
          <p class="slide-subtitle">
            Cómo transformamos un proceso manual vulnerable en una infraestructura digital resiliente y auditada.
          </p>

          <div class="compare-container">
            <!-- ANTES -->
            <div class="glass-card card-problem">
              <div class="card-header-badge badge-problem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                El Proceso Anterior (Excel & Papel)
              </div>
              <h3 class="card-title-lg">Vulnerable, Fragmentado y Lento</h3>
              <ul class="item-list">
                <li>
                  <span class="item-icon icon-fail">✕</span>
                  <span><strong>111 subcategorías calculadas a mano:</strong> Riesgo constante de error aritmético y sesgo del evaluador.</span>
                </li>
                <li>
                  <span class="item-icon icon-fail">✕</span>
                  <span><strong>Pérdida de evidencia fotográfica:</strong> Fotos enviadas por chats de mensajería, sin geolocalización ni integridad.</span>
                </li>
                <li>
                  <span class="item-icon icon-fail">✕</span>
                  <span><strong>Retraso de semanas en dictámenes:</strong> El informe tardaba hasta 15 días laborables en llegar al despacho jurídico.</span>
                </li>
                <li>
                  <span class="item-icon icon-fail">✕</span>
                  <span><strong>Sin trazabilidad ni auditoría:</strong> Fácil manipulación de archivos y sin verificación pública por parte del ciudadano.</span>
                </li>
              </ul>

              <div class="stats-row">
                <div class="stat-box">
                  <div class="stat-val fail">14 Días</div>
                  <div class="stat-lbl">Tiempo Dictamen</div>
                </div>
                <div class="stat-box">
                  <div class="stat-val fail">~35%</div>
                  <div class="stat-lbl">Error en Fórmulas</div>
                </div>
                <div class="stat-box">
                  <div class="stat-val fail">0%</div>
                  <div class="stat-lbl">Trazabilidad Cripto</div>
                </div>
              </div>
            </div>

            <!-- AHORA -->
            <div class="glass-card card-solution">
              <div class="card-header-badge badge-solution">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Con el Sistema SINEC (PWA + EBR)
              </div>
              <h3 class="card-title-lg">Determinista, Seguro y en Tiempo Real</h3>
              <ul class="item-list">
                <li>
                  <span class="item-icon icon-success">✓</span>
                  <span><strong>Motor Matemático en Base de Datos:</strong> Algoritmo dual en TS y PL/pgSQL con verificación cruzada idéntica.</span>
                </li>
                <li>
                  <span class="item-icon icon-success">✓</span>
                  <span><strong>Operación 100% Offline con Dexie/IndexedDB:</strong> Levantamiento en campo sin señal, sincronización FIFO automática al volver la red.</span>
                </li>
                <li>
                  <span class="item-icon icon-success">✓</span>
                  <span><strong>Emisión Instantánea de PDF Oficial:</strong> Generación en <2 segundos con código QR criptográfico y firma digital.</span>
                </li>
                <li>
                  <span class="item-icon icon-success">✓</span>
                  <span><strong>Evidencia con GPS y Timestamp:</strong> Fotografías comprimidas en cliente (<300KB) con coordenadas inalterables.</span>
                </li>
              </ul>

              <div class="stats-row">
                <div class="stat-box">
                  <div class="stat-val ok">< 2 Min</div>
                  <div class="stat-lbl">Dictamen Listo</div>
                </div>
                <div class="stat-box">
                  <div class="stat-val ok">0.00%</div>
                  <div class="stat-lbl">Margen de Error</div>
                </div>
                <div class="stat-box">
                  <div class="stat-val ok">100%</div>
                  <div class="stat-lbl">Auditabilidad SHA</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SLIDE 3: QUIÉN USA EL SISTEMA -->
      <section class="slide" data-index="3" data-title="Ecosistema de Usuarios">
        <div style="max-width: 1280px; margin: 0 auto; width: 100%;">
          <div class="slide-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            MATRIZ DE ROLES & PERMISOS (RBAC)
          </div>
          <h2 class="slide-title">Quién Usa el Sistema: 5 Roles + Ciudadano</h2>
          <p class="slide-subtitle">
            Cada actor cuenta con una interfaz especializada y flujos de trabajo optimizados según sus responsabilidades legales.
          </p>

          <div class="roles-grid">
            <!-- ROL 1 -->
            <div class="role-card">
              <div class="role-top">
                <div class="role-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <span class="role-badge">CAMPO</span>
              </div>
              <h3 class="role-name">Técnico / Inspector</h3>
              <p class="role-desc">
                Ejecuta la inspección en campo. Utiliza la PWA sin conexión, captura fotos con coordenadas GPS y recolecta la firma del establecimiento.
              </p>
              <div class="role-tags">
                <span class="role-tag">Offline PWA</span>
                <span class="role-tag">Ficha BPM</span>
                <span class="role-tag">Evidencias</span>
              </div>
            </div>

            <!-- ROL 2 -->
            <div class="role-card">
              <div class="role-top">
                <div class="role-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <span class="role-badge">OPERATIVO</span>
              </div>
              <h3 class="role-name">Coordinador de Equipo</h3>
              <p class="role-desc">
                Planifica y asigna inspecciones en el calendario, monitorea la carga de trabajo de los técnicos y revisa borradores antes del cierre.
              </p>
              <div class="role-tags">
                <span class="role-tag">Calendario</span>
                <span class="role-tag">Asignaciones</span>
                <span class="role-tag">Aprobación</span>
              </div>
            </div>

            <!-- ROL 3 -->
            <div class="role-card">
              <div class="role-top">
                <div class="role-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
                <span class="role-badge">ESTRATÉGICO</span>
              </div>
              <h3 class="role-name">Director / DIGEMAPS</h3>
              <p class="role-desc">
                Tablero ejecutivo nacional: mapa de calor de riesgo, distribución geográfica, semáforos de cumplimiento e informes estadísticos.
              </p>
              <div class="role-tags">
                <span class="role-tag">Dashboard</span>
                <span class="role-tag">Semáforo Riesgo</span>
                <span class="role-tag">Reportes</span>
              </div>
            </div>

            <!-- ROL 4 -->
            <div class="role-card">
              <div class="role-top">
                <div class="role-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <span class="role-badge">NORMATIVO</span>
              </div>
              <h3 class="role-name">Técnico Jurídico</h3>
              <p class="role-desc">
                Recibe automáticamente los casos con no conformidades críticas, redacta dictámenes legales y emite resoluciones de sanción o clausura.
              </p>
              <div class="role-tags">
                <span class="role-tag">Dictamen Legal</span>
                <span class="role-tag">Medidas Cautelares</span>
                <span class="role-tag">Sanciones</span>
              </div>
            </div>

            <!-- ROL 5 -->
            <div class="role-card">
              <div class="role-top">
                <div class="role-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span class="role-badge">SEGURIDAD</span>
              </div>
              <h3 class="role-name">Administrador</h3>
              <p class="role-desc">
                Gestión centralizada de usuarios, políticas de contraseñas Argon2id, logs de auditoría inmutables, 2FA y configuración del sistema.
              </p>
              <div class="role-tags">
                <span class="role-tag">RBAC</span>
                <span class="role-tag">Auditoría</span>
                <span class="role-tag">Seguridad</span>
              </div>
            </div>

            <!-- ROL 6: CIUDADANO -->
            <div class="role-card" style="border-color: rgba(0, 200, 150, 0.4);">
              <div class="role-top">
                <div class="role-icon-box" style="background: rgba(0, 200, 150, 0.15); color: var(--teal-accent); border-color: rgba(0, 200, 150, 0.3);">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <span class="role-badge" style="color: var(--teal-accent); background: rgba(0, 200, 150, 0.1);">PÚBLICO</span>
              </div>
              <h3 class="role-name">Ciudadano</h3>
              <p class="role-desc">
                Acceso público sin autenticación para denuncias sanitarias anónimas con fotos y verificación instantánea de actas escaneando el código QR.
              </p>
              <div class="role-tags">
                <span class="role-tag" style="background: rgba(0, 200, 150, 0.12); color: #A7F3D0;">Denuncia Anónima</span>
                <span class="role-tag" style="background: rgba(0, 200, 150, 0.12); color: #A7F3D0;">Consulta QR</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SLIDE 4: MOTOR DE RIESGO INTERACTIVO -->
      <section class="slide" data-index="4" data-title="Motor de Riesgo & Simulador">
        <div style="max-width: 1280px; margin: 0 auto; width: 100%;">
          <div class="slide-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            NÚCLEO ALGORÍTMICO · GABRIELA DUVERGE
          </div>
          <h2 class="slide-title">Motor de Evaluación Basada en Riesgo (EBR)</h2>
          <p class="slide-subtitle">
            Cálculo determinista en tiempo real que clasifica la criticidad del establecimiento y dicta la frecuencia de inspección obligatoria.
          </p>

          <div class="risk-engine-grid">
            <!-- Explicación de Fórmulas -->
            <div class="formula-card">
              <div class="formula-display">
                <div class="formula-main">
                  RT = RP × RE
                </div>
                <div class="formula-sub">Riesgo Total = Riesgo Potencial × Riesgo Específico</div>
              </div>

              <div class="formula-expl-list">
                <div class="formula-expl-item">
                  <span class="formula-key">RP:</span>
                  <span><strong>Riesgo Potencial (1.0 - 5.0):</strong> Función de la naturaleza de los productos elaborados (ej: inyectables estériles vs empaques secos) y el volumen de distribución poblacional.</span>
                </div>
                <div class="formula-expl-item">
                  <span class="formula-key">RE:</span>
                  <span><strong>Riesgo Específico (1.0 - 5.0):</strong> Nivel de incumplimiento detectado en la inspección física (45 criterios en 111 subcategorías ponderadas por criticidad menor, mayor y crítica).</span>
                </div>
                <div class="formula-expl-item">
                  <span class="formula-key">RT:</span>
                  <span><strong>Riesgo Total (1.0 - 25.0):</strong> Determina la categoría sanitaria y fija el plazo reglamentario para la próxima auditoría en la República Dominicana.</span>
                </div>
              </div>
            </div>

            <!-- Simulador Interactivo Funcional -->
            <div class="sim-panel">
              <div class="sim-header">
                <h3>Simulador Interactivo en Vivo</h3>
                <span class="sim-badge">CALCULADORA DETERMINISTA</span>
              </div>

              <div class="slider-group">
                <div class="slider-label">
                  <span>Riesgo Potencial (RP)</span>
                  <span class="val" id="valRP">3.20</span>
                </div>
                <input type="range" id="sliderRP" min="1" max="5" step="0.1" value="3.2">
              </div>

              <div class="slider-group">
                <div class="slider-label">
                  <span>Riesgo Específico (RE)</span>
                  <span class="val" id="valRE">2.80</span>
                </div>
                <input type="range" id="sliderRE" min="1" max="5" step="0.1" value="2.8">
              </div>

              <div class="sim-result-box" id="resultBox">
                <div class="result-score-block">
                  <div class="result-rt-val" id="valRT">8.96</div>
                  <div class="result-rt-lbl">Riesgo Total (RT)</div>
                </div>

                <div class="result-details">
                  <div class="risk-level-badge" id="badgeLevel">RIESGO MEDIO</div>
                  <div class="freq-info">
                    Próxima Inspección: <strong id="valFreq">Semestral (6 meses)</strong>
                  </div>
                  <div class="freq-info" style="font-size: 11.5px; color: var(--text-muted);">
                    Acción: <span id="valAction">Monitoreo periódico y plan de mejoras menores.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  </main>

  <!-- Footer -->
  <footer>
    <div class="nav-hints">
      <span>Navegar: <span class="kbd">←</span> <span class="kbd">→</span> o <span class="kbd">Espacio</span></span>
      <span>Mosaico: <span class="kbd">O</span></span>
      <span>Pantalla Completa: <span class="kbd">F</span></span>
    </div>

    <div class="hud-controls">
      <button class="btn-nav" id="btnPrev">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Anterior
      </button>

      <div class="slide-counter" id="slideCounter">01 / 04</div>

      <button class="btn-nav" id="btnNext">
        Siguiente
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </footer>

  <!-- Overview Grid Modal -->
  <div class="overview-overlay" id="overviewOverlay">
    <div class="overview-header">
      <h2>Mosaico de Diapositivas (Vista General)</h2>
      <button class="btn-icon" id="btnCloseOverview">✕</button>
    </div>
    <div class="overview-grid" id="overviewGrid">
      <!-- Inyectado por JS -->
    </div>
  </div>

  <!-- JavaScript Engine -->
  <script>
    // State
    const slides = Array.from(document.querySelectorAll('.slide'));
    const totalSlides = slides.length;
    let currentIndex = 0;

    // Elements
    const progressBar = document.getElementById('progressBar');
    const slideCounter = document.getElementById('slideCounter');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnFullscreen = document.getElementById('btnFullscreen');
    const btnOverview = document.getElementById('btnOverview');
    const overviewOverlay = document.getElementById('overviewOverlay');
    const btnCloseOverview = document.getElementById('btnCloseOverview');
    const overviewGrid = document.getElementById('overviewGrid');

    // Simulator Elements
    const sliderRP = document.getElementById('sliderRP');
    const sliderRE = document.getElementById('sliderRE');
    const valRP = document.getElementById('valRP');
    const valRE = document.getElementById('valRE');
    const valRT = document.getElementById('valRT');
    const resultBox = document.getElementById('resultBox');
    const badgeLevel = document.getElementById('badgeLevel');
    const valFreq = document.getElementById('valFreq');
    const valAction = document.getElementById('valAction');

    // Update Slide View
    function updateSlide(newIndex) {
      if (newIndex < 0 || newIndex >= totalSlides) return;

      slides.forEach((slide, idx) => {
        slide.classList.remove('active', 'prev');
        if (idx === newIndex) {
          slide.classList.add('active');
        } else if (idx < newIndex) {
          slide.classList.add('prev');
        }
      });

      currentIndex = newIndex;

      // Update HUD
      const currentFormatted = String(currentIndex + 1).padStart(2, '0');
      const totalFormatted = String(totalSlides).padStart(2, '0');
      slideCounter.textContent = \`\${currentFormatted} / \${totalFormatted}\`;

      const progressPct = ((currentIndex + 1) / totalSlides) * 100;
      progressBar.style.width = \`\${progressPct}%\`;

      btnPrev.disabled = (currentIndex === 0);
      btnNext.disabled = (currentIndex === totalSlides - 1);
    }

    // Next / Prev handlers
    function nextSlide() {
      if (currentIndex < totalSlides - 1) updateSlide(currentIndex + 1);
    }

    function prevSlide() {
      if (currentIndex > 0) updateSlide(currentIndex - 1);
    }

    btnNext.addEventListener('click', nextSlide);
    btnPrev.addEventListener('click', prevSlide);

    // Keyboard Navigation
    window.addEventListener('keydown', (e) => {
      if (overviewOverlay.classList.contains('active')) {
        if (e.key === 'Escape' || e.key === 'o' || e.key === 'O') {
          closeOverview();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
          e.preventDefault();
          prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          updateSlide(0);
          break;
        case 'End':
          e.preventDefault();
          updateSlide(totalSlides - 1);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'o':
        case 'O':
          openOverview();
          break;
      }
    });

    // Touch Gestures
    let touchStartX = 0;
    let touchEndX = 0;

    window.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) nextSlide();
        else prevSlide();
      }
    }

    // Fullscreen Toggle
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
    btnFullscreen.addEventListener('click', toggleFullscreen);

    // Overview Grid
    function openOverview() {
      overviewGrid.innerHTML = '';
      slides.forEach((slide, idx) => {
        const title = slide.getAttribute('data-title') || \`Diapositiva \${idx + 1}\`;
        const card = document.createElement('div');
        card.className = \`overview-card \${idx === currentIndex ? 'current' : ''}\`;
        card.innerHTML = \`
          <div class="ov-num">SLIDE \${String(idx + 1).padStart(2, '0')}</div>
          <div class="ov-title">\${title}</div>
        \`;
        card.addEventListener('click', () => {
          updateSlide(idx);
          closeOverview();
        });
        overviewGrid.appendChild(card);
      });
      overviewOverlay.classList.add('active');
    }

    function closeOverview() {
      overviewOverlay.classList.remove('active');
    }

    btnOverview.addEventListener('click', openOverview);
    btnCloseOverview.addEventListener('click', closeOverview);

    // Risk Simulator Logic
    function updateRiskSim() {
      const rp = parseFloat(sliderRP.value);
      const re = parseFloat(sliderRE.value);
      const rt = (rp * re);

      valRP.textContent = rp.toFixed(2);
      valRE.textContent = re.toFixed(2);
      valRT.textContent = rt.toFixed(2);

      // Thresholds:
      // RT < 6.0: Bajo Riesgo (Verde) -> Anual (12 meses)
      // 6.0 <= RT < 12.0: Riesgo Medio (Amarillo) -> Semestral (6 meses)
      // RT >= 12.0: Riesgo Alto / Crítico (Rojo) -> Trimestral (3 meses) + Medidas Cautelares

      if (rt < 6.0) {
        valRT.style.color = 'var(--teal-accent)';
        resultBox.style.borderColor = 'rgba(0, 200, 150, 0.4)';
        badgeLevel.textContent = 'RIESGO BAJO (CONFORME)';
        badgeLevel.style.background = 'rgba(0, 200, 150, 0.2)';
        badgeLevel.style.color = 'var(--teal-accent)';
        valFreq.textContent = 'Anual (12 meses)';
        valAction.textContent = 'Establecimiento en cumplimiento. Renovación ordinaria.';
      } else if (rt < 12.0) {
        valRT.style.color = 'var(--amber)';
        resultBox.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        badgeLevel.textContent = 'RIESGO MEDIO (OBSERVACIONES)';
        badgeLevel.style.background = 'rgba(245, 158, 11, 0.2)';
        badgeLevel.style.color = 'var(--amber)';
        valFreq.textContent = 'Semestral (6 meses)';
        valAction.textContent = 'Monitoreo periódico y plan de mejoras menores (30 días).';
      } else {
        valRT.style.color = '#F87171';
        resultBox.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        badgeLevel.textContent = 'RIESGO ALTO (CRÍTICO)';
        badgeLevel.style.background = 'rgba(239, 68, 68, 0.25)';
        badgeLevel.style.color = '#F87171';
        valFreq.textContent = 'Trimestral (3 meses) / Inmediata';
        valAction.textContent = 'Remisión urgente a Dictamen Jurídico y medida cautelar preventiva.';
      }
    }

    sliderRP.addEventListener('input', updateRiskSim);
    sliderRE.addEventListener('input', updateRiskSim);

    // Initial setup
    updateSlide(0);
    updateRiskSim();
  </script>
</body>
</html>`;

const outPath = path.join(__dirname, 'presentacion_preview.html');
fs.writeFileSync(outPath, previewHtml, 'utf8');
console.log('Preview generado con éxito con escudo embebido en:', outPath);
