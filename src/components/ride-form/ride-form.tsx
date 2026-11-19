"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MIN_NOTICE_HOURS, parseDateInputValue, toDateInputValue } from "../../lib/booking-dates";
import BookingDatePicker from "../booking-date-picker";
import BookingTimeSelect from "../booking-time-select";
import type { PickedLocation } from "./kerala";
import PlaceSearch from "./place-search";
import RideMap from "./ride-map";
import { useTrip, type Quote, type VehicleSource } from "./use-trip";
import styles from "./booking-wizard.module.css";

type Ride = {
    from: PickedLocation;
    to: PickedLocation;
    date: string;
    time: string;
    // Companion: how long the helper stays (booking `service_hrs`)
    serviceHours?: number;
    // Driver: how long the driver waits at the destination
    waitingHours?: number;
    vehicleSource: VehicleSource;
    roundTrip: boolean;
    days: number;
    // Multi-day: the last day, YYYY-MM-DD
    endDate?: string;
    booking: SavedBooking;
};

// What POST /bookings returns. Amounts are minor units (paise for INR).
type SavedBooking = {
    bookingId: string;
    approvalMode: Quote["approvalMode"];
    quoteAmount: number | null;
    currency: string;
    // Path A: pay by then, or the booking lapses
    payBy: string | null;
};

type Field = "from" | "to";

type Kind = "driver" | "companion";

type Props = {
    kind: Kind;
};

const RED = "#e8193c";

const STEPS = ["Details", "Location", "Date & Time", "Vehicle", "Review", "Payment"];
const REVIEW_STEP = 4;
const DONE_STEP = 5;

// The hours field each kind of ride asks for. A companion is booked for at least
// half an hour; a driver may not wait at all.
const HOURS_FIELD: Record<Kind, { label: string; min: number; hint: string }> = {
    companion: { label: "Service hours", min: 0.5, hint: "How long the companion stays with you, up to 9 hours." },
    driver: { label: "Waiting time at the destination", min: 0, hint: "How long the driver waits before the return trip." },
};

// The backend's service for each kind of ride (services.service_id, from the seed)
const SERVICE_ID: Record<Kind, string> = { driver: "ser_01", companion: "ser_03" };

// R1: a task lasts at most 9 h. Longer jobs need an admin's approval: the customer
// still picks a day and time, and the admin assigns a helper.
const MAX_TASK_MINUTES = 9 * 60;

// The longest multi-day job that can be booked (the backend's MAX_TRIP_DAYS)
const MAX_TRIP_DAYS = 30;

const COMPANION_PURPOSES = [
    { value: "hospital", label: "Hospital" },
    { value: "bank", label: "Bank" },
    { value: "office", label: "Office" },
    { value: "other", label: "Other" },
];

type WhoFor = "self" | "parents" | "other";

const WHO_FOR: { value: WhoFor; label: string; icon: string }[] = [
    { value: "self", label: "My Self", icon: "/booking/who-self.svg" },
    { value: "parents", label: "My Parents", icon: "/booking/who-parents.svg" },
    { value: "other", label: "Someone Else", icon: "/booking/who-other.svg" },
];

// Most customers book from abroad for family in Kerala
const COUNTRY_CODES = ["+91", "+971", "+966", "+974", "+965", "+968", "+973", "+44", "+1", "+61", "+64", "+65", "+60", "+49", "+353"];

const EXTRAS = [
    { value: "childSeat", label: "Child Seat" },
    { value: "wheelchair", label: "Wheelchair Support" },
];

// 0.5 h steps up to the 9 h a task may last
function hourOptions(min: number) {
    return Array.from({ length: 19 }, (_, i) => i / 2).filter((h) => h >= min);
}

// An amount in minor units (paise) as money, e.g. ₹1,945
function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 })
        .format(amount / 100);
}

// YYYY-MM-DD, `days` - 1 days after `date`: the last day of a job that starts on `date`
function lastDayOf(date: string, days: number) {
    const day = parseDateInputValue(date);
    day.setDate(day.getDate() + days - 1);
    return toDateInputValue(day);
}

