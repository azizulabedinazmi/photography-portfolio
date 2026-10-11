import { existsSync, readFileSync } from "node:fs";

const required = ["ads.txt", "robots.txt", "sitemap.xml", "index.html", "netlify.toml"];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Missing required files: ${missing.join(", ")}`);
  process.exit(1);
}

const robots = readFileSync("robots.txt", "utf8");
const ads = readFileSync("ads.txt", "utf8");
if (!robots.includes("Sitemap:")) throw new Error("robots.txt must reference a sitemap");
if (!ads.includes("google.com,")) throw new Error("ads.txt Google publisher entry is missing");
console.log("Project check passed: ads.txt, robots.txt, sitemap.xml, and core pages are present.");
