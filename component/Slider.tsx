"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";
import { Metadata } from "next";

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
  beta: number;
  omega2: number;
  alpha2: number;
  vs: number;
  as_: number;
}

interface TableRow extends KinResult {
  theta: number;
}

// ─── Code snippets ────────────────────────────────────────────────────────────

const CODE_JS = `/**
 * Offset Slider-Crank Kinematics
 *
 * Computes:
 * - beta (rod angle)
 * - omega2 (rod angular velocity)
 * - alpha2 (rod angular acceleration)
 * - vs (slider velocity)
 * - as (slider acceleration)
 */

function kinematics(
  r: number,
  l: number,
  e: number,
  omega: number,
  thetaDeg: number,
  alpha: number = 0,
): KinResult {
  const th = (thetaDeg * Math.PI) / 180;
  const sinTh = Math.sin(th);
  const cosTh = Math.cos(th);

  const sinBeta = (e - r * sinTh) / l;

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

  // 1. Rod Angular Velocity - CORRECT ✓
  const omega2 = (-r * omega * cosTh) / (l * cosBeta);

  // 2. Slider Velocity - CORRECT ✓
  const vs = (r * omega * Math.sin(beta - th)) / cosBeta;

  // 3. Rod Angular Acceleration - CORRECTED ✗
  const alpha2 =
    (r * alpha * cosTh -
      r * omega * omega * sinTh -
      l * omega2 * omega2 * sinBeta) /
    (l * cosBeta);

  // 4. Slider Acceleration - CORRECTED ✗
  const term1 = r * alpha * Math.sin(beta - th);
  const term2 = r * omega * omega * Math.cos(beta - th);
  const term3 = l * omega2 * omega2;
  const as_ = (term1 - term2 - term3) / cosBeta;

  return { valid: true, beta, omega2, alpha2, vs, as_ };
}

// Example
console.log(kinematics(40, 120, 20, 10, 60));`;

const CODE_PY = `"""
Offset Slider-Crank Kinematics

Computes:
- beta (rod angle)
- omega2 (rod angular velocity)
- alpha2 (rod angular acceleration)
- vs (slider velocity)
- as_ (slider acceleration)
"""

import math


def kinematics(r, l, e, omega, theta_deg, alpha=0):
    theta = math.radians(theta_deg)

    sin_th = math.sin(theta)
    cos_th = math.cos(theta)

    # ── Step 1: Geometry (constraint) ──
    sin_beta = (e - r * sin_th) / l

    # Check feasibility
    if abs(sin_beta) > 1:
        return invalid()

    beta = math.asin(sin_beta)
    cos_beta = math.cos(beta)

    # ── Step 2: Angular velocity of rod ──
    omega2 = (-r * omega * cos_th) / (l * cos_beta)

    # ── Step 3: Slider velocity ──
    vs = (r * omega * math.sin(beta - theta)) / cos_beta

    # ── Step 4: Angular acceleration of rod ──
    alpha2 = (
        -r * alpha * cos_th
        + r * omega**2 * sin_th
        + l * omega2**2 * math.sin(beta)
    ) / (l * cos_beta)

    # ── Step 5: Slider acceleration ──
    c1 = r * alpha * math.sin(beta - theta) - l * omega2**2
    c2 = r * omega**2 * math.cos(beta - theta)

    as_ = (c1 - c2) / cos_beta

    return {
        "valid": True,
        "beta": beta,
        "omega2": omega2,
        "alpha2": alpha2,
        "vs": vs,
        "as": as_,
    }


def invalid():
    return {
        "valid": False,
        "beta": float("nan"),
        "omega2": float("nan"),
        "alpha2": float("nan"),
        "vs": float("nan"),
        "as": float("nan"),
    }


# Example
print(kinematics(40, 120, 20, 10, 60))`;

