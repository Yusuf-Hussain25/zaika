import { useId, useState } from "react";
import { Check, Flame } from "lucide-react";
import { toast } from "sonner";
import { Modal, QtyStepper, VegMark } from "../ui";
import { useStore } from "../../context/StoreContext";
import { formatPrice } from "../../lib/format";
import { optimizedImage } from "../../lib/upload";
import { SPICE_LEVELS, cleanChoice, optionsLabel, snapshotChoice, unitPrice } from "../../../shared/menu";
import "./CustomiseSheet.css";

// A titled group of choices; `radio` makes it a radiogroup named by its title
const Section = ({ title, hint, className, radio = false, children }) => {
    const id = useId();
    return (
        <section className="cs-section">
            <h3 id={id}>
                {title}
                <span>{hint}</span>
            </h3>
            <div className={className} role={radio ? "radiogroup" : "group"} aria-labelledby={id}>
                {children}
            </div>
        </section>
    );
};

const CustomiseDialog = ({ food, choice: initial, onClose }) => {
    const { addItem } = useStore();
    const [choice, setChoice] = useState(() => cleanChoice(food, initial));
    const [qty, setQty] = useState(1);
    const o = food.options;
    const unit = unitPrice(food, choice);
    const set = (patch) => setChoice((c) => cleanChoice(food, { ...c, ...patch }));
    const toggleAddon = (id) => set({ addons: choice.addons.includes(id) ? choice.addons.filter((a) => a !== id) : [...choice.addons, id] });

    const submit = () => {
        addItem(food, choice, qty);
        toast.success(`${qty > 1 ? `${qty} × ` : ""}${food.name} added`, { description: optionsLabel(snapshotChoice(food, choice)) });
        onClose();
    };

    return (
        <Modal
            open
            onClose={onClose}
            className="customise-sheet"
            title={food.name}
            footer={
                <>
                    <QtyStepper value={qty} onAdd={() => setQty((q) => Math.min(q + 1, 20))} onRemove={() => setQty((q) => Math.max(q - 1, 1))} name={food.name} />
                    <button type="button" className="btn btn-primary btn-lg cs-submit" onClick={submit}>
                        Add to cart <span className="num">{formatPrice(unit * qty)}</span>
                    </button>
                </>
            }
        >
            <div className="cs-hero">
                <img src={optimizedImage(food.imageUrl, 240)} alt="" />
                <div>
                    <VegMark veg={food.isVeg} size={14} />
                    <p>{food.description}</p>
                </div>
            </div>

            {o.halfPrice && (
                <Section title="Portion" hint="Pick one" className="cs-portions" radio>
                    {[
                        { id: "half", label: "Half", sub: "Serves 1", price: o.halfPrice },
                        { id: "full", label: "Full", sub: "Serves 2", price: food.price },
                    ].map((p) => (
                        <button key={p.id} type="button" role="radio" aria-checked={choice.portion === p.id} className="cs-portion" onClick={() => set({ portion: p.id })}>
                            <span className="cs-radio" aria-hidden="true" />
                            <span className="cs-portion-text">
                                <strong>{p.label}</strong>
                                <small>{p.sub}</small>
                            </span>
                            <span className="num">{formatPrice(p.price)}</span>
                        </button>
                    ))}
                </Section>
            )}

            {o.spice && (
                <Section title="Spice level" hint="Pick one" className="cs-spice" radio>
                    {SPICE_LEVELS.map((s, i) => (
                        <button key={s.id} type="button" role="radio" aria-checked={choice.spice === s.id} className={`cs-spice-btn level-${i + 1}`} onClick={() => set({ spice: s.id })}>
                            <span className="cs-flames" aria-hidden="true">
                                {SPICE_LEVELS.map((_, f) => (
                                    <Flame key={f} size={14} className={f <= i ? "on" : ""} />
                                ))}
                            </span>
                            {s.label}
                        </button>
                    ))}
                </Section>
            )}

            {o.addons?.length > 0 && (
                <Section title="Add-ons" hint="Optional" className="cs-addons">
                    {o.addons.map((a) => {
                        const on = choice.addons.includes(a.id);
                        return (
                            <label key={a.id} className={`cs-addon ${on ? "is-on" : ""}`}>
                                <input type="checkbox" checked={on} onChange={() => toggleAddon(a.id)} />
                                <span className="cs-check" aria-hidden="true">
                                    <Check size={13} strokeWidth={3} />
                                </span>
                                <span className="cs-addon-label">{a.label}</span>
                                <span className="num">{a.price ? `+${formatPrice(a.price)}` : "Free"}</span>
                            </label>
                        );
                    })}
                </Section>
            )}
        </Modal>
    );
};

// Bottom sheet (dialog on desktop) for dishes with options. Opened through useStore().customise().
const CustomiseSheet = () => {
    const { customising, closeCustomise } = useStore();
    if (!customising) return null;
    return <CustomiseDialog key={customising.food.id} food={customising.food} choice={customising.choice} onClose={closeCustomise} />;
};

export default CustomiseSheet;
