import { isInKerala, type PickedLocation } from "../components/ride-form/kerala";
import { loadGoogleMaps } from "./google-maps";

// The device's position as an address, if it's in Kerala
export async function currentLocation(): Promise<PickedLocation> {
    if (!navigator.geolocation) throw new Error("This browser can't share its location.");
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("Couldn't get your location. Please allow location access or search instead.")), {
            enableHighAccuracy: true,
            timeout: 10000,
        }),
    );
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    await loadGoogleMaps();
    const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
    const { results } = await new Geocoder().geocode({ location: { lat, lng } });
    const components = (results[0]?.address_components ?? []).map((c) => ({ types: c.types, code: c.short_name }));
    if (!isInKerala(components)) throw new Error("You're not in Kerala right now. Please search for the property's address.");
    return { address: results[0].formatted_address, lat, lng };
}
