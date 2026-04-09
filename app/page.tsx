"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────
const BLUE = "#378add";
const CORAL = "#d85a30";
const TEAL = "#1d9e75";
const PURPLE = "#534ab7";

// ─── Mini Animated Canvas Components ────────────────────────────────────────

function MiniSliderCanvas({ dark }: { dark: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const r = 25,
      l = 75,
      e = 0;
    const ox = w * 0.35,
      oy = h * 0.5;

    function draw(deg: number) {
      ctx!.clearRect(0, 0, w, h);
      const th = (deg * Math.PI) / 180;

      const sinBeta = (e - r * Math.sin(th)) / l;
      const beta = Math.asin(sinBeta);

      const Ax = ox + r * Math.cos(th);
      const Ay = oy - r * Math.sin(th);
      const Bx = Ax + l * Math.cos(beta);
      const By = oy - e;

      const sw = 24,
        sh = 16;

      // Guide rail
      ctx!.strokeStyle = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(ox - 10, By - sh / 2);
      ctx!.lineTo(w - 20, By - sh / 2);
      ctx!.moveTo(ox - 10, By + sh / 2);
      ctx!.lineTo(w - 20, By + sh / 2);
      ctx!.stroke();

      // Crank
      ctx!.strokeStyle = BLUE;
      ctx!.lineWidth = 2.5;
      ctx!.beginPath();
      ctx!.moveTo(ox, oy);
      ctx!.lineTo(Ax, Ay);
      ctx!.stroke();

      // Rod
      ctx!.strokeStyle = CORAL;
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(Ax, Ay);
      ctx!.lineTo(Bx, By);
      ctx!.stroke();

      // Slider
      ctx!.fillStyle = dark ? "#0c447c" : "#e6f1fb";
      ctx!.strokeStyle = BLUE;
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      ctx!.roundRect(Bx - sw / 2, By - sh / 2, sw, sh, 2);
      ctx!.fill();
      ctx!.stroke();

      // Joints
      ctx!.fillStyle = dark ? "#1a1a18" : "#fff";
      ctx!.lineWidth = 1.5;

      ctx!.strokeStyle = PURPLE; // ground
      ctx!.beginPath();
      ctx!.arc(ox, oy, 4, 0, 2 * Math.PI);
      ctx!.fill();
      ctx!.stroke();

      ctx!.strokeStyle = CORAL; // A
      ctx!.beginPath();
      ctx!.arc(Ax, Ay, 3, 0, 2 * Math.PI);
      ctx!.fill();
      ctx!.stroke();

      ctx!.fillStyle = BLUE; // B
      ctx!.beginPath();
      ctx!.arc(Bx, By, 2.5, 0, 2 * Math.PI);
      ctx!.fill();
    }

    function loop() {
      angleRef.current = (angleRef.current + 2) % 360;
      draw(angleRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dark]);

  return (
    <canvas
      ref={ref}
      width={300}
      height={140}
      className="block w-full h-full"
    />
  );
}

function MiniFourBarCanvas({ dark }: { dark: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const L1 = 70,
      L2 = 25,
      L3 = 80,
      L4 = 60;
    const ox = w / 2 - L1 / 2,
      oy = h * 0.7;

    function draw(deg: number) {
      ctx!.clearRect(0, 0, w, h);
      const th = (deg * Math.PI) / 180;

      // Basic math for Grashof continuous display
      const K1 = L1 / L2,
        K2 = L1 / L4;
      const K3 = (L2 * L2 - L3 * L3 + L4 * L4 + L1 * L1) / (2 * L2 * L4);
      const A = Math.cos(th) - K1 - K2 * Math.cos(th) + K3;
      const B = -2 * Math.sin(th);
      const C = K1 - (K2 + 1) * Math.cos(th) + K3;

      const disc = B * B - 4 * A * C;
      if (disc < 0) return; // Skip invalid frames

      const th4 = 2 * Math.atan((-B - Math.sqrt(disc)) / (2 * A));

      const K4 = L1 / L3;
      const K5 = (L4 * L4 - L1 * L1 - L2 * L2 - L3 * L3) / (2 * L2 * L3);
      const A3 = Math.cos(th) - K1 + K4 * Math.cos(th) + K5;
      const B3 = -2 * Math.sin(th);
      const C3 = K1 + (K4 - 1) * Math.cos(th) + K5;
      const d3 = B3 * B3 - 4 * A3 * C3;
      if (d3 < 0) return;

      const t3a = (-B3 + Math.sqrt(d3)) / (2 * A3);
      const t3b = (-B3 - Math.sqrt(d3)) / (2 * A3);
      const th3a = 2 * Math.atan(t3a),
        th3b = 2 * Math.atan(t3b);
      const eA = Math.abs(
        L2 * Math.cos(th) + L3 * Math.cos(th3a) - L4 * Math.cos(th4) - L1,
      );
      const th3 =
        eA <
        Math.abs(
          L2 * Math.cos(th) + L3 * Math.cos(th3b) - L4 * Math.cos(th4) - L1,
        )
          ? th3a
          : th3b;

      const Ax = ox,
        Ay = oy;
      const Dx = ox + L1,
        Dy = oy;
      const Bx = Ax + L2 * Math.cos(th),
        By = Ay - L2 * Math.sin(th);
      const Cx = Bx + L3 * Math.cos(th3),
        Cy = By - L3 * Math.sin(th3);

      // Ground link
      ctx!.strokeStyle = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
      ctx!.lineWidth = 1.5;
      ctx!.setLineDash([4, 3]);
      ctx!.beginPath();
      ctx!.moveTo(Ax, Ay);
      ctx!.lineTo(Dx, Dy);
      ctx!.stroke();
      ctx!.setLineDash([]);

      // Links
      ctx!.lineWidth = 2.5;
      ctx!.strokeStyle = BLUE;
      ctx!.beginPath();
      ctx!.moveTo(Ax, Ay);
      ctx!.lineTo(Bx, By);
      ctx!.stroke();
      ctx!.strokeStyle = CORAL;
      ctx!.beginPath();
      ctx!.moveTo(Bx, By);
      ctx!.lineTo(Cx, Cy);
      ctx!.stroke();
      ctx!.strokeStyle = TEAL;
      ctx!.beginPath();
      ctx!.moveTo(Dx, Dy);
      ctx!.lineTo(Cx, Cy);
      ctx!.stroke();

      // Joints
      ctx!.fillStyle = dark ? "#1a1a18" : "#fff";
      ctx!.lineWidth = 1.5;

      ctx!.strokeStyle = PURPLE;
      ctx!.beginPath();
      ctx!.arc(Ax, Ay, 4, 0, 2 * Math.PI);
      ctx!.fill();
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.arc(Dx, Dy, 4, 0, 2 * Math.PI);
      ctx!.fill();
      ctx!.stroke();

      ctx!.strokeStyle = BLUE;
      ctx!.beginPath();
      ctx!.arc(Bx, By, 3, 0, 2 * Math.PI);
      ctx!.fill();
      ctx!.stroke();

      ctx!.strokeStyle = CORAL;
      ctx!.beginPath();
      ctx!.arc(Cx, Cy, 3, 0, 2 * Math.PI);
      ctx!.fill();
      ctx!.stroke();
    }

    function loop() {
      angleRef.current = (angleRef.current + 2) % 360;
      draw(angleRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dark]);

  return (
    <canvas
      ref={ref}
      width={300}
      height={140}
      className="block w-full h-full"
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function KinematicsHome() {
  const [dark, setDark] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTimeout(() => setDark(mq.matches), 10); // Initial check with slight delay for hydration
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f8f7f3] px-5 py-12 font-sans text-[#2c2c2a] dark:bg-[#111110] dark:text-[#d1d0c9]">
      {/* Header section */}
      <div className="mb-12 w-full max-w-150 text-center">
        <h1 className="mb-3 text-3xl font-semibold tracking-tight">
          Kinematics of Machines (Project 2)
        </h1>
        <h2 className="text-xl font-semibold mb-4">Group - 23</h2>
        <div className="flex w-full max-w-md mx-auto text-sm gap-6">
          {/* Left Column */}
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-left">24135029</span>
              <span className="text-left">Aviral Dixit</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-left">24135030</span>
              <span className="text-left">Ayush</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-left">24135031</span>
              <span className="text-left">Ayush Gupta</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-left">24135099</span>
              <span className="text-left">Raj Aryan</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-left">24135100</span>
              <span className="text-left">Rajnish Goat</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-left">24135101</span>
              <span className="text-left">Ridhima Singh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="mb-16 grid w-full max-w-200 grid-cols-1 gap-6 sm:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        {/* Card 1: Slider-Crank */}
        <Link
          href="/slider"
          className="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-black/10 bg-[#ffffff] p-6 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:border-black/20 hover:shadow-xl dark:border-white/10 dark:bg-[#1c1c1a] dark:hover:border-white/20 dark:hover:shadow-black/40"
        >
          <div className="h-35 overflow-hidden rounded-lg border border-black/10 bg-[#f1efe8] dark:border-white/10 dark:bg-[#242422]">
            <MiniSliderCanvas dark={dark} />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#378add]">
              1 Degree of Freedom
            </div>
            <h2 className="mb-2 mt-0 text-lg font-medium">
              Slider-Crank Mechanism
            </h2>
            <p className="m-0 text-[13px] leading-snug text-[#888780]">
              Analyze the stroke, velocity profile, and acceleration limits of a
              slider-crank linkage, including stroke offsets (eccentricity).
            </p>
          </div>
          <div className="mt-auto flex items-center gap-1 pt-2 text-[13px] font-medium text-[#378add]">
            Open Simulator
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>

        {/* Card 2: Four-Bar */}
        <Link
          href="/bar"
          className="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-black/10 bg-[#ffffff] p-6 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:border-black/20 hover:shadow-xl dark:border-white/10 dark:bg-[#1c1c1a] dark:hover:border-white/20 dark:hover:shadow-black/40"
        >
          <div className="h-35 overflow-hidden rounded-lg border border-black/10 bg-[#f1efe8] dark:border-white/10 dark:bg-[#242422]">
            <MiniFourBarCanvas dark={dark} />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#1d9e75]">
              1 Degree of Freedom
            </div>
            <h2 className="mb-2 mt-0 text-lg font-medium">Four-Bar Linkage</h2>
            <p className="m-0 text-[13px] leading-snug text-[#888780]">
              Explore Grashof conditions, structural singularity, and
              vector-loop kinematics for a fully articulated four-bar linkage.
            </p>
          </div>
          <div className="mt-auto flex items-center gap-1 pt-2 text-[13px] font-medium text-[#1d9e75]">
            Open Simulator
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>
      </div>

      {/* Theory Section */}
      <div className="w-full max-w-200">
        <h3 className="mb-6 border-b border-black/10 pb-3 text-xl font-medium dark:border-white/10">
          Core Principles
        </h3>

        <div className="grid grid-cols-1 gap-5">
          {/* Block 1 */}
          <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-[#ffffff] p-6 dark:border-white/10 dark:bg-[#1c1c1a]">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#378add]" />
              <h4 className="m-0 text-[15px] font-medium">
                Analytical Vector Method
              </h4>
            </div>
            <p className="m-0 text-[13px] leading-relaxed text-[#888780]">
              In analytical analysis, mechanism links are modeled as vectors. By
              forming a closed loop equation (e.g., $a + b - c - d = 0$) and
              transforming it into complex rectangular forms, we can
              definitively solve for exact positional angles without continuous
              redrawing.
            </p>
          </div>

          {/* Block 2 */}
          <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-[#ffffff] p-6 dark:border-white/10 dark:bg-[#1c1c1a]">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#1d9e75]" />
              <h4 className="m-0 text-[15px] font-medium">
                Velocity & Acceleration
              </h4>
            </div>
            <p className="m-0 text-[13px] leading-relaxed text-[#888780]">
              Velocities and accelerations are determined by taking the first
              and second time derivatives of the displacement loop equations.
              This yields a set of linear equations that directly compute
              angular velocities ($\omega$) and accelerations ($\alpha$) for the
              coupler and output links.
            </p>
          </div>

          {/* Block 3 */}
          <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-[#ffffff] p-6 dark:border-white/10 dark:bg-[#1c1c1a]">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#d85a30]" />
              <h4 className="m-0 text-[15px] font-medium">
                Coupler Curves & Paths
              </h4>
            </div>
            <p className="m-0 text-[13px] leading-relaxed text-[#888780]">
              A coupler curve is the physical locus of a specific point on the
              connecting rod (coupler). By defining the offset point
              algebraically, we can plot precise trajectory curves used to
              generate complex mechanical motions in manufacturing and robotics.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 flex items-center gap-4 text-xs text-[#888780]">
        <span>Analytical Vector Mathematics</span>
        <span className="h-1 w-1 rounded-full bg-black/10 dark:bg-white/10"></span>
        <span>Freudenstein Constraints</span>
      </div>
    </div>
  );
}
