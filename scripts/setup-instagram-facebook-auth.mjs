import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const projectRoot = path.resolve(import.meta.dirname, "..");
loadEnvConfig(projectRoot);

const graphVersion = "v25.0";
const targetMediaId = "18033583199846095";
const targetShortcode = "DdwtFOoTMpv";
const requiredPermissions = ["instagram_basic", "pages_read_engagement", "pages_show_list"];
const shouldWrite = process.argv.includes("--write");

const requireEnv = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
};

const graphRequest = async (pathname, token, params = {}) => {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${pathname}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("access_token", token);

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok || payload?.error) {
    const error = payload?.error ?? {};
    throw new Error([
      `Meta request failed for /${pathname}`,
      `HTTP ${response.status}`,
      error.code ? `code ${error.code}` : undefined,
      error.error_subcode ? `subcode ${error.error_subcode}` : undefined,
      error.type,
    ].filter(Boolean).join(", "));
  }
  return payload;
};

const exchangeForLongLivedUserToken = async (shortLivedToken, appId, appSecret) => {
  const url = new URL("https://graph.facebook.com/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok || !payload?.access_token) {
    const error = payload?.error ?? {};
    throw new Error([
      "Long-lived User token exchange failed",
      `HTTP ${response.status}`,
      error.code ? `code ${error.code}` : undefined,
      error.error_subcode ? `subcode ${error.error_subcode}` : undefined,
      error.type,
    ].filter(Boolean).join(", "));
  }
  return payload.access_token;
};

const inspectToken = async (token, appId, appSecret) => {
  const payload = await graphRequest("debug_token", `${appId}|${appSecret}`, {
    input_token: token,
  });
  return payload.data ?? {};
};

const shortcodeFromPermalink = (permalink) => {
  try {
    const segments = new URL(permalink).pathname.split("/").filter(Boolean);
    return segments[1];
  } catch {
    return undefined;
  }
};

