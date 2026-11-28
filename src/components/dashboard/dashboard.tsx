"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { ArrowRight } from "../landing/icons";
import {
    BellIcon,
    CalendarIcon,
    CalendarPlusIcon,
    ClockIcon,
    GridIcon,
    LogoutIcon,
    PersonIcon,
    PhoneIcon,
    SearchIcon,
} from "./dashboard-icons";
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
    description: string | null;
    helperName: string | null;
    denialReason: string | null;
    createdAt: string;
};

// `now` is when they loaded, so Upcoming and Past don't reshuffle while the page is open
type Loaded = { bookings: Booking[]; now: number } | { error: string };

type Tone = "red" | "amber" | "green" | "grey";

const BOOK_LINKS = [
    { href: "/driver", label: "Driver" },
    { href: "/companion", label: "Companion" },
    { href: "/hospital_visit", label: "Hospital visit" },
    { href: "/guided_tours", label: "Guided tours" },
    { href: "/property_management", label: "Property care" },
];

const NAV = [
    { href: "#top", label: "Dashboard", Icon: GridIcon },
    { href: "#upcoming", label: "Upcoming bookings", Icon: CalendarIcon },
    { href: "#history", label: "Booking history", Icon: ClockIcon },
    { href: "#profile", label: "Profile", Icon: PersonIcon },
];

// Bookings that won't go ahead, whatever their date
const CLOSED = ["denied", "declined", "expired", "cancelled"];

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
            return { label: "Confirmed", tone: "green" };
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

function isHospital(b: Booking) {
    return b.serviceType === "companion" && b.companionPurpose === "hospital";
}

function serviceTitle(b: Booking) {
    if (isHospital(b)) return "Hospital Visit";
    switch (b.serviceType) {
        case "driver":
            return "Driver Service";
        case "companion":
            return "Companion";
        case "tour_package":
            return "Guided Tour";
        case "staycation":
            return "Staycation";
        case "property":
            return "Property Care";
        default:
            return b.serviceType;
    }
}

function serviceImage(b: Booking) {
    if (isHospital(b)) return "/landing/service-hospital.jpg";
    switch (b.serviceType) {
        case "driver":
            return "/landing/service-driver.jpg";
        case "companion":
            return "/landing/service-companion.jpg";
        case "tour_package":
            return "/landing/service-tour.jpg";
        case "staycation":
            return "/landing/cta-houseboat.jpg";
        case "property":
            return "/landing/service-property.jpg";
        default:
            return "/landing/service-companion.jpg";
    }
}

// Where to book the same service again
function rebookHref(b: Booking) {
    if (isHospital(b)) return "/hospital_visit";
    switch (b.serviceType) {
        case "driver":
            return "/driver";
        case "companion":
            return "/companion";
        case "property":
            return "/property_management";
        default:
            return "/guided_tours";
    }
}

type Recipient = { name: string; relation: string | null; phone: string | null; self: boolean };

const RELATIONS: Record<string, string> = { "My Self": "You", "My Parents": "Parent", "Someone Else": "Family or friend" };

// Who the booking is for. The booking forms write it into the description
// ("Booking for: …", "Name: … (gender)", "Phone: …") until it has its own fields.
function recipientOf(b: Booking): Recipient | null {
    if (!b.description) return null;
    const field = (label: string) => b.description!.match(new RegExp(`^${label}:[ \\t]*(.*)$`, "m"))?.[1].trim() ?? "";
    const name = field("Name").replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (!name) return null;
    const whoFor = field("Booking for");
    const phone = field("Phone");
    return {
        name,
        relation: RELATIONS[whoFor] ?? (whoFor || null),
        // Only a country code means no number was given
        phone: /\d{5,}/.test(phone.replace(/\s/g, "")) ? phone : null,
        self: whoFor === "My Self",
    };
}

function isUpcoming(b: Booking, now: number) {
    return !CLOSED.includes(b.approvalStatus) && b.jobStatus !== "completed" && Date.parse(b.endsAt) >= now;
}

