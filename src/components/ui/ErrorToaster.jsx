import { useEffect, useState } from "react";
import { API_ERROR_EVENT } from "../../api/httpClient";
import { Glyph } from "./Glyph";
import { IconButton } from "./IconButton";
import "./ErrorToaster.css";

const SHOW_MS = 6000;
let nextId = 1;

/**
 * Pops up the `message` of every failed API call (httpClient announces
 * them), so an error is visible even when the page's own inline error box
 * is scrolled out of view or hidden behind a modal.
 */
export function ErrorToaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onError = (e) => {
      const id = nextId++;
      const message = e.detail?.message;
      setToasts((prev) => [...prev.filter((t) => t.message !== message), { id, message }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), SHOW_MS);
    };
    window.addEventListener(API_ERROR_EVENT, onError);
    return () => window.removeEventListener(API_ERROR_EVENT, onError);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toaster" role="alert" aria-live="assertive">
      {toasts.map((t) => (
        <div key={t.id} className="toaster__item">
          <span className="toaster__icon" aria-hidden="true">
            <Glyph name="alert" size={18} />
          </span>
          <span className="toaster__content">
            <span className="toaster__title">Request failed</span>
            <span className="toaster__text">{t.message}</span>
          </span>
          <IconButton
            icon="close"
            label="Dismiss"
            tone="ghost"
            size={14}
            className="toaster__close"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
          <span className="toaster__timer" style={{ animationDuration: `${SHOW_MS}ms` }} aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