function formatDay(date: string) {
    return parseDateInputValue(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// 14:30 as 02:30 PM
function to12Hour(time: string) {
    const [h, m] = time.split(":").map(Number);
    return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function formatHours(hours: number) {
    return `${hours} h`;
}

// Saves the booking for the signed-in customer. The backend works out the trip and
// price again, and checks the day isn't full and a helper is still free.
async function saveBooking(booking: Record<string, unknown>): Promise<SavedBooking> {
    // A short-lived token that tells the backend who is booking
    const tokenRes = await fetch("/api/rt-token");
    if (tokenRes.status === 401) throw new Error("Please sign in to book.");
    if (!tokenRes.ok) throw new Error(`Couldn't check you're signed in (HTTP ${tokenRes.status}).`);
    const { token }: { token: string } = await tokenRes.json();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(booking),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data as SavedBooking;
}

// The details, landmarks and extras have no backend fields yet, so they go to the
// admin in the booking's description, ahead of the customer's own notes
function describe(data: FormData) {
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const whoFor = WHO_FOR.find((w) => w.value === data.get("whoFor"))?.label ?? "";
    const extras = EXTRAS.filter((e) => data.get(e.value)).map((e) => e.label);
    return [
        `Booking for: ${whoFor}`,
        `Name: ${text("name")} (${text("gender")})`,
        `Phone: ${text("phoneCode")} ${text("phone")}`,
        text("fromLandmark") && `Pickup landmark: ${text("fromLandmark")}`,
        text("toLandmark") && `Drop landmark: ${text("toLandmark")}`,
        extras.length > 0 && `Extras: ${extras.join(", ")}`,
        text("description"),
    ].filter(Boolean).join("\n");
}

function Stepper({ step }: { step: number }) {
    return (
        <ol className={styles.stepper}>
            {STEPS.map((label, i) => {
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

function StepHeading({ step, title, lead }: { step: number; title: string; lead: string }) {
    return (
        <>
            <h1 className={styles.heading}>
                {title}
                {step < DONE_STEP && <span className={styles.count}>{step + 1} of 6</span>}
            </h1>
            <p className={styles.lead}>{lead}</p>
        </>
    );
}

function PlaceIcon({ field }: { field: Field }) {
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

export default function RideForm({ kind }: Props) {
    const formRef = useRef<HTMLFormElement>(null);
    const stepRefs = useRef<(HTMLFieldSetElement | null)[]>([]);
    const [step, setStep] = useState(0);
    const [whoFor, setWhoFor] = useState<WhoFor>("self");
    const [from, setFrom] = useState<PickedLocation | null>(null);
    const [to, setTo] = useState<PickedLocation | null>(null);
    // The field a map click fills
    const [activeField, setActiveField] = useState<Field>("from");
    const [landmarks, setLandmarks] = useState<Record<Field, boolean>>({ from: false, to: false });
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState<Ride | null>(null);
    const [saving, setSaving] = useState(false);
    // What the review step lists, read from the form when it opens
    const [review, setReview] = useState<Record<string, string>>({});
    const [date, setDate] = useState<string | undefined>();
    // Service hours for a companion, waiting time for a driver
    const [hoursInput, setHoursInput] = useState(kind === "driver" ? "0" : "");
    const [vehicleSource, setVehicleSource] = useState<VehicleSource>("ours");
    // Driver in our vehicle: bring the customer back to the pickup. A driver in the
    // customer's vehicle always does, to take the car home.
    const [roundTripPicked, setRoundTripPicked] = useState(false);
    const roundTrip = kind === "driver" && (vehicleSource === "customer" || roundTripPicked);
    // A one-way driver drops the customer off and leaves, so there's no waiting time
    const hasOnSiteTime = kind !== "driver" || roundTrip;
    // Driver: a job over several days, the same driver throughout (an admin prices it)
    const [days, setDays] = useState(1);
    const isMultiDay = kind === "driver" && days > 1;
    const endDate = isMultiDay && date ? lastDayOf(date, days) : undefined;
    const hoursField = HOURS_FIELD[kind];
    const hours = hoursInput === "" ? NaN : Number(hoursInput);
    const onSiteMinutes = !hasOnSiteTime
        ? 0
        : hours >= hoursField.min && hours <= 9 ? Math.round(hours * 60) : undefined;

    // The trip and its price, once everything it needs is filled in
    const tripState = useTrip(
        from && to && onSiteMinutes !== undefined
            ? {
                  serviceId: SERVICE_ID[kind],
                  vehicleSource,
                  from: { lat: from.lat, lng: from.lng },
                  to: { lat: to.lat, lng: to.lng },
                  onSiteMinutes,
                  roundTrip,
                  days,
              }
            : undefined,
    );
    const trip = tripState.status === "done" ? tripState.trip : null;
    // The task length the helper availability is checked for: all the driving plus the
    // time at the destination (the backend rounds it up to 30 min)
    const tripMinutes = trip && Math.ceil(trip.taskMinutes);
    // Over 9 h or more than one day: an admin prices it and assigns the helper, so any
    // time can be picked rather than only times a helper is free
    const needsAdmin = trip !== null && (isMultiDay || (tripMinutes ?? 0) > MAX_TASK_MINUTES);
    const taskMinutes = tripMinutes && !needsAdmin ? tripMinutes : undefined;

    // Why there are no times to pick yet
    let taskHint: string;
    if (!from || !to) taskHint = "Pick the pickup and drop locations first.";
    else if (onSiteMinutes === undefined) taskHint = `Pick the ${hoursField.label.toLowerCase()} first.`;
    else if (tripState.status === "error") taskHint = "Couldn't work out the route. Please try again.";
    else taskHint = "Working out the route…";

    const who = kind === "driver" ? "driver" : "companion";
    const traveller = whoFor === "self" ? "you'll" : whoFor === "parents" ? "your parent will" : "they'll";

    function handleMapPick(location: PickedLocation) {
        if (activeField === "from") {
            setFrom(location);
            // Move on to To so the next click sets the drop-off
            if (!to) setActiveField("to");
        } else {
            setTo(location);
        }
    }

    // What's missing on a step that the browser can't check itself, or null
    function stepProblem(i: number, data: FormData): string | null {
        if (i === 1 && (!from || !to)) return "Pick both a pickup and a drop location.";
        if (i === 2 && !data.get("time")) {
            if (needsAdmin || taskMinutes) return "Pick a pickup time.";
            return date ? taskHint : "Pick a day on the calendar.";
        }
        if (i === 3 && days > MAX_TRIP_DAYS) return `A booking can cover at most ${MAX_TRIP_DAYS} days.`;
        return null;
    }

    // Checks steps `first`..`last`; on a problem, opens that step and points at it
    function check(first: number, last: number) {
        const data = new FormData(formRef.current!);
        for (let i = first; i <= last; i++) {
            const fieldset = stepRefs.current[i];
            const invalid = fieldset && [...fieldset.elements].find(
                (el): el is HTMLInputElement => "checkValidity" in el && !(el as HTMLInputElement).checkValidity(),
            );
            const problem = stepProblem(i, data);
            if (invalid || problem) {
                setStep(i);
                setError(problem);
                // The step has to be visible before the browser can point at the field
                if (invalid) requestAnimationFrame(() => invalid.reportValidity());
                return false;
            }
        }
        setError(null);
        return true;
    }

    function goNext() {
        if (!check(step, step)) return;
        if (step + 1 === REVIEW_STEP) {
            const data = new FormData(formRef.current!);
            setReview(Object.fromEntries([...data.entries()].map(([k, v]) => [k, String(v)])));
        }
        setStep(step + 1);
    }

    function goBack() {
        setError(null);
        setStep(step - 1);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (step < REVIEW_STEP) {
            goNext();
            return;
        }
        // A later step can undo an earlier one (another vehicle changes the free times)
        if (!check(0, REVIEW_STEP - 1) || !trip || !from || !to || !date) return;
        const data = new FormData(event.currentTarget);
        const time = String(data.get("time"));
        setSaving(true);
        try {
            // The notice period, a full day and a free helper are checked again by the backend
            const booking = await saveBooking({
                serviceId: SERVICE_ID[kind],
                vehicleSource,
                from,
                to,
                onSiteMinutes,
                roundTrip,
                days,
                date,
                ...(endDate ? { endDate } : {}),
                time,
                ...(kind === "companion" ? { companionPurpose: data.get("companionPurpose") } : {}),
                description: describe(data),
            });
            setSubmitted({
                from,
                to,
                date,
                time,
                serviceHours: kind === "companion" ? hours : undefined,
                waitingHours: kind === "driver" && roundTrip ? hours : undefined,
                vehicleSource,
                roundTrip,
                days,
                endDate,
                booking,
            });
            setStep(DONE_STEP);
        } catch (saveError) {
            setError(`Couldn't save the booking: ${(saveError as Error).message}`);
        } finally {
            setSaving(false);
        }
    }

    const nextLabel = step === REVIEW_STEP - 1 ? "Review" : "Continue";

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.top}>
                    <Image src="/booking/logo.svg" alt="Lemmido" width={86} height={17}/>
                    <Link href="/" className={styles.close} aria-label="Close and go back home">
                        <Image src="/booking/close.svg" alt="" width={24} height={24}/>
                    </Link>
                </div>
                <Stepper step={step}/>

                <form ref={formRef} onSubmit={handleSubmit} noValidate className={styles.body}>
                    {/* Every step stays mounted (only hidden), so going back keeps what was entered */}
                    <fieldset ref={(el) => { stepRefs.current[0] = el; }} hidden={step !== 0} style={{ border: "none", margin: 0, padding: 0 }}>
                        <StepHeading step={0} title="Who are you booking for?" lead={`Tell us who needs the ${kind === "driver" ? "transportation" : "companion"} service.`}/>
                        <div className={`${styles.columns} ${styles.columnsWide}`}>
                            <div className={styles.stack}>
                                <div className={styles.whoRow} role="radiogroup" aria-label="Who is it for?">
                                    {WHO_FOR.map((option) => (
                                        <label key={option.value} className={styles.whoCard}>
                                            <input
                                                type="radio"
                                                name="whoFor"
                                                value={option.value}
                                                checked={whoFor === option.value}
                                                onChange={() => setWhoFor(option.value)}
                                                className={styles.srOnly}
                                            />
                                            <span className={styles.maskIcon} style={{ "--icon": `url(${option.icon})` } as React.CSSProperties}/>
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                                <h2 className={styles.sectionTitle}>Personal details</h2>
                                <div className={styles.fieldRow}>
                                    <label className={styles.field}>
                                        <span>Name<span className={styles.req}>*</span></span>
                                        <input name="name" required autoComplete={whoFor === "self" ? "name" : "off"} placeholder="Full name" className={styles.input}/>
                                    </label>
                                    <fieldset className={styles.radioGroup} style={{ flex: "0 0 auto" }}>
                                        <legend>Gender:</legend>
                                        <div className={styles.radios}>
                                            {["Male", "Female"].map((gender, i) => (
                                                <label key={gender} className={styles.radio}>
                                                    <input type="radio" name="gender" value={gender} required={i === 0}/>
                                                    {gender}
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                </div>
                                <div className={styles.field}>
                                    <span id="phone-label">Phone number<span className={styles.req}>*</span></span>
                                    <div className={styles.phone} role="group" aria-labelledby="phone-label">
                                        <select name="phoneCode" aria-label="Country code" defaultValue="+91" className={styles.select}>
                                            {COUNTRY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                                        </select>
                                        <input
                                            name="phone"
                                            type="tel"
                                            required
                                            inputMode="tel"
                                            autoComplete={whoFor === "self" ? "tel-national" : "off"}
                                            pattern="[0-9 ]{6,15}"
                                            title="6 to 15 digits"
                                            placeholder="Phone number"
                                            aria-label="Phone number"
                                            className={styles.input}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.illustration} aria-hidden="true">
                                <Image src="/booking/blob-1.svg" alt="" width={242} height={216} className={styles.blob1}/>
                                <Image src="/booking/blob-2.svg" alt="" width={281} height={219} className={styles.blob2} style={{ transform: "rotate(90deg)", transformOrigin: "center" }}/>
                                <Image src="/booking/family.png" alt="" width={252} height={268} className={styles.family}/>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset ref={(el) => { stepRefs.current[1] = el; }} hidden={step !== 1} style={{ border: "none", margin: 0, padding: 0 }}>
                        <StepHeading step={1} title="Where do you need the ride?" lead="Enter your pickup and drop location to continue."/>
                        <div className={styles.columns}>
                            <div className={styles.stack}>
                                {(["from", "to"] as const).map((field) => (
                                    <div key={field}>
                                        <PlaceSearch
                                            label={field === "from" ? "Pickup Location" : "Drop Location"}
                                            placeholder="Search for address"
                                            icon={<PlaceIcon field={field}/>}
                                            value={field === "from" ? from : to}
                                            onChange={field === "from" ? setFrom : setTo}
                                            active={activeField === field}
                                            onFocus={() => setActiveField(field)}
                                        />
                                        <div className={styles.chips}>
                                            <button
                                                type="button"
                                                className={styles.chip}
                                                aria-expanded={landmarks[field]}
                                                onClick={() => setLandmarks({ ...landmarks, [field]: !landmarks[field] })}
                                            >
                                                Add landmark
                                            </button>
                                        </div>
                                        {landmarks[field] && (
                                            <input
                                                name={field === "from" ? "fromLandmark" : "toLandmark"}
                                                aria-label={`${field === "from" ? "Pickup" : "Drop"} landmark`}
                                                placeholder="e.g. Opposite the bus stand"
                                                className={`${styles.input} ${styles.landmark}`}
                                                style={{ width: "100%" }}
                                            />
                                        )}
                                    </div>
                                ))}
                                {kind === "companion" && (
                                    <label className={styles.field}>
                                        <span>Where to?<span className={styles.req}>*</span></span>
                                        <select name="companionPurpose" required defaultValue="" className={styles.select}>
                                            <option value="" disabled>Pick one</option>
                                            {COMPANION_PURPOSES.map((purpose) => (
                                                <option key={purpose.value} value={purpose.value}>{purpose.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                                {kind === "driver" && (
                                    <label className={styles.check}>
                                        <input
                                            type="checkbox"
                                            name="roundTrip"
                                            // The helper always brings the customer's own vehicle back
                                            checked={roundTrip}
                                            disabled={vehicleSource === "customer"}
                                            onChange={(event) => setRoundTripPicked(event.target.checked)}
                                        />
                                        Round trip (the driver waits and brings me back)
                                    </label>
                                )}
                            </div>
                            <div>
                                <p className={styles.mapHint}>
                                    Or click the map to set the <strong>{activeField === "from" ? "pickup" : "drop"}</strong> location
                                </p>
                                <div className={styles.mapBox}>
                                    <RideMap from={from} to={to} onMapPick={handleMapPick} minHeight={200}/>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset ref={(el) => { stepRefs.current[2] = el; }} hidden={step !== 2} style={{ border: "none", margin: 0, padding: 0 }}>
                        <StepHeading step={2} title="Select date and time" lead={`Choose when you need the ${who}.`}/>
                        <div className={styles.notice}>
                            <Image src="/booking/notice.svg" alt="" width={29} height={29}/>
                            <div>
                                <strong>{MIN_NOTICE_HOURS}-hour notice required</strong>
                                <span>Requests must be submitted at least {MIN_NOTICE_HOURS} hours in advance.</span>
                            </div>
                        </div>
                        <div className={styles.columns} style={{ gridTemplateColumns: "auto minmax(0, 1fr)" }}>
                            <div className={styles.calendar}>
                                <BookingDatePicker
                                    name="date"
                                    label="Date"
                                    hideLabel
                                    accentColor={RED}
                                    // A multi-day job is scheduled by an admin, so any day can start it
                                    taskMinutes={isMultiDay ? undefined : taskMinutes}
                                    onChange={setDate}
                                />
                            </div>
                            <div className={styles.stack} style={{ gap: 24, paddingTop: 4 }}>
                                {/* First, since the free pickup times depend on how long the job takes */}
                                {hasOnSiteTime && (
                                    <label className={styles.field} style={{ flex: "none" }}>
                                        <span>{hoursField.label}<span className={styles.req}>*</span></span>
                                        <select
                                            name={kind === "driver" ? "waitingHours" : "serviceHours"}
                                            required
                                            value={hoursInput}
                                            onChange={(event) => setHoursInput(event.target.value)}
                                            className={styles.select}
                                            style={{ maxWidth: 220 }}
                                        >
                                            {hoursInput === "" && <option value="" disabled>Pick the hours</option>}
                                            {hourOptions(hoursField.min).map((h) => (
                                                <option key={h} value={String(h)}>{formatHours(h)}</option>
                                            ))}
                                        </select>
                                        <span className={styles.hint}>{hoursField.hint}</span>
                                    </label>
                                )}
                                <BookingTimeSelect
                                    name="time"
                                    label={isMultiDay ? "Pickup Time on the first day" : "Pickup Time"}
                                    variant="chips"
                                    accentColor={RED}
                                    date={date}
                                    taskMinutes={taskMinutes}
                                    taskHint={taskHint}
                                    anyTime={needsAdmin}
                                />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset ref={(el) => { stepRefs.current[3] = el; }} hidden={step !== 3} style={{ border: "none", margin: 0, padding: 0 }}>
                        <StepHeading step={3} title="Choose your vehicle" lead={`Select how ${traveller} travel.`}/>
                        <div className={styles.stack} style={{ marginTop: 20 }}>
                            <h2 className={styles.sectionTitle}>Vehicle</h2>
                            <div className={styles.vehicles} role="radiogroup" aria-label="Vehicle">
                                <label className={styles.vehicleCard}>
                                    <input
                                        type="radio"
                                        name="vehicleSource"
                                        value="customer"
                                        checked={vehicleSource === "customer"}
                                        onChange={() => setVehicleSource("customer")}
                                        className={styles.srOnly}
                                    />
                                    <Image src="/booking/car-own.png" alt="" width={174} height={112} className={styles.vehicleImage}/>
                                    <span className={styles.vehicleName}>My Own Car</span>
                                    <span className={styles.vehicleNote}>Our {who} drives your car and brings it back</span>
                                    <span className={styles.vehicleFoot}>Charged per hour of driving</span>
                                </label>
                                <label className={styles.vehicleCard}>
                                    <input
                                        type="radio"
                                        name="vehicleSource"
                                        value="ours"
                                        checked={vehicleSource === "ours"}
                                        onChange={() => setVehicleSource("ours")}
                                        className={styles.srOnly}
                                    />
                                    <Image src="/booking/car-lemmido.png" alt="" width={170} height={119} className={styles.vehicleImage}/>
                                    <span className={styles.vehicleName}>Lemmido Vehicle</span>
                                    <span className={styles.vehicleNote}>Car</span>
                                    <span className={styles.vehicleFoot}>
                                        Charged per km
                                        <span className={styles.seats}>
                                            <Image src="/booking/seats.svg" alt="" width={12} height={12}/>
                                            4 Seats
                                        </span>
                                    </span>
                                </label>
                            </div>
                            <h2 className={styles.sectionTitle} style={{ marginTop: 12 }}>Extras (Optional)</h2>
                            <div className={styles.extras}>
                                <div className={styles.fieldRow} style={{ gap: 40 }}>
                                    {EXTRAS.map((extra) => (
                                        <label key={extra.value} className={styles.check}>
                                            <input type="checkbox" name={extra.value}/>
                                            {extra.label}
                                        </label>
                                    ))}
                                </div>
                                {kind === "driver" && (
                                    <div className={styles.days}>
                                        <Image src="/booking/calendar.svg" alt="" width={25} height={25}/>
                                        <span id="days-label">
                                            Multiple-day booking?
                                            <small>*Same driver for the whole trip</small>
                                        </span>
                                        <span className={styles.stepperButtons} role="group" aria-labelledby="days-label">
                                            <button type="button" className={styles.iconButton} aria-label="One day fewer" disabled={days <= 1} onClick={() => setDays(days - 1)}>
                                                <Image src="/booking/minus.svg" alt="" width={20} height={20}/>
                                            </button>
                                            <output aria-live="polite">{days}</output>
                                            <button type="button" className={styles.iconButton} aria-label="One day more" disabled={days >= MAX_TRIP_DAYS} onClick={() => setDays(days + 1)}>
                                                <Image src="/booking/plus.svg" alt="" width={20} height={20}/>
                                            </button>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    <fieldset ref={(el) => { stepRefs.current[4] = el; }} hidden={step !== REVIEW_STEP} style={{ border: "none", margin: 0, padding: 0 }}>
                        <StepHeading step={REVIEW_STEP} title="Review" lead="Check all the details before proceeding."/>
                        <div className={styles.reviewGrid}>
                            <div className={styles.stack} style={{ gap: 12 }}>
                                <ReviewCard icon={<Image src="/booking/review-passenger.svg" alt="" width={40} height={40}/>} title="Passenger Details" onEdit={() => setStep(0)}>
                                    <span>{review.name}{review.gender ? `, ${review.gender}` : ""}</span>
                                    <span>{review.phoneCode} {review.phone}</span>
                                    <span className={styles.reviewMuted}>Booking for: {WHO_FOR.find((w) => w.value === whoFor)?.label}</span>
                                </ReviewCard>
                                <ReviewCard
                                    icon={<span className={styles.reviewIcon}><Image src="/booking/review-pin.svg" alt="" width={17} height={22}/></span>}
                                    title="Pickup → Destination"
                                    onEdit={() => setStep(1)}
                                >
                                    <span>{from?.address}{review.fromLandmark ? ` (${review.fromLandmark})` : ""}</span>
                                    <span>→ {to?.address}{review.toLandmark ? ` (${review.toLandmark})` : ""}</span>
                                    {kind === "companion" && review.companionPurpose && (
                                        <span className={styles.reviewMuted}>
                                            Where to: {COMPANION_PURPOSES.find((p) => p.value === review.companionPurpose)?.label}
                                        </span>
                                    )}
                                    {/* Only mounted on this step, so the extra map isn't loaded before it's needed */}
                                    {step === REVIEW_STEP && (
                                        <div className={styles.mapBox} style={{ marginTop: 8 }}>
                                            <RideMap from={from} to={to} onMapPick={() => {}} minHeight={110}/>
                                        </div>
                                    )}
                                </ReviewCard>
                                <ReviewCard
                                    icon={
                                        <span className={styles.reviewIcon}>
                                            <Image src="/booking/review-calendar.svg" alt="" width={18} height={20}/>
                                        </span>
                                    }
                                    title="Date & Time"
                                    onEdit={() => setStep(2)}
                                >
                                    <span>
                                        {review.time && to12Hour(review.time)} {date && formatDay(date)}
                                        {endDate && ` to ${formatDay(endDate)} (${days} days)`}
                                    </span>
                                    {hasOnSiteTime && <span className={styles.reviewMuted}>{hoursField.label}: {formatHours(hours)}</span>}
                                </ReviewCard>
                                <ReviewCard icon={<Image src="/booking/review-vehicle.svg" alt="" width={40} height={40}/>} title="Vehicle" onEdit={() => setStep(3)}>
                                    <span>{vehicleSource === "customer" ? "My Own Car" : "Lemmido Vehicle"}{roundTrip ? ", round trip" : ""}</span>
                                    {EXTRAS.filter((e) => review[e.value]).map((e) => <span key={e.value}>{e.label}</span>)}
                                </ReviewCard>
                                <label className={styles.field}>
                                    Notes (optional)
                                    <textarea name="description" rows={2} placeholder="Seats, luggage, stops…" className={styles.textarea}/>
                                </label>
                            </div>
                            <PriceDetails kind={kind} state={tripState} saving={saving}/>
                        </div>
                    </fieldset>

                    {step === DONE_STEP && submitted && (
                        <div>
                            <StepHeading
                                step={DONE_STEP}
                                title={submitted.booking.approvalMode === "auto" ? "Payment" : "Request sent"}
                                lead={`Booking ${submitted.booking.bookingId}`}
                            />
                            <div className={styles.done} role="status" style={{ marginTop: 20 }}>
                                <p style={{ margin: 0 }}>
                                    From {submitted.from.address} to {submitted.to.address} on {formatDay(submitted.date)} at {submitted.time} IST
                                    {submitted.endDate ? `, until ${formatDay(submitted.endDate)}` : ""}
                                    {submitted.serviceHours !== undefined && `, for ${submitted.serviceHours} h`}
                                    {submitted.waitingHours ? `, waiting ${submitted.waitingHours} h` : ""}
                                    {submitted.vehicleSource === "customer" ? ", in your vehicle" : ", in our vehicle"}
                                    {submitted.roundTrip ? ", round trip" : ""}.
                                </p>
                                <p className={styles.price} style={{ margin: 0 }}>
                                    {submitted.booking.approvalMode === "auto" && submitted.booking.quoteAmount !== null ? (
                                        <>
                                            <strong>To pay: {formatMoney(submitted.booking.quoteAmount, submitted.booking.currency)}</strong>
                                            Please pay by{" "}
                                            {new Date(submitted.booking.payBy!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}{" "}
                                            (India time). A {who} is assigned once it&apos;s paid.
                                        </>
                                    ) : (
                                        <>
                                            <strong>Price to follow</strong>
                                            An admin will check the booking and send you the price.
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {error && <p role="alert" className={styles.error} style={{ marginTop: 20 }}>{error}</p>}

                    <div className={styles.footer} hidden={step === REVIEW_STEP}>
                        {step === DONE_STEP ? (
                            <span/>
                        ) : step === 0 ? (
                            <Link href="/" className={styles.btnBack}>
                                <Image src="/booking/arrow-right.svg" alt="" width={20} height={20}/>
                                Back
                            </Link>
                        ) : (
                            <button type="button" className={styles.btnBack} onClick={goBack} disabled={saving}>
                                <Image src="/booking/arrow-right.svg" alt="" width={20} height={20}/>
                                Back
                            </button>
                        )}
                        {step === DONE_STEP ? (
                            <Link href="/" className={styles.btnNext}>
                                Back to home
                                <Image src="/booking/arrow-right-white.svg" alt="" width={20} height={20}/>
                            </Link>
                        ) : (
                            <button type="submit" className={styles.btnNext} disabled={saving}>
                                {nextLabel}
                                <Image src="/booking/arrow-right-white.svg" alt="" width={20} height={20}/>
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

function ReviewCard({ icon, title, onEdit, children }: { icon: React.ReactNode; title: string; onEdit: () => void; children: React.ReactNode }) {
    return (
        <section className={styles.reviewCard}>
            <div className={styles.reviewHead}>
                {icon}
                <h2>{title}</h2>
                <button type="button" className={styles.editLink} onClick={onEdit} aria-label={`Edit ${title}`}>Edit</button>
            </div>
            <div className={styles.reviewBody}>{children}</div>
        </section>
    );
}

// 565 minutes as 9 hrs 25 mins
function formatDuration(minutes: number) {
    const total = Math.round(minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return [h > 0 && `${h} hr${h === 1 ? "" : "s"}`, (m > 0 || h === 0) && `${m} min${m === 1 ? "" : "s"}`].filter(Boolean).join(" ");
}

// The trip's price, how it's made up, and the button that books it
function PriceDetails({ kind, state, saving }: { kind: Kind; state: ReturnType<typeof useTrip>; saving: boolean }) {
    const trip = state.status === "done" ? state.trip : null;
    const quote = trip?.quote;
    const money = (amount: number) => formatMoney(amount, trip?.currency ?? "INR");
    // A one-way driver doesn't wait, so there's no waiting charge to show
    const showOnSite = trip !== null && (kind !== "driver" || trip.roundTrip);
    const admin = quote?.approvalMode === "admin";

    return (
        <div className={styles.priceCard}>
            <h2>Price Details</h2>
            {state.status === "loading" && <p className={styles.reviewMuted}>Working out the price…</p>}
            {state.status === "error" && <p className={styles.error}>Couldn&apos;t work out the price: {state.message}</p>}
            {trip && quote && (
                <>
                    <dl className={styles.priceRows}>
                        <div><dt>Distance</dt><dd>{trip.distanceKm.toFixed(1)} km</dd></div>
                        <div><dt>Duration</dt><dd>{formatDuration(trip.taskMinutes)}</dd></div>
                        {quote.approvalMode === "auto" && (
                            <>
                                <div>
                                    <dt>
                                        Vehicle
                                        <small>
                                            {quote.billedKm !== null
                                                ? `${quote.billedKm} km at ${money(quote.travelAmount / quote.billedKm)}`
                                                : `${quote.billedDriveHrs} h driving at ${money(quote.travelAmount / (quote.billedDriveHrs || 1))}`}
                                        </small>
                                    </dt>
                                    <dd>{money(quote.travelAmount)}</dd>
                                </div>
                                <div><dt>Tax</dt><dd>----</dd></div>
                                {showOnSite && (
                                    <div>
                                        <dt>
                                            {kind === "driver" ? "Waiting Charge" : "Service Charge"}
                                            <small>{quote.billedOnSiteHrs} h at {money(quote.overrunRate)}</small>
                                        </dt>
                                        <dd>{money(quote.onSiteAmount)}</dd>
                                    </div>
                                )}
                            </>
                        )}
                    </dl>
                    <div className={styles.total}>
                        <span>Total</span>
                        <strong>{quote.approvalMode === "auto" ? money(quote.amount) : "To be confirmed"}</strong>
                    </div>
                    {quote.approvalMode === "admin" ? (
                        <p className={styles.approval}>
                            Admin approval required. Our team will check this price and email you a quote to accept.
                            <small> ({quote.reason}.)</small>
                        </p>
                    ) : (
                        <p className={styles.reviewMuted} style={{ fontSize: 12, margin: 0 }}>
                            If the job runs over, extra time is {money(quote.overrunRate)} per hour.
                        </p>
                    )}
                </>
            )}
            <button type="submit" className={styles.btnNext} disabled={saving || !quote} style={{ alignSelf: "flex-start" }}>
                {saving ? "Booking…" : admin ? "Send for Approval" : "Continue to Payment"}
                <Image src="/booking/arrow-right-white.svg" alt="" width={20} height={20}/>
            </button>
            <p className={styles.payNote}>
                {admin
                    ? "No payment now. You'll get a quote by email and pay only if you accept it."
                    : "Your booking is saved first. You'll see how to pay on the next step."}
            </p>
        </div>
    );
}
