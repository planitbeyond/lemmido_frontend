"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { ArrowRight, User, WhatsApp } from "../landing/icons";
import { WHATSAPP_URL } from "../landing/site-header";
import styles from "./dashboard.module.css";

// One booking from GET /bookings/mine. Amounts are minor units (paise for INR).
type Booking = {
    bookingId: string;
    serviceType: string;
    companionPurpose: string | null;
    vehicleSource: "ours" | "customer" | null;
    pickup: string | null;
    destination: string;
    dateTime: string;
    endsAt: string;
    serviceHrs: string | null;
    approvalMode: "auto" | "admin";
    approvalStatus: string;
    quoteAmount: number | null;
    currency: string;
    payBy: string | null;
    paymentStatus: string;
    jobStatus: string;
    helperAssigned: boolean;
    denialReason: string | null;
};

// `now` is when they loaded, so Upcoming and Past don't reshuffle while the page is open
type Loaded = { bookings: Booking[]; now: number } | { error: string };

const QUICK_ACTIONS = [
    { href: "/driver", title: "Book a driver", text: "In your car or ours", image: "/booking/car-lemmido.png" },
    { href: "/companion", title: "Hire a companion", text: "Hospital, bank, errands", image: "/booking/family.png" },
    { href: "/guided_tours", title: "Guided tours", text: "Trips and staycations", image: "/landing/hero-tour.jpg" },
];

const SERVICE_NAMES: Record<string, string> = {
    driver: "Driver",
    companion: "Companion",
    tour_package: "Tour package",
    staycation: "Staycation",
    property: "Property care",
};

// Bookings that won't go ahead, whatever their date
const CLOSED = ["denied", "declined", "expired", "cancelled"];

type Tone = "red" | "amber" | "green" | "grey";

// What the customer should know about a booking, and how loudly
function statusOf(b: Booking): { label: string; tone: Tone } {
    switch (b.approvalStatus) {
        case "awaiting_payment":
            return { label: "Payment due", tone: "red" };
        case "pending_approval":
            return { label: "Awaiting approval", tone: "amber" };
        case "quoted":
            return { label: "Quote ready", tone: "red" };
        case "accepted":
            return { label: "Quote accepted", tone: "amber" };
        case "confirmed":
            if (b.jobStatus === "completed") return { label: "Completed", tone: "grey" };
            if (b.jobStatus === "in_progress" || b.jobStatus === "running_over") return { label: "In progress", tone: "green" };
            return { label: b.helperAssigned ? "Confirmed" : "Confirmed · assigning helper", tone: "green" };
        case "denied":
            return { label: "Not accepted", tone: "grey" };
        case "declined":
            return { label: "Quote declined", tone: "grey" };
        case "expired":
            return { label: "Expired", tone: "grey" };
        case "cancelled":
            return { label: "Cancelled", tone: "grey" };
        default:
            return { label: b.approvalStatus, tone: "grey" };
    }
}

function isUpcoming(b: Booking, now: number) {
    return !CLOSED.includes(b.approvalStatus) && b.jobStatus !== "completed" && Date.parse(b.endsAt) >= now;
}

function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount / 100);
}

// India time, where every job happens
function formatWhen(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
    });
}

function firstName(name: string | null | undefined) {
    return name?.trim().split(/\s+/)[0] ?? "";
}

