(async () => {
  const mount = document.getElementById("managedGallery");
  if (!mount) return;
  try {
    const response = await fetch("/api/gallery");
    if (!response.ok) return;
    const { photos = [] } = await response.json();
    if (!photos.length) return;
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5";
    photos.forEach((photo) => {
      const link = document.createElement("a"); link.className = "group block overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900"; link.href = photo.image_path; link.dataset.fancybox = "managed-gallery";
      const image = document.createElement("img"); image.loading = "lazy"; image.src = photo.image_path; image.alt = photo.alt_text || photo.title || "Portfolio photograph"; image.className = "w-full aspect-[4/5] object-cover transition duration-700 group-hover:scale-105";
      const details = document.createElement("div"); details.className = "p-4";
      const title = document.createElement("h3"); title.className = "font-signika text-xl"; title.textContent = photo.title || "Untitled";
      const category = document.createElement("p"); category.className = "text-sm opacity-70"; category.textContent = photo.category || "Photography";
      details.append(title, category); link.append(image, details); grid.append(link);
    });
    mount.replaceChildren(grid); mount.previousElementSibling?.remove();
  } catch { /* The static gallery remains the fallback. */ }
})();
