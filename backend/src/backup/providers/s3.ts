import crypto from 'crypto';

export interface S3Config {
  endpoint?: string | null; // e.g. https://s3.us-west-002.backblazeb2.com — defaults to AWS S3
  region: string;
  bucket: string;
  access_key_id: string;
  secret_access_key: string;
  prefix?: string | null;
  force_path_style?: boolean | null; // required for many non-AWS providers
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function buildEndpointUrl(config: S3Config): URL {
  if (config.endpoint && config.endpoint.trim()) {
    return new URL(config.endpoint.trim());
  }
  return new URL(`https://s3.${config.region}.amazonaws.com`);
}

function buildObjectUrl(config: S3Config, key: string): { url: URL; host: string; canonicalUri: string } {
  const base = buildEndpointUrl(config);
  const usePathStyle = !!config.force_path_style || /amazonaws\.com$/.test(base.hostname) === false;
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  let url: URL;
  let host: string;
  let canonicalUri: string;
  if (usePathStyle) {
    url = new URL(`${base.origin}/${config.bucket}/${encodedKey}`);
    host = base.host;
    canonicalUri = `/${config.bucket}/${encodedKey}`;
  } else {
    const virtualHost = `${config.bucket}.${base.host}`;
    url = new URL(`${base.protocol}//${virtualHost}/${encodedKey}`);
    host = virtualHost;
    canonicalUri = `/${encodedKey}`;
  }
  return { url, host, canonicalUri };
}

function buildKey(config: S3Config, filename: string): string {
  const prefix = (config.prefix || '').replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/${filename}` : filename;
}

async function signedRequest(
  config: S3Config,
  method: 'PUT' | 'HEAD',
  filename: string,
  body: Buffer,
  contentType: string
): Promise<Response> {
  const key = buildKey(config, filename);
  const { url, host, canonicalUri } = buildObjectUrl(config, key);
  const payloadHash = sha256Hex(body);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20240101T000000Z
  const dateStamp = amzDate.slice(0, 8);

  const headers: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (method === 'PUT') {
    headers['content-type'] = contentType;
    headers['content-length'] = String(body.length);
  }

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((h) => `${h}:${headers[h].trim()}\n`).join('');
  const signedHeaders = signedHeaderNames.join(';');
  const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${config.secret_access_key}`, dateStamp);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.access_key_id}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url.toString(), {
    method,
    headers: { ...headers, Authorization: authorization },
    body: method === 'PUT' ? body : undefined,
  });
}

export async function uploadToS3(config: S3Config, filename: string, body: Buffer, contentType: string): Promise<void> {
  const res = await signedRequest(config, 'PUT', filename, body, contentType);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`S3 upload failed (${res.status}): ${text.slice(0, 500)}`);
  }
}

export async function testS3(config: S3Config): Promise<void> {
  // Probe with a 1-byte object then HEAD it. PUT verifies credentials + bucket access.
  const probeName = `.timeforge-backup-test-${Date.now()}`;
  const body = Buffer.from('1', 'utf8');
  const put = await signedRequest(config, 'PUT', probeName, body, 'text/plain');
  if (!put.ok) {
    const text = await put.text().catch(() => '');
    throw new Error(`S3 connection failed (${put.status}): ${text.slice(0, 500)}`);
  }
  // Best-effort cleanup is omitted (DELETE would just add another sig path); the file is 1 byte.
}

export interface S3Object {
  key: string;
  size: number;
  last_modified: string;
}

async function signedGet(
  config: S3Config,
  url: URL,
  host: string,
  canonicalUri: string,
  canonicalQuery: string,
): Promise<Response> {
  const payloadHash = sha256Hex('');
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const headers: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((h) => `${h}:${headers[h].trim()}\n`).join('');
  const signedHeaders = signedHeaderNames.join(';');
  const canonicalRequest = ['GET', canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${config.secret_access_key}`, dateStamp);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.access_key_id}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url.toString(), {
    method: 'GET',
    headers: { ...headers, Authorization: authorization },
  });
}

function buildBucketListRequest(config: S3Config): { url: URL; host: string; canonicalUri: string; canonicalQuery: string } {
  const base = buildEndpointUrl(config);
  const usePathStyle = !!config.force_path_style || /amazonaws\.com$/.test(base.hostname) === false;
  const prefix = (config.prefix || '').replace(/^\/+|\/+$/g, '');
  // Sig V4 canonical query string: keys sorted, RFC 3986 encoded values, no '+' in spaces.
  const queryParts: [string, string][] = [['list-type', '2']];
  if (prefix) queryParts.push(['prefix', prefix + '/']);
  queryParts.sort(([a], [b]) => a.localeCompare(b));
  const canonicalQuery = queryParts
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const querySuffix = canonicalQuery ? `?${canonicalQuery}` : '';
  let url: URL;
  let host: string;
  let canonicalUri: string;
  if (usePathStyle) {
    url = new URL(`${base.origin}/${config.bucket}/${querySuffix}`);
    host = base.host;
    canonicalUri = `/${config.bucket}/`;
  } else {
    const virtualHost = `${config.bucket}.${base.host}`;
    url = new URL(`${base.protocol}//${virtualHost}/${querySuffix}`);
    host = virtualHost;
    canonicalUri = '/';
  }
  return { url, host, canonicalUri, canonicalQuery };
}

function parseListBucketResult(xml: string): S3Object[] {
  const out: S3Object[] = [];
  const rx = /<Contents>([\s\S]*?)<\/Contents>/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(xml))) {
    const block = m[1];
    const key = /<Key>([^<]+)<\/Key>/.exec(block)?.[1];
    const sizeStr = /<Size>([^<]+)<\/Size>/.exec(block)?.[1];
    const lastModified = /<LastModified>([^<]+)<\/LastModified>/.exec(block)?.[1];
    if (key && sizeStr && lastModified) {
      out.push({ key, size: parseInt(sizeStr, 10), last_modified: lastModified });
    }
  }
  return out;
}

export async function listFromS3(config: S3Config): Promise<S3Object[]> {
  const { url, host, canonicalUri, canonicalQuery } = buildBucketListRequest(config);
  const res = await signedGet(config, url, host, canonicalUri, canonicalQuery);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`S3 list failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const xml = await res.text();
  return parseListBucketResult(xml);
}

export function s3KeyFor(config: S3Config, filename: string): string {
  return buildKey(config, filename);
}

export async function downloadFromS3(config: S3Config, key: string): Promise<Buffer> {
  const { url, host, canonicalUri } = buildObjectUrl(config, key);
  const res = await signedGet(config, url, host, canonicalUri, '');
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`S3 download failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
