"use client";

import { useState } from "react";
import BookingDatePicker from "../booking-date-picker";
import BookingTimeSelect from "../booking-time-select";
import type { PickedLocation } from "./kerala";
import PlaceSearch from "./place-search";
import RideMap from "./ride-map";
import { useTrip, type Quote, type VehicleSource } from "./use-trip";

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

const field = { display: "flex", flexDirection: "column", gap: 4 } as const;
const input = { padding: 8, border: "1px solid #ccc", borderRadius: 6, font: "inherit" };

type Field = "from" | "to";

type Kind = "driver" | "companion";

type Props = {
    kind: Kind;
};

// The hours field each kind of ride asks for. A companion is booked for at least
// half an hour; a driver may not wait at all.
const HOURS_FIELD: Record<Kind, { label: string; min: number; placeholder: string }> = {
    companion: { label: "Service hours", min: 0.5, placeholder: "e.g. 3" },
    driver: { label: "Waiting time (hours)", min: 0, placeholder: "e.g. 1" },
};

// The backend's service for each kind of ride (services.service_id, from the seed)
const SERVICE_ID: Record<Kind, string> = { driver: "ser_01", companion: "ser_03" };

const VEHICLE_OPTIONS: { value: VehicleSource; label: string }[] = [
    { value: "ours", label: "Ours (charged per km)" },
    { value: "customer", label: "Mine (the helper drives my vehicle, charged per hour of driving)" },
];

// R1: a task lasts at most 9 h. Longer jobs need an admin's approval, which
// can't be booked online yet.
const MAX_TASK_MINUTES = 9 * 60;

// An amount in minor units (paise) as money, e.g. ₹1,945
function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 })
        .format(amount / 100);
}

const COMPANION_PURPOSES = [
    { value: "hospital", label: "Hospital" },
    { value: "bank", label: "Bank" },
    { value: "office", label: "Office" },
    { value: "other", label: "Other" },
];

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

