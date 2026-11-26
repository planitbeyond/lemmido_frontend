"use client";

import { useEffect, useState } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import styles from "./booking-date-picker.module.css";
import { parseDateInputValue, toDateInputValue, useEarliestBookingDate } from "../lib/booking-dates";

type Props = {
    label: string;
    // Keeps the label for screen readers only
    hideLabel?: boolean;
    // Colour of the picked day; the blue default matches the other forms
    accentColor?: string;
} & (
    // One day, submitted under `name` as YYYY-MM-DD
    | {
          mode?: "single";
          name: string;
          // Task length (service + travel) in minutes. When set, days with no free helper
          // for a task this long can't be picked either
          taskMinutes?: number;
          // Called with the picked day as YYYY-MM-DD, or undefined when cleared
          onChange?: (day: string | undefined) => void;
          // Fills the picked day and shades the days after it, this many days in all
          // (e.g. a 3-day trip from the 28th shades the 28th to the 30th)
          spanDays?: number;
      }
    // A span of days, submitted as `startName` and `endName` (YYYY-MM-DD). Counted in
    // nights for a stay (check-out after check-in), or in days for a job that runs
    // over several days (the last day after the first, both counted)
    | {
          mode: "range";
          startName: string;
          endName: string;
          unit?: "nights" | "days";
          // Called with the first and last day and the count, or undefined until both are picked
          onChange?: (range: { from: string; to: string; count: number } | undefined) => void;
      }
);

// What the range calendar says, per unit
const RANGE_TEXT = {
    nights: {
        pickStart: "Pick the check-in day.",
        pickEnd: "Now pick the check-out day.",
        startError: "Pick the check-in day on the calendar.",
        endError: "Pick a check-out day after the check-in day.",
        // Picking the same day twice gives zero nights
        count: (gapDays: number) => gapDays,
        label: (n: number) => `${n} night${n === 1 ? "" : "s"}`,
    },
    days: {
        pickStart: "Pick the first day.",
        pickEnd: "Now pick the last day.",
        startError: "Pick the first day on the calendar.",
        endError: "Pick a last day after the first day.",
        // Both ends are working days; one day is a single-day booking, not a range
        count: (gapDays: number) => (gapDays > 0 ? gapDays + 1 : 0),
        label: (n: number) => `${n} days`,
    },
};

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
    return useDateList(from && to ? `/bookings/full-dates?from=${from}&to=${to}` : undefined, "fullDates", "fully booked dates");
}

// YYYY-MM-DD days from `from` to `to` with no start time when any helper is free
// for a task of `taskMinutes`. Empty without a task length, until loaded, or if loading fails.
function useUnavailableDates(from: string | undefined, to: string | undefined, taskMinutes: number | undefined) {
    return useDateList(
        from && to && taskMinutes ? `/bookings/unavailable-dates?from=${from}&to=${to}&taskMinutes=${taskMinutes}` : undefined,
        "unavailableDates",
        "dates with no free helper",
    );
}

// A list of YYYY-MM-DD days from the backend API at `path`, under `key` in the response
function useDateList(path: string | undefined, key: string, what: string) {
    const [loaded, setLoaded] = useState<{ path: string; dates: string[] } | null>(null);

    useEffect(() => {
        if (!path) return;
        const controller = new AbortController();
        fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then((data: Record<string, string[]>) => setLoaded({ path, dates: data[key] ?? [] }))
            .catch((error) => {
                if (error.name !== "AbortError") console.error(`Couldn't load the ${what}:`, error);
            });
        return () => controller.abort();
    }, [path, key, what]);

    // A list loaded for an earlier path (e.g. a different task length) doesn't apply any more
    return path && loaded?.path === path ? loaded.dates : [];
}

// Days inside the notice period, fully booked days and (with a task length) days
// with no free helper can't be picked, and a range can't run across them.
export default function BookingDatePicker(props: Props) {
    const { label, hideLabel = false, accentColor = "#1a73e8" } = props;
    const earliest = useEarliestBookingDate();
    const firstDay = earliest ? parseDateInputValue(earliest) : undefined;
    const lastMonth = firstDay && new Date(firstDay.getFullYear(), firstDay.getMonth() + MONTHS_AHEAD, 1);
    const lastDay = lastMonth && new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    const lastDayValue = lastDay && toDateInputValue(lastDay);
    const fullDates = useFullDates(earliest, lastDayValue);
    const taskMinutes = props.mode === "range" ? undefined : props.taskMinutes;
    const unavailableDates = useUnavailableDates(earliest, lastDayValue, taskMinutes);
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
        ...unavailableDates.map(parseDateInputValue),
    ];
    const calendar = {
        defaultMonth: firstDay,
        startMonth: firstDay,
        endMonth: lastMonth,
        disabled,
        style: {
            "--rdp-accent-color": accentColor,
            "--rdp-accent-background-color": `color-mix(in srgb, ${accentColor} 12%, white)`,
            margin: 0,
        } as React.CSSProperties,
    };

    let picker: React.ReactNode;
    if (props.mode === "range") {
        const text = RANGE_TEXT[props.unit ?? "nights"];
        const { onChange } = props;
        const { from, to } = range ?? {};
        // DST-safe: local midnights can be 23 or 25 h apart
        const countOf = (r: DateRange | undefined) =>
            r?.from && r.to ? text.count(Math.round((r.to.getTime() - r.from.getTime()) / DAY_MS)) : 0;
        const count = countOf(range);
        picker = (
            <>
                <DayPicker
                    {...calendar}
                    mode="range"
                    selected={range}
                    onSelect={(picked) => {
                        setRange(picked);
                        const n = countOf(picked);
                        onChange?.(n > 0 ? { from: toDateInputValue(picked!.from!), to: toDateInputValue(picked!.to!), count: n } : undefined);
                    }}
                    excludeDisabled
                    resetOnSelect
                    footer={
                        count > 0 ? `${from!.toDateString()} → ${to!.toDateString()} · ${text.label(count)}`
                        : from ? text.pickEnd
                        : text.pickStart
                    }
                />
                <HiddenField name={props.startName} value={from ? toDateInputValue(from) : ""} error={from ? "" : text.startError}/>
                <HiddenField
                    name={props.endName}
                    value={count > 0 ? toDateInputValue(to!) : ""}
                    error={count > 0 || !from ? "" : text.endError}
                />
            </>
        );
    } else {
        const { onChange, spanDays } = props;
        // The span's last day; local dates, so DST doesn't shift it
        const spanEnd = day && spanDays && spanDays > 0
            ? new Date(day.getFullYear(), day.getMonth(), day.getDate() + spanDays - 1)
            : undefined;
        picker = (
            <>
                <DayPicker
                    {...calendar}
                    mode="single"
                    selected={day}
                    onSelect={(picked) => {
                        setDay(picked);
                        onChange?.(picked && toDateInputValue(picked));
                    }}
                    {...(day && spanEnd ? {
                        modifiers: { spanStart: day, span: { from: day, to: spanEnd }, spanEnd },
                        modifiersClassNames: { spanStart: styles.spanStart, span: styles.span, spanEnd: styles.spanEnd },
                    } : {})}
                />
                <HiddenField name={props.name} value={day ? toDateInputValue(day) : ""} error={day ? "" : "Pick a day on the calendar."}/>
            </>
        );
    }

    return (
        <div role="group" aria-label={label} style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
            {!hideLabel && label}
            {picker}
        </div>
    );
}
