"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

// ─── Types ─────────────────────────────────────────────────────────────────

// PDF variable mapping:
//   L1 = d  (ground / fixed link AD)
//   L2 = a  (crank AB)
//   L3 = b  (coupler BC)
//   L4 = c  (output / follower CD)
//   theta2 = θ   (crank angle, input)
//   theta3 = β   (coupler angle)
//   theta4 = φ   (output link angle)

type LangKey = "js" | "py" | "cpp";

type TabKey = "mech" | "vel" | "acc";

interface Params {
  L1: number;
  L2: number;
  L3: number;
  L4: number;
  omega2: number;
  theta2: number;
}

interface FourBarResult {
  valid: boolean;
  singularity: boolean;
  theta3: number;
  theta4: number;
  omega3: number;
  omega4: number;
  alpha3: number;
  alpha4: number;
}

// ─── Code snippets ─────────────────────────────────────────────────────────

const CODE_JS = `/**
 * Four-Bar Linkage Solver
 *
 * Computes:
 * - theta3 (coupler angle)
 * - theta4 (output angle)
 * - omega3, omega4 (angular velocities)
 * - alpha3, alpha4 (angular accelerations)
 */

function solveFourBar(L1, L2, L3, L4, omega2, alpha2, theta2Deg, prevTheta4) {
  const a = L2, b = L3, c = L4, d = L1;
  const theta = (theta2Deg * Math.PI) / 180;

  // ── Step 1: Solve output angle φ ──
  const k = (a*a - b*b + c*c + d*d) / 2;

  const A = k - a*(d - c)*Math.cos(theta) - c*d;
  const B = -2 * a * c * Math.sin(theta);
  const C = k - a*(d + c)*Math.cos(theta) + c*d;

  // Degenerate case (A ≈ 0)
  if (Math.abs(A) < 1e-9) {
    if (Math.abs(B) < 1e-9) return invalid();

    const phi = 2 * Math.atan2(-C, B);
    return finalize(a, b, c, d, theta, phi, omega2, alpha2);
  }

  // Discriminant (clamped for numerical stability)
  const disc = Math.max(0, B*B - 4*A*C);
  if (disc < 0) return invalid();

  const sqrtDisc = Math.sqrt(disc);

  const phi1 = 2 * Math.atan((-B + sqrtDisc) / (2*A));
  const phi2 = 2 * Math.atan((-B - sqrtDisc) / (2*A));

  // Choose continuous branch
  let phi;
  if (prevTheta4 !== undefined) {
    const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
    phi = Math.abs(wrap(phi1 - prevTheta4)) <= Math.abs(wrap(phi2 - prevTheta4))
      ? phi1 : phi2;
  } else {
    phi = phi1;
  }

  return finalize(a, b, c, d, theta, phi, omega2, alpha2);
}

function finalize(a, b, c, d, theta, phi, omega2, alpha2) {
  // ── Step 2: Coupler angle β ──
  const sinBeta = (c*Math.sin(phi) - a*Math.sin(theta)) / b;
  const cosBeta = (c*Math.cos(phi) - a*Math.cos(theta) + d) / b;
  const beta = Math.atan2(sinBeta, cosBeta);

  // ── Step 3: Velocity ──
  const sinDiff = Math.sin(beta - phi);

  if (Math.abs(sinDiff) < 1e-7) {
    return {
      valid: true,
      singularity: true,
      theta3: radToDeg(beta),
      theta4: radToDeg(phi),
      omega3: 0,
      omega4: 0,
      alpha3: 0,
      alpha4: 0,
    };
  }

  const omega4 = (a * omega2 * Math.sin(beta - theta)) / (c * sinDiff);
  const omega3 = (a * omega2 * Math.sin(phi - theta)) / (b * sinDiff);

  // ── Step 4: Acceleration ──
  const alpha4 =
    (
      a*alpha2*Math.sin(beta - theta)
      - a*omega2*omega2*Math.cos(beta - theta)
      - b*omega3*omega3
      + c*omega4*omega4*Math.cos(beta - phi)
    ) / (c * sinDiff);

  const alpha3 =
    (
      a*alpha2*Math.sin(phi - theta)
      - a*omega2*omega2*Math.cos(phi - theta)
      - b*omega3*omega3*Math.cos(phi - beta)
      + c*omega4*omega4
    ) / (b * sinDiff);

  return {
    valid: true,
    singularity: false,
    theta3: radToDeg(beta),
    theta4: radToDeg(phi),
    omega3,
    omega4,
    alpha3,
    alpha4,
  };
}

function invalid() {
  return {
    valid: false,
    singularity: false,
    theta3: 0,
    theta4: 0,
    omega3: 0,
    omega4: 0,
    alpha3: 0,
    alpha4: 0,
  };
}

function radToDeg(r) {
  return (r * 180) / Math.PI;
}


// Example
console.log(solveFourBar(100, 50, 66, 56, 10.5, -26, 60));`;

