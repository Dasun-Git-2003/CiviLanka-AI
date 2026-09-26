import { useEffect, useRef, useState, useCallback } from 'react';

const TOTAL_FRAMES = 176;

// Generate array of frame paths: /colombo_night_frames/frame_001.jpg ... frame_176.jpg
const FRAME_PATHS = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
  const frameNum = String(i + 1).padStart(3, '0');
  return `/colombo_night_frames/frame_${frameNum}.jpg`;
});

interface ColomboNightHeroProps {
  className?: string;
}

export default function ColomboNightHero({ className = '' }: ColomboNightHeroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null));
  const currentFrameRef = useRef<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  // Draw frame on canvas with high-DPI scaling and cover-fit
  const renderFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find the requested frame, or the nearest previously loaded frame
    let img = imagesRef.current[frameIndex];
    if (!img || !img.complete) {
      // Look backward for the latest loaded frame
      for (let i = frameIndex - 1; i >= 0; i--) {
        if (imagesRef.current[i]?.complete) {
          img = imagesRef.current[i];
          break;
        }
      }
    }

    if (!img || !img.complete) return;

    const width = canvas.width;
    const height = canvas.height;

    // Cover math
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;

    let drawWidth = width;
    let drawHeight = height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasAspect > imgAspect) {
      drawHeight = width / imgAspect;
      offsetY = (height - drawHeight) / 2;
    } else {
      drawWidth = height * imgAspect;
      offsetX = (width - drawWidth) / 2;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

  // Pause canvas rendering loop when hero is scrolled out of viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisibleRef.current = entry ? entry.isIntersecting : true;
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Preload all 176 frames progressively
  useEffect(() => {
    let loadedCount = 0;
    const images: (HTMLImageElement | null)[] = new Array(TOTAL_FRAMES).fill(null);

    FRAME_PATHS.forEach((path, index) => {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        images[index] = img;
        loadedCount += 1;

        // Render immediately as soon as the first frame loads
        if (index === 0) {
          renderFrame(0);
        }

        // Start playback as soon as the first 12 frames are ready for instant responsiveness
        if (loadedCount >= 12) {
          setHasStarted(true);
        }
      };
    });

    imagesRef.current = images;
  }, [renderFrame]);

  // Responsive canvas resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      renderFrame(currentFrameRef.current);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderFrame]);

  // Smooth continuous autonomous animation loop at cinematic 24 FPS (skips frames when off-screen)
  useEffect(() => {
    if (!hasStarted) return;

    const fps = 24;
    const interval = 1000 / fps;

    const loop = (timestamp: number) => {
      if (isVisibleRef.current && timestamp - lastFrameTimeRef.current >= interval) {
        lastFrameTimeRef.current = timestamp;
        currentFrameRef.current = (currentFrameRef.current + 1) % TOTAL_FRAMES;
        renderFrame(currentFrameRef.current);
      }
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [hasStarted, renderFrame]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* HTML5 Canvas for silky smooth autonomous frame rendering */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover filter brightness-[0.9] contrast-[1.05]"
      />

      {/* Fallback image before frames start animating */}
      {!hasStarted && (
        <img
          src="/colombo_night_frames/frame_001.jpg"
          alt="Colombo Night Panorama"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Cinematic Ambient Gradient Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/70 pointer-events-none" />
    </div>
  );
}
