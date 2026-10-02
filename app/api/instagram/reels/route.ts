import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { products } from "@/data/products";

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
  unresolved?: boolean;
  children?: InstagramMediaChild[];
}

interface InstagramReelsResponse {
  reels: InstagramPost[];
  productMedia?: InstagramPost[];
  error?: string;
  code?: "INSTAGRAM_CONFIG_MISSING" | "INSTAGRAM_API_ERROR" | "INSTAGRAM_RESPONSE_INVALID";
}

interface InstagramDetailResult {
  item?: InstagramMediaItem;
  error?: InstagramRequestError;
}

interface InstagramCollectionResult {
  items: InstagramMediaItem[];
  error?: InstagramRequestError;
}

interface InstagramRequestError {
  status?: number;
  code?: number | "PAGINATION_LIMIT" | "REQUEST_FAILED";
  type?: string;
  message?: string;
}

interface MetaResponse<T> {
  response?: Response;
  payload?: T;
  error?: InstagramRequestError;
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

const associatedPosts = products
  .flatMap(product => [
    ...(product.instagramPost ? [product.instagramPost] : []),
    ...(product.instagramPosts ?? []),
  ].map(post => ({ product, post })));
const collaborativePosts = associatedPosts.filter(({ post }) => post.source === "collaborative");

const feedCacheMaxAgeMs = 5 * 60 * 1000;
const incompleteFeedCacheMaxAgeMs = 30 * 1000;
const feedCacheStaleAgeMs = 60 * 60 * 1000;
const feedCacheControl = "public, s-maxage=300, stale-while-revalidate=3600";
const graphApiVersion = "v25.0";
const maxPaginationPages = 5;
const metaRequestAttempts = 2;
const metaRequestTimeoutMs = 8_000;
let cachedFeed: { body: InstagramReelsResponse; cachedAt: number } | undefined;

const json = (body: InstagramReelsResponse, status = 200, cacheControl = "no-store, max-age=0") => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": cacheControl },
});

const getCachedFeed = (maxAge: number) =>
  cachedFeed && Date.now() - cachedFeed.cachedAt <= maxAge ? cachedFeed.body : undefined;

const isHttpsUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("https://");

const isSupportedMediaType = (value: unknown): value is InstagramMediaType =>
  value === "IMAGE" || value === "VIDEO" || value === "CAROUSEL_ALBUM";

const localInstagramVideoDirectory = path.join(process.cwd(), "public", "videos", "instagram");

const normalizeInstagramShortcode = (value: string | undefined) => {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    const [type, shortcode] = url.pathname.split("/").filter(Boolean);
    return (type === "p" || type === "reel") && shortcode ? shortcode : undefined;
  } catch {
    return undefined;
  }
};

const getLocalVideoUrl = (...keys: Array<string | undefined>) => {
  for (const key of keys) {
    if (!key || !/^[A-Za-z0-9_-]+$/.test(key)) continue;

    const fileName = `${key}.mp4`;
    const filePath = path.join(localInstagramVideoDirectory, fileName);
    if (existsSync(filePath)) return `/videos/instagram/${fileName}`;
  }

  return undefined;
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
  const shortcode = normalizeInstagramShortcode(item.permalink);
  const playableMediaUrl = mediaType === "VIDEO"
    ? mediaUrl ?? getLocalVideoUrl(item.id, shortcode)
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

const classifyMetaError = (error: InstagramRequestError) => {
  const message = error.message?.toLowerCase() ?? "";
  if (error.code === 190 && message.includes("expired")) return "expired_credential";
  if (error.code === 190) return "invalid_credential";
  if (error.code === 10 || error.code === 200) return "insufficient_permissions";
  if (error.code === 100) return "inaccessible_or_missing_media";
  if (error.code === "PAGINATION_LIMIT") return "pagination_limit";
  return "request_failed";
};

const fetchMetaJson = async <T,>(url: URL | string): Promise<MetaResponse<T>> => {
  for (let attempt = 0; attempt < metaRequestAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(metaRequestTimeoutMs),
      });
      const payload = await response.json().catch(() => undefined) as T | undefined;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === metaRequestAttempts - 1) return { response, payload };
    } catch {
      if (attempt === metaRequestAttempts - 1) {
        return { error: { code: "REQUEST_FAILED" } };
      }
    }
  }

  return { error: { code: "REQUEST_FAILED" } };
};