const CODE_PY = `"""
Four-Bar Linkage Solver

Computes:
- theta3, theta4 (angles)
- omega3, omega4 (angular velocities)
- alpha3, alpha4 (angular accelerations)
"""

import math


def solve_four_bar(L1, L2, L3, L4, omega2, alpha2, theta2_deg, prev_theta4=None):
    a, b, c, d = L2, L3, L4, L1
    theta = math.radians(theta2_deg)

    # ── Step 1: Solve output angle φ ──
    k = (a*a - b*b + c*c + d*d) / 2

    A = k - a*(d - c)*math.cos(theta) - c*d
    B = -2 * a * c * math.sin(theta)
    C = k - a*(d + c)*math.cos(theta) + c*d

    # Degenerate case
    if abs(A) < 1e-9:
        if abs(B) < 1e-9:
            return invalid()

        phi = 2 * math.atan2(-C, B)
        return finalize(a, b, c, d, theta, phi, omega2, alpha2)

    disc = max(0, B*B - 4*A*C)
    if disc < 0:
        return invalid()

    sqrt_disc = math.sqrt(disc)

    phi1 = 2 * math.atan((-B + sqrt_disc) / (2*A))
    phi2 = 2 * math.atan((-B - sqrt_disc) / (2*A))

    # Choose continuous branch
    if prev_theta4 is not None:
        def wrap(x):
            return math.atan2(math.sin(x), math.cos(x))
        phi = phi1 if abs(wrap(phi1 - prev_theta4)) <= abs(wrap(phi2 - prev_theta4)) else phi2
    else:
        phi = phi1

    return finalize(a, b, c, d, theta, phi, omega2, alpha2)


def finalize(a, b, c, d, theta, phi, omega2, alpha2):
    # ── Step 2: Coupler angle β ──
    sin_beta = (c*math.sin(phi) - a*math.sin(theta)) / b
    cos_beta = (c*math.cos(phi) - a*math.cos(theta) + d) / b
    beta = math.atan2(sin_beta, cos_beta)

    # ── Step 3: Velocity ──
    sin_diff = math.sin(beta - phi)

    if abs(sin_diff) < 1e-7:
        return {
            "valid": True,
            "singularity": True,
            "theta3": math.degrees(beta),
            "theta4": math.degrees(phi),
            "omega3": 0,
            "omega4": 0,
            "alpha3": 0,
            "alpha4": 0,
        }

    omega4 = (a * omega2 * math.sin(beta - theta)) / (c * sin_diff)
    omega3 = (a * omega2 * math.sin(phi - theta)) / (b * sin_diff)

    # ── Step 4: Acceleration ──
    alpha4 = (
        a*alpha2*math.sin(beta - theta)
        - a*omega2**2*math.cos(beta - theta)
        - b*omega3**2
        + c*omega4**2*math.cos(phi - beta)
    ) / (c * sin_diff)

    alpha3 = (
        a*alpha2*math.sin(phi - theta)
        - a*omega2**2*math.cos(phi - theta)
        - b*omega3**2*math.cos(phi - beta)
        + c*omega4**2
    ) / (b * sin_diff)

    return {
        "valid": True,
        "singularity": False,
        "theta3": math.degrees(beta),
        "theta4": math.degrees(phi),
        "omega3": omega3,
        "omega4": omega4,
        "alpha3": alpha3,
        "alpha4": alpha4,
    }


def invalid():
    return {
        "valid": False,
        "singularity": False,
        "theta3": 0,
        "theta4": 0,
        "omega3": 0,
        "omega4": 0,
        "alpha3": 0,
        "alpha4": 0,
    }


# Example
print(solve_four_bar(100, 50, 66, 56, 10.5, -26, 60))`;

const CODE_CPP = `#include<bits/stdc++.h>
using namespace std;
#define int long long
#define float long double

void calculate_kinematics_four_bar(float r1,float r2,float r3,float r4,float w2,float theta2){
      const float PI=3.14159265358979323846;
      float theta2radian=theta2*PI/180.0;
      // Freudenstein's equation
      float A=2.0*r4*(r1-r2*cos(theta2radian));
      float B=-2.0*r2*r4*sin(theta2radian);
      float C=r1*r1+r2*r2+r4*r4-r3*r3-2.0*r1*r2*cos(theta2radian);
      float discriminant=B*B-C*C+A*A;
      // Validate if the mechanism can physically exist at this specific angle
      if(discriminant<0){
          cout<<theta2 << ",,,, " <<endl;//Blank for Excel graph break
          return;
      }
      float theta4radian=2.0*atan((-B-sqrt(discriminant))/(C-A));
      float sintheta3=(r4*sin(theta4radian)-r2*sin(theta2radian))/r3;
      float costheta3=(r1+r4*cos(theta4radian)-r2*cos(theta2radian))/r3;
      float theta3radian=atan2(sintheta3,costheta3);
      if(sin(theta4radian-theta3radian)==0){
          cout<<theta2<<",,,,"<< endl;//Blank for singularity
          return;
      }
      // Angular velocity of coupler
      float w3=(-r2*w2*sin(theta2radian-theta4radian))/(r3*sin(theta3radian-theta4radian));
      if(abs(w3)<1e-10){
        w3=0.0;
      }
      cout<<setw(12)<<w3<<endl;//<<" rad/s"<<endl;

      // Angular velocity of rocker
      float w4=(r2*w2*sin(theta2radian-theta3radian))/(r4*sin(theta4radian-theta3radian));
      if(abs(w4)<1e-10){
        w4=0.0;
      }
      cout<<setw(12)<<w4<<endl;//<<" rad/s"<<endl;

      float alpha2=0;//Assuming constant crank velocity
      
      float A_c=alpha2*r2*sin(theta2radian)+w2*w2*r2*cos(theta2radian)+w3*w3*r3*cos(theta3radian)-w4*w4*r4*cos(theta4radian);
      float B_c=-alpha2*r2*cos(theta2radian)+w2*w2*r2*sin(theta2radian)+w3*w3*r3*sin(theta3radian)-w4*w4*r4*sin(theta4radian);
      
      // Angular acceleration of coupler
      float alpha3=(A_c*cos(theta4radian)+B_c*sin(theta4radian))/(r3*sin(theta4radian-theta3radian));
      if(abs(alpha3)<1e-10){
        alpha3=0.0;
      }
      cout<<setw(12)<<alpha3<<" rad/s^2"<<endl;

      // Angular acceleration of rocker
      float alpha4=(A_c*cos(theta3radian)+B_c*sin(theta3radian))/(r4*sin(theta4radian-theta3radian));
      if(abs(alpha4)<1e-10){
        alpha4=0.0;
      }
      cout<<setw(12)<<alpha4<<" rad/s^2"<<endl;
       return ;
}

signed main(){
    ios::sync_with_stdio(false);
    cin.tie(NULL);
    int t=1;
    while(t--){
        float r1,r2,r3,r4,w2;
        int n;
        cin>>r1;//fixed link (ground)
        cin>>r2;//crank length
        cin>>r3;//coupler length
        cin>>r4;//rocker length
        cin>>w2;//angular velocity of crank
        // ==========================================
        // EXTRA ADDED: Geometry & Grashof Validations
        // ==========================================
        vector<float>links={r1,r2,r3,r4};
        sort(links.begin(),links.end());
        float s=links[0];//shortest
        float p=links[1]; 
        float q=links[2];
        float l=links[3];//longest
        // Validation 1:Triangle Inequality(Can they connect?)
        if (l>=s+p+q){
            cout<< ">> ERROR: The longest link is greater than the sum of the other three.\n";
            cout<< ">> The links physically cannot connect. Please restart.\n";
            return 0; // Stop execution
        }
        // Validation 2: Grashof's Condition
        cout<<"\n--- Mechanism Status ---\n";
        if(s+l>p+q){
            cout << ">> WARNING: Non-Grashof mechanism(S+L>P+Q).\n";
            cout << ">> The crank cannot rotate 360 degrees. It will hit toggle positions.\n";
        } else{
            // It is Grashof. Let's check which link is the shortest
            if (s!=r1 && s!=r2){
                cout << ">> WARNING: Mechanism is Grashof, but acts as a Double-Rocker.\n";
                cout << ">> Because the input crank (L2) or ground (L1) is not the shortest link, it cannot rotate a full 360 degrees.\n";
            }else{
                cout << ">> SUCCESS: Mechanism is Grashof compliant (Crank-Rocker).\n";
            }
        }
        cout << "------------------------\n\n";
        // ==========================================
        cin>>n; // number of crank angles to analyze
        vector<float>angles(n);
        for(int i=0;i<n;i++){
            cin>>angles[i];//crank angle in degree
        }
        cout<<"Theta,w3,w4,alpha3,alpha4\n";
        for(int i=0;i<n;i++){
            calculate_kinematics_four_bar(r1,r2,r3,r4,w2,angles[i]);
        }
    }
    return 0;
}`;

