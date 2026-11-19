"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "./icons";
import styles from "./landing.module.css";

const serviceOptions = [
    { value: "companion", label: "Hospital visit" },
    { value: "guided_tours", label: "Guided tour" },
    { value: "driver", label: "Driver" },
];

// Sends the visitor to the picked service's booking page, carrying the date and zip code along
export default function ServiceSearch() {
    const router = useRouter();

    function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        for (const key of ["date", "zip"]) {
            const value = String(form.get(key) ?? "").trim();
            if (value) params.set(key, value);
        }
        const query = params.toString();
        router.push(`/${form.get("service")}${query ? `?${query}` : ""}`);
    }

    return (
        <form id="search" className={styles.search} onSubmit={onSubmit}>
            <label className={styles.field}>
                <span className={styles.srOnly}>Type of services</span>
                <select name="service" required defaultValue="">
                    <option value="" disabled>Type Of Services*</option>
                    {serviceOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </label>
            <label className={styles.field}>
                <span className={styles.srOnly}>Pick a date</span>
                <input name="date" type="text" placeholder="Pick A Date*" onFocus={(e) => (e.currentTarget.type = "date")}/>
            </label>
            <label className={styles.field}>
                <span className={styles.srOnly}>Zip code</span>
                <input name="zip" type="text" inputMode="numeric" placeholder="Zip Code*" autoComplete="postal-code"/>
            </label>
            <button type="submit" className={styles.btnPrimary}>
                Search <ArrowRight size={12}/>
            </button>
        </form>
    );
}
