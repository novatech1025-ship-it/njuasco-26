"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const configPath = path.join(__dirname, "seo-pages.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const today = new Date().toISOString().slice(0, 10);
async function readOverrides() {
  if (!process.argv.includes("--from-supabase")) return { pages: {}, site: {} };
  const clientSource = fs.readFileSync(path.join(root, "page-common.js"), "utf8");
  const url = process.env.SUPABASE_URL || clientSource.match(/\burl:\s*["'](https:\/\/[^"']+)["']/)?.[1];
  const anonKey = process.env.SUPABASE_ANON_KEY || clientSource.match(/\banonKey:\s*["']([^"']+)["']/)?.[1];
  if (!url || !anonKey || anonKey === "******") {
    throw new Error("Could not read the public Supabase URL and anon key from page-common.js.");
  }
  const seoEndpoint = new URL("/rest/v1/site_content", url);
  seoEndpoint.search = new URLSearchParams({
    select: "key,value",
    key: 'in.("seo_pages","seo_site")',
  }).toString();
  const settingsEndpoint = new URL("/rest/v1/site_settings", url);
  settingsEndpoint.search = new URLSearchParams({ select: "value", key: "eq.site_info" }).toString();
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const [seoResponse, settingsResponse] = await Promise.all([
    fetch(seoEndpoint, { headers }),
    fetch(settingsEndpoint, { headers }),
  ]);
  if (!seoResponse.ok) {
    throw new Error(`Supabase SEO read failed (${seoResponse.status}): ${await seoResponse.text()}`);
  }
  if (!settingsResponse.ok) {
    throw new Error(`Supabase site settings read failed (${settingsResponse.status}): ${await settingsResponse.text()}`);
  }
  const rows = await seoResponse.json();
  const settingsRows = await settingsResponse.json();
  const result = { pages: {}, site: {} };
  for (const row of rows) {
    if (row.key === "seo_pages" && row.value && typeof row.value === "object" && !Array.isArray(row.value)) result.pages = row.value;
    if (row.key === "seo_site" && row.value && typeof row.value === "object" && !Array.isArray(row.value)) result.site = row.value;
  }
  if (!Object.keys(result.pages).length || !Object.keys(result.site).length) {
    throw new Error("Supabase returned no SEO settings. Sync was stopped so static defaults cannot overwrite Admin-managed values.");
  }
  const siteInfo = settingsRows[0]?.value;
  if (siteInfo && typeof siteInfo === "object" && !Array.isArray(siteInfo)) {
    result.site = { ...siteInfo, ...result.site };
  }
  return result;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function cleanText(value, maxLength) {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function jsonLd(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function makeSeoBlock(page, values, imagePath, siteValues = {}) {
  const title = cleanText(values.title || page.title, page.robots === "noindex" ? 100 : 70);
  const description = cleanText(values.description || page.description, page.robots === "noindex" ? 200 : 200);
  const canonical = page.file === "index.html" ? config.baseUrl : new URL(page.file, config.baseUrl).href;
  if (page.robots === "noindex" || values.indexable === false) {
    return [
      `    <title>${escapeHtml(title)}</title>`,
      `    <meta name="description" content="${escapeHtml(description)}" />`,
      '    <meta name="robots" content="noindex, nofollow" />',
    ].join("\n");
  }
  const requestedImage = values.ogImage || siteValues.defaultShareImage || imagePath;
  const image = /^https?:\/\//i.test(requestedImage) ? requestedImage : new URL(requestedImage, config.baseUrl).href;
  const imageAlt = values.ogImageAlt || page.ogImageAlt;
  const tags = [
    `    <title>${escapeHtml(title)}</title>`,
    `    <meta name="description" content="${escapeHtml(description)}" />`,
    `    <meta name="robots" content="${values.indexable === false ? "noindex, nofollow" : "index, follow, max-image-preview:large"}" />`,
    `    <link rel="canonical" href="${escapeHtml(canonical)}" />`,
    '    <meta property="og:type" content="website" />',
    `    <meta property="og:site_name" content="${escapeHtml(siteValues.siteName || config.siteName)}" />`,
    '    <meta property="og:locale" content="en_GH" />',
    `    <meta property="og:title" content="${escapeHtml(title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(description)}" />`,
    `    <meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `    <meta property="og:image" content="${escapeHtml(image)}" />`,
    '    <meta property="og:image:width" content="1200" />',
    '    <meta property="og:image:height" content="630" />',
    `    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    '    <meta name="twitter:card" content="summary_large_image" />',
    `    <meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `    <meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ];
  if (page.file === "index.html") {
    const schoolEntity = {
      "@type": "HighSchool",
      name: "New Juaben Senior High School",
      alternateName: ["NJUASCO", "NJB City", "New Juaben S.H.S"],
      url: canonical,
      logo: new URL("njuasco-logo.png", config.baseUrl).href,
      image,
      description,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Kassadjan Road",
        addressLocality: "Koforidua",
        addressRegion: "Eastern Region",
        addressCountry: "GH",
      },
    };
    const valid = (value) => {
      const text = String(value || "").trim();
      return text && !/(?:xx|placeholder|example|not set|unknown)/i.test(text) ? text : "";
    };
    const email = valid(siteValues.email) || "info@njuasco.edu.gh";
    const phone = valid(siteValues.phone);
    const address = valid(siteValues.address);
    if (email) schoolEntity.email = email;
    if (phone) schoolEntity.telephone = phone;
    if (address) schoolEntity.address.streetAddress = address;
    const sameAs = [siteValues.facebook, siteValues.twitter, siteValues.instagram].map(valid).filter(Boolean);
    if (sameAs.length) schoolEntity.sameAs = sameAs;
    const webSite = { "@type": "WebSite", name: cleanText(siteValues.siteName || config.siteName, 100), url: canonical };
    const school = {
      "@context": "https://schema.org",
      "@graph": [schoolEntity, webSite],
    };
    tags.push(`    <script type="application/ld+json">${jsonLd(school)}</script>`);
  } else {
    const pageName = title.split("|")[0].trim();
    const crumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: config.baseUrl },
        { "@type": "ListItem", position: 2, name: pageName, item: canonical },
      ],
    };
    tags.push(`    <script type="application/ld+json">${jsonLd(crumbs)}</script>`);
    if (page.file === "contact.html") {
      tags.push(`    <script type="application/ld+json">${jsonLd({ "@context": "https://schema.org", "@type": "ContactPage", name: title, url: canonical })}</script>`);
    }
  }
  return tags.join("\n");
}

