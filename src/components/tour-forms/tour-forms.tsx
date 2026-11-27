"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MIN_NOTICE_HOURS } from "../../lib/booking-dates";
import BookingDatePicker from "../booking-date-picker";
import BookingTimeSelect, { to12Hour } from "../booking-time-select";
import { ArrowLeft, ArrowRight, MapPin } from "../landing/icons";
import { PlaceIcon, QuoteSubmitted } from "../ride-form/booking-shared";
import { type PickedLocation } from "../ride-form/kerala";
import PlaceSearch from "../ride-form/place-search";
import wizard from "../ride-form/booking-wizard.module.css";
import BookingForm from "./booking-form";
import ContactDetails from "./contact-details";
import styles from "./guided-tours.module.css";

type Tab = "packages" | "staycations" | "custom";

// A tour package from GET /tour-packages (backend: packages/db/config/tour-packages.json)
type TourPackage = {
    id: string;
    title: string;
    summary: string;
    days: number;
    nights: number;
    maxPeople: number | null;
    image: string | null;
    // Paise; null if the package has no price yet
    pricePerPerson: number | null;
};

// A staycation from GET /staycations (backend: packages/db/config/staycations.json)
type Staycation = {
    id: string;
    title: string;
    summary: string;
    location: string;
    maxGuests: number | null;
    minNights: number;
    image: string | null;
    // Paise; null if the staycation has no price yet
    pricePerNight: number | null;
};

// What a card shows, for a package or a staycation alike
type Offer = {
    id: string;
    title: string;
    summary: string;
    image: string | null;
    // Not shown when null
    duration: string | null;
    place: string;
    // Paise
    price: number | null;
    priceUnit: "person" | "night";
    // Most people one booking can take; null if there's no limit
    maxPeople: number | null;
    // A stay, booked for a number of days; a package has a set length
    hasDays?: boolean;
};

const MAX_TRAVELLERS = 50;

// Shown when an offer has no photo, or its photo fails to load
const FALLBACK_PHOTOS = [
    "/landing/service-tour.jpg",
    "/landing/hero-tour.jpg",
    "/landing/cta-houseboat.jpg",
    "/landing/about-walk.jpg",
];

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function plural(count: number, word: string, many = `${word}s`) {
    return `${count} ${count === 1 ? word : many}`;
}

function packageOffer(p: TourPackage): Offer {
    return {
        id: p.id,
        title: p.title,
        summary: p.summary,
        image: p.image,
        duration: plural(p.days, "day"),
        place: "Kerala",
        price: p.pricePerPerson,
        priceUnit: "person",
        maxPeople: p.maxPeople,
    };
}

function staycationOffer(s: Staycation): Offer {
    return {
        id: s.id,
        title: s.title,
        summary: s.summary,
        image: s.image,
        duration: null,
        place: s.location,
        price: s.pricePerNight,
        priceUnit: "night",
        maxPeople: s.maxGuests,
        hasDays: true,
    };
}

// The list under `key` from the backend API at `path`, as offers:
// null while loading, "error" if loading failed
function useOffers<T>(path: string, key: string, toOffer: (item: T) => Offer) {
    const [offers, setOffers] = useState<Offer[] | "error" | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then((data: Record<string, T[]>) => setOffers((data[key] ?? []).map(toOffer)))
            .catch((error) => {
                if (error.name === "AbortError") return;
                console.error(`Couldn't load ${path}:`, error);
                setOffers("error");
            });
        return () => controller.abort();
    }, [path, key, toOffer]);

    return offers;
}

function BagIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="7" width="18" height="14" rx="2"/>
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
    );
}

function PinOutlineIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/>
            <circle cx="12" cy="9" r="2.5"/>
        </svg>
    );
}

function StarIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z"/>
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v5l3 2"/>
        </svg>
    );
}

