
import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  duration?: number;
}

const Confetti: React.FC<ConfettiProps> = ({ duration = 3000 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
    }[] = [];

    const colors = ['#4f46e5', '#3b82f6', '#c084fc', '#06b6d4', '#f43f5e', '#fbbf24'];

    // Spawn
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20 - 5, // Slightly upward bias
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }

    let animationId: number;
    let startTime = Date.now();

    const render = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      
      if (elapsed > duration) {
        return; 
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // Gravity
        p.vx *= 0.96; // Air resistance
        p.vy *= 0.96;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    const resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeHandler);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeHandler);
    };
  }, [duration]);

  return (
    <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-[9999]"
    />
  );
};

export default Confetti;
