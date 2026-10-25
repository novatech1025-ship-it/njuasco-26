# NJUASCO Website

## Managing SEO

The 19 public pages have static SEO tags generated from `scripts/seo-pages.json`. Edit page titles, descriptions, share-image defaults and indexability in Admin under **SEO & Sharing**. The private portal and administration pages are statically marked `noindex` and are not editable there.

Admin saves page overrides to the `seo_pages` and `seo_site` keys in `site_content`. When those keys can be read using the existing public Supabase client, run a one-off static sync with:

```sh
node scripts/apply-seo.js --from-supabase
```

Run the static-default build and validation with:

```sh
npm run seo:build
npm run seo:check
```

The scheduled and manually dispatched workflow in `.github/workflows/seo-sync.yml` runs the Supabase sync, validates the generated output and commits only generated files that changed. WhatsApp and Facebook crawlers usually read the static HTML without running JavaScript, so their cards change after the static sync is deployed and those services re-read the page. Runtime overrides update browsers that can load the CMS data immediately; cached search and social previews may take longer to refresh.

The current approved public `site_content` read policy does not include `seo_pages` or `seo_site`. The sync therefore stops rather than replacing Admin-managed metadata with defaults when those rows are not visible to the public anon client. Do not add a service-role key to the repository or workflow. The school team must approve an appropriate read-only access path before scheduled Supabase sync can succeed; anonymous writes remain restricted by the existing authenticated staff policy.
