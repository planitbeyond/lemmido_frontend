import { useSyncExternalStore } from "react";

// Services have to be booked at least this long before they start
export const MIN_NOTICE_HOURS = 48;

// YYYY-MM-DD in the user's own timezone, the format booking forms submit
export function toDateInputValue(date: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The reverse of toDateInputValue: midnight of that day, local time
export function parseDateInputValue(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

export function earliestBookingDate() {
    return toDateInputValue(new Date(Date.now() + MIN_NOTICE_HOURS * 60 * 60 * 1000));
}

// True when a date (and optional HH:MM time) is at least MIN_NOTICE_HOURS away
export function hasEnoughNotice(date: string, time = "00:00") {
    const start = new Date(`${date}T${time}`);
    return start.getTime() - Date.now() >= MIN_NOTICE_HOURS * 60 * 60 * 1000;
}

const noSubscribe = () => () => {};

// The first day booking calendars allow. Undefined during server rendering, since
// "today" there is the server's clock and timezone, not the user's.
export function useEarliestBookingDate() {
    return useSyncExternalStore(noSubscribe, earliestBookingDate, () => undefined);
}
