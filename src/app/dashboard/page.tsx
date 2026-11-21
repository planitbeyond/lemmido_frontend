import Dashboard from "../../components/dashboard/dashboard";
import SiteHeader from "../../components/landing/site-header";
import styles from "../../components/landing/landing.module.css";

export const metadata = { title: "My dashboard · Lemmido" };

export default function DashboardPage() {
    return (
        <div className={styles.page}>
            <SiteHeader/>
            <main>
                <Dashboard/>
            </main>
        </div>
    );
}
