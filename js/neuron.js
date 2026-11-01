/* MNM Neuron Lab — an interactive Hodgkin–Huxley neuron.
   The membrane voltage is computed with the real Hodgkin–Huxley equations (squid giant axon, 6.3 °C),
   slowed down so you can watch a 2 ms action potential happen. */
(() => {
  const $ = (s) => document.querySelector(s);
  const cell = $("#nl-cell"), plot = $("#nl-plot");
  if (!cell || !plot) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- model ---------- */
  const C = 1, ENa = 50, EK = -77, EL = -54.387, gNaMax = 120, gKMax = 36, gL = 0.3;
  const am = (V) => (Math.abs(V + 40) < 1e-6 ? 1 : (0.1 * (V + 40)) / (1 - Math.exp(-(V + 40) / 10)));
  const bm = (V) => 4 * Math.exp(-(V + 65) / 18);
  const ah = (V) => 0.07 * Math.exp(-(V + 65) / 20);
  const bh = (V) => 1 / (1 + Math.exp(-(V + 35) / 10));
  const an = (V) => (Math.abs(V + 55) < 1e-6 ? 0.1 : (0.01 * (V + 55)) / (1 - Math.exp(-(V + 55) / 10)));
  const bn = (V) => 0.125 * Math.exp(-(V + 65) / 80);
  const st = { V: -65, m: 0, h: 0, n: 0, t: 0 };
  const rest = () => { st.V = -65; st.m = am(-65) / (am(-65) + bm(-65)); st.h = ah(-65) / (ah(-65) + bh(-65)); st.n = an(-65) / (an(-65) + bn(-65)); };
  rest();

  const ui = {
    strength: $("#nl-strength"), strengthOut: $("#nl-strength-out"), hold: $("#nl-hold"),
    myelin: $("#nl-myelin"), ttx: $("#nl-ttx"), tea: $("#nl-tea"), speed: $("#nl-speed"),
    v: $("#nl-v"), phase: $("#nl-phase"), gna: $("#nl-gna"), gk: $("#nl-gk"), spikes: $("#nl-spikes"),
  };
  let pulseLeft = 0, spikes = 0, above = false;
  const pulse = () => { pulseLeft = 1; }; // 1 ms current pulse

  function step(dt) {
    const I = (pulseLeft > 0 || ui.hold.checked) ? +ui.strength.value : 0;
    if (pulseLeft > 0) pulseLeft -= dt;
    const V = st.V;
    const gNa = ui.ttx.checked ? 0 : gNaMax * st.m ** 3 * st.h;
    const gK = ui.tea.checked ? 0 : gKMax * st.n ** 4;
    const dV = (I - gNa * (V - ENa) - gK * (V - EK) - gL * (V - EL)) / C;
    st.m += dt * (am(V) * (1 - st.m) - bm(V) * st.m);
    st.h += dt * (ah(V) * (1 - st.h) - bh(V) * st.h);
    st.n += dt * (an(V) * (1 - st.n) - bn(V) * st.n);
    st.V += dt * dV;
    if (!isFinite(st.V)) rest();
    st.V = Math.max(-100, Math.min(60, st.V));
    st.t += dt;
    if (!above && st.V > 0) { above = true; spikes++; sendSignal(); }
    if (above && st.V < -30) above = false;
    return { I, gNa, gK };
  }

  /* ---------- canvas helpers ---------- */
  function fit(cv) {
    const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0); return { g, w: r.width, h: r.height };
  }
  let C1 = fit(cell), C2 = fit(plot);
  addEventListener("resize", () => { C1 = fit(cell); C2 = fit(plot); });
  const col = (v) => { // voltage → colour (blue at rest, mint at threshold, white-pink at peak)
    const t = Math.max(0, Math.min(1, (v + 80) / 120));
    const a = [80, 130, 255], b = [48, 195, 156], c = [255, 140, 200];
    const k = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5, p = t < 0.5 ? a : b, q = t < 0.5 ? b : c;
    return `rgb(${p.map((x, i) => Math.round(x + (q[i] - x) * k)).join(",")})`;
  };

  /* ---------- signals travelling down the axon ---------- */
  const signals = [];
  function sendSignal() { signals.push({ x: 0 }); }

  function drawCell(now) {
    const { g, w, h } = C1; g.clearRect(0, 0, w, h);
    const cy = h * 0.5, sr = Math.min(h * 0.17, 46, w * 0.09), sx = Math.max(w * 0.2, sr * 2.4 + 24), ax0 = sx + sr, ax1 = w - 64;
    const glow = col(st.V);
    // dendrites
    g.lineCap = "round"; g.strokeStyle = "rgba(180,200,255,.45)";
    const dends = [[-1, -.9], [-1.2, -.2], [-1.1, .5], [-.7, 1], [-.4, -1.1]];
    dends.forEach(([dx, dy], i) => {
      g.lineWidth = 5; g.beginPath(); g.moveTo(sx, cy);
      const ex = sx + dx * sr * 2.6, ey = cy + dy * sr * 2.2;
      g.quadraticCurveTo(sx + dx * sr * 1.4, cy + dy * sr * 0.6, ex, ey); g.stroke();
      g.lineWidth = 2.5; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + dx * 22, ey + (dy || .4) * 18 - 10); g.stroke();
      g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + dx * 10, ey + (dy || .4) * 26 + 8); g.stroke();
      if (i === 1) { // stimulating electrode
        g.strokeStyle = "rgba(255,210,122,.9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(ex - 6, ey - 40); g.lineTo(ex, ey - 6); g.stroke();
        g.fillStyle = (pulseLeft > 0 || ui.hold.checked) ? "#ffd27a" : "rgba(255,210,122,.35)"; g.beginPath(); g.arc(ex, ey - 4, 4, 0, 7); g.fill();
        g.strokeStyle = "rgba(180,200,255,.45)";
      }
    });
    // axon
    const myelin = ui.myelin.checked, nodes = 6;
    g.strokeStyle = "rgba(180,200,255,.5)"; g.lineWidth = 7; g.beginPath(); g.moveTo(ax0, cy); g.lineTo(ax1, cy); g.stroke();
    if (myelin) for (let i = 0; i < nodes; i++) {
      const a = ax0 + 18 + (i * (ax1 - ax0 - 18)) / nodes, b = a + (ax1 - ax0 - 18) / nodes - 10;
      g.fillStyle = "rgba(244,246,248,.13)"; g.strokeStyle = "rgba(244,246,248,.35)"; g.lineWidth = 1;
      g.beginPath(); g.roundRect(a, cy - 11, b - a, 22, 11); g.fill(); g.stroke();
    }
    // terminals
    g.strokeStyle = "rgba(180,200,255,.45)"; g.lineWidth = 3;
    [[-.8], [0], [.8]].forEach(([dy]) => { g.beginPath(); g.moveTo(ax1, cy); g.lineTo(ax1 + 36, cy + dy * 34); g.stroke(); g.fillStyle = "rgba(180,200,255,.6)"; g.beginPath(); g.arc(ax1 + 40, cy + dy * 37, 6, 0, 7); g.fill(); });
    // soma (colour = membrane voltage)
    const grad = g.createRadialGradient(sx - sr * .3, cy - sr * .3, 2, sx, cy, sr * 1.6);
    grad.addColorStop(0, glow); grad.addColorStop(1, "rgba(10,26,54,.9)");
    g.fillStyle = grad; g.beginPath(); g.arc(sx, cy, sr, 0, 7); g.fill();
    g.shadowColor = glow; g.shadowBlur = st.V > -40 ? 40 : 12; g.strokeStyle = glow; g.lineWidth = 2; g.stroke(); g.shadowBlur = 0;
    g.fillStyle = "rgba(10,26,54,.85)"; g.beginPath(); g.arc(sx + sr * .15, cy - sr * .1, sr * .32, 0, 7); g.fill(); // nucleus
    // travelling action potentials
    const speed = (myelin ? 0.9 : 0.28) * (reduce ? 3 : 1); // fraction of axon per second
    for (let i = signals.length - 1; i >= 0; i--) {
      const s = signals[i];
      s.x += speed * frameDt;
      let x = s.x;
      if (myelin) { const seg = 1 / nodes; x = Math.min(1, Math.floor(s.x / seg + 0.5) * seg); } // saltatory: the signal jumps from gap to gap
      const px = ax0 + 18 + x * (ax1 - ax0 - 18);
      g.shadowColor = "#ff8cc8"; g.shadowBlur = 24; g.fillStyle = "#ffd1ea";
      g.beginPath(); g.ellipse(px, cy, myelin ? 12 : 22, 9, 0, 0, 7); g.fill(); g.shadowBlur = 0;
      if (s.x > 1) { signals.splice(i, 1); flash = 1; }
    }
    if (flash > 0) { g.fillStyle = `rgba(255,209,234,${flash})`; [[-.8], [0], [.8]].forEach(([dy]) => { g.beginPath(); g.arc(ax1 + 40, cy + dy * 37, 6 + (1 - flash) * 14, 0, 7); g.fill(); }); flash -= frameDt * 2; }
    // labels
    g.fillStyle = "rgba(200,215,240,.7)"; g.font = "600 12px Inter, sans-serif"; g.textAlign = "center";
    g.textAlign = "left"; g.fillText("Dendrites", 8, h - 10); g.textAlign = "center";
    g.fillText("Cell body", sx, cy - sr - 12);
    g.fillText(myelin ? (w < 560 ? "Myelinated axon" : "Myelinated axon (signal jumps between gaps)") : "Axon", (ax0 + ax1) / 2, cy - 22);
    g.textAlign = "right"; g.fillText("Synapses", w - 6, cy + 66); g.textAlign = "center";
  }
  let flash = 0, frameDt = 0.016;

  /* ---------- voltage trace ---------- */
  const WINDOW = 25; // ms on screen
  const trace = [];
  function drawPlot() {
    const { g, w, h } = C2; g.clearRect(0, 0, w, h);
    const L = 58, R = 10, T = 12, B = 26, y = (v) => T + ((50 - v) / 150) * (h - T - B), tMin = st.t - WINDOW;
    const x = (t) => L + ((t - tMin) / WINDOW) * (w - L - R);
    g.font = "11px Inter, sans-serif"; g.fillStyle = "rgba(160,180,210,.75)"; g.textAlign = "right";
    [-100, -55, 0, 50].forEach((v) => {
      g.strokeStyle = v === -55 ? "rgba(255,210,122,.6)" : "rgba(255,255,255,.07)"; g.setLineDash(v === -55 ? [5, 5] : []);
      g.beginPath(); g.moveTo(L, y(v)); g.lineTo(w - R, y(v)); g.stroke(); g.setLineDash([]);
      g.fillText(v + " mV", L - 6, y(v) + 4);
    });
    g.textAlign = "left"; g.fillStyle = "rgba(255,210,122,.85)"; g.fillText("threshold", L + 6, y(-55) - 5);
    g.fillStyle = "rgba(160,180,210,.75)"; g.textAlign = "center"; g.fillText("time (ms) →", (L + w) / 2, h - 6);
    g.lineWidth = 2.2; g.lineJoin = "round";
    for (let i = 1; i < trace.length; i++) {
      const a = trace[i - 1], b = trace[i]; if (a.t < tMin) continue;
      g.strokeStyle = col(b.v); g.beginPath(); g.moveTo(x(a.t), y(a.v)); g.lineTo(x(b.t), y(b.v)); g.stroke();
    }
    // stimulus marks
    g.fillStyle = "#ffd27a";
    trace.forEach((p) => { if (p.i && p.t >= tMin) g.fillRect(x(p.t), h - B + 2, 2, 5); });
  }

  /* ---------- readouts ---------- */
  function phaseOf(V, dV, gK) {
    if (ui.ttx.checked && V < -50) return ["Na⁺ channels blocked", "No action potential can start, however hard you push."];
    if (V > -50 && dV > 0.5) return ["Depolarising", "Na⁺ channels open and sodium rushes in: the inside turns positive."];
    if (V > -50 && dV <= 0.5) return ["Repolarising", "Na⁺ channels close and K⁺ flows out, pulling the voltage back down."];
    if (V < -67) return ["Hyperpolarised", "K⁺ channels are still open: the cell briefly dips below rest. This is the refractory period."];
    if (V > -63) return ["Below threshold", "The cell is charging up. Reach −55 mV and it fires."];
    return ["Resting", "About −65 mV: the inside of the neuron is negative compared with the outside."];
  }
  let lastV = st.V;
  function readouts(g) {
    ui.v.textContent = st.V.toFixed(0);
    ui.v.style.color = col(st.V);
    const [p, d] = phaseOf(st.V, st.V - lastV, g.gK); lastV = st.V;
    ui.phase.querySelector("b").textContent = p; ui.phase.querySelector("span").textContent = d;
    ui.gna.style.width = Math.min(100, (g.gNa / 40) * 100) + "%";
    ui.gk.style.width = Math.min(100, (g.gK / 25) * 100) + "%";
    ui.spikes.textContent = spikes;
  }

  /* ---------- loop ---------- */
  let last = performance.now(), visible = true, raf;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) { last = performance.now(); raf = requestAnimationFrame(loop); } });
  function loop(now) {
    if (!visible) return;
    frameDt = Math.min(0.05, (now - last) / 1000); last = now;
    const simMs = frameDt * +ui.speed.value; // ms of neuron time per real second
    const steps = Math.max(1, Math.round(simMs / 0.01));
    let g;
    for (let i = 0; i < steps; i++) { g = step(0.01); if (i % 4 === 0) trace.push({ t: st.t, v: st.V, i: g.I > 0 }); }
    while (trace.length && trace[0].t < st.t - WINDOW - 1) trace.shift();
    drawCell(now); drawPlot(); readouts(g);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  /* ---------- controls ---------- */
  $("#nl-fire").addEventListener("click", pulse);
  $("#nl-reset").addEventListener("click", () => { rest(); trace.length = 0; signals.length = 0; spikes = 0; ui.hold.checked = false; ui.ttx.checked = false; ui.tea.checked = false; });
  const showStrength = () => (ui.strengthOut.textContent = (+ui.strength.value).toFixed(0) + " µA/cm²");
  ui.strength.addEventListener("input", showStrength); showStrength();
  addEventListener("keydown", (e) => { if (e.code === "Space" && !e.target.closest("input,select,textarea,button,a")) { e.preventDefault(); pulse(); } });
  cell.addEventListener("click", pulse);

  /* guided experiments */
  document.querySelectorAll("[data-exp]").forEach((b) => b.addEventListener("click", () => {
    const e = b.dataset.exp;
    rest(); trace.length = 0; signals.length = 0; ui.ttx.checked = ui.tea.checked = ui.hold.checked = false; ui.myelin.checked = true;
    if (e === "weak") { ui.strength.value = 4; pulse(); }
    if (e === "strong") { ui.strength.value = 15; pulse(); }
    if (e === "train") { ui.strength.value = 10; ui.hold.checked = true; }
    if (e === "ttx") { ui.strength.value = 20; ui.ttx.checked = true; pulse(); }
    if (e === "tea") { ui.strength.value = 15; ui.tea.checked = true; pulse(); }
    if (e === "myelin") { ui.strength.value = 15; ui.myelin.checked = false; pulse(); }
    showStrength();
    document.querySelectorAll("[data-exp]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    $("#nl-lab").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }));
})();
