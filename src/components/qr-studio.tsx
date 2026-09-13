"use client";

import { useEffect, useRef, useState } from "react";

type Purpose = "website" | "text" | "wifi" | "vcard" | "phone" | "email" | "sms" | "location" | "event";
type CornerStyle = "square" | "dot" | "rounded";
type QRInstance = { append: (element: HTMLElement) => void; update: (options: Record<string, unknown>) => void; download: (options: { name: string; extension: "png" | "svg" }) => Promise<void> };
type Details = Record<string, string>;

const purposes: { id: Purpose; label: string; icon: Purpose }[] = [
  { id: "website", label: "Website / URL", icon: "website" },
  { id: "text", label: "Plain Text", icon: "text" },
  { id: "wifi", label: "Wi-Fi", icon: "wifi" },
  { id: "vcard", label: "Contact / vCard", icon: "vcard" },
  { id: "phone", label: "Phone Call", icon: "phone" },
  { id: "email", label: "Email", icon: "email" },
  { id: "sms", label: "SMS", icon: "sms" },
  { id: "location", label: "Location / Google Maps", icon: "location" },
  { id: "event", label: "Event / Calendar", icon: "event" },
];

function PurposeIcon({ type }: { type: Purpose }) {
  const paths: Record<Purpose, string> = {
    website: "M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16M4.5 8h15M4.5 16h15",
    text: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    wifi: "M3 9a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9 15a5 5 0 0 1 6 0M12 19h.01",
    vcard: "M15 20a5 5 0 0 0-10 0M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M15 5h5M17.5 3v4M15 9h5",
    phone: "M6 4l3 2-2 3a14 14 0 0 0 4 4l3-2 2 3-2 2c-1 1-6-1-9-4s-5-8-4-9z",
    email: "M4 6h16v12H4zM4 7l8 6 8-6",
    sms: "M4 5h16v11H8l-4 3zM8 10h.01M12 10h.01M16 10h.01",
    location: "M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
    event: "M5 6h14v14H5zM8 3v6M16 3v6M5 10h14M8 14h3",
  };
  return <span className="purpose-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[type]} /></svg></span>;
}

