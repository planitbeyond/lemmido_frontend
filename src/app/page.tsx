import { Suspense } from "react";
import Link from "next/link";
import AuthButton from "./auth-button";
import LocationSharer from "./location-sharer";

// Public pages, reachable without signing in
const links = [
    { href: "/driver", label: "Driver" },
    { href: "/companion", label: "Companion" },
    { href: "/guided_tours", label: "Guided Tours" },
];

export default function Page(){
    return (
        <main>
            <h1>Lemmido</h1>
            <nav>
                {links.map((link) => (
                    <Link key={link.href} href={link.href}>
                        {link.label}
                    </Link>
                ))}
            </nav>
        {/* AuthButton reads ?error=, which needs a Suspense boundary */}
        <Suspense fallback={<p>Loading…</p>}>
            <AuthButton/>
        </Suspense>
        <LocationSharer/>
        </main>

    );
}
