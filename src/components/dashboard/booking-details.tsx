"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "../../lib/auth-client";
import { ArrowLeft, Phone, WhatsApp } from "../landing/icons";
import { WHATSAPP_URL } from "../landing/site-header";
import TrackingMap from "./tracking-map";
import styles from "./booking-details.module.css";

// GET /bookings/mine/:bookingId. Amounts are minor units (paise for INR).
type Booking = {
    bookingId: string;
    serviceType: string;
    companionPurpose: string | null;
    vehicleSource: "ours" | "customer" | null;
    description: string | null;
    pickup: string | null;
    destination: string;
    dateTime: string;
    endsAt: string;
    serviceHrs: string | null;
    jobStatus: "scheduled" | "in_progress" | "running_over" | "completed";
    expectedEndAt: string | null;
    completedAt: string | null;
    overrunAmount: number | null;
    overrunStatus: string;
    approvalMode: "auto" | "admin";
    approvalStatus: string;
    quoteAmount: number | null;
    currency: string;
    payBy: string | null;
    paymentStatus: string;
    denialReason: string | null;
    cancellationReason: string | null;
};

type Details = {
    booking: Booking;
    helper: { name: string | null; phoneNumber: string | null } | null;
    tracking: { token: string } | null;
};

type Live = { lat: number; lng: number; timestamp: number };

// A location older than this means the helper has stopped sharing
const STALE_MS = 2 * 60 * 1000;
// Wait before reconnecting to the live feed after it drops
const RECONNECT_MS = 5000;

const SERVICE_NAMES: Record<string, string> = {
    driver: "Driver",
    companion: "Companion",
    tour_package: "Tour package",
    staycation: "Staycation",
    property: "Property care",
};

const PURPOSES: Record<string, string> = { hospital: "Hospital", bank: "Bank", office: "Office", other: "Other" };

const CLOSED: Record<string, string> = {
    denied: "This booking wasn't accepted",
    declined: "You declined the quote",
    expired: "This booking expired",
    cancelled: "This booking was cancelled",
};

function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount / 100);
}

// India time, where every job happens
function formatWhen(iso: string, withDay = true) {
    return new Date(iso).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        ...(withDay ? { weekday: "short", day: "numeric", month: "short", year: "numeric" } : {}),
        hour: "numeric",
        minute: "2-digit",
    });
}

function ago(ms: number) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s}s ago`;
    return `${Math.round(s / 60)} min ago`;
}

// The booking from the backend, with the helper and a tracking token
function useBookingDetails(bookingId: string, signedIn: boolean) {
    const [loaded, setLoaded] = useState<Details | { error: string } | null>(null);
    useEffect(() => {
        if (!signedIn) return;
        const controller = new AbortController();
        (async () => {
            const tokenRes = await fetch("/api/rt-token", { signal: controller.signal });
            if (!tokenRes.ok) throw new Error(`Couldn't check you're signed in (HTTP ${tokenRes.status}).`);
            const { token }: { token: string } = await tokenRes.json();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/mine/${encodeURIComponent(bookingId)}`, {
                headers: { authorization: `Bearer ${token}` },
                signal: controller.signal,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setLoaded(data as Details);
        })().catch((error: Error) => {
            if (error.name !== "AbortError") setLoaded({ error: error.message });
        });
        return () => controller.abort();
    }, [bookingId, signedIn]);
    return loaded;
}

// The helper's live location from the realtime service, reconnecting if it drops
function useHelperLocation(token: string | undefined) {
    const [live, setLive] = useState<Live | null>(null);
    const [connected, setConnected] = useState(false);
    useEffect(() => {
        if (!token) return;
        let ws: WebSocket | null = null;
        let retry: ReturnType<typeof setTimeout> | null = null;
        let stopped = false;
        const connect = () => {
            ws = new WebSocket(`${process.env.NEXT_PUBLIC_REALTIME_URL}?token=${encodeURIComponent(token)}`);
            ws.onopen = () => setConnected(true);
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(String(event.data));
                    if (msg.type === "location") setLive({ lat: msg.lat, lng: msg.lng, timestamp: msg.timestamp });
                } catch {
                    // Ignore anything that isn't a location
                }
            };
            ws.onclose = () => {
                setConnected(false);
                if (!stopped) retry = setTimeout(connect, RECONNECT_MS);
            };
        };
        connect();
        return () => {
            stopped = true;
            if (retry) clearTimeout(retry);
            ws?.close();
        };
    }, [token]);
    return { live, connected };
}

