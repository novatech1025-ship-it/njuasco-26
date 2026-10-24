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
  const title = textContent(tag(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i));
  const description = tag(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  titles.set(title, [...(titles.get(title) || []), page.file]);
  descriptions.set(description, [...(descriptions.get(description) || []), page.file]);
  check(title && title.length <= 60, `${page.file}: title missing or over 60 characters (${title.length})`);
  check(description.length >= 70 && description.length <= 160, `${page.file}: description length ${description.length}; expected 70-160`);
  const canonical = tag(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  const expected = page.file === "index.html" ? config.baseUrl : new URL(page.file, config.baseUrl).href;
  check(canonical === expected, `${page.file}: canonical mismatch; expected ${expected}`);
  for (const [name, re] of Object.entries({ "og:title": /<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i, "og:description": /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i, "og:url": /<meta\s+property=["']og:url["']\s+content=["']([^"']*)["']/i, "og:image": /<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i })) {
    check(Boolean(tag(html, re)), `${page.file}: missing ${name}`);
  }
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  check(h1s.length === 1, `${page.file}: expected one h1, found ${h1s.length}`);
  for (const image of html.matchAll(/<img\b[^>]*>/gi)) check(/\balt\s*=/.test(image[0]), `${page.file}: image lacks alt attribute: ${image[0].slice(0, 100)}`);
  for (const block of html.matchAll(/<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(block[1]); } catch (error) { errors.push(`${page.file}: invalid JSON-LD (${error.message})`); }
  }
}

for (const [value, pages] of titles) if (pages.length > 1) errors.push(`Duplicate title on ${pages.join(", ")}: ${value}`);
for (const [value, pages] of descriptions) if (value && pages.length > 1) errors.push(`Duplicate description on ${pages.join(", ")}`);

const sitemapPath = path.join(root, "sitemap.xml");
const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
for (const page of privatePages) {
  const html = fs.existsSync(path.join(root, page.file)) ? fs.readFileSync(path.join(root, page.file), "utf8") : "";
  check(/<meta\s+name=["']robots["']\s+content=["']noindex, nofollow["']/i.test(html), `${page.file}: missing static noindex robots tag`);
  check(!sitemap.includes(new URL(page.file, config.baseUrl).href), `${page.file}: private page appears in sitemap`);
  const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/gi)];
  check(jsonLdBlocks.length === 0, `${page.file}: private page contains structured data`);
}
check((sitemap.match(/<url>/g) || []).length === indexable.length, `Sitemap should contain exactly ${indexable.length} indexable URLs`);

if (errors.length) {
  console.error(`SEO check failed with ${errors.length} issue(s):\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`SEO check passed: ${indexable.length} indexable pages, ${privatePages.length} noindex pages, valid JSON-LD, unique titles and descriptions.`);
}
