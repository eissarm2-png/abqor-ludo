import { useCallback, useEffect, useRef, useState } from "react";

export type ZoomView = { scale: number; x: number; y: number };

const MIN = 0.6;
const MAX = 2.6;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * تكبير/تصغير وتمرير باللمس (Pinch + Pan) وبعجلة الفأرة، مع الحفاظ على
 * نقطة اللمس ثابتة حتى لا تتغيّر محاذاة الأحجار أو اتجاهها.
 * كل التحديثات تُطبّق على transform فقط (طبقة GPU) للحفاظ على 60fps.
 */
export function usePinchZoom<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const view = useRef<ZoomView>({ scale: 1, x: 0, y: 0 });
  const [zoomed, setZoomed] = useState(false);
  const frame = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; cx: number; cy: number; scale: number } | null>(null);

  const paint = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = ref.current;
      if (!el) return;
      const { scale, x, y } = view.current;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    });
  }, []);

  const apply = useCallback(
    (next: ZoomView) => {
      view.current = next;
      setZoomed(Math.abs(next.scale - 1) > 0.02 || Math.abs(next.x) > 2 || Math.abs(next.y) > 2);
      paint();
    },
    [paint],
  );

  const reset = useCallback(() => apply({ scale: 1, x: 0, y: 0 }), [apply]);

  /** تكبير حول نقطة محدّدة داخل الحاوية */
  const zoomAt = useCallback(
    (nextScale: number, px: number, py: number) => {
      const { scale, x, y } = view.current;
      const s = clamp(nextScale, MIN, MAX);
      const k = s / scale;
      apply({ scale: s, x: px - (px - x) * k, y: py - (py - y) * k });
    },
    [apply],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const host = el.parentElement ?? el;

    const local = (clientX: number, clientY: number) => {
      const rect = host.getBoundingClientRect();
      return { px: clientX - rect.left - rect.width / 2, py: clientY - rect.top - rect.height / 2 };
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const { px, py } = local(e.clientX, e.clientY);
      zoomAt(view.current.scale * Math.exp(-dy * 0.0018), px, py);
    };

    const onDown = (e: PointerEvent) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        gesture.current = {
          dist: Math.hypot(a!.x - b!.x, a!.y - b!.y),
          cx: (a!.x + b!.x) / 2,
          cy: (a!.y + b!.y) / 2,
          scale: view.current.scale,
        };
      }
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size >= 2 && gesture.current) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        const { px, py } = local(gesture.current.cx, gesture.current.cy);
        zoomAt((gesture.current.scale * dist) / gesture.current.dist, px, py);
        return;
      }
      // تمرير بإصبع واحد فقط عند التكبير حتى لا يتعارض مع اختيار الأحجار
      if (view.current.scale > 1.02) {
        const { scale, x, y } = view.current;
        apply({ scale, x: x + (e.clientX - prev.x), y: y + (e.clientY - prev.y) });
      }
    };

    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) gesture.current = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [apply, zoomAt]);

  const zoomBy = useCallback(
    (factor: number) => zoomAt(view.current.scale * factor, 0, 0),
    [zoomAt],
  );

  return { ref, zoomed, reset, zoomBy };
}
