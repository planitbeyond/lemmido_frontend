"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { User } from "./icons";
import styles from "./landing.module.css";

// better-auth redirects to /?error=<code> when the Cognito callback fails.
// The state codes mean the sign-in cookie was lost or too old.
const SESSION_EXPIRED = ["state_mismatch", "state_invalid", "state_not_found"];

function signIn() {
    authClient.signIn.social({ provider: "cognito", callbackURL: "/" });
}

// Same flow as sign in (better-auth sets the state cookie and handles the callback),
// but opens Cognito's /signup page instead of /oauth2/authorize. Both take the same
// query parameters, and after the account is created Cognito returns to our callback.
async function signUp() {
    const { data } = await authClient.signIn.social({ provider: "cognito", callbackURL: "/", disableRedirect: true });
    if (!data?.url) return;
    const url = new URL(data.url);
    url.pathname = "/signup";
    window.location.href = url.toString();
}

// "Anu Thomas" → "AT", for the avatar
function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

// The account button in the top bar, opening a menu: profile and sign out when
// signed in, sign in and sign up when not
export default function AccountMenu() {
    const { data: session, isPending } = authClient.useSession();
    const error = useSearchParams().get("error");
    const [open, setOpen] = useState(false);
    const menuId = useId();
    const rootRef = useRef<HTMLDivElement>(null);

    // Closes on a click outside the menu, or Escape
    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const user = session?.user as { name?: string | null; email?: string | null; phoneNumber?: string | null } | undefined;
    const name = user?.name || user?.email || "My account";

    return (
        <div ref={rootRef} className={styles.account}>
            <button
                type="button"
                className={styles.accountButton}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                disabled={isPending}
                onClick={() => setOpen((o) => !o)}
            >
                <span className={styles.userIcon}>
                    {user?.name ? <span className={styles.initials}>{initials(user.name)}</span> : <User size={14}/>}
                </span>
                {isPending ? "Loading…" : session ? name : "Account"}
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={open ? styles.chevronUp : undefined}>
                    <path d="M1.5 3.5 5 7l3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                </svg>
            </button>
            {error && !session && (
                <span role="alert" className={styles.accountError}>
                    {SESSION_EXPIRED.includes(error) ? "Your session expired. Please sign in again." : "Sign in failed. Please try again."}
                </span>
            )}

            {open && (
                <div id={menuId} role="menu" className={styles.accountMenu}>
                    {session ? (
                        <>
                            <Link href="/dashboard" role="menuitem" className={styles.profile} onClick={() => setOpen(false)}>
                                <span className={styles.profileAvatar}>{user?.name ? initials(user.name) : <User size={18}/>}</span>
                                <div>
                                    <strong>{name}</strong>
                                    {user?.email && <span>{user.email}</span>}
                                    {user?.phoneNumber && <span>{user.phoneNumber}</span>}
                                </div>
                            </Link>
                            <Link href="/dashboard" role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
                                My dashboard
                            </Link>
                            <button
                                type="button"
                                role="menuitem"
                                className={styles.menuItem}
                                onClick={() => {
                                    setOpen(false);
                                    authClient.signOut();
                                }}
                            >
                                Sign out
                            </button>
                        </>
                    ) : (
                        <>
                            <p className={styles.menuHint}>Sign in to book and track your services.</p>
                            <button type="button" role="menuitem" className={`${styles.menuItem} ${styles.menuPrimary}`} onClick={signIn}>
                                Sign in
                            </button>
                            <button type="button" role="menuitem" className={styles.menuItem} onClick={signUp}>
                                Create an account
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
