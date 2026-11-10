"use client";

import { useState } from "react";
import type { PickedLocation } from "./kerala";
import PlaceSearch from "./place-search";
import RideMap from "./ride-map";

type Ride = {
    from: PickedLocation;
    to: PickedLocation;
    date: string;
    time: string;
    description: string;
};

const field = { display: "flex", flexDirection: "column", gap: 4 } as const;
const input = { padding: 8, border: "1px solid #ccc", borderRadius: 6, font: "inherit" };

type Field = "from" | "to";

// Not saved anywhere yet: there is no rides endpoint on the backend,
// so submitting only shows back what was entered.
export default function RideForm() {
    const [from, setFrom] = useState<PickedLocation | null>(null);
    const [to, setTo] = useState<PickedLocation | null>(null);
    // The field a map click fills
    const [activeField, setActiveField] = useState<Field>("from");
    const [missing, setMissing] = useState(false);
    const [submitted, setSubmitted] = useState<Ride | null>(null);

    function handleMapPick(location: PickedLocation) {
        if (activeField === "from") {
            setFrom(location);
            // Move on to To so the next click sets the drop-off
            if (!to) setActiveField("to");
        } else {
            setTo(location);
        }
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        // The pickers aren't form inputs, so the browser can't mark them required
        if (!from || !to) {
            setMissing(true);
            return;
        }
        setMissing(false);
        const data = new FormData(event.currentTarget);
        setSubmitted({
            from,
            to,
            date: String(data.get("date")),
            time: String(data.get("time")),
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
                    <div style={{ display: "flex", gap: 12 }}>
                        <label style={{ ...field, flex: 1 }}>
                            Date
                            <input name="date" type="date" required style={input}/>
                        </label>
                        <label style={{ ...field, flex: 1 }}>
                            Time
                            <input name="time" type="time" required style={input}/>
                        </label>
                    </div>
                    <label style={field}>
                        Description
                        <textarea name="description" rows={4} placeholder="Seats, luggage, stops…" style={input}/>
                    </label>
                    {missing && (
                        <p role="alert" style={{ color: "#b00020", margin: 0 }}>Pick both a From and a To location.</p>
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
                    Ride from {submitted.from.address} to {submitted.to.address} on {submitted.date} at {submitted.time}.
                </p>
            )}
        </>
    );
}
