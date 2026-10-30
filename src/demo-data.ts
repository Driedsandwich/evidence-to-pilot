import { Dataset, type RecordData } from "./data.js";

export const demoChallengeIds = ["C901-CH1", "C902-CH1", "C903-CH1", "C999-CH1"];

// Tiny authored examples, not excerpts or copies of the organizer dataset.
export function demoDataset(): Dataset {
  class DemoDataset extends Dataset {
    override url(id: string): string {
      return this.sources.has(id) ? "sources.json" : "";
    }
  }
  const db = new DemoDataset();
  db.manifest = { fixture: true, origin: "Authored offline demo; not organizer data", source: "sources.json" };
  function add(kind: string, record: RecordData, researcherIds: string[] = []): void {
    db.add({ id: record.id, kind, record, researcherIds,
      file: "sources.json", locator: `Authored demo record ${record.id}` });
  }
  const domains = [
    ["Modbus anomaly detection", "unsupervised ICS anomaly detection"],
    ["PCB emissions EMC", "Gerber PCB layout EMC emission analysis"],
    ["Raspberry packaging mold", "berry packaging film permeability"],
  ];
  domains.forEach(([challenge, evidence], i) => {
    const companyId = `C90${i + 1}`, id = `${companyId}-CH1`, researcherId = `R900${i + 1}`;
    add("company", { id: companyId, name: `Fictional demo company ${i + 1}`,
      rd_capacity: "A scoping meeting can consider a small pilot." });
    add("challenge", { id, text: challenge, detail: `Investigate ${challenge} with a controlled experiment.` });
    db.challenges.set(id, { companyId, source: db.sources.get(id)! });
    add("researcher", { id: researcherId, name: `Fictional demo researcher ${i + 1}`,
      fields: [evidence], bio: "", open_to: [], notes: "Availability and resources unconfirmed." }, [researcherId]);
    add("publication", { id: `DEMO-WORK-${i + 1}`, title: evidence,
      abstract: `This authored fictional record describes ${evidence}.`,
      authors: [{ researcher_id: researcherId }] }, [researcherId]);
  });
  add("company", { id: "C999", name: "Fictional demo employer", rd_capacity: "Unknown" });
  add("challenge", { id: "C999-CH1", text: "Hire a full-time accountant next week",
    detail: "A recruitment need, no experimental objective." });
  db.challenges.set("C999-CH1", { companyId: "C999", source: db.sources.get("C999-CH1")! });
  return db;
}
