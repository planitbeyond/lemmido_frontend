"use client";

import { useState } from "react";
import BookingForm from "./booking-form";

export type Offer = { id: string; title: string; description: string; detail: string };

type Props = {
    offers: Offer[];
    icon: React.ReactNode;
    bookLabel: string;
    backLabel: string;
    // The booking fields shown once an offer is picked
    fields: React.ReactNode;
};

function OfferCard({ offer, icon, bookLabel, onSelect }: { offer: Offer; icon: React.ReactNode; bookLabel: string; onSelect: () => void }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            style={{
                flex: "1 1 260px",
                maxWidth: 360,
                display: "flex",
                flexDirection: "column",
                padding: 0,
                textAlign: "left",
                font: "inherit",
                color: "inherit",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: 10,
                overflow: "hidden",
                cursor: "pointer",
            }}
        >
            {/* Image placeholder until there are photos */}
            <div style={{ height: 150, background: "linear-gradient(135deg, #e8e8e8, #cfcfcf)" }}/>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 16px 16px" }}>
                <span
                    style={{
                        display: "grid",
                        placeItems: "center",
                        width: 48,
                        height: 48,
                        marginTop: -24,
                        borderRadius: 8,
                        background: "#f2f2f2",
                    }}
                >
                    {icon}
                </span>
                <strong style={{ fontWeight: 500, fontSize: 17 }}>{offer.title}</strong>
                <span style={{ fontSize: 13, color: "#555" }}>{offer.description}</span>
                <span style={{ fontSize: 13, color: "#888" }}>{offer.detail}</span>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                    {bookLabel}
                    <span
                        aria-hidden="true"
                        style={{ display: "grid", placeItems: "center", width: 24, height: 24, border: "1px solid #333", borderRadius: "50%", fontSize: 14 }}
                    >
                        →
                    </span>
                </span>
            </div>
        </button>
    );
}

// A grid of cards; picking one opens its booking form.
export default function OfferPicker({ offers, icon, bookLabel, backLabel, fields }: Props) {
    const [selected, setSelected] = useState<Offer | null>(null);

    if (!selected) {
        return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {offers.map((offer) => (
                    <OfferCard key={offer.id} offer={offer} icon={icon} bookLabel={bookLabel} onSelect={() => setSelected(offer)}/>
                ))}
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ alignSelf: "flex-start", padding: 0, border: "none", background: "none", font: "inherit", color: "#1a73e8", cursor: "pointer" }}
            >
                ← {backLabel}
            </button>
            {/* key resets the form when another offer is picked */}
            <BookingForm key={selected.id} title={selected.title} description={`${selected.description} ${selected.detail}.`}>
                <input type="hidden" name="offer" value={selected.title}/>
                {fields}
            </BookingForm>
        </div>
    );
}
