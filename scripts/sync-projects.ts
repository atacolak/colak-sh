import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getCatalog } from "../server/github-catalog";
import { site } from "../server/site";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "content", site.home.replace(/^\//, ""), "projects");

const catalog = await getCatalog();
await mkdir(outDir, { recursive: true });
for (const item of catalog.items) {
  await writeFile(join(outDir, `${item.name}.md`), item.markdown, "utf8");
}
