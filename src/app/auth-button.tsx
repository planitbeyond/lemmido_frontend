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

export default function AuthButton() {
    const { data: session, isPending } = authClient.useSession();
    const error = useSearchParams().get("error");

    if (isPending) return <p>Loading…</p>;

    if (!session) {
        return (
            <div>
                {error && (
                    <p role="alert">
                        {SESSION_EXPIRED.includes(error)
                            ? "Your session expired. Please sign in again."
                            : "Sign in failed. Please try again."}
                    </p>
                )}
                <button onClick={() => authClient.signIn.social({ provider: "cognito", callbackURL: "/" })}>
                    Sign in
                </button>
                <button onClick={signUp}>Sign up</button>
            </div>
        );
    }

    return (
        <div>
            <p>Signed in as {session.user.name} ({session.user.email})</p>
            <button onClick={() => authClient.signOut()}>Sign out</button>
        </div>
    );
}
