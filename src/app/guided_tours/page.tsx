import SiteHeader from "../../components/landing/site-header";
import landing from "../../components/landing/landing.module.css";
import TourForms from "../../components/tour-forms/tour-forms";
import styles from "../../components/tour-forms/guided-tours.module.css";

export const metadata = { title: "Guided Tours · Lemmido" };

export default function GuidedToursPage() {
    return (
        <div className={landing.page}>
            <SiteHeader/>
            <main className={`${landing.container} ${styles.main}`}>
                {/* No visible heading; kept for screen readers */}
                <h1 className={landing.srOnly}>Guided Tours</h1>
                <TourForms/>
            </main>
        </div>
    );
}
