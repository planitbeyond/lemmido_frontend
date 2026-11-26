// Pieces the booking wizards share: the ride form (companion, driver) and the property form

import Image from "next/image";
import styles from "./booking-wizard.module.css";

export type WhoFor = "self" | "parents" | "other";

export const WHO_FOR: { value: WhoFor; label: string; icon: string }[] = [
    { value: "self", label: "My Self", icon: "/booking/who-self.svg" },
    { value: "parents", label: "My Parents", icon: "/booking/who-parents.svg" },
    { value: "other", label: "Someone Else", icon: "/booking/who-other.svg" },
];

// Most customers book from abroad for family in Kerala
export const COUNTRY_CODES = ["+91", "+971", "+966", "+974", "+965", "+968", "+973", "+44", "+1", "+61", "+64", "+65", "+60", "+49", "+353"];

export type Details = { name: string; phoneCode: string; phone: string };

export const EMPTY_DETAILS: Details = { name: "", phoneCode: "+91", phone: "" };

// The signed-in customer's own details, for a booking for themselves. The phone is
// E.164 from Cognito (+919876543210), split into one of our country codes and the rest.
export function accountDetails(user: { name?: string | null; phoneNumber?: string | null } | undefined): Details {
    if (!user) return EMPTY_DETAILS;
    const phoneNumber = user.phoneNumber ?? "";
    // Longest first, so +971 isn't read as +97 or +9
    const code = [...COUNTRY_CODES].sort((a, b) => b.length - a.length).find((c) => phoneNumber.startsWith(c));
    return {
        name: user.name ?? "",
        phoneCode: code ?? EMPTY_DETAILS.phoneCode,
        phone: code ? phoneNumber.slice(code.length) : "",
    };
}

export function Stepper({ steps, step }: { steps: string[]; step: number }) {
    return (
        <ol className={styles.stepper} style={{ "--steps": steps.length } as React.CSSProperties}>
            {steps.map((label, i) => {
                const state = i < step ? styles.stepDone : i === step ? styles.stepCurrent : "";
                return (
                    <li key={label} className={`${styles.step} ${state}`} aria-current={i === step ? "step" : undefined}>
                        {i < step
                            ? <Image src="/booking/step-done.svg" alt="" width={29} height={29} className={styles.stepCircle}/>
                            : <span className={styles.stepCircle}>{i + 1}</span>}
                        {label}
                        {i < step && <span className={styles.srOnly}> (done)</span>}
                    </li>
                );
            })}
        </ol>
    );
}

// Shown once a request that needs a quote is sent: nothing is paid on the site,
// the team prices it and emails the quote
export function QuoteSubmitted({ className }: { className?: string }) {
    return (
        <p role="status" className={className ? `${styles.approval} ${className}` : styles.approval}>
            Your quote request is submitted. The Lemmido team will share a quote with you by email.
        </p>
    );
}

// The pin left of an address box: the pickup's (also a single address's) or the drop's
export function PlaceIcon({ field }: { field: "from" | "to" }) {
    return field === "from" ? (
        <span className={styles.placeIcon}>
            <Image src="/booking/pickup-circle.svg" alt="" width={30} height={30}/>
            <Image src="/booking/pickup-pin.svg" alt="" width={15} height={20}/>
        </span>
    ) : (
        <span className={styles.placeIcon}>
            <Image src="/booking/drop-icon.svg" alt="" width={30} height={30}/>
        </span>
    );
}
