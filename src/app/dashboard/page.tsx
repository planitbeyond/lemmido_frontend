import Dashboard from "../../components/dashboard/dashboard";

export const metadata = { title: "My dashboard · Lemmido" };

// The dashboard has its own sidebar and search bar instead of the site header
export default function DashboardPage() {
    return (
        <main>
            <Dashboard/>
        </main>
    );
}
