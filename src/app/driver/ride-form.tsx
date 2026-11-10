"use client";

import { useState } from "react";
import LocationPicker, { type PickedLocation } from "./location-picker";

type Ride = {
    from: PickedLocation;
    to: PickedLocation;
    date: string;
    time: string;
    description: string;
};

const field = { display: "flex", flexDirection: "column", gap: 4 } as const;
const input = { padding: 8, border: "1px solid #ccc", borderRadius: 6, font: "inherit" };

// Not saved anywhere yet: there is no rides endpoint on the backend,
// so submitting only shows back what was entered.
export default function RideForm() {
    const [from, setFrom] = useState<PickedLocation | null>(null);
    const [to, setTo] = useState<PickedLocation | null>(null);
    const [missing, setMissing] = useState(false);
    const [submitted, setSubmitted] = useState<Ride | null>(null);

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
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
                <LocationPicker label="From" value={from} onChange={setFrom}/>
                <LocationPicker label="To" value={to} onChange={setTo}/>
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
            </form>
            {submitted && (
                <p role="status">
                    Ride from {submitted.from.address} to {submitted.to.address} on {submitted.date} at {submitted.time}.
                </p>
            )}
        </>
    );
}
