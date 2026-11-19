"use client";

import { useEffect, useState } from "react";
import BookingDatePicker from "../booking-date-picker";
import BookingForm, { field, input, NotesField, PeopleField } from "./booking-form";
import OfferPicker, { type Offer } from "./offer-picker";

type Category = "tour_packages" | "custom_tours" | "staycations";

const categories: { id: Category; title: string; description: string }[] = [
    { id: "tour_packages", title: "Tour Packages", description: "Ready-made trips with a set route and itinerary." },
    { id: "custom_tours", title: "Custom Tours", description: "Plan your own trip: pick the places, dates and pace." },
    { id: "staycations", title: "Staycations", description: "Short, relaxed stays close to home." },
];

// A tour package from GET /tour-packages (backend: packages/db/config/tour-packages.json)
type TourPackage = {
    id: string;
    title: string;
    summary: string;
    days: number;
    nights: number;
    // Paise; null if the package has no price yet
    pricePerPerson: number | null;
};

// A staycation from GET /staycations (backend: packages/db/config/staycations.json)
type Staycation = {
    id: string;
    title: string;
    summary: string;
    location: string;
    minNights: number;
    // Paise; null if the staycation has no price yet
    pricePerNight: number | null;
};

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function plural(count: number, word: string) {
    return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function packageOffer(p: TourPackage): Offer {
    const detail = [plural(p.days, "day")];
    if (p.nights > 0) detail.push(plural(p.nights, "night"));
    if (p.pricePerPerson !== null) detail.push(`${rupees.format(p.pricePerPerson / 100)} per person`);
    return { id: p.id, title: p.title, description: p.summary, detail: detail.join(" · ") };
}

function staycationOffer(s: Staycation): Offer {
    const detail = [s.location];
    if (s.pricePerNight !== null) detail.push(`${rupees.format(s.pricePerNight / 100)} per night`);
    if (s.minNights > 1) detail.push(`min ${plural(s.minNights, "night")}`);
    return { id: s.id, title: s.title, description: s.summary, detail: detail.join(" · ") };
}

// The list under `key` from the backend API at `path`, as offers:
// null while loading, "error" if loading failed
function useOffers<T>(path: string, key: string, toOffer: (item: T) => Offer) {
    const [offers, setOffers] = useState<Offer[] | "error" | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then((data: Record<string, T[]>) => setOffers((data[key] ?? []).map(toOffer)))
            .catch((error) => {
                if (error.name === "AbortError") return;
                console.error(`Couldn't load ${path}:`, error);
                setOffers("error");
            });
        return () => controller.abort();
    }, [path, key, toOffer]);

    return offers;
}

function MapIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/>
            <path d="M9 4v14M15 6v14"/>
        </svg>
    );
}

function HomeIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 11 12 4l9 7"/>
            <path d="M5 10v10h14V10"/>
            <path d="M10 20v-5h4v5"/>
        </svg>
    );
}

function PackageFields() {
    return (
        <>
            <BookingDatePicker name="date" label="Start date"/>
            <PeopleField/>
            <NotesField placeholder="Pickup point, food preferences…"/>
        </>
    );
}

function CustomTourFields() {
    return (
        <>
            <label style={field}>
                Places to visit
                <textarea name="places" rows={3} required placeholder="List the places, in any order" style={input}/>
            </label>
            <BookingDatePicker name="date" label="Date"/>
            <PeopleField/>
            <NotesField placeholder="Pace, interests, must-sees…"/>
        </>
    );
}

function StaycationFields() {
    return (
        <>
            <BookingDatePicker mode="range" startName="checkIn" endName="checkOut" label="Check-in → Check-out"/>
            <PeopleField/>
            <NotesField placeholder="Room type, activities…"/>
        </>
    );
}

type OfferListProps = Omit<React.ComponentProps<typeof OfferPicker>, "offers"> & {
    offers: Offer[] | "error" | null;
    // Plural name used in the loading and error messages, e.g. "packages"
    what: string;
};

function OfferList({ offers, what, ...picker }: OfferListProps) {
    if (offers === null) return <p style={{ margin: 0, color: "#555" }}>Loading {what}…</p>;
    if (offers === "error") return <p role="alert" style={{ margin: 0, color: "#b00020" }}>Couldn&apos;t load the {what}. Please try again later.</p>;
    if (offers.length === 0) return <p style={{ margin: 0, color: "#555" }}>No {what} are available right now.</p>;
    return <OfferPicker offers={offers} {...picker}/>;
}

function TourPackages() {
    const offers = useOffers("/tour-packages", "packages", packageOffer);
    return (
        <OfferList
            offers={offers}
            what="packages"
            icon={<MapIcon/>}
            bookLabel="Book this package"
            backLabel="All packages"
            fields={<PackageFields/>}
        />
    );
}

function Staycations() {
    const offers = useOffers("/staycations", "staycations", staycationOffer);
    return (
        <OfferList
            offers={offers}
            what="staycations"
            icon={<HomeIcon/>}
            bookLabel="Book this stay"
            backLabel="All staycations"
            fields={<StaycationFields/>}
        />
    );
}

export default function TourForms() {
    const [active, setActive] = useState<Category | null>(null);
    const category = categories.find((c) => c.id === active);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div role="group" aria-label="Tour type" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {categories.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        aria-pressed={c.id === active}
                        onClick={() => setActive(c.id)}
                        style={{
                            ...input,
                            cursor: "pointer",
                            background: c.id === active ? "#1a73e8" : "#fff",
                            color: c.id === active ? "#fff" : "inherit",
                            borderColor: c.id === active ? "#1a73e8" : "#ccc",
                        }}
                    >
                        {c.title}
                    </button>
                ))}
            </div>

            {!category && <p style={{ margin: 0, color: "#555" }}>Choose a tour type to see its form.</p>}

            {/* key resets each section when switching categories */}
            {category?.id === "tour_packages" && <TourPackages key={category.id}/>}
            {category?.id === "custom_tours" && (
                <BookingForm key={category.id} title={category.title} description={category.description}>
                    <CustomTourFields/>
                </BookingForm>
            )}
            {category?.id === "staycations" && <Staycations key={category.id}/>}
        </div>
    );
}
