"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "seo-pages.json"), "utf8"));
const errors = [];
const indexable = config.pages.filter((page) => page.robots === "index");
const privatePages = config.pages.filter((page) => page.robots === "noindex");
const titles = new Map();
const descriptions = new Map();
const sitemapPath = path.join(root, "sitemap.xml");
const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));

function tag(html, pattern, group = 1) {
  return pattern.exec(html)?.[group] || "";
}

function textContent(value) {
  return value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

for (const page of indexable) {
  const filePath = path.join(root, page.file);
  if (!fs.existsSync(filePath)) {
    errors.push(`${page.file}: file is missing`);
    continue;
  }
  const html = fs.readFileSync(filePath, "utf8");
  const titleTags = [...html.matchAll(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi)];
  const descriptionTags = [...html.matchAll(/<meta\s+name=["']description["'][^>]*>/gi)];
  const title = textContent(tag(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i));
  const description = tag(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  titles.set(title, [...(titles.get(title) || []), page.file]);
  descriptions.set(description, [...(descriptions.get(description) || []), page.file]);
  check(titleTags.length === 1, `${page.file}: expected exactly one title tag, found ${titleTags.length}`);
  check(descriptionTags.length === 1, `${page.file}: expected exactly one description tag, found ${descriptionTags.length}`);
  check(title && title.length <= 60, `${page.file}: title missing or over 60 characters (${title.length})`);
  check(description.length >= 70 && description.length <= 160, `${page.file}: description length ${description.length}; expected 70-160`);
  const robots = tag(html, /<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i);
  const pageUrl = page.file === "index.html" ? config.baseUrl : new URL(page.file, config.baseUrl).href;
  if (robots.startsWith("noindex")) {
    check(!sitemapUrls.has(pageUrl), `${page.file}: non-indexable page appears in sitemap`);
  } else {
    const canonical = tag(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
    check([...html.matchAll(/<link\s+rel=["']canonical["']/gi)].length === 1, `${page.file}: expected exactly one canonical link`);
    const expected = page.file === "index.html" ? config.baseUrl : new URL(page.file, config.baseUrl).href;
    check(canonical === expected, `${page.file}: canonical mismatch; expected ${expected}`);
    for (const [name, re] of Object.entries({ "og:title": /<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i, "og:description": /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i, "og:url": /<meta\s+property=["']og:url["']\s+content=["']([^"']*)["']/i, "og:image": /<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i })) {
      check(Boolean(tag(html, re)), `${page.file}: missing ${name}`);
    }
  }
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((match) => Number(match[1]));
  const h1s = headings.filter((level) => level === 1);
  check(h1s.length === 1, `${page.file}: expected one h1, found ${h1s.length}`);
  let previousLevel = 0;
  for (const level of headings) {
    check(previousLevel === 0 || level <= previousLevel + 1, `${page.file}: heading level skipped from h${previousLevel} to h${level}`);
    previousLevel = level;
  }
  check(robots.startsWith("noindex") ? !sitemapUrls.has(pageUrl) : sitemapUrls.has(pageUrl), `${page.file}: sitemap membership does not match its static robots directive`);
  for (const image of html.matchAll(/<img\b[^>]*>/gi)) check(/\balt\s*=/.test(image[0]), `${page.file}: image lacks alt attribute: ${image[0].slice(0, 100)}`);
  for (const block of html.matchAll(/<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(block[1]); } catch (error) { errors.push(`${page.file}: invalid JSON-LD (${error.message})`); }
  }
}

for (const [value, pages] of titles) if (pages.length > 1) errors.push(`Duplicate title on ${pages.join(", ")}: ${value}`);
for (const [value, pages] of descriptions) if (value && pages.length > 1) errors.push(`Duplicate description on ${pages.join(", ")}`);

for (const page of privatePages) {
  const html = fs.existsSync(path.join(root, page.file)) ? fs.readFileSync(path.join(root, page.file), "utf8") : "";
  check(/<meta\s+name=["']robots["']\s+content=["']noindex, nofollow["']/i.test(html), `${page.file}: missing static noindex robots tag`);
  check(!sitemap.includes(new URL(page.file, config.baseUrl).href), `${page.file}: private page appears in sitemap`);
  const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/gi)];
  check(jsonLdBlocks.length === 0, `${page.file}: private page contains structured data`);
}
const expectedSitemapCount = indexable.filter((page) => {
  const html = fs.readFileSync(path.join(root, page.file), "utf8");
  return !/<meta\s+name=["']robots["']\s+content=["']noindex/i.test(html);
}).length;
check(sitemapUrls.size === expectedSitemapCount, `Sitemap should contain exactly ${expectedSitemapCount} currently indexable URLs`);

for (const page of config.pages) {
  const html = fs.readFileSync(path.join(root, page.file), "utf8");
  check([...html.matchAll(/<h1\b/gi)].length === 1, `${page.file}: expected exactly one h1 across all pages`);
}

if (errors.length) {
  console.error(`SEO check failed with ${errors.length} issue(s):\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`SEO check passed: ${indexable.length} indexable pages, ${privatePages.length} noindex pages, valid JSON-LD, unique titles and descriptions.`);
}
