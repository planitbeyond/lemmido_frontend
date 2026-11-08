import { Suspense } from "react";
import AuthButton from "./auth-button";
import LocationSharer from "./location-sharer";

export default function Page(){
    return (
        <main>
            <h1>Lemmido</h1>
        {/* AuthButton reads ?error=, which needs a Suspense boundary */}
        <Suspense fallback={<p>Loading…</p>}>
            <AuthButton/>
        </Suspense>
        <LocationSharer/>
        </main>

    );
}