const findCollaborativeMedia = async (instagramUserId, token) => {
  let nextPath = `${encodeURIComponent(instagramUserId)}/collaborative_media`;
  let params = {
    fields: "id,media_type,media_url,permalink",
    limit: "100",
  };
  const visited = new Set();

  for (let page = 0; page < 5 && nextPath; page += 1) {
    const key = `${nextPath}:${JSON.stringify(params)}`;
    if (visited.has(key)) break;
    visited.add(key);

    const payload = await graphRequest(nextPath, token, params);
    const match = payload.data?.find((item) => (
      item.id === targetMediaId || shortcodeFromPermalink(item.permalink) === targetShortcode
    ));
    if (match) return match;

    const next = payload.paging?.next;
    if (!next) break;
    const nextUrl = new URL(next);
    nextPath = nextUrl.pathname.replace(`/${graphVersion}/`, "").replace(/^\//, "");
    params = Object.fromEntries(nextUrl.searchParams.entries());
    delete params.access_token;
  }

  throw new Error(`Target Reel ${targetShortcode} was not returned by collaborative_media.`);
};

const verifyVideo = async (media) => {
  if (media.id !== targetMediaId) {
    throw new Error(`Target permalink resolved to unexpected media ID ${media.id}.`);
  }
  if (!media.media_url) throw new Error("Target Reel was returned without media_url.");

  const response = await fetch(media.media_url, {
    headers: { Range: "bytes=0-1023" },
    signal: AbortSignal.timeout(10_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (![200, 206].includes(response.status) || !contentType.startsWith("video/")) {
    throw new Error(`Target media URL failed playback probe: HTTP ${response.status}, ${contentType || "no content type"}.`);
  }
  await response.body?.cancel();
  return { status: response.status, contentType };
};

const formatExpiry = (timestamp) => {
  if (timestamp === 0) return "none reported (debug_token returned 0)";
  return timestamp
    ? new Date(timestamp * 1000).toISOString()
    : "not reported by debug_token";
};

const testCredential = async (credential, instagramUserId, token) => {
  try {
    const media = await findCollaborativeMedia(instagramUserId, token);
    const video = await verifyVideo(media);
    return { ok: true, credential, media, video };
  } catch (error) {
    return {
      ok: false,
      credential,
      error: error instanceof Error ? error.message : "Unknown failure",
    };
  }
};

const replaceEnvValue = (source, name, value) => {
  const line = `${name}=${value}`;
  const expression = new RegExp(`^${name}=.*$`, "m");
  return expression.test(source)
    ? source.replace(expression, line)
    : `${source.trimEnd()}\n${line}\n`;
};

const main = async () => {
  const appId = requireEnv("FACEBOOK_APP_ID");
  const appSecret = requireEnv("FACEBOOK_APP_SECRET");
  const shortLivedUserToken = requireEnv("FACEBOOK_USER_ACCESS_TOKEN");
  const pageId = requireEnv("INSTAGRAM_FACEBOOK_PAGE_ID");
  const expectedInstagramUserId = requireEnv("INSTAGRAM_FACEBOOK_USER_ID");

  const userToken = await exchangeForLongLivedUserToken(shortLivedUserToken, appId, appSecret);
  const userDebug = await inspectToken(userToken, appId, appSecret);
  if (!userDebug.is_valid || userDebug.type !== "USER" || String(userDebug.app_id) !== appId) {
    throw new Error("Exchanged token is not a valid User token for FACEBOOK_APP_ID.");
  }
  const missingPermissions = requiredPermissions.filter((permission) => !userDebug.scopes?.includes(permission));
  if (missingPermissions.length > 0) {
    throw new Error(`Exchanged token is missing permissions: ${missingPermissions.join(", ")}.`);
  }

  const page = await graphRequest(encodeURIComponent(pageId), userToken, {
    fields: "id,name,access_token,instagram_business_account",
  });
  if (String(page.id) !== pageId || page.instagram_business_account?.id !== expectedInstagramUserId) {
    throw new Error("Authorized Page does not resolve to INSTAGRAM_FACEBOOK_USER_ID.");
  }
  if (!page.access_token) throw new Error("Authorized Page response did not include a Page access token.");

  const pageDebug = await inspectToken(page.access_token, appId, appSecret);
  if (!pageDebug.is_valid || pageDebug.type !== "PAGE") {
    throw new Error("Derived credential is not a valid Page access token.");
  }

  const pageTest = await testCredential("PAGE", expectedInstagramUserId, page.access_token);
  const userTest = await testCredential("USER", expectedInstagramUserId, userToken);
  const acceptedTest = pageTest.ok ? pageTest : userTest.ok ? userTest : undefined;
  if (!acceptedTest) {
    throw new Error(`Neither derived Page nor long-lived User token passed: PAGE: ${pageTest.error}; USER: ${userTest.error}`);
  }
  const acceptedToken = acceptedTest.credential === "PAGE" ? page.access_token : userToken;
  const acceptedDebug = acceptedTest.credential === "PAGE" ? pageDebug : userDebug;

  if (shouldWrite) {
    const envPath = path.join(projectRoot, ".env.local");
    const source = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
    writeFileSync(envPath, replaceEnvValue(source, "INSTAGRAM_FACEBOOK_ACCESS_TOKEN", acceptedToken), {
      mode: 0o600,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    credential: acceptedTest.credential,
    appId: userDebug.app_id,
    pageId: page.id,
    instagramUserId: page.instagram_business_account.id,
    userTokenExpiresAt: formatExpiry(userDebug.expires_at),
    pageTokenExpiresAt: formatExpiry(pageDebug.expires_at),
    acceptedTokenExpiresAt: formatExpiry(acceptedDebug.expires_at),
    acceptedTokenDataAccessExpiresAt: formatExpiry(acceptedDebug.data_access_expires_at),
    credentialTests: {
      page: pageTest.ok ? "passed" : pageTest.error,
      user: userTest.ok ? "passed" : userTest.error,
    },
    target: {
      id: acceptedTest.media.id,
      shortcode: targetShortcode,
      mediaType: acceptedTest.media.media_type,
      playbackProbeStatus: acceptedTest.video.status,
      playbackContentType: acceptedTest.video.contentType,
    },
    wroteEnvLocal: shouldWrite,
  }, null, 2));
};

main().catch((error) => {
  console.error(`[instagram:auth] ${error instanceof Error ? error.message : "Unknown failure"}`);
  process.exitCode = 1;
});
