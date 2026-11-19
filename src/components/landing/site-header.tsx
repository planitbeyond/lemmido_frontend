"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AuthButton from "../../app/auth-button";
import { Mail, Phone, Search, User, socials } from "./icons";
import styles from "./landing.module.css";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "#about", label: "About Us" },
    { href: "#services", label: "Services" },
    { href: "/guided_tours", label: "Guided tours" },
];

export default function SiteHeader() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className={styles.header}>
            <div className={styles.topBar}>
                <div className={`${styles.container} ${styles.topBarInner}`}>
                    <div className={styles.topBarContacts}>
                        <a href="tel:+11234567890"><Phone size={13}/> +1 1234567890</a>
                        <a href="mailto:example@gmail.com"><Mail size={15}/> example@gmail.com</a>
                    </div>
                    <div className={styles.topBarRight}>
                        <span className={styles.userIcon}><User size={14}/></span>
                        {/* AuthButton reads ?error=, which needs a Suspense boundary */}
                        <div className={styles.auth}>
                            <Suspense fallback={<span>Loading…</span>}>
                                <AuthButton/>
                            </Suspense>
                        </div>
                        <span className={styles.topBarDivider}/>
                        <div className={styles.socials}>
                            {socials.map(({ href, label, Icon }) => (
                                <a key={label} href={href} aria-label={label} className={styles.socialSmall}>
                                    <Icon size={12}/>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <nav className={styles.nav}>
                <div className={`${styles.container} ${styles.navInner}`}>
                    <Link href="/" aria-label="Lemmido home">
                        <Image src="/landing/logo.svg" alt="Lemmido" width={144} height={30} unoptimized className={styles.logo} priority/>
                    </Link>
                    <button
                        type="button"
                        className={styles.burger}
                        aria-label="Menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <span/><span/><span/>
                    </button>
                    <div className={`${styles.navMenu} ${menuOpen ? styles.navMenuOpen : ""}`}>
                        <ul className={styles.navLinks}>
                            {navLinks.map((link, i) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className={i === 0 ? styles.navLinkActive : undefined}
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <a href="#search" className={styles.searchButton} aria-label="Search services">
                            <Search size={18}/>
                        </a>
                        <a href="#contact" className={styles.contactButton}>
                            Contact Us <Phone size={14}/>
                        </a>
                    </div>
                </div>
            </nav>
        </header>
    );
}
