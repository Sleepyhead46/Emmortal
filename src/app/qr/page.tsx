import QRStudio from "@/components/qr-studio";
export const metadata = { title: "QR Code Generator", description: "Create customizable QR codes for URLs, Wi-Fi, contacts, email, SMS, events, and more in your browser.", alternates: { canonical: "/qr" } };
export default function QRPage() { return <main className="container py-20"><QRStudio /></main>; }