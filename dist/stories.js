/* Public story pages. Content is inserted with DOM APIs so story text cannot become HTML. */
(async () => {
  const list = document.getElementById("stories-list");
  const detail = document.getElementById("story");
  if (!list && !detail) return;

  const text = (value, fallback = "") => String(value ?? fallback).trim();
  const published = (story) => story && story.status === "published" && text(story.title) && text(story.body_markdown);
  const safeImage = (value) => {
    const candidate = text(value);
    if (!candidate) return "";
    try {
      const url = new URL(candidate, window.location.origin);
      return ["http:", "https:"].includes(url.protocol) ? url.href : (url.origin === window.location.origin ? url.pathname + url.search : "");
    } catch { return ""; }
  };
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(date);
  };
  const setMessage = (mount, message) => {
    mount.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.className = "text-sm opacity-60";
    paragraph.textContent = message;
    mount.append(paragraph);
  };
  const loadStories = async () => {
    const response = await fetch("/api/stories", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Stories could not be loaded");
    const payload = await response.json();
    return Array.isArray(payload.stories) ? payload.stories.filter(published) : [];
  };
  const renderBody = (mount, markdown) => {
    mount.replaceChildren();
    text(markdown).split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean).forEach((paragraph) => {
      const element = document.createElement("p");
      element.className = "mb-6 whitespace-pre-line leading-8 text-lg opacity-90";
      element.textContent = paragraph;
      mount.append(element);
    });
  };

  try {
    const stories = await loadStories();
    if (list) {
      if (!stories.length) { setMessage(list, "No published stories yet."); return; }
      list.replaceChildren();
      stories.forEach((story) => {
        const article = document.createElement("article");
        article.className = "overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900";
        const link = document.createElement("a");
        link.href = `/stories/${encodeURIComponent(text(story.slug))}`;
        link.className = "block h-full";
        const imageUrl = safeImage(story.cover_image_path);
        if (imageUrl) { const image = document.createElement("img"); image.src = imageUrl; image.alt = text(story.title); image.loading = "lazy"; image.className = "w-full aspect-[4/3] object-cover"; link.append(image); }
        const content = document.createElement("div"); content.className = "p-6";
        const title = document.createElement("h2"); title.className = "font-signika text-2xl font-bold"; title.textContent = text(story.title); content.append(title);
        const date = formatDate(story.published_at || story.created_at); if (date) { const meta = document.createElement("p"); meta.className = "mt-2 text-xs uppercase tracking-wider opacity-60"; meta.textContent = date; content.append(meta); }
        const excerpt = document.createElement("p"); excerpt.className = "mt-4 opacity-75"; excerpt.textContent = text(story.excerpt); content.append(excerpt);
        link.append(content); article.append(link); list.append(article);
      });
    }
    if (detail) {
      const routeSlug = window.location.pathname.replace(/\/$/, "").split("/").pop() || "";
      const slug = window.location.search ? (new URLSearchParams(window.location.search).get("slug") || routeSlug) : routeSlug;
      const story = stories.find((item) => text(item.slug) === slug);
      if (!story) { setMessage(detail, "That story is unavailable."); return; }
      detail.replaceChildren();
      const back = document.createElement("a"); back.href = "/stories/"; back.className = "text-sm underline opacity-70"; back.textContent = "← All stories"; detail.append(back);
      const title = document.createElement("h1"); title.className = "mt-10 text-5xl md:text-6xl font-bold"; title.textContent = text(story.title); detail.append(title);
      const date = formatDate(story.published_at || story.created_at); if (date) { const meta = document.createElement("p"); meta.className = "mt-4 text-sm opacity-60"; meta.textContent = date; detail.append(meta); }
      const imageUrl = safeImage(story.cover_image_path); if (imageUrl) { const image = document.createElement("img"); image.src = imageUrl; image.alt = text(story.title); image.className = "mt-10 w-full rounded-2xl object-cover"; detail.append(image); }
      const body = document.createElement("div"); body.className = "mt-12"; renderBody(body, story.body_markdown); detail.append(body);
    }
  } catch { if (list) setMessage(list, "Stories are unavailable right now."); if (detail) setMessage(detail, "This story is unavailable right now."); }
})();
