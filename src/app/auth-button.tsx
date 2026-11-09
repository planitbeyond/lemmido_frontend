"use client";

import { useSearchParams } from "next/navigation";
import { authClient } from "../lib/auth-client";

// better-auth redirects to /?error=<code> when the Cognito callback fails.
// The state codes mean the sign-in cookie was lost or too old.
const SESSION_EXPIRED = ["state_mismatch", "state_invalid", "state_not_found"];

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

// Lays the controls out in a line so they fit in the top bar
const row = { display: "flex", alignItems: "center", gap: 8 };

export default function AuthButton() {
    const { data: session, isPending } = authClient.useSession();
    const error = useSearchParams().get("error");

    if (isPending) return <span>Loading…</span>;

    if (!session) {
        return (
            <div style={row}>
                {error && (
                    <span role="alert" style={{ color: "#b00020" }}>
                        {SESSION_EXPIRED.includes(error)
                            ? "Your session expired. Please sign in again."
                            : "Sign in failed. Please try again."}
                    </span>
                )}
                <button onClick={() => authClient.signIn.social({ provider: "cognito", callbackURL: "/" })}>
                    Sign in
                </button>
                <button onClick={signUp}>Sign up</button>
            </div>
        );
    }

    return (
        <div style={row}>
            <span>Signed in as {session.user.name} ({session.user.email})</span>
            <button onClick={() => authClient.signOut()}>Sign out</button>
        </div>
    );
}
