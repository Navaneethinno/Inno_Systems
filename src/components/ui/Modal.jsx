import { useEffect } from "react";
import { IconButton } from "./IconButton";
import "./Modal.css";

export function Modal({ title, subtitle, onClose, children, footer, width = 480 }) {
  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal__overlay" onMouseDown={onClose}>
      <div
        className="modal__panel"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
      >
        <div className="modal__header">
          <div className="modal__heading">
            <h3 className="modal__title">{title}</h3>
            {subtitle && <p className="modal__subtitle">{subtitle}</p>}
          </div>
          <IconButton icon="close" label="Close" tone="ghost" size={18} className="modal__close" onClick={onClose} />
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
