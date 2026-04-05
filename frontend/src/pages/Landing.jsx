import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

/* ── ASL alphabet labels ── */
// Full 26-letter ASL fingerspelling (J uses velocity-based motion detection)
const SIGN_LABELS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

/* ── ASL SVG hand icon ── */
function HandSVG({ letter = 'A', color = '#4f6ef7' }) {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80" fill="none">
      <circle cx="40" cy="40" r="38" fill={`${color}18`} stroke={`${color}40`} strokeWidth="1.5"/>
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 36, fontWeight: 800, fontFamily: 'Outfit', fill: color }}>
        {letter}
      </text>
    </svg>
  );
}

/* ── Animated ticker for "live sign" in mockup ── */
const DEMO_SEQUENCE = ['H','E','L','L','O',' ','W','O','R','L','D'];
function useDemoTicker() {
  const [idx, setIdx] = useState(0);
  const [sentence, setSentence] = useState('');
  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => {
        const next = (i + 1) % DEMO_SEQUENCE.length;
        setSentence(s => {
          if (next === 0) return '';
          return s + DEMO_SEQUENCE[i];
        });
        return next;
      });
    }, 700);
    return () => clearInterval(t);
  }, []);
  return { sign: DEMO_SEQUENCE[idx], sentence };
}

/* ── NavBar ── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
      <div className="lp-nav-logo">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-9v4h4l-5 9z"/></svg>
        </div>
        Gesturera
      </div>
      <ul className="lp-nav-links">
        <li><a href="#features">Features</a></li>
        <li><a href="#how-it-works">How It Works</a></li>
        <li><a href="#tech">Technology</a></li>
      </ul>
      <div className="lp-nav-actions">
        <Link to="/login"><button className="btn-ghost">Sign In</button></Link>
        <Link to="/signup"><button className="btn-accent">Get Started</button></Link>
      </div>
    </nav>
  );
}

/* ── 3D Rotating Cube Scene ── */
function Scene3D() {
  const faces = [
    { cls: 'face-front',  label: 'A' },
    { cls: 'face-back',   label: 'B' },
    { cls: 'face-right',  label: 'C' },
    { cls: 'face-left',   label: 'D' },
    { cls: 'face-top',    label: 'E' },
    { cls: 'face-bottom', label: 'F' },
  ];
  return (
    <div className="scene-3d">
      <div className="orbit-ring ring-1" />
      <div className="orbit-ring ring-2" />
      <div className="cube-group">
        {faces.map(f => (
          <div key={f.cls} className={`cube-face ${f.cls}`}>{f.label}</div>
        ))}
      </div>
      <div className="cube-shadow" />

      {/* Floating info cards */}
      <div className="float-card card-1">
        <div className="fc-icon" style={{ background: 'rgba(79,110,247,.1)' }}>🤖</div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Model</div>
          <div>MLP Classifier</div>
        </div>
      </div>
      <div className="float-card card-2">
        <div className="fc-icon" style={{ background: 'rgba(78,210,150,.1)' }}>⚡</div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Latency</div>
          <div>~33 ms</div>
        </div>
      </div>
      <div className="float-card card-3">
        <div className="fc-icon" style={{ background: 'rgba(232,119,58,.1)' }}>🏆</div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Signs</div>
          <div>26 ASL Letters</div>
        </div>
      </div>
    </div>
  );
}

/* ── Live Mockup in Showcase ── */
function LiveMockup() {
  const { sign, sentence } = useDemoTicker();
  return (
    <div className="showcase-mockup">
      <div className="mockup-browser">
        <div className="mockup-bar">
          <div className="mock-dot mock-dot-r" />
          <div className="mock-dot mock-dot-y" />
          <div className="mock-dot mock-dot-g" />
          <div className="mockup-url">gestara.app/workspace</div>
        </div>
        <div className="mockup-body">
          <div className="mockup-cam-placeholder">
            <div className="cam-dot-ring" />
            <div className="cam-label">Camera Active</div>
          </div>
          <div className="mockup-status-bar">
            <span className="status-sign">Live Sign: <strong style={{ color: '#79c0ff' }}>{sign === ' ' ? 'SPACE' : sign}</strong></span>
            <span className="status-sentence">{sentence || '…'}</span>
          </div>
        </div>
      </div>
      <div className="mockup-reflection" />
    </div>
  );
}

