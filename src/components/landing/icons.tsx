// Icons from the Lemmido mobile design export, with the export's layers combined into
// one SVG each. They draw in currentColor so they work on red and on white.
// Social and location icons aren't in the export; they follow the same style.

type IconProps = { size?: number; className?: string };

function Svg({ size = 16, className, viewBox, children }: IconProps & { viewBox: string; children: React.ReactNode }) {
    return (
        <svg width={size} height={size} viewBox={viewBox} fill="none" aria-hidden="true" className={className}>
            {children}
        </svg>
    );
}

export function ArrowRight(props: IconProps) {
    return (
        <Svg viewBox="0 0 12 10" {...props}>
            <path d="M0 4.58854H10.72M6.7 8.60854L10.72 4.58854L6.7 0.568542" strokeWidth="1.608" stroke="currentColor" />
        </Svg>
    );
}

export function ArrowLeft(props: IconProps) {
    return (
        <Svg viewBox="0 0 12 9" {...props}>
            <path d="M11.1491 4.31467H1.06909M4.84909 8.09467L1.06909 4.31467L4.84909 0.534668" strokeWidth="1.512" stroke="currentColor" />
        </Svg>
    );
}

export function Calendar(props: IconProps) {
    return (
        <Svg viewBox="0 0 14 14" {...props}>
            <path d="M2.68 1.67H10.72C11.83 1.67 12.73 2.57 12.73 3.68V10.38C12.73 11.49 11.83 12.39 10.72 12.39H2.68C1.57 12.39 0.67 11.49 0.67 10.38V3.68C0.67 2.57 1.57 1.67 2.68 1.67Z" strokeWidth="1.34" stroke="currentColor" />
            <path d="M4.02 0V2.68M9.38 0V2.68M0.67 5.36H12.73" strokeWidth="1.34" stroke="currentColor" />
        </Svg>
    );
}

export function Phone(props: IconProps) {
    return (
        <Svg viewBox="0 0 24 24" {...props}>
            <path
                d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z"
                fill="currentColor"
            />
        </Svg>
    );
}

export function Mail(props: IconProps) {
    return (
        <Svg viewBox="0 0 17 13" {...props}>
            <path d="M16.9091 2.54281V2.41558C16.9091 1.77493 16.6546 1.16052 16.2016 0.707508C15.7486 0.254498 15.1342 0 14.4935 0H2.41558C1.77493 0 1.16052 0.254498 0.707508 0.707508C0.254498 1.16052 0 1.77493 0 2.41558V2.54281L7.82166 7.35626C8.01199 7.47336 8.23108 7.53535 8.45455 7.53535C8.67801 7.53535 8.8971 7.47336 9.08743 7.35626L16.9091 2.54281Z" fill="currentColor" />
            <path transform="translate(0 3.5)" d="M0 0V6.90857C0 7.54922 0.254498 8.16364 0.707508 8.61665C1.16052 9.06966 1.77493 9.32416 2.41558 9.32416H14.4935C15.1342 9.32416 15.7486 9.06966 16.2016 8.61665C16.6546 8.16364 16.9091 7.54922 16.9091 6.90857V0L9.72031 4.42294C9.33965 4.65713 8.90148 4.78112 8.45455 4.78112C8.00761 4.78112 7.56944 4.65713 7.18878 4.42294L0 0Z" fill="currentColor" />
        </Svg>
    );
}

export function MapPin(props: IconProps) {
    return (
        <Svg viewBox="0 0 24 24" {...props}>
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" fill="currentColor" />
        </Svg>
    );
}

export function Search(props: IconProps) {
    return (
        <Svg viewBox="0 0 24 24" {...props}>
            <circle cx="11" cy="11" r="7" strokeWidth="2" stroke="currentColor" />
            <path d="M20 20L16 16" strokeWidth="2" strokeLinecap="round" stroke="currentColor" />
        </Svg>
    );
}

export function User(props: IconProps) {
    return (
        <Svg viewBox="0 0 24 24" {...props}>
            <circle cx="12" cy="8" r="4" fill="currentColor" />
            <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" fill="currentColor" />
        </Svg>
    );
}

// Feature icons (white on the red circles)

export function Shield(props: IconProps) {
    return (
        <Svg viewBox="0 0 18 21" {...props}>
            <path d="M9 1.06812L17 4.06812V10.0681C17 15.0681 13.5 18.0681 9 19.0681C4.5 18.0681 1 15.0681 1 10.0681V4.06812L9 1.06812Z" strokeWidth="2" stroke="currentColor" />
            <path transform="translate(4.5 6.2)" d="M0.707153 3.16895L3.20715 5.66895L7.70715 0.668945" strokeWidth="2" stroke="currentColor" />
        </Svg>
    );
}

