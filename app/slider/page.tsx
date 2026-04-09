"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Params {
  r: number; // crank (a)
  l: number; // connecting rod (b)
  e: number; // eccentricity (offset)
  omega: number; // angular velocity of crank
  theta: number; // crank angle
}

interface KinResult {
  valid: boolean;
  beta: number; // angle of the connecting rod
  omega2: number; // angular velocity of connecting rod
  alpha2: number; // angular acceleration of connecting rod
  vs: number; // slider velocity
  as_: number; // slider acceleration
}

interface TableRow extends KinResult {
  theta: number;
}

// ─── Kinematics engine ────────────────────────────────────────────────────────

function kinematics(
  r: number,
  l: number,
  e: number,
  omega: number,
  thetaDeg: number,
): KinResult {
  const th = (thetaDeg * Math.PI) / 180;
  const sinTh = Math.sin(th);
  const cosTh = Math.cos(th);

  // Based on the document: b * sin(beta) = e - a * sin(theta)
  const sinBeta = (e - r * sinTh) / l;

  // Validation: If the sine is outside [-1, 1], the configuration is physically impossible.
  if (Math.abs(sinBeta) > 1) {
    return {
      valid: false,
      beta: NaN,
      omega2: NaN,
      alpha2: NaN,
      vs: NaN,
      as_: NaN,
    };
  }

  const beta = Math.asin(sinBeta);
  const cosBeta = Math.cos(beta);

  // Angular velocity of the coupler (Eq 4.54)
  const omega2 = (-r * omega * cosTh) / (l * cosBeta);

  // Linear velocity of the slider (Eq 4.53)
  const vs = (r * omega * Math.sin(beta - th)) / cosBeta;

  // Assuming constant input angular velocity (alpha_a = 0)
  // Linear acceleration of the slider (Eq 4.57)
  const as_ =
    (-r * omega * omega * Math.cos(beta - th) - l * omega2 * omega2) / cosBeta;

  // Angular acceleration of the coupler (Eq 4.58)
  const alpha2 =
    (-r * omega * omega * sinTh - l * omega2 * omega2 * sinBeta) /
    (l * cosBeta);

  return { valid: true, beta, omega2, alpha2, vs, as_ };
}

// ─── Chart drawing (pure Canvas, no deps) ────────────────────────────────────

function drawMech(canvas: HTMLCanvasElement, p: Params, dark: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const { r, l, e, theta: thetaDeg } = p;
  const res = kinematics(r, l, e, p.omega, thetaDeg);

  if (!res.valid) return; // Managed by React overlay instead

  const fg = dark ? "#d1d0c9" : "#2c2c2a";
  const muted = dark ? "#555553" : "#b4b2a9";
  const blue = "#378add";
  const coral = "#d85a30";
  const purple = "#534ab7";

  // Fit mechanism safely within canvas
  const maxReach = Math.max(r + l, Math.abs(r - l)) + Math.abs(e);
  const scale = Math.min((W * 0.4) / maxReach, (H * 0.4) / (r + Math.abs(e)));

  const ox = W * 0.3;
  const oy = H * 0.52;
  const th = (thetaDeg * Math.PI) / 180;

  const Ax = ox + r * scale * Math.cos(th);
  const Ay = oy - r * scale * Math.sin(th);

  const Bx = Ax + l * scale * Math.cos(res.beta);
  const By = oy - e * scale;

  const sw = r * scale * 0.7;
  const sh = r * scale * 0.5;

  // hatch guide rails
  ctx.strokeStyle = muted;
  ctx.lineWidth = 1;
  for (let i = -3; i <= 9; i++) {
    ctx.beginPath();
    ctx.moveTo(ox - r * scale * 0.2 + i * 14, By - sh / 2 - 4);
    ctx.lineTo(ox - r * scale * 0.2 + i * 14 - 7, By - sh / 2 - 11);
    ctx.stroke();
  }
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ox - r * scale * 0.5, By - sh / 2);
  ctx.lineTo(ox + (r + l) * scale * 1.05, By - sh / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox - r * scale * 0.5, By + sh / 2);
  ctx.lineTo(ox + (r + l) * scale * 1.05, By + sh / 2);
  ctx.stroke();

  // Reference line for offset (e)
  if (e !== 0) {
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + (r + l) * scale * 1.05, oy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // crank arm
  ctx.strokeStyle = blue;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(Ax, Ay);
  ctx.stroke();

  // connecting rod
  ctx.strokeStyle = coral;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Ax, Ay);
  ctx.lineTo(Bx, By);
  ctx.stroke();

  // crank center pivot
  ctx.fillStyle = dark ? "#1a1a18" : "#fff";
  ctx.strokeStyle = purple;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(ox, oy, 7, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  // crank-pin joint A
  ctx.strokeStyle = coral;
  ctx.lineWidth = 2;
  ctx.fillStyle = dark ? "#1a1a18" : "#fff";
  ctx.beginPath();
  ctx.arc(Ax, Ay, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  // slider body
  ctx.fillStyle = dark ? "#0c447c" : "#e6f1fb";
  ctx.strokeStyle = blue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(Bx - sw / 2, By - sh / 2, sw, sh, 4);
  ctx.fill();
  ctx.stroke();

  // slider pin B
  ctx.fillStyle = dark ? "#378add" : "#185fa5";
  ctx.beginPath();
  ctx.arc(Bx, By, 4, 0, 2 * Math.PI);
  ctx.fill();

  // labels
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.fillText("O", ox + 10, oy - 10);
  ctx.fillStyle = coral;
  ctx.fillText("A", Ax + 8, Ay - 8);
  ctx.fillStyle = blue;
  ctx.fillText("B (slider)", Bx - sw / 2 - 4, By - sh / 2 - 8);
  ctx.fillStyle = fg;
  ctx.fillText(`θ = ${thetaDeg}°`, ox + 14, oy + 18);
  const betaDeg = ((res.beta * 180) / Math.PI).toFixed(1);
  ctx.fillStyle = coral;
  ctx.fillText(`β = ${betaDeg}°`, Ax + 8, Ay + 18);
}

function drawCurveChart(
  canvas: HTMLCanvasElement,
  p: Params,
  mode: "vel" | "acc",
  dark: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 24, right: 24, bottom: 40, left: 64 };
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;

  // build data
  const pts1: (number | null)[] = [];
  const pts2: (number | null)[] = [];

  for (let d = 0; d <= 360; d += 2) {
    const res = kinematics(p.r, p.l, p.e, p.omega, d);
    if (res.valid) {
      pts1.push(mode === "vel" ? res.vs : res.as_);
      pts2.push(mode === "vel" ? res.omega2 : res.alpha2);
    } else {
      pts1.push(null);
      pts2.push(null);
    }
  }

  const validAll = [...pts1, ...pts2].filter((v) => v !== null) as number[];
  if (validAll.length === 0) return; // Entirely invalid configuration

  const minY = Math.min(...validAll);
  const maxY = Math.max(...validAll);
  const rangeY = maxY - minY || 1;
  const toX = (i: number) => PAD.left + (i / (pts1.length - 1)) * CW;
  const toY1 = (v: number) => PAD.top + (1 - (v - minY) / rangeY) * CH;

  const gridColor = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const tickColor = dark ? "#888780" : "#888780";
  const fg = dark ? "#d1d0c9" : "#2c2c2a";

  // grid lines (5 horizontal)
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (i / 4) * CH;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + CW, y);
    ctx.stroke();
  }

  // zero line
  const zeroY = toY1(0);
  if (zeroY >= PAD.top && zeroY <= PAD.top + CH) {
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, zeroY);
    ctx.lineTo(PAD.left + CW, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // draw series helper with null gap handling
  function drawSeries(data: (number | null)[], color: string, dash: number[]) {
    if (data.every((v) => v === null)) return; // Skip if all values are invalid
    if (ctx === null) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(dash);
    ctx.beginPath();
    let drawing = false;

    data.forEach((v, i) => {
      const x = toX(i);
      if (v === null) {
        drawing = false;
      } else {
        const y = toY1(v);
        if (!drawing) {
          ctx.moveTo(x, y);
          drawing = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawSeries(pts1, "#378add", []);
  drawSeries(pts2, "#d85a30", [6, 3]);

  // x-axis ticks + labels
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = tickColor;
  ctx.textAlign = "center";
  for (let d = 0; d <= 360; d += 60) {
    const x = PAD.left + (d / 360) * CW;
    ctx.fillText(`${d}°`, x, PAD.top + CH + 16);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, PAD.top + CH);
    ctx.lineTo(x, PAD.top + CH + 4);
    ctx.stroke();
  }

  // y-axis ticks
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const v = minY + (i / 4) * rangeY;
    const y = PAD.top + (1 - i / 4) * CH;
    ctx.fillText(v.toFixed(1), PAD.left - 6, y + 4);
  }

  // axis labels
  ctx.fillStyle = fg;
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("crank angle θ (degrees)", PAD.left + CW / 2, H - 4);

  // legend
  const l1 = mode === "vel" ? "vₛ  (mm/s)" : "aₛ  (mm/s²)";
  const l2 = mode === "vel" ? "ω₂ (rad/s)" : "α₂ (rad/s²)";
  ctx.textAlign = "left";
  ctx.fillStyle = "#378add";
  ctx.fillRect(PAD.left + 4, PAD.top + 4, 18, 3);
  ctx.fillText(l1, PAD.left + 28, PAD.top + 12);
  ctx.fillStyle = "#d85a30";
  ctx.fillRect(PAD.left + 4, PAD.top + 20, 18, 3);
  ctx.fillText(l2, PAD.left + 28, PAD.top + 28);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SliderCrankPage() {
  const [p, setP] = useState<Params>({
    r: 50,
    l: 150,
    e: 0,
    omega: 10,
    theta: 0,
  });
  const [tab, setTab] = useState<"mech" | "vel" | "acc">("mech");
  const [animating, setAnimating] = useState(false);
  const [dark, setDark] = useState(false);

  const mechRef = useRef<HTMLCanvasElement>(null);
  const velRef = useRef<HTMLCanvasElement>(null);
  const accRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  // detect dark mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTimeout(() => {
      setDark(mq.matches);
    }, 10);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // redraw on param / tab / dark change
  useEffect(() => {
    if (mechRef.current) drawMech(mechRef.current, p, dark);
    if (velRef.current) drawCurveChart(velRef.current, p, "vel", dark);
    if (accRef.current) drawCurveChart(accRef.current, p, "acc", dark);
  }, [p, dark, tab]);

  // animation loop
  useEffect(() => {
    if (!animating) return;
    const step = () => {
      setP((prev) => {
        const nextTheta = (prev.theta + 1) % 360;
        const res = kinematics(prev.r, prev.l, prev.e, prev.omega, nextTheta);

        // Auto pause on collision/invalid state
        if (!res.valid) {
          setAnimating(false);
          return prev;
        }
        return { ...prev, theta: nextTheta };
      });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animating]);

  const res = kinematics(p.r, p.l, p.e, p.omega, p.theta);

  // table data: every 15°
  const tableRows: TableRow[] = [];
  for (let d = 0; d <= 360; d += 15) {
    const r2 = kinematics(p.r, p.l, p.e, p.omega, d);
    tableRows.push({ theta: d, ...r2 });
  }

  const setField = useCallback(
    (key: keyof Params) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setP((prev) => ({ ...prev, [key]: Number(e.target.value) }));
    },
    [],
  );

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-[#f8f7f3] dark:bg-[#1a1a18] text-[#2c2c2a] dark:text-[#d1d0c9] font-sans px-5 py-8 mx-auto max-w-6xl">
        {/* Header */}
        <h1 className="text-3xl font-medium mb-2 mt-0 tracking-tight">
          Slider-Crank Kinematics
        </h1>
        <p className="text-sm text-[#888780] mb-8 mt-0 max-w-2xl">
          Crank length a, connecting rod b, offset e, angular velocity ω —
          adjust to analyze the mechanism&apos;s real-time motion and outputs.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* ──────────────── LEFT SIDEBAR: INPUTS ──────────────── */}
          <div className="bg-[#f1efe8] dark:bg-[#2a2a28] rounded-xl p-5 lg:sticky lg:top-6 shadow-sm border border-black/5 dark:border-white/5">
            <div className="text-sm font-semibold mb-4 uppercase tracking-wider text-[#888780]">
              Parameters
            </div>

            <div className="flex flex-col gap-5">
              {(
                [
                  {
                    key: "r",
                    label: "Crank length a (mm)",
                    min: 10,
                    max: p.l,
                    step: 1,
                  },
                  {
                    key: "l",
                    label: "Connecting rod b (mm)",
                    min: 50,
                    max: 500,
                    step: 5,
                  },
                  {
                    key: "e",
                    label: "Eccentricity e (mm)",
                    min: -100,
                    max: 100,
                    step: 1,
                  },
                  {
                    key: "omega",
                    label: "Angular velocity ω (rad/s)",
                    min: 1,
                    max: 100,
                    step: 1,
                  },
                  {
                    key: "theta",
                    label: "Crank angle θ (deg)",
                    min: 0,
                    max: 359,
                    step: 1,
                  },
                ] as const
              ).map(({ key, label, min, max, step }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#888780] flex justify-between items-center">
                    <span>{label}</span>
                    <span className="font-medium text-[#2c2c2a] dark:text-[#d1d0c9]">
                      {p[key]}
                    </span>
                  </label>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={p[key]}
                      onChange={(e) => {
                        let val = Number(e.target.value);
                        if (key === "r" && val > p.l) val = p.l;
                        if (key === "l" && val < p.r) val = p.r;
                        setP((prev) => ({ ...prev, [key]: val }));
                      }}
                      className="flex-1 accent-[#378add] h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />

                    <input
                      type="number"
                      value={p[key]}
                      step={step}
                      min={min}
                      max={max}
                      onChange={(e) => {
                        let val = Number(e.target.value);
                        if (isNaN(val)) return;
                        val = Math.max(min, Math.min(max, val));
                        if (key === "r" && val > p.l) val = p.l;
                        if (key === "l" && val < p.r) val = p.r;
                        setP((prev) => ({ ...prev, [key]: val }));
                      }}
                      className="w-[65px] px-2 py-1 rounded-md bg-white dark:bg-[#1a1a18] border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#378add]/50 transition-shadow"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ──────────────── RIGHT AREA: RESULTS & VISUALS ──────────────── */}
          <div className="flex flex-col gap-6">
            {/* Results metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "ω₂  rod ang. vel. (rad/s)",
                  val: res.valid ? res.omega2.toFixed(4) : "ERR",
                },
                {
                  label: "α₂  rod ang. accel. (rad/s²)",
                  val: res.valid ? res.alpha2.toFixed(3) : "ERR",
                },
                {
                  label: "vₛ  slider vel. (mm/s)",
                  val: res.valid ? res.vs.toFixed(2) : "ERR",
                },
                {
                  label: "aₛ  slider acc. (mm/s²)",
                  val: res.valid ? res.as_.toFixed(2) : "ERR",
                },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className={`rounded-xl p-4 transition-colors duration-200 border border-black/5 dark:border-white/5 ${
                    res.valid
                      ? "bg-[#f1efe8] dark:bg-[#2a2a28]"
                      : "bg-[#e24b4a]/10 dark:bg-[#e24b4a]/20"
                  }`}
                >
                  <div
                    className={`text-xs mb-1 font-medium ${
                      res.valid ? "text-[#888780]" : "text-[#e24b4a]"
                    }`}
                  >
                    {label}
                  </div>
                  <div
                    className={`text-xl font-semibold tracking-tight ${
                      res.valid
                        ? "text-[#2c2c2a] dark:text-[#d1d0c9]"
                        : "text-[#e24b4a]"
                    }`}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Canvas panel */}
            <div className="bg-[#f1efe8] dark:bg-[#2a2a28] rounded-xl p-5 shadow-sm border border-black/5 dark:border-white/5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {(["mech", "vel", "acc"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-1.5 border border-black/10 dark:border-white/10 rounded-lg cursor-pointer text-sm transition-colors ${
                      tab === t
                        ? "bg-[#ffffff] dark:bg-[#222220] text-[#2c2c2a] dark:text-[#d1d0c9] font-medium shadow-sm"
                        : "bg-transparent text-[#888780] font-normal hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {t === "mech"
                      ? "Mechanism"
                      : t === "vel"
                        ? "Velocity"
                        : "Acceleration"}
                  </button>
                ))}

                <button
                  onClick={() => {
                    if (res.valid) setAnimating((a) => !a);
                  }}
                  disabled={!res.valid}
                  className={`px-4 py-1.5 border border-black/10 dark:border-white/10 rounded-lg text-sm bg-transparent sm:ml-auto transition-colors font-medium ${
                    animating
                      ? "text-[#e24b4a] cursor-pointer bg-[#e24b4a]/10"
                      : res.valid
                        ? "text-[#2c2c2a] dark:text-[#d1d0c9] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                        : "text-[#888780] cursor-not-allowed opacity-50"
                  }`}
                >
                  {animating ? "⏹ Stop Animation" : "▶ Animate Rotation"}
                </button>
              </div>

              <div className="relative min-h-[300px] w-full rounded-lg overflow-hidden bg-white dark:bg-[#222220] border border-black/5 dark:border-white/5">
                {!res.valid && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#222220]/80 backdrop-blur-[3px] z-10 text-[#e24b4a] font-semibold text-lg text-center px-4">
                    Invalid Configuration <br /> (Mechanism disconnected)
                  </div>
                )}

                <canvas
                  ref={mechRef}
                  width={840}
                  height={300}
                  className={`w-full h-full object-contain ${tab === "mech" ? "block" : "hidden"}`}
                  role="img"
                />
                <canvas
                  ref={velRef}
                  width={840}
                  height={300}
                  className={`w-full h-full object-contain ${tab === "vel" ? "block" : "hidden"}`}
                  role="img"
                />
                <canvas
                  ref={accRef}
                  width={840}
                  height={300}
                  className={`w-full h-full object-contain ${tab === "acc" ? "block" : "hidden"}`}
                  role="img"
                />
              </div>
            </div>

            {/* Data table */}
            <div className="bg-[#ffffff] dark:bg-[#222220] border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-black/10 dark:border-white/10 bg-[#f1efe8]/50 dark:bg-[#2a2a28]/50">
                <span className="text-sm font-semibold tracking-wide uppercase text-[#888780]">
                  Computed values — every 15°
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-transparent">
                      {[
                        "θ (°)",
                        "β (°)",
                        "ω₂ (rad/s)",
                        "α₂ (rad/s²)",
                        "vₛ (mm/s)",
                        "aₛ (mm/s²)",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-right font-medium text-[#888780] border-b border-black/10 dark:border-white/10 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, i) => (
                      <tr
                        key={row.theta}
                        className={`tabular-nums transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                          i % 2 === 0
                            ? "bg-transparent"
                            : "bg-[#f1efe8]/30 dark:bg-[#2a2a28]/30"
                        } ${row.valid ? "opacity-100" : "opacity-40"}`}
                      >
                        <td
                          className={`px-4 py-2 text-right font-semibold ${row.valid ? "text-[#378add]" : "text-[#e24b4a]"}`}
                        >
                          {row.theta}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid
                            ? ((row.beta * 180) / Math.PI).toFixed(3)
                            : "Invalid"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid ? row.omega2.toFixed(4) : "Invalid"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid ? row.alpha2.toFixed(3) : "Invalid"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid ? row.vs.toFixed(3) : "Invalid"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid ? row.as_.toFixed(3) : "Invalid"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Equations reference */}
            <div className="bg-[#f1efe8] dark:bg-[#2a2a28] rounded-xl p-5 text-[13px] text-[#888780] leading-relaxed border border-black/5 dark:border-white/5">
              <div className="font-semibold tracking-wide uppercase text-[#2c2c2a] dark:text-[#d1d0c9] mb-3 text-xs">
                Kinematic equations used (Analytical Vector Math)
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-2">
                <div>
                  <span className="font-medium text-black/60 dark:text-white/60">
                    Constraint:
                  </span>{" "}
                  <span className="font-mono">b sin β = e − a sin θ</span>
                </div>
                <div>
                  <span className="font-medium text-black/60 dark:text-white/60">
                    Rod ang. vel:
                  </span>{" "}
                  <span className="font-mono">
                    ω_b = (−a ω_a cos θ) / (b cos β)
                  </span>
                </div>
                <div>
                  <span className="font-medium text-black/60 dark:text-white/60">
                    Slider vel:
                  </span>{" "}
                  <span className="font-mono">
                    d_dot = (a ω_a sin(β − θ)) / cos β
                  </span>
                </div>
                <div>
                  <span className="font-medium text-black/60 dark:text-white/60">
                    Rod ang. acc:
                  </span>{" "}
                  <span className="font-mono">
                    α_b = (−a ω_a² sin θ − b ω_b² sin β) / (b cos β)
                  </span>
                </div>
                <div className="">
                  <span className="font-medium text-black/60 dark:text-white/60">
                    Slider acc:
                  </span>{" "}
                  <span className="font-mono">
                    d_ddot = (−a ω_a² cos(β − θ) − b ω_b²) / cos β
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
