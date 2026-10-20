import { useEffect } from "react";
import "./PlacedCelebration.css";

const COLORS = ["#ffa41b", "#ff6a2b", "#e8253c", "#12925a", "#ffd166", "#ff9f1c"];
// A fixed burst so it looks the same every time: angle, distance, size and spin per piece
const PIECES = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.25;
    const distance = 120 + ((i * 37) % 90);
    return {
        x: Math.round(Math.cos(angle) * distance),
        y: Math.round(Math.sin(angle) * distance * 0.85 - 30),
        r: (i * 67) % 360,
        c: COLORS[i % COLORS.length],
        w: i % 4 === 0 ? 10 : 7,
        round: i % 5 === 0,
    };
});

const DURATION = 1500;

// Full-screen "order placed" moment: a check drawn with SVG strokes, a confetti burst, then it
// fades away to reveal the tracking page. CSS only; callers skip it for reduced motion.
const PlacedCelebration = ({ onDone }) => {
    useEffect(() => {
        const timer = setTimeout(onDone, DURATION);
        return () => clearTimeout(timer);
    }, [onDone]);

    return (
        <div className="placed-fx" role="status" aria-live="polite" onClick={onDone}>
            <div className="placed-fx-stage">
                <span className="placed-fx-confetti" aria-hidden="true">
                    {PIECES.map((p, i) => (
                        <i
                            key={i}
                            className={p.round ? "round" : ""}
                            style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, "--r": `${p.r}deg`, "--c": p.c, "--w": `${p.w}px`, animationDelay: `${420 + (i % 4) * 25}ms` }}
                        />
                    ))}
                </span>
                <span className="placed-fx-disc" aria-hidden="true">
                    <svg viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" pathLength="1" className="placed-fx-ring" />
                        <path d="M37 62 L53 77 L84 45" pathLength="1" className="placed-fx-tick" />
                    </svg>
                </span>
                <strong>Order placed!</strong>
                <span className="placed-fx-sub">Sending it to the kitchen</span>
            </div>
        </div>
    );
};

export default PlacedCelebration;