const CODE_CPP = `#include<bits/stdc++.h>
using namespace std;
#define int long long
#define float long double


void calculate_kinematics_slider_crank(float r2,float r3,float w2,float theta2){
      const float PI=3.14159265358979323846;
      //convert theta2 into radian for further calculations
      float theta2radian=theta2*PI/180.0;
      cout << "\n--- Theta = " << theta2 << " deg ---" << endl;
      //calculate theta3 based on position analysis
      float sintheta3=-(r2*sin(theta2radian))/r3;
      // Validate if the mechanism can physically exist at this angle
    if(abs(sintheta3)>1.0){
        cout<<setw(12)<<theta2<<" | Mechanism physically invalid (Rod too short)"<<endl;
        return;
    }
    float theta3radian=asin(sintheta3);
    //angular velocity of connecting rod
    float w3=(-r2*w2*cos(theta2radian))/(r3*cos(theta3radian));
    // If a number is incredibly close to zero, just make it exactly 0
    if(abs(w3)<1e-10){
        w3=0.0;
    }
    cout<<setw(12)<<w3<<endl;//<<" rad/s"<<endl;

    float alpha2=0;//assuming constant crank velocity
    //angular acceleration of connecting rod
    float alpha3=((-r2/r3)*(alpha2*cos(theta2radian)-w2*w2*sin(theta2radian))+w3*w3*sin(theta3radian))/(cos(theta3radian));
    if(abs(alpha3)<1e-10){
        alpha3=0.0;
    }
    cout<<setw(12)<<alpha3<<" rad/s^2"<<endl;

    //velocity of the slider
    float vs=(r2*w2*sin(theta3radian-theta2radian))/(cos(theta3radian));
    if(abs(vs)<1e-10){
        vs=0.0;
    }
    cout<<setw(12)<<vs<<" m/s"<<endl;

    //acceleration of slider
    float as=-(r2*alpha2*sin(theta2radian)+r2*(w2*w2)*cos(theta2radian)+r3*alpha3*sin(theta3radian)+r3*(w3*w3)*cos(theta3radian));
    if(abs(as)<1e-10){
        as=0.0;
    }
    cout<<setw(12)<<as<<" m/s^2"<<endl;
    return;
}
signed main(){
    ios::sync_with_stdio(false);
    cin.tie(NULL);
    int t;
    t=1;
    while(t--){
        //taking inputs
        float r2,r3,w2;
        int n;
        //crank length
        cin>>r2;
        //connecting rod length
        cin>>r3;
        //angular velocity of crank
        if (r3<r2){
        cout<<"Warning: Connecting rod is shorter than the crank. Mechanism will lock up!"<<endl;
    }
        cin>>w2;
        //number of crank angles you would like to analyze
        cin>>n;//number of crank angles to analyze
        vector<float>angles(n);
        for(int i=0;i<n;i++){
            cin>>angles[i];//crank angle in degree
        }
        for(int i=0;i<n;i++){
            calculate_kinematics_slider_crank(r2,r3,w2,angles[i]);
        }
    }
    return 0;
}`;

// ─── Kinematics engine ────────────────────────────────────────────────────────
interface KinResult {
  valid: boolean;
  beta: number; // Rod angle (radians)
  omega2: number; // Rod angular velocity (rad/s)
  alpha2: number; // Rod angular acceleration (rad/s^2)
  vs: number; // Slider velocity
  as_: number; // Slider acceleration
}

/**
 * Calculates the kinematics of an offset slider-crank mechanism.
 * * @param r - Crank radius (C++ 'a')
 * @param l - Connecting rod length (C++ 'b')
 * @param e - Offset of the slider (C++ 'e')
 * @param omega - Crank angular velocity (C++ 'vela')
 * @param thetaDeg - Crank angle in degrees (C++ 'theta')
 * @param alpha - Crank angular acceleration. Defaults to 0. (C++ 'acca')
 */
function kinematics(
  r: number,
  l: number,
  e: number,
  omega: number,
  thetaDeg: number,
  alpha: number = 0,
): KinResult {
  const th = (thetaDeg * Math.PI) / 180;
  const sinTh = Math.sin(th);
  const cosTh = Math.cos(th);

  const sinBeta = (e - r * sinTh) / l;

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

  // 1. Rod Angular Velocity - CORRECT ✓
  const omega2 = (-r * omega * cosTh) / (l * cosBeta);

  // 2. Slider Velocity - CORRECT ✓
  const vs = (r * omega * Math.sin(beta - th)) / cosBeta;

  // 3. Rod Angular Acceleration - CORRECTED ✗
  // From PDF eq 4.58: (a*alpha_a*cosθ - a*ω_a²*sinθ - b*ω_b²*sinβ) / (b*cosβ)
  const alpha2 =
    (r * alpha * cosTh -
      r * omega * omega * sinTh -
      l * omega2 * omega2 * sinBeta) /
    (l * cosBeta);

  // 4. Slider Acceleration - CORRECTED ✗
  // From PDF eq 4.57: (a*alpha_a*sin(β-θ) - a*ω_a²*cos(β-θ) - b*ω_b²) / cosβ
  const term1 = r * alpha * Math.sin(beta - th);
  const term2 = r * omega * omega * Math.cos(beta - th);
  const term3 = l * omega2 * omega2;
  const as_ = (term1 - term2 - term3) / cosBeta;

  return { valid: true, beta, omega2, alpha2, vs, as_ };
}

