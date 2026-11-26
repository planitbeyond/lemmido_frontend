"use client";

import { useState } from "react";
import { COUNTRY_CODES, EMPTY_DETAILS, WHO_FOR, type Details, type WhoFor } from "../ride-form/booking-shared";
import wizard from "../ride-form/booking-wizard.module.css";
import styles from "./guided-tours.module.css";

// A tour is booked for yourself or for someone else, as with a property
const TOUR_WHO_FOR = WHO_FOR.filter((option) => option.value !== "parents");

// Who the booking is for, as in the other service forms. For yourself there's nothing
// more to ask (we have your login); for someone else, their name and phone.
// Submitted as `whoFor`, and `name`, `phoneCode`, `phone` for someone else.
export default function ContactDetails() {
    const [whoFor, setWhoFor] = useState<WhoFor>("self");
    const [details, setDetails] = useState<Details>(EMPTY_DETAILS);

    return (
        <div className={`${wizard.stack} ${styles.contact}`}>
            <h3 className={styles.formHeading}>Who are you booking for?</h3>
            <div className={wizard.whoRow} role="radiogroup" aria-label="Who is it for?">
                {TOUR_WHO_FOR.map((option) => (
                    <label key={option.value} className={wizard.whoCard}>
                        <input
                            type="radio"
                            name="whoFor"
                            value={option.value}
                            checked={whoFor === option.value}
                            onChange={() => setWhoFor(option.value)}
                            className={wizard.srOnly}
                        />
                        <span className={wizard.maskIcon} style={{ "--icon": `url(${option.icon})` } as React.CSSProperties}/>
                        {option.label}
                    </label>
                ))}
            </div>
            {whoFor === "other" && (
                <>
                    <h3 className={styles.formHeading}>Contact details</h3>
                    <label className={wizard.field}>
                        <span>Name<span className={wizard.req}>*</span></span>
                        <input
                            name="name"
                            required
                            autoComplete="off"
                            placeholder="Full name"
                            value={details.name}
                            onChange={(event) => setDetails({ ...details, name: event.target.value })}
                            className={wizard.input}
                        />
                    </label>
                    <div className={wizard.field}>
                        <span id="tour-phone-label">Phone number<span className={wizard.req}>*</span></span>
                        <div className={wizard.phone} role="group" aria-labelledby="tour-phone-label">
                            <select
                                name="phoneCode"
                                aria-label="Country code"
                                value={details.phoneCode}
                                onChange={(event) => setDetails({ ...details, phoneCode: event.target.value })}
                                className={wizard.select}
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
                                autoComplete="off"
                                pattern="[0-9 ]{6,15}"
                                title="6 to 15 digits"
                                placeholder="Phone number"
                                aria-label="Phone number"
                                className={wizard.input}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