const TABS: { id: Tab; label: string; Icon: (props: { size?: number }) => React.ReactNode }[] = [
    { id: "packages", label: "Packages", Icon: BagIcon },
    { id: "staycations", label: "Staycation", Icon: PinOutlineIcon },
    { id: "custom", label: "Custom trip", Icon: StarIcon },
];

function Meta({ offer }: { offer: Offer }) {
    return (
        <p className={styles.cardMeta}>
            {offer.duration && (
                <>
                    <span><ClockIcon/> {offer.duration}</span>
                    <span className={styles.metaDivider}/>
                </>
            )}
            <span><MapPin size={13}/> {offer.place}</span>
        </p>
    );
}

// The picked tour or stay, left of its booking form
function OfferSummary({ offer, index }: { offer: Offer; index: number }) {
    const fallback = FALLBACK_PHOTOS[index % FALLBACK_PHOTOS.length];
    const [photo, setPhoto] = useState(offer.image ?? fallback);

    return (
        <aside className={styles.summary}>
            <div className={styles.cardPhoto}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" onError={() => setPhoto(fallback)}/>
            </div>
            <div className={styles.summaryBody}>
                <h2 className={styles.h2}>{offer.title}</h2>
                <p className={styles.summaryText}>{offer.summary}</p>
                <Meta offer={offer}/>
            </div>
        </aside>
    );
}

function OfferCard({ offer, index, onBook }: { offer: Offer; index: number; onBook: () => void }) {
    const fallback = FALLBACK_PHOTOS[index % FALLBACK_PHOTOS.length];
    const [photo, setPhoto] = useState(offer.image ?? fallback);

    return (
        <article className={styles.card}>
            <div className={styles.cardPhoto}>
                {/* Plain img: the photos are paths from the API, and broken ones fall back to a stock photo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" loading="lazy" onError={() => setPhoto(fallback)}/>
            </div>
            <div className={styles.cardBody}>
                <h3>{offer.title}</h3>
                <p className={styles.cardSummary}>{offer.summary}</p>
                <Meta offer={offer}/>
                <div className={styles.cardFooter}>
                    <button type="button" className={styles.bookButton} onClick={onBook}>
                        Book Now <ArrowRight size={11}/>
                    </button>
                </div>
            </div>
        </article>
    );
}

const DESCRIPTION_MAX = 500;

type Extra = { name: string; label: string };

// Optional extras as checkboxes (none shown when the list is empty) (each submitted as "on" when ticked), then a free-text
// description with a character count
function ExtrasAndDescription({ extras }: { extras: Extra[] }) {
    const [length, setLength] = useState(0);

    return (
        <>
            {extras.length > 0 && (
                <fieldset className={styles.extras}>
                    <legend className={styles.extrasTitle}>Extras (Optional)</legend>
                    <div className={styles.extrasRow}>
                        {extras.map((extra) => (
                            <label key={extra.name} className={styles.check}>
                                <input type="checkbox" name={extra.name}/>
                                {extra.label}
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}
            <label className={styles.description}>
                <span className={styles.descriptionHead}>
                    Description
                    <span className={styles.descriptionCount} aria-hidden="true">{length} / {DESCRIPTION_MAX}</span>
                </span>
                <textarea
                    name="description"
                    rows={4}
                    maxLength={DESCRIPTION_MAX}
                    placeholder="Any specific instructions?"
                    onChange={(e) => setLength(e.target.value.length)}
                />
            </label>
        </>
    );
}

function PackageFields() {
    return <ExtrasAndDescription extras={[]}/>;
}

function StaycationFields({ days }: { days: number }) {
    return (
        <>
            {/* How long the stay is comes from the Days counter above */}
            <h3 className={styles.formHeading}>When do you want to check in?</h3>
            <NoticeBanner/>
            <div className={wizard.calendar}>
                <BookingDatePicker name="checkIn" label="Check-in date" hideLabel accentColor={RED} spanDays={days}/>
            </div>
            {/* "I need a stay" is left out: the booking already is one */}
            <ExtrasAndDescription extras={[{ name: "provideFood", label: "Provide food" }]}/>
        </>
    );
}

