import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";

export interface PopoverProps {
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  /** Open-state callback. */
  onOpenChange?: (open: boolean) => void;
  /**
   * ms to wait before auto-opening the popover (the "take over the
   * screen" behavior). 0 disables auto-open. Default 0.
   */
  timer?: number;
  /** Title shown at the top. */
  title?: ReactNode;
  /** Body content (typically a form). */
  children?: ReactNode;
  /**
   * Small dismissal link rendered under the body. Pass `false` to
   * hide. Default "Maybe later".
   */
  closeLabel?: ReactNode | false;
  /**
   * Allow the Escape key to close. Default false — the popover is
   * obtrusive by design.
   */
  closeOnEscape?: boolean;
  /**
   * Allow clicks on the backdrop to close. Default false.
   */
  closeOnBackdrop?: boolean;
  /**
   * Render target for the portal. Defaults to document.body so the
   * popover takes over the full viewport.
   */
  container?: HTMLElement | null;
  className?: string;
}

/**
 * The conversion-killing newsletter modal that every AI startup ships.
 * Takes over the entire screen, blurs everything behind it, and
 * specifically does NOT close on Escape or backdrop click by default.
 *
 * Submit a child form (e.g. WaitlistForm) and have its `onSubmit`
 * close the popover, or use the dismissal link at the bottom.
 *
 *     <Popover
 *       timer={5000}
 *       title="Subscribe to my newsletter"
 *       closeLabel="No thanks, I haven't raised my seed round yet."
 *     >
 *       <WaitlistForm onSubmit={…} />
 *     </Popover>
 */
export function Popover({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  timer = 0,
  title,
  children,
  closeLabel = "Maybe later",
  closeOnEscape = false,
  closeOnBackdrop = false,
  container,
  className,
}: PopoverProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  // Auto-open after `timer` ms. Fires once per mount (we don't re-arm
  // after the user dismisses, which would be sociopathic).
  useEffect(() => {
    if (timer <= 0 || open) return;
    const id = setTimeout(() => setOpen(true), timer);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional Escape-to-close.
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closeOnEscape]);

  // Swallow consumer-app hotkeys (e.g. the docs site's "[" / "]"
  // navigation) while the popover is open. Capture phase so we run
  // before any other document keydown listeners.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return; // never block typing inside form fields
      }
      const blocked = ["[", "]", "j", "k", "ArrowLeft", "ArrowRight"];
      if (blocked.includes(e.key)) {
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKey, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKey, { capture: true });
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  const target =
    container ?? (typeof document !== "undefined" ? document.body : null);
  if (!target) return null;

  return createPortal(
    <div className="pui-popover-overlay" role="dialog" aria-modal="true" aria-labelledby="popover-title" aria-describedby="popover-description">
      <div
        className="pui-popover-backdrop"
        aria-hidden="true"
        onClick={closeOnBackdrop ? () => setOpen(false) : undefined}
      />
      <div className={cn("pui-popover", className)}>
        {title && <div className="pui-popover__title">{title}</div>}
        <div className="pui-popover__body">{children}</div>
        {closeLabel !== false && (
          <button
            type="button"
            className="pui-popover__dismiss"
            onClick={() => setOpen(false)}
          >
            {closeLabel}
          </button>
        )}
      </div>
    </div>,
    target,
  );
}
Popover.displayName = "Popover";
