/// <reference types="google.maps" />

// Loads the Google Maps JavaScript API once per page. After it resolves,
// google.maps.importLibrary("maps" | "places" | ...) is available.
let loading: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
    if (loading) return loading;

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"));

    loading = new Promise((resolve, reject) => {
        const callback = "__googleMapsReady";
        (window as unknown as Record<string, () => void>)[callback] = () => resolve();

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&loading=async&callback=${callback}`;
        script.async = true;
        script.onerror = () => {
            loading = null;
            reject(new Error("Could not load Google Maps"));
        };
        document.head.appendChild(script);
    });
    return loading;
}
