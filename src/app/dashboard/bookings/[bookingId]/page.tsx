import { Suspense } from "react";
import BookingDetails from "../../../../components/dashboard/booking-details";
import SiteHeader from "../../../../components/landing/site-header";
import styles from "../../../../components/landing/landing.module.css";

export const metadata = { title: "Booking · Lemmido" };

// The booking id is only known per request, so it's read inside Suspense (Cache Components)
export default function BookingPage({ params }: { params: Promise<{ bookingId: string }> }) {
    return (
        <div className={styles.page}>
            <SiteHeader/>
            <main>
                <Suspense fallback={<p style={{ padding: "32px 20px", color: "#777" }}>Loading your booking…</p>}>
                    {params.then(({ bookingId }) => <BookingDetails bookingId={bookingId}/>)}
                </Suspense>
            </main>
        </div>
    );
}
