"use client";

import { authClient } from "../lib/auth-client";

export default function AuthButton() {
    const { data: session, isPending } = authClient.useSession();

    if (isPending) return <p>Loading…</p>;

    if (!session) {
        // Cognito's hosted page offers both "Sign in" and "Sign up"
        return (
            <button onClick={() => authClient.signIn.social({ provider: "cognito", callbackURL: "/" })}>
                Sign in / Sign up
            </button>
        );
    }

    return (
        <div>
            <p>Signed in as {session.user.name} ({session.user.email})</p>
            <button onClick={() => authClient.signOut()}>Sign out</button>
        </div>
    );
}
