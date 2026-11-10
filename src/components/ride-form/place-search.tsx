"use client";

import { useEffect, useId, useRef, useState } from "react";
import { loadGoogleMaps } from "../../lib/google-maps";
import { isInKerala, KERALA_BOUNDS, type PickedLocation } from "./kerala";

// Wait this long after the last keystroke before asking Google for suggestions
const SEARCH_DELAY_MS = 250;

type Props = {
    label: string;
    value: PickedLocation | null;
    onChange: (location: PickedLocation) => void;
    // Highlights the field the next map click will fill
    active: boolean;
    onFocus: () => void;
};

// A search box with a dropdown of places in Kerala.
export default function PlaceSearch({ label, value, onChange, active, onFocus }: Props) {
    const listId = useId();
    const [places, setPlaces] = useState<google.maps.PlacesLibrary | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [pickError, setPickError] = useState<string | null>(null);

    const [query, setQuery] = useState(value?.address ?? "");
    const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);

    // Groups the keystrokes and the final lookup of one search into a single billed session
    const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

    // When the location is set from outside (a map click), show its address in the box
    const [shownValue, setShownValue] = useState(value);
    if (value !== shownValue) {
        setShownValue(value);
        if (value) setQuery(value.address);
    }

    useEffect(() => {
        let cancelled = false;
        loadGoogleMaps()
            .then(() => google.maps.importLibrary("places") as Promise<google.maps.PlacesLibrary>)
            .then((library) => {
                if (cancelled) return;
                sessionRef.current = new library.AutocompleteSessionToken();
                setPlaces(library);
            })
            .catch((err: Error) => setLoadError(err.message));
        return () => {
            cancelled = true;
        };
    }, []);

    // Fetch suggestions as the user types
    useEffect(() => {
        const input = query.trim();
        if (!places || !open || input.length < 2) return;

        let stale = false;
        const timer = setTimeout(async () => {
            try {
                const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input,
                    includedRegionCodes: ["in"],
                    locationRestriction: KERALA_BOUNDS,
                    sessionToken: sessionRef.current ?? undefined,
                });
                if (stale) return;
                // Search is limited to a box around Kerala; drop the border towns
                // of neighbouring states that the box also covers. Matches both
                // "Kerala" and "Keralam".
                const inKerala = suggestions
                    .map((s) => s.placePrediction)
                    .filter((p): p is google.maps.places.PlacePrediction => !!p && p.text.text.includes("Kerala"));
                setSuggestions(inKerala);
                setHighlighted(-1);
            } catch {
                if (!stale) setSuggestions([]);
            }
        }, SEARCH_DELAY_MS);

        return () => {
            stale = true;
            clearTimeout(timer);
        };
    }, [query, places, open]);

    async function select(prediction: google.maps.places.PlacePrediction) {
        setOpen(false);
        setSuggestions([]);
        setPickError(null);
        const place = prediction.toPlace();
        try {
            await place.fetchFields({ fields: ["formattedAddress", "location", "addressComponents"] });
        } catch {
            setPickError("Couldn't load that place. Please try again.");
            return;
        } finally {
            // The lookup ends the billing session; the next search starts a new one
            if (places) sessionRef.current = new places.AutocompleteSessionToken();
        }
        if (!place.location) return;
        // The dropdown only lists Kerala places, so this is just a safety net
        const components = (place.addressComponents ?? []).map((c) => ({ types: c.types, code: c.shortText }));
        if (!isInKerala(components)) return;
        onChange({
            address: place.formattedAddress ?? prediction.text.text,
            lat: place.location.lat(),
            lng: place.location.lng(),
        });
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (!open || suggestions.length === 0) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlighted((i) => (i + 1) % suggestions.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        } else if (event.key === "Enter") {
            // Pick the highlighted place instead of submitting the form
            event.preventDefault();
            select(suggestions[Math.max(highlighted, 0)]);
        } else if (event.key === "Escape") {
            setOpen(false);
        }
    }

    const showList = open && query.trim().length >= 2 && suggestions.length > 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label htmlFor={`${listId}-input`}>{label}</label>
            <div style={{ position: "relative" }}>
                <input
                    id={`${listId}-input`}
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={showList && highlighted >= 0 ? `${listId}-${highlighted}` : undefined}
                    placeholder={loadError ? "Search unavailable" : places ? "Search places in Kerala" : "Loading…"}
                    disabled={!places}
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => {
                        setOpen(true);
                        onFocus();
                    }}
                    onBlur={() => setOpen(false)}
                    onKeyDown={handleKeyDown}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: 8,
                        border: active ? "2px solid #1a73e8" : "1px solid #ccc",
                        borderRadius: 6,
                        font: "inherit",
                    }}
                />
                {showList && (
                    <ul
                        id={listId}
                        role="listbox"
                        style={{
                            position: "absolute",
                            zIndex: 10,
                            top: "100%",
                            left: 0,
                            right: 0,
                            margin: "4px 0 0",
                            padding: 4,
                            listStyle: "none",
                            background: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: 6,
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        }}
                    >
                        {suggestions.map((prediction, i) => (
                            <li
                                key={prediction.placeId}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === highlighted}
                                // mousedown fires before the input's blur closes the list
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    select(prediction);
                                }}
                                onMouseEnter={() => setHighlighted(i)}
                                style={{ padding: "8px 10px", borderRadius: 4, cursor: "pointer", background: i === highlighted ? "#f0f0f0" : undefined }}
                            >
                                <div>{prediction.mainText?.text ?? prediction.text.text}</div>
                                {prediction.secondaryText && (
                                    <div style={{ fontSize: 13, color: "#666" }}>{prediction.secondaryText.text}</div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {(loadError || pickError) && (
                <span role="alert" style={{ fontSize: 14, color: "#b00020" }}>{loadError ?? pickError}</span>
            )}
        </div>
    );
}
