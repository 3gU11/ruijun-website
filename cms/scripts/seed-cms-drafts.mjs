import { readFile } from 'node:fs/promises';
import { createDirectusPageSeeder } from '../import/directus-page-seed.mjs';
import { createDirectusProductSeeder } from '../import/directus-product-seed.mjs';
import { createDirectusSiteSettingsSeeder } from '../import/directus-site-settings-seed.mjs';
import { createDirectusWebsiteEvidenceSeeder } from '../import/website-evidence-drafts.mjs';

const baseUrl = process.env.CMS_BASE_URL;
const accessToken = process.env.CMS_WRITE_TOKEN;
if (!baseUrl || !accessToken) {
  throw new Error('CMS_BASE_URL and CMS_WRITE_TOKEN are required to seed CMS drafts');
}

const catalogUrl = new URL('../../demo/data/product-catalog.json', import.meta.url);
const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'));
const options = { baseUrl, accessToken };
const pages = await createDirectusPageSeeder(options).seed();
const products = await createDirectusProductSeeder(options).seed(catalog);
const siteSettings = await createDirectusSiteSettingsSeeder(options).seed();
const websiteEvidence = await createDirectusWebsiteEvidenceSeeder(options).seed();
console.log(JSON.stringify({ pages, products, siteSettings, websiteEvidence }, null, 2));
