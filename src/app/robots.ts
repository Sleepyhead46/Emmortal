import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
	const requestHeaders = await headers();
	const host = requestHeaders.get("host");
	const protocol = requestHeaders.get("x-forwarded-proto") || "https";
	return { rules: { userAgent: "*", allow: "/" }, sitemap: host ? `${protocol}://${host}/sitemap.xml` : undefined };
}