function escapeValue(value: string) { return value.replace(/([\\;,:"])/g, "\\$1"); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function validHttpUrl(value: string) { try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } }
function field(details: Details, name: string, label: string, type = "text", placeholder = "") { return <label className="purpose-field"><span className="field-label">{label}</span><input type={type} value={details[name] || ""} placeholder={placeholder} onChange={(event) => (details.onChange as unknown as ((fieldName: string, fieldValue: string) => void) | undefined)?.(name, event.target.value)} /></label>; }

export default function QRStudio() {
  const previewRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRInstance | null>(null);
  const [purpose, setPurpose] = useState<Purpose>("website");
  const [details, setDetails] = useState<Details>({});
  const [foreground, setForeground] = useState("#17211b");
  const [gradientEnd, setGradientEnd] = useState("#6b7280");
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [background, setBackground] = useState("#f5f2ea");
  const [cornerStyle, setCornerStyle] = useState<CornerStyle>("rounded");
  const [logo, setLogo] = useState<string>();
  const [status, setStatus] = useState("");

  const updateDetail = (name: string, value: string) => { setDetails((current) => ({ ...current, [name]: value })); setStatus(""); };
  const formDetails = { ...details, onChange: updateDetail } as unknown as Details;

  let qrData = "";
  let validation = "";
  if (purpose === "website") { qrData = details.url || ""; if (details.url && !validHttpUrl(details.url)) validation = "Enter a valid HTTP or HTTPS URL."; }
  if (purpose === "text") qrData = details.text || "";
  if (purpose === "wifi") { qrData = `WIFI:T:${details.security || "WPA"};S:${escapeValue(details.ssid || "")};P:${escapeValue(details.password || "")};H:${details.hidden === "true" ? "true" : "false"};;`; if (details.ssid && !details.password) validation = "Enter the Wi-Fi password, or choose Open security."; }
  if (purpose === "vcard") { qrData = `BEGIN:VCARD\nVERSION:3.0\nFN:${details.name || ""}\nTEL:${details.phone || ""}\nEMAIL:${details.email || ""}\nORG:${details.company || ""}\nEND:VCARD`; if (details.email && !validEmail(details.email)) validation = "Enter a valid email address."; }
  if (purpose === "phone") { qrData = details.phone ? `tel:${details.phone}` : ""; }
  if (purpose === "email") { qrData = details.email ? `mailto:${details.email}?subject=${encodeURIComponent(details.subject || "")}&body=${encodeURIComponent(details.body || "")}` : ""; if (details.email && !validEmail(details.email)) validation = "Enter a valid email address."; }
  if (purpose === "sms") { qrData = details.phone ? `SMSTO:${details.phone}:${details.message || ""}` : ""; }
  if (purpose === "location") { qrData = details.latitude && details.longitude ? `geo:${details.latitude},${details.longitude}` : ""; if ((details.latitude && Number.isNaN(Number(details.latitude))) || (details.longitude && Number.isNaN(Number(details.longitude)))) validation = "Latitude and longitude must be numbers."; }
  if (purpose === "event") { qrData = details.title ? `BEGIN:VEVENT\nSUMMARY:${details.title}\nDTSTART:${(details.start || "").replaceAll("-", "").replaceAll(":", "")}\nDTEND:${(details.end || "").replaceAll("-", "").replaceAll(":", "")}\nLOCATION:${details.eventLocation || ""}\nEND:VEVENT` : ""; if (details.start && details.end && details.end <= details.start) validation = "The event end must be after the start."; }

  useEffect(() => {
    let mounted = true;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (!mounted || !previewRef.current) return;
      const qr = new QRCodeStyling({ width: 280, height: 280, type: "canvas", data: qrData || " ", image: logo, margin: 12, dotsOptions: gradientEnabled ? { gradient: { type: "linear", rotation: 0, colorStops: [{ offset: 0, color: foreground }, { offset: 1, color: gradientEnd }] }, type: "rounded" } : { color: foreground, type: "rounded" }, cornersSquareOptions: { color: foreground, type: "extra-rounded" }, cornersDotOptions: { color: foreground, type: "dot" }, backgroundOptions: { color: background }, imageOptions: { crossOrigin: "anonymous", margin: 8, hideBackgroundDots: true } });
      qrRef.current = qr;
      qr.append(previewRef.current);
    });
    return () => { mounted = false; };
  // The QR library is initialized once; updates are handled by the second effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!qrRef.current) return;
    qrRef.current.update({ data: qrData || " ", image: logo, dotsOptions: gradientEnabled ? { gradient: { type: "linear", rotation: 0, colorStops: [{ offset: 0, color: foreground }, { offset: 1, color: gradientEnd }] }, type: cornerStyle === "square" ? "square" : cornerStyle === "dot" ? "dots" : "rounded" } : { color: foreground, gradient: undefined, type: cornerStyle === "square" ? "square" : cornerStyle === "dot" ? "dots" : "rounded" }, cornersSquareOptions: { color: foreground, type: cornerStyle === "dot" ? "dot" : cornerStyle === "rounded" ? "extra-rounded" : "square" }, cornersDotOptions: { color: foreground }, backgroundOptions: { color: background } });
  }, [qrData, foreground, gradientEnd, gradientEnabled, background, cornerStyle, logo]);

  function selectPurpose(next: Purpose) { setPurpose(next); setDetails({}); setStatus(""); }
  function handleLogo(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") || file.size > 512 * 1024) { setStatus("Choose an image under 512 KB."); return; } const reader = new FileReader(); reader.onload = () => setLogo(String(reader.result)); reader.readAsDataURL(file); }
  function download(extension: "png" | "svg") { if (qrRef.current) qrRef.current.download({ name: "emmortal-qr", extension }); }

  return (
    <section className="studio" aria-labelledby="studio-title">
      <div className="intro"><p className="eyebrow">QR, without the clutter</p><h1 id="studio-title">Make something<br /><em>scan-worthy.</em></h1><p className="lede">Select a purpose, add your details, and make a crisp QR code in seconds.</p></div>
      <div className="workspace">
        <div className="controls">
          <span className="field-label">QR purpose</span>
          <div className="purpose-grid" role="group" aria-label="QR purpose">{purposes.map((item) => <button type="button" className={purpose === item.id ? "purpose-option selected" : "purpose-option"} key={item.id} onClick={() => selectPurpose(item.id)}><PurposeIcon type={item.icon} /><span className="purpose-label">{item.label}</span></button>)}</div>
          <div className="purpose-fields">
            {purpose === "website" && field(formDetails, "url", "Website URL", "url", "https://example.com")}
            {purpose === "text" && <label className="purpose-field"><span className="field-label">Your text</span><textarea value={details.text || ""} onChange={(event) => updateDetail("text", event.target.value.slice(0, 2048))} rows={4} maxLength={2048} placeholder="Write anything..." /></label>}
            {purpose === "wifi" && <>{field(formDetails, "ssid", "Network name", "text", "My Wi-Fi")}{field(formDetails, "password", "Password", "password", "Password")}{field(formDetails, "security", "Security", "text", "WPA")}</>}
            {purpose === "vcard" && <>{field(formDetails, "name", "Full name", "text", "Ada Lovelace")}{field(formDetails, "phone", "Phone", "tel")}{field(formDetails, "email", "Email", "email")}{field(formDetails, "company", "Company", "text")}</>}
            {purpose === "phone" && field(formDetails, "phone", "Phone number", "tel", "+1 555 123 4567")}
            {purpose === "email" && <>{field(formDetails, "email", "To", "email", "hello@example.com")}{field(formDetails, "subject", "Subject")}{field(formDetails, "body", "Message", "text", "Your message")}</>}
            {purpose === "sms" && <>{field(formDetails, "phone", "Phone number", "tel", "+1 555 123 4567")}{field(formDetails, "message", "Message", "text", "Your message")}</>}
            {purpose === "location" && <>{field(formDetails, "latitude", "Latitude", "text", "40.7128")}{field(formDetails, "longitude", "Longitude", "text", "-74.0060")}</>}
            {purpose === "event" && <>{field(formDetails, "title", "Event title", "text", "Team meetup")}{field(formDetails, "start", "Starts", "datetime-local")}{field(formDetails, "end", "Ends", "datetime-local")}{field(formDetails, "eventLocation", "Location", "text", "Venue or address")}</>}
          </div>
          {validation && <p className="status" role="alert">{validation}</p>}
          <div className="customize-heading"><span className="field-label">Customize</span></div>
          <div className="control-row"><span className="field-label">Pattern</span><div className="segmented" role="group" aria-label="Pattern style">{(["rounded", "dot", "square"] as CornerStyle[]).map((style) => <button type="button" className={cornerStyle === style ? "selected" : ""} key={style} onClick={() => setCornerStyle(style)}>{style}</button>)}</div></div>
          <div className="color-row"><label className="color-control"><span className="field-label">Ink</span><input type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} /></label>{gradientEnabled && <label className="color-control"><span className="field-label">Fade to</span><input type="color" value={gradientEnd} onChange={(event) => setGradientEnd(event.target.value)} /></label>}<label className="color-control"><span className="field-label">Canvas</span><input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label></div>
          <label className="gradient-toggle"><input type="checkbox" checked={gradientEnabled} onChange={(event) => setGradientEnabled(event.target.checked)} /><span className="toggle-track" aria-hidden="true"><span /></span><span><strong>Gradient ink</strong><small>Blend two colors across the pattern</small></span></label>
          <label className="upload"><span className="field-label">Center logo <small>optional</small></span><span className="upload-button">{logo ? "Replace image" : "Choose image"}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} /></label>
          {status && <p className="status" role="status">{status}</p>}
        </div>
        <div className="preview-column"><div className={validation ? "preview-card has-error" : qrData ? "preview-card is-ready" : "preview-card"}><div className="preview-meta"><span className={validation ? "preview-dot error" : qrData ? "preview-dot ready" : "preview-dot"} />{validation ? "Check your details" : qrData ? "Live preview · ready" : "Live preview · waiting"}</div><div ref={previewRef} className="qr-preview" aria-label="QR code preview" /></div><div className="export-row"><button type="button" onClick={() => download("png")} disabled={!qrData || Boolean(validation)}>Download PNG</button><button type="button" onClick={() => download("svg")} disabled={!qrData || Boolean(validation)}>Download SVG</button></div></div>
      </div>
    </section>
  );
}