async function apply() {
  const overrides = await readOverrides();
  const defaultImageExists = fs.existsSync(path.join(root, config.defaultOgImage));
  const imagePath = defaultImageExists ? config.defaultOgImage : "njuasco-logo.png";
  if (!defaultImageExists) console.warn(`SEO warning: ${config.defaultOgImage} is missing; using njuasco-logo.png until og-school.jpg is provided.`);
  let errors = 0;
  const changedPages = new Set();
  for (const page of config.pages) {
    const filePath = path.join(root, page.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing page: ${page.file}`);
      errors += 1;
      continue;
    }
    const html = fs.readFileSync(filePath, "utf8");
    const markers = /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/g;
    const block = `<!-- SEO:START -->\n${makeSeoBlock(page, { ...page, ...(overrides.pages[page.file] || {}) }, imagePath, overrides.site)}\n    <!-- SEO:END -->`;
    let output;
    if (markers.test(html)) {
      output = html.replace(markers, block);
    } else {
      const noTitle = html.replace(/\s*<title\b[^>]*>[\s\S]*?<\/title\s*>/i, "");
      output = noTitle.replace(/<head\b[^>]*>/i, (head) => `${head}\n    ${block}`);
    }
    if (page.robots === "index" && !output.includes("<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"")) {
      output = output.replace("<!-- SEO:START -->", '<link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <!-- SEO:START -->');
    }
    if (output !== html) {
      fs.writeFileSync(filePath, output);
      changedPages.add(page.file);
    }
  }
  const sitemapPath = path.join(root, "sitemap.xml");
  const oldSitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
  const oldLastmod = new Map([...oldSitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>\s*<\/url>/g)].map((match) => [match[1], match[2]]));
  const sitemapUrls = config.pages.filter((page) => {
    if (page.robots !== "index") return false;
    const override = overrides.pages[page.file];
    return override?.indexable !== false;
  }).map((page) => {
    const url = page.file === "index.html" ? config.baseUrl : new URL(page.file, config.baseUrl).href;
    const lastmod = changedPages.has(page.file) || !oldLastmod.has(url) ? today : oldLastmod.get(url);
    return `  <url>\n    <loc>${escapeHtml(url)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
  }).join("\n");
  const newSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`;
  if (newSitemap !== oldSitemap) fs.writeFileSync(sitemapPath, newSitemap);
  const robotsPath = path.join(root, "robots.txt");
  const robots = `# On a GitHub Pages project site, crawlers only read robots.txt at the domain root.\n# This file takes effect after a custom domain is connected; until then submit sitemap.xml in Google Search Console.\nUser-agent: *\nAllow: /\nSitemap: ${new URL("sitemap.xml", config.baseUrl).href}\n`;
  if (!fs.existsSync(robotsPath) || fs.readFileSync(robotsPath, "utf8") !== robots) fs.writeFileSync(robotsPath, robots);
  if (errors) process.exitCode = 1;
}

apply().catch((error) => {
  console.error(`SEO build error: ${error.message}`);
  process.exitCode = 1;
});
