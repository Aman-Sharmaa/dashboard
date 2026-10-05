"use client";

import React, { useEffect, useRef } from 'react';

interface DynamicBackgroundProps {
  style: 'solid' | 'gradient' | 'aurora' | 'mesh';
  themeColor: string;
}

export function DynamicBackground({ style, themeColor }: DynamicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (style !== 'aurora') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const orbCount = 5;
    const orbs: { x: number; y: number; radius: number; vx: number; vy: number; color: string }[] = [];

    // Helper to dim the color
    const dimColor = (hex: string, percent: number) => {
      const num = parseInt(hex.replace("#", ""), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return "#" + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
    };

    const colors = [
      themeColor,
      dimColor(themeColor, -20),
      dimColor(themeColor, -40),
      "#000000",
      "#1a1025"
    ];

    for (let i = 0; i < orbCount; i++) {
      orbs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * (width * 0.4) + width * 0.2,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        color: colors[i % colors.length]
      });
    }

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      orbs.forEach(orb => {
        orb.x += orb.vx;
        orb.y += orb.vy;

        if (orb.x < -orb.radius) orb.x = width + orb.radius;
        if (orb.x > width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = height + orb.radius;
        if (orb.y > height + orb.radius) orb.y = -orb.radius;

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        gradient.addColorStop(0, orb.color + '66'); // 40% opacity
        gradient.addColorStop(1, orb.color + '00'); // 0% opacity

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [style, themeColor]);

  if (style === 'solid') {
    return <div className="fixed inset-0 -z-10" style={{ backgroundColor: themeColor }} />;
  }

  if (style === 'gradient') {
    return (
      <div 
        className="fixed inset-0 -z-10" 
        style={{ 
          background: `radial-gradient(circle at top right, ${themeColor}, #000000), radial-gradient(circle at bottom left, #1a1025, #000000)` 
        }} 
      />
    );
  }

  if (style === 'mesh') {
    return (
      <div 
        className="fixed inset-0 -z-10 overflow-hidden" 
        style={{ backgroundColor: '#000000' }}
      >
        <div 
          className="absolute inset-0 opacity-40 filter blur-[100px] animate-pulse transition-all"
          style={{
            animationDuration: "10000ms",
            transitionDuration: "10000ms",
            background: `
              radial-gradient(at 0% 0%, ${themeColor} 0%, transparent 50%),
              radial-gradient(at 100% 0%, #4c1d95 0%, transparent 50%),
              radial-gradient(at 100% 100%, ${themeColor} 0%, transparent 50%),
              radial-gradient(at 0% 100%, #1e1b4b 0%, transparent 50%),
              radial-gradient(at 50% 50%, #000000 0%, transparent 50%),
              radial-gradient(at 20% 40%, ${themeColor}22 0%, transparent 30%),
              radial-gradient(at 80% 60%, #ffffff11 0%, transparent 20%)
            `
          }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] brightness-75 contrast-125 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
      </div>
    );
  }

  if (style === 'aurora') {
    return (
      <div className="fixed inset-0 -z-10 bg-black">
        <canvas ref={canvasRef} className="w-full h-full opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
      </div>
    );
  }

  return <div className="fixed inset-0 -z-10" style={{ backgroundColor: themeColor }} />;
}
