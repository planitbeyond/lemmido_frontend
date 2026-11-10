"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../../lib/google-maps";

export type PickedLocation = { address: string; lat: number; lng: number };

// Where the map opens before anything is picked
const DEFAULT_CENTER = { lat: 10.8505, lng: 76.2711 };

// Advanced markers need a map ID. DEMO_MAP_ID is Google's ID for testing;
// swap in your own from the Cloud console for production styling.
const MAP_ID = "DEMO_MAP_ID";

type Props = {
    label: string;
    value: PickedLocation | null;
    onChange: (location: PickedLocation) => void;
};

// Search for a place, or click the map to drop the pin anywhere.
export default function LocationPicker({ label, value, onChange }: Props) {
    const searchRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    // Keep the latest callback without re-creating the map on every render
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        let cancelled = false;
        let autocomplete: google.maps.places.PlaceAutocompleteElement | null = null;

        async function init() {
            await loadGoogleMaps();
            const [{ Map }, { PlaceAutocompleteElement }, { AdvancedMarkerElement }, { Geocoder }] = await Promise.all([
                google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
                google.maps.importLibrary("places") as Promise<google.maps.PlacesLibrary>,
                google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
                google.maps.importLibrary("geocoding") as Promise<google.maps.GeocodingLibrary>,
            ]);
            if (cancelled || !mapRef.current || !searchRef.current) return;

            const map = new Map(mapRef.current, {
                center: DEFAULT_CENTER,
                zoom: 8,
                mapId: MAP_ID,
                streetViewControl: false,
                mapTypeControl: false,
            });
            const marker = new AdvancedMarkerElement({ map });
            const geocoder = new Geocoder();

            function pick(location: PickedLocation) {
                marker.position = { lat: location.lat, lng: location.lng };
                map.panTo(marker.position);
                onChangeRef.current(location);
            }

            autocomplete = new PlaceAutocompleteElement({});
            autocomplete.style.width = "100%";
            searchRef.current.replaceChildren(autocomplete);
            autocomplete.addEventListener("gmp-select", async (event) => {
                const place = event.placePrediction.toPlace();
                await place.fetchFields({ fields: ["formattedAddress", "location"] });
                if (!place.location) return;
                map.setZoom(15);
                pick({
                    address: place.formattedAddress ?? "",
                    lat: place.location.lat(),
                    lng: place.location.lng(),
                });
            });

            map.addListener("click", async (event: google.maps.MapMouseEvent) => {
                if (!event.latLng) return;
                const lat = event.latLng.lat();
                const lng = event.latLng.lng();
                const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                try {
                    const { results } = await geocoder.geocode({ location: event.latLng });
                    pick({ address: results[0]?.formatted_address ?? fallback, lat, lng });
                } catch {
                    pick({ address: fallback, lat, lng });
                }
            });
        }

        init().catch((err: Error) => setError(err.message));
        return () => {
            cancelled = true;
            autocomplete?.remove();
        };
    }, []);

    return (
        <fieldset style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid #ccc", borderRadius: 6, padding: 12 }}>
            <legend>{label}</legend>
            {error ? (
                <p role="alert" style={{ color: "#b00020", margin: 0 }}>Map unavailable: {error}</p>
            ) : (
                <>
                    <div ref={searchRef}/>
                    <div ref={mapRef} style={{ height: 240, borderRadius: 6 }}/>
                </>
            )}
            <span style={{ fontSize: 14, color: "#555" }}>
                {value ? value.address : "Search above or click the map"}
            </span>
        </fieldset>
    );
}
