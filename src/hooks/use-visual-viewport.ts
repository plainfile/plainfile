import { useEffect } from "react";

/**
 * Keeps the currently focused text input visible when the on-screen keyboard
 * appears on mobile devices. Uses window.visualViewport when available and
 * falls back to a simple scroll-into-view on focus.
 */
export function useVisualViewportScroll(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;
    let lastFocused: Element | null = null;

    const isTextual = (element: Element | null): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) return false;
      return (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element.isContentEditable
      );
    };

    const keepVisible = (): void => {
      const element = lastFocused ?? document.activeElement;
      if (!isTextual(element)) return;

      const rect = element.getBoundingClientRect();
      const viewportHeight = viewport ? viewport.height : window.innerHeight;
      const bottomGap = viewportHeight - rect.bottom;

      if (bottomGap < 24) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    const handleFocus = (event: FocusEvent): void => {
      const target = event.target as Element | null;
      if (!isTextual(target)) return;
      lastFocused = target;
      // Delay to let the keyboard animation / layout settle.
      window.setTimeout(() => keepVisible(), 100);
    };

    document.addEventListener("focusin", handleFocus);
    if (viewport) {
      viewport.addEventListener("resize", keepVisible);
      viewport.addEventListener("scroll", keepVisible);
    }

    return () => {
      document.removeEventListener("focusin", handleFocus);
      if (viewport) {
        viewport.removeEventListener("resize", keepVisible);
        viewport.removeEventListener("scroll", keepVisible);
      }
    };
  }, []);
}
