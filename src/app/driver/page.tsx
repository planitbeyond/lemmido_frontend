import Link from "next/link";
import RideForm from "../../components/ride-form/ride-form";

export const metadata = { title: "Driver · Lemmido" };

export default function DriverPage() {
    return (
        <main style={{ padding: "0 24px" }}>
            <h1>Driver</h1>
            <RideForm/>
            <p>
                <Link href="/">← Back home</Link>
            </p>
        </main>
    );
}
