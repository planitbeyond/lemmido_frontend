"use client";

import { useState } from "react";
import BookingDatePicker from "../booking-date-picker";
import BookingTimeSelect from "../booking-time-select";
import type { PickedLocation } from "./kerala";
import PlaceSearch from "./place-search";
import RideMap from "./ride-map";

type Ride = {
    from: PickedLocation;
    to: PickedLocation;
    date: string;
    time: string;
    // Companion: how long the helper stays (booking `service_hrs`)
    serviceHours?: number;
    // Driver: how long the driver waits at the destination
    waitingHours?: number;
    description: string;
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

// R1: a task lasts at most 9 h
const MAX_TASK_MINUTES = 9 * 60;

// TODO: work out the drive time from the From and To locations. Until then a
// driver booking is checked as a 2 h drive (`services.service_hrs` for a two-way drive).
const PLACEHOLDER_TRAVEL_MINUTES = 120;

// Whether a helper can still take this booking. The time list only shows free
// times, but someone may have taken the last free helper since it loaded.
async function isStillAvailable(date: string, time: string, taskMinutes: number) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/check-availability`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, time, taskMinutes }),
    });
    const data: { available?: boolean; error?: string } = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data.available === true;
}

// Not saved anywhere yet: there is no rides endpoint on the backend, so submitting
// checks a helper is free and then only shows back what was entered.
export default function RideForm({ kind }: Props) {
    const [from, setFrom] = useState<PickedLocation | null>(null);
    const [to, setTo] = useState<PickedLocation | null>(null);
    // The field a map click fills
    const [activeField, setActiveField] = useState<Field>("from");
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState<Ride | null>(null);
    const [date, setDate] = useState<string | undefined>();
    // Service hours for a companion, waiting time for a driver
    const [hoursInput, setHoursInput] = useState(kind === "driver" ? "0" : "");
    const hoursField = HOURS_FIELD[kind];
    const hours = hoursInput === "" ? NaN : Number(hoursInput);
    // The task length the helper availability is checked for (the backend rounds it
    // up to 30 min). A companion's is the service hours alone; a driver's is the
    // drive plus the waiting time.
    const minutes = hours >= hoursField.min ? Math.round(hours * 60) : NaN;
    const total = kind === "driver" ? PLACEHOLDER_TRAVEL_MINUTES + minutes : minutes;
    const taskMinutes = total > 0 && total <= MAX_TASK_MINUTES ? total : undefined;

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
        if (typeof time !== "string" || !time || !taskMinutes) {
            setError("Pick a time when a helper is free.");
            return;
        }
        // The notice period is checked here too, by the backend (the time list leaves those times out)
        try {
            if (!(await isStillAvailable(String(data.get("date")), time, taskMinutes))) {
                setError("That time was just taken. Please pick another one.");
                return;
            }
        } catch (checkError) {
            setError(`Couldn't check that a helper is free: ${(checkError as Error).message}`);
            return;
        }
        setError(null);
        setSubmitted({
            from,
            to,
            date: String(data.get("date")),
            time,
            serviceHours: kind === "companion" ? hours : undefined,
            waitingHours: kind === "driver" ? hours : undefined,
            description: String(data.get("description")),
        });
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
                    <label style={field}>
                        {hoursField.label}
                        <input
                            name={kind === "driver" ? "waitingHours" : "serviceHours"}
                            type="number"
                            min={hoursField.min}
                            // R1: the whole task, drive included, lasts at most 9 h
                            max={(MAX_TASK_MINUTES - (kind === "driver" ? PLACEHOLDER_TRAVEL_MINUTES : 0)) / 60}
                            step={0.5}
                            required
                            placeholder={hoursField.placeholder}
                            value={hoursInput}
                            onChange={(event) => setHoursInput(event.target.value)}
                            style={input}
                        />
                    </label>
                    <BookingDatePicker name="date" label="Date" taskMinutes={taskMinutes} onChange={setDate}/>
                    <BookingTimeSelect name="time" label="Time" date={date} taskMinutes={taskMinutes}/>
                    <label style={field}>
                        Description
                        <textarea name="description" rows={4} placeholder="Seats, luggage, stops…" style={input}/>
                    </label>
                    {error && (
                        <p role="alert" style={{ color: "#b00020", margin: 0 }}>{error}</p>
                    )}
                    <button type="submit" style={{ ...input, cursor: "pointer", alignSelf: "flex-start" }}>
                        Submit
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
                    Ride from {submitted.from.address} to {submitted.to.address} on {submitted.date} at {submitted.time}
                    {submitted.serviceHours !== undefined && ` for ${submitted.serviceHours} h`}
                    {submitted.waitingHours ? `, waiting ${submitted.waitingHours} h` : ""}.
                </p>
            )}
        </>
    );
}
