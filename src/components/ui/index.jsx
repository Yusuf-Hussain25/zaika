import { useEffect, useRef } from "react";
import { Minus, Plus, X } from "lucide-react";
import { initials } from "../../lib/format";
import { ORDER_STATUS } from "../../../shared/menu";
import "./ui.css";

const hue = (text = "") => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 17);

export const Avatar = ({ name, size = 36 }) => (
    <span
        className="avatar"
        style={{ width: size, height: size, fontSize: size * 0.38, "--h": hue(name) }}
        aria-hidden="true"
    >
        {initials(name)}
    </span>
);

// Indian food-labelling mark: green square-dot for veg, red triangle for non-veg
export const VegMark = ({ veg, size = 16 }) => (
    <span className={`veg-mark ${veg ? "veg" : "nonveg"}`} style={{ width: size, height: size }} role="img" aria-label={veg ? "Vegetarian" : "Non-vegetarian"} title={veg ? "Vegetarian" : "Non-vegetarian"}>
        <span />
    </span>
);

export const QtyStepper = ({ value, onAdd, onRemove, name = "item", size = "md", disabled }) => (
    <div className={`stepper stepper-${size}`}>
        <button type="button" onClick={onRemove} aria-label={`Remove one ${name}`} disabled={disabled}>
            <Minus size={size === "sm" ? 14 : 16} strokeWidth={2.4} />
        </button>
        <span className="num" aria-live="polite" aria-label={`${value} in cart`}>{value}</span>
        <button type="button" onClick={onAdd} aria-label={`Add one more ${name}`} disabled={disabled || value >= 50}>
            <Plus size={size === "sm" ? 14 : 16} strokeWidth={2.4} />
        </button>
    </div>
);

const STATUS_TONE = {
    awaiting_payment: "warning",
    placed: "info",
    preparing: "warning",
    out_for_delivery: "accent",
    delivered: "success",
    cancelled: "muted",
};

export const StatusPill = ({ status, short }) => (
    <span className={`status-pill tone-${STATUS_TONE[status] || "muted"}`}>
        <span className="dot" />
        {short ? ORDER_STATUS[status]?.short : ORDER_STATUS[status]?.label ?? status}
    </span>
);

export const EmptyState = ({ icon: Icon, title, children, action }) => (
    <div className="empty-state fade-up">
        {Icon && (
            <span className="empty-icon">
                <Icon size={26} strokeWidth={1.8} />
            </span>
        )}
        <h3>{title}</h3>
        {children && <p>{children}</p>}
        {action}
    </div>
);

// Native <dialog>: focus trap, Esc to close and top-layer stacking for free.
const useDialog = (open, onClose) => {
    const ref = useRef(null);
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);
    const props = {
        ref,
        onCancel: (e) => {
            e.preventDefault();
            onClose?.();
        },
        // A click on the dialog element itself (not its content) is a click on the backdrop
        onClick: (e) => e.target === e.currentTarget && onClose?.(),
    };
    return props;
};

export const Modal = ({ open, onClose, title, children, footer, size = "md", className = "" }) => {
    const props = useDialog(open, onClose);
    return (
        <dialog {...props} className={`modal modal-${size} ${className}`} aria-label={typeof title === "string" ? title : undefined}>
            {open && (
                <div className="modal-inner">
                    {title !== undefined && (
                        <header className="modal-head">
                            <h2>{title}</h2>
                            <button type="button" className="icon-btn sm" onClick={onClose} aria-label="Close">
                                <X size={18} />
                            </button>
                        </header>
                    )}
                    <div className="modal-body">{children}</div>
                    {footer && <footer className="modal-foot">{footer}</footer>}
                </div>
            )}
        </dialog>
    );
};

export const Drawer = ({ open, onClose, title, children, footer, side = "right" }) => {
    const props = useDialog(open, onClose);
    return (
        <dialog {...props} className={`drawer drawer-${side}`} aria-label={typeof title === "string" ? title : undefined}>
            {open && (
                <div className="drawer-inner">
                    <header className="modal-head">
                        <h2>{title}</h2>
                        <button type="button" className="icon-btn sm" onClick={onClose} aria-label="Close">
                            <X size={18} />
                        </button>
                    </header>
                    <div className="drawer-body">{children}</div>
                    {footer && <footer className="modal-foot">{footer}</footer>}
                </div>
            )}
        </dialog>
    );
};

export const Switch = ({ checked, onChange, label, disabled }) => (
    <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
    />
);
