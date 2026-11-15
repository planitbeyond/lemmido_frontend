"use client";

import { useState } from "react";
import { useEarliestBookingDate } from "../../lib/booking-dates";
import BookingForm, { field, input, NotesField, PeopleField, row } from "./booking-form";
import OfferPicker, { type Offer } from "./offer-picker";

type Category = "tour_packages" | "custom_tours" | "staycations";

const categories: { id: Category; title: string; description: string }[] = [
    { id: "tour_packages", title: "Tour Packages", description: "Ready-made trips with a set route and itinerary." },
    { id: "custom_tours", title: "Custom Tours", description: "Plan your own trip: pick the places, dates and pace." },
    { id: "staycations", title: "Staycations", description: "Short, relaxed stays close to home." },
];

// Placeholder offers until there is a real catalog on the backend
const packages: Offer[] = [
    { id: "munnar", title: "Munnar Tea Hills", description: "Tea estates, misty viewpoints and Eravikulam park.", detail: "3 days · 2 nights" },
    { id: "alleppey", title: "Alleppey Backwaters", description: "A night on a houseboat through the canals.", detail: "2 days · 1 night" },
    { id: "fort_kochi", title: "Fort Kochi Heritage", description: "Chinese nets, Jew Town and the old Dutch quarter.", detail: "1 day" },
    { id: "wayanad", title: "Wayanad Wildlife", description: "Forest drives, waterfalls and Edakkal caves.", detail: "3 days · 2 nights" },
    { id: "varkala", title: "Varkala Cliffs", description: "Cliff-top walks and quiet beaches.", detail: "2 days · 1 night" },
    { id: "thekkady", title: "Thekkady Spice Trail", description: "Spice gardens and a boat ride on Periyar lake.", detail: "2 days · 1 night" },
];

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
    const minDate = useEarliestBookingDate();
    return (
        <>
            <div style={row}>
                <label style={{ ...field, flex: 1 }}>
                    Start date
                    <input name="startDate" type="date" min={minDate} required style={input}/>
                </label>
                <div style={{ flex: 1 }}><PeopleField/></div>
            </div>
            <NotesField placeholder="Pickup point, food preferences…"/>
        </>
    );
}

function CustomTourFields() {
    const minDate = useEarliestBookingDate();
    return (
        <>
            <label style={field}>
                Places to visit
                <textarea name="places" rows={3} required placeholder="List the places, in any order" style={input}/>
            </label>
            <div style={row}>
                <label style={{ ...field, flex: 1 }}>
                    Start date
                    <input name="startDate" type="date" min={minDate} required style={input}/>
                </label>
                <label style={{ ...field, flex: 1 }}>
                    End date
                    <input name="endDate" type="date" min={minDate} required style={input}/>
                </label>
            </div>
            <PeopleField/>
            <NotesField placeholder="Pace, interests, must-sees…"/>
        </>
    );
}

function StaycationFields() {
    const minDate = useEarliestBookingDate();
    return (
        <>
            <div style={row}>
                <label style={{ ...field, flex: 1 }}>
                    Check-in
                    <input name="checkIn" type="date" min={minDate} required style={input}/>
                </label>
                <label style={{ ...field, flex: 1 }}>
                    Check-out
                    <input name="checkOut" type="date" min={minDate} required style={input}/>
                </label>
            </div>
            <PeopleField/>
            <NotesField placeholder="Room type, activities…"/>
        </>
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
            {category?.id === "tour_packages" && (
                <OfferPicker
                    key={category.id}
                    offers={packages}
                    icon={<MapIcon/>}
                    bookLabel="Book this package"
                    backLabel="All packages"
                    fields={<PackageFields/>}
                />
            )}
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
