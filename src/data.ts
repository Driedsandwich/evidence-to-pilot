import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

export type RecordData = { id: string; [key: string]: unknown };
export type Source = {
  id: string;
  kind: string;
  file: string;
  locator: string;
  record: RecordData;
  researcherIds: string[];
};
export type Citation = { recordId: string; field: string; quote: string };
export type Candidate = {
  researcherId: string;
  evidenceId: string;
  matchedTerms: string[];
};
export const SNAPSHOT = "4fb99b3749adf0d10b5977089ff4c73f4f522240";
const mappings: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ђ: "dj",
  е: "e",
  ж: "z",
  з: "z",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ћ: "c",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "c",
  џ: "dz",
  ш: "s",
  đ: "dj",
};
const stop = new Set(
  "the and for with that this from have has are was were our their they into not but can which without would about need want more than some been all one two each also these those data using used use study results research company project ona oni kao koji koje smo za ali nije nas na od da se je su".split(
    " ",
  ),
);
export function tokens(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replace(/[а-яђјљњћџđ]/g, (c) => mappings[c] ?? c)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9]+/g)
      ?.filter((t) => t.length > 2 && !stop.has(t)) ?? []
  );
}
export function fieldText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((x) => typeof x === "string"))
    return value.join("; ");
  if (typeof value === "number") return String(value);
  return "";
}
export class Dataset {
  sources = new Map<string, Source>();
  challenges = new Map<string, { companyId: string; source: Source }>();
  researchers = new Map<string, Source>();
  manifest: unknown = { fixture: true };
  add(source: Source): void {
    if (this.sources.has(source.id))
      throw new Error(`Duplicate record ID ${source.id}`);
    this.sources.set(source.id, source);
    if (source.kind === "researcher") this.researchers.set(source.id, source);
  }
  cite(recordId: string, field: string, max = 500): Citation {
    const full = fieldText(this.sources.get(recordId)?.record[field]);
    // Preserve an exact, contiguous excerpt; never paraphrase a source fact.
    const clipped =
      full.length > max ? full.slice(0, max).replace(/\s+\S*$/, "") : full;
    return { recordId, field, quote: clipped };
  }
  verify(c: Citation): string[] {
    const source = this.sources.get(c.recordId);
    if (!source) return [`Unknown record ${c.recordId}`];
    const text = fieldText(source.record[c.field]);
    return !c.quote.trim() || !text.includes(c.quote)
      ? [`Unsupported quote ${c.recordId}.${c.field}`]
      : [];
  }
  url(id: string): string {
    const s = this.sources.get(id);
    return s
      ? `https://github.com/jigjoy-ai/einstein-matchmaker-data/blob/${SNAPSHOT}/data/${s.file}${s.locator.startsWith("L") ? "#" + s.locator : ""}`
      : "";
  }
}
export function loadDataset(directory: string): Dataset {
  const db = new Dataset();
  const manifest = JSON.parse(
    readFileSync(join(directory, "manifest.json"), "utf8"),
  );
  if (manifest.commit !== SNAPSHOT)
    throw new Error("Unexpected data snapshot; run npm run data:download");
  db.manifest = manifest;
  for (const [file, key, kind, edge] of [
    ["researchers.json", "researchers", "researcher", ""],
    ["companies.json", "companies", "company", ""],
    ["publications.jsonl", "", "publication", "authors"],
    ["projects.json", "projects", "project", "participants"],
    ["patents.json", "patents", "patent", "inventors"],
  ]) {
    const bytes = readFileSync(join(directory, file));
    if (
      createHash("sha256").update(bytes).digest("hex") !==
      manifest.files[file]?.sha256
    )
      throw new Error(`Data checksum mismatch: ${file}`);
    const rows: RecordData[] = key
      ? JSON.parse(bytes.toString())[key]
      : bytes
          .toString()
          .trim()
          .split("\n")
          .map((s) => JSON.parse(s));
    rows.forEach((record, i) => {
      const researcherIds = edge
        ? ((record[edge] as { researcher_id: string | null }[]) ?? []).flatMap(
            (e) => (e.researcher_id ? [e.researcher_id] : []),
          )
        : kind === "researcher"
          ? [record.id]
          : [];
      const source = {
        id: record.id,
        kind,
        file,
        locator: key ? `${key}[${i}]` : `L${i + 1}`,
        record,
        researcherIds,
      };
      db.add(source);
      if (kind === "company")
        ((record.challenges as RecordData[]) ?? []).forEach((challenge, j) => {
          const cs = {
            ...source,
            id: challenge.id,
            kind: "challenge",
            locator: `${source.locator}.challenges[${j}]`,
            record: challenge,
          };
          db.add(cs);
          db.challenges.set(challenge.id, { companyId: record.id, source: cs });
        });
    });
  }
  return db;
}

/** BM25 ranks source documents for this query, never people or their worth. */
export class LexicalIndex {
  private docs: { source: Source; length: number }[] = [];
  private postings = new Map<string, Map<number, number>>();
  private average = 1;
  constructor(private db: Dataset) {
    for (const source of db.sources.values()) {
      if (
        !["researcher", "publication", "project", "patent"].includes(
          source.kind,
        )
      )
        continue;
      const fields =
        source.kind === "researcher"
          ? ["fields", "keywords", "bio"]
          : ["title", "keywords", "abstract", "summary"];
      const words = tokens(
        fields.map((f) => fieldText(source.record[f])).join(" "),
      );
      const i = this.docs.length;
      this.docs.push({ source, length: words.length });
      for (const word of words) {
        if (!this.postings.has(word)) this.postings.set(word, new Map());
        const p = this.postings.get(word)!;
        p.set(i, (p.get(i) ?? 0) + 1);
      }
    }
    this.average =
      this.docs.reduce((n, d) => n + d.length, 0) / (this.docs.length || 1) ||
      1;
  }
  search(query: string, limit = 8): Candidate[] {
    const scores = new Map<number, number>();
    const hits = new Map<number, string[]>();
    for (const term of new Set(tokens(query))) {
      const posting = this.postings.get(term);
      if (!posting) continue;
      const idf = Math.log(
        1 + (this.docs.length - posting.size + 0.5) / (posting.size + 0.5),
      );
      for (const [i, tf] of posting) {
        const score =
          (idf * tf * 2.5) /
          (tf + 1.5 * (0.25 + (0.75 * this.docs[i].length) / this.average));
        scores.set(i, (scores.get(i) ?? 0) + score);
        hits.set(i, [...(hits.get(i) ?? []), term]);
      }
    }
    const candidates: Candidate[] = [];
    const seen = new Set<string>();
    for (const [i] of [...scores].sort(
      (a, b) =>
        b[1] - a[1] ||
        this.docs[a[0]].source.id.localeCompare(this.docs[b[0]].source.id),
    )) {
      const source = this.docs[i].source;
      // Work-side author/participant/inventor IDs only; never join on names.
      if (source.kind === "researcher") continue;
      for (const researcherId of source.researcherIds) {
        if (!this.db.researchers.has(researcherId) || seen.has(researcherId))
          continue;
        seen.add(researcherId);
        candidates.push({
          researcherId,
          evidenceId: source.id,
          matchedTerms: hits.get(i) ?? [],
        });
        if (candidates.length === limit) return candidates;
      }
    }
    return candidates;
  }
}