const fetchMediaDetail = async (mediaId: string, accessToken: string): Promise<InstagramDetailResult> => {
  try {
    const detailUrl = new URL(`https://graph.instagram.com/${encodeURIComponent(mediaId)}`);
    detailUrl.searchParams.set("fields", fields);
    detailUrl.searchParams.set("access_token", accessToken);

    const result = await fetchMetaJson<InstagramMediaItem & InstagramMediaResponse>(detailUrl);
    const { response, payload } = result;

    if (!response?.ok || !payload || typeof payload.id !== "string") {
      return {
        error: result.error ?? {
          status: response?.status,
          code: payload?.error?.code ?? "REQUEST_FAILED",
          type: payload?.error?.type,
          message: payload?.error?.message,
        },
      };
    }

    return { item: payload };
  } catch {
    return { error: { code: "REQUEST_FAILED" } };
  }
};

const fetchCollaborativeMedia = async (
  instagramUserId: string,
  accessToken: string,
): Promise<InstagramCollectionResult> => {
  const items: InstagramMediaItem[] = [];
  const visitedPageUrls = new Set<string>();
  const collectionUrl = new URL(
    `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(instagramUserId)}/collaborative_media`,
  );
  collectionUrl.searchParams.set("fields", fields);
  collectionUrl.searchParams.set("limit", "100");
  collectionUrl.searchParams.set("access_token", accessToken);
  let nextUrl: string | undefined = collectionUrl.toString();
  let pageCount = 0;

  try {
    while (nextUrl && !visitedPageUrls.has(nextUrl) && pageCount < maxPaginationPages) {
      visitedPageUrls.add(nextUrl);
      pageCount += 1;
      const result: MetaResponse<InstagramMediaResponse> = await fetchMetaJson(nextUrl);
      const response = result.response;
      const payload: InstagramMediaResponse | undefined = result.payload;

      if (!response?.ok || !payload || !Array.isArray(payload.data)) {
        return {
          items,
          error: result.error ?? {
            status: response?.status,
            code: payload?.error?.code,
            type: payload?.error?.type,
            message: payload?.error?.message,
          },
        };
      }

      items.push(...payload.data);
      nextUrl = payload.paging?.next;
    }

    if (nextUrl && pageCount >= maxPaginationPages) {
      return { items, error: { code: "PAGINATION_LIMIT" } };
    }

    return { items };
  } catch {
    return { items, error: { code: "REQUEST_FAILED" } };
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

const hasPlayableVideoSource = (post: InstagramPost) =>
  post.media_type !== "VIDEO" || Boolean(post.mediaUrl || post.media_url);

const hasMissingPlayableVideoSources = (body: InstagramReelsResponse) =>
  [...body.reels, ...(body.productMedia ?? [])].some(post => !hasPlayableVideoSource(post));

const getResponseCacheControl = (body: InstagramReelsResponse, cacheable: boolean) =>
  cacheable && !hasMissingPlayableVideoSources(body)
    ? feedCacheControl
    : "no-store, max-age=0";

const getCachedFeedByCompleteness = (completeMaxAge: number) => {
  if (!cachedFeed) return undefined;
  const maxAge = hasMissingPlayableVideoSources(cachedFeed.body)
    ? incompleteFeedCacheMaxAgeMs
    : completeMaxAge;
  return getCachedFeed(maxAge);
};

const createUnresolvedProductPost = (
  product: (typeof associatedPosts)[number]["product"],
  post: (typeof associatedPosts)[number]["post"],
): InstagramPost => {
  const mediaUrl = getLocalVideoUrl(post.mediaId, post.shortcode);

  return {
    id: post.mediaId ?? `${product.id}-${post.shortcode}-instagram-post`,
    caption: `${product.name} on Instagram`,
    media_type: "VIDEO" as const,
    media_product_type: "REELS",
    mediaUrl: mediaUrl,
    thumbnail_url: product.thumbnail,
    permalink: post.permalink,
    unresolved: !mediaUrl,
  };
};

export async function GET(request: Request) {
  const accessToken = normalizeCredential(process.env.INSTAGRAM_ACCESS_TOKEN);
  const instagramUserId = normalizeCredential(process.env.INSTAGRAM_USER_ID);
  const facebookAccessToken = normalizeCredential(process.env.INSTAGRAM_FACEBOOK_ACCESS_TOKEN);
  const facebookInstagramUserId = normalizeCredential(process.env.INSTAGRAM_FACEBOOK_USER_ID);

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

  const requestUrl = new URL(request.url);
  const requestedMediaId = requestUrl.searchParams.get("mediaId");
  if (requestedMediaId) {
    if (!/^\d+$/.test(requestedMediaId)) {
      return json({ reels: [], error: "Invalid Instagram media ID", code: "INSTAGRAM_RESPONSE_INVALID" }, 400);
    }

    const isCollaborativeMedia = collaborativePosts.some(({ post }) => post.mediaId === requestedMediaId);
    const collaborativeResult = isCollaborativeMedia && facebookAccessToken && facebookInstagramUserId
      ? await fetchCollaborativeMedia(facebookInstagramUserId, facebookAccessToken)
      : null;
    const collaborativeItem = collaborativeResult?.items.find(item => item.id === requestedMediaId);
    const detail = !isCollaborativeMedia
      ? await fetchMediaDetail(requestedMediaId, accessToken)
      : null;
    const item = collaborativeItem ?? detail?.item;
    const post = item ? toInstagramPost(item) : null;
    return json({ reels: post ? [post] : [] });
  }
  const requestedPermalink = requestUrl.searchParams.get("permalink");
  const requestedShortcode = normalizeInstagramShortcode(requestedPermalink ?? undefined);
  const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
  const isFullFeedRequest = !requestedMediaId && !requestedShortcode;
  const freshCachedFeed = !forceRefresh && isFullFeedRequest
    ? getCachedFeedByCompleteness(feedCacheMaxAgeMs)
    : undefined;
  if (freshCachedFeed) return json(freshCachedFeed, 200, getResponseCacheControl(freshCachedFeed, true));

  const mediaById = new Map<string, InstagramMediaItem>();
  const visitedPageUrls = new Set<string>();
  let mediaCount = 0;
  const mediaUrl = new URL(`https://graph.instagram.com/${encodeURIComponent(instagramUserId)}/media`);
  mediaUrl.searchParams.set("fields", fields);
  mediaUrl.searchParams.set("limit", "50");
  mediaUrl.searchParams.set("access_token", accessToken);
  let nextUrl: string | undefined = mediaUrl.toString();
  let pageCount = 0;

  try {
    while (nextUrl && !visitedPageUrls.has(nextUrl) && pageCount < maxPaginationPages) {
      visitedPageUrls.add(nextUrl);
      pageCount += 1;
      const result: MetaResponse<InstagramMediaResponse> = await fetchMetaJson(nextUrl);
      const response = result.response;
      const payload: InstagramMediaResponse | undefined = result.payload;

      if (!response?.ok) {
        const safeMetaMessage = sanitizeMetaMessage(payload?.error?.message, [accessToken, instagramUserId]);
        console.error("Instagram API request failed", {
          status: response?.status,
          code: payload?.error?.code ?? result.error?.code,
          type: payload?.error?.type ?? result.error?.type,
          message: safeMetaMessage,
        });
        const staleFeed = isFullFeedRequest ? getCachedFeedByCompleteness(feedCacheStaleAgeMs) : undefined;
        if (staleFeed) return json(staleFeed, 200, getResponseCacheControl(staleFeed, true));
        return json({
          reels: [],
          error: safeMetaMessage || "Instagram API request failed",
          code: "INSTAGRAM_API_ERROR",
        }, 502);
      }

      if (!payload || !Array.isArray(payload.data)) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Instagram Reels] Instagram API returned an invalid media payload.", {
            status: response?.status,
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

    if (nextUrl && pageCount >= maxPaginationPages && process.env.NODE_ENV === "development") {
      console.warn("[Instagram Feed] Own-media pagination stopped at the configured limit.", {
        maxPaginationPages,
      });
    }

    const requestedItems = new Set<string>();
    associatedPosts.forEach(({ post }) => {
      if (post.source !== "collaborative" && post.mediaId && !mediaById.has(post.mediaId)) {
        requestedItems.add(post.mediaId);
      }
    });

    const associatedDetailResults = await mapWithConcurrency(
      [...requestedItems],
      2,
      mediaId => fetchMediaDetail(mediaId, accessToken),
    );
    associatedDetailResults.forEach(result => {
      if (result.item && !mediaById.has(result.item.id)) {
        mediaById.set(result.item.id, result.item);
      }
    });
    if (process.env.NODE_ENV === "development") {
      const detailErrors = associatedDetailResults
        .map(result => result.error)
        .filter((error): error is InstagramRequestError => Boolean(error));
      if (detailErrors.length > 0) {
        console.warn("[Instagram Feed] Associated media detail request failed.", detailErrors.map(error => ({
          ...error,
          reason: classifyMetaError(error),
          message: sanitizeMetaMessage(error.message, [accessToken, instagramUserId]),
        })));
      }
    }

    const allMediaItems = [...mediaById.values()];
    const incompleteVideoItems = allMediaItems.filter(item => {
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

    allMediaItems.forEach(item => {
      const enrichedItem = detailById.get(item.id);
      const post = toInstagramPost(enrichedItem ? mergeMediaDetail(item, enrichedItem) : item);
      if (post && !postsById.has(post.id)) postsById.set(post.id, post);
    });

    const ownPosts = [...postsById.values()].sort(
      (a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime(),
    );
    const collaborativeResult = facebookAccessToken && facebookInstagramUserId
      ? await fetchCollaborativeMedia(facebookInstagramUserId, facebookAccessToken)
      : { items: [] };

    if (collaborativeResult.error && process.env.NODE_ENV === "development") {
      console.warn("[Instagram Feed] Collaborative media request failed.", {
        ...collaborativeResult.error,
        reason: classifyMetaError(collaborativeResult.error),
        message: sanitizeMetaMessage(
          collaborativeResult.error.message,
          [facebookAccessToken, facebookInstagramUserId].filter((value): value is string => Boolean(value)),
        ),
      });
    }

    const collaborativeByShortcode = new Map<string, InstagramPost>();
    collaborativeResult.items.forEach(item => {
      const shortcode = normalizeInstagramShortcode(item.permalink);
      const post = toInstagramPost(item);
      if (shortcode && post && !collaborativeByShortcode.has(shortcode)) {
        collaborativeByShortcode.set(shortcode, post);
      }
    });

    const productMedia = associatedPosts.map(({ product, post }) => {
      const resolved = collaborativeByShortcode.get(post.shortcode) ?? ownPosts.find(item => (
        normalizeInstagramShortcode(item.permalink) === post.shortcode
      ));
      return resolved ?? createUnresolvedProductPost(product, post);
    });
    const targetAssociation = associatedPosts.find(({ post }) => post.featured);
    const targetShortcode = targetAssociation?.post.shortcode;
    const resolvedTarget = targetShortcode
      ? collaborativeByShortcode.get(targetShortcode) ?? ownPosts.find(post => (
        normalizeInstagramShortcode(post.permalink) === targetShortcode
      ))
      : undefined;
    const targetPost = resolvedTarget ?? (targetAssociation
      ? createUnresolvedProductPost(targetAssociation.product, targetAssociation.post)
      : undefined);
    let posts = targetPost
      ? [
        targetPost,
        ...ownPosts.filter(post => (
          post.id !== targetPost.id && normalizeInstagramShortcode(post.permalink) !== targetShortcode
        )),
      ]
      : ownPosts;

    if (requestedShortcode) {
      posts = [...posts, ...productMedia].filter((post, index, all) => (
        normalizeInstagramShortcode(post.permalink) === requestedShortcode &&
        all.findIndex(candidate => candidate.id === post.id) === index
      ));
    }
    const missingVideoIds = posts
      .filter(post => post.media_type === "VIDEO" && !post.mediaUrl)
      .map(post => post.id);

    if (process.env.NODE_ENV === "development") {
      console.info(`[Instagram Feed] Loaded ${mediaCount} media item(s) and returned ${posts.length} post(s).`);
      if (missingVideoIds.length > 0) {
        console.warn("[Instagram Feed] Meta did not provide playable video URLs.", { mediaIds: missingVideoIds });
      }
    }

    const body = { reels: posts, productMedia };
    const cacheControl = getResponseCacheControl(body, isFullFeedRequest);
    if (isFullFeedRequest) {
      cachedFeed = { body, cachedAt: Date.now() };
    }
    return json(body, 200, cacheControl);
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.error("[Instagram Reels] Instagram API request failed before a valid response was received.");
    }
    const staleFeed = isFullFeedRequest ? getCachedFeedByCompleteness(feedCacheStaleAgeMs) : undefined;
    if (staleFeed) return json(staleFeed, 200, getResponseCacheControl(staleFeed, true));
    return json({
      reels: [],
      error: "Instagram API request failed",
      code: "INSTAGRAM_API_ERROR",
    }, 502);
  }
}
