"use client";

import { useEffect, useRef } from "react";

// Interactive 3D "spend landscape" for the login background: a grid of bars
// whose heights move like data over time. Pure canvas 2D with a small
// perspective projection (no 3D library). Decorative only — no real data.

const GRID = 18; // bars per side
const SPACING = 1;
const BAR = 0.62; // bar width (of SPACING)
const BG = [11, 16, 36]; // matches the page background, used for depth fog

// Height ramp: indigo -> sky -> emerald
const STOPS: [number, number[]][] = [
  [0, [79, 70, 229]],
  [0.55, [56, 189, 248]],
  [1, [52, 211, 153]],
];

function ramp(t: number): number[] {
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    const [p0, c0] = STOPS[i - 1];
    if (t <= p1) {
      const k = (t - p0) / (p1 - p0);
      return c0.map((v, j) => v + (c1[j] - v) * k);
    }
  }
  return STOPS.at(-1)![1];
}

const rgba = (c: number[], light: number, fog: number, alpha: number) => {
  const mix = (v: number, j: number) => Math.round((v * light) * (1 - fog) + BG[j] * fog);
  return `rgba(${mix(c[0], 0)},${mix(c[1], 1)},${mix(c[2], 2)},${alpha})`;
};

type Pt = { x: number; y: number; z: number };

