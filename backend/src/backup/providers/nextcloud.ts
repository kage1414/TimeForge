export interface NextcloudConfig {
  base_url: string; // e.g. https://nextcloud.example.com
  username: string;
  password: string; // app password
  path?: string | null; // remote folder under the user's files, e.g. "Backups/timeforge"
}

function joinUrl(base: string, ...segments: string[]): string {
  const trimmedBase = base.replace(/\/+$/, '');
  const cleaned = segments
    .filter(Boolean)
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .map((s) => s.split('/').map(encodeURIComponent).join('/'));
  return [trimmedBase, ...cleaned].join('/');
}

// Strip a trailing /remote.php/... segment so users can paste either the
// Nextcloud root (https://host) or the full WebDAV URL Nextcloud's UI gives them
// (https://host/remote.php/dav/files/<userid>).
function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  const idx = trimmed.indexOf('/remote.php');
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
}

function authHeader(config: NextcloudConfig): string {
  return 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
}

function webdavRoot(config: NextcloudConfig): string {
  return joinUrl(normalizeBaseUrl(config.base_url), 'remote.php/dav/files', config.username);
}

async function ensureRemoteFolder(config: NextcloudConfig): Promise<void> {
  const folder = (config.path || '').replace(/^\/+|\/+$/g, '');
  if (!folder) return;
  const segments = folder.split('/');
  let current = '';
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const url = joinUrl(webdavRoot(config), current) + '/';
    const res = await fetch(url, {
      method: 'MKCOL',
      headers: { Authorization: authHeader(config) },
    });
    // 201 Created or 405 Method Not Allowed (already exists) are both acceptable.
    if (res.status !== 201 && res.status !== 405) {
      const text = await res.text().catch(() => '');
      throw new Error(`Nextcloud MKCOL failed (${res.status}) for ${current}: ${text.slice(0, 500)}`);
    }
  }
}

function buildFileUrl(config: NextcloudConfig, filename: string): string {
  const folder = (config.path || '').replace(/^\/+|\/+$/g, '');
  return folder
    ? joinUrl(webdavRoot(config), folder, filename)
    : joinUrl(webdavRoot(config), filename);
}

export async function uploadToNextcloud(
  config: NextcloudConfig,
  filename: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await ensureRemoteFolder(config);
  const url = buildFileUrl(config, filename);
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: authHeader(config),
      'Content-Type': contentType,
      'Content-Length': String(body.length),
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Nextcloud upload failed (${res.status}): ${text.slice(0, 500)}`);
  }
}

export async function testNextcloud(config: NextcloudConfig): Promise<void> {
  // PROPFIND on the user's root proves the URL + credentials.
  const res = await fetch(webdavRoot(config) + '/', {
    method: 'PROPFIND',
    headers: {
      Authorization: authHeader(config),
      Depth: '0',
    },
  });
  if (!res.ok && res.status !== 207) {
    const text = await res.text().catch(() => '');
    throw new Error(`Nextcloud connection failed (${res.status}): ${text.slice(0, 500)}`);
  }
  await ensureRemoteFolder(config);
}
