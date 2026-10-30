import { mkdir, writeFile, rename, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

// Immutable organizer snapshot used by docs/prep/data_profile.md.
const commit = "4fb99b3749adf0d10b5977089ff4c73f4f522240";
const files = [
  "researchers.json",
  "companies.json",
  "publications.jsonl",
  "projects.json",
  "patents.json",
  "company-pages.jsonl",
];
await mkdir("data", { recursive: true });
const manifest = {
  repository: "https://github.com/jigjoy-ai/einstein-matchmaker-data",
  commit,
  downloadedAt: new Date().toISOString(),
  files: {},
};
for (const file of files) {
  const url = `https://raw.githubusercontent.com/jigjoy-ai/einstein-matchmaker-data/${commit}/data/${file}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (file.endsWith(".jsonl"))
    bytes
      .toString("utf8")
      .trim()
      .split("\n")
      .forEach((line) => JSON.parse(line));
  else JSON.parse(bytes.toString("utf8"));
  const temp = join("data", `${file}.partial`);
  try {
    await writeFile(temp, bytes);
    await rename(temp, join("data", file));
  } finally {
    await rm(temp, { force: true });
  }
  manifest.files[file] = {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    url,
  };
  console.log(`Downloaded ${file}: ${bytes.length} bytes`);
}
await writeFile("data/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Snapshot ${commit}; data/ is gitignored.`);