// The booking wizard's red, for the calendar and the time chips
const RED = "#872e7c";

// Pickup times offered for a custom trip, and when people may want to be back
const PICKUP_TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const RETURN_TIMES = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

function NoticeBanner() {
    return (
        <div className={`${wizard.notice} ${styles.notice}`}>
            <Image src="/booking/notice.svg" alt="" width={29} height={29}/>
            <div>
                <strong>{MIN_NOTICE_HOURS}-hour notice required</strong>
                <span>Requests must be submitted at least {MIN_NOTICE_HOURS} hours in advance.</span>
            </div>
        </div>
    );
}

type LocationFieldProps = {
    label: string;
    // Prefix of the submitted names: `${name}`, `${name}Lat`, `${name}Lng`, `${name}Landmark`
    name: string;
    icon: "from" | "to";
};

// A place search with an optional landmark, for where the trip starts and where it goes
function LocationField({ label, name, icon }: LocationFieldProps) {
    const [place, setPlace] = useState<PickedLocation | null>(null);
    const [landmark, setLandmark] = useState(false);

    return (
        <div>
            <PlaceSearch
                label={label}
                labelClassName={wizard.srOnly}
                placeholder={label}
                icon={<PlaceIcon field={icon}/>}
                value={place}
                onChange={setPlace}
                active={false}
                onFocus={() => {}}
            />
            <input type="hidden" name={name} value={place?.address ?? ""}/>
            <input type="hidden" name={`${name}Lat`} value={place?.lat ?? ""}/>
            <input type="hidden" name={`${name}Lng`} value={place?.lng ?? ""}/>
            <div className={wizard.chips}>
                <button type="button" className={wizard.chip} aria-expanded={landmark} onClick={() => setLandmark(!landmark)}>
                    Add landmark
                </button>
            </div>
            {landmark && (
                <input
                    name={`${name}Landmark`}
                    aria-label={`${label} landmark`}
                    placeholder="e.g. Opposite the bus stand"
                    className={`${wizard.input} ${wizard.landmark}`}
                    style={{ width: "100%" }}
                />
            )}
        </div>
    );
}

function CustomTripFields() {
    const [days, setDays] = useState(1);
    const [people, setPeople] = useState(2);
    const [date, setDate] = useState<string | undefined>();

    return (
        <>
            <ContactDetails/>
            <LocationField label="Pickup Location" name="pickup" icon="from"/>
            <LocationField label="Trip Location" name="tripLocation" icon="to"/>
            <div className={styles.counterRow}>
                <Counter
                    variant="box"
                    id="trip-days-label"
                    label="Days"
                    name="days"
                    value={days}
                    min={1}
                    max={MAX_DAYS}
                    onChange={setDays}
                />
                <Counter
                    variant="box"
                    id="trip-people-label"
                    label="People"
                    hint="Head count"
                    name="travellers"
                    value={people}
                    min={1}
                    max={MAX_TRAVELLERS}
                    onChange={setPeople}
                />
            </div>
            <ExtrasAndDescription
                extras={[
                    { name: "provideFood", label: "Provide food" },
                    { name: "needStay", label: "I need a stay" },
                ]}
            />
            <h3 className={styles.formHeading}>When do you want to go?</h3>
            <NoticeBanner/>
            <div className={styles.dateTime}>
                <div className={wizard.calendar}>
                    <BookingDatePicker name="date" label="Date" hideLabel accentColor={RED} onChange={setDate} spanDays={days}/>
                </div>
                <div className={styles.times}>
                    {/* An admin plans a custom trip and assigns the helpers, so any listed time can be asked for */}
                    <BookingTimeSelect
                        name="time"
                        label="Pickup Time"
                        variant="chips"
                        accentColor={RED}
                        date={date}
                        taskMinutes={undefined}
                        anyTime
                        slotTimes={PICKUP_TIMES}
                    />
                    <label className={wizard.inlineField}>
                        Preferred Return Time (IST)
                        <select name="returnTime" defaultValue="17:00" className={wizard.smallSelect}>
                            {RETURN_TIMES.map((time) => (
                                <option key={time} value={time}>{to12Hour(time)}</option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>
        </>
    );
}

function PeopleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="8" r="3.5"/>
            <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/>
            <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>
        </svg>
    );
}

type TripPanelProps = {
    selected: Offer;
    travellers: number;
    onTravellers: (count: number) => void;
    // A staycation's length; packages have a fixed one
    days: number;
    onDays: (count: number) => void;
};

const MAX_DAYS = 30;

function CalendarIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2"/>
            <path d="M8 3v4M16 3v4M3 10h18"/>
        </svg>
    );
}

