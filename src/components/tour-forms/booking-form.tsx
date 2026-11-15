"use client";

import { useState } from "react";

export const field = { display: "flex", flexDirection: "column", gap: 4 } as const;
export const input = { padding: 8, border: "1px solid #ccc", borderRadius: 6, font: "inherit" };
export const row = { display: "flex", gap: 12 } as const;

export function PeopleField() {
    return (
        <label style={field}>
            People
            <input name="people" type="number" min={1} max={50} defaultValue={1} required style={input}/>
        </label>
    );
}

export function NotesField({ placeholder }: { placeholder: string }) {
    return (
        <label style={field}>
            Notes
            <textarea name="notes" rows={3} placeholder={placeholder} style={input}/>
        </label>
    );
}

type Props = {
    title: string;
    description: string;
    children: React.ReactNode;
};

// Not saved anywhere yet: there is no tours endpoint on the backend,
// so submitting only shows back what was entered.
export default function BookingForm({ title, description, children }: Props) {
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState<[string, string][] | null>(null);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        // Both date-range forms need the end on or after the start
        const start = data.get("startDate") ?? data.get("checkIn");
        const end = data.get("endDate") ?? data.get("checkOut");
        if (start && end && String(end) < String(start)) {
            setError("The end date can't be before the start date.");
            return;
        }
        setError(null);
        setSubmitted(
            [...data.entries()]
                .map(([name, value]) => [name, String(value)] as [string, string])
                .filter(([, value]) => value !== ""),
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
                <p style={{ margin: 0, color: "#555" }}>{description}</p>
                {children}
                {error && <p role="alert" style={{ color: "#b00020", margin: 0 }}>{error}</p>}
                <button type="submit" style={{ ...input, cursor: "pointer", alignSelf: "flex-start" }}>
                    Submit
                </button>
            </form>
            {submitted && (
                <div role="status">
                    <strong>{title} request</strong>
                    <ul style={{ margin: "4px 0 0" }}>
                        {submitted.map(([name, value]) => (
                            <li key={name}>{name}: {value}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
