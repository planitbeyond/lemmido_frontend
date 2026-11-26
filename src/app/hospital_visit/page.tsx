import RideForm from "../../components/ride-form/ride-form";

export const metadata = { title: "Hospital Visit · Lemmido" };

export default function HospitalVisitPage() {
    return (
        <main>
            <RideForm kind="hospital_visit"/>
        </main>
    );
}