// ─── Chart drawing ───────────────────────────────────────────────────────────

function drawMech(canvas: HTMLCanvasElement, p: Params, dark: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const { r, l, e, theta: thetaDeg } = p;
  const res = kinematics(r, l, e, p.omega, thetaDeg);

  if (!res.valid) return;

  const fg = dark ? "#d1d0c9" : "#2c2c2a";
  const muted = dark ? "#555553" : "#b4b2a9";
  const blue = "#378add";
  const coral = "#d85a30";
  const purple = "#534ab7";

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

  ctx.strokeStyle = muted;
  ctx.lineWidth = 2;
  for (let i = -3; i <= 9; i++) {
    ctx.beginPath();
    ctx.moveTo(ox - r * scale * 0.2 + i * 14, By - sh / 2 - 4);
    ctx.lineTo(ox - r * scale * 0.2 + i * 14 - 7, By - sh / 2 - 11);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox - r * scale * 0.5, By - sh / 2);
  ctx.lineTo(ox + (r + l) * scale * 1.05, By - sh / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox - r * scale * 0.5, By + sh / 2);
  ctx.lineTo(ox + (r + l) * scale * 1.05, By + sh / 2);
  ctx.stroke();

  if (e !== 0) {
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + (r + l) * scale * 1.05, oy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = blue;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(Ax, Ay);
  ctx.stroke();

  ctx.strokeStyle = coral;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(Ax, Ay);
  ctx.lineTo(Bx, By);
  ctx.stroke();

  ctx.fillStyle = dark ? "#1a1a18" : "#fff";
  ctx.strokeStyle = purple;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ox, oy, 8, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = coral;
  ctx.lineWidth = 3;
  ctx.fillStyle = dark ? "#1a1a18" : "#fff";
  ctx.beginPath();
  ctx.arc(Ax, Ay, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = dark ? "#0c447c" : "#e6f1fb";
  ctx.strokeStyle = blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(Bx - sw / 2, By - sh / 2, sw, sh, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = dark ? "#378add" : "#185fa5";
  ctx.beginPath();
  ctx.arc(Bx, By, 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.font = "16px system-ui, sans-serif";
  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.fillText("O", ox + 12, oy - 12);
  ctx.fillStyle = coral;
  ctx.fillText("A", Ax + 10, Ay - 10);
  ctx.fillStyle = blue;
  ctx.fillText("B (slider)", Bx - sw / 2 - 4, By - sh / 2 - 12);
  ctx.fillStyle = fg;
  ctx.fillText(`θ = ${thetaDeg}°`, ox + 16, oy + 24);
  const betaDeg = ((res.beta * 180) / Math.PI).toFixed(1);
  ctx.fillStyle = coral;
  ctx.fillText(`β = ${betaDeg}°`, Ax + 10, Ay + 24);
}

function  drawCurveChart(
  canvas: HTMLCanvasElement,
  p: Params,
  mode: "linVel" | "linAcc" | "angVel" | "angAcc",
  dark: boolean,
  hover: { x: number; y: number } | null
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 40, right: 30, bottom: 60, left: 80 };
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;

  const pts: (number | null)[] = [];

  for (let d = 0; d <= 360; d += 2) {
    const res = kinematics(p.r, p.l, p.e, p.omega, d);
    if (res.valid) {
      if (mode === "linVel") pts.push(res.vs);
      else if (mode === "linAcc") pts.push(res.as_);
      else if (mode === "angVel") pts.push(res.omega2);
      else if (mode === "angAcc") pts.push(res.alpha2);
    } else {
      pts.push(null);
    }
  }

  const validAll = pts.filter((v) => v !== null) as number[];
  if (validAll.length === 0) return;

  const minY = Math.min(...validAll);
  const maxY = Math.max(...validAll);
  const rangeY = maxY - minY || 1;
  const toX = (i: number) => PAD.left + (i / (pts.length - 1)) * CW;
  const toY1 = (v: number) => PAD.top + (1 - (v - minY) / rangeY) * CH;

  const gridColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const tickColor = dark ? "#888780" : "#888780";
  const fg = dark ? "#d1d0c9" : "#2c2c2a";

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (i / 4) * CH;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + CW, y);
    ctx.stroke();
  }

  const zeroY = toY1(0);
  if (zeroY >= PAD.top && zeroY <= PAD.top + CH) {
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, zeroY);
    ctx.lineTo(PAD.left + CW, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawSeries(data: (number | null)[], color: string) {
    if (data.every((v) => v === null)) return;
    if (ctx === null) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
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
  }

  const seriesColor = mode.includes("Vel") ? "#378add" : "#d85a30";
  drawSeries(pts, seriesColor);

  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = tickColor;
  ctx.textAlign = "center";
  for (let d = 0; d <= 360; d += 60) {
    const x = PAD.left + (d / 360) * CW;
    ctx.fillText(`${d}°`, x, PAD.top + CH + 22);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, PAD.top + CH);
    ctx.lineTo(x, PAD.top + CH + 6);
    ctx.stroke();
  }

  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const v = minY + (i / 4) * rangeY;
    const y = PAD.top + (1 - i / 4) * CH;
    ctx.fillText(v.toFixed(1), PAD.left - 10, y + 5);
  }

  ctx.fillStyle = fg;
  ctx.font = "15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("crank angle θ (degrees)", PAD.left + CW / 2, H - 10);

  let labelText = "";
  if (mode === "linVel") labelText = "vₛ  (mm/s)";
  if (mode === "linAcc") labelText = "aₛ  (mm/s²)";
  if (mode === "angVel") labelText = "ω₂  (rad/s)";
  if (mode === "angAcc") labelText = "α₂  (rad/s²)";

  ctx.textAlign = "left";
  ctx.fillStyle = seriesColor;
  ctx.fillRect(PAD.left + 4, PAD.top - 16, 24, 4);
  ctx.fillText(labelText, PAD.left + 36, PAD.top - 10);

  if (hover) {
    const t = (hover.x - PAD.left) / CW;

    if (t < 0 || t > 1) return;

    const idx = Math.round(t * (pts.length - 1));
    const v = pts[idx];

    if (v === null) return;

    const x = toX(idx);
    const y = toY1(v);

    // ── Vertical line ──
    ctx.strokeStyle = dark ? "#aaa" : "#444";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + CH);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Point highlight ──
    ctx.fillStyle = mode.includes("Vel") ? "#378add" : "#d85a30";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();

    // ── Tooltip ──
    const angle = Math.round((idx / (pts.length - 1)) * 360);

    let label = "";
    if (mode === "linVel") label = "vₛ";
    if (mode === "linAcc") label = "aₛ";
    if (mode === "angVel") label = "ω₂";
    if (mode === "angAcc") label = "α₂";

    const boxW = 140;
    const boxH = 44;
    const boxX = Math.min(x + 10, canvas.width - boxW - 5);
    const boxY = PAD.top + 10;

    ctx.fillStyle = dark ? "#000" : "#fff";
    ctx.strokeStyle = dark ? "#444" : "#ccc";

    ctx.beginPath();
    ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = dark ? "#fff" : "#000";
    ctx.font = "11px system-ui";

    ctx.fillText(`θ: ${angle}°`, boxX + 8, boxY + 14);
    ctx.fillText(`${label}: ${v.toFixed(2)}`, boxX + 8, boxY + 30);
  }
}

