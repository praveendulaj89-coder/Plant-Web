const C = document.getElementById('c'), X = C.getContext('2d');
let W, H;

document.getElementById('toggle').addEventListener('click', function() {
  this.classList.toggle('active');
  document.getElementById('controls').classList.toggle('open');
});
document.getElementById('reset').addEventListener('click', () => { strands = []; cur = null; });

const LOGO_W = 234, LOGO_H = 64;
const CAMERA_PATH = 'M7.5 2.8h9c2.6 0 4.7 2.1 4.7 4.7v9c0 2.6-2.1 4.7-4.7 4.7h-9c-2.6 0-4.7-2.1-4.7-4.7v-9c0-2.6 2.1-4.7 4.7-4.7z M8.2 12a3.8 3.8 0 1 0 7.6 0a3.8 3.8 0 1 0-7.6 0 M17.3 6.7h.1';

function makeSVG(sw) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + LOGO_W + ' ' + LOGO_H + '"><g font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="600" fill="#000"><text x="3" y="46">inst</text><text x="112" y="46">gram</text></g><g fill="none" stroke="#000" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(82 21) scale(1.08)"><path d="' + CAMERA_PATH + '"/></g></svg>';
}

let logoImg, collData, LS, LOX, LOY, LW, LH, ready = false;

function loadImg(svg) {
  return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/svg+xml;base64,' + btoa(svg); });
}

async function buildLogo() {
  logoImg = await loadImg(makeSVG(2.3));
  const ci = await loadImg(makeSVG(2.5));
  LS = W * 0.58 / LOGO_W; LW = LOGO_W * LS; LH = LOGO_H * LS;
  LOX = (W - LW) / 2; LOY = (H - LH) / 2;
  const cc = document.createElement('canvas'); cc.width = W; cc.height = H;
  const cx = cc.getContext('2d'); cx.drawImage(ci, LOX, LOY, LW, LH);
  collData = cx.getImageData(0, 0, W, H).data; ready = true;
}

function hit(x, y) {
  if (!ready) return false;
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return false;
  return collData[(iy * W + ix) * 4 + 3] > 30;
}

const resize = () => { W = C.width = innerWidth; H = C.height = innerHeight; buildLogo(); };
resize(); addEventListener('resize', resize);

function rv(id) { return +document.getElementById(id).value; }

class Pt {
  constructor(x, y) { this.x = x; this.y = y; this.ox = x; this.oy = y; this.done = false; this.st = 0; }
  update() {
    if (this.done) return;
    const g = rv('r-gravity') / 100 * 0.4;
    let vx = (this.x - this.ox) * 0.97, vy = (this.y - this.oy) * 0.97;
    this.ox = this.x; this.oy = this.y;
    this.x += vx; this.y += vy + g;
    if (hit(this.x, this.y)) {
      if (!hit(this.x, this.oy)) { this.y = this.oy; this.oy = this.y; }
      else if (!hit(this.ox, this.y)) { this.x = this.ox; this.ox = this.x; }
      else { this.x = this.ox; this.y = this.oy; }
      this.ox = this.x; this.oy = this.y; this.st += 4;
    }
    if (this.y > H - 1) { this.y = H - 1; this.oy = this.y; this.st += 4; }
    if (this.y < 0) { this.y = 0; this.oy = 0; this.st += 4; }
    if (this.x < 0) this.x = 0; if (this.x > W) this.x = W;
    if (this.st > 14) this.done = true;
  }
}

class Lk {
  constructor(a, b) { this.a = a; this.b = b; this.l = 2.5; this.broken = false; }
  solve() {
    if (this.broken) return;
    const dx = this.b.x - this.a.x, dy = this.b.y - this.a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || .001;
    if (d > 25) { this.broken = true; return; }
    const f = (this.l - d) / d * 0.25;
    if (!this.a.done) { this.a.x -= dx * f; this.a.y -= dy * f; }
    if (!this.b.done) { this.b.x += dx * f; this.b.y += dy * f; }
  }
}