// Ticks every few seconds, for "updated 12s ago"
function useNow(intervalMs: number) {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        const tick = () => setNow(Date.now());
        tick();
        const id = setInterval(tick, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}

type Step = { label: string; detail?: string; state: "done" | "current" | "todo" };

// Booked → confirmed → helper assigned → in service → completed
function timeline(b: Booking, hasHelper: boolean): Step[] {
    const confirmed = b.approvalStatus === "confirmed";
    const started = b.jobStatus === "in_progress" || b.jobStatus === "running_over" || b.jobStatus === "completed";
    const completed = b.jobStatus === "completed";
    const awaiting =
        b.approvalStatus === "awaiting_payment" ? `Payment due${b.payBy ? ` by ${formatWhen(b.payBy)}` : ""}`
        : b.approvalStatus === "pending_approval" ? "Our team is checking the price"
        : b.approvalStatus === "quoted" ? "Your quote is ready to accept"
        : b.approvalStatus === "accepted" ? "Quote accepted, waiting for payment"
        : undefined;
    const steps: { label: string; detail?: string; done: boolean }[] = [
        { label: "Booked", done: true },
        { label: "Confirmed", detail: confirmed ? "Paid and confirmed" : awaiting, done: confirmed },
        { label: "Helper assigned", detail: hasHelper ? undefined : "A verified helper is assigned once it's confirmed", done: hasHelper },
        { label: b.jobStatus === "running_over" ? "Running over time" : "Service in progress", done: started },
        { label: "Completed", detail: b.completedAt ? formatWhen(b.completedAt) : undefined, done: completed },
    ];
    const firstTodo = steps.findIndex((s) => !s.done);
    return steps.map((s, i) => ({ label: s.label, detail: s.detail, state: s.done ? "done" : i === firstTodo ? "current" : "todo" }));
}

// What the map's status chip says
function mapStatus(b: Booking, hasHelper: boolean, liveFresh: boolean) {
    if (CLOSED[b.approvalStatus]) return CLOSED[b.approvalStatus];
    if (b.jobStatus === "completed") return "Service completed";
    if (b.jobStatus === "running_over") return "Service running over time";
    if (b.jobStatus === "in_progress") return liveFresh ? "Service in progress · live" : "Service in progress";
    if (hasHelper) return liveFresh ? "Your helper is on the way" : "Helper assigned";
    return "Waiting for confirmation";
}

export default function BookingDetails({ bookingId }: { bookingId: string }) {
    const { data: session, isPending } = authClient.useSession();
    const loaded = useBookingDetails(bookingId, Boolean(session));
    const details = loaded && "booking" in loaded ? loaded : null;
    const { live, connected } = useHelperLocation(details?.tracking?.token);
    const now = useNow(10_000);

    if (isPending || (session && !loaded)) return <div className={styles.shell}><p className={styles.muted}>Loading your booking…</p></div>;
    if (!session) {
        return (
            <div className={styles.shell}>
                <p className={styles.muted}>Please sign in to see this booking.</p>
                <button type="button" className={styles.btnRed} onClick={() => authClient.signIn.social({ provider: "cognito", callbackURL: `/dashboard/bookings/${bookingId}` })}>
                    Sign in
                </button>
            </div>
        );
    }
    if (!details) {
        return (
            <div className={styles.shell}>
                <Link href="/dashboard" className={styles.back}><ArrowLeft size={12}/> My dashboard</Link>
                <p className={styles.error} role="alert">Couldn&apos;t load this booking: {loaded && "error" in loaded ? loaded.error : ""}</p>
            </div>
        );
    }

    const { booking: b, helper, tracking } = details;
    const service = SERVICE_NAMES[b.serviceType] ?? b.serviceType;
    const role = b.serviceType === "driver" ? "driver" : "companion";
    const liveFresh = live !== null && now !== null && now - live.timestamp < STALE_MS;
    const steps = timeline(b, helper !== null);
    const closed = CLOSED[b.approvalStatus];

    let liveLine: string;
    if (!helper) liveLine = "Live location appears here once your helper is assigned.";
    else if (!tracking) liveLine = b.jobStatus === "completed" ? "This service is complete." : "Live tracking isn't available for this booking.";
    else if (liveFresh && now !== null) liveLine = `Live location · updated ${ago(now - live!.timestamp)}`;
    else if (live && now !== null) liveLine = `Last seen ${ago(now - live.timestamp)}`;
    else liveLine = connected ? `Your ${role} will share their location when they set out.` : "Connecting to live tracking…";

    return (
        <div className={styles.page}>
            <section className={styles.mapWrap} aria-label="Live map">
                <TrackingMap pickup={b.pickup} destination={b.destination} helper={live} status={mapStatus(b, helper !== null, liveFresh)}/>
            </section>

            <div className={styles.shell}>
                <Link href="/dashboard" className={styles.back}><ArrowLeft size={12}/> My dashboard</Link>
                <div className={styles.titleRow}>
                    <div>
                        <h1>{service}{b.vehicleSource ? ` · ${b.vehicleSource === "customer" ? "Your car" : "Lemmido vehicle"}` : ""}</h1>
                        <p className={styles.muted}>{formatWhen(b.dateTime)} · Ref {b.bookingId.replace(/^bk_/, "").slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div className={styles.price}>
                        {b.quoteAmount !== null ? formatMoney(b.quoteAmount, b.currency) : "Quote to follow"}
                        <small>{b.paymentStatus === "paid" ? "Paid" : b.paymentStatus === "late" ? "Payment late" : "Not paid yet"}</small>
                    </div>
                </div>

                {closed && (
                    <p className={styles.closed} role="status">
                        {closed}.{b.denialReason ? ` ${b.denialReason}` : ""}{b.cancellationReason ? ` ${b.cancellationReason}` : ""}
                    </p>
                )}

                <div className={styles.grid}>
                    <div className={styles.stack}>
                        <section className={styles.card} aria-labelledby="helper-heading">
                            <h2 id="helper-heading">Your {role}</h2>
                            {helper ? (
                                <div className={styles.helper}>
                                    <span className={styles.avatar} aria-hidden="true">
                                        {(helper.name ?? "?").split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
                                    </span>
                                    <div className={styles.helperText}>
                                        <strong>{helper.name ?? "Your helper"}</strong>
                                        <span className={styles.verified}>Verified Lemmido {role}</span>
                                        <span className={liveFresh ? styles.liveOn : styles.muted}>
                                            {liveFresh && <span className={styles.liveDot} aria-hidden="true"/>}
                                            {liveLine}
                                        </span>
                                    </div>
                                    {helper.phoneNumber && (
                                        <a href={`tel:${helper.phoneNumber}`} className={styles.callButton} aria-label={`Call ${helper.name ?? "your helper"}`}>
                                            <Phone size={16}/>
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <p className={styles.muted}>{liveLine}</p>
                            )}
                        </section>

                        <section className={styles.card} aria-labelledby="status-heading">
                            <h2 id="status-heading">Status</h2>
                            <ol className={styles.timeline}>
                                {steps.map((s) => (
                                    <li key={s.label} className={styles[s.state]}>
                                        <span className={styles.dot} aria-hidden="true"/>
                                        <div>
                                            <strong>{s.label}</strong>
                                            {s.detail && <span>{s.detail}</span>}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    </div>

                    <div className={styles.stack}>
                        <section className={styles.card} aria-labelledby="details-heading">
                            <h2 id="details-heading">Booking details</h2>
                            <dl className={styles.details}>
                                <div><dt>Pickup</dt><dd>{b.pickup ?? "—"}</dd></div>
                                <div><dt>Destination</dt><dd>{b.destination}</dd></div>
                                <div><dt>Date &amp; time</dt><dd>{formatWhen(b.dateTime)}</dd></div>
                                <div><dt>Ends around</dt><dd>{formatWhen(b.expectedEndAt ?? b.endsAt)}</dd></div>
                                {b.serviceHrs && Number(b.serviceHrs) > 0 && (
                                    <div><dt>{b.serviceType === "driver" ? "Waiting time" : "Service hours"}</dt><dd>{Number(b.serviceHrs)} h</dd></div>
                                )}
                                {b.companionPurpose && <div><dt>Where to</dt><dd>{PURPOSES[b.companionPurpose] ?? b.companionPurpose}</dd></div>}
                                <div><dt>Price</dt><dd>{b.quoteAmount !== null ? formatMoney(b.quoteAmount, b.currency) : "Quote to follow"}</dd></div>
                                {b.payBy && b.paymentStatus !== "paid" && <div><dt>Pay by</dt><dd>{formatWhen(b.payBy)}</dd></div>}
                                {b.overrunAmount !== null && b.overrunStatus !== "none" && (
                                    <div><dt>Extra time</dt><dd>{formatMoney(b.overrunAmount, b.currency)} ({b.overrunStatus})</dd></div>
                                )}
                            </dl>
                            {b.description && (
                                <div className={styles.notes}>
                                    <h3>Notes</h3>
                                    <p>{b.description}</p>
                                </div>
                            )}
                        </section>

                        <section className={`${styles.card} ${styles.help}`}>
                            <h2>Need help with this booking?</h2>
                            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={styles.btnLight}>
                                <WhatsApp size={16}/> WhatsApp Us
                            </a>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
