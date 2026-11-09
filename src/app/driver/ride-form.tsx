"use client";

import { useState } from "react";

type Ride = {
    from: string;
    to: string;
    date: string;
    time: string;
    description: string;
};

const field = { display: "flex", flexDirection: "column", gap: 4 } as const;
const input = { padding: 8, border: "1px solid #ccc", borderRadius: 6, font: "inherit" };

// Not saved anywhere yet: there is no rides endpoint on the backend,
// so submitting only shows back what was entered.
export default function RideForm() {
    const [submitted, setSubmitted] = useState<Ride | null>(null);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSubmitted({
            from: String(data.get("from")),
            to: String(data.get("to")),
            date: String(data.get("date")),
            time: String(data.get("time")),
            description: String(data.get("description")),
        });
    }

    return (
        <>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
                <label style={field}>
                    From
                    <input name="from" required placeholder="Pick-up location" style={input}/>
                </label>
                <label style={field}>
                    To
                    <input name="to" required placeholder="Drop-off location" style={input}/>
                </label>
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
                <button type="submit" style={{ ...input, cursor: "pointer", alignSelf: "flex-start" }}>
                    Submit
                </button>
            </form>
            {submitted && (
                <p role="status">
                    Ride from {submitted.from} to {submitted.to} on {submitted.date} at {submitted.time}.
                </p>
            )}
        </>
    );
}
