export type PickedLocation = { address: string; lat: number; lng: number };

// A box around Kerala. The map can't pan outside it and search only asks for
// places inside it. The box also covers border areas of Tamil Nadu and
// Karnataka, so suggestions are filtered and every pick is checked against the state.
export const KERALA_BOUNDS = { south: 8.17, west: 74.85, north: 12.8, east: 77.42 };

// Matches the state's short code rather than its name: Google now returns
// "Keralam" as the name, and names also change with the browser's language.
export function isInKerala(components: { types: string[]; code: string | null }[]) {
    return components.some((c) => c.types.includes("administrative_area_level_1") && c.code === "KL");
}
