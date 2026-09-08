import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ── RETRO GLYPH SCRAMBLER ──────────────────────────────────────────────────
export const SCRAMBLE_CHARS = "0123456789ABCDEF#%/_X@!?<>[].";

export function scrambleText(
  element: HTMLElement,
  targetText: string,
  duration = 0.6,
  onComplete?: () => void
) {
  if (!element) return;
  const chars = SCRAMBLE_CHARS;
  const len = targetText.length;
  const obj = { progress: 0 };

  // Fail-safe timer guarantees the text resolves even if GSAP is interrupted/cancelled
  const timer = setTimeout(() => {
    if (element) {
      element.innerText = targetText;
      onComplete?.();
    }
  }, duration * 1000 + 80);

  return gsap.to(obj, {
    progress: 1,
    duration,
    ease: "power1.out",
    onUpdate: () => {
      const currentResolvedIndex = Math.floor(obj.progress * len);
      let output = "";
      for (let i = 0; i < len; i++) {
        if (targetText[i] === " " || targetText[i] === "\n") {
          output += targetText[i];
        } else if (i < currentResolvedIndex) {
          output += targetText[i];
        } else {
          output += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      element.innerText = output;
    },
    onComplete: () => {
      clearTimeout(timer);
      element.innerText = targetText;
      onComplete?.();
    },
  });
}

// ── GLITCH-SLICE TRIGGER (150-300ms) ─────────────────────────────────────────
export function triggerGlitchSlice(element: HTMLElement, duration = 0.25) {
  if (!element) return;
  element.classList.add("glitch-active");
  gsap.delayedCall(duration, () => {
    element.classList.remove("glitch-active");
  });
}

// ── CRT POWER-ON SEQUENCE (600ms) ────────────────────────────────────────────
export function crtPowerOn(crtElement: HTMLElement, onDone?: () => void) {
  if (!crtElement) return;
  const innerContent = crtElement.querySelector<HTMLElement>(".crt-content");
  const beam = crtElement.querySelector<HTMLElement>(".crt-beam");

  const tl = gsap.timeline({
    onComplete: onDone,
  });

  // State: OFF
  gsap.set(crtElement, { opacity: 0 });
  if (innerContent) gsap.set(innerContent, { opacity: 0 });
  if (beam) gsap.set(beam, { scaleX: 0, scaleY: 0.05, opacity: 0 });

  // 1. CRT powers on - screen lights up dark
  tl.to(crtElement, { opacity: 1, duration: 0.08, ease: "steps(1)" })
    // 2. Beam horizontally expands (thin horizontal line)
    .to(
      beam,
      {
        opacity: 1,
        scaleX: 1,
        duration: 0.18,
        ease: "power3.out",
      },
      "+=0.04"
    )
    // 3. Beam explodes vertically into full raster
    .to(beam, {
      scaleY: 1,
      opacity: 0.2,
      duration: 0.16,
      ease: "power2.inOut",
    })
    // 4. Content flashes in, beam fades out
    .to(
      innerContent,
      {
        opacity: 1,
        duration: 0.12,
        ease: "power1.out",
      },
      "-=0.08"
    )
    .to(beam, { opacity: 0, duration: 0.1 }, "-=0.05");

  return tl;
}

// ── CRT SCROLL GLITCH (200ms) ────────────────────────────────────────────────
export function crtQuickGlitch(crtElement: HTMLElement) {
  if (!crtElement) return;
  const tl = gsap.timeline();
  tl.to(crtElement, {
    x: -3,
    opacity: 0.75,
    duration: 0.05,
    ease: "steps(1)",
  })
    .to(crtElement, {
      x: 2,
      opacity: 1,
      duration: 0.05,
      ease: "steps(1)",
    })
    .to(crtElement, {
      x: 0,
      opacity: 1,
      duration: 0.05,
      ease: "steps(1)",
    });
  return tl;
}

// ── MAGNETIC BUTTON INTERACTION ──────────────────────────────────────────────
export function initMagneticButton(button: HTMLElement, maxDistance = 8) {
  if (!button) return () => {};

  const onMouseMove = (e: MouseEvent) => {
    const rect = button.getBoundingClientRect();
    const btnCenterX = rect.left + rect.width / 2;
    const btnCenterY = rect.top + rect.height / 2;

    const deltaX = e.clientX - btnCenterX;
    const deltaY = e.clientY - btnCenterY;
    const dist = Math.hypot(deltaX, deltaY);

    if (dist < 90) {
      const pullX = (deltaX / 90) * maxDistance;
      const pullY = (deltaY / 90) * maxDistance;
      gsap.to(button, {
        x: pullX,
        y: pullY,
        duration: 0.2,
        ease: "power2.out",
        overwrite: "auto",
      });
    } else {
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.35,
        ease: "elastic.out(1, 0.4)",
        overwrite: "auto",
      });
    }
  };

  const onMouseLeave = () => {
    gsap.to(button, {
      x: 0,
      y: 0,
      duration: 0.35,
      ease: "elastic.out(1, 0.4)",
      overwrite: "auto",
    });
  };

  const onMouseDown = () => {
    gsap.to(button, { scale: 0.94, duration: 0.08, ease: "power1.in" });
  };

  const onMouseUp = () => {
    gsap.to(button, {
      scale: 1,
      duration: 0.2,
      ease: "back.out(2)",
      onComplete: () => {
        triggerGlitchSlice(button, 0.15);
      },
    });
  };

  window.addEventListener("mousemove", onMouseMove);
  button.addEventListener("mouseleave", onMouseLeave);
  button.addEventListener("mousedown", onMouseDown);
  button.addEventListener("mouseup", onMouseUp);

  return () => {
    window.removeEventListener("mousemove", onMouseMove);
    button.removeEventListener("mouseleave", onMouseLeave);
    button.removeEventListener("mousedown", onMouseDown);
    button.removeEventListener("mouseup", onMouseUp);
  };
}

// ── NUMERIC COUNTER INTERPOLATION ────────────────────────────────────────────
export function animateNumericValue(
  element: HTMLElement,
  target: number,
  duration = 1.4,
  padZeros = 0
) {
  if (!element) return;
  const obj = { val: 0 };
  return gsap.to(obj, {
    val: target,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      const cur = Math.floor(obj.val);
      element.innerText = padZeros
        ? String(cur).padStart(padZeros, "0")
        : cur.toLocaleString();
    },
    onComplete: () => {
      element.innerText = padZeros
        ? String(target).padStart(padZeros, "0")
        : target.toLocaleString();
    },
  });
}
