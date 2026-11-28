// Line icons for the dashboard shell and cards. They draw in currentColor.

type IconProps = { size?: number; className?: string };

function Svg({ size = 20, className, children }: IconProps & { children: React.ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            {children}
        </svg>
    );
}

export const CalendarIcon = (p: IconProps) => (
    <Svg {...p}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/>
        <path d="M8 3v4M16 3v4M3.5 10h17"/>
    </Svg>
);

export const GridIcon = (p: IconProps) => (
    <Svg {...p}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1"/>
        <rect x="13.5" y="3.5" width="7" height="4.5" rx="1"/>
        <rect x="13.5" y="11" width="7" height="9.5" rx="1"/>
        <rect x="3.5" y="13.5" width="7" height="7" rx="1"/>
    </Svg>
);

export const ClockIcon = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="8.5"/>
        <path d="M12 7.5V12l3 2"/>
    </Svg>
);

export const PinIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/>
        <circle cx="12" cy="10" r="2.5"/>
    </Svg>
);

export const PersonIcon = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="12" cy="8" r="4"/>
        <path d="M5 20.5c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5"/>
    </Svg>
);

export const WalletIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M4 7h14.5A1.5 1.5 0 0 1 20 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V7Zm0 0V5.5A1.5 1.5 0 0 1 5.5 4H16v3"/>
        <path d="M16 13.5h.01"/>
    </Svg>
);

export const LogoutIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h10"/>
    </Svg>
);

export const SearchIcon = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="11" cy="11" r="7"/>
        <path d="m20 20-3.5-3.5"/>
    </Svg>
);

export const BellIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0"/>
    </Svg>
);

export const PhoneIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M5 4h3l1.5 4.5-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2L20 16v3a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 0 1 5 4Z"/>
    </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="m9 5 7 7-7 7"/>
    </Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M4 12h16M14 6l6 6-6 6"/>
    </Svg>
);

export const CalendarPlusIcon = (p: IconProps) => (
    <Svg {...p}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="currentColor" stroke="none"/>
        <path d="M8 3v4M16 3v4" />
        <path d="M3.5 10h17" stroke="#fff"/>
        <path d="M12 12.5v5M9.5 15h5" stroke="#fff"/>
    </Svg>
);
