"use client";

import { useEffect, useState } from "react";

// Whose vehicle the helper drives: ours is charged per km, the customer's per hour of driving
export type VehicleSource = "ours" | "customer";

export type TripRequest = {
    serviceId: string;
    vehicleSource: VehicleSource;
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    // The driver's waiting time or the companion's service time
    onSiteMinutes: number;
    // Driver in our vehicle: bring the customer back to the pickup
    roundTrip: boolean;
    // How many days the job runs over: more than one is priced by an admin
    days: number;
};

// Amounts are minor units (paise for INR)
export type Quote =
    | {
          approvalMode: "auto";
          amount: number;
          travelAmount: number;
          onSiteAmount: number;
          billedKm: number | null;
          billedDriveHrs: number | null;
          billedOnSiteHrs: number;
          overrunRate: number;
      }
    | { approvalMode: "admin"; reason: string };

// The job's trip from POST /bookings/trip: Base → From → To → Base, or on a
// round trip Base → From → To → From → Base
export type Trip = {
    // Every driving leg in order; the first and last are to and from our base
    legs: { distanceMeters: number; durationSeconds: number }[];
    distanceKm: number;
    driveMinutes: number;
    leaveBaseMinutes: number;
    // Driving plus the time at the destination: what helper availability is checked for
    taskMinutes: number;
    // What was priced: a driver in the customer's vehicle is always a round trip,
    // and a one-way driver doesn't wait
    roundTrip: boolean;
    onSiteMinutes: number;
    currency: string;
    quote: Quote;
};

export type TripState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; trip: Trip };

// Waits this long after the last change before asking, so typing the hours
// doesn't look up a route (a billed Google request) on every keystroke
const DEBOUNCE_MS = 500;

type Loaded = { key: string; trip: Trip } | { key: string; error: string };

// The trip and price for a request, or idle while the request is incomplete
export function useTrip(request: TripRequest | undefined): TripState {
    const key = request ? JSON.stringify(request) : undefined;
    const [loaded, setLoaded] = useState<Loaded | null>(null);

    useEffect(() => {
        if (!key) return;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/trip`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: key,
                signal: controller.signal,
            })
                .then(async (res) => {
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
                    setLoaded({ key, trip: data as Trip });
                })
                .catch((error) => {
                    if (error.name === "AbortError") return;
                    console.error("Couldn't work out the trip:", error);
                    setLoaded({ key, error: error.message });
                });
        }, DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [key]);

    if (!key) return { status: "idle" };
    // A trip loaded for an earlier request doesn't apply any more
    if (loaded?.key !== key) return { status: "loading" };
    return "trip" in loaded ? { status: "done", trip: loaded.trip } : { status: "error", message: loaded.error };
}
