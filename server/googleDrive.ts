import { SignJWT, importPKCS8 } from "jose";
import { Readable } from "stream";
import { ENV } from "./_core/env";

type DriveConfig = {
  clientEmail: string;
  privateKey: string;
  folderId: string;
};

function normalizePrivateKey(value: string): string {
  // Railway等で貼り付けた際にクオートで囲まれてしまうケースや、
  // \n を含む1行文字列として保存されるケースに対応する。
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  v = v.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  return v;
}

function getDriveConfig(): DriveConfig | null {
  const clientEmail = ENV.googleServiceAccountEmail;
  const privateKey = ENV.googleServiceAccountPrivateKey;
  const folderId = ENV.googleDriveFolderId;

  if (!clientEmail || !privateKey || !folderId) {
    if (ENV.isProduction === false) return null;
    throw new Error(
      "Google Drive credentials missing: set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID"
    );
  }

  return { clientEmail, privateKey: normalizePrivateKey(privateKey), folderId };
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id";

let _cachedToken: { token: string; expiresAtMs: number } | null = null;

async function getAccessToken(): Promise<string> {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Google Drive credentials missing: set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID"
    );
  }

  const now = Date.now();
  if (_cachedToken && _cachedToken.expiresAtMs - 60_000 > now) {
    return _cachedToken.token;
  }

  const privateKeyPem = config.privateKey;
  let key: Awaited<ReturnType<typeof importPKCS8>>;
  try {
    key = await importPKCS8(privateKeyPem, "RS256");
  } catch (e) {
    // jose内部で「Invalid character」などが出ても、原因が分かるようにメッセージを補足する
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Invalid Google service account private key. Ensure GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is the JSON field "private_key" and is stored as a single line with \\n newlines. (original error: ${msg})`
    );
  }

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/drive",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(config.clientEmail)
    .setSubject(config.clientEmail)
    .setAudience(GOOGLE_TOKEN_URL)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key);

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Google OAuth token exchange failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
    );
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  if (!json.access_token) {
    throw new Error("Google OAuth token exchange failed: missing access_token");
  }

  _cachedToken = {
    token: json.access_token,
    expiresAtMs: now + (Number(json.expires_in || 3600) * 1000),
  };

  return json.access_token;
}

function randomBoundary() {
  return `----boundary_${Math.random().toString(16).slice(2)}${Date.now()}`;
}

export async function driveUploadImage(params: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<{ fileId: string }> {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Google Drive credentials missing: set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID"
    );
  }

  const token = await getAccessToken();
  const boundary = randomBoundary();

  const metadata = {
    name: params.fileName,
    parents: [config.folderId],
  };

  const part1 =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n`;
  const part2Header =
    `--${boundary}\r\n` +
    `Content-Type: ${params.mimeType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(part1, "utf8"),
    Buffer.from(part2Header, "utf8"),
    params.buffer,
    Buffer.from(closing, "utf8"),
  ]);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Google Drive upload failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
    );
  }

  const json = (await res.json()) as { id?: string };
  const fileId = json.id;
  if (!fileId) {
    throw new Error("Google Drive upload failed: missing file id");
  }

  return { fileId };
}

export async function driveDeleteFile(fileId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE", headers: { authorization: `Bearer ${token}` } }
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Google Drive delete failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
    );
  }
}

export async function driveGetFileStream(fileId: string): Promise<{
  stream: NodeJS.ReadableStream;
  contentType?: string;
}> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { authorization: `Bearer ${token}` } }
  );

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Google Drive download failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
    );
  }

  // Convert Web ReadableStream -> NodeJS.ReadableStream for Express
  const stream = Readable.fromWeb(res.body as any);
  const contentType = res.headers.get("content-type") ?? undefined;
  return { stream, contentType };
}