// ─── Code Modal ───────────────────────────────────────────────────────────────

type LangKey = "js" | "py" | "cpp";

const LANG_LABELS: Record<LangKey, string> = {
  js: "JavaScript",
  py: "Python",
  cpp: "C++",
};

const LANG_CODES: Record<LangKey, string> = {
  js: CODE_JS,
  py: CODE_PY,
  cpp: CODE_CPP,
};

// Minimal syntax-highlight: keywords, comments, strings, numbers
function highlight(code: string, lang: LangKey): string {
  // 1. Escape HTML first
  let s = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const kwMap: Record<LangKey, string[]> = {
    js: [
      "function",
      "const",
      "let",
      "var",
      "return",
      "if",
      "null",
      "Math",
      "true",
      "false",
      "import",
      "from",
      "export",
      "default",
      "interface",
      "type",
    ],
    py: [
      "def",
      "return",
      "if",
      "import",
      "from",
      "None",
      "True",
      "False",
      "class",
      "optional",
      "dataclass",
      "math",
      "Optional",
    ],
    cpp: [
      "double",
      "float",
      "int",
      "const",
      "return",
      "if",
      "struct",
      "void",
      "auto",
      "constexpr",
      "inline",
      "include",
      "std",
      "optional",
      "nullopt",
      "main",
      "namespace",
    ],
  };

  const kws = kwMap[lang];

  // 2. Build a single unified regex to prevent overlapping matches
  const tokenRegex = new RegExp(
    [
      `(\\/\\/[^\\n]*|#[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)`, // $1: Comments
      `("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)`, // $2: Strings
      `(\\b(?:${kws.join("|")})\\b)`, // $3: Keywords
      `(\\b\\d+(?:\\.\\d+)?\\b)`, // $4: Numbers
    ].join("|"),
    "g",
  );

  // 3. Replace all tokens in one pass using capture groups
  s = s.replace(tokenRegex, (match, comment, str, keyword, num) => {
    if (comment) return `<span style="color:#6a9955">${comment}</span>`;
    if (str) return `<span style="color:#ce9178">${str}</span>`;
    if (keyword) return `<span style="color:#569cd6">${keyword}</span>`;
    if (num) return `<span style="color:#b5cea8">${num}</span>`;

    // Fallback (shouldn't be reached if regex is structured correctly, but safe to include)
    return match;
  });

  return s;
}

