import RideForm from "../../components/ride-form/ride-form";

export const metadata = { title: "Driver · Lemmido" };

export default function DriverPage() {
    return (
        <main>
            <RideForm kind="driver"/>
        </main>
    );
}
