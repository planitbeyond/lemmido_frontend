"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "./icons";
import styles from "./landing.module.css";

const services = [
    {
        href: "/companion",
        title: "Hospital visit",
        text: "We take you there, stay by your side, and bring you home.",
        price: 15,
        image: "/landing/service-companion.jpg",
    },
    {
        href: "/guided_tours",
        title: "Guided tour",
        text: "Pilgrimages and trips, with someone looking after you.",
        price: 25,
        image: "/landing/service-tour.jpg",
    },
    {
        href: "/driver",
        title: "Driver",
        text: "A careful driver, in your car or ours.",
        price: 28,
        image: "/landing/service-driver.jpg",
    },
];

export default function ServicesCarousel() {
    const trackRef = useRef<HTMLUListElement>(null);

    // Moves the track by one card
    function scroll(direction: -1 | 1) {
        const track = trackRef.current;
        const card = track?.firstElementChild as HTMLElement | null;
        if (!track || !card) return;
        track.scrollBy({ left: direction * (card.offsetWidth + 24), behavior: "smooth" });
    }

    return (
        <>
            <ul ref={trackRef} className={styles.serviceTrack}>
                {services.map((service) => (
                    <li key={service.title} className={styles.serviceCard}>
                        <div className={styles.serviceImage}>
                            <Image src={service.image} alt="" fill sizes="(min-width: 960px) 210px, 330px"/>
                        </div>
                        <h3>{service.title}</h3>
                        <p>{service.text}</p>
                        <div className={styles.servicePrice}>
                            <span><strong>${service.price}/</strong>Per Hour</span>
                            <Link href={service.href} className={styles.circleButton} aria-label={`Book ${service.title}`}>
                                <ArrowRight size={12}/>
                            </Link>
                        </div>
                    </li>
                ))}
            </ul>
            <div className={styles.carouselControls}>
                <button type="button" aria-label="Previous service" onClick={() => scroll(-1)}><ArrowLeft size={14}/></button>
                <button type="button" aria-label="Next service" onClick={() => scroll(1)}><ArrowRight size={14}/></button>
            </div>
        </>
    );
}
