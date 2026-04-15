(function () {
  const canvas = document.getElementById("intro-flight-canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const W = 1280;
  const H = 720;
  canvas.width = W;
  canvas.height = H;

// ─────────────────────────────────────────────
//  DETERMINISTIC RNG  (stable hand-drawn look)
// ─────────────────────────────────────────────
let _seed = 7919;
function rng() {
  _seed ^= _seed << 13;
  _seed ^= _seed >> 17;
  _seed ^= _seed << 5;
  return (_seed >>> 0) / 0xFFFFFFFF;
}
function rj(r) { return (rng() - 0.5) * 2 * r; }

// ─────────────────────────────────────────────
//  PROJECTION  (equirectangular, North Atlantic focus)
// ─────────────────────────────────────────────
const LNG_MIN = -108, LNG_MAX = 28;
const LAT_MAX =  80,  LAT_MIN = 24;
const PX = 95, PY = 48;

function proj([lng, lat]) {
  return [
    PX + (lng - LNG_MIN) / (LNG_MAX - LNG_MIN) * (W - 2*PX),
    PY + (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * (H - 2*PY)
  ];
}

// ─────────────────────────────────────────────
//  GEOGRAPHIC DATA  [lng, lat]
// ─────────────────────────────────────────────
const COASTS = {
  north_america: [
    [-80.0,25.5],[-80.1,27.2],[-81.0,29.0],[-81.3,30.5],
    [-80.9,31.5],[-80.5,32.2],[-78.9,33.8],[-77.2,34.8],
    [-76.5,35.1],[-75.7,36.5],[-75.3,37.8],[-74.8,38.7],
    [-74.2,39.5],[-74.0,40.5],[-73.5,41.0],[-72.2,41.4],
    [-71.0,41.5],[-70.5,42.0],[-70.0,42.5],[-69.9,43.0],
    [-70.5,43.5],[-68.5,44.3],[-67.0,44.9],[-66.0,44.8],
    [-65.0,44.4],[-64.5,44.9],[-64.0,45.1],[-63.0,44.7],
    [-62.0,45.5],[-61.0,46.0],[-60.5,47.0],[-59.5,47.5],
    [-57.8,47.5],[-55.0,47.0],[-53.5,46.7],[-53.0,47.4],
    [-53.2,48.5],[-55.0,50.0],[-57.0,51.5],[-59.5,52.2],
    [-60.5,52.0],[-62.0,53.5],[-64.2,54.5],[-65.0,56.2],
    [-65.5,58.0],[-64.0,60.5],[-65.5,62.5],[-68.0,63.0],
    [-72.0,63.0],[-75.0,62.5],[-79.0,62.5]
  ],
  greenland: [
    [-44,59.8],[-40,62.5],[-35,66.0],[-24,70.0],
    [-18,73.0],[-17,77.0],[-22,79.0],[-35,79.0],
    [-47,78.0],[-55,76.0],[-59,73.0],[-59,68.0],
    [-53,64.0],[-47,61.0],[-44,59.8]
  ],
  iceland: [
    [-24,63.4],[-21,63.4],[-17.5,63.5],[-13.5,64.0],
    [-13.8,65.6],[-17.5,66.5],[-22.5,66.5],[-24.5,65.5],[-24,63.4]
  ],
  great_britain: [
    [-5.7,50.1],[-5.1,50.0],[-3.5,50.4],[-2.5,50.5],
    [-1.5,50.7],[0.0,51.0],[1.5,51.4],[1.5,52.0],
    [0.5,52.9],[0.4,53.5],[-0.3,54.0],[-0.8,54.5],
    [-1.5,55.0],[-2.5,55.5],[-3.0,56.0],[-3.5,57.0],
    [-4.5,57.5],[-5.0,58.0],[-5.5,58.3],[-5.1,58.7],
    [-3.1,58.5],[-1.7,60.4],[-1.3,60.7],[-1.8,61.0],
    [-3.5,59.8],[-4.3,58.2],[-5.1,57.8],[-5.3,56.2],
    [-4.8,55.0],[-4.5,54.5],[-3.5,54.1],[-3.1,53.2],
    [-3.3,51.7],[-4.3,51.6],[-5.0,51.2],[-5.7,50.1]
  ],
  ireland: [
    [-9.8,51.4],[-9.2,51.4],[-8.5,51.5],[-7.5,52.0],
    [-6.2,52.0],[-6.0,53.0],[-6.3,53.4],[-7.5,55.0],
    [-7.8,55.5],[-8.5,54.6],[-10.0,54.0],[-10.5,53.0],
    [-10.0,52.0],[-9.8,51.4]
  ],
  west_europe: [
    [3.1,51.4],[2.6,51.2],[1.5,51.1],[0.0,51.0],
    [-1.5,49.8],[-2.0,48.5],[-3.5,47.5],[-4.5,47.5],
    [-4.2,47.0],[-2.5,46.5],[-1.7,46.1],[-1.7,44.0],
    [-1.8,43.5],[-3.0,43.5],[-4.5,43.6],[-6.0,43.7],
    [-7.5,43.9],[-8.5,43.8],[-9.0,43.3],[-8.5,42.0],
    [-9.2,41.5],[-9.2,39.5],[-9.5,38.5],[-9.5,37.0],
    [-8.5,37.0],[-7.5,37.0],[-6.5,36.6],[-5.6,36.0],
    [-5.5,36.1],[-4.0,36.5],[-2.0,36.8],[-0.5,37.5],
    [0.5,39.5],[0.8,41.0],[1.5,41.3],[2.0,41.5],
    [3.0,42.5],[3.5,43.5],[4.5,43.5],[5.5,43.4],
    [6.0,43.5],[7.5,43.8],[7.5,45.0],[6.5,46.0],
    [6.0,46.5],[5.0,47.5],[3.5,47.5],[2.5,48.0],
    [2.0,49.0],[1.8,50.5],[2.5,51.2],[3.1,51.4]
  ]
};

// ─────────────────────────────────────────────
//  GREAT CIRCLE PATH
// ─────────────────────────────────────────────
const TORONTO = [-79.38, 43.65];
const LONDON  = [ -0.13, 51.51];

function greatCirclePath([lng1,lat1], [lng2,lat2], steps=110) {
  const r = d => d * Math.PI / 180;
  const d = a => a * 180 / Math.PI;
  const φ1=r(lat1), λ1=r(lng1), φ2=r(lat2), λ2=r(lng2);
  const D = 2*Math.asin(Math.sqrt(
    Math.pow(Math.sin((φ2-φ1)/2),2) +
    Math.cos(φ1)*Math.cos(φ2)*Math.pow(Math.sin((λ2-λ1)/2),2)
  ));
  return Array.from({length: steps+1}, (_,i) => {
    const t = i/steps;
    const A = Math.sin((1-t)*D)/Math.sin(D);
    const B = Math.sin(t*D)/Math.sin(D);
    const x = A*Math.cos(φ1)*Math.cos(λ1)+B*Math.cos(φ2)*Math.cos(λ2);
    const y = A*Math.cos(φ1)*Math.sin(λ1)+B*Math.cos(φ2)*Math.sin(λ2);
    const z = A*Math.sin(φ1)+B*Math.sin(φ2);
    return [d(Math.atan2(y,x)), d(Math.atan2(z, Math.sqrt(x*x+y*y)))];
  });
}

const FLIGHT_PATH = greatCirclePath(TORONTO, LONDON, 110);

// ─────────────────────────────────────────────
//  DRAWING PRIMITIVES
// ─────────────────────────────────────────────
function ink(alpha=1, width=1.5) {
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth   = width;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
}

// Progressively draw a hand-sketched polyline
function sketch(pts, alpha, progress=1, jitterAmt=1.6, lineW=1.4) {
  if (pts.length < 2 || progress <= 0) return;
  const n = Math.max(2, Math.ceil(pts.length * Math.min(progress,1)));
  const sub = pts.slice(0, n);

  // Pass 1: main stroke
  ink(alpha * 0.92, lineW);
  ctx.beginPath();
  sub.forEach(([lng,lat], i) => {
    const [x,y] = proj([lng,lat]);
    if (i===0) ctx.moveTo(x+rj(jitterAmt),   y+rj(jitterAmt));
    else       ctx.lineTo(x+rj(jitterAmt*0.9),y+rj(jitterAmt*0.9));
  });
  ctx.stroke();

  // Pass 2: ghost layer (sketchbook double-line feel)
  ink(alpha * 0.18, lineW * 0.7);
  ctx.beginPath();
  sub.forEach(([lng,lat], i) => {
    const [x,y] = proj([lng,lat]);
    if (i===0) ctx.moveTo(x+rj(jitterAmt*1.6),y+rj(jitterAmt*1.6));
    else       ctx.lineTo(x+rj(jitterAmt*1.4),y+rj(jitterAmt*1.4));
  });
  ctx.stroke();
}

// Rough hand-drawn circle
function roughCircle(cx,cy,r,alpha,lw=1.5) {
  ink(alpha,lw);
  ctx.beginPath();
  const steps = 18;
  for (let i=0; i<=steps; i++) {
    const a = (i/steps)*Math.PI*2;
    const rx = cx + (r+rj(0.7))*Math.cos(a);
    const ry = cy + (r+rj(0.7))*Math.sin(a);
    if (i===0) ctx.moveTo(rx,ry); else ctx.lineTo(rx,ry);
  }
  ctx.closePath();
  ctx.stroke();
}

// City marker: concentric rough circles
function drawMarker([lng,lat], alpha) {
  const [x,y] = proj([lng,lat]);
  roughCircle(x,y, 5.5, alpha, 1.6);
  roughCircle(x,y, 2.0, alpha*0.6, 1.2);
  // tiny fill dot
  ink(alpha, 3);
  ctx.beginPath();
  ctx.arc(x+rj(0.3),y+rj(0.3),1,0,Math.PI*2);
  ctx.stroke();
}

// Label
function label([lng,lat], text, alpha, ox=11, oy=-13) {
  const [x,y] = proj([lng,lat]);
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.font = '600 11px "Courier New", Courier, monospace';
  ctx.letterSpacing = '2.5px';
  ctx.fillText(text, x+ox+rj(0.6), y+oy+rj(0.6));
  ctx.restore();
}

// ─────────────────────────────────────────────
//  PLANE  (top-down silhouette, hand-drawn)
// ─────────────────────────────────────────────
function drawPlane(idx) {
  const N   = FLIGHT_PATH.length;
  const [lng,lat]   = FLIGHT_PATH[idx];
  const [lng2,lat2] = FLIGHT_PATH[Math.min(idx+1,N-1)];
  const [x,y]  = proj([lng,lat]);
  const [x2,y2]= proj([lng2,lat2]);
  const angle  = Math.atan2(y2-y, x2-x);

  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  ink(1.0, 1.7);

  const s = 13;

  // Fuselage top edge
  ctx.beginPath();
  ctx.moveTo(-s*1.25+rj(0.4), -s*0.09+rj(0.25));
  ctx.bezierCurveTo(-s*0.3+rj(0.3), -s*0.13+rj(0.2),
                     s*0.7+rj(0.3),  -s*0.10+rj(0.2),
                     s*1.55+rj(0.4),  s*0.01+rj(0.2));
  ctx.stroke();

  // Fuselage bottom edge
  ctx.beginPath();
  ctx.moveTo(-s*1.25+rj(0.4), s*0.09+rj(0.25));
  ctx.bezierCurveTo(-s*0.3+rj(0.3), s*0.13+rj(0.2),
                     s*0.7+rj(0.3),  s*0.10+rj(0.2),
                     s*1.55+rj(0.4), -s*0.01+rj(0.2));
  ctx.stroke();

  // Port wing (top)
  ctx.beginPath();
  ctx.moveTo( s*0.05+rj(0.4),  -s*0.1+rj(0.25));
  ctx.lineTo( s*0.28+rj(0.4),  -s*1.40+rj(0.45));
  ctx.lineTo(-s*0.52+rj(0.4),  -s*1.30+rj(0.45));
  ctx.lineTo(-s*0.65+rj(0.35), -s*0.1+rj(0.25));
  ctx.stroke();

  // Starboard wing (bottom)
  ctx.beginPath();
  ctx.moveTo( s*0.05+rj(0.4),   s*0.1+rj(0.25));
  ctx.lineTo( s*0.28+rj(0.4),   s*1.40+rj(0.45));
  ctx.lineTo(-s*0.52+rj(0.4),   s*1.30+rj(0.45));
  ctx.lineTo(-s*0.65+rj(0.35),  s*0.1+rj(0.25));
  ctx.stroke();

  // Port horizontal stabiliser
  ctx.beginPath();
  ctx.moveTo(-s*0.82+rj(0.35),  -s*0.09+rj(0.2));
  ctx.lineTo(-s*1.05+rj(0.35),  -s*0.62+rj(0.4));
  ctx.lineTo(-s*1.32+rj(0.35),  -s*0.09+rj(0.2));
  ctx.stroke();

  // Starboard horizontal stabiliser
  ctx.beginPath();
  ctx.moveTo(-s*0.82+rj(0.35),   s*0.09+rj(0.2));
  ctx.lineTo(-s*1.05+rj(0.35),   s*0.62+rj(0.4));
  ctx.lineTo(-s*1.32+rj(0.35),   s*0.09+rj(0.2));
  ctx.stroke();

  ctx.restore();
}

// ─────────────────────────────────────────────
//  EASING / TIMING HELPERS
// ─────────────────────────────────────────────
function easeOut(t,p=2)  { return 1-Math.pow(1-t,p); }
function easeIn(t,p=2)   { return Math.pow(t,p); }
function clamp(v,a,b)    { return Math.max(a,Math.min(b,v)); }
function phase(e,s,end)  { return clamp((e-s)/(end-s),0,1); }

// ─────────────────────────────────────────────
//  TIMING  (ms)
// ─────────────────────────────────────────────
const LOOP          = 11000;
const MAP_END       = 2200;
const MARKERS_START = 1400;
const MARKERS_END   = 2400;
const FLIGHT_START  = 2400;
const FLIGHT_END    = 8900;
const PULSE_END     = 11000;

// staggered coast reveal
const COAST_ORDER = [
  { data: COASTS.north_america, s: 0,    e: 1800 },
  { data: COASTS.west_europe,   s: 100,  e: 1900 },
  { data: COASTS.great_britain, s: 250,  e: 1900 },
  { data: COASTS.ireland,       s: 350,  e: 1700 },
  { data: COASTS.greenland,     s: 150,  e: 1600 },
  { data: COASTS.iceland,       s: 400,  e: 1500 },
];

// ─────────────────────────────────────────────
//  SCROLL-DRIVEN TIMELINE (Modern only; one pass0 → LOOP as user scrolls down)
// ─────────────────────────────────────────────
function drawAtTimeline(e) {
  if (document.documentElement.dataset.uiTheme !== "modern") return;

  const t = Math.min(LOOP, Math.max(0, e));

  _seed = 7919;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  COAST_ORDER.forEach(({ data, s, e: end }) => {
    const p = easeOut(phase(t, s, end), 3);
    sketch(data, 0.36, p, 1.6, 1.3);
  });

  const mA = easeOut(phase(t, MARKERS_START, MARKERS_END));
  if (mA > 0) {
    drawMarker(TORONTO, mA);
    label(TORONTO, "TORONTO", mA, 11, -14);
    drawMarker(LONDON, mA);
    label(LONDON, "LONDON", mA, 11, -14);
  }

  const fT = phase(t, FLIGHT_START, FLIGHT_END);

  if (fT > 0) {
    const N = FLIGHT_PATH.length;
    const idx = Math.floor(fT * (N - 1));

    ctx.save();
    ctx.setLineDash([3, 11]);
    ink(0.42, 1.1);
    ctx.beginPath();
    FLIGHT_PATH.slice(0, idx + 1).forEach(([lng, lat], i) => {
      const [x, y] = proj([lng, lat]);
      if (i === 0) ctx.moveTo(x + rj(0.7), y + rj(0.7));
      else ctx.lineTo(x + rj(0.7), y + rj(0.7));
    });
    ctx.stroke();
    ctx.restore();

    if (idx < N - 1) drawPlane(idx);
  }

  if (fT >= 1) {
    const [lx, ly] = proj(LONDON);
    for (let ring = 0; ring < 3; ring++) {
      const pT = easeIn(phase(t, FLIGHT_END, PULSE_END));
      const rt = (pT + ring * 0.33) % 1;
      const fa = (1 - rt) * 0.75;
      ink(fa, 1.4);
      ctx.beginPath();
      ctx.arc(lx + rj(0.8), ly + rj(0.8), 5 + rt * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isSaveData = !!(navigator.connection && navigator.connection.saveData);

if (isReducedMotion || isSaveData) {
  drawAtTimeline(LOOP);
} else {
  const readScrollY = () =>
    window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? 0;

  /** Scroll distance for full animation: reach end ~when welcome intro copy is in view (slightly snappy). */
  const scrollPxForFullAnimation = () => {
    const vh = window.innerHeight;
    const intro = document.querySelector(".intro-card-body");
    if (
      intro &&
      intro.offsetParent !== null &&
      window.getComputedStyle(intro).display !== "none"
    ) {
      const yDoc = intro.getBoundingClientRect().top + readScrollY();
      let range = yDoc - vh * 0.34;
      range *= 0.88;
      return Math.max(360, range);
    }
    return Math.max(520, vh * 0.88);
  };

  let rafId = 0;
  let isCanvasVisible = true;
  let hasScrollBindings = false;

  const onScrollOrResize = () => {
    if (!isCanvasVisible) return;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      const y = readScrollY();
      const range = scrollPxForFullAnimation();
      const progress = Math.min(1, Math.max(0, y / range));
      drawAtTimeline(progress * LOOP);
    });
  };

  const bindScrollListeners = () => {
    if (hasScrollBindings) return;
    hasScrollBindings = true;
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
  };

  const unbindScrollListeners = () => {
    if (!hasScrollBindings) return;
    hasScrollBindings = false;
    window.removeEventListener("scroll", onScrollOrResize);
    window.removeEventListener("resize", onScrollOrResize);
  };

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      isCanvasVisible = entries.some((entry) => entry.isIntersecting);
      if (isCanvasVisible) {
        bindScrollListeners();
        onScrollOrResize();
      } else {
        unbindScrollListeners();
      }
    },
    { threshold: 0 }
  );
  visibilityObserver.observe(canvas);

  new MutationObserver(() => onScrollOrResize()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-ui-theme"],
  });

  drawAtTimeline(0);
  onScrollOrResize();
}
})();