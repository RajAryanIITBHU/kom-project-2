"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Params {
  L1: number; // Ground (d)
  L2: number; // Crank (a)
  L3: number; // Coupler (b)
  L4: number; // Output (c)
  omega2: number;
  theta2: number;
}

interface KinResult {
  theta3: number; // beta
  theta4: number; // phi
  omega3: number; // omega_b
  omega4: number; // omega_c
  alpha3: number; // alpha_b
  alpha4: number; // alpha_c
  valid: boolean;
  singularity: boolean;
}

interface TableRow extends KinResult {
  theta2: number;
}

// ─── Four-bar kinematics (Vector Method based on PDF 4.1) ──────────────────

function solveFourBar(
  L1: number,
  L2: number,
  L3: number,
  L4: number,
  omega2: number,
  alpha2: number,
  theta2Deg: number,
  prevTheta4?: number,
): KinResult {
  // Map to PDF variable names for clarity (Section 4.1)
  const a = L2;
  const b = L3;
  const c = L4;
  const d = L1;
  const theta = (theta2Deg * Math.PI) / 180;

  // 1. Displacement Analysis (Eq 4.5, 4.6, 4.7)
  const k = (a * a - b * b + c * c + d * d) / 2;
  const A = k - a * (d - c) * Math.cos(theta) - c * d;
  const B = -2 * a * c * Math.sin(theta);
  const C_coeff = k - a * (d + c) * Math.cos(theta) + c * d;

  let phi = 0; // theta4

  // Handle degenerate linear case when A is approx 0
  if (Math.abs(A) < 1e-9) {
    if (Math.abs(B) < 1e-9) {
      return {
        theta3: 0,
        theta4: 0,
        omega3: 0,
        omega4: 0,
        alpha3: 0,
        alpha4: 0,
        valid: false,
        singularity: false,
      };
    }
    phi = 2 * Math.atan(-C_coeff / B);
  } else {
    const disc = B * B - 4 * A * C_coeff;
    // If discriminant is negative, links cannot physically connect
    if (disc < 0) {
      return {
        theta3: 0,
        theta4: 0,
        omega3: 0,
        omega4: 0,
        alpha3: 0,
        alpha4: 0,
        valid: false,
        singularity: false,
      };
    }

    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-B + sqrtDisc) / (2 * A);
    const t2 = (-B - sqrtDisc) / (2 * A);
    const phi_a = 2 * Math.atan(t1);
    const phi_b = 2 * Math.atan(t2);

    // Assembly branch tracking (maintain continuity)
    if (prevTheta4 !== undefined) {
      const normalize = (ang: number) =>
        Math.atan2(Math.sin(ang), Math.cos(ang));
      const diff_a = Math.abs(normalize(phi_a - prevTheta4));
      const diff_b = Math.abs(normalize(phi_b - prevTheta4));
      phi = diff_a < diff_b ? phi_a : phi_b;
    } else {
      phi = phi_a;
    }
  }

  // Find coupler angle beta (theta3) using exact vector loop closure (Eq 4.1 & 4.3)
  const sinBeta = (c * Math.sin(phi) - a * Math.sin(theta)) / b;
  const cosBeta = (c * Math.cos(phi) - a * Math.cos(theta) + d) / b;
  const beta = Math.atan2(sinBeta, cosBeta);

  // Singularity check: sin(beta - phi) == 0 (links are collinear)
  const sinDiff = Math.sin(beta - phi);
  if (Math.abs(sinDiff) < 1e-7) {
    return {
      theta3: (beta * 180) / Math.PI,
      theta4: (phi * 180) / Math.PI,
      omega3: 0,
      omega4: 0,
      alpha3: 0,
      alpha4: 0,
      valid: true,
      singularity: true,
    };
  }

  // 2. Velocity Analysis (Eq 4.16, 4.17)
  const omega_c = (a * omega2 * Math.sin(beta - theta)) / (c * sinDiff);
  const omega_b = (a * omega2 * Math.sin(phi - theta)) / (b * sinDiff);

  // 3. Acceleration Analysis (Eq 4.22, 4.23)
  const alpha_c =
    (a * alpha2 * Math.sin(beta - theta) -
      a * omega2 * omega2 * Math.cos(beta - theta) -
      b * omega_b * omega_b +
      c * omega_c * omega_c * Math.cos(beta - phi)) /
    (c * sinDiff);

  const alpha_b =
    (a * alpha2 * Math.sin(phi - theta) -
      a * omega2 * omega2 * Math.cos(phi - theta) -
      b * omega_b * omega_b * Math.cos(phi - beta) +
      c * omega_c * omega_c) /
    (b * sinDiff);

  return {
    theta3: (beta * 180) / Math.PI,
    theta4: (phi * 180) / Math.PI,
    omega3: omega_b,
    omega4: omega_c,
    alpha3: alpha_b,
    alpha4: alpha_c,
    valid: true,
    singularity: false,
  };
}

