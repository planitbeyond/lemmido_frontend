"use client";

import { useEffect, useState } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import { parseDateInputValue, toDateInputValue, useEarliestBookingDate } from "../lib/booking-dates";

type Props = {
    label: string;
} & (
    // One day, submitted under `name` as YYYY-MM-DD
    | { mode?: "single"; name: string }
    // A stay of one night or more, submitted as `startName` and `endName`
    | { mode: "range"; startName: string; endName: string }
);

// How far ahead the calendar lets you go
const MONTHS_AHEAD = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

// Kept in the form so the browser's validation still runs (a type="hidden"
// input would skip it), but out of sight: the calendar is what people use.
const hiddenInput = { position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" } as const;

function HiddenField({ name, value, error }: { name: string; value: string; error: string }) {
    return (
        <input
            name={name}
            value={value}
            onChange={() => {}}
            // Blocks the submit, with this message, while there is an error
            ref={(el) => el?.setCustomValidity(error)}
            tabIndex={-1}
            aria-hidden="true"
            style={hiddenInput}
        />
    );
}

// YYYY-MM-DD days from `from` to `to` that are fully booked, from the backend API
// (lemmido_backend/apps/api). Empty until loaded, or if loading fails.
function useFullDates(from: string | undefined, to: string | undefined) {
    const [fullDates, setFullDates] = useState<string[]>([]);

    useEffect(() => {
        if (!from || !to) return;
        const controller = new AbortController();
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/full-dates?from=${from}&to=${to}`, { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then((data: { fullDates: string[] }) => setFullDates(data.fullDates))
            .catch((error) => {
                if (error.name !== "AbortError") console.error("Couldn't load the fully booked dates:", error);
            });
        return () => controller.abort();
    }, [from, to]);

    return fullDates;
}

// Days inside the notice period and fully booked days can't be picked,
// and a range can't run across them.
export default function BookingDatePicker(props: Props) {
    const { label } = props;
    const earliest = useEarliestBookingDate();
    const firstDay = earliest ? parseDateInputValue(earliest) : undefined;
    const lastMonth = firstDay && new Date(firstDay.getFullYear(), firstDay.getMonth() + MONTHS_AHEAD, 1);
    const lastDay = lastMonth && new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    const fullDates = useFullDates(earliest, lastDay && toDateInputValue(lastDay));
    const [day, setDay] = useState<Date | undefined>();
    const [range, setRange] = useState<DateRange | undefined>();

    // Today depends on the user's clock, so the calendar only renders in the browser
    if (!firstDay || !lastMonth || !lastDay) {
        return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{label}</div>;
    }

    const disabled: Matcher[] = [
        { before: firstDay },
        { after: lastDay },
        ...fullDates.map(parseDateInputValue),
    ];
    const calendar = {
        defaultMonth: firstDay,
        startMonth: firstDay,
        endMonth: lastMonth,
        disabled,
        style: { "--rdp-accent-color": "#1a73e8", "--rdp-accent-background-color": "#e8f0fe", margin: 0 } as React.CSSProperties,
    };

    let picker: React.ReactNode;
    if (props.mode === "range") {
        const { from, to } = range ?? {};
        // Picking the same day twice gives from === to, which is zero nights
        const nights = from && to ? Math.round((to.getTime() - from.getTime()) / DAY_MS) : 0;
        picker = (
            <>
                <DayPicker
                    {...calendar}
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    excludeDisabled
                    resetOnSelect
                    footer={
                        nights > 0 ? `${from!.toDateString()} → ${to!.toDateString()} · ${nights} night${nights === 1 ? "" : "s"}`
                        : from ? "Now pick the check-out day."
                        : "Pick the check-in day."
                    }
                />
                <HiddenField name={props.startName} value={from ? toDateInputValue(from) : ""} error={from ? "" : "Pick the check-in day on the calendar."}/>
                <HiddenField
                    name={props.endName}
                    value={nights > 0 ? toDateInputValue(to!) : ""}
                    error={nights > 0 || !from ? "" : "Pick a check-out day after the check-in day."}
                />
            </>
        );
    } else {
        picker = (
            <>
                <DayPicker
                    {...calendar}
                    mode="single"
                    selected={day}
                    onSelect={setDay}
                    footer={day ? `Selected: ${day.toDateString()}` : "Pick a day."}
                />
                <HiddenField name={props.name} value={day ? toDateInputValue(day) : ""} error={day ? "" : "Pick a day on the calendar."}/>
            </>
        );
    }

    return (
        <div role="group" aria-label={label} style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
            {label}
            {picker}
        </div>
    );
}
