const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");
const noteId = process.env.SMOKE_NOTE_ID || "";

function toUrl(path) {
  return `${baseUrl}${path}`;
}

async function get(path) {
  const res = await fetch(toUrl(path), {
    headers: {
      "user-agent": "jmemo-release-smoke"
    }
  });

  const text = await res.text();
  return {
    path,
    ok: res.ok,
    status: res.status,
    contentType: res.headers.get("content-type") || "",
    text
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const live = await get("/health/live");
  assert(live.ok, `/health/live expected 200, got ${live.status}`);

  const ready = await get("/health/ready");
  assert(ready.ok, `/health/ready expected 200, got ${ready.status}`);

  const list = await get("/");
  assert(list.ok, `/ expected 200, got ${list.status}`);
  assert(list.contentType.includes("text/html"), `/ content-type expected text/html, got ${list.contentType}`);
  assert(list.text.toLowerCase().includes("<!doctype html>"), "/ expected html doctype");
  assert(list.text.includes("review-card-link"), "/ expected card list markup");
  assert(list.text.includes("theme-toggle"), "/ expected theme toggle markup");

  let detail = null;
  if (noteId) {
    detail = await get(`/notes/${noteId}`);
    assert(detail.ok, `/notes/:id expected 200, got ${detail.status}`);
    assert(detail.text.includes("markdown-body"), "/notes/:id expected markdown wrapper");
  }

  const summary = {
    ok: true,
    baseUrl,
    checked: noteId
      ? ["/health/live", "/health/ready", "/", `/notes/${noteId}`]
      : ["/health/live", "/health/ready", "/"],
    detailChecked: Boolean(detail)
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl,
        error: error?.message || String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
}
