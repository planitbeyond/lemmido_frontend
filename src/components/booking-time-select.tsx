"use client";

import { useEffect, useState } from "react";
import { MIN_NOTICE_HOURS } from "../lib/booking-dates";

type Props = {
    label: string;
    // Submitted under this name as HH:MM, India time
    name: string;
    // The picked day as YYYY-MM-DD, or undefined until one is picked
    date: string | undefined;
    // Task length (service + travel) in minutes, or undefined until it's known
    taskMinutes: number | undefined;
    // What to show while there's no task length, e.g. what to fill in first
    taskHint?: string;
    // The job needs an admin's approval, who also assigns the helper: offer every
    // time outside the notice period, without checking helpers
    anyTime?: boolean;
    // With anyTime: the HH:MM times to offer instead of every hour
    slotTimes?: string[];
    // A dropdown, or a grid of buttons (one radio per time)
    variant?: "select" | "chips";
    // Chips: colour of the picked time
    accentColor?: string;
};

const field = { display: "flex", flexDirection: "column", gap: 4 } as const;
const input = { padding: 8, border: "1px solid #ccc", borderRadius: 6, font: "inherit" };

type Loaded = { key: string; times: string[] } | { key: string; error: true };

// Every pickup time, one hour apart: 00:00, 01:00 … 23:00
const SLOT_TIMES = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

// 14:30 as 02:30 PM
function to12Hour(time: string) {
    const [h, m] = time.split(":").map(Number);
    return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const chipGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
    gap: "10px",
    maxHeight: 180,
    overflowY: "auto",
    padding: 2,
} as const;

function TimeChips({ name, times, accentColor }: { name: string; times: string[]; accentColor: string }) {
    const [picked, setPicked] = useState<string | null>(null);
    return (
        <div role="radiogroup" style={chipGrid}>
            {times.map((time, i) => {
                const on = time === picked;
                return (
                    <label
                        key={time}
                        style={{
                            display: "grid",
                            placeItems: "center",
                            height: 36,
                            border: `1px solid ${on ? accentColor : "#6e6e6d"}`,
                            borderRadius: 10,
                            fontSize: 14,
                            background: on ? accentColor : "#fff",
                            color: on ? "#fff" : "#000",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                        }}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={time}
                            // One required radio is enough for the group
                            required={i === 0}
                            checked={on}
                            onChange={() => setPicked(time)}
                            style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
                        />
                        {to12Hour(time)}
                    </label>
                );
            })}
        </div>
    );
}

// The times on a day that start after the notice period. India has no clock
// changes, so it's always UTC+05:30.
function timesAfterNotice(date: string, slots: string[]) {
    const earliest = Date.now() + MIN_NOTICE_HOURS * 60 * 60 * 1000;
    return slots.filter((time) => Date.parse(`${date}T${time}:00+05:30`) >= earliest);
}

// Start times on the :00/:30 grid when at least one helper is free for the whole
// task, from the backend API. Showing a time doesn't hold a helper: submit checks again.
// With anyTime, every time outside the notice period instead.
export { to12Hour };

export default function BookingTimeSelect({
    label,
    name,
    date,
    taskMinutes,
    taskHint = "Enter the service hours first.",
    anyTime = false,
    slotTimes = SLOT_TIMES,
    variant = "select",
    accentColor = "#1a73e8",
}: Props) {
    const key = date && taskMinutes && !anyTime ? `date=${date}&taskMinutes=${taskMinutes}` : undefined;
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
    const times = anyTime && date ? timesAfterNotice(date, slotTimes) : current && "times" in current ? current.times : [];

    let hint: string | null = null;
    if (!date) hint = "Pick a day first.";
    else if (anyTime) hint = times.length > 0 ? "An admin will confirm the time and assign a helper." : "No times left that day. Please pick another day.";
    else if (!taskMinutes) hint = taskHint;
    else if (!current) hint = "Loading free times…";
    else if ("error" in current) hint = "Couldn't load the free times. Please try again.";
    else if (times.length === 0) hint = "No helper is free that day for this long. Please pick another day.";

    // The key resets the choice when the list changes, so a time that's gone can't stay picked
    const listKey = anyTime ? `any ${date}` : key;

    if (variant === "chips") {
        return (
            <div role="group" aria-label={`${label} (IST)`} style={{ ...field, gap: 12 }}>
                <span style={{ fontSize: 17, fontWeight: 500 }}>{label} (IST)</span>
                {times.length > 0 && <TimeChips key={listKey} name={name} times={times} accentColor={accentColor}/>}
                {hint && <span style={{ fontSize: 14, color: "#555" }}>{hint}</span>}
            </div>
        );
    }

    return (
        <label style={field}>
            {label} (India time)
            <select key={listKey} name={name} required disabled={times.length === 0} defaultValue="" style={input}>
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
