import { createDirectusServiceEntrySeeder } from '../import/service-entry-drafts.mjs';

const baseUrl = process.env.CMS_BASE_URL;
const accessToken = process.env.CMS_WRITE_TOKEN;
const repairSystemBaseUrl = process.env.REPAIRSYS_PUBLIC_BASE_URL;
if (!baseUrl || !accessToken || !repairSystemBaseUrl) {
  throw new Error('CMS_BASE_URL, CMS_WRITE_TOKEN, and REPAIRSYS_PUBLIC_BASE_URL are required to seed service entry drafts');
}

const result = await createDirectusServiceEntrySeeder({ baseUrl, accessToken, repairSystemBaseUrl }).seed();
console.log(JSON.stringify(result, null, 2));