// ─── Syntax highlighter (keywords / comments / strings / numbers) ──────────

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

// ─── Code modal ────────────────────────────────────────────────────────────

const LANG_LABELS = { js: "JavaScript", py: "Python", cpp: "C++" };
const LANG_CODES = { js: CODE_JS, py: CODE_PY, cpp: CODE_CPP };

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

  const bg = dark ? "#1a1a18" : "#f8f7f3";
  const panel = dark ? "#2a2a28" : "#ffffff";
  const border = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const fg = dark ? "#d1d0c9" : "#2c2c2a";
  const muted = dark ? "#888780" : "#888780";
  const codeBg = dark ? "#161614" : "#f3f2ee";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: dark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.40)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: panel,
          border: `1px solid ${border}`,
          borderRadius: "16px",
          width: "100%",
          maxWidth: "820px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px 14px",
            borderBottom: `1px solid ${border}`,
            background: dark ? "#222220" : "#eeede8",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "15px",
                color: fg,
                letterSpacing: "-0.01em",
              }}
            >
              Four-Bar Linkage — Source Code
            </div>
            <div style={{ fontSize: "12px", color: muted, marginTop: "2px" }}>
              Displacement · Velocity · Acceleration
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${border}`,
              borderRadius: "8px",
              color: muted,
              cursor: "pointer",
              fontSize: "18px",
              lineHeight: 1,
              padding: "4px 9px",
            }}
          >
            ×
          </button>
        </div>

        {/* Lang tabs + copy */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px 0",
            flexShrink: 0,
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", gap: "6px" }}>
            {Object.keys(LANG_LABELS).map((l: string) => (
              <button
                key={l}
                onClick={() => setLang(l as LangKey)}
                style={{
                  padding: "5px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${lang === l ? "#1d9e75" : border}`,
                  background:
                    lang === l ? (dark ? "#0a3328" : "#d6f5ec") : "transparent",
                  color: lang === l ? "#1d9e75" : muted,
                  fontWeight: lang === l ? 600 : 400,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  transition: "all 0.15s",
                }}
              >
                {LANG_LABELS[l as LangKey]}
              </button>
            ))}
          </div>
          <button
            onClick={handleCopy}
            style={{
              padding: "5px 14px",
              borderRadius: "8px",
              border: `1px solid ${copied ? "#4caf50" : border}`,
              background: copied
                ? dark
                  ? "#1b3a1e"
                  : "#eaf7ec"
                : "transparent",
              color: copied ? "#4caf50" : muted,
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: 500,
              transition: "all 0.2s",
              flexShrink: 0,
            }}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>

        {/* Code block */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            margin: "10px 16px 16px",
            borderRadius: "10px",
            border: `1px solid ${border}`,
            background: codeBg,
          }}
        >
          <pre
            style={{
              margin: 0,
              padding: "18px 20px",
              fontSize: "12.5px",
              lineHeight: "1.65",
              fontFamily:
                "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
              color: dark ? "#c9c8c0" : "#2c2c2a",
              overflowX: "auto",
              whiteSpace: "pre",
            }}
            dangerouslySetInnerHTML={{
              __html: highlight(LANG_CODES[lang], lang),
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Four-bar kinematics engine (TypeScript, matches PDF exactly) ──────────

function solveFourBar(
  L1: number,
  L2: number,
  L3: number,
  L4: number,
  omega2: number,
  alpha2: number,
  theta2Deg: number,
  prevTheta4?: number,
): FourBarResult {
  const a = L2,
    b = L3,
    c = L4,
    d = L1;

  const theta = (theta2Deg * Math.PI) / 180;

  // ── Step 1: Displacement – φ (Eqs. 4.5–4.7) ────────────────────────────

  const k = (a * a - b * b + c * c + d * d) / 2;

  const A = k - a * (d - c) * Math.cos(theta) - c * d;

  const B = -2 * a * c * Math.sin(theta);

  const C = k - a * (d + c) * Math.cos(theta) + c * d;

  if (Math.abs(A) < 1e-9) {
    if (Math.abs(B) < 1e-9)
      return {
        valid: false,

        singularity: false,

        theta3: 0,

        theta4: 0,

        omega3: 0,

        omega4: 0,

        alpha3: 0,

        alpha4: 0,
      };

    const phi = 2 * Math.atan(-C / B);

    return finalize(a, b, c, d, theta, phi, omega2, alpha2);
  }

  const disc = B * B - 4 * A * C;

  if (disc < 0)
    return {
      valid: false,

      singularity: false,

      theta3: 0,

      theta4: 0,

      omega3: 0,

      omega4: 0,

      alpha3: 0,

      alpha4: 0,
    };

  const sq = Math.sqrt(disc);

  const phi_a = 2 * Math.atan((-B + sq) / (2 * A)); // Eq. 4.7

  const phi_b = 2 * Math.atan((-B - sq) / (2 * A));

  let phi;

  if (prevTheta4 !== undefined) {
    const wrap = (ang: number) => Math.atan2(Math.sin(ang), Math.cos(ang));

    phi =
      Math.abs(wrap(phi_a - prevTheta4)) <= Math.abs(wrap(phi_b - prevTheta4))
        ? phi_a
        : phi_b;
  } else {
    phi = phi_a;
  }

  return finalize(a, b, c, d, theta, phi, omega2, alpha2);
}

function finalize(
  a: number,
  b: number,
  c: number,
  d: number,
  theta: number,
  phi: number,
  omega2: number,
  alpha2: number,
): FourBarResult {
  // ── Step 2: Coupler angle β (Eqs. 4.8 & 4.9) ────────────────────────────

  const sinBeta = (c * Math.sin(phi) - a * Math.sin(theta)) / b;

  const cosBeta = (c * Math.cos(phi) - a * Math.cos(theta) + d) / b;

  const beta = Math.atan2(sinBeta, cosBeta);

  // ── Step 3: Velocity (Eqs. 4.16, 4.17) ──────────────────────────────────

  const sinBmP = Math.sin(beta - phi); // sin(β − φ)

  if (Math.abs(sinBmP) < 1e-7) {
    return {
      valid: true,

      singularity: true,

      theta3: (beta * 180) / Math.PI,

      theta4: (phi * 180) / Math.PI,

      omega3: 0,

      omega4: 0,

      alpha3: 0,

      alpha4: 0,
    };
  }

  // Eq. 4.16:  ω_c = aω_a sin(β−θ) / (c sin(β−φ))

  const omega_c = (a * omega2 * Math.sin(beta - theta)) / (c * sinBmP);

  // Eq. 4.17:  ω_b = −aω_a sin(φ−θ) / (b sin(φ−β))

  // sin(φ−β) = −sin(β−φ) = −sinBmP

  const omega_b = -(a * omega2 * Math.sin(phi - theta)) / (b * -sinBmP);

  // ── Step 4: Acceleration (Eqs. 4.22, 4.23) ──────────────────────────────

  // Eq. 4.23 — α_c (output link):

  //   α_c = [ aα_a sin(β−θ) − aω_a² cos(β−θ) − bω_b² + cω_c² cos(β−φ) ]

  //         / (c sin(β−φ))

  const alpha_c =
    (a * alpha2 * Math.sin(beta - theta) -
      a * omega2 * omega2 * Math.cos(beta - theta) -
      b * omega_b * omega_b +
      c * omega_c * omega_c * Math.cos(beta - phi)) /
    (c * sinBmP);

  // Eq. 4.22 — α_b (coupler link):

  //   α_b = [ aα_a sin(φ−θ) − aω_a² cos(φ−θ) − bω_b² cos(φ−β) + cω_c² ]

  //         / (b sin(β−φ))

  const alpha_b =
    (a * alpha2 * Math.sin(phi - theta) -
      a * omega2 * omega2 * Math.cos(phi - theta) -
      b * omega_b * omega_b * Math.cos(phi - beta) +
      c * omega_c * omega_c) /
    (b * sinBmP);

  return {
    valid: true,

    singularity: false,

    theta3: (beta * 180) / Math.PI,

    theta4: (phi * 180) / Math.PI,

    omega3: omega_b,

    omega4: omega_c,

    alpha3: alpha_b,

    alpha4: alpha_c,
  };
}

// ─── Canvas drawing ─────────────────────────────────────────────────────────

function drawFourBar(
  canvas: HTMLCanvasElement,
  p: Params,
  dark: boolean,
): void {
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
  const fg = dark ? "#d1d0c9" : "#2c2c2a";

  const res = solveFourBar(p.L1, p.L2, p.L3, p.L4, p.omega2, 0, p.theta2);
  if (!res.valid) return;

  const th2 = (p.theta2 * Math.PI) / 180;
  const th3 = (res.theta3 * Math.PI) / 180;
  const th4 = (res.theta4 * Math.PI) / 180;

  const maxLen = Math.max(p.L1 + p.L2, p.L3 + p.L4, p.L1 * 1.5);
  const scale = Math.min((W * 0.6) / maxLen, (H * 0.6) / maxLen);

  const ox = W / 2 - (p.L1 * scale) / 2;
  const oy = H * 0.62;

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
  ctx.lineWidth = 1.5;
  [-2, -1, 0, 1, 2].forEach((i) => {
    ctx.beginPath();
    ctx.moveTo(Ax - 10 + i * 10, Ay + 6);
    ctx.lineTo(Ax - 16 + i * 10, Ay + 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(Dx - 10 + i * 10, Dy + 6);
    ctx.lineTo(Dx - 16 + i * 10, Dy + 14);
    ctx.stroke();
  });
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Ax - 14, Ay + 6);
  ctx.lineTo(Ax + 14, Ay + 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(Dx - 14, Dy + 6);
  ctx.lineTo(Dx + 14, Dy + 6);
  ctx.stroke();

  // Ground (dashed)
  ctx.strokeStyle = muted;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(Ax, Ay);
  ctx.lineTo(Dx, Dy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Links
  const link = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    col: string,
    w: number,
  ) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  link(Ax, Ay, Bx, By, blue, 4); // crank
  link(Bx, By, Cx, Cy, coral, 3.5); // coupler
  link(Dx, Dy, Cx, Cy, teal, 4); // output

  // Joints
  const joint = (x: number, y: number, col: string, r = 6) => {
    ctx.fillStyle = dark ? "#1a1a18" : "#fff";
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };
  joint(Ax, Ay, purple, 7);
  joint(Dx, Dy, purple, 7);
  joint(Bx, By, blue, 5);
  joint(Cx, Cy, coral, 5);

  // Labels
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = purple;
  ctx.fillText("A (O₂)", Ax, Ay + 30);
  ctx.fillText("D (O₄)", Dx, Dy + 30);
  ctx.fillStyle = blue;
  ctx.fillText("B", Bx, By - 12);
  ctx.fillStyle = coral;
  ctx.fillText("C", Cx, Cy - 12);

  // Link length labels (mid-link)
  ctx.font = "11px system-ui";
  ctx.fillStyle = fg;
  const mid = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    lbl: string,
    off: number,
  ) => {
    const mx = (x1 + x2) / 2,
      my = (y1 + y2) / 2;
    const nx = -(y2 - y1),
      ny = x2 - x1,
      len = Math.sqrt(nx * nx + ny * ny) || 1;
    ctx.fillText(lbl, mx + (nx / len) * off, my + (ny / len) * off);
  };
  ctx.fillStyle = blue;
  mid(Ax, Ay, Bx, By, `a=${p.L2}`, -14);
  ctx.fillStyle = coral;
  mid(Bx, By, Cx, Cy, `b=${p.L3}`, 14);
  ctx.fillStyle = teal;
  mid(Dx, Dy, Cx, Cy, `c=${p.L4}`, 14);
  ctx.fillStyle = muted;
  mid(Ax, Ay, Dx, Dy, `d=${p.L1}`, 14);
}

function drawCurves(
  canvas: HTMLCanvasElement,
  p: Params,
  mode: "vel" | "acc",
  dark: boolean,
  hover: { x: number; y: number } | null
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width,
    H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 36, right: 20, bottom: 44, left: 68 };
  const CW = W - PAD.left - PAD.right,
    CH = H - PAD.top - PAD.bottom;

  const pts1: (number | null)[] = [];
  const pts2: (number | null)[] = [];
  let prevTh4: number | undefined;
  for (let deg = 0; deg <= 360; deg += 2) {
    const r = solveFourBar(p.L1, p.L2, p.L3, p.L4, p.omega2, 0, deg, prevTh4);
    if (r.valid && !r.singularity) {
      prevTh4 = (r.theta4 * Math.PI) / 180;
      pts1.push(mode === "vel" ? r.omega3 : r.alpha3);
      pts2.push(mode === "vel" ? r.omega4 : r.alpha4);
    } else {
      pts1.push(null);
      pts2.push(null);
    }
  }

  const all = [...pts1, ...pts2].filter((v) => v !== null && isFinite(v));
  if (!all.length) return;
  const minY = Math.min(...(all as number[])),
    maxY = Math.max(...(all as number[])),
    rng = maxY - minY || 1;
  const toX = (i: number) => PAD.left + (i / (pts1.length - 1)) * CW;
  const toY = (v: number) => PAD.top + (1 - (v - minY) / rng) * CH;

  const grid = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tick = dark ? "#888780" : "#888780";
  const fg = dark ? "#d1d0c9" : "#2c2c2a";

  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (i / 4) * CH;
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + CW, y);
    ctx.stroke();
    const v = maxY - (i / 4) * rng;
    ctx.fillStyle = tick;
    ctx.font = "11px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(v.toFixed(1), PAD.left - 6, y + 4);
  }
  const zY = toY(0);
  if (zY >= PAD.top && zY <= PAD.top + CH) {
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, zY);
    ctx.lineTo(PAD.left + CW, zY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const drawSeries = (
    data: (number | null)[],
    color: string,
    dash: number[],
  ) => {
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
        } else ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };
  drawSeries(pts1, "#d85a30", []);
  drawSeries(pts2, "#1d9e75", [6, 3]);

  ctx.font = "11px system-ui";
  ctx.fillStyle = tick;
  ctx.textAlign = "center";
  for (let d = 0; d <= 360; d += 60) {
    const x = PAD.left + (d / 360) * CW;
    ctx.fillText(`${d}°`, x, PAD.top + CH + 16);
  }
  ctx.fillStyle = fg;
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("crank angle θ₂ (degrees)", PAD.left + CW / 2, H - 4);

  const l1 = mode === "vel" ? "ω₃  coupler (rad/s)" : "α₃  coupler (rad/s²)";
  const l2 = mode === "vel" ? "ω₄  output  (rad/s)" : "α₄  output  (rad/s²)";
  ctx.textAlign = "left";
  ctx.fillStyle = "#d85a30";
  ctx.fillRect(PAD.left + 4, PAD.top + 4, 18, 3);
  ctx.fillText(l1, PAD.left + 28, PAD.top + 12);
  ctx.fillStyle = "#1d9e75";
  ctx.fillRect(PAD.left + 4, PAD.top + 20, 18, 3);
  ctx.fillText(l2, PAD.left + 28, PAD.top + 28);

  if (hover) {
    const t = (hover.x - PAD.left) / CW;
    const idx = Math.round(t * (pts1.length - 1));

    if (idx >= 0 && idx < pts1.length) {
      const x = toX(idx);
      const v1 = pts1[idx];
      const v2 = pts2[idx];

      // Vertical line
      ctx.strokeStyle = dark ? "#aaa" : "#444";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, PAD.top);
      ctx.lineTo(x, PAD.top + CH);
      ctx.stroke();
      ctx.setLineDash([]);
      

      // Draw point
      const drawPoint = (v: number | null, color: string) => {
        if (v === null) return;
        const y = toY(v);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      };

      drawPoint(v1, "#d85a30");
      drawPoint(v2, "#1d9e75");

      // Tooltip
      const angle = Math.round((idx / (pts1.length - 1)) * 360);

      const boxW = 140;
      const boxH = 50;
      const boxX = Math.min(x + 10, canvas.width - boxW - 5);
      const boxY = PAD.top + 10;

      ctx.fillStyle = dark ? "#222" : "#fff";
      ctx.strokeStyle = dark ? "#444" : "#ccc";

      ctx.beginPath();
      ctx.rect(boxX, boxY, boxW, boxH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = dark ? "#fff" : "#000";
      ctx.font = "11px system-ui";

      ctx.fillText(`θ₂: ${angle}°`, boxX + 8, boxY + 14);

      

      if (v1 !== null)
        ctx.fillText(
          `${mode === "vel" ? "ω₃" : "α₃"}: ${v1.toFixed(2)}`,
          boxX + 8,
          boxY + 28,
        );

      if (v2 !== null)
        ctx.fillText(
          `${mode === "vel" ? "ω₄" : "α₄"}: ${v2.toFixed(2)}`,
          boxX + 8,
          boxY + 42,
        );
    }
  }
}