type CounterProps = {
    id: string;
    label: string;
    icon?: React.ReactNode;
    hint?: string;
    // "pill": label above a rounded pill (trip panel). "box": label inside a bordered box (custom trip)
    variant?: "pill" | "box";
    // Submitted under this name
    name: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    // Shown under the pill, e.g. why the count can't go higher
    note?: string;
};

function Counter({ id, label, icon, hint, variant = "pill", name, value, min, max, onChange, note }: CounterProps) {
    const buttons = (
        <span className={styles.stepper}>
            <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
            <output aria-live="polite">{value}</output>
            <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
        </span>
    );

    if (variant === "box") {
        return (
            <div className={styles.counterBox} role="group" aria-labelledby={id}>
                <span>
                    <span className={styles.counterLabel} id={id}>{label}</span>
                    {hint && <span className={styles.counterHint}>{hint}</span>}
                </span>
                {buttons}
                <input type="hidden" name={name} value={value}/>
            </div>
        );
    }

    return (
        <div className={styles.tripField} role="group" aria-labelledby={id}>
            <span className={styles.tripLabel} id={id}>{icon} {label}</span>
            <span className={`${styles.pill} ${styles.travellers}`}>
                {hint && <span className={styles.travellersHint}>{hint}</span>}
                {buttons}
            </span>
            <input type="hidden" name={name} value={value}/>
            {note && <span className={styles.travellersMax}>{note}</span>}
        </div>
    );
}

// How many are travelling and, for a staycation, for how many days. Submitted as
// `travellers` and `days`, with the offer picked on the cards (already the form's
// title) as `offer`.
function TripPanel({ selected, travellers, onTravellers, days, onDays }: TripPanelProps) {
    const maxPeople = travellerLimit(selected);
    const count = Math.min(travellers, maxPeople);
    const isStay = selected.hasDays === true;

    return (
        <div className={styles.tripPanel}>
            <input type="hidden" name="offer" value={selected.title}/>
            <Counter
                id="travellers-label"
                label="Travellers"
                icon={<PeopleIcon/>}
                hint="Head count"
                name="travellers"
                value={count}
                min={1}
                max={maxPeople}
                onChange={onTravellers}
                note={selected.maxPeople !== null && count >= selected.maxPeople
                    ? `Up to ${selected.maxPeople} for this ${isStay ? "stay" : "tour"}`
                    : undefined}
            />
            {isStay && (
                <Counter
                    id="days-label"
                    label="Days"
                    icon={<CalendarIcon/>}
                    hint="No. of days"
                    name="days"
                    value={days}
                    min={1}
                    max={MAX_DAYS}
                    onChange={onDays}
                />
            )}
        </div>
    );
}

function travellerLimit(offer: Offer) {
    return Math.min(offer.maxPeople ?? MAX_TRAVELLERS, MAX_TRAVELLERS);
}

// The form's send button, which becomes "Submitted" once the request is sent
function RequestButton({ label, submitted, style }: { label: string; submitted: boolean; style?: React.CSSProperties }) {
    return submitted ? (
        <button type="button" className={`${wizard.btnNext} ${wizard.btnSubmitted}`} disabled style={style}>
            Submitted
        </button>
    ) : (
        <button type="submit" className={wizard.btnNext} style={style}>
            {label} <ArrowRight size={12}/>
        </button>
    );
}

