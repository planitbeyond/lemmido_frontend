import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "./icons";
import styles from "./landing.module.css";

const services = [
    {
        href: "/companion",
        title: "Companion",
        text: "We take you there, stay by your side, and bring you home.",
        image: "/landing/service-companion.jpg",
    },
    {
        href: "/guided_tours",
        title: "Guided tour",
        text: "Pilgrimages and trips, with someone looking after you.",
        image: "/landing/service-tour-family.jpg",
    },
    {
        href: "/driver",
        title: "Driver",
        text: "A careful driver, in your car or ours.",
        image: "/landing/driver.jpg",
    },
    {
        href: "/hospital_visit",
        title: "Hospital visit",
        text: "Check-ups and appointments, with someone by their side.",
        image: "/landing/service-hospital.jpg",
    },
    {
        href: "/property_management",
        title: "Property management",
        text: "We look after your home while you're away.",
        image: "/landing/service-property.jpg",
    },
];

// All services at once: five across on desktop, two per row on mobile with the last one centred
export default function ServicesGrid() {
    return (
        <ul className={styles.serviceGrid}>
            {services.map((service) => (
                <li key={service.title} className={styles.serviceCard}>
                    <div className={styles.serviceImage}>
                        <Image src={service.image} alt="" fill loading="eager" sizes="(min-width: 960px) 200px, (min-width: 640px) 30vw, 45vw"/>
                    </div>
                    <h3>{service.title}</h3>
                    <p>{service.text}</p>
                    <div className={styles.servicePrice}>
                        <Link href={service.href} className={styles.circleButton} aria-label={`Book ${service.title}`}>
                            <ArrowRight size={12}/>
                        </Link>
                    </div>
                </li>
            ))}
        </ul>
    );
}