function CodeModal({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  const [lang, setLang] = useState<LangKey>("js");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(LANG_CODES[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md ${
        dark ? "bg-black/70" : "bg-black/40"
      }`}
    >
      <div
        className={`w-full max-w-[820px] max-h-[90vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl border ${
          dark ? "bg-[#2a2a28] border-white/10" : "bg-white border-black/10"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            dark
              ? "bg-[#222220] border-white/10"
              : "bg-[#eeede8] border-black/10"
          }`}
        >
          <div>
            <div className="font-semibold text-[15px] tracking-tight text-neutral-900 dark:text-neutral-200">
              Four-Bar Linkage — Source Code
            </div>
            <div className="text-xs text-neutral-500 mt-[2px]">
              Displacement · Velocity · Acceleration
            </div>
          </div>

          <button
            onClick={onClose}
            className="border border-neutral-300 dark:border-white/10 rounded-md px-2 py-[2px] text-lg text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            ×
          </button>
        </div>

        {/* Tabs + Copy */}
        <div className="flex items-center justify-between px-4 pt-3 gap-2">
          <div className="flex gap-1.5">
            {(Object.keys(LANG_LABELS) as LangKey[]).map((l) => {
              const active = lang === l;
              return (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-[5px] rounded-md text-sm font-mono border transition ${
                    active && l === "js"
                      ? "border-yellow-500 bg-yellow-100 text-yellow-500 dark:bg-yellow-900/30"
                      : active && l === "py"
                      ? "border-green-500 bg-green-50 text-green-500 dark:bg-green-900/20"
                      : active && l === "cpp"
                      ? "border-blue-500 bg-blue-50 text-blue-500 dark:bg-blue-900/20"
                      : "border-neutral-300 dark:border-white/10 text-neutral-500"
                  }`}
                >
                  {LANG_LABELS[l]}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleCopy}
            className={`px-3 py-[5px] rounded-md text-xs font-medium border transition ${
              copied
                ? "border-green-500 text-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-neutral-300 dark:border-white/10 text-neutral-500"
            }`}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>

        {/* Code Block */}
        <div
          className={`flex-1 overflow-y-auto m-4 rounded-lg border ${
            dark
              ? "bg-[#161614] border-white/10"
              : "bg-[#f3f2ee] border-black/10"
          }`}
        >
          <pre
            className="m-0 p-5 text-[12.5px] leading-[1.65] font-mono overflow-x-auto whitespace-pre text-neutral-800 dark:text-neutral-200"
            dangerouslySetInnerHTML={{
              __html: highlight(LANG_CODES[lang], lang),
            }}
          />
        </div>
      </div>
    </div>
  );
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

  type TabMode = "mech" | "linVel" | "linAcc" | "angVel" | "angAcc";
  const [tab, setTab] = useState<TabMode>("mech");
  const [interval, setInterval] = useState<number>(15);
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [animating, setAnimating] = useState(false);
  const [dark, setDark] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const mechRef = useRef<HTMLCanvasElement>(null);
  const linVelRef = useRef<HTMLCanvasElement>(null);
  const linAccRef = useRef<HTMLCanvasElement>(null);
  const angVelRef = useRef<HTMLCanvasElement>(null);
  const angAccRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTimeout(() => setDark(mq.matches), 10);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (mechRef.current) drawMech(mechRef.current, p, dark);
    if (linVelRef.current) drawCurveChart(linVelRef.current, p, "linVel", dark, hover);
    if (linAccRef.current) drawCurveChart(linAccRef.current, p, "linAcc", dark, hover);
    if (angVelRef.current) drawCurveChart(angVelRef.current, p, "angVel", dark, hover);
    if (angAccRef.current) drawCurveChart(angAccRef.current, p, "angAcc", dark, hover);
  }, [p, dark, tab, hover]);

  useEffect(() => {
    if (!animating) return;
    const step = () => {
      setP((prev) => {
        const nextTheta = (prev.theta + 1) % 360;
        const res = kinematics(prev.r, prev.l, prev.e, prev.omega, nextTheta);
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

  useEffect(() => {
    const rows: TableRow[] = [];
    for (let d = 0; d <= 360; d += interval) {
      const r2 = kinematics(p.r, p.l, p.e, p.omega, d);
      rows.push({ theta: d, ...r2 });
    }
    setTimeout(() => setTableRows(rows), 0);
  }, [p, interval]);

  return (
    <div className={dark ? "dark" : ""}>
      {showCode && <CodeModal onClose={() => setShowCode(false)} dark={dark} />}

      <div className="min-h-screen bg-[#f8f7f3] dark:bg-[#1a1a18] text-[#2c2c2a] dark:text-[#d1d0c9] font-sans px-5 py-8 mx-auto max-w-6xl">
        {/* Home Link */}
        <div className="mb-2">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-medium text-[#378add] hover:text-[#185fa5] transition-colors"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-medium mb-2 mt-0 tracking-tight">
          Slider-Crank Kinematics
        </h1>
        <p className="text-sm text-[#888780] mb-8 mt-0 w-full">
          Crank length a, connecting rod b, offset e, angular velocity ω —
          adjust to analyze both linear and angular kinematics.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* ──────────────── LEFT SIDEBAR ──────────────── */}
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
                    min: 1,
                    max: 1000,
                    step: 1,
                  },
                  {
                    key: "l",
                    label: "Connecting rod b (mm)",
                    min: 1,
                    max: 2000,
                    step: 1,
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
                        if (isNaN(val)) return;
                        val = Math.max(min, Math.min(max, val));
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
                        setP((prev) => ({ ...prev, [key]: val }));
                      }}
                      className="w-[65px] px-2 py-1 rounded-md bg-white dark:bg-[#1a1a18] border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#378add]/50 transition-shadow"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ──────────────── RIGHT AREA ──────────────── */}
          <div className="flex flex-col gap-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "vₛ  slider vel. (mm/s)",
                  val: res.valid ? res.vs.toFixed(2) : "ERR",
                },
                {
                  label: "aₛ  slider acc. (mm/s²)",
                  val: res.valid ? res.as_.toFixed(2) : "ERR",
                },
                {
                  label: "ω₂  rod ang. vel. (rad/s)",
                  val: res.valid ? res.omega2.toFixed(4) : "ERR",
                },
                {
                  label: "α₂  rod ang. acc. (rad/s²)",
                  val: res.valid ? res.alpha2.toFixed(3) : "ERR",
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
                    className={`text-xs mb-1 font-medium ${res.valid ? "text-[#888780]" : "text-[#e24b4a]"}`}
                  >
                    {label}
                  </div>
                  <div
                    className={`text-xl font-semibold tracking-tight ${res.valid ? "text-[#2c2c2a] dark:text-[#d1d0c9]" : "text-[#e24b4a]"}`}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Visualisation panel */}
            <div className="bg-[#f1efe8] dark:bg-[#2a2a28] rounded-xl p-5 shadow-sm border border-black/5 dark:border-white/5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {[
                  { id: "mech", name: "Mechanism" },
                  { id: "linVel", name: "Linear Vel (vₛ)" },
                  { id: "linAcc", name: "Linear Acc (aₛ)" },
                  { id: "angVel", name: "Angular Vel (ω₂)" },
                  { id: "angAcc", name: "Angular Acc (α₂)" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id as TabMode)}
                    className={`px-3 py-1.5 border border-black/10 dark:border-white/10 rounded-lg cursor-pointer text-xs md:text-sm transition-colors ${
                      tab === t.id
                        ? "bg-[#ffffff] dark:bg-[#222220] text-[#2c2c2a] dark:text-[#d1d0c9] font-medium shadow-sm"
                        : "bg-transparent text-[#888780] font-normal hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}

                {/* Code button — visually distinct */}
                <button
                  onClick={() => setShowCode(true)}
                  className="px-3 py-1.5 border border-[#378add]/40 rounded-lg cursor-pointer text-xs md:text-sm transition-colors bg-[#378add]/10 text-[#378add] font-medium hover:bg-[#378add]/20 flex items-center gap-1.5 ml-auto"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  Code
                </button>
              </div>

              <div className="relative w-full rounded-lg overflow-hidden bg-white dark:bg-[#222220] border border-black/5 dark:border-white/5">
                {!res.valid && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#222220]/80 backdrop-blur-[3px] z-10 text-[#e24b4a] font-semibold text-lg text-center px-4">
                    Invalid Configuration <br /> (Mechanism disconnected)
                  </div>
                )}

                <button
                  onClick={() => {
                    if (res.valid) setAnimating((a) => !a);
                  }}
                  disabled={!res.valid}
                  className={`absolute top-4 right-4 px-4 py-1.5 mt-2 sm:mt-0 border border-black/10 dark:border-white/10 rounded-lg text-sm sm:ml-auto transition-colors font-medium backdrop-blur-[3px] ${
                    animating
                      ? "text-[#e24b4a] cursor-pointer bg-[#e24b4a]/10 hover:bg-[#e24b4a]/20"
                      : res.valid
                        ? "text-[#2c2c2a] dark:text-[#d1d0c9] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                        : "text-[#888780] cursor-not-allowed opacity-50"
                  }`}
                >
                  {animating ? "⏹ Stop" : "▶ Animate"}
                </button>

                <canvas
                  ref={mechRef}
                  width={800}
                  height={600}
                  className={`w-full h-auto object-contain ${tab === "mech" ? "block" : "hidden"}`}
                  role="img"
                />
                <canvas
                  ref={linVelRef}
                  width={800}
                  height={600}
                  className={`w-full h-auto object-contain ${tab === "linVel" ? "block" : "hidden"}`}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();

                    const scaleX = e.currentTarget.width / rect.width;
                    const scaleY = e.currentTarget.height / rect.height;

                    setHover({
                      x: (e.clientX - rect.left) * scaleX,
                      y: (e.clientY - rect.top) * scaleY,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                  role="img"
                />
                <canvas
                  ref={linAccRef}
                  width={800}
                  height={600}
                  className={`w-full h-auto object-contain ${tab === "linAcc" ? "block" : "hidden"}`}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();

                    const scaleX = e.currentTarget.width / rect.width;
                    const scaleY = e.currentTarget.height / rect.height;

                    setHover({
                      x: (e.clientX - rect.left) * scaleX,
                      y: (e.clientY - rect.top) * scaleY,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                  role="img"
                />
                <canvas
                  ref={angVelRef}
                  width={800}
                  height={600}
                  className={`w-full h-auto object-contain ${tab === "angVel" ? "block" : "hidden"}`}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();

                    const scaleX = e.currentTarget.width / rect.width;
                    const scaleY = e.currentTarget.height / rect.height;

                    setHover({
                      x: (e.clientX - rect.left) * scaleX,
                      y: (e.clientY - rect.top) * scaleY,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                  role="img"
                />
                <canvas
                  ref={angAccRef}
                  width={800}
                  height={600}
                  className={`w-full h-auto object-contain ${tab === "angAcc" ? "block" : "hidden"}`}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();

                    const scaleX = e.currentTarget.width / rect.width;
                    const scaleY = e.currentTarget.height / rect.height;

                    setHover({
                      x: (e.clientX - rect.left) * scaleX,
                      y: (e.clientY - rect.top) * scaleY,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                  role="img"
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-[#ffffff] dark:bg-[#222220] border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
              <div className="flex flex-wrap justify-between items-center px-5 py-4 border-b border-black/10 dark:border-white/10 bg-[#f1efe8]/50 dark:bg-[#2a2a28]/50 gap-3">
                <span className="text-sm font-semibold tracking-wide uppercase text-[#888780]">
                  Computed values — every {interval}°
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 15, 30, 45, 60].map((val) => (
                      <button
                        key={val}
                        onClick={() => setInterval(val)}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                          interval === val
                            ? "bg-[#378add] text-white shadow-sm"
                            : "bg-black/5 dark:bg-white/5 text-[#888780] hover:text-[#2c2c2a] dark:hover:text-[#d1d0c9]"
                        }`}
                      >
                        {val}°
                      </button>
                    ))}
                  </div>
                  <span className="text-black/10 dark:text-white/10 hidden sm:inline-block">
                    |
                  </span>
                  <input
                    type="number"
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                    className="h-fit px-2 py-1 w-16 text-sm accent-[#378add] bg-black/10 dark:bg-white/10 rounded-md appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#378add]/50"
                    min="5"
                    max="360"
                    step={5}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {[
                        "θ (°)",
                        "β (°)",
                        "vₛ (mm/s)",
                        "aₛ (mm/s²)",
                        "ω₂ (rad/s)",
                        "α₂ (rad/s²)",
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
                          {row.valid ? row.vs.toFixed(3) : "Invalid"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid ? row.as_.toFixed(3) : "Invalid"}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Equations */}
            <div className="bg-[#f1efe8] dark:bg-[#2a2a28] rounded-xl p-5 text-[13px] leading-relaxed border border-black/5 dark:border-white/5">
              <div className="font-semibold tracking-wide uppercase text-[#2c2c2a] dark:text-[#d1d0c9] mb-3 text-xs">
                Kinematic equations used
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <span className="font-medium text-black/60 dark:text-neutral-400">
                    Constraint:
                  </span>{" "}
                  <InlineMath math="b \sin \beta = e - a \sin \theta" />
                </div>
                <div>
                  <span className="font-medium text-black/60 dark:text-neutral-400">
                    Rod Ang. Vel (ω₂):
                  </span>{" "}
                  <InlineMath math="\omega_b = \frac{-a \omega_a \cos \theta}{b \cos \beta}" />
                </div>
                <div>
                  <span className="font-medium text-black/60 dark:text-neutral-400">
                    Slider Vel (vₛ):
                  </span>{" "}
                  <InlineMath math="\dot{d} = \frac{a \omega_a \sin(\beta - \theta)}{\cos \beta}" />
                </div>
                <div>
                  <span className="font-medium text-black/60 dark:text-neutral-400">
                    Rod Ang. Acc (α₂):
                  </span>{" "}
                  <InlineMath math="\alpha_b = \frac{a \alpha_a \cos \theta - a \omega_a^2 \sin \theta - b \omega_b^2 \sin \beta}{b \cos \beta}" />
                </div>
                <div>
                  <span className="font-medium text-black/60 dark:text-neutral-400">
                    Slider Acc (aₛ):
                  </span>{" "}
                  <InlineMath math="\ddot{d} = \frac{a \alpha_a \sin(\beta - \theta) - a \omega_a^2 \cos(\beta - \theta) - b \omega_b^2}{\cos \beta}" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
