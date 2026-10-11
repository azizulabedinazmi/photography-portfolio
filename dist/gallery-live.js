// Adds database-managed photos without breaking the original static gallery.
// This lets the existing portfolio remain available while content is migrated.
(async () => {
  const mount = document.getElementById("managedGallery");
  if (!mount) return;
  try {
    const response = await fetch("/api/gallery");
    if (!response.ok) return;
    const { photos = [] } = await response.json();
    if (!photos.length) return;
    mount.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">${photos.map((photo) => `<a class="group block overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900" href="${photo.image_path}" data-fancybox="managed-gallery"><img loading="lazy" src="${photo.image_path}" alt="${photo.alt_text.replaceAll('"', '&quot;')}" class="w-full aspect-[4/5] object-cover transition duration-700 group-hover:scale-105"><div class="p-4"><h3 class="font-signika text-xl">${photo.title}</h3><p class="text-sm opacity-70">${photo.category}</p></div></a>`).join("")}</div>`;
    mount.previousElementSibling?.remove();
  } catch { /* The static gallery remains the fallback. */ }
})();
