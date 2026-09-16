const rawSiteUrl = process.env.SITE_URL;

export const getSiteUrl = () => {
  if (!rawSiteUrl) return undefined;

  try {
    const siteUrl = new URL(rawSiteUrl);
    return siteUrl.protocol === "https:" ? siteUrl : undefined;
  } catch {
    return undefined;
  }
};

export const absoluteUrl = (path: string) => {
  const siteUrl = getSiteUrl();
  return siteUrl ? new URL(path, siteUrl).toString() : undefined;
};