type PriceDetailsProps = { offer: Offer; travellers: number; days: number; submitted: boolean };

// The booking's price, in the companion booking's Price Details card, with the button that sends it.
// A package is priced per person; a staycation per night, each day of the stay counted as a night.
function PriceDetails({ offer, travellers, days, submitted }: PriceDetailsProps) {
    const money = (paise: number) => rupees.format(paise / 100);
    const perNight = offer.priceUnit === "night";
    const count = perNight ? days : Math.min(travellers, travellerLimit(offer));
    const total = offer.price === null ? null : offer.price * count;

    return (
        <div className={`${wizard.priceCard} ${styles.priceDetails}`} aria-live="polite">
            <h2>Price Details</h2>
            <dl className={wizard.priceRows}>
                {perNight ? (
                    <>
                        <div><dt>Duration</dt><dd>{plural(days, "night")}</dd></div>
                        <div><dt>Guests</dt><dd>{plural(travellers, "guest")}</dd></div>
                    </>
                ) : (
                    <>
                        {offer.duration && <div><dt>Duration</dt><dd>{offer.duration}</dd></div>}
                        <div><dt>Travellers</dt><dd>{plural(count, "person", "people")}</dd></div>
                    </>
                )}
                {offer.price !== null && total !== null && (
                    <>
                        <div>
                            <dt>
                                {perNight ? "Stay" : "Package"}
                                <small>{plural(count, perNight ? "night" : "person", perNight ? "nights" : "people")} at {money(offer.price)}</small>
                            </dt>
                            <dd>{money(total)}</dd>
                        </div>
                    </>
                )}
            </dl>
            {total === null ? (
                <p className={wizard.approval}>This {perNight ? "stay" : "tour"} is priced on request. Our team will send you a quote.</p>
            ) : (
                <div className={wizard.total}>
                    <span>Total</span>
                    <strong>{money(total)}</strong>
                </div>
            )}
            <RequestButton label="Send request" submitted={submitted} style={{ alignSelf: "flex-start" }}/>
            {submitted
                ? <QuoteSubmitted className={styles.submitted}/>
                : <p className={wizard.payNote}>No payment now. We&apos;ll confirm availability and the final price with you.</p>}
        </div>
    );
}

type OfferSectionProps = {
    offers: Offer[] | "error" | null;
    title: string;
    lead: string;
    // Plural name used in the status messages, e.g. "group tours"
    what: string;
    // Given the Days count, for fields that depend on it (the staycation calendar)
    fields: (days: number) => React.ReactNode;
    // Fields that go above the travellers panel: who it's for and contact details
    beforePanel?: React.ReactNode;
};