// ─── Presets ────────────────────────────────────────────────────────────────

const PRESETS = [
  { name: "Grashof Crank-Rocker", L1: 100, L2: 40, L3: 120, L4: 80 },
  { name: "Double Crank", L1: 40, L2: 80, L3: 70, L4: 60 },
  {
    name: "Double Rocker",
    L1: 100,
    L2: 60,
    L3: 80,
    L4: 50,
  },
  { name: "Parallelogram", L1: 100, L2: 50, L3: 100, L4: 50 },
  {
    name: "Khurmi Input Case",
    L1: 80,
    L2: 20,
    L3: 66,
    L4: 56,
    omega2: 10.5,
    theta2: 0,
  },
];

// ─── Main component ──────────────────────────────────────────────────────────

export default function FourBarPage() {
  const [p, setP] = useState<Params>({
    L1: 100,
    L2: 40,
    L3: 120,
    L4: 80,
    omega2: 10,
    theta2: 45,
  });

  const [tab, setTab] = useState<TabKey>("mech");
  const [animating, setAnimating] = useState<boolean>(false);
  const [dark, setDark] = useState<boolean>(false);
  const [showCode, setShowCode] = useState<boolean>(false);
  const [tableInterval, setTableInterval] = useState<number>(15);

  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  

  const mechRef = useRef<HTMLCanvasElement | null>(null);
  const velRef = useRef<HTMLCanvasElement | null>(null);
  const accRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTimeout(() => setDark(mq.matches), 10);
    const h = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (mechRef.current) drawFourBar(mechRef.current, p, dark);
    if (velRef.current) drawCurves(velRef.current, p, "vel", dark, hover);
    if (accRef.current) drawCurves(accRef.current, p, "acc", dark, hover);
  }, [p, dark, tab, hover]);

  useEffect(() => {
    if (!animating) return;
    let prevTh4: number | undefined;
    const seed = solveFourBar(p.L1, p.L2, p.L3, p.L4, p.omega2, 0, p.theta2);
    if (seed.valid) prevTh4 = (seed.theta4 * Math.PI) / 180;

    const step = () => {
      setP((prev) => {
        const next = (prev.theta2 + 1) % 360;
        const r = solveFourBar(
          prev.L1,
          prev.L2,
          prev.L3,
          prev.L4,
          prev.omega2,
          0,
          next,
          prevTh4,
        );
        if (!r.valid || r.singularity) {
          setAnimating(false);
          return prev;
        }
        prevTh4 = (r.theta4 * Math.PI) / 180;
        return { ...prev, theta2: next };
      });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animating]);

  const res = solveFourBar(p.L1, p.L2, p.L3, p.L4, p.omega2, 0, p.theta2);

  // Build table
  const tableRows = [];
  let prevTh4 = undefined;
  for (let d = 0; d <= 360; d += tableInterval) {
    const r = solveFourBar(p.L1, p.L2, p.L3, p.L4, p.omega2, 0, d, prevTh4);
    if (r.valid) prevTh4 = (r.theta4 * Math.PI) / 180;
    tableRows.push({ theta2: d, ...r });
  }

  // Grashof condition
  const sorted = [p.L1, p.L2, p.L3, p.L4].slice().sort((a, b) => a - b);
  const isGrashof = sorted[0] + sorted[3] <= sorted[1] + sorted[2];

  const tabs = [
    { id: "mech", label: "Mechanism" },
    { id: "vel", label: "Velocity" },
    { id: "acc", label: "Acceleration" },
  ];

  return (
    <div className={dark ? "dark" : ""}>
      {showCode && <CodeModal onClose={() => setShowCode(false)} dark={dark} />}

      <div className="min-h-screen bg-[#f4f3ef] dark:bg-[#111110] text-[#2c2c2a] dark:text-[#d1d0c9] font-sans px-5 py-8 mx-auto max-w-6xl">
        {/* Back link */}
        <Link href="/" className="text-xs text-[#888780] hover:underline">
          ← Back to Home
        </Link>

        {/* Title */}
        <div className="flex items-baseline flex-wrap gap-4 mb-2 mt-2">
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
        <p className="text-sm text-[#888780] mb-5 mt-0 max-w-2xl">
          Links L1=d (ground) · L2=a (crank) · L3=b (coupler) · L4=c (output).
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
          {/* ── LEFT SIDEBAR ── */}
          <div className="bg-[#eeede8] dark:bg-[#242422] rounded-xl p-5 lg:sticky lg:top-6 shadow-sm border border-black/5 dark:border-white/5">
            <div className="text-sm font-semibold mb-4 uppercase tracking-wider text-[#888780]">
              Parameters
            </div>
            <div className="flex flex-col gap-5">
              {[
                {
                  key: "L1",
                  label: "Fixed link L1 [d] (mm)",
                  min: 10,
                  max: 300,
                  step: 1,
                },
                {
                  key: "L2",
                  label: "Crank L2 [a] (mm)",
                  min: 10,
                  max: 200,
                  step: 1,
                },
                {
                  key: "L3",
                  label: "Coupler L3 [b] (mm)",
                  min: 10,
                  max: 300,
                  step: 1,
                },
                {
                  key: "L4",
                  label: "Follower L4 [c] (mm)",
                  min: 10,
                  max: 300,
                  step: 1,
                },
                {
                  key: "omega2",
                  label: "Crank ω₂ (rad/s)",
                  min: 1,
                  max: 100,
                  step: 1,
                },
                {
                  key: "theta2",
                  label: "Crank angle θ₂ (°)",
                  min: 0,
                  max: 359,
                  step: 1,
                },
              ].map(({ key, label, min, max, step }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#888780] flex justify-between items-center">
                    <span>{label}</span>
                    <span className="font-medium text-[#2c2c2a] dark:text-[#d1d0c9]">
                      {p[key as keyof Params]}{" "}
                      {key.startsWith("L")
                        ? "mm"
                        : key === "theta2"
                          ? "°"
                          : "rad/s"}
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={p[key as keyof Params]}
                      onChange={(e) =>
                        setP((prev) => ({
                          ...prev,
                          [key]: Number(e.target.value),
                        }))
                      }
                      className="flex-1 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor: "#1d9e75" }}
                    />
                    <input
                      type="number"
                      value={p[key as keyof Params]}
                      step={step}
                      min={min}
                      max={max}
                      onChange={(e) => {
                        let v = Number(e.target.value);
                        if (isNaN(v)) return;
                        v = Math.max(min, Math.min(max, v));
                        setP((prev) => ({ ...prev, [key]: v }));
                      }}
                      className="w-[65px] px-2 py-1 rounded-md bg-white dark:bg-[#1a1a18] border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/50 transition-shadow"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT AREA ── */}
          <div className="flex flex-col gap-6">
            {/* KPI cards */}
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
                      ? res.omega3.toFixed(3)
                      : "ERR",
                  color: "text-[#d85a30]",
                },
                {
                  label: "ω₄ (rad/s)",
                  val:
                    res.valid && !res.singularity
                      ? res.omega4.toFixed(3)
                      : "ERR",
                  color: "text-[#1d9e75]",
                },
                {
                  label: "α₃ (rad/s²)",
                  val:
                    res.valid && !res.singularity
                      ? res.alpha3.toFixed(2)
                      : "ERR",
                  color: "text-[#d85a30]",
                },
                {
                  label: "α₄ (rad/s²)",
                  val:
                    res.valid && !res.singularity
                      ? res.alpha4.toFixed(2)
                      : "ERR",
                  color: "text-[#1d9e75]",
                },
              ].map(({ label, val, color }) => (
                <div
                  key={label}
                  className={`rounded-xl p-4 border border-black/5 dark:border-white/5 ${
                    !res.valid || res.singularity
                      ? "bg-[#e24b4a]/10 dark:bg-[#e24b4a]/20"
                      : "bg-[#eeede8] dark:bg-[#242422]"
                  }`}
                >
                  <div
                    className={`text-xs mb-1 font-medium ${res.valid && !res.singularity ? "text-[#888780]" : "text-[#e24b4a]"}`}
                  >
                    {label}
                  </div>
                  <div
                    className={`text-xl font-semibold tracking-tight ${res.valid && !res.singularity ? color : "text-[#e24b4a]"}`}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Canvas panel */}
            <div className="bg-[#eeede8] dark:bg-[#242422] rounded-xl p-5 shadow-sm border border-black/5 dark:border-white/5">
              {/* Tab row — tabs left, Code button right */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex gap-2 flex-1 flex-wrap">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id as TabKey)}
                      className={`px-4 py-1.5 border border-black/10 dark:border-white/10 rounded-lg cursor-pointer text-sm transition-colors ${
                        tab === t.id
                          ? "bg-white dark:bg-[#1c1c1a] text-[#2c2c2a] dark:text-[#d1d0c9] font-medium shadow-sm"
                          : "bg-transparent text-[#888780] hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {/* Code button */}
                <button
                  onClick={() => setShowCode(true)}
                  className="px-3 py-1.5 border border-[#1d9e75]/40 rounded-lg text-xs md:text-sm transition-colors bg-[#1d9e75]/10 text-[#1d9e75] font-medium hover:bg-[#1d9e75]/20 flex items-center gap-1.5 cursor-pointer"
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

              {/* Canvas + Animate button inside canvas area */}
              <div className="relative min-h-[320px] w-full rounded-lg overflow-hidden bg-white dark:bg-[#1a1a18] border border-black/5 dark:border-white/5">
                {/* Animate button — top-right corner of the canvas */}
                <button
                  onClick={() => {
                    if (res.valid && !res.singularity) setAnimating((a) => !a);
                  }}
                  disabled={!res.valid || res.singularity}
                  className={`absolute top-3 right-3 z-20 px-3 py-1.5 border rounded-lg text-xs font-medium backdrop-blur-sm transition-colors ${
                    animating
                      ? "border-[#e24b4a]/40 bg-[#e24b4a]/10 text-[#e24b4a] cursor-pointer"
                      : res.valid && !res.singularity
                        ? "border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 text-[#2c2c2a] dark:text-[#d1d0c9] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                        : "border-black/10 dark:border-white/10 text-[#888780] cursor-not-allowed opacity-40"
                  }`}
                >
                  {animating ? "⏹ Stop" : "▶ Animate"}
                </button>

                {(!res.valid || res.singularity) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#1a1a18]/80 backdrop-blur-[3px] z-10 text-[#e24b4a] font-semibold text-base text-center px-4">
                    {res.singularity
                      ? "Dead Centre — Links Collinear"
                      : "Invalid — Links Cannot Connect"}
                  </div>
                )}

                <canvas
                  ref={mechRef}
                  width={800}
                  height={420}
                  className={`w-full h-full object-contain ${tab === "mech" ? "block" : "hidden"}`}
                  role="img"
                />
                <canvas
                  ref={velRef}
                  width={800}
                  height={420}
                  className={`w-full h-full object-contain ${tab === "vel" ? "block" : "hidden"}`}
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
                />
                <canvas
                  ref={accRef}
                  width={800}
                  height={420}
                  className={`w-full h-full object-contain ${tab === "acc" ? "block" : "hidden"}`}
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
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#1c1c1a] border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
              <div className="flex flex-wrap justify-between items-center px-5 py-4 border-b border-black/10 dark:border-white/10 bg-[#eeede8]/50 dark:bg-[#242422]/50 gap-3">
                <span className="text-sm font-semibold tracking-wide uppercase text-[#888780]">
                  Computed values — every {tableInterval}°
                </span>
                <div className="flex items-center gap-2">
                  {[1, 15, 30, 45, 60].map((v) => (
                    <button
                      key={v}
                      onClick={() => setTableInterval(v)}
                      className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                        tableInterval === v
                          ? "bg-[#1d9e75] text-white"
                          : "bg-black/5 dark:bg-white/5 text-[#888780] hover:text-[#2c2c2a] dark:hover:text-[#d1d0c9]"
                      }`}
                    >
                      {v}°
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
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
                        className={`tabular-nums hover:bg-black/5 dark:hover:bg-white/5 ${i % 2 === 0 ? "" : "bg-[#eeede8]/30 dark:bg-[#242422]/30"} ${row.valid ? "opacity-100" : "opacity-40"}`}
                      >
                        <td
                          className={`px-4 py-2 text-right font-semibold ${row.valid ? "text-[#378add]" : "text-[#e24b4a]"}`}
                        >
                          {row.theta2}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid ? row.theta3.toFixed(2) : "—"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid ? "text-[#e24b4a]" : ""}`}
                        >
                          {row.valid ? row.theta4.toFixed(2) : "—"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid || row.singularity ? "text-[#e24b4a]" : "text-[#d85a30]"}`}
                        >
                          {row.valid && !row.singularity
                            ? row.omega3.toFixed(3)
                            : "—"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid || row.singularity ? "text-[#e24b4a]" : "text-[#1d9e75]"}`}
                        >
                          {row.valid && !row.singularity
                            ? row.omega4.toFixed(3)
                            : "—"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid || row.singularity ? "text-[#e24b4a]" : "text-[#d85a30]"}`}
                        >
                          {row.valid && !row.singularity
                            ? row.alpha3.toFixed(2)
                            : "—"}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${!row.valid || row.singularity ? "text-[#e24b4a]" : "text-[#1d9e75]"}`}
                        >
                          {row.valid && !row.singularity
                            ? row.alpha4.toFixed(2)
                            : "—"}
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
                Analytical equations used
              </div>

              <div className="space-y-4">
                {/* Displacement */}
                <div>
                  <div className="font-medium text-black/60 dark:text-white/60 mb-1">
                    Displacement:
                  </div>
                  <div className="space-y-1">
                    <div>
                      <InlineMath math="2k = a^2 - b^2 + c^2 + d^2" />
                    </div>
                    <div>
                      <InlineMath math="A = k - a(d-c)\cos\theta - cd" />
                    </div>
                    <div>
                      <InlineMath math="B = -2ac\sin\theta" />
                    </div>
                    <div>
                      <InlineMath math="C = k - a(d+c)\cos\theta + cd" />
                    </div>
                    <div>
                      <InlineMath math="\phi = 2\tan^{-1}\left(\frac{-B \pm \sqrt{B^2 - 4AC}}{2A}\right)" />
                    </div>
                  </div>
                </div>

                {/* Coupler */}
                <div>
                  <div className="font-medium text-black/60 dark:text-white/60 mb-1">
                    Coupler angle:
                  </div>
                  <div className="space-y-1">
                    <div>
                      <InlineMath math="\sin\beta = \frac{c\sin\phi - a\sin\theta}{b}" />
                    </div>
                    <div>
                      <InlineMath math="\cos\beta = \frac{c\cos\phi - a\cos\theta + d}{b}" />
                    </div>
                  </div>
                </div>

                {/* Velocity */}
                <div>
                  <div className="font-medium text-black/60 dark:text-white/60 mb-1">
                    Velocity:
                  </div>
                  <div className="space-y-1">
                    <div>
                      <InlineMath math="\omega_4 = \frac{a\,\omega_2 \sin(\beta - \theta)}{c \sin(\beta - \phi)}" />
                    </div>
                    <div>
                      <InlineMath math="\omega_3 = \frac{a\,\omega_2 \sin(\phi - \theta)}{b \sin(\beta - \phi)}" />
                    </div>
                  </div>
                </div>

                {/* Acceleration */}
                <div>
                  <div className="font-medium text-black/60 dark:text-white/60 mb-1">
                    Acceleration:
                  </div>
                  <div className="space-y-1">
                    <div>
                      <InlineMath math="\alpha_4 = \frac{a\alpha_2 \sin(\beta-\theta) - a\omega_2^2 \cos(\beta-\theta) - b\omega_3^2 + c\omega_4^2 \cos(\beta-\phi)}{c\sin(\beta-\phi)}" />
                    </div>
                    <div>
                      <InlineMath math="\alpha_3 = \frac{a\alpha_2 \sin(\phi-\theta) - a\omega_2^2 \cos(\phi-\theta) - b\omega_3^2 \cos(\phi-\beta) + c\omega_4^2}{b\sin(\beta-\phi)}" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
