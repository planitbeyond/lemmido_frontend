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
        <>
            <header
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "12px 24px",
                    borderBottom: "1px solid #ddd",
                }}
            >
                <Link href="/" style={{ fontWeight: "bold", fontSize: 20, textDecoration: "none", color: "inherit" }}>
                    Lemmido
                </Link>
                {/* AuthButton reads ?error=, which needs a Suspense boundary */}
                <Suspense fallback={<span>Loading…</span>}>
                    <AuthButton/>
                </Suspense>
            </header>
            <nav style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 24px" }}>
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        style={{
                            padding: "8px 16px",
                            border: "1px solid #ccc",
                            borderRadius: 6,
                            textDecoration: "none",
                            color: "inherit",
                        }}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
            <main style={{ padding: "0 24px" }}>
                <h1>Lemmido</h1>
                <LocationSharer/>
            </main>
        </>
    );
}
