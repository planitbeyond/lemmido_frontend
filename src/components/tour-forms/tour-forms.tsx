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

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function toOffer(p: TourPackage): Offer {
    const duration = [`${p.days} ${p.days === 1 ? "day" : "days"}`];
    if (p.nights > 0) duration.push(`${p.nights} ${p.nights === 1 ? "night" : "nights"}`);
    if (p.pricePerPerson !== null) duration.push(`${rupees.format(p.pricePerPerson / 100)} per person`);
    return { id: p.id, title: p.title, description: p.summary, detail: duration.join(" · ") };
}

// The tour packages as offers: null while loading, "error" if loading failed
function useTourPackages() {
    const [offers, setOffers] = useState<Offer[] | "error" | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/tour-packages`, { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then((data: { packages: TourPackage[] }) => setOffers(data.packages.map(toOffer)))
            .catch((error) => {
                if (error.name === "AbortError") return;
                console.error("Couldn't load the tour packages:", error);
                setOffers("error");
            });
        return () => controller.abort();
    }, []);

    return offers;
}

const staycations: Offer[] = [
    { id: "kumarakom", title: "Lakeside Retreat", description: "A calm stay on Vembanad lake with sunset canoe rides.", detail: "Kumarakom" },
    { id: "vagamon", title: "Hill Cottage", description: "Pine forests, meadows and cool mountain air.", detail: "Vagamon" },
    { id: "marari", title: "Beach Villa", description: "A quiet fishing-village beach, away from the crowds.", detail: "Marari" },
];

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

function TourPackages() {
    const offers = useTourPackages();

    if (offers === null) return <p style={{ margin: 0, color: "#555" }}>Loading packages…</p>;
    if (offers === "error") return <p role="alert" style={{ margin: 0, color: "#b00020" }}>Couldn&apos;t load the packages. Please try again later.</p>;
    if (offers.length === 0) return <p style={{ margin: 0, color: "#555" }}>No packages are available right now.</p>;

    return (
        <OfferPicker
            offers={offers}
            icon={<MapIcon/>}
            bookLabel="Book this package"
            backLabel="All packages"
            fields={<PackageFields/>}
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
            {category?.id === "staycations" && (
                <OfferPicker
                    key={category.id}
                    offers={staycations}
                    icon={<HomeIcon/>}
                    bookLabel="Book this stay"
                    backLabel="All staycations"
                    fields={<StaycationFields/>}
                />
            )}
        </div>
    );
}
