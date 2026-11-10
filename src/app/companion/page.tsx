import Link from "next/link";
import RideForm from "../../components/ride-form/ride-form";

export const metadata = { title: "Companion · Lemmido" };

export default function CompanionPage() {
    return (
        <main style={{ padding: "0 24px" }}>
            <h1>Companion</h1>
            <RideForm/>
            <p>
                <Link href="/">← Back home</Link>
            </p>
        </main>
    );
}
