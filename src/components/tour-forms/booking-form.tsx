"use client";

import { useState } from "react";

export const field = { display: "flex", flexDirection: "column", gap: 4 } as const;
export const input = { padding: 8, border: "1px solid #ccc", borderRadius: 6, font: "inherit" };

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
    // Left out for a form whose page already says what it's for
    title?: string;
    description?: string;
    children: React.ReactNode;
    // Replaces the plain Submit button, e.g. Back and Request quote. Given whether the
    // request has been sent, so the button can turn into "Submitted".
    actions?: React.ReactNode | ((submitted: boolean) => React.ReactNode);
};

// Not saved anywhere yet: there is no tours endpoint on the backend,
// so submitting only marks the request as sent.
export default function BookingForm({ title, description, children, actions }: Props) {
    const [submitted, setSubmitted] = useState(false);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitted(true);
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {title && <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>}
                {description && <p style={{ margin: 0, color: "#555" }}>{description}</p>}
                {children}
                {typeof actions === "function" ? actions(submitted) : actions ?? (
                    <button type="submit" disabled={submitted} style={{ ...input, cursor: "pointer", alignSelf: "flex-start" }}>
                        {submitted ? "Sent" : "Submit"}
                    </button>
                )}
            </form>
        </div>
    );
}
