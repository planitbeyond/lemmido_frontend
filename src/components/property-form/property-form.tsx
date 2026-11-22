"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { authClient } from "../../lib/auth-client";
import { loadGoogleMaps } from "../../lib/google-maps";
import { accountDetails, COUNTRY_CODES, EMPTY_DETAILS, PlaceIcon, Stepper, WHO_FOR, type Details, type WhoFor } from "../ride-form/booking-shared";
import { isInKerala, type PickedLocation } from "../ride-form/kerala";
import PlaceSearch from "../ride-form/place-search";
import RideMap from "../ride-form/ride-map";
import styles from "../ride-form/booking-wizard.module.css";

// Property management booking (Figma "Tell us about the property?"). Only the first
// step is built: there is no property service on the backend yet, so nothing is saved.

const STEPS = ["Service & Details", "Date & Time", "Review", "Payment"];

// Placeholders until the real service list and property types are settled
const SERVICES = [
    { value: "home_inspection", label: "Home inspection" },
    { value: "repairs", label: "Repairs and maintenance" },
    { value: "cleaning", label: "Cleaning" },
    { value: "other", label: "Other" },
];

const PROPERTY_TYPES = [
    { value: "house", label: "House" },
    { value: "apartment", label: "Apartment" },
    { value: "villa", label: "Villa" },
    { value: "plot", label: "Plot / land" },
    { value: "commercial", label: "Commercial" },
];

// A property is booked for yourself or for someone else, not "my parents"
const PROPERTY_WHO_FOR = WHO_FOR.filter((option) => option.value !== "parents");

const NOTES_MAX = 500;