export function Booking(props: IconProps) {
    return (
        <Svg viewBox="0 0 20 22" {...props}>
            <path transform="translate(0 4)" d="M4 1H16C17.6569 1 19 2.34315 19 4V14C19 15.6569 17.6569 17 16 17H4C2.34315 17 1 15.6569 1 14V4C1 2.34315 2.34315 1 4 1Z" strokeWidth="2" stroke="currentColor" />
            <path transform="translate(1 2)" d="M5 0V4M13 0V4M0 7H18" strokeWidth="2" stroke="currentColor" />
        </Svg>
    );
}

export function Headset(props: IconProps) {
    return (
        <Svg viewBox="0 0 18 18" {...props}>
            <path d="M1 11V9C1 6.87827 1.84285 4.84344 3.34315 3.34315C4.84344 1.84285 6.87827 1 9 1C11.1217 1 13.1566 1.84285 14.6569 3.34315C16.1571 4.84344 17 6.87827 17 9V11" strokeWidth="2" stroke="currentColor" />
            <path transform="translate(0 9)" d="M3 1C4.10457 1 5 1.89543 5 3V5C5 6.10457 4.10457 7 3 7C1.89543 7 1 6.10457 1 5V3C1 1.89543 1.89543 1 3 1Z" strokeWidth="2" stroke="currentColor" />
            <path transform="translate(12 9)" d="M3 1C4.10457 1 5 1.89543 5 3V5C5 6.10457 4.10457 7 3 7C1.89543 7 1 6.10457 1 5V3C1 1.89543 1.89543 1 3 1Z" strokeWidth="2" stroke="currentColor" />
        </Svg>
    );
}

export function Dollar(props: IconProps) {
    return (
        <Svg viewBox="0 0 11 18" {...props}>
            <path d="M5.15168 0V18M9.15168 4.5C8.35168 3.3 6.95168 2.7 5.15168 2.7C2.95168 2.7 1.35168 3.7 1.35168 5.4C1.35168 9.4 9.35169 7.4 9.35169 11.4C9.35169 13.1 7.65168 14.2 5.15168 14.2C3.15168 14.2 1.65168 13.5 0.851685 12.2" strokeWidth="2" stroke="currentColor" />
        </Svg>
    );
}

// Social

export function Facebook(props: IconProps) {
    return (
        <Svg viewBox="0 0 24 24" {...props}>
            <path d="M14 8h2.5V4.5H14c-2.5 0-4 1.6-4 4V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5h-3V8.8c0-.5.3-.8.5-.8Z" fill="currentColor" />
        </Svg>
    );
}

export function Twitter(props: IconProps) {
    return (
        <Svg viewBox="0 0 24 24" {...props}>
            <path d="M21 6.5c-.7.3-1.4.5-2.1.6.8-.5 1.3-1.2 1.6-2-.7.4-1.5.7-2.3.9a3.6 3.6 0 0 0-6.2 3.3A10.3 10.3 0 0 1 4.5 5.5a3.6 3.6 0 0 0 1.1 4.8c-.6 0-1.1-.2-1.6-.4 0 1.7 1.2 3.2 2.9 3.6-.5.1-1.1.2-1.6.1.5 1.4 1.8 2.5 3.4 2.5A7.3 7.3 0 0 1 3 17.6 10.3 10.3 0 0 0 18.9 8.4v-.5c.8-.4 1.5-1 2.1-1.4Z" fill="currentColor" />
        </Svg>
    );
}

export function Youtube(props: IconProps) {
    return (
        <Svg viewBox="0 0 24 24" {...props}>
            <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" fill="currentColor" />
        </Svg>
    );
}

export function Instagram(props: IconProps) {
    return (
        <Svg viewBox="0 0 24 24" {...props}>
            <rect x="3.5" y="3.5" width="17" height="17" rx="5" strokeWidth="2" stroke="currentColor" />
            <circle cx="12" cy="12" r="4" strokeWidth="2" stroke="currentColor" />
            <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
        </Svg>
    );
}

export const socials = [
    { href: "https://facebook.com", label: "Facebook", Icon: Facebook },
    { href: "https://twitter.com", label: "Twitter", Icon: Twitter },
    { href: "https://youtube.com", label: "YouTube", Icon: Youtube },
    { href: "https://instagram.com", label: "Instagram", Icon: Instagram },
];
