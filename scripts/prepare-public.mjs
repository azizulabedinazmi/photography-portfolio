import { cp, mkdir, copyFile } from "node:fs/promises";

await mkdir("public/assets", { recursive: true });
await cp("dist/assets", "public/assets", { recursive: true, force: true });
await copyFile("ads.txt", "public/ads.txt");
await copyFile("robots.txt", "public/robots.txt");
await copyFile("sitemap.xml", "public/sitemap.xml");
