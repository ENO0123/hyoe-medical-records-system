import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

type ImageAccessTokenPayload = {
  uid: number;
  imgId: number;
};

function getSecretKey() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createImageAccessToken(params: {
  userId: number;
  imageRowId: number;
  expiresInSeconds?: number;
}): Promise<string> {
  const secretKey = getSecretKey();
  const expiresInSeconds = params.expiresInSeconds ?? 60 * 60; // 1 hour

  return new SignJWT({
    uid: params.userId,
    imgId: params.imageRowId,
  } satisfies ImageAccessTokenPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(secretKey);
}

export async function verifyImageAccessToken(params: {
  token: string;
  expectedImageRowId: number;
}): Promise<{ userId: number }> {
  const secretKey = getSecretKey();
  const { payload } = await jwtVerify(params.token, secretKey, {
    algorithms: ["HS256"],
  });

  const uid = (payload as any)?.uid;
  const imgId = (payload as any)?.imgId;

  if (typeof uid !== "number" || !Number.isFinite(uid)) {
    throw new Error("Invalid token payload: uid");
  }
  if (typeof imgId !== "number" || !Number.isFinite(imgId)) {
    throw new Error("Invalid token payload: imgId");
  }
  if (imgId !== params.expectedImageRowId) {
    throw new Error("Token image id mismatch");
  }

  return { userId: uid };
}