/* ── Scroll Reveal Hook ── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  useScrollReveal();

  const features = [
    {
      icon: '🤚', color: '#4f6ef7', bg: 'rgba(79,110,247,.1)',
      title: 'Real-Time Hand Tracking',
      desc: 'MediaPipe Hand Landmarker detects 21 key-points per frame with sub-millisecond accuracy — directly in your browser.',
    },
    {
      icon: '🧠', color: '#7c4fff', bg: 'rgba(124,79,255,.1)',
      title: 'AI-Powered Recognition',
      desc: 'A velocity-enhanced MLP model classifies all 26 ASL letters — including motion-based signs like J — from 3D coordinates and frame-to-frame deltas.',
    },
    {
      icon: '⚡', color: '#e8773a', bg: 'rgba(232,119,58,.1)',
      title: 'Instant Translation',
      desc: 'WebSocket streaming sends predictions to a FastAPI backend in under 33 ms — real-time, smooth, and responsive.',
    },
    {
      icon: '🔒', color: '#2db6e6', bg: 'rgba(45,182,230,.1)',
      title: 'Secure by Design',
      desc: 'JWT-based authentication protects your session. Your camera feed never leaves your device.',
    },
    {
      icon: '📝', color: '#4ade80', bg: 'rgba(74,222,128,.1)',
      title: 'Sentence Builder',
      desc: 'Smart debounce logic accumulates recognised signs into words and sentences, just like the original CLI experience.',
    },
    {
      icon: '🌐', color: '#e84f8b', bg: 'rgba(232,79,139,.1)',
      title: 'Browser Native',
      desc: 'No app install needed. Works in any modern browser via WebRTC and WebAssembly — cross-platform out of the box.',
    },
  ];

  const steps = [
    { num: '01', icon: '📷', title: 'Allow Camera', desc: 'Grant webcam access. Your video stays local — nothing is uploaded.' },
    { num: '02', icon: '🤙', title: 'Perform a Sign', desc: 'Hold an ASL fingerspelling letter steady in frame for ~half a second.' },
    { num: '03', icon: '💬', title: 'See Translation', desc: 'The recognised letter appears live and builds your sentence automatically.' },
  ];

  const highlights = [
    { quote: 'Gesturera bridges the communication gap for the Deaf community effortlessly. The real-time ASL accuracy is remarkable.', name: 'Priya S.', role: 'Accessibility Researcher', initials: 'PS', grad: 'linear-gradient(135deg,#4f6ef7,#7c4fff)' },
    { quote: 'Integrating ASL recognition into a web app with this level of latency is genuinely impressive. A big leap for assistive tech.', name: 'Aryan M.', role: 'ML Engineer', initials: 'AM', grad: 'linear-gradient(135deg,#e8773a,#f5a623)' },
    { quote: 'I tested it with students and the debounce timing feels perfectly natural — not too fast, not too slow.', name: 'Dr. Kavita R.', role: 'Special Education Lead', initials: 'KR', grad: 'linear-gradient(135deg,#2db6e6,#4ade80)' },
    { quote: 'The light, clean UI makes it approachable for all ages. Beautiful design paired with powerful AI.', name: 'Rohan P.', role: 'Product Designer', initials: 'RP', grad: 'linear-gradient(135deg,#e84f8b,#7c4fff)' },
  ];

  const techStack = [
    { label: 'React 19', icon: '⚛️' },
    { label: 'FastAPI', icon: '🐍' },
    { label: 'PyTorch', icon: '🔥' },
    { label: 'MediaPipe', icon: '🤚' },
    { label: 'WebSockets', icon: '🔌' },
    { label: 'MySQL', icon: '🗄️' },
    { label: 'Vite', icon: '⚡' },
    { label: 'JWT Auth', icon: '🔐' },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-bg-orb orb-1" />
        <div className="hero-bg-orb orb-2" />
        <div className="hero-bg-orb orb-3" />
        <div className="hero-inner">
          <div>
            <div className="hero-badge">
              <span className="badge-dot" />
              AI-Powered ASL Fingerspelling Recognition
            </div>
            <h1 className="hero-title">
              Spell in Signs.<br />
              <span>Read in Seconds.</span>
            </h1>
            <p className="hero-desc">
              Gesturera translates American Sign Language fingerspelling into text in real time — 
              using your webcam and cutting-edge AI. No installs. No delays. Just communication.
            </p>
            <div className="hero-cta">
              <button className="btn-accent btn-accent-lg" id="hero-get-started" onClick={() => navigate('/signup')}>
                Start Translating Free
              </button>
              <button className="btn-outline-lg" id="hero-learn-more" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                See How It Works
              </button>
            </div>
            <div className="hero-stats">
              {[
                { num: '26', label: 'ASL Letters' },
                { num: '<33ms', label: 'Prediction Latency' },
                { num: '100%', label: 'Browser Native' },
              ].map(s => (
                <div key={s.label}>
                  <div className="hero-stat-num">{s.num}</div>
                  <div className="hero-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <Scene3D />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section" id="features" style={{ padding: '100px 5%' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal">
            <div className="section-label">Features</div>
            <h2 className="section-title">Everything you need to communicate</h2>
            <p className="section-subtitle">Built for accessibility, designed for speed. Gesturera combines the best of AI and browser technology.</p>
          </div>
          <div className="features-grid" style={{ marginTop: '3.5rem' }}>
            {features.map((f, i) => (
              <div key={f.title} className={`feature-card reveal reveal-delay-${i % 3 + 1}`}>
                <div className="feature-icon" style={{ background: f.bg }}>
                  <span style={{ fontSize: '1.4rem' }}>{f.icon}</span>
                </div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '100px 5%', background: 'var(--bg)' }} id="how-it-works">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center' }}>
            <div className="section-label" style={{ justifyContent: 'center' }}>
              <span style={{ display: 'block', width: 24, height: 2, background: 'var(--accent)', borderRadius: 2 }} />
              How It Works
            </div>
            <h2 className="section-title">Three steps to real-time translation</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>Simple to start, powerful under the hood.</p>
          </div>
          <div className="how-steps">
            {steps.map((s, i) => (
              <div key={s.num} className={`step-card reveal reveal-delay-${i + 1}`}>
                <div className="step-num">
                  <span style={{ fontSize: '1.6rem' }}>{s.icon}</span>
                  <span>{s.num}</span>
                </div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHOWCASE (3D Mockup + tech) ── */}
      <section className="showcase-section" id="tech">
        <div className="showcase-inner">
          <LiveMockup />
          <div>
            <div className="reveal">
              <div className="section-label">Live Demo</div>
              <h2 className="section-title">See it in action</h2>
              <p className="section-subtitle">
                The workspace captures your hand landmarks at 30 FPS, sends them over a WebSocket, 
                and renders the AI prediction in real time — accumulating ASL letters into a full sentence.
              </p>
            </div>
            <div className="tech-pills reveal reveal-delay-2">
              {techStack.map(t => (
                <div className="tech-pill" key={t.label}>
                  <span>{t.icon}</span> {t.label}
                </div>
              ))}
            </div>
            <div className="reveal reveal-delay-3" style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
              <button className="btn-accent btn-accent-lg" id="showcase-try-now" onClick={() => navigate('/signup')}>Try it Now</button>
              <button className="btn-outline-lg" id="showcase-sign-in" onClick={() => navigate('/login')}>Sign In</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS ── */}
      <section style={{ padding: '100px 5%', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <div className="section-label" style={{ justifyContent: 'center' }}>
              <span style={{ display: 'block', width: 24, height: 2, background: 'var(--accent)', borderRadius: 2 }} />
              Community
            </div>
            <h2 className="section-title">Trusted by researchers &amp; educators</h2>
          </div>
          <div className="highlights-grid" style={{ marginTop: '3rem' }}>
            {highlights.map((h, i) => (
              <div key={h.name} className={`highlight-card reveal reveal-delay-${(i % 2) + 1}`}>
                <p className="highlight-quote">{h.quote}</p>
                <div className="highlight-author">
                  <div className="author-avatar" style={{ background: h.grad }}>{h.initials}</div>
                  <div>
                    <div className="author-name">{h.name}</div>
                    <div className="author-role">{h.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="cta-section">
        <div className="cta-bg-mesh" />
        <div className="cta-inner">
          <h2 className="cta-title reveal">
            Ready to <span>break barriers?</span>
          </h2>
          <p className="cta-sub reveal reveal-delay-1">
            Join Gesturera today — free, instant, and entirely in your browser.
          </p>
          <div className="cta-actions reveal reveal-delay-2">
            <button className="btn-accent btn-accent-lg" id="cta-get-started" onClick={() => navigate('/signup')}>
              Create Free Account
            </button>
            <button className="btn-outline-lg" id="cta-login" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="footer-brand">✦ Gesturera</div>
        <ul className="footer-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how-it-works">How it Works</a></li>
          <li><Link to="/login">Sign In</Link></li>
          <li><Link to="/signup">Sign Up</Link></li>
        </ul>
        <div className="footer-copy">© {new Date().getFullYear()} Gesturera. Built with ❤️ for accessibility.</div>
      </footer>
    </div>
  );
}
