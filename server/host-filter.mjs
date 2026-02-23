function normalizeTagList(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalized = tags
    .map((tag) => String(tag ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

export function resolveCategoryFilterTagsByHostname(hostname, fallbackTags = []) {
  const normalizedHost = String(hostname ?? "").trim().toLowerCase();

  const isReview = /^review/.test(normalizedHost);
  const isShare = /^share/.test(normalizedHost);

  const resolved = [];

  if (isReview) {
    resolved.push("review");
  }

  if (isShare) {
    resolved.push("share");
  }

  if (resolved.length > 0) {
    return resolved;
  }

  return normalizeTagList(fallbackTags);
}