let strands = [];
const COLS = ['#ff1493', '#00d9a0', '#ffc400', '#00b8ff', '#ff5533', '#b84dff'];
const COLS_L = ['#ff6ec7', '#66ffc8', '#ffe066', '#66d9ff', '#ff9a75', '#d4a0ff'];
let ci = 0;

class Strand {
  constructor(i) { this.pts = []; this.lks = []; this.ci = i; }
  add(x, y, vx, vy) {
    const p = new Pt(x, y); p.ox = x - vx; p.oy = y - vy;
    if (this.pts.length) this.lks.push(new Lk(this.pts[this.pts.length - 1], p));
    this.pts.push(p);
  }
}

let mx = W / 2, my = H * 0.2, spraying = false, cur = null, spT = 0;
let demo = true, demoT = 0;

addEventListener('mousedown', e => {
  if (e.target.closest('#panel,#reset')) return;
  demo = false; spraying = true; spT = 0;
  cur = new Strand(ci++ % COLS.length); strands.push(cur);
});
addEventListener('mouseup', () => { spraying = false; cur = null; });
addEventListener('mousemove', e => {
  if (demo && !e.target.closest('#panel,#reset')) { demo = false; spraying = false; cur = null; }
  mx = e.clientX; my = e.clientY;
});
addEventListener('touchstart', e => {
  if (e.target.closest('#panel,#reset')) return;
  e.preventDefault(); demo = false;
  mx = e.touches[0].clientX; my = e.touches[0].clientY;
  spraying = true; spT = 0;
  cur = new Strand(ci++ % COLS.length); strands.push(cur);
}, { passive: false });
addEventListener('touchmove', e => {
  if (e.target.closest('#panel')) return;
  e.preventDefault(); mx = e.touches[0].clientX; my = e.touches[0].clientY;
}, { passive: false });
addEventListener('touchend', () => { spraying = false; cur = null; });

const CW = 18, CH = 46, NX = 10, NY = -CH / 2 - 3;

function aimAngle(cx, cy) {
  const rawA = Math.atan2(LOY + LH / 2 - cy, LOX + LW / 2 - cx);
  return Math.atan2(Math.sin(rawA) * 0.15, Math.cos(rawA));
}

function tipWorld(cx, cy, rot) {
  return { x: cx + NX * Math.cos(rot) - NY * Math.sin(rot), y: cy + NX * Math.sin(rot) + NY * Math.cos(rot) };
}