export default function RideForm({ kind }: Props) {
    const [from, setFrom] = useState<PickedLocation | null>(null);
    const [to, setTo] = useState<PickedLocation | null>(null);
    // The field a map click fills
    const [activeField, setActiveField] = useState<Field>("from");
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState<Ride | null>(null);
    const [saving, setSaving] = useState(false);
    const [date, setDate] = useState<string | undefined>();
    // Service hours for a companion, waiting time for a driver
    const [hoursInput, setHoursInput] = useState(kind === "driver" ? "0" : "");
    const [vehicleSource, setVehicleSource] = useState<VehicleSource>("ours");
    const hoursField = HOURS_FIELD[kind];
    const hours = hoursInput === "" ? NaN : Number(hoursInput);
    const onSiteMinutes = hours >= hoursField.min && hours <= 9 ? Math.round(hours * 60) : undefined;

    // The trip, Base → From → To → Base, and its price, once everything it needs is filled in
    const tripState = useTrip(
        from && to && onSiteMinutes !== undefined
            ? {
                  serviceId: SERVICE_ID[kind],
                  vehicleSource,
                  from: { lat: from.lat, lng: from.lng },
                  to: { lat: to.lat, lng: to.lng },
                  onSiteMinutes,
              }
            : undefined,
    );
    const trip = tripState.status === "done" ? tripState.trip : null;
    // The task length the helper availability is checked for: all the driving plus the
    // time at the destination (the backend rounds it up to 30 min)
    const tripMinutes = trip && Math.ceil(trip.taskMinutes);
    const taskMinutes = tripMinutes && tripMinutes <= MAX_TASK_MINUTES ? tripMinutes : undefined;

    // Why there are no times to pick yet
    let taskHint: string;
    if (!from || !to) taskHint = "Pick From and To first.";
    else if (onSiteMinutes === undefined) taskHint = `Enter the ${hoursField.label.toLowerCase()} first.`;
    else if (tripState.status === "error") taskHint = "Couldn't work out the route. Please try again.";
    else if (trip) taskHint = "This job takes more than 9 hours, so it needs an admin's approval. That can't be booked online yet.";
    else taskHint = "Working out the route…";

    function handleMapPick(location: PickedLocation) {
        if (activeField === "from") {
            setFrom(location);
            // Move on to To so the next click sets the drop-off
            if (!to) setActiveField("to");
        } else {
            setTo(location);
        }
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // The pickers aren't form inputs, so the browser can't mark them required
        if (!from || !to) {
            setError("Pick both a From and a To location.");
            return;
        }
        const data = new FormData(event.currentTarget);
        // The time list is disabled (so not submitted) when no time is free
        const time = data.get("time");
        if (typeof time !== "string" || !time || !taskMinutes || !trip) {
            setError("Pick a time when a helper is free.");
            return;
        }
        const date = String(data.get("date"));
        const description = String(data.get("description") ?? "");
        setError(null);
        setSaving(true);
        try {
            // The notice period, a full day and a free helper are checked again by the backend
            const booking = await saveBooking({
                serviceId: SERVICE_ID[kind],
                vehicleSource,
                from,
                to,
                onSiteMinutes,
                date,
                time,
                ...(kind === "companion" ? { companionPurpose: data.get("companionPurpose") } : {}),
                ...(description.trim() ? { description } : {}),
            });
            setSubmitted({
                from,
                to,
                date,
                time,
                serviceHours: kind === "companion" ? hours : undefined,
                waitingHours: kind === "driver" ? hours : undefined,
                vehicleSource,
                booking,
            });
        } catch (saveError) {
            setError(`Couldn't save the booking: ${(saveError as Error).message}`);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "stretch" }}>
                <div style={{ flex: "1 1 320px", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>
                    <PlaceSearch
                        label="From"
                        value={from}
                        onChange={setFrom}
                        active={activeField === "from"}
                        onFocus={() => setActiveField("from")}
                    />
                    <PlaceSearch
                        label="To"
                        value={to}
                        onChange={setTo}
                        active={activeField === "to"}
                        onFocus={() => setActiveField("to")}
                    />
                    {kind === "companion" && (
                        <label style={field}>
                            Where to?
                            <select name="companionPurpose" required defaultValue="" style={input}>
                                <option value="" disabled>Pick one</option>
                                {COMPANION_PURPOSES.map((purpose) => (
                                    <option key={purpose.value} value={purpose.value}>{purpose.label}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <fieldset style={{ ...field, border: "none", padding: 0, margin: 0 }}>
                        <legend style={{ padding: 0, marginBottom: 4 }}>Whose vehicle?</legend>
                        {VEHICLE_OPTIONS.map((option) => (
                            <label key={option.value} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <input
                                    type="radio"
                                    name="vehicleSource"
                                    value={option.value}
                                    checked={vehicleSource === option.value}
                                    onChange={() => setVehicleSource(option.value)}
                                />
                                {option.label}
                            </label>
                        ))}
                    </fieldset>
                    <label style={field}>
                        {hoursField.label}
                        <input
                            name={kind === "driver" ? "waitingHours" : "serviceHours"}
                            type="number"
                            min={hoursField.min}
                            // R1: the whole job lasts at most 9 h; the price says if driving takes it over
                            max={9}
                            step={0.5}
                            required
                            placeholder={hoursField.placeholder}
                            value={hoursInput}
                            onChange={(event) => setHoursInput(event.target.value)}
                            style={input}
                        />
                    </label>
                    <TripPrice kind={kind} state={tripState}/>
                    <BookingDatePicker name="date" label="Date" taskMinutes={taskMinutes} onChange={setDate}/>
                    <BookingTimeSelect name="time" label="Time" date={date} taskMinutes={taskMinutes} taskHint={taskHint}/>
                    <label style={field}>
                        Description
                        <textarea name="description" rows={4} placeholder="Seats, luggage, stops…" style={input}/>
                    </label>
                    {error && (
                        <p role="alert" style={{ color: "#b00020", margin: 0 }}>{error}</p>
                    )}
                    <button type="submit" disabled={saving} style={{ ...input, cursor: "pointer", alignSelf: "flex-start" }}>
                        {saving ? "Booking…" : "Book"}
                    </button>
                </div>
                <div style={{ flex: "1 1 360px", display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 14, color: "#555" }}>
                        Click the map to set <strong>{activeField === "from" ? "From (A)" : "To (B)"}</strong>
                    </span>
                    <RideMap from={from} to={to} onMapPick={handleMapPick}/>
                </div>
            </form>
            {submitted && (
                <p role="status">
                    Booked ({submitted.booking.bookingId}): from {submitted.from.address} to {submitted.to.address} on{" "}
                    {submitted.date} at {submitted.time}
                    {submitted.serviceHours !== undefined && ` for ${submitted.serviceHours} h`}
                    {submitted.waitingHours ? `, waiting ${submitted.waitingHours} h` : ""}
                    {submitted.vehicleSource === "customer" ? ", in your vehicle" : ", in our vehicle"}.{" "}
                    {submitted.booking.approvalMode === "auto" && submitted.booking.quoteAmount !== null
                        ? `Price: ${formatMoney(submitted.booking.quoteAmount, submitted.booking.currency)}. Please pay by ${
                              new Date(submitted.booking.payBy!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
                          } (India time). A helper is assigned once it's paid.`
                        : "An admin will check it and send you the price."}
                </p>
            )}
        </>
    );
}

// The trip's price, how it's made up, and the rate for extra time
function TripPrice({ kind, state }: { kind: Kind; state: ReturnType<typeof useTrip> }) {
    const box = { padding: 12, borderRadius: 6, background: "#f5f5f5", fontSize: 14, margin: 0 } as const;
    if (state.status === "idle") return null;
    if (state.status === "loading") return <p style={box}>Working out the price…</p>;
    if (state.status === "error") return <p style={{ ...box, color: "#b00020" }}>Couldn&apos;t work out the price: {state.message}</p>;

    const { quote, currency, distanceKm } = state.trip;
    if (quote.approvalMode === "admin") {
        return <p style={box}>An admin will send you the price. {quote.reason}.</p>;
    }
    const money = (amount: number) => formatMoney(amount, currency);
    const travel = quote.billedKm !== null
        ? `${quote.billedKm} km`
        : `${quote.billedDriveHrs} h of driving`;
    const onSite = kind === "driver" ? "waiting" : "service";
    return (
        <div style={box}>
            <strong style={{ fontSize: 16 }}>Price: {money(quote.amount)}</strong>
            <div>
                Travel {money(quote.travelAmount)} ({travel}, from our base in Thiruvalla and back, {distanceKm.toFixed(1)} km in all)
                {" + "}{onSite} {money(quote.onSiteAmount)} ({quote.billedOnSiteHrs} h)
            </div>
            <div style={{ color: "#555" }}>
                If the job runs over, extra time is charged at {money(quote.overrunRate)} per hour.
            </div>
        </div>
    );
}