// The cards for one tab; Book Now swaps the cards for that offer's booking form
function OfferSection({ offers, title, lead, what, fields, beforePanel }: OfferSectionProps) {
    const [selected, setSelected] = useState<Offer | null>(null);
    // Its place in the grid, so the summary shows the same fallback photo as the card
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [travellers, setTravellers] = useState(2);
    const [days, setDays] = useState(1);
    // The price shows under the form once View price is pressed, then follows the counters
    const [showPrice, setShowPrice] = useState(false);

    function book(offer: Offer, index: number) {
        setSelected(offer);
        setSelectedIndex(index);
        setDays(1);
        setShowPrice(false);
    }

    if (selected) {
        return (
            <section className={styles.results}>
                <button type="button" className={styles.backLink} onClick={() => setSelected(null)}>
                    <ArrowLeft size={12}/> All {what}
                </button>
                {/* Keyed so picking another offer starts a fresh form */}
                <div key={selected.id} className={styles.booking}>
                    <OfferSummary offer={selected} index={selectedIndex}/>
                    <BookingForm
                        actions={(submitted) => showPrice ? (
                            <PriceDetails offer={selected} travellers={travellers} days={days} submitted={submitted}/>
                        ) : (
                            <div className={wizard.footer}>
                                <button
                                    type="button"
                                    className={wizard.btnNext}
                                    // Only once the required fields are filled in
                                    onClick={(event) => { if (event.currentTarget.form?.reportValidity()) setShowPrice(true); }}
                                >
                                    View price <ArrowRight size={12}/>
                                </button>
                            </div>
                        )}
                    >
                        {beforePanel}
                        <TripPanel
                            selected={selected}
                            travellers={travellers}
                            onTravellers={setTravellers}
                            days={days}
                            onDays={setDays}
                        />
                        {fields(days)}
                    </BookingForm>
                </div>
            </section>
        );
    }

    const list = Array.isArray(offers) ? offers : [];

    let status: React.ReactNode = null;
    if (offers === null) status = <p className={styles.lead}>Loading {what}…</p>;
    else if (offers === "error") status = <p role="alert" className={styles.error}>Couldn&apos;t load the {what}. Please try again later.</p>;
    else if (offers.length === 0) status = <p className={styles.lead}>No {what} are open for booking right now.</p>;

    return (
        <section className={styles.results}>
            <h2 className={styles.h2}>{title}</h2>
            {status ?? <p className={styles.lead}>{lead}</p>}
            {list.length > 0 && (
                <div className={styles.grid}>
                    {list.map((offer, i) => (
                        <OfferCard key={offer.id} offer={offer} index={i} onBook={() => book(offer, i)}/>
                    ))}
                </div>
            )}
        </section>
    );
}

function Packages() {
    const offers = useOffers("/tour-packages", "packages", packageOffer);
    return (
        <OfferSection
            offers={offers}
            title="Group tours & pilgrimages"
            lead="Ready-made trips with a set route, guide and itinerary."
            what="group tours"
            beforePanel={<ContactDetails/>}
            fields={() => <PackageFields/>}
        />
    );
}

function Staycations() {
    const offers = useOffers("/staycations", "staycations", staycationOffer);
    return (
        <OfferSection
            offers={offers}
            title="Staycations"
            lead="Short, relaxed stays close to home."
            what="staycations"
            beforePanel={<ContactDetails/>}
            fields={(days) => <StaycationFields days={days}/>}
        />
    );
}

function CustomTrip({ onBack }: { onBack: () => void }) {
    return (
        <section className={styles.results}>
            <h2 className={styles.h2}>Plan a custom trip</h2>
            <p className={styles.lead}>Tell us where to pick you up, where you want to go and when. We&apos;ll plan the trip and discuss a quote with you.</p>
            <div className={styles.customForm}>
                <BookingForm
                    actions={(submitted) => (
                        <div className={wizard.footer}>
                            <button type="button" className={wizard.btnBack} onClick={onBack}>
                                <ArrowLeft size={12}/> Back
                            </button>
                            <div className={styles.quoteAction}>
                                <RequestButton label="Request quote" submitted={submitted}/>
                                {submitted
                                    ? <QuoteSubmitted className={styles.submitted}/>
                                    : <p className={wizard.payNote}>Lemmido will check your trip and discuss a quote with you by email.</p>}
                            </div>
                        </div>
                    )}
                >
                    <CustomTripFields/>
                </BookingForm>
            </div>
        </section>
    );
}

export default function TourForms() {
    const [tab, setTab] = useState<Tab>("packages");

    return (
        <div className={styles.wrap}>
            <div className={styles.searchBar}>
                <div role="tablist" aria-label="Tour type" className={styles.tabs}>
                    {TABS.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            className={styles.tab}
                            onClick={() => setTab(id)}
                        >
                            <Icon size={16}/>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.resultsAnchor}>
                {/* key resets each tab's picked offer when switching tabs */}
                {tab === "packages" && <Packages key="packages"/>}
                {tab === "staycations" && <Staycations key="staycations"/>}
                {tab === "custom" && <CustomTrip key="custom" onBack={() => setTab("packages")}/>}
            </div>
        </div>
    );
}