// The device's position as an address, if it's in Kerala
async function currentLocation(): Promise<PickedLocation> {
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

export default function PropertyForm() {
    const [whoFor, setWhoFor] = useState<WhoFor>("self");
    // Prefilled from the login when booking for yourself; still editable
    const { data: session } = authClient.useSession();
    const account = accountDetails(session?.user as { name?: string | null; phoneNumber?: string | null } | undefined);
    const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
    // The session loads after the first render: fill the details once it arrives
    const [filledFromAccount, setFilledFromAccount] = useState(false);
    if (session && !filledFromAccount) {
        setFilledFromAccount(true);
        if (whoFor === "self" && !details.name && !details.phone) setDetails(account);
    }

    function pickWhoFor(value: WhoFor) {
        setWhoFor(value);
        if (value === "self") {
            setDetails(account);
        } else if (details.name === account.name && details.phone === account.phone) {
            // Someone else's booking: don't keep your own details in their fields
            setDetails(EMPTY_DETAILS);
        }
    }

    const [address, setAddress] = useState<PickedLocation | null>(null);
    const [landmark, setLandmark] = useState(false);
    const [locating, setLocating] = useState(false);
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);

    async function fillCurrentLocation() {
        setLocating(true);
        setError(null);
        try {
            setAddress(await currentLocation());
        } catch (locationError) {
            setError((locationError as Error).message);
        } finally {
            setLocating(false);
        }
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const invalid = [...event.currentTarget.elements].find(
            (el): el is HTMLInputElement => "checkValidity" in el && !(el as HTMLInputElement).checkValidity(),
        );
        if (invalid) {
            setError(null);
            invalid.reportValidity();
            return;
        }
        if (!address) {
            setError("Pick the property's address.");
            return;
        }
        setError(null);
        // The Date & Time, Review and Payment steps come next, once the backend has a property service
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.top}>
                    <Image src="/booking/logo.svg" alt="Lemmido" width={86} height={17}/>
                    <Link href="/" className={styles.close} aria-label="Close and go back home">
                        <Image src="/booking/close.svg" alt="" width={24} height={24}/>
                    </Link>
                </div>
                <Stepper steps={STEPS} step={0}/>

                <form onSubmit={handleSubmit} noValidate className={styles.body}>
                    <h1 className={styles.heading}>
                        Tell us about the property?
                        <span className={styles.count}>1 of {STEPS.length}</span>
                    </h1>
                    <p className={styles.lead}>Choose the service you need.</p>

                    {/* One grid, so each row lines up across both columns: service and type,
                        who it's for and where, then the details beside the map */}
                    <div className={styles.propertyGrid}>
                        <label className={styles.field}>
                            <span>Select Service<span className={styles.req}>*</span></span>
                            <select name="service" required defaultValue="" className={styles.select}>
                                <option value="" disabled>Select your service</option>
                                {SERVICES.map((service) => <option key={service.value} value={service.value}>{service.label}</option>)}
                            </select>
                        </label>
                        <label className={styles.field}>
                            Property Type
                            <select name="propertyType" defaultValue="" className={styles.select}>
                                <option value="" disabled>Select your property type</option>
                                {PROPERTY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                        </label>

                        <div className={styles.field}>
                            <span id="who-label">Who are you booking for?</span>
                            <div className={styles.whoRow} role="radiogroup" aria-labelledby="who-label">
                                {PROPERTY_WHO_FOR.map((option) => (
                                    <label key={option.value} className={`${styles.whoCard} ${styles.whoCardWide}`}>
                                        <input
                                            type="radio"
                                            name="whoFor"
                                            value={option.value}
                                            checked={whoFor === option.value}
                                            onChange={() => pickWhoFor(option.value)}
                                            className={styles.srOnly}
                                        />
                                        <span className={styles.maskIcon} style={{ "--icon": `url(${option.icon})` } as React.CSSProperties}/>
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <PlaceSearch
                                label="Where?"
                                labelClassName={styles.fieldLabel}
                                placeholder="Property address"
                                icon={<PlaceIcon field="from"/>}
                                value={address}
                                onChange={setAddress}
                                active={false}
                                onFocus={() => {}}
                            />
                            <div className={styles.chips}>
                                <button type="button" className={styles.chip} onClick={fillCurrentLocation} disabled={locating}>
                                    <Image src="/booking/review-pin.svg" alt="" width={11} height={14}/>
                                    {locating ? "Finding you…" : "Use current location"}
                                </button>
                                <button type="button" className={styles.chip} aria-expanded={landmark} onClick={() => setLandmark(!landmark)}>
                                    Add landmark
                                </button>
                            </div>
                            {landmark && (
                                <input
                                    name="landmark"
                                    aria-label="Landmark"
                                    placeholder="e.g. Opposite the bus stand"
                                    className={`${styles.input} ${styles.landmark}`}
                                    style={{ width: "100%" }}
                                />
                            )}
                        </div>

                        <div className={styles.stack}>
                            <h2 className={styles.sectionTitle}>Personal details</h2>
                            <label className={styles.field}>
                                <span>Name<span className={styles.req}>*</span></span>
                                <input
                                    name="name"
                                    required
                                    autoComplete={whoFor === "self" ? "name" : "off"}
                                    placeholder="Full name"
                                    value={details.name}
                                    onChange={(event) => setDetails({ ...details, name: event.target.value })}
                                    className={styles.input}
                                />
                            </label>
                            <div className={styles.field}>
                                <span id="phone-label">Phone number<span className={styles.req}>*</span></span>
                                <div className={styles.phone} role="group" aria-labelledby="phone-label">
                                    <select
                                        name="phoneCode"
                                        aria-label="Country code"
                                        value={details.phoneCode}
                                        onChange={(event) => setDetails({ ...details, phoneCode: event.target.value })}
                                        className={styles.select}
                                    >
                                        {COUNTRY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                                    </select>
                                    <input
                                        name="phone"
                                        type="tel"
                                        value={details.phone}
                                        onChange={(event) => setDetails({ ...details, phone: event.target.value })}
                                        required
                                        inputMode="tel"
                                        autoComplete={whoFor === "self" ? "tel-national" : "off"}
                                        pattern="[0-9 ]{6,15}"
                                        title="6 to 15 digits"
                                        placeholder="Phone number"
                                        aria-label="Phone number"
                                        className={styles.input}
                                    />
                                </div>
                            </div>
                            <label className={styles.field}>
                                <span className={styles.labelRow}>
                                    What should we take care of?
                                    <span className={styles.counter} aria-hidden="true">{notes.length} / {NOTES_MAX}</span>
                                </span>
                                <textarea
                                    name="notes"
                                    rows={3}
                                    maxLength={NOTES_MAX}
                                    placeholder="Any specific instructions?"
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    className={styles.textarea}
                                />
                            </label>
                        </div>
                        <div className={`${styles.mapBox} ${styles.propertyMap}`}>
                            <RideMap from={address} to={null} onMapPick={setAddress} minHeight={300}/>
                        </div>
                    </div>

                    {error && <p role="alert" className={styles.error} style={{ marginTop: 20 }}>{error}</p>}

                    <div className={styles.footer}>
                        <Link href="/" className={styles.btnBack}>
                            <Image src="/booking/arrow-right.svg" alt="" width={20} height={20}/>
                            Back
                        </Link>
                        <button type="submit" className={styles.btnNext}>
                            Continue
                            <Image src="/booking/arrow-right-white.svg" alt="" width={20} height={20}/>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