function drawCan(ctx, cx, cy) {
  const a = aimAngle(cx, cy);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  const bg = ctx.createLinearGradient(-CW / 2, 0, CW / 2, 0);
  bg.addColorStop(0, '#9a2020'); bg.addColorStop(0.13, '#d43530');
  bg.addColorStop(0.4, '#ee4e48'); bg.addColorStop(0.6, '#e84040');
  bg.addColorStop(0.85, '#d43530'); bg.addColorStop(1, '#8a1818');
  ctx.fillStyle = bg; rr(ctx, -CW / 2, -CH / 2, CW, CH, 4); ctx.fill(); ctx.restore();
  const m = ctx.createLinearGradient(-CW / 2, 0, CW / 2, 0);
  m.addColorStop(0, '#aaa'); m.addColorStop(0.4, '#ddd'); m.addColorStop(1, '#999');
  ctx.fillStyle = m;
  rr(ctx, -CW / 2 + 1, CH / 2 - 3, CW - 2, 3, 1); ctx.fill();
  rr(ctx, -CW / 2 + 1, -CH / 2, CW - 2, 3, 1); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  rr(ctx, -CW / 2 + 2, -5, CW - 4, 12, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = 'bold 4px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SILLY', 0, 1); ctx.fillText('STRING', 0, 5.5);
  ctx.fillStyle = m; rr(ctx, -5, -CH / 2 - 4, 10, 5, 2); ctx.fill();
  ctx.fillStyle = cur ? COLS[cur.ci] : '#d44';
  ctx.beginPath(); ctx.ellipse(0, -CH / 2 - 5, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#bbb'; ctx.beginPath();
  ctx.moveTo(2, -CH / 2 - 3); ctx.lineTo(NX - 1, NY - 1);
  ctx.lineTo(NX - 1, NY + 2); ctx.lineTo(2, -CH / 2 + 1);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(NX, NY, 2, 0, Math.PI * 2); ctx.fill();
  if (spraying && cur) {
    for (let i = 0; i < 3; i++) {
      const d = 1 + Math.random() * 5;
      ctx.fillStyle = COLS[cur.ci]; ctx.globalAlpha = 0.08 + Math.random() * 0.1;
      ctx.beginPath(); ctx.arc(NX + d, NY + (Math.random() - .5) * 3, .3 + Math.random() * .4, 0, Math.PI * 2); ctx.fill();
    } ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function emitFrom(cx, cy) {
  if (!cur) return; spT++;
  const a = aimAngle(cx, cy);
  const tip = tipWorld(cx, cy, a);
  const pressure = 3 + rv('r-pressure') / 100 * 11;
  const curlAmt = rv('r-curl') / 100 * 4;
  const chaos = rv('r-chaos') / 100 * 1.2;
  for (let j = 0; j < 3; j++) {
    const speed = pressure + Math.random() * 2;
    const curl = Math.sin(spT * 0.35 + j * 1.7) * curlAmt;
    const wobble = (Math.random() - 0.5) * (0.15 + chaos);
    const pa = a + Math.PI / 2;
    cur.add(tip.x, tip.y, Math.cos(a + wobble) * speed + Math.cos(pa) * curl, Math.sin(a + wobble) * speed + Math.sin(pa) * curl);
  }
  let tot = 0; for (const s of strands) tot += s.pts.length;
  while (tot > 8000 && strands.length > 1) {
    const o = strands[0]; if (o === cur) break;
    if (o.pts.length) { o.pts.shift(); o.lks.shift(); tot--; } else strands.shift();
  }
}

function drawStrands(ctx) {
  const thick = 0.5 + rv('r-thick') / 100 * 3.5;
  for (const s of strands) {
    if (s.pts.length < 2) continue;
    const pts = s.pts, lks = s.lks, col = COLS[s.ci], colL = COLS_L[s.ci];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      if (i - 1 < lks.length && lks[i - 1].broken) { ctx.moveTo(pts[i].x, pts[i].y); continue; }
      const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
      if (dx * dx + dy * dy > 600) { ctx.moveTo(pts[i].x, pts[i].y); continue; }
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, (pts[i - 1].x + pts[i].x) / 2, (pts[i - 1].y + pts[i].y) / 2);
    }
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 2;
    ctx.strokeStyle = col; ctx.globalAlpha = 0.12; ctx.lineWidth = thick + 2; ctx.stroke(); ctx.restore();
    ctx.strokeStyle = col; ctx.globalAlpha = 0.9; ctx.lineWidth = thick; ctx.stroke();
    ctx.strokeStyle = colL; ctx.globalAlpha = 0.2; ctx.lineWidth = thick * 0.3; ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function tick() {
  demoT++;
  let canX = mx, canY = my;
  if (demo) {
    canX = W * 0.1 + ((Math.sin(demoT * 0.008) + 1) / 2) * W * 0.8;
    canY = H * 0.12 + Math.sin(demoT * 0.03) * 10;
    if (demoT % 2 === 0) {
      if (!cur || cur.pts.length > 150) { cur = new Strand(ci++ % COLS.length); strands.push(cur); }
      spraying = true;
    }
  }
  X.clearRect(0, 0, W, H);
  X.fillStyle = '#f4f1ec'; X.fillRect(0, 0, W, H);
  if (spraying) emitFrom(canX, canY);
  for (const s of strands) {
    for (const p of s.pts) p.update();
    for (let i = 0; i < 2; i++) for (const k of s.lks) k.solve();
  }
  drawStrands(X);
  if (logoImg) X.drawImage(logoImg, LOX, LOY, LW, LH);
  drawCan(X, canX, canY);
  requestAnimationFrame(tick);
}
tick();
