import { Dancing_Script, Inter } from "next/font/google";

export const metadata = { title: "Lemmido" };

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dancingScript = Dancing_Script({ subsets: ["latin"], variable: "--font-script" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dancingScript.variable}`}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
