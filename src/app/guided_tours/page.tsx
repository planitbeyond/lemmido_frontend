import Link from "next/link";
import TourForms from "../../components/tour-forms/tour-forms";

export const metadata = { title: "Guided Tours · Lemmido" };

export default function GuidedToursPage() {
    return (
        <main style={{ padding: "0 24px" }}>
            <h1>Guided Tours</h1>
            <TourForms/>
            <p>
                <Link href="/">← Back home</Link>
            </p>
        </main>
    );
}
