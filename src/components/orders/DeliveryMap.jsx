import { useEffect, useRef } from "react";
import { Bike, ChefHat, House } from "lucide-react";
import { useNow } from "../../lib/useNow";
import { formatTime } from "../../lib/format";
import "./DeliveryMap.css";

const W = 400;
const H = 240;
const MIN_RIDE = 8 * 60000;
// Until the kitchen marks it delivered, the rider never quite reaches the door
const MAX_EN_ROUTE = 0.95;

// Routes follow the streets drawn below; each order always gets the same one
const ROUTES = [
    { d: "M90 200 V145 Q90 130 105 130 H295 Q310 130 310 115 V60", from: [90, 200], to: [310, 60] },
    { d: "M310 200 V145 Q310 130 295 130 H215 Q200 130 200 115 V75 Q200 60 185 60 H90", from: [310, 200], to: [90, 60] },
    { d: "M90 60 H185 Q200 60 200 75 V185 Q200 200 215 200 H310", from: [90, 60], to: [310, 200] },
];

const STREETS_X = [90, 200, 310];
const STREETS_Y = [60, 130, 200];
// City blocks: the gaps between streets, inset so the streets show through
const BLOCKS = [];
for (const [x0, x1] of [[0, 90], [90, 200], [200, 310], [310, W]]) {
    for (const [y0, y1] of [[0, 60], [60, 130], [130, 200], [200, H]]) {
        BLOCKS.push({ x: x0 + 9, y: y0 + 9, w: x1 - x0 - 18, h: y1 - y0 - 18 });
    }
}
const PARK = 5; // index of the block drawn as a park

// Pins in the lower half get their label above, so it never runs off the map
const tagSide = ([, y]) => (y > H / 2 ? "is-above" : "");

const pct = ([x, y]) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

// How far along the rider is: time since pickup over the time left until the promised arrival
// (at least 8 minutes, so a late pickup still gets a believable ride)
// eslint-disable-next-line react-refresh/only-export-components -- shared with the order page's ETA box
export const riderProgress = (order, etaMinutes = 35, now = Date.now()) => {
    const picked = order.events.find((e) => e.status === "out_for_delivery")?.at ?? order.updatedAt;
    const outAt = new Date(picked).getTime();
    const promised = new Date(order.createdAt).getTime() + etaMinutes * 60000;
    const ride = Math.max(promised - outAt, MIN_RIDE);
    const arrival = new Date(outAt + ride);
    if (order.status === "delivered") return { progress: 1, minutesLeft: 0, arrival };
    const progress = Math.min(Math.max((now - outAt) / ride, 0), MAX_EN_ROUTE);
    const minutesLeft = progress >= MAX_EN_ROUTE ? 0 : Math.max(1, Math.ceil((arrival.getTime() - now) / 60000));
    return { progress, minutesLeft, arrival };
};

const DeliveryMap = ({ order, etaMinutes, compact = false }) => {
    const now = useNow(3000);
    const route = ROUTES[order.number % ROUTES.length];
    const { progress, minutesLeft, arrival } = riderProgress(order, etaMinutes, now);
    const pathRef = useRef(null);
    const doneRef = useRef(null);
    const riderRef = useRef(null);
    const placed = useRef(false);

    // Positioned imperatively: getPointAtLength needs the rendered path, and the CSS transition
    // glides the rider between 3s ticks. Reduced motion turns the transitions off globally.
    useEffect(() => {
        const path = pathRef.current;
        const rider = riderRef.current;
        const canvas = rider.parentElement;
        const length = path.getTotalLength();
        const move = (p) => {
            const { x, y } = path.getPointAtLength(length * p);
            Object.assign(rider.style, pct([x, y]));
            doneRef.current.style.strokeDashoffset = String(1 - p);
        };
        if (placed.current) {
            move(progress);
            return;
        }
        // First paint: start at the kitchen, then ride out to the current position
        canvas.classList.add("is-still");
        move(0);
        const frame = requestAnimationFrame(() => {
            placed.current = true;
            canvas.classList.remove("is-still");
            canvas.classList.add("is-intro");
            move(progress);
            setTimeout(() => canvas.classList.remove("is-intro"), 1400);
        });
        // Only undo an intro that never started (StrictMode remount, or unmount within a frame)
        return () => {
            cancelAnimationFrame(frame);
            if (!placed.current) canvas.classList.remove("is-still");
        };
    }, [progress, route]);

    const label = minutesLeft ? `Rider is about ${minutesLeft} min away` : progress === 1 ? "Delivered" : "Rider is arriving any minute";

    return (
        <figure className={`dmap ${compact ? "is-compact" : ""}`}>
            <div className="dmap-canvas" role="img" aria-label={`Delivery map. ${label}.`}>
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                    <rect width={W} height={H} className="dmap-land" />
                    <path d="M-10 168 C 70 150, 120 236, 210 222 S 340 160, 410 186" className="dmap-river" />
                    {BLOCKS.map((b, i) => (
                        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="7" className={i === PARK ? "dmap-park" : "dmap-block"} />
                    ))}
                    {STREETS_X.map((x) => (
                        <line key={`x${x}`} x1={x} y1="0" x2={x} y2={H} className="dmap-street" />
                    ))}
                    {STREETS_Y.map((y) => (
                        <line key={`y${y}`} x1="0" y1={y} x2={W} y2={y} className="dmap-street" />
                    ))}
                    <path d={route.d} className="dmap-route" />
                    <path ref={doneRef} d={route.d} pathLength="1" className="dmap-route-done" />
                    <path ref={pathRef} d={route.d} fill="none" stroke="none" />
                </svg>
                {/* The rider starts on top of the kitchen, so its pin steps aside until the rider leaves */}
                <span className={`dmap-pin is-kitchen ${progress < 0.06 ? "is-covered" : ""}`} style={pct(route.from)} aria-hidden="true">
                    <ChefHat size={compact ? 13 : 15} />
                </span>
                <span className="dmap-pin is-home" style={pct(route.to)} aria-hidden="true">
                    <House size={compact ? 13 : 15} />
                </span>
                {!compact && (
                    <>
                        <em className={`dmap-tag ${tagSide(route.from)}`} style={pct(route.from)} aria-hidden="true">Zaika kitchen</em>
                        <em className={`dmap-tag ${tagSide(route.to)}`} style={pct(route.to)} aria-hidden="true">You</em>
                    </>
                )}
                <span ref={riderRef} className="dmap-rider" style={pct(route.from)} aria-hidden="true">
                    <Bike size={compact ? 14 : 17} />
                </span>
            </div>
            <figcaption className="dmap-foot">
                <Bike size={16} />
                <strong>{label}</strong>
                {compact && progress < 1 && <span className="num">Arriving by {formatTime(arrival)}</span>}
            </figcaption>
        </figure>
    );
};

export default DeliveryMap;