function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount / 100);
}

// India time, where every job happens: "06:00 AM Sun, 08 Sep 2027"
function formatWhen(iso: string) {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
    const day = d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short", year: "numeric" });
    return `${time} ${day.replace(/^(\w+) /, "$1, ")}`;
}

function greetingNow() {
    const hour = Number(new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }));
    return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function initials(name: string | null | undefined) {
    return (name ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function ref(b: Booking) {
    return b.bookingId.replace(/^bk_/, "").slice(0, 8).toUpperCase();
}

function detailsHref(b: Booking) {
    return `/dashboard/bookings/${encodeURIComponent(b.bookingId)}`;
}

function matches(b: Booking, query: string) {
    if (!query) return true;
    const haystack = [serviceTitle(b), b.destination, b.pickup, recipientOf(b)?.name, b.helperName, ref(b), statusOf(b).label]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return haystack.includes(query.toLowerCase());
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

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
    return <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>;
}

function Thumb({ booking, className }: { booking: Booking; className: string }) {
    return (
        <span className={className}>
            <Image src={serviceImage(booking)} alt="" fill sizes="180px"/>
        </span>
    );
}

// The soonest upcoming booking, shown in full
function FeaturedBooking({ booking }: { booking: Booking }) {
    const status = statusOf(booking);
    const recipient = recipientOf(booking);
    return (
        <article className={styles.featured}>
            <Thumb booking={booking} className={styles.featuredImage}/>
            <div className={styles.featuredMain}>
                <h3 className={styles.featuredTitle}>
                    {serviceTitle(booking)} <Pill tone={status.tone}>{status.label}</Pill>
                </h3>
                <dl className={styles.facts}>
                    <div>
                        <dt>Service for</dt>
                        <dd>{recipient ? (recipient.self ? `${recipient.name} (you)` : recipient.name) : "—"}</dd>
                    </div>
                    <div>
                        <dt>Date &amp; Time</dt>
                        <dd>{formatWhen(booking.dateTime)}</dd>
                    </div>
                    <div>
                        <dt>Location</dt>
                        <dd>
                            {booking.destination}
                            {booking.pickup && <small>From {booking.pickup}</small>}
                        </dd>
                    </div>
                    <div>
                        <dt>Assigned helper</dt>
                        <dd className={styles.helper}>
                            {booking.helperName ? (
                                <>
                                    <span className={styles.helperAvatar} aria-hidden="true">{initials(booking.helperName)}</span>
                                    {booking.helperName}
                                </>
                            ) : (
                                <span className={styles.mutedInline}>Assigned once confirmed</span>
                            )}
                        </dd>
                    </div>
                </dl>
            </div>
            <div className={styles.featuredSide}>
                <span className={styles.amountLabel}>Amount</span>
                <strong className={styles.amount}>
                    {booking.quoteAmount !== null ? formatMoney(booking.quoteAmount, booking.currency) : "Quote to follow"}
                </strong>
                <div className={styles.featuredActions}>
                    <Link href={detailsHref(booking)} className={styles.btnOutline}>View Booking Details</Link>
                    <Link href={rebookHref(booking)} className={styles.btnRed}>Book Again</Link>
                </div>
            </div>
        </article>
    );
}

function BookingRow({ booking }: { booking: Booking }) {
    const status = statusOf(booking);
    const recipient = recipientOf(booking);
    return (
        <li className={styles.row}>
            <Thumb booking={booking} className={styles.rowImage}/>
            <div className={styles.rowMain}>
                <h3 className={styles.rowTitle}>
                    {serviceTitle(booking)} <Pill tone={status.tone}>{status.label}</Pill>
                </h3>
                {recipient && <span className={styles.rowFor}>For : {recipient.name}</span>}
                <span className={styles.rowWhen}>
                    <CalendarIcon size={14}/> {formatWhen(booking.dateTime)}
                </span>
            </div>
            <div className={styles.rowSide}>
                <strong>{booking.quoteAmount !== null ? formatMoney(booking.quoteAmount, booking.currency) : "Quote to follow"}</strong>
                <Link href={detailsHref(booking)} className={styles.btnSmall}>View Details</Link>
            </div>
        </li>
    );
}

// Bookings shown per list before "View more"
const PAGE_SIZE = 3;

// "View more" under a list, then "Show less" once everything is showing
function MoreButton({ total, shown, setShown }: { total: number; shown: number; setShown: (n: number) => void }) {
    if (total <= PAGE_SIZE) return null;
    const remaining = total - shown;
    return (
        <button
            type="button"
            className={styles.moreBtn}
            onClick={() => setShown(remaining > 0 ? shown + PAGE_SIZE : PAGE_SIZE)}
        >
            {remaining > 0 ? `View more (${remaining})` : "Show less"}
        </button>
    );
}

// The customer's own page: greeting, profile, who they book for, their bookings and payments
export default function Dashboard() {
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();
    const loaded = useMyBookings(Boolean(session));
    const [query, setQuery] = useState("");
    // How many of each list are showing; "View more" adds another PAGE_SIZE
    const [upcomingShown, setUpcomingShown] = useState(PAGE_SIZE);
    const [historyShown, setHistoryShown] = useState(PAGE_SIZE);

    if (isPending) return <div className={styles.loadingShell}><p className={styles.muted}>Loading your dashboard…</p></div>;

    if (!session) {
        return (
            <div className={styles.loadingShell}>
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

    const user = session.user as { name?: string | null; email?: string | null; image?: string | null; phoneNumber?: string | null };
    const bookings = loaded && "bookings" in loaded ? loaded.bookings : [];
    const now = loaded && "now" in loaded ? loaded.now : 0;
    // Soonest first for upcoming; the API's latest-first order for history
    const upcomingAll = bookings.filter((b) => isUpcoming(b, now)).sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime));
    const pastAll = bookings.filter((b) => !isUpcoming(b, now));
    const upcoming = upcomingAll.filter((b) => matches(b, query));
    const past = pastAll.filter((b) => matches(b, query));
    // The first upcoming booking is shown in full and counts towards the page
    const [featured, ...moreUpcoming] = upcoming.slice(0, upcomingShown);
    const history = past.slice(0, historyShown);

    // Bookings waiting on the customer: a payment or a quote to accept
    const needsAction = bookings.filter((b) => b.approvalStatus === "awaiting_payment" || b.approvalStatus === "quoted");

    const signOut = () => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } });

    return (
        <div className={styles.app} id="top">
            <nav className={styles.sidebar} aria-label="Dashboard">
                <Link href="/" className={styles.logo} aria-label="Lemmido home">
                    <Image src="/landing/logo-mark.svg" alt="" width={36} height={33}/>
                </Link>
                <ul className={styles.navList}>
                    {NAV.map(({ href, label, Icon }) => (
                        <li key={href}>
                            <a href={href} className={styles.navItem} aria-label={label} title={label}>
                                <Icon size={18}/>
                            </a>
                        </li>
                    ))}
                </ul>
                <button type="button" className={styles.navItem} onClick={signOut} aria-label="Sign out" title="Sign out">
                    <LogoutIcon size={18}/>
                </button>
            </nav>

            <div className={styles.main}>
                <header className={styles.topbar}>
                    <label className={styles.search}>
                        <SearchIcon size={16}/>
                        <span className={styles.srOnly}>Search your bookings</span>
                        <input
                            type="search"
                            placeholder="Search bookings…"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setUpcomingShown(PAGE_SIZE);
                                setHistoryShown(PAGE_SIZE);
                            }}
                        />
                    </label>
                    {needsAction.length > 0 ? (
                        <Link
                            href={detailsHref(needsAction[0])}
                            className={styles.bell}
                            aria-label={`${needsAction.length} booking${needsAction.length === 1 ? " needs" : "s need"} your attention`}
                        >
                            <BellIcon size={18}/>
                            <span className={styles.bellDot}/>
                        </Link>
                    ) : (
                        <span className={styles.bell} title="No new notifications" aria-label="No new notifications" role="img">
                            <BellIcon size={18}/>
                        </span>
                    )}
                </header>

                <section className={styles.greeting}>
                    <div>
                        <h1>{greetingNow()}{user.name ? `, ${user.name}` : ""}</h1>
                        <p>Your family&apos;s care, just a click away. 👋</p>
                    </div>
                    <details className={styles.bookMenu}>
                        <summary className={styles.btnRed}>
                            Book a Service <CalendarPlusIcon size={16}/>
                        </summary>
                        <ul>
                            {BOOK_LINKS.map((l) => (
                                <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
                            ))}
                        </ul>
                    </details>
                </section>

                <section className={styles.card} id="profile" aria-labelledby="profile-heading">
                    <h2 id="profile-heading" className={styles.cardTitle}>Profile</h2>
                    <div className={styles.profileTop}>
                        {user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element -- the sign-in provider's picture, any host
                            <img src={user.image} alt="" className={styles.avatar}/>
                        ) : (
                            <span className={styles.avatar} aria-hidden="true">{initials(user.name) || <PersonIcon size={22}/>}</span>
                        )}
                        <div className={styles.profileName}>
                            <strong>{user.name || "My account"}</strong>
                            <span>{user.email}</span>
                        </div>
                    </div>
                    <ul className={styles.contactList}>
                        <li><PhoneIcon size={18}/><span>{user.phoneNumber || <span className={styles.mutedInline}>No phone number yet</span>}</span></li>
                    </ul>
                </section>

                <section className={styles.card} id="upcoming" aria-labelledby="upcoming-heading">
                    <div className={styles.cardHead}>
                        <h2 id="upcoming-heading" className={styles.cardTitle}>Upcoming Bookings</h2>
                        {upcoming.length > 0 && <span className={styles.count}>{upcoming.length} upcoming</span>}
                    </div>
                    {!loaded && <p className={styles.muted}>Loading your bookings…</p>}
                    {loaded && "error" in loaded && <p className={styles.error} role="alert">Couldn&apos;t load your bookings: {loaded.error}</p>}
                    {loaded && "bookings" in loaded && !featured && (
                        <div className={styles.empty}>
                            <p>{query ? "No upcoming bookings match your search." : "No upcoming bookings."}</p>
                            {!query && <Link href="/companion" className={styles.btnRed}>Book a Service</Link>}
                        </div>
                    )}
                    {featured && <FeaturedBooking booking={featured}/>}
                    {moreUpcoming.length > 0 && (
                        <ul className={styles.rows}>
                            {moreUpcoming.map((b) => <BookingRow key={b.bookingId} booking={b}/>)}
                        </ul>
                    )}
                    <MoreButton total={upcoming.length} shown={upcomingShown} setShown={setUpcomingShown}/>
                </section>

                <section className={styles.card} id="history" aria-labelledby="history-heading">
                    <div className={styles.cardHead}>
                        <h2 id="history-heading" className={styles.cardTitle}>Recent Booking History</h2>
                        {past.length > 0 && <span className={styles.count}>{past.length} past</span>}
                    </div>
                    {loaded && "bookings" in loaded && past.length === 0 && (
                        <p className={styles.muted}>{query ? "No past bookings match your search." : "No past bookings yet."}</p>
                    )}
                    {history.length > 0 && (
                        <ul className={styles.rows}>
                            {history.map((b) => <BookingRow key={b.bookingId} booking={b}/>)}
                        </ul>
                    )}
                    <MoreButton total={past.length} shown={historyShown} setShown={setHistoryShown}/>
                </section>
            </div>
        </div>
    );
}
