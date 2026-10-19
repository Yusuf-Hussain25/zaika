import { useId } from "react";

// Zaika mark: a steaming bowl on a saffron-to-chilli tile.
export const LogoMark = ({ size = 32 }) => {
    const id = useId();
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <defs>
                <linearGradient id={`${id}-g`} x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FFA41B" />
                    <stop offset=".5" stopColor="#FF6A2B" />
                    <stop offset="1" stopColor="#E8253C" />
                </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9.5" fill={`url(#${id}-g)`} />
            <path d="M6.5 15.5h19a9.5 9.5 0 0 1-19 0Z" fill="#fff" />
            <path d="M12.5 26.2h7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M11.5 12c-1-1.3.9-2.3 0-3.8M16 12c-1-1.3.9-2.3 0-3.8M20.5 12c-1-1.3.9-2.3 0-3.8" stroke="#fff" strokeOpacity=".9" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
};

const Logo = ({ size = 32, showText = true, suffix }) => (
    <span className="logo">
        <LogoMark size={size} />
        {showText && (
            <span className="logo-text" style={{ fontSize: size * 0.66 }}>
                Zaika
                {suffix && <span className="logo-suffix">{suffix}</span>}
            </span>
        )}
    </span>
);

export default Logo;
