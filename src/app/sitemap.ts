import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const requestHeaders = await headers();
	const host = requestHeaders.get("host");
	const protocol = requestHeaders.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
	const origin = host ? `${protocol}://${host}` : "";
	return ["", "/about", "/qr", "/anydownload", "/privacy", "/terms"].map(path => ({ url: `${origin}${path || "/"}`, lastModified: new Date() }));
}