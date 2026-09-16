import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  children?: {
    data?: InstagramMediaChildPayload[];
  };
}

interface InstagramMediaChildPayload {
  id?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
}

interface InstagramMediaResponse {
  data?: InstagramMediaItem[];
  paging?: {
    next?: string;
  };
  error?: {
    code?: number;
    type?: string;
    message?: string;
  };
}

type InstagramMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

interface InstagramMediaChild {
  id?: string;
  media_type: "IMAGE" | "VIDEO";
  media_url?: string;
  thumbnail_url?: string;
}

interface InstagramPost {
  id: string;
  caption?: string;
  media_type: InstagramMediaType;
  media_product_type?: string;
  media_url?: string;
  mediaUrl?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp?: string;
  children?: InstagramMediaChild[];
}

interface InstagramReelsResponse {
  reels: InstagramPost[];
  error?: string;
  code?: "INSTAGRAM_CONFIG_MISSING" | "INSTAGRAM_API_ERROR" | "INSTAGRAM_RESPONSE_INVALID";
}

interface InstagramDetailResult {
  item?: InstagramMediaItem;
  errorCode?: number | "REQUEST_FAILED";
}

const fields = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "children{id,media_type,media_url,thumbnail_url}",
].join(",");

const json = (body: InstagramReelsResponse, status = 200) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store, max-age=0" },
});

const isHttpsUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("https://");

const isSupportedMediaType = (value: unknown): value is InstagramMediaType =>
  value === "IMAGE" || value === "VIDEO" || value === "CAROUSEL_ALBUM";

const getLocalVideoUrl = (mediaId: string) => {
  if (!/^\d+$/.test(mediaId)) return undefined;

  const fileName = `${mediaId}.mp4`;
  const filePath = path.join(process.cwd(), "public", "videos", "instagram", fileName);
  return existsSync(filePath) ? `/videos/instagram/${fileName}` : undefined;
};

const toMediaChild = (child: InstagramMediaChildPayload): InstagramMediaChild | null => {
  if (child.media_type !== "IMAGE" && child.media_type !== "VIDEO") return null;

  const mediaUrl = isHttpsUrl(child.media_url) ? child.media_url : undefined;
  const thumbnailUrl = isHttpsUrl(child.thumbnail_url) ? child.thumbnail_url : undefined;
  const hasPreview = child.media_type === "IMAGE" ? Boolean(mediaUrl) : Boolean(mediaUrl || thumbnailUrl);
  if (!hasPreview) return null;

  return {
    id: child.id,
    media_type: child.media_type,
    media_url: mediaUrl,
    thumbnail_url: thumbnailUrl,
  };
};

const toInstagramPost = (item: InstagramMediaItem): InstagramPost | null => {
  if (typeof item.id !== "string" || !isHttpsUrl(item.permalink)) return null;

  const mediaType = isSupportedMediaType(item.media_type)
    ? item.media_type
    : item.media_product_type === "REELS"
      ? "VIDEO"
      : null;
  if (!mediaType) return null;

  const mediaUrl = isHttpsUrl(item.media_url) ? item.media_url : undefined;
  const playableMediaUrl = mediaType === "VIDEO"
    ? mediaUrl ?? getLocalVideoUrl(item.id)
    : mediaUrl;
  const thumbnailUrl = isHttpsUrl(item.thumbnail_url) ? item.thumbnail_url : undefined;
  const children = (item.children?.data ?? [])
    .map(toMediaChild)
    .filter((child): child is InstagramMediaChild => child !== null);

  if (mediaType === "IMAGE" && !mediaUrl) return null;
  if (mediaType === "VIDEO" && !playableMediaUrl && !thumbnailUrl) return null;
  if (mediaType === "CAROUSEL_ALBUM" && children.length === 0) return null;

  return {
    id: item.id,
    caption: item.caption,
    media_type: mediaType,
    media_product_type: item.media_product_type,
    media_url: mediaUrl,
    mediaUrl: playableMediaUrl,
    thumbnail_url: thumbnailUrl,
    permalink: item.permalink,
    timestamp: item.timestamp,
    children: mediaType === "CAROUSEL_ALBUM" ? children : undefined,
  };
};

const normalizeCredential = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const firstCharacter = trimmed[0];
  const hasMatchingQuotes =
    (firstCharacter === '"' || firstCharacter === "'") &&
    trimmed.at(-1) === firstCharacter;

  return hasMatchingQuotes ? trimmed.slice(1, -1).trim() : trimmed;
};

const sanitizeMetaMessage = (message: string | undefined, sensitiveValues: string[]) => {
  if (!message) return undefined;

  return sensitiveValues.reduce(
    (sanitized, value) => sanitized.split(value).join("[REDACTED]"),
    message.replace(/access_token=[^&\s]+/gi, "access_token=[REDACTED]"),
  );
};

const fetchMediaDetail = async (mediaId: string, accessToken: string): Promise<InstagramDetailResult> => {
  try {
    const detailUrl = new URL(`https://graph.instagram.com/${encodeURIComponent(mediaId)}`);
    detailUrl.searchParams.set("fields", fields);
    detailUrl.searchParams.set("access_token", accessToken);

    const response = await fetch(detailUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const payload = await response.json().catch(() => null) as InstagramMediaItem & InstagramMediaResponse;

    if (!response.ok || !payload || typeof payload.id !== "string") {
      return { errorCode: payload?.error?.code ?? "REQUEST_FAILED" };
    }

    return { item: payload };
  } catch {
    return { errorCode: "REQUEST_FAILED" };
  }
};

const mapWithConcurrency = async <T, R>(
  values: T[],
  limit: number,
  mapper: (value: T) => Promise<R>,
) => {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]);
    }
  }));

  return results;
};

const mergeMediaDetail = (item: InstagramMediaItem, detail: InstagramMediaItem): InstagramMediaItem => ({
  ...item,
  ...detail,
  // Collection fields remain authoritative when the detail response omits them.
  caption: detail.caption ?? item.caption,
  timestamp: detail.timestamp ?? item.timestamp,
  media_type: detail.media_type ?? item.media_type,
  media_product_type: detail.media_product_type ?? item.media_product_type,
  media_url: detail.media_url ?? item.media_url,
  thumbnail_url: detail.thumbnail_url ?? item.thumbnail_url,
  permalink: detail.permalink ?? item.permalink,
  children: detail.children ?? item.children,
});

export async function GET(request: Request) {
  const accessToken = normalizeCredential(process.env.INSTAGRAM_ACCESS_TOKEN);
  const instagramUserId = normalizeCredential(process.env.INSTAGRAM_USER_ID);

  if (!accessToken || !instagramUserId) {
    if (process.env.NODE_ENV === "development") {
      const missingVariables = [
        !accessToken && "INSTAGRAM_ACCESS_TOKEN",
        !instagramUserId && "INSTAGRAM_USER_ID",
      ].filter(Boolean);
      console.error("[Instagram Reels] Server credentials are not configured.", {
        missingVariables,
      });
    }
    return json({
      reels: [],
      error: "Instagram server credentials are not configured",
      code: "INSTAGRAM_CONFIG_MISSING",
    }, 503);
  }

  const requestedMediaId = new URL(request.url).searchParams.get("mediaId");
  if (requestedMediaId) {
    if (!/^\d+$/.test(requestedMediaId)) {
      return json({ reels: [], error: "Invalid Instagram media ID", code: "INSTAGRAM_RESPONSE_INVALID" }, 400);
    }

    const detail = await fetchMediaDetail(requestedMediaId, accessToken);
    const post = detail.item ? toInstagramPost(detail.item) : null;
    return json({ reels: post ? [post] : [] });
  }

  const mediaById = new Map<string, InstagramMediaItem>();
  const visitedPageUrls = new Set<string>();
  let mediaCount = 0;
  const mediaUrl = new URL(`https://graph.instagram.com/${encodeURIComponent(instagramUserId)}/media`);
  mediaUrl.searchParams.set("fields", fields);
  mediaUrl.searchParams.set("limit", "50");
  mediaUrl.searchParams.set("access_token", accessToken);
  let nextUrl: string | undefined = mediaUrl.toString();

  try {
    while (nextUrl && !visitedPageUrls.has(nextUrl)) {
      visitedPageUrls.add(nextUrl);
      const response = await fetch(nextUrl, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as InstagramMediaResponse | null;

      if (!response.ok) {
        const safeMetaMessage = sanitizeMetaMessage(payload?.error?.message, [accessToken, instagramUserId]);
        console.error("Instagram API request failed", {
          status: response.status,
          code: payload?.error?.code,
          type: payload?.error?.type,
          message: safeMetaMessage,
        });
        return json({
          reels: [],
          error: safeMetaMessage || "Instagram API request failed",
          code: "INSTAGRAM_API_ERROR",
        }, 502);
      }

      if (!payload || !Array.isArray(payload.data)) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Instagram Reels] Instagram API returned an invalid media payload.", {
            status: response.status,
          });
        }
        return json({
          reels: [],
          error: "Instagram API returned an invalid media response",
          code: "INSTAGRAM_RESPONSE_INVALID",
        }, 502);
      }

      mediaCount += payload.data.length;
      payload.data.forEach(item => {
        if (typeof item.id === "string" && !mediaById.has(item.id)) mediaById.set(item.id, item);
      });
      nextUrl = payload.paging?.next;
    }

    const mediaItems = [...mediaById.values()];
    const incompleteVideoItems = mediaItems.filter(item => {
      const isVideo = item.media_type === "VIDEO" || item.media_product_type === "REELS";
      return isVideo && !isHttpsUrl(item.media_url);
    });
    const detailResults = await mapWithConcurrency(
      incompleteVideoItems,
      2,
      item => fetchMediaDetail(item.id, accessToken),
    );
    const detailById = new Map(
      incompleteVideoItems.flatMap((item, index) => {
        const detail = detailResults[index].item;
        return detail ? [[item.id, detail] as const] : [];
      }),
    );
    const postsById = new Map<string, InstagramPost>();

    mediaItems.forEach(item => {
      const enrichedItem = detailById.get(item.id);
      const post = toInstagramPost(enrichedItem ? mergeMediaDetail(item, enrichedItem) : item);
      if (post && !postsById.has(post.id)) postsById.set(post.id, post);
    });

    const posts = [...postsById.values()].sort(
      (a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime(),
    );
    const missingVideoIds = posts
      .filter(post => post.media_type === "VIDEO" && !post.mediaUrl)
      .map(post => post.id);

    if (process.env.NODE_ENV === "development") {
      console.info(`[Instagram Feed] Loaded ${mediaCount} media item(s) and returned ${posts.length} post(s).`);
      if (missingVideoIds.length > 0) {
        console.warn("[Instagram Feed] Meta did not provide playable video URLs.", { mediaIds: missingVideoIds });
      }
    }

    return json({ reels: posts });
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.error("[Instagram Reels] Instagram API request failed before a valid response was received.");
    }
    return json({
      reels: [],
      error: "Instagram API request failed",
      code: "INSTAGRAM_API_ERROR",
    }, 502);
  }
}