// ─── Canvas helpers ─────────────────────────────────────────────────────────

function drawFourBar(canvas: HTMLCanvasElement, p: Params, dark: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width,
    H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const muted = dark ? "#4a4a48" : "#c8c6bc";
  const blue = "#378add";
  const coral = "#d85a30";
  const teal = "#1d9e75";
  const purple = "#534ab7";

  const res = solveFourBar(p.L1, p.L2, p.L3, p.L4, p.omega2, 0, p.theta2);

  if (!res.valid) return;

  const th2 = (p.theta2 * Math.PI) / 180;
  const th3 = (res.theta3 * Math.PI) / 180;

  const maxLen = Math.max(p.L1 + p.L2, p.L3 + p.L4, p.L1 * 1.5);
  const scale = Math.min((W * 0.6) / maxLen, (H * 0.6) / maxLen);

  const ox = W / 2 - (p.L1 * scale) / 2;
  const oy = H * 0.65;

  const Ax = ox,
    Ay = oy;
  const Dx = ox + p.L1 * scale,
    Dy = oy;
  const Bx = Ax + p.L2 * scale * Math.cos(th2);
  const By = Ay - p.L2 * scale * Math.sin(th2);
  const Cx = Bx + p.L3 * scale * Math.cos(th3);
  const Cy = By - p.L3 * scale * Math.sin(th3);

  // Ground hatching
  ctx.strokeStyle = muted;
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(Ax - 10 + i * 10, Ay + 6);
    ctx.lineTo(Ax - 16 + i * 10, Ay + 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(Dx - 10 + i * 10, Dy + 6);
    ctx.lineTo(Dx - 16 + i * 10, Dy + 14);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Ax - 14, Ay + 6);
  ctx.lineTo(Ax + 14, Ay + 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(Dx - 14, Dy + 6);
  ctx.lineTo(Dx + 14, Dy + 6);
  ctx.stroke();

  // Fixed link (ground)
  ctx.strokeStyle = muted;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(Ax, Ay);
  ctx.lineTo(Dx, Dy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Links
  function drawLink(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: number,
  ) {
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  drawLink(Ax, Ay, Bx, By, blue, 4);
  drawLink(Bx, By, Cx, Cy, coral, 3.5);
  drawLink(Dx, Dy, Cx, Cy, teal, 4);

  // Joints
  function drawJoint(x: number, y: number, color: string, r = 6) {
    if (!ctx) return;
    ctx.fillStyle = dark ? "#1a1a18" : "#fff";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  drawJoint(Ax, Ay, purple, 7);
  drawJoint(Dx, Dy, purple, 7);
  drawJoint(Bx, By, blue, 5);
  drawJoint(Cx, Cy, coral, 5);

  // Labels
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = purple;
  ctx.fillText("A (O₂)", Ax, Ay + 28);
  ctx.fillText("D (O₄)", Dx, Dy + 28);
  ctx.fillStyle = blue;
  ctx.fillText("B", Bx, By - 12);
  ctx.fillStyle = coral;
  ctx.fillText("C", Cx, Cy - 12);
}

function drawCurves(
  canvas: HTMLCanvasElement,
  p: Params,
  mode: "vel" | "acc",
  dark: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width,
    H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 36, right: 20, bottom: 44, left: 66 };
  const CW = W - PAD.left - PAD.right,
    CH = H - PAD.top - PAD.bottom;

  const pts1: (number | null)[] = [];
  const pts2: (number | null)[] = [];
  let prevTh4: number | undefined = undefined;

  for (let d = 0; d <= 360; d += 2) {
    const res = solveFourBar(p.L1, p.L2, p.L3, p.L4, p.omega2, 0, d, prevTh4);
    if (res.valid && !res.singularity) {
      prevTh4 = (res.theta4 * Math.PI) / 180;
      pts1.push(mode === "vel" ? res.omega3 : res.alpha3);
      pts2.push(mode === "vel" ? res.omega4 : res.alpha4);
    } else {
      pts1.push(null);
      pts2.push(null);
    }
  }

  const validAll = [...pts1, ...pts2].filter(
    (v): v is number => v !== null && isFinite(v),
  );
  if (validAll.length === 0) return;

  const minY = Math.min(...validAll);
  const maxY = Math.max(...validAll);
  const rng = maxY - minY || 1;

  const toX = (i: number) => PAD.left + (i / (pts1.length - 1)) * CW;
  const toY = (v: number) => PAD.top + (1 - (v - minY) / rng) * CH;

  const gridColor = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tickColor = dark ? "#888780" : "#888780";
  const fg = dark ? "#d1d0c9" : "#2c2c2a";

  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (i / 4) * CH;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + CW, y);
    ctx.stroke();
    const v = maxY - (i / 4) * rng;
    ctx.fillStyle = tickColor;
    ctx.font = "11px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(v.toFixed(1), PAD.left - 6, y + 4);
  }

  const zeroY = toY(0);
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

  function drawSeries(data: (number | null)[], color: string, dash: number[]) {
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(dash);
    ctx.beginPath();
    let drawing = false;
    data.forEach((v, i) => {
      const x = toX(i);
      if (v === null || !isFinite(v)) {
        drawing = false;
      } else {
        const y = toY(v);
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

  drawSeries(pts1, "#d85a30", []);
  drawSeries(pts2, "#1d9e75", [6, 3]);

  ctx.font = "11px system-ui";
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
  ctx.fillStyle = fg;
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("crank angle θ₂ (degrees)", PAD.left + CW / 2, H - 4);

  const l1 = mode === "vel" ? "ω₃ (rad/s)" : "α₃ (rad/s²)";
  const l2 = mode === "vel" ? "ω₄ (rad/s)" : "α₄ (rad/s²)";

  ctx.textAlign = "left";
  ctx.fillStyle = "#d85a30";
  ctx.fillRect(PAD.left + 4, PAD.top + 4, 18, 3);
  ctx.fillText(l1, PAD.left + 28, PAD.top + 12);
  ctx.fillStyle = "#1d9e75";
  ctx.fillRect(PAD.left + 4, PAD.top + 20, 18, 3);
  ctx.fillText(l2, PAD.left + 28, PAD.top + 28);
}

// ─── Main component ──────────────────────────────────────────────────────────

const PRESETS = [
  { name: "Grashof Crank-Rocker", L1: 100, L2: 40, L3: 120, L4: 80 },
  { name: "Double Crank", L1: 40, L2: 80, L3: 55, L4: 70 },
  { name: "Double Rocker", L1: 120, L2: 60, L3: 80, L4: 50 },
  { name: "Parallelogram", L1: 100, L2: 50, L3: 100, L4: 50 },
];

export default function FourBarPage() {
  const [p, setP] = useState<Params>({
    L1: 100,
    L2: 40,
    L3: 120,
    L4: 80,
    omega2: 10,
    theta2: 45,
  });
  const [tab, setTab] = useState<"mech" | "vel" | "acc">("mech");
  const [animating, setAnimating] = useState(false);
  const [dark, setDark] = useState(false);

  const mechRef = useRef<HTMLCanvasElement>(null);
  const velRef = useRef<HTMLCanvasElement>(null);
  const accRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTimeout(() => {
      setDark(mq.matches);
    }, 10);
    const h = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (mechRef.current) drawFourBar(mechRef.current, p, dark);
    if (velRef.current) drawCurves(velRef.current, p, "vel", dark);
    if (accRef.current) drawCurves(accRef.current, p, "acc", dark);
  }, [p, dark, tab]);

  useEffect(() => {
    if (!animating) return;

    let currentPrevTheta4: number | undefined = undefined;

    const step = () => {
      setP((prev) => {
        const nextTh = (prev.theta2 + 1) % 360;
        const res = solveFourBar(
          prev.L1,
          prev.L2,
          prev.L3,
          prev.L4,
          prev.omega2,
          0,
          nextTh,
          currentPrevTheta4,
        );

        if (!res.valid || res.singularity) {
          setAnimating(false);
          return prev;
        }

        currentPrevTheta4 = (res.theta4 * Math.PI) / 180;
        return { ...prev, theta2: nextTh };
      });
      animRef.current = requestAnimationFrame(step);
    };

    // Seed initial previous angle
    const initialRes = solveFourBar(
      p.L1,
      p.L2,
      p.L3,
      p.L4,
      p.omega2,
      0,
      p.theta2,
    );
    if (initialRes.valid)
      currentPrevTheta4 = (initialRes.theta4 * Math.PI) / 180;

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animating]);

  const res = solveFourBar(p.L1, p.L2, p.L3, p.L4, p.omega2, 0, p.theta2);

  const tableRows: TableRow[] = [];
  let prevTh4: number | undefined = undefined;

  const seedRes = solveFourBar(p.L1, p.L2, p.L3, p.L4, p.omega2, 0, 0);
  if (seedRes.valid) prevTh4 = (seedRes.theta4 * Math.PI) / 180;

  for (let d = 0; d <= 360; d += 15) {
    const r = solveFourBar(p.L1, p.L2, p.L3, p.L4, p.omega2, 0, d, prevTh4);
    if (r.valid) prevTh4 = (r.theta4 * Math.PI) / 180;
    tableRows.push({ theta2: d, ...r });
  }

  // Grashof check
  const links = [p.L1, p.L2, p.L3, p.L4].sort((a, b) => a - b);
  const isGrashof = links[0] + links[3] <= links[1] + links[2];

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-[#f4f3ef] dark:bg-[#111110] text-[#2c2c2a] dark:text-[#d1d0c9] font-sans px-5 py-8 mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-baseline flex-wrap gap-4 mb-2 mt-0">
          <h1 className="text-3xl font-medium tracking-tight m-0">
            Four-Bar Kinematics
          </h1>
          <span
            className={`text-[11px] px-2.5 py-[3px] rounded-full font-medium ${
              isGrashof
                ? "bg-[#e1f5ee] text-[#0f6e56] dark:bg-[#085041] dark:text-[#9fe1cb]"
                : "bg-[#faece7] text-[#993c1d] dark:bg-[#3c2010] dark:text-[#f0997b]"
            }`}
          >
            {isGrashof ? "Grashof" : "Non-Grashof"}
          </span>
        </div>
        <p className="text-sm text-[#888780] mb-6 mt-0 max-w-2xl">
          Links L1 (ground) · L2 (crank) · L3 (coupler) · L4 (follower) — adjust
          to explore the mechanism&apos;s real-time motion and outputs.
        </p>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PRESETS.map((pr) => (
            <button
              key={pr.name}
              onClick={() => setP((prev) => ({ ...prev, ...pr }))}
              className="px-3 py-1 border border-black/10 dark:border-white/10 rounded-full cursor-pointer text-xs bg-transparent text-[#888780] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {pr.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* ──────────────── LEFT SIDEBAR: INPUTS ──────────────── */}
          <div className="bg-[#eeede8] dark:bg-[#242422] rounded-xl p-5 lg:sticky lg:top-6 shadow-sm border border-black/5 dark:border-white/5">
            <div className="text-sm font-semibold mb-4 uppercase tracking-wider text-[#888780]">
              Parameters
            </div>

            <div className="flex flex-col gap-5">
              {(
                [
                  {
                    key: "L1",
                    label: "Fixed link L1 [d] (mm)",
                    min: 10,
                    max: 300,
                    step: 1,
                    color: "#1d9e75",
                  },
                  {
                    key: "L2",
                    label: "Crank L2 [a] (mm)",
                    min: 10,
                    max: 200,
                    step: 1,
                    color: "#1d9e75",
                  },
                  {
                    key: "L3",
                    label: "Coupler L3 [b] (mm)",
                    min: 10,
                    max: 300,
                    step: 1,
                    color: "#1d9e75",
                  },
                  {
                    key: "L4",
                    label: "Follower L4 [c] (mm)",
                    min: 10,
                    max: 300,
                    step: 1,
                    color: "#1d9e75",
                  },
                  {
                    key: "omega2",
                    label: "Crank ω₂ (rad/s)",
                    min: 1,
                    max: 100,
                    step: 1,
                    color: "#1d9e75",
                  },
                  {
                    key: "theta2",
                    label: "Crank angle θ₂ (°)",
                    min: 0,
                    max: 359,
                    step: 1,
                    color: "#1d9e75",
                  },
                ] as const
              ).map(({ key, label, min, max, step, color }) => (
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
                        const val = Number(e.target.value);
                        setP((prev) => ({ ...prev, [key]: val }));
                      }}
                      className="flex-1 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                      style={{accentColor: color}}
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
                        setP((prev) => ({ ...prev, [key]: val }));
                      }}
                      className="w-[65px] px-2 py-1 rounded-md bg-white dark:bg-[#1a1a18] border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/50 transition-shadow"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ──────────────── RIGHT AREA: RESULTS & VISUALS ──────────────── */}
          <div className="flex flex-col gap-6">
            {/* Result metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  label: "θ₃ (°)",
                  val: res.valid ? res.theta3.toFixed(2) : "ERR",
                  color: "text-[#d85a30]",
                },
                {
                  label: "θ₄ (°)",
                  val: res.valid ? res.theta4.toFixed(2) : "ERR",
                  color: "text-[#1d9e75]",
                },
                {
                  label: "ω₃ (rad/s)",
                  val:
                    res.valid && !res.singularity
                      ? res.omega3.toFixed(4)
                      : "ERR",
                  color: "text-[#d85a30]",
                },
                {
                  label: "ω₄ (rad/s)",
                  val:
                    res.valid && !res.singularity
                      ? res.omega4.toFixed(4)
                      : "ERR",
                  color: "text-[#1d9e75]",
                },
                {
                  label: "α₃ (rad/s²)",
                  val:
                    res.valid && !res.singularity
                      ? res.alpha3.toFixed(3)
                      : "ERR",
                  color: "text-[#d85a30]",
                },
                {
                  label: "α₄ (rad/s²)",
                  val:
                    res.valid && !res.singularity
                      ? res.alpha4.toFixed(3)
                      : "ERR",
                  color: "text-[#1d9e75]",
                },
              ].map(({ label, val, color }) => (
                <div
                  key={label}
                  className={`rounded-xl p-4 transition-colors duration-200 border border-black/5 dark:border-white/5 ${
                    !res.valid || res.singularity
                      ? "bg-[#e24b4a]/10 dark:bg-[#e24b4a]/20"
                      : "bg-[#eeede8] dark:bg-[#242422]"
                  }`}
                >
                  <div
                    className={`text-xs mb-1 font-medium ${
                      res.valid && !res.singularity
                        ? "text-[#888780]"
                        : "text-[#e24b4a]"
                    }`}
                  >
                    {label}
                  </div>
                  <div
                    className={`text-xl font-semibold tracking-tight ${
                      res.valid && !res.singularity ? color : "text-[#e24b4a]"
                    }`}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Canvas panel */}
            <div className="bg-[#eeede8] dark:bg-[#242422] rounded-xl p-5 shadow-sm border border-black/5 dark:border-white/5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {(["mech", "vel", "acc"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-1.5 border border-black/10 dark:border-white/10 rounded-lg cursor-pointer text-sm transition-colors ${
                      tab === t
                        ? "bg-[#ffffff] dark:bg-[#1c1c1a] text-[#2c2c2a] dark:text-[#d1d0c9] font-medium shadow-sm"
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
                    if (res.valid && !res.singularity) setAnimating((a) => !a);
                  }}
                  disabled={!res.valid || res.singularity}
                  className={`px-4 py-1.5 border border-black/10 dark:border-white/10 rounded-lg text-sm bg-transparent sm:ml-auto transition-colors font-medium ${
                    animating
                      ? "text-[#e24b4a] cursor-pointer bg-[#e24b4a]/10"
                      : res.valid && !res.singularity
                        ? "text-[#2c2c2a] dark:text-[#d1d0c9] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                        : "text-[#888780] cursor-not-allowed opacity-50"
                  }`}
                >
                  {animating ? "⏹ Stop Animation" : "▶ Animate Rotation"}
                </button>
              </div>

              <div className="relative min-h-[300px] w-full rounded-lg overflow-hidden bg-white dark:bg-[#1a1a18] border border-black/5 dark:border-white/5">
                {(!res.valid || res.singularity) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#1a1a18]/80 backdrop-blur-[3px] z-10 text-[#e24b4a] font-semibold text-lg text-center px-4">
                    {res.singularity
                      ? "Singularity Reached (Dead Center) — Links Collinear"
                      : "Invalid Configuration — Links Cannot Connect"}
                  </div>
                )}

                <canvas
                  ref={mechRef}
                  width={800}
                  height={400}
                  className={`w-full h-full object-contain ${tab === "mech" ? "block" : "hidden"}`}
                  role="img"
                />
                <canvas
                  ref={velRef}
                  width={800}
                  height={400}
                  className={`w-full h-full object-contain ${tab === "vel" ? "block" : "hidden"}`}
                  role="img"
                />
                <canvas
                  ref={accRef}
                  width={800}
                  height={400}
                  className={`w-full h-full object-contain ${tab === "acc" ? "block" : "hidden"}`}
                  role="img"
                />
              </div>
            </div>

            {/* Data table */}
            <div className="bg-[#ffffff] dark:bg-[#1c1c1a] border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-black/10 dark:border-white/10 bg-[#eeede8]/50 dark:bg-[#242422]/50">
                <span className="text-sm font-semibold tracking-wide uppercase text-[#888780]">
                  Computed values — every 15°
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-transparent">
                      {[
                        "θ₂ (°)",
                        "θ₃ (°)",
                        "θ₄ (°)",
                        "ω₃ (rad/s)",
                        "ω₄ (rad/s)",
                        "α₃ (rad/s²)",
                        "α₄ (rad/s²)",
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
                        key={row.theta2}
                        className={`tabular-nums transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                          i % 2 === 0
                            ? "bg-transparent"
                            : "bg-[#eeede8]/30 dark:bg-[#242422]/30"
                        } ${row.valid ? "opacity-100" : "opacity-40"}`}
                      >
                        <td
                          className={`px-4 py-2 text-right font-semibold ${row.valid ? "text-[#378add]" : "text-[#e24b4a]"}`}
                        >
                          {row.theta2}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid ? row.theta3.toFixed(2) : "Invalid"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid ? row.theta4.toFixed(2) : "Invalid"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid || row.singularity ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid && !row.singularity
                            ? row.omega3.toFixed(4)
                            : "Invalid"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid || row.singularity ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid && !row.singularity
                            ? row.omega4.toFixed(4)
                            : "Invalid"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid || row.singularity ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid && !row.singularity
                            ? row.alpha3.toFixed(3)
                            : "Invalid"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid || row.singularity ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid && !row.singularity
                            ? row.alpha4.toFixed(3)
                            : "Invalid"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Equations reference */}
            <div className="bg-[#eeede8] dark:bg-[#242422] rounded-xl p-5 text-[13px] text-[#888780] leading-relaxed border border-black/5 dark:border-white/5">
              <div className="font-semibold tracking-wide uppercase text-[#2c2c2a] dark:text-[#d1d0c9] mb-3 text-xs">
                Analytical Vector Mechanics Used
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-2">
                <div className="">
                  <span className="font-medium text-black/60 dark:text-white/60">
                    Displacement Constraint:
                  </span>{" "}
                  <br />{" "}
                  <span className="font-mono text-[12px]">
                    k = (a² − b² + c² + d²)/2, A = k − a(d − c)cos θ − cd, B =
                    −2ac sin θ, C = k − a(d + c)cos θ + cd
                  </span>{" "}
                  <br />{" "}
                  <span className="font-mono text-[12px]">
                    φ = 2 tan⁻¹((−B ± √(B² − 4AC)) / 2A)
                  </span>
                </div>
                <div>
                  <span className="font-medium text-black/60 dark:text-white/60">
                    Velocity:
                  </span>{" "}
                  <br />{" "}
                  <span className="font-mono text-[12px]">
                    ω_c = a ω_a sin(β − θ) / (c sin(β − φ))
                  </span>{" "}
                  <br />{" "}
                  <span className="font-mono text-[12px]">
                    ω_b = −a ω_a sin(φ − θ) / (b sin(φ − β))
                  </span>
                </div>
                <div>
                  <span className="font-medium text-black/60 dark:text-white/60">
                    Acceleration:
                  </span>{" "}
                  <br />{" "}
                  <span className="font-mono text-[12px]">
                    α_c = [a α_a sin(β − θ) − a ω_a² cos(β − θ) − b ω_b² + c
                    ω_c² cos(β − φ)] / (c sin(β − φ))
                  </span>
                  <br />
                  <span className="font-mono text-[12px]">
                    α_b = [a α_a sin(φ − θ) − a ω_a² cos(φ − θ) − b ω_b² cos(φ −
                    β) + c ω_c²] / (b sin(β − φ))
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
