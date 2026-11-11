import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../cms/package.json', import.meta.url));
const { S3Client, HeadBucketCommand, CreateBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const config = JSON.parse(await readFile(new URL('../.local/minio/credentials.json', import.meta.url), 'utf8'));
const client = new S3Client({ endpoint: 'http://127.0.0.1:9000', region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: config.username, secretAccessKey: config.password } });
for (const Bucket of ['ruijun-cms', 'ruijun-repairs']) {
  try { await client.send(new HeadBucketCommand({ Bucket })); }
  catch (error) {
    if (error.$metadata?.httpStatusCode !== 404) throw error;
    await client.send(new CreateBucketCommand({ Bucket }));
  }
  const Key = `_verification/${crypto.randomUUID()}.txt`;
  const Body = 'Ruijun MinIO storage verification';
  await client.send(new PutObjectCommand({ Bucket, Key, Body }));
  try {
    const result = await client.send(new GetObjectCommand({ Bucket, Key }));
    if (await result.Body.transformToString() !== Body) throw new Error('Object content mismatch');
  } finally { await client.send(new DeleteObjectCommand({ Bucket, Key })); }
  console.log(`${Bucket}: private bucket ready; upload/download/delete verified`);
}
client.destroy();
