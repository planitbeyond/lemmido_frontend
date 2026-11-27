"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../../lib/google-maps";
import { KERALA_BOUNDS } from "../ride-form/kerala";

// Advanced markers need a map ID; Google's test ID, like the booking form's map
const MAP_ID = "DEMO_MAP_ID";
const RED = "#872e7c";

type LatLng = { lat: number; lng: number };

type Props = {
    // Bookings keep the addresses, not coordinates, so they're looked up here
    pickup: string | null;
    destination: string;
    // The helper's live location, or null until one arrives
    helper: LatLng | null;
    // Shown over the top-left of the map, e.g. "Helper is on the way"
    status: string;
};

type MapParts = {
    map: google.maps.Map;
    helperMarker: google.maps.marker.AdvancedMarkerElement;
};

// The helper's marker: a red dot with a soft pulse
function helperDot() {
    const dot = document.createElement("div");
    dot.style.cssText = `width:18px;height:18px;border-radius:50%;background:${RED};border:3px solid #fff;box-shadow:0 0 0 6px rgba(135, 46, 124,0.25),0 2px 6px rgba(0,0,0,0.3);`;
    dot.title = "Your helper";
    return dot;
}

// The route from pickup to destination, with the helper's live position on top
export default function TrackingMap({ pickup, destination, helper, status }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const partsRef = useRef<MapParts | null>(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Whether the helper has been framed yet: the first fix zooms to them, later ones just move the dot
    const framedRef = useRef(false);

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
                center: { lat: 9.38, lng: 76.57 },
                zoom: 9,
                mapId: MAP_ID,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
            });
            map.fitBounds(KERALA_BOUNDS, 0);
            const helperMarker = new AdvancedMarkerElement({ title: "Your helper", content: helperDot(), zIndex: 10 });
            partsRef.current = { map, helperMarker };
            setReady(true);

            // Pins for both ends and the route between them
            const geocoder = new Geocoder();
            const locate = async (address: string | null) => {
                if (!address) return null;
                try {
                    const { results } = await geocoder.geocode({ address, region: "in" });
                    const loc = results[0]?.geometry.location;
                    return loc ? { lat: loc.lat(), lng: loc.lng() } : null;
                } catch {
                    return null;
                }
            };
            const [from, to] = await Promise.all([locate(pickup), locate(destination)]);
            if (cancelled) return;
            const bounds = new google.maps.LatLngBounds();
            if (from) {
                new AdvancedMarkerElement({ map, position: from, title: "Pickup", content: new PinElement({ glyphText: "A", background: "#141414", borderColor: "#000", glyphColor: "#fff" }) });
                bounds.extend(from);
            }
            if (to) {
                new AdvancedMarkerElement({ map, position: to, title: "Destination", content: new PinElement({ glyphText: "B", background: RED, borderColor: "#a50e0e", glyphColor: "#fff" }) });
                bounds.extend(to);
            }
            if (!bounds.isEmpty() && !framedRef.current) map.fitBounds(bounds, 56);
            if (from && to) {
                try {
                    const { routes } = await Route.computeRoutes({ origin: from, destination: to, travelMode: "DRIVING", fields: ["path"] });
                    if (cancelled) return;
                    routes?.[0]?.createPolylines({ polylineOptions: { strokeColor: RED, strokeWeight: 4, strokeOpacity: 0.8 } }).forEach((line) => line.setMap(map));
                } catch {
                    // The pins still show where the trip goes
                }
            }
        }

        init().catch((err: Error) => setError(err.message));
        return () => {
            cancelled = true;
        };
    }, [pickup, destination]);

    // Move the helper's dot with each live update
    useEffect(() => {
        const parts = partsRef.current;
        if (!ready || !parts) return;
        parts.helperMarker.position = helper;
        parts.helperMarker.map = helper ? parts.map : null;
        if (helper && !framedRef.current) {
            framedRef.current = true;
            parts.map.moveCamera({ center: helper, zoom: 14 });
        }
    }, [ready, helper]);

    return (
        <div style={{ position: "relative", height: "100%" }}>
            {error ? (
                <p role="alert" style={{ padding: 20, color: "#b00020" }}>Map unavailable: {error}</p>
            ) : (
                <div ref={mapRef} style={{ position: "absolute", inset: 0 }}/>
            )}
            <span
                style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "#141414",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
            >
                {status}
            </span>
        </div>
    );
}
