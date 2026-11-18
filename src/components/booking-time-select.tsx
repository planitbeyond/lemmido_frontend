"use client";

import { useEffect, useState } from "react";

type Props = {
    label: string;
    // Submitted under this name as HH:MM, India time
    name: string;
    // The picked day as YYYY-MM-DD, or undefined until one is picked
    date: string | undefined;
    // Task length (service + travel) in minutes, or undefined until it's known
    taskMinutes: number | undefined;
};

const field = { display: "flex", flexDirection: "column", gap: 4 } as const;
const input = { padding: 8, border: "1px solid #ccc", borderRadius: 6, font: "inherit" };

type Loaded = { key: string; times: string[] } | { key: string; error: true };

// Start times on the :00/:30 grid when at least one helper is free for the whole
// task, from the backend API. Showing a time doesn't hold a helper: submit checks again.
export default function BookingTimeSelect({ label, name, date, taskMinutes }: Props) {
    const key = date && taskMinutes ? `date=${date}&taskMinutes=${taskMinutes}` : undefined;
    const [loaded, setLoaded] = useState<Loaded | null>(null);

    useEffect(() => {
        if (!key) return;
        const controller = new AbortController();
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/available-times?${key}`, { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then((data: { times: string[] }) => setLoaded({ key, times: data.times }))
            .catch((error) => {
                if (error.name === "AbortError") return;
                console.error("Couldn't load the free times:", error);
                setLoaded({ key, error: true });
            });
        return () => controller.abort();
    }, [key]);

    // Times loaded for an earlier day or task length don't apply any more
    const current = key && loaded?.key === key ? loaded : null;
    const times = current && "times" in current ? current.times : [];

    let hint: string | null = null;
    if (!date) hint = "Pick a day first.";
    else if (!taskMinutes) hint = "Enter the service hours first.";
    else if (!current) hint = "Loading free times…";
    else if ("error" in current) hint = "Couldn't load the free times. Please try again.";
    else if (times.length === 0) hint = "No helper is free that day for this long. Please pick another day.";

    return (
        <label style={field}>
            {label} (India time)
            {/* The key resets the choice when the list changes, so a time that's gone can't stay picked */}
            <select key={key} name={name} required disabled={times.length === 0} defaultValue="" style={input}>
                <option value="" disabled>
                    {times.length > 0 ? "Pick a time" : "—"}
                </option>
                {times.map((time) => (
                    <option key={time} value={time}>{time}</option>
                ))}
            </select>
            {hint && <span style={{ fontSize: 14, color: "#555" }}>{hint}</span>}
        </label>
    );
}