export function BarField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let raf = 0;

    // Camera follows the pointer with easing
    const pointer = { x: 0.5, y: 0.5, active: false, sx: -1e4, sy: -1e4 };
    const cam = { yaw: 0.78, pitch: 0.62 };
    const ripples: { x: number; z: number; t: number }[] = [];
    const lift = new Float32Array(GRID * GRID); // eased hover lift per bar
    const screenBase = new Float32Array(GRID * GRID * 2); // last projected base, for hover hit-testing

    const particles = Array.from({ length: 70 }, () => ({
      x: (Math.random() - 0.5) * GRID * SPACING,
      z: (Math.random() - 0.5) * GRID * SPACING,
      y: Math.random() * 6,
      v: 0.006 + Math.random() * 0.012,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
      pointer.sx = e.clientX;
      pointer.sy = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.sx = pointer.sy = -1e4;
    };
    const onDown = (e: PointerEvent) => {
      // Ripple from the bar nearest to the click
      let best = -1;
      let bestD = 80 * 80;
      for (let i = 0; i < GRID * GRID; i++) {
        const dx = screenBase[i * 2] - e.clientX;
        const dy = screenBase[i * 2 + 1] - e.clientY;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best >= 0) ripples.push({ x: best % GRID, z: Math.floor(best / GRID), t: 0 });
      if (ripples.length > 4) ripples.shift();
    };

    const heightAt = (gx: number, gz: number, t: number) => {
      const x = gx / GRID;
      const z = gz / GRID;
      const wave =
        Math.sin(x * 6.2 + t * 0.9) * 0.5 +
        Math.cos(z * 5.1 - t * 0.7) * 0.45 +
        Math.sin((x + z) * 4.3 + t * 0.5) * 0.35 +
        Math.cos(Math.hypot(x - 0.5, z - 0.5) * 9 - t * 1.3) * 0.4;
      let h = 0.95 + wave * 1.15 + Math.max(0, 1.4 - Math.hypot(x - 0.62, z - 0.4) * 4) * 1.6; // a "peak" region
      for (const r of ripples) {
        const d = Math.hypot(gx - r.x, gz - r.z);
        const front = r.t * 9;
        h += Math.exp(-((d - front) ** 2) / 3) * 1.8 * Math.max(0, 1 - r.t / 1.6);
      }
      return Math.max(0.15, h);
    };

    let focal = 1000;
    // Camera looks down at the field: far rows rise toward the horizon
    const project = (p: Pt, cy: number, sy: number, cp: number, sp: number, cx: number, cyScreen: number, dist: number) => {
      const x1 = p.x * cy - p.z * sy;
      const z1 = p.x * sy + p.z * cy;
      const y2 = p.y * cp + z1 * sp;
      const z2 = -p.y * sp + z1 * cp + dist;
      const k = focal / z2;
      return { x: cx + x1 * k, y: cyScreen - y2 * k, depth: z2 };
    };

    let last = performance.now();
    let time = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduceMotion) time += dt;

      // Ease camera toward the pointer
      const targetYaw = 0.78 + (pointer.x - 0.5) * 0.7 + (reduceMotion ? 0 : Math.sin(time * 0.12) * 0.12);
      const targetPitch = 0.62 + (pointer.y - 0.5) * 0.25;
      cam.yaw += (targetYaw - cam.yaw) * 0.04;
      cam.pitch += (targetPitch - cam.pitch) * 0.04;
      for (const r of ripples) r.t += dt;
      while (ripples.length && ripples[0].t > 1.6) ripples.shift();

      ctx.clearRect(0, 0, width, height);
      const cy = Math.cos(cam.yaw);
      const sy = Math.sin(cam.yaw);
      const cp = Math.cos(cam.pitch);
      const sp = Math.sin(cam.pitch);
      const narrow = width < 900;
      const cx = narrow ? width * 0.5 : width * 0.4;
      const cyScreen = height * (narrow ? 0.66 : 0.68);
      const dist = 30;
      focal = Math.min(width * (narrow ? 1.1 : 0.85), height * 1.9);
      const half = ((GRID - 1) * SPACING) / 2;
      const w = (BAR * SPACING) / 2;

      type Face = { pts: { x: number; y: number }[]; fill: string; stroke?: string };
      const bars: { depth: number; faces: Face[] }[] = [];

      for (let gz = 0; gz < GRID; gz++) {
        for (let gx = 0; gx < GRID; gx++) {
          const i = gz * GRID + gx;
          const bx = gx * SPACING - half;
          const bz = gz * SPACING - half;
          const base = project({ x: bx, y: 0, z: bz }, cy, sy, cp, sp, cx, cyScreen, dist);
          screenBase[i * 2] = base.x;
          screenBase[i * 2 + 1] = base.y;

          // Hover: bars near the pointer rise
          const near = pointer.active ? Math.max(0, 1 - Math.hypot(base.x - pointer.sx, base.y - pointer.sy) / 140) : 0;
          lift[i] += (near * 2.2 - lift[i]) * 0.12;

          const h = heightAt(gx, gz, time) + lift[i];
          const t = Math.min(1, h / 4.2);
          const color = ramp(t);
          const fog = Math.min(0.85, Math.max(0, (base.depth - dist + half) / (half * 2.6)));

          const c = [
            { x: bx - w, z: bz - w },
            { x: bx + w, z: bz - w },
            { x: bx + w, z: bz + w },
            { x: bx - w, z: bz + w },
          ];
          const bottom = c.map((q) => project({ x: q.x, y: 0, z: q.z }, cy, sy, cp, sp, cx, cyScreen, dist));
          const top = c.map((q) => project({ x: q.x, y: h, z: q.z }, cy, sy, cp, sp, cx, cyScreen, dist));

          const faces: Face[] = [];
          for (let k = 0; k < 4; k++) {
            const a = bottom[k];
            const b = bottom[(k + 1) % 4];
            const quad = [a, b, top[(k + 1) % 4], top[k]];
            // Back-face culling by screen winding
            const area = (b.x - a.x) * (quad[2].y - a.y) - (b.y - a.y) * (quad[2].x - a.x);
            if (area >= 0) continue;
            faces.push({ pts: quad, fill: rgba(color, k % 2 ? 0.42 : 0.6, fog, 0.92) });
          }
          faces.push({
            pts: top,
            fill: rgba(color, 1.05, fog, 0.96),
            stroke: rgba([255, 255, 255], 1, fog, 0.18 + t * 0.35),
          });
          bars.push({ depth: base.depth, faces });
        }
      }

      // Floor glow under the field
      const glow = ctx.createRadialGradient(cx, cyScreen, 10, cx, cyScreen, Math.max(width, height) * 0.45);
      glow.addColorStop(0, "rgba(99,102,241,0.22)");
      glow.addColorStop(1, "rgba(99,102,241,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Painter's algorithm: far to near
      bars.sort((a, b) => b.depth - a.depth);
      ctx.lineJoin = "round";
      for (const bar of bars) {
        for (const f of bar.faces) {
          ctx.beginPath();
          ctx.moveTo(f.pts[0].x, f.pts[0].y);
          for (let k = 1; k < f.pts.length; k++) ctx.lineTo(f.pts[k].x, f.pts[k].y);
          ctx.closePath();
          ctx.fillStyle = f.fill;
          ctx.fill();
          if (f.stroke) {
            ctx.strokeStyle = f.stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Rising "data points"
      for (const p of particles) {
        if (!reduceMotion) {
          p.y += p.v;
          if (p.y > 7) {
            p.y = 0;
            p.x = (Math.random() - 0.5) * GRID * SPACING;
            p.z = (Math.random() - 0.5) * GRID * SPACING;
          }
        }
        const s = project(p, cy, sy, cp, sp, cx, cyScreen, dist);
        const r = Math.max(0.6, (focal / s.depth) * 0.035);
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165,243,252,${0.65 * (1 - p.y / 7)})`;
        ctx.fill();
      }

      if (!reduceMotion || pointer.active || ripples.length) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    raf = requestAnimationFrame(frame);
    // With reduced motion, redraw only on interaction
    const wake = () => {
      if (reduceMotion) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
    };
    window.addEventListener("pointermove", wake);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointermove", wake);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