// The signed-in customer's bookings from the backend, or why they couldn't load
function useMyBookings(signedIn: boolean) {
    const [loaded, setLoaded] = useState<Loaded | null>(null);

    useEffect(() => {
        if (!signedIn) return;
        const controller = new AbortController();
        (async () => {
            // A short-lived token that tells the backend who is asking
            const tokenRes = await fetch("/api/rt-token", { signal: controller.signal });
            if (!tokenRes.ok) throw new Error(`Couldn't check you're signed in (HTTP ${tokenRes.status}).`);
            const { token }: { token: string } = await tokenRes.json();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/mine`, {
                headers: { authorization: `Bearer ${token}` },
                signal: controller.signal,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setLoaded({ bookings: data.bookings ?? [], now: Date.now() });
        })().catch((error: Error) => {
            if (error.name !== "AbortError") setLoaded({ error: error.message });
        });
        return () => controller.abort();
    }, [signedIn]);

    return loaded;
}

function BookingCard({ booking }: { booking: Booking }) {
    const status = statusOf(booking);
    const service = SERVICE_NAMES[booking.serviceType] ?? booking.serviceType;
    const vehicle = booking.vehicleSource === "customer" ? "Your car" : booking.vehicleSource === "ours" ? "Lemmido vehicle" : null;
    return (
        <li>
            <Link href={`/dashboard/bookings/${encodeURIComponent(booking.bookingId)}`} className={styles.trip}>
            <span className={styles.tripIcon} aria-hidden="true">{service[0]}</span>
            <div className={styles.tripMain}>
                <div className={styles.tripTop}>
                    <strong>{service}{vehicle ? ` · ${vehicle}` : ""}</strong>
                    <span className={`${styles.pill} ${styles[status.tone]}`}>{status.label}</span>
                </div>
                <span className={styles.tripWhen}>{formatWhen(booking.dateTime)}</span>
                <span className={styles.tripRoute}>
                    {booking.pickup ? <>{booking.pickup} <span aria-label="to">→</span> </> : null}
                    {booking.destination}
                </span>
                {booking.approvalStatus === "awaiting_payment" && booking.payBy && (
                    <span className={styles.tripNote}>Pay by {formatWhen(booking.payBy)} to keep this booking.</span>
                )}
                {booking.approvalStatus === "pending_approval" && (
                    <span className={styles.tripNote}>Our team will email you a quote to accept.</span>
                )}
                {booking.denialReason && <span className={styles.tripNote}>{booking.denialReason}</span>}
            </div>
            <div className={styles.tripPrice}>
                {booking.quoteAmount !== null ? formatMoney(booking.quoteAmount, booking.currency) : "Quote to follow"}
                <small>Ref {booking.bookingId.replace(/^bk_/, "").slice(0, 8).toUpperCase()}</small>
            </div>
            </Link>
        </li>
    );
}

// The customer's own page: greeting and quick bookings, their trips, and their account
export default function Dashboard() {
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();
    const loaded = useMyBookings(Boolean(session));
    const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

    if (isPending) return <div className={styles.shell}><p className={styles.muted}>Loading your dashboard…</p></div>;

    if (!session) {
        return (
            <div className={styles.shell}>
                <div className={styles.signedOut}>
                    <h1>Your Lemmido dashboard</h1>
                    <p>Sign in to see your bookings, payments and profile.</p>
                    <button type="button" className={styles.btnRed} onClick={() => authClient.signIn.social({ provider: "cognito", callbackURL: "/dashboard" })}>
                        Sign in <ArrowRight size={12}/>
                    </button>
                </div>
            </div>
        );
    }

    const user = session.user as { name?: string | null; email?: string | null; phoneNumber?: string | null };
    const bookings = loaded && "bookings" in loaded ? loaded.bookings : [];
    const now = loaded && "now" in loaded ? loaded.now : 0;
    // Soonest first for upcoming; the API's latest-first order for past
    const upcoming = bookings.filter((b) => isUpcoming(b, now)).sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime));
    const past = bookings.filter((b) => !isUpcoming(b, now));
    const shown = tab === "upcoming" ? upcoming : past;

    return (
        <div className={styles.shell}>
            <section className={styles.greeting}>
                <div>
                    <p className={styles.eyebrow}>My dashboard</p>
                    <h1>Hi{firstName(user.name) ? `, ${firstName(user.name)}` : ""}</h1>
                    <p className={styles.muted}>
                        {upcoming.length > 0
                            ? `You have ${upcoming.length} upcoming booking${upcoming.length === 1 ? "" : "s"}.`
                            : "Where can we help your family today?"}
                    </p>
                </div>
                <ul className={styles.quick}>
                    {QUICK_ACTIONS.map((action) => (
                        <li key={action.href}>
                            <Link href={action.href} className={styles.quickCard}>
                                <span>
                                    <strong>{action.title}</strong>
                                    <small>{action.text}</small>
                                </span>
                                <span className={styles.quickImage}>
                                    <Image src={action.image} alt="" fill sizes="96px"/>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <div className={styles.columns}>
                <section className={styles.trips} aria-labelledby="trips-heading">
                    <div className={styles.tripsHead}>
                        <h2 id="trips-heading">Your trips</h2>
                        <div className={styles.tabs} role="tablist" aria-label="Trips">
                            {(["upcoming", "past"] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === t}
                                    className={tab === t ? styles.tabOn : styles.tab}
                                    onClick={() => setTab(t)}
                                >
                                    {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!loaded && <p className={styles.muted}>Loading your bookings…</p>}
                    {loaded && "error" in loaded && <p className={styles.error} role="alert">Couldn&apos;t load your bookings: {loaded.error}</p>}
                    {loaded && "bookings" in loaded && shown.length === 0 && (
                        <div className={styles.empty}>
                            <p>{tab === "upcoming" ? "No upcoming bookings." : "No past bookings yet."}</p>
                            {tab === "upcoming" && (
                                <Link href="/companion" className={styles.btnRed}>
                                    Book a service <ArrowRight size={12}/>
                                </Link>
                            )}
                        </div>
                    )}
                    {shown.length > 0 && (
                        <ul className={styles.tripList}>
                            {shown.map((b) => <BookingCard key={b.bookingId} booking={b}/>)}
                        </ul>
                    )}
                </section>

                <aside className={styles.side}>
                    <section className={styles.card} aria-labelledby="profile-heading">
                        <div className={styles.profileTop}>
                            <span className={styles.avatar} aria-hidden="true">
                                {user.name ? user.name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") : <User size={20}/>}
                            </span>
                            <div>
                                <h2 id="profile-heading">{user.name || "My account"}</h2>
                                <span className={styles.muted}>Lemmido member</span>
                            </div>
                        </div>
                        <dl className={styles.details}>
                            <div><dt>Email</dt><dd>{user.email || "—"}</dd></div>
                            <div><dt>Phone</dt><dd>{user.phoneNumber || "—"}</dd></div>
                        </dl>
                        <button type="button" className={styles.btnOutline} onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}>
                            Sign out
                        </button>
                    </section>

                    <section className={`${styles.card} ${styles.helpCard}`}>
                        <h2>Need help?</h2>
                        <p>Questions about a booking? Message our Thiruvalla team.</p>
                        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={styles.btnDark}>
                            <WhatsApp size={16}/> WhatsApp Us
                        </a>
                    </section>
                </aside>
            </div>
        </div>
    );
}
