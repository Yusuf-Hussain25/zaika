import { useEffect, useRef, useState } from "react";
import { formatCompactPrice, formatPrice, plural } from "../../lib/format";

const HEIGHT = 230;
const PAD = { top: 12, right: 8, bottom: 30, left: 48 };

// Clean axis maximum and step (1, 2, 2.5 or 5 × 10^k) for about four gridlines
const niceScale = (max) => {
    if (max <= 0) return { top: 1000, step: 250 };
    const raw = max / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    return { top: Math.ceil(max / step) * step, step };
};

const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric" });
const weekday = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
const fullDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

// Daily revenue as columns: one series, so the title names it and no legend is needed
const RevenueChart = ({ series }) => {
    const wrap = useRef(null);
    const [width, setWidth] = useState(640);
    const [hover, setHover] = useState(null);

    useEffect(() => {
        const el = wrap.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const { top, step } = niceScale(Math.max(...series.map((d) => d.revenue)));
    const band = innerW / series.length;
    const barW = Math.min(24, band * 0.62);
    const y = (v) => PAD.top + innerH - (v / top) * innerH;
    const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
    const sparse = width < 520;
    const lastIndex = series.length - 1;

    // Column with a 4px rounded data end and a square foot on the baseline
    const barPath = (x, v) => {
        const h = Math.max(0, (v / top) * innerH);
        if (h === 0) return "";
        const r = Math.min(4, h, barW / 2);
        const yTop = PAD.top + innerH - h;
        const base = PAD.top + innerH;
        return `M${x},${base} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${base} Z`;
    };

    const tip = hover !== null ? series[hover] : null;
    const tipX = hover !== null ? PAD.left + band * hover + band / 2 : 0;

    return (
        <div className="rev-chart" ref={wrap}>
            <svg width={width} height={HEIGHT} role="img" aria-label="Daily revenue for the last 14 days">
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="rev-grid" />
                        <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="rev-axis">
                            {formatCompactPrice(t)}
                        </text>
                    </g>
                ))}
                {series.map((d, i) => {
                    const x = PAD.left + band * i + (band - barW) / 2;
                    const show = !sparse || i % 2 === lastIndex % 2;
                    return (
                        <g key={d.day}>
                            <path d={barPath(x, d.revenue)} className={`rev-bar ${hover === i ? "is-hover" : ""} ${hover !== null && hover !== i ? "is-dim" : ""}`} />
                            {show && (
                                <text x={PAD.left + band * i + band / 2} y={HEIGHT - 10} textAnchor="middle" className={`rev-axis ${i === lastIndex ? "is-today" : ""}`}>
                                    {i === lastIndex ? "Today" : `${weekday(d.day).slice(0, 2)} ${dayLabel(d.day)}`}
                                </text>
                            )}
                            {/* Hit target: the full column band, bigger than the bar */}
                            <rect
                                x={PAD.left + band * i}
                                y={PAD.top}
                                width={band}
                                height={innerH}
                                fill="transparent"
                                tabIndex={0}
                                aria-label={`${fullDate(d.day)}: ${formatPrice(d.revenue)} from ${plural(d.orders, "order")}`}
                                onMouseEnter={() => setHover(i)}
                                onMouseLeave={() => setHover(null)}
                                onFocus={() => setHover(i)}
                                onBlur={() => setHover(null)}
                                className="rev-hit"
                            />
                        </g>
                    );
                })}
            </svg>
            {tip && (
                <div className="chart-tip" style={{ left: Math.min(Math.max(tipX, 80), width - 80), top: Math.max(y(tip.revenue) - 12, 8) }} role="tooltip">
                    <span>{fullDate(tip.day)}</span>
                    <strong className="num">{formatPrice(tip.revenue)}</strong>
                    <span>{plural(tip.orders, "order")}</span>
                </div>
            )}
            <table className="sr-only">
                <caption>Daily revenue, last 14 days</caption>
                <thead>
                    <tr>
                        <th>Day</th>
                        <th>Revenue</th>
                        <th>Orders</th>
                    </tr>
                </thead>
                <tbody>
                    {series.map((d) => (
                        <tr key={d.day}>
                            <td>{fullDate(d.day)}</td>
                            <td>{formatPrice(d.revenue)}</td>
                            <td>{d.orders}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RevenueChart;
