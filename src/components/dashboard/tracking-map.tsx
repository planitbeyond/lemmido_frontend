"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../../lib/google-maps";
import { KERALA_BOUNDS } from "../ride-form/kerala";
import styles from "./booking-details.module.css";

// Advanced markers need a map ID; Google's test ID, like the booking form's map
const MAP_ID = "DEMO_MAP_ID";
const PURPLE = "#872e7c";

type LatLng = { lat: number; lng: number };

type Props = {
    // Bookings keep the addresses, not coordinates, so they're looked up here
    pickup: string | null;
    destination: string;
    // The helper's live location, or null until one arrives
    helper: LatLng | null;
    // The bar along the bottom: e.g. "Your helper is on the way" / "Location updated 1 min ago"
    status: string;
    detail: string;
    // The booking is happening now: the map turns green
    live: boolean;
};

type MapParts = {
    map: google.maps.Map;
    helperMarker: google.maps.marker.AdvancedMarkerElement;
};

function marker(html: string, css: string, title: string) {
    const el = document.createElement("div");
    el.style.cssText = css;
    el.innerHTML = html;
    el.title = title;
    return el;
}

// The helper: a yellow dot with a soft halo
function helperDot() {
    return marker("", "width:20px;height:20px;border-radius:50%;background:#ffd400;border:3px solid #fff;box-shadow:0 0 0 7px rgba(255,212,0,0.35),0 2px 6px rgba(0,0,0,0.25);", "Your helper");
}

// Pickup: a house
function homePin() {
    return marker(
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="#141414"><path d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z"/></svg>',
        "display:grid;place-items:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.25));",
        "Pickup",
    );
}

// Destination: a black square with a white cross
function destinationPin() {
    return marker(
        '<svg width="14" height="14" viewBox="0 0 14 14" fill="#fff"><path d="M5 0h4v5h5v4H9v5H5V9H0V5h5z"/></svg>',
        "display:grid;place-items:center;width:24px;height:24px;border-radius:5px;background:#141414;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);",
        "Destination",
    );
}

// The route from pickup to destination, with the helper's live position on top
export default function TrackingMap({ pickup, destination, helper, status, detail, live }: Props) {
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
            const [{ Map }, { AdvancedMarkerElement }, { Geocoder }, { Route }] = await Promise.all([
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
                disableDefaultUI: true,
                zoomControl: true,
            });
            map.fitBounds(KERALA_BOUNDS, 0);
            const helperMarker = new AdvancedMarkerElement({ title: "Your helper", content: helperDot(), zIndex: 10 });
            partsRef.current = { map, helperMarker };
            setReady(true);

            // Markers for both ends and the route between them
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
                new AdvancedMarkerElement({ map, position: from, title: "Pickup", content: homePin() });
                bounds.extend(from);
            }
            if (to) {
                new AdvancedMarkerElement({ map, position: to, title: "Destination", content: destinationPin() });
                bounds.extend(to);
            }
            // Room at the bottom for the status bar
            if (!bounds.isEmpty() && !framedRef.current) map.fitBounds(bounds, { top: 40, bottom: 100, left: 40, right: 40 });
            if (from && to) {
                try {
                    const { routes } = await Route.computeRoutes({ origin: from, destination: to, travelMode: "DRIVING", fields: ["path"] });
                    if (cancelled) return;
                    // A dashed purple line: the stroke is hidden and short dashes repeat along it
                    routes?.[0]
                        ?.createPolylines({
                            polylineOptions: {
                                strokeOpacity: 0,
                                icons: [{ icon: { path: "M 0,-1 0,1", strokeColor: PURPLE, strokeOpacity: 1, strokeWeight: 3, scale: 3 }, offset: "0", repeat: "14px" }],
                            },
                        })
                        .forEach((line) => line.setMap(map));
                } catch {
                    // The markers still show where the trip goes
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

    const trackLive = () => {
        if (helper) partsRef.current?.map.moveCamera({ center: helper, zoom: 15 });
    };

    return (
        <div className={live ? `${styles.mapCard} ${styles.mapLive}` : styles.mapCard}>
            {error ? (
                <p role="alert" className={styles.mapError}>Map unavailable: {error}</p>
            ) : (
                <div ref={mapRef} className={styles.mapCanvas}/>
            )}
            <div className={styles.mapBar} role="status">
                <div>
                    <strong>
                        {live && <span className={styles.mapLiveDot} aria-hidden="true"/>}
                        {status}
                    </strong>
                    <span>{detail}</span>
                </div>
                {helper && (
                    <button type="button" className={styles.btnRed} onClick={trackLive}>Track live</button>
                )}
            </div>
        </div>
    );
}
