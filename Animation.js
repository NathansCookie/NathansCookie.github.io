/* Vault Door Overlay Animation - Simplified and Clean */

(async function vaultOverlay() {
  'use strict';

  // Config
  const DEFAULTS = { windup: 500, open: 1000 };
  let config = DEFAULTS;
  try {
    const resp = await fetch('Animation.json');
    if (resp.ok) {
      const json = await resp.json();
      config = { 
        windup: Number(json.windup || DEFAULTS.windup),
        open: Number(json.open || json.duration || DEFAULTS.open)
      };
    }
  } catch (e) {}

  const WINDUP_MS = config.windup;
  const OPEN_MS = config.open;
  const PREFERS_REDUCED = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Save page state
  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'vault-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at center, rgba(0,0,0,0.5), rgba(0,0,0,0.95))',
    zIndex: '99999',
    pointerEvents: 'auto'
  });

  // Inject styles once
  const styleId = 'vault-anim-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes dialPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      
      #vault-dial {
        animation: dialPulse 2s ease-in-out infinite;
        cursor: pointer;
        transition: transform 100ms ease;
      }
      #vault-dial:hover { transform: scale(1.1) !important; }
      #vault-dial:active { transform: scale(0.95) !important; }
      
      @media (prefers-reduced-motion: reduce) {
        #vault-dial { animation: none; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);

  // SVG dimensions
  const w = window.innerWidth || screen.width;
  const h = window.innerHeight || screen.height;
  const cx = w / 2;
  const cy = h / 2;
  const diag = Math.hypot(w, h);
  const vaultRadius = diag / 2 + 40;

  // Create SVG
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  Object.assign(svg.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none'
  });

  // Defs
  const defs = document.createElementNS(svgNS, 'defs');

  // Clip paths
  const clipL = document.createElementNS(svgNS, 'clipPath');
  clipL.setAttribute('id', 'clipL');
  const rectL = document.createElementNS(svgNS, 'rect');
  rectL.setAttribute('x', '0');
  rectL.setAttribute('y', '0');
  rectL.setAttribute('width', w / 2);
  rectL.setAttribute('height', h);
  clipL.appendChild(rectL);
  defs.appendChild(clipL);

  const clipR = document.createElementNS(svgNS, 'clipPath');
  clipR.setAttribute('id', 'clipR');
  const rectR = document.createElementNS(svgNS, 'rect');
  rectR.setAttribute('x', w / 2);
  rectR.setAttribute('y', '0');
  rectR.setAttribute('width', w / 2);
  rectR.setAttribute('height', h);
  clipR.appendChild(rectR);
  defs.appendChild(clipR);

  svg.appendChild(defs);

  // Create vault halves (simple circles clipped)
  const circleCmd = `M ${cx} ${cy} m -${vaultRadius},0 a ${vaultRadius} ${vaultRadius} 0 1 0 ${vaultRadius * 2} 0 a ${vaultRadius} ${vaultRadius} 0 1 0 -${vaultRadius * 2} 0`;
  
  const leftG = document.createElementNS(svgNS, 'g');
  leftG.setAttribute('id', 'vault-left');
  Object.assign(leftG.style, {
    transformOrigin: '0% 50%',
    transition: `transform ${OPEN_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1)`
  });
  const leftPath = document.createElementNS(svgNS, 'path');
  leftPath.setAttribute('d', circleCmd);
  leftPath.setAttribute('fill', '#2a2a2a');
  leftPath.setAttribute('clip-path', 'url(#clipL)');
  leftG.appendChild(leftPath);
  svg.appendChild(leftG);

  const rightG = document.createElementNS(svgNS, 'g');
  rightG.setAttribute('id', 'vault-right');
  Object.assign(rightG.style, {
    transformOrigin: '100% 50%',
    transition: `transform ${OPEN_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1)`
  });
  const rightPath = document.createElementNS(svgNS, 'path');
  rightPath.setAttribute('d', circleCmd);
  rightPath.setAttribute('fill', '#4a4a4a');
  rightPath.setAttribute('clip-path', 'url(#clipR)');
  rightG.appendChild(rightPath);
  svg.appendChild(rightG);

  // Central rim
  const rim = document.createElementNS(svgNS, 'circle');
  rim.setAttribute('cx', cx);
  rim.setAttribute('cy', cy);
  rim.setAttribute('r', vaultRadius - 10);
  rim.setAttribute('fill', 'none');
  rim.setAttribute('stroke', '#666');
  rim.setAttribute('stroke-width', '8');
  svg.appendChild(rim);

  // Spokes
  const spokes = document.createElementNS(svgNS, 'g');
  spokes.setAttribute('id', 'spokes');
  Object.assign(spokes.style, {
    transformOrigin: `${cx}px ${cy}px`,
    transition: `transform ${WINDUP_MS}ms ease-in-out`
  });
  const innerR = 30;
  const outerR = vaultRadius - 40;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i;
    const x1 = cx + Math.cos(angle) * innerR;
    const y1 = cy + Math.sin(angle) * innerR;
    const x2 = cx + Math.cos(angle) * outerR;
    const y2 = cy + Math.sin(angle) * outerR;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#555');
    line.setAttribute('stroke-width', '4');
    line.setAttribute('stroke-linecap', 'round');
    spokes.appendChild(line);
  }
  svg.appendChild(spokes);

  // Center dot
  const center = document.createElementNS(svgNS, 'circle');
  center.setAttribute('cx', cx);
  center.setAttribute('cy', cy);
  center.setAttribute('r', 20);
  center.setAttribute('fill', '#1a1a1a');
  svg.appendChild(center);

  overlay.appendChild(svg);

  // Create dial button - position at true viewport center
  const dial = document.createElement('button');
  dial.id = 'vault-dial';
  dial.type = 'button';
  dial.setAttribute('aria-label', 'Open vault');
  Object.assign(dial.style, {
    position: 'fixed',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    left: 'calc(50% - 40px)',
    top: 'calc(50% - 40px)',
    border: 'none',
    background: 'linear-gradient(180deg, #f8f8f8, #d0d0d0)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer',
    zIndex: '100001',
    pointerEvents: 'auto',
    color: '#333',
    margin: '0',
    padding: '0'
  });
  dial.textContent = 'OPEN';
  document.body.appendChild(dial);

  // Animation control
  let isRunning = false;

  async function startAnimation() {
    if (isRunning) return;
    isRunning = true;
    dial.disabled = true;

    if (PREFERS_REDUCED) {
      cleanup();
      return;
    }

    // Windup: spin spokes
    spokes.style.transform = 'rotate(360deg)';
    await new Promise(r => setTimeout(r, WINDUP_MS));

    // Reset spokes transition to smooth
    spokes.style.transition = `opacity ${OPEN_MS}ms ease`;
    spokes.style.opacity = '0';

    // Open: slide halves apart
    leftG.style.transform = `translateX(-${w * 1.2}px)`;
    rightG.style.transform = `translateX(${w * 1.2}px)`;

    // Fade everything
    center.style.transition = `opacity ${OPEN_MS}ms ease`;
    center.style.opacity = '0';
    rim.style.transition = `opacity ${OPEN_MS}ms ease`;
    rim.style.opacity = '0';
    dial.style.transition = `opacity 400ms ease`;
    dial.style.opacity = '0';
    overlay.style.transition = `background ${OPEN_MS}ms ease`;
    overlay.style.background = 'rgba(0,0,0,0)';

    // Wait for animations to finish
    await new Promise(r => setTimeout(r, OPEN_MS + 200));

    cleanup();
  }

  function cleanup() {
    try {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    } catch (e) {}
    // Notify page that vault finished opening so listeners can reveal content
    try {
      document.dispatchEvent(new CustomEvent('vault:opened'));
    } catch (e) {}
    document.documentElement.style.overflow = prevOverflow || '';
  }

  dial.addEventListener('click', startAnimation);
  dial.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startAnimation();
    }
  });

})();
