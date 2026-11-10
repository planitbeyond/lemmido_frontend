"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../../lib/google-maps";
import { isInKerala, KERALA_BOUNDS, type PickedLocation } from "./kerala";

// Advanced markers need a map ID. DEMO_MAP_ID is Google's ID for testing;
// swap in your own from the Cloud console for production styling.
const MAP_ID = "DEMO_MAP_ID";

type Props = {
    from: PickedLocation | null;
    to: PickedLocation | null;
    // Called with the address of a clicked spot in Kerala
    onMapPick: (location: PickedLocation) => void;
};

type MapParts = {
    map: google.maps.Map;
    fromMarker: google.maps.marker.AdvancedMarkerElement;
    toMarker: google.maps.marker.AdvancedMarkerElement;
    Route: typeof google.maps.routes.Route;
};

type RouteSummary = { distance: string; duration: string };

// One map showing both pins. Clicking it picks a spot.
export default function RideMap({ from, to, onMapPick }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    // Google's map objects are changed in place, so they live in a ref, not state
    const partsRef = useRef<MapParts | null>(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clickError, setClickError] = useState<string | null>(null);
    const [route, setRoute] = useState<RouteSummary | null>(null);
    const [routeError, setRouteError] = useState<string | null>(null);

    // Keep the latest callback without re-creating the map on every render
    const onMapPickRef = useRef(onMapPick);
    useEffect(() => {
        onMapPickRef.current = onMapPick;
    }, [onMapPick]);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            await loadGoogleMaps();
            const [{ Map }, { AdvancedMarkerElement, PinElement }, { Geocoder }, { Route }] = await Promise.all([
                google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
                google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
                google.maps.importLibrary("geocoding") as Promise<google.maps.GeocodingLibrary>,
                google.maps.importLibrary("routes") as Promise<google.maps.RoutesLibrary>,
            ]);
            if (cancelled || !mapRef.current) return;

            const map = new Map(mapRef.current, {
                center: { lat: 10.85, lng: 76.27 },
                zoom: 7,
                restriction: { latLngBounds: KERALA_BOUNDS, strictBounds: false },
                mapId: MAP_ID,
                streetViewControl: false,
                mapTypeControl: false,
            });
            map.fitBounds(KERALA_BOUNDS, 0);
            const geocoder = new Geocoder();

            const fromPin = new PinElement({ glyphText: "A", background: "#1e8e3e", borderColor: "#137333", glyphColor: "#fff" });
            const toPin = new PinElement({ glyphText: "B", background: "#d93025", borderColor: "#a50e0e", glyphColor: "#fff" });
            const fromMarker = new AdvancedMarkerElement({ title: "From", content: fromPin });
            const toMarker = new AdvancedMarkerElement({ title: "To", content: toPin });

            map.addListener("click", async (event: google.maps.MapMouseEvent) => {
                if (!event.latLng) return;
                setClickError(null);
                const lat = event.latLng.lat();
                const lng = event.latLng.lng();
                let results: google.maps.GeocoderResult[];
                try {
                    ({ results } = await geocoder.geocode({ location: event.latLng }));
                } catch {
                    // Without an address we can't confirm the state, so don't accept the pin
                    setClickError("Couldn't look up that spot. Please try again or use the search.");
                    return;
                }
                // Clicks on the neighbouring states' edge of the map are ignored
                const components = (results[0]?.address_components ?? []).map((c) => ({ types: c.types, code: c.short_name }));
                if (!isInKerala(components)) return;
                onMapPickRef.current({ address: results[0].formatted_address, lat, lng });
            });

            partsRef.current = { map, fromMarker, toMarker, Route };
            setReady(true);
        }

        init().catch((err: Error) => setError(err.message));
        return () => {
            cancelled = true;
        };
    }, []);

    // Move the pins and frame them whenever the locations change
    useEffect(() => {
        const parts = partsRef.current;
        if (!ready || !parts) return;
        const { map, fromMarker, toMarker } = parts;
        fromMarker.position = from && { lat: from.lat, lng: from.lng };
        fromMarker.map = from ? map : null;
        toMarker.position = to && { lat: to.lat, lng: to.lng };
        toMarker.map = to ? map : null;

        if (from && to) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(from);
            bounds.extend(to);
            map.fitBounds(bounds, 48);
        } else if (from || to) {
            // Centre and zoom in one step: panTo animates, and a setZoom right
            // after it cuts the pan short, zooming in on the old centre instead
            const only = (from ?? to)!;
            map.moveCamera({ center: { lat: only.lat, lng: only.lng }, zoom: 15 });
        }
    }, [ready, from, to]);

    // Draw the driving route once both locations are set
    useEffect(() => {
        const parts = partsRef.current;
        if (!ready || !parts || !from || !to) return;
        const { map, Route } = parts;

        let stale = false;
        let lines: google.maps.Polyline[] = [];
        Route.computeRoutes({
            origin: { lat: from.lat, lng: from.lng },
            destination: { lat: to.lat, lng: to.lng },
            travelMode: "DRIVING",
            fields: ["path", "viewport", "distanceMeters", "durationMillis", "localizedValues"],
        })
            .then(({ routes }) => {
                if (stale) return;
                const best = routes?.[0];
                if (!best) {
                    setRoute(null);
                    setRouteError("No driving route found between these places.");
                    return;
                }
                lines = best.createPolylines({ polylineOptions: { strokeColor: "#1a73e8", strokeWeight: 5, strokeOpacity: 0.85 } });
                lines.forEach((line) => line.setMap(map));
                if (best.viewport) map.fitBounds(best.viewport, 48);
                setRouteError(null);
                setRoute({
                    distance: best.localizedValues?.distance ?? `${((best.distanceMeters ?? 0) / 1000).toFixed(1)} km`,
                    duration: best.localizedValues?.duration ?? `${Math.round((best.durationMillis ?? 0) / 60000)} min`,
                });
            })
            .catch(() => {
                if (stale) return;
                setRoute(null);
                setRouteError("Couldn't load the route.");
            });

        return () => {
            stale = true;
            lines.forEach((line) => line.setMap(null));
        };
    }, [ready, from, to]);

    // Only show route details while both locations are picked
    const routeShown = from && to;

    if (error) {
        return <p role="alert" style={{ color: "#b00020" }}>Map unavailable: {error}</p>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
            <div ref={mapRef} style={{ flex: 1, minHeight: 360, borderRadius: 6, border: "1px solid #ccc" }}/>
            {routeShown && route && (
                <span style={{ fontSize: 14 }}>
                    Route: <strong>{route.distance}</strong> · about <strong>{route.duration}</strong> by car
                </span>
            )}
            {routeShown && routeError && (
                <span role="alert" style={{ fontSize: 14, color: "#b00020" }}>{routeError}</span>
            )}
            {clickError && (
                <span role="alert" style={{ fontSize: 14, color: "#b00020" }}>{clickError}</span>
            )}
        </div>
    );
}
