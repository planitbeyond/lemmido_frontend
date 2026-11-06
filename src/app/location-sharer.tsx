"use client";

import { useRef, useState } from 'react';

type Status = "idle" | "connecting" | "live" | "error";

export default function LocationSharer() {
    const [status, setStatus] = useState<Status>("idle");
    const [last, setLast] = useState<{ lat: number, lng: number} | null>(null);
    
    const wsRef = useRef<WebSocket | null>(null);
    const watchRef = useRef<number | null>(null);

    async function start() {
        setStatus("connecting")
        try {
            const res = await fetch("/api/rt-token");
            if (!res.ok) throw new Error("not logging in");
            const { token } = await res.json();

            const ws = new WebSocket(
                `${process.env.NEXT_PUBLIC_REALTIME_URL}?token=${token}`
            );
            wsRef.current = ws;
            ws.onopen = () => setStatus("live");
            ws.onclose = () => setStatus("idle");
            ws.onerror = () => setStatus("error");

            watchRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    setLast({ lat, lng});
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "location", lat, lng, timestamp: Date.now() }));
                    }
                },
                () => setStatus("error"),
                { enableHighAccuracy: true}
            );
        } catch {
            setStatus("error");
        }
    }

    function stop() {
        if (watchRef.current !== null)
            navigator.geolocation.clearWatch(watchRef.current);
        wsRef.current?.close();
    }

    return (
        <div>
            <p>Status:{status}</p>
            {last && <p>Last sent: { last.lat.toFixed(5) }, { last.lng.toFixed(5) }</p>}
            {status === "live" ? (
                <button onClick = {stop}>Stop share</button>) :
                (<button onClick = {start}>Share location</button>
            )}
        </div>
    );
}