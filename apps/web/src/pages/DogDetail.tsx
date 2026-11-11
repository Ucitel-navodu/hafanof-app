import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { del, patch, post, useApi } from "../api";
import { useAuth } from "../auth";
import {
  ADOPTION_STATUS,
  DOC_CATEGORY,
  DOC_STATUS,
  DOG_STATUS,
  DOG_STATUS_TONE,
  HEALTH_KIND,
  PRIORITY,
  SEX,
  TASK_STATUS,
  age,
  fmtDate,
  fmtDateTime,
  todayIso,
} from "../labels";
import { Badge, Card, Empty, ErrorBox, Form, KV, Loading, Modal, PageHead, Tabs, toFormData, type FieldDef, Paw } from "../ui";
import { DOG_BASIC_FIELDS, DOG_INTAKE_FIELDS } from "./Dogs";

const TEMPERAMENT_FIELDS: FieldDef[] = [
  { name: "temperament", label: "Povaha", type: "textarea" },
  { name: "rel_people", label: "Vztah k lidem" },
  { name: "rel_children", label: "Vztah k dětem" },
  { name: "rel_dogs", label: "Vztah ke psům" },
  { name: "rel_cats", label: "Vztah ke kočkám" },
  { name: "handling", label: "Manipulace" },
  { name: "alone", label: "Samota" },
  { name: "hygiene", label: "Hygiena / čistotnost" },
  { name: "travel", label: "Cestování" },
  { name: "special_needs", label: "Specifické potřeby", type: "textarea" },
  { name: "ideal_home", label: "Ideální domov", type: "textarea" },
];

export function DogDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const { data: dog, error, reload } = useApi<any>(`/api/dogs/${id}`);
  if (error) return <ErrorBox error={error} />;
  if (!dog) return <Loading />;

  const own = can("dogs", "own") && !can("dogs", "read");
  const tabs: [string, string][] = [["overview", "Přehled"]];
  if (can("dogs", "own")) tabs.push(["timeline", "Časová osa"]);
  if (can("health", "own")) tabs.push(["health", "Zdraví"]);
  if (can("documents", "own")) tabs.push(["docs", "Dokumenty"]);
  if (can("adoptions")) tabs.push(["adoption", "Adopce"]);
  if (can("foster")) tabs.push(["foster", "Dočasná péče"]);
  if (can("tasks", "read")) tabs.push(["tasks", "Úkoly"]);

  return (
    <>
      <div className="dog-head">
        {dog.photo_url ? <img src={dog.photo_url} alt={dog.name} className="dog-photo" /> : <div className="dog-photo ph"><Paw size={36} /></div>}
        <PageHead
          title={
            <>
              {dog.name} {dog.alias && <span className="muted small">({dog.alias})</span>}
            </>
          }
          sub={
            <>
              <strong>{dog.reg_number}</strong> · <Badge tone={DOG_STATUS_TONE[dog.status]}>{DOG_STATUS[dog.status]}</Badge>
              {dog.days_in_care !== undefined && (
                <>
                  {" "}
                  · {dog.days_in_care} dní v péči{dog.end_date ? ` (ukončeno ${fmtDate(dog.end_date)})` : ""}
                </>
              )}
              {dog.death_date && <> · zemřel {fmtDate(dog.death_date)}</>}
            </>
          }
        />
      </div>
      <Tabs tabs={tabs} active={tab} onChange={(k) => setParams({ tab: k }, { replace: true })} />
      {tab === "overview" && <Overview dog={dog} reload={reload} own={own} />}
      {tab === "timeline" && <Timeline dogId={dog.id} />}
      {tab === "health" && <Health dogId={dog.id} />}
      {tab === "docs" && <Documents dog={dog} reload={reload} />}
      {tab === "adoption" && <DogAdoptions dog={dog} />}
      {tab === "foster" && <Foster dog={dog} reload={reload} />}
      {tab === "tasks" && <DogTasks dog={dog} />}
    </>
  );
}

function Overview({ dog, reload, own }: { dog: any; reload: () => void; own: boolean }) {
  const { can } = useAuth();
  const [edit, setEdit] = useState<null | "basic" | "temperament" | "status">(null);
  const write = can("dogs", "write");
  const save = async (v: any) => {
    await patch(`/api/dogs/${dog.id}`, v);
    setEdit(null);
    reload();
  };

  return (
    <div className="grid-2">
      <Card title="Základní údaje" actions={write && <button className="btn small" onClick={() => setEdit("basic")}>Upravit</button>}>
        <KV
          items={[
            ["Evidenční číslo", dog.reg_number],
            ["Pohlaví", SEX[dog.sex]],
            ["Plemeno", dog.breed],
            ["Barva / popis", dog.color],
            ["Věk", `${age(dog.birth_date, dog.birth_estimated)}${dog.birth_date ? ` (${fmtDate(dog.birth_date)})` : ""}`],
            ...(dog.chip !== undefined
              ? ([
                  ["Čip", dog.chip],
                  ["Pas", dog.passport],
                  ["Jiná identifikace", dog.other_id],
                  ["Kastrace", dog.castrated ? `Ano${dog.castration_date ? `, ${fmtDate(dog.castration_date)}` : ""}` : "Ne"],
                ] as [string, any][])
              : []),
          ]}
        />
      </Card>
      <Card title="Přijetí a umístění" actions={write && <button className="btn small" onClick={() => setEdit("status")}>Změnit stav</button>}>
        <KV
          items={[
            ["Stav", DOG_STATUS[dog.status]],
            ["Umístění", dog.location],
            ...(dog.intake_date
              ? ([
                  ["Přijat", fmtDate(dog.intake_date)],
                  ["Způsob přijetí", dog.intake_type],
                ] as [string, any][])
              : []),
            ...(!own && dog.intake_origin !== undefined ? ([["Původ", dog.intake_origin]] as [string, any][]) : []),
            ...(dog.responsible_name ? ([["Odpovědná osoba", <Link to={`/osoby/${dog.responsible_person_id}`}>{dog.responsible_name}</Link>]] as [string, any][]) : []),
            ...(dog.owner_name ? ([["Nový majitel", <Link to={`/osoby/${dog.owner_person_id}`}>{dog.owner_name}</Link>]] as [string, any][]) : []),
            ...(dog.end_date ? ([["Ukončení evidence", `${fmtDate(dog.end_date)}${dog.end_reason ? " – " + dog.end_reason : ""}`]] as [string, any][]) : []),
          ]}
        />
      </Card>
      <Card title="Povaha a ideální domov" className="span-2" actions={write && <button className="btn small" onClick={() => setEdit("temperament")}>Upravit</button>}>
        {TEMPERAMENT_FIELDS.some((f) => dog[f.name]) ? (
          <KV items={TEMPERAMENT_FIELDS.filter((f) => dog[f.name]).map((f) => [f.label, dog[f.name]])} />
        ) : (
          <Empty>Zatím nevyplněno.</Empty>
        )}
      </Card>

      {edit === "basic" && (
        <Modal title="Upravit údaje psa" onClose={() => setEdit(null)}>
          <Form
            fields={[
              ...DOG_BASIC_FIELDS,
              { name: "castrated", label: "Kastrace", type: "checkbox", placeholder: "Kastrován(a)" },
              { name: "castration_date", label: "Datum kastrace", type: "date" },
              ...DOG_INTAKE_FIELDS.filter((f) => f.name !== "intake_health"),
            ]}
            initial={dog}
            onCancel={() => setEdit(null)}
            onSubmit={(v) => {
              // Stav se mění přes „Změnit stav“ (kvůli vedlejším účinkům); ostatní pole server sám vyfiltruje.
              const { status, ...rest } = v;
              void status;
              return save(rest);
            }}
          />
        </Modal>
      )}
      {edit === "temperament" && (
        <Modal title="Povaha a ideální domov" onClose={() => setEdit(null)}>
          <Form fields={TEMPERAMENT_FIELDS} initial={dog} onCancel={() => setEdit(null)} onSubmit={(v) => save(Object.fromEntries(TEMPERAMENT_FIELDS.map((f) => [f.name, v[f.name] ?? null])))} />
        </Modal>
      )}
      {edit === "status" && (
        <Modal title="Změna stavu psa" onClose={() => setEdit(null)}>
          <p className="muted small">
            Adopci dokončete v modulu Adopce, předání do dočasky na záložce Dočasná péče — systém pak sám doplní související údaje. Konečný stav (adoptovaný, zemřelý, jiné
            ukončení) uzavře evidenci a zastaví počítání dnů v péči.
          </p>
          <Form
            fields={[
              { name: "status", label: "Nový stav", type: "select", options: DOG_STATUS, required: true },
              { name: "location", label: "Umístění" },
              { name: "end_date", label: "Datum ukončení (u konečného stavu)", type: "date" },
              { name: "end_reason", label: "Důvod ukončení", type: "textarea" },
              { name: "death_date", label: "Datum úmrtí (i u adoptovaného psa)", type: "date" },
            ]}
            initial={{ status: dog.status, location: dog.location, death_date: dog.death_date }}
            onCancel={() => setEdit(null)}
            onSubmit={(v) => save(Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null && x !== undefined && x !== "")))}
          />
        </Modal>
      )}
    </div>
  );
}

const EVENT_ICON: Record<string, string> = {
  intake: "⇲",
  health: "✚",
  status: "◆",
  foster: "⌂",
  adoption: "♥",
  document: "▤",
  move: "→",
  note: "✎",
  problem: "!",
  death: "✝",
};

function Timeline({ dogId }: { dogId: number }) {
  const { can } = useAuth();
  const { data, reload } = useApi<any[]>(`/api/dogs/${dogId}/timeline`);
  const [adding, setAdding] = useState(false);
  const refLink = (e: any) => {
    if (e.ref_type === "adoption") return `/adopce?id=${e.ref_id}`;
    if (e.ref_type === "document") return `/api/documents/${e.ref_id}/file`;
    if (e.ref_type === "health_record" || e.ref_type === "medication") return `?tab=health`;
    if (e.ref_type === "placement") return `?tab=foster`;
    return null;
  };
  return (
    <Card
      title="Časová osa"
      actions={
        can("dogs", "own") && (
          <button className="btn small" onClick={() => setAdding(true)}>
            + Poznámka / problém
          </button>
        )
      }
    >
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty>Zatím žádné události.</Empty>
      ) : (
        <ol className="timeline">
          {data.map((e) => {
            const link = refLink(e);
            return (
              <li key={e.id} className={`tl tl-${e.type}`}>
                <span className="tl-icon" aria-hidden>
                  {EVENT_ICON[e.type] ?? "•"}
                </span>
                <div>
                  <div className="muted small">
                    {fmtDate(e.date)}
                    {e.author ? ` · ${e.author}` : ""}
                  </div>
                  <div>
                    {link ? (
                      link.startsWith("/api/") ? (
                        <a href={link} target="_blank" rel="noreferrer">
                          {e.title}
                        </a>
                      ) : (
                        <Link to={link}>{e.title}</Link>
                      )
                    ) : (
                      e.title
                    )}
                  </div>
                  {e.note && <div className="small">{e.note}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {adding && (
        <Modal title="Přidat událost" onClose={() => setAdding(false)}>
          <Form
            fields={[
              { name: "type", label: "Typ", type: "select", options: { note: "Poznámka / požadavek", problem: "Nahlásit problém" }, required: true },
              { name: "date", label: "Datum", type: "date", required: true },
              { name: "title", label: "Co se stalo", required: true },
              { name: "note", label: "Podrobnosti", type: "textarea" },
            ]}
            initial={{ type: "note", date: todayIso() }}
            onCancel={() => setAdding(false)}
            onSubmit={async (v) => {
              await post(`/api/dogs/${dogId}/events`, v);
              setAdding(false);
              reload();
            }}
          />
        </Modal>
      )}
    </Card>
  );
}

function WeightChart({ weights }: { weights: any[] }) {
  if (weights.length < 2) return null;
  const w = 320,
    hgt = 80,
    pad = 6;
  const kgs = weights.map((x) => x.kg);
  const min = Math.min(...kgs),
    max = Math.max(...kgs);
  const span = max - min || 1;
  const pts = weights.map((x, i) => [pad + (i * (w - 2 * pad)) / (weights.length - 1), hgt - pad - ((x.kg - min) / span) * (hgt - 2 * pad)]);
  return (
    <svg viewBox={`0 0 ${w} ${hgt}`} className="spark" role="img" aria-label={`Vývoj hmotnosti od ${min} do ${max} kg`}>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" />
      ))}
    </svg>
  );
}

function Health({ dogId }: { dogId: number }) {
  const { can } = useAuth();
  const { data, reload, error } = useApi<any>(`/api/dogs/${dogId}/health`);
  const [modal, setModal] = useState<null | "record" | "med" | "weight">(null);
  const write = can("health", "write");
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const today = todayIso();
  const close = () => {
    setModal(null);
    reload();
  };

  return (
    <div className="grid-2">
      <Card title="Zdravotní záznamy" className="span-2" actions={write && <button className="btn small primary" onClick={() => setModal("record")}>+ Záznam</button>}>
        {data.records.length === 0 ? (
          <Empty>Bez záznamů.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Typ</th>
                  <th>Co</th>
                  <th>Pracoviště / veterinář</th>
                  <th>Závěr</th>
                  <th>Další termín</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((r: any) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.date)}</td>
                    <td>{HEALTH_KIND[r.kind]}</td>
                    <td>
                      {r.name ?? r.reason ?? "—"}
                      {r.document_id && (
                        <>
                          {" "}
                          <a href={`/api/documents/${r.document_id}/file`} target="_blank" rel="noreferrer" title="Příloha">
                            📎
                          </a>
                        </>
                      )}
                    </td>
                    <td>{[r.clinic, r.vet].filter(Boolean).join(", ") || "—"}</td>
                    <td>{r.conclusion ?? "—"}</td>
                    <td>
                      {r.next_due && <span className={r.next_due < today ? "overdue" : ""}>kontrola {fmtDate(r.next_due)}</span>}
                      {r.valid_until && <span className={r.valid_until < today ? "overdue" : ""}> platí do {fmtDate(r.valid_until)}</span>}
                      {!r.next_due && !r.valid_until && "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="Léky" actions={write && <button className="btn small" onClick={() => setModal("med")}>+ Lék</button>}>
        {data.medications.length === 0 ? (
          <Empty>Žádné léky.</Empty>
        ) : (
          <ul className="list">
            {data.medications.map((m: any) => {
              const active = m.start_date <= today && (!m.end_date || m.end_date >= today);
              return (
                <li key={m.id} className="row">
                  <div className="grow">
                    <strong>{m.name}</strong> {m.dose} {m.frequency && `· ${m.frequency}`}
                    <div className="muted small">
                      {fmtDate(m.start_date)} – {m.end_date ? fmtDate(m.end_date) : "trvale"}
                      {m.note && ` · ${m.note}`}
                    </div>
                  </div>
                  {active && <Badge tone="green">podává se</Badge>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card title="Hmotnost" actions={can("health", "own") && <button className="btn small" onClick={() => setModal("weight")}>+ Vážení</button>}>
        <WeightChart weights={data.weights} />
        {data.weights.length === 0 ? (
          <Empty>Zatím nevážen.</Empty>
        ) : (
          <ul className="list compact">
            {[...data.weights].reverse().map((w: any) => (
              <li key={w.id} className="row">
                <span className="grow">{fmtDate(w.date)}</span>
                <strong>{w.kg} kg</strong>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {modal === "record" && <HealthRecordModal dogId={dogId} onClose={close} />}
      {modal === "med" && (
        <Modal title="Nový lék" onClose={() => setModal(null)}>
          <Form
            fields={[
              { name: "name", label: "Název", required: true },
              { name: "dose", label: "Dávka" },
              { name: "frequency", label: "Frekvence", placeholder: "např. 2× denně" },
              { name: "start_date", label: "Od", type: "date", required: true },
              { name: "end_date", label: "Do", type: "date" },
              { name: "note", label: "Poznámka", type: "textarea" },
            ]}
            initial={{ start_date: todayIso() }}
            onCancel={() => setModal(null)}
            onSubmit={async (v) => {
              await post(`/api/dogs/${dogId}/medications`, v);
              close();
            }}
          />
        </Modal>
      )}
      {modal === "weight" && (
        <Modal title="Zapsat hmotnost" onClose={() => setModal(null)}>
          <Form
            fields={[
              { name: "date", label: "Datum", type: "date", required: true },
              { name: "kg", label: "Hmotnost (kg)", type: "number", required: true },
            ]}
            initial={{ date: todayIso() }}
            onCancel={() => setModal(null)}
            onSubmit={async (v) => {
              await post(`/api/dogs/${dogId}/weights`, { ...v, kg: Number(v.kg) });
              close();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function HealthRecordModal({ dogId, onClose }: { dogId: number; onClose: () => void }) {
  return (
    <Modal title="Nový zdravotní záznam" onClose={onClose}>
      <Form
        fields={[
          { name: "kind", label: "Typ", type: "select", options: HEALTH_KIND, required: true },
          { name: "date", label: "Datum", type: "date", required: true },
          { name: "name", label: "Název (vakcína, diagnóza, zákrok…)" },
          { name: "clinic", label: "Pracoviště" },
          { name: "vet", label: "Veterinář" },
          { name: "reason", label: "Důvod" },
          { name: "conclusion", label: "Závěr", type: "textarea" },
          { name: "next_due", label: "Další kontrola / dávka", type: "date", hint: "Objeví se v kalendáři a na nástěnce." },
          { name: "valid_until", label: "Platnost do (očkování)", type: "date" },
          { name: "file", label: "Zpráva / výsledek (PDF, obrázek)", type: "file", accept: ".pdf,.doc,.docx,image/*" },
        ]}
        initial={{ kind: "vet_visit", date: todayIso() }}
        onCancel={onClose}
        onSubmit={async ({ file, ...v }) => {
          if (file) {
            const doc = await post("/api/documents", toFormData({ dog_id: dogId, category: v.kind === "lab" ? "veterinary" : "veterinary", title: `${HEALTH_KIND[v.kind]} ${v.date}${v.name ? " – " + v.name : ""}`, file }));
            v.document_id = doc.id;
          }
          await post(`/api/dogs/${dogId}/health`, v);
          onClose();
        }}
      />
    </Modal>
  );
}

function Documents({ dog, reload: reloadDog }: { dog: any; reload: () => void }) {
  const { can } = useAuth();
  const { data, reload } = useApi<any[]>(`/api/documents?dog_id=${dog.id}`);
  const [upload, setUpload] = useState(false);
  const write = can("documents", "write");
  const own = !can("documents", "read");
  const groups = Object.keys(DOC_CATEGORY).map((c) => [c, data?.filter((d) => d.category === c) ?? []] as const);

  return (
    <Card
      title="Dokumentace psa"
      actions={
        can("documents", "own") && (
          <button className="btn small primary" onClick={() => setUpload(true)}>
            {own ? "+ Fotka" : "+ Nahrát dokument"}
          </button>
        )
      }
    >
      {!data ? (
        <Loading />
      ) : (
        groups
          .filter(([c, docs]) => docs.length > 0 || (!own && ["record_card", "health_summary", "intake", "veterinary", "adoption", "death_end"].includes(c)))
          .map(([c, docs]) => (
            <div key={c} className="doc-group">
              <h3>
                {DOC_CATEGORY[c]} <span className="muted small">({docs.length})</span>
              </h3>
              {docs.length === 0 ? (
                <p className="muted small">Chybí</p>
              ) : c === "photo" ? (
                <div className="gallery">
                  {docs.map((d) => (
                    <figure key={d.id}>
                      <a href={d.url} target="_blank" rel="noreferrer">
                        <img src={d.url} alt={d.title} loading="lazy" />
                      </a>
                      {write && dog.photo_document_id !== d.id && (
                        <button
                          className="btn small ghost"
                          onClick={async () => {
                            await patch(`/api/dogs/${dog.id}`, { photo_document_id: d.id });
                            reloadDog();
                          }}
                        >
                          Profilová
                        </button>
                      )}
                    </figure>
                  ))}
                </div>
              ) : (
                <ul className="list">
                  {docs.map((d) => (
                    <li key={d.id} className="row">
                      <div className="grow">
                        {d.url ? (
                          <a href={d.url} target="_blank" rel="noreferrer">
                            {d.title}
                          </a>
                        ) : (
                          d.title
                        )}
                        <div className="muted small">
                          {fmtDateTime(d.created_at)} · {d.uploaded_by_name}
                        </div>
                      </div>
                      {write ? (
                        <select
                          aria-label="Stav dokumentu"
                          value={d.status}
                          onChange={async (e) => {
                            await patch(`/api/documents/${d.id}`, { status: e.target.value });
                            reload();
                          }}
                        >
                          {Object.entries(DOC_STATUS).map(([k, l]) => (
                            <option key={k} value={k}>
                              {l}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge>{DOC_STATUS[d.status]}</Badge>
                      )}
                      {write && (
                        <button
                          className="icon-btn"
                          title="Smazat"
                          aria-label="Smazat dokument"
                          onClick={async () => {
                            if (confirm(`Smazat dokument „${d.title}“? Smazání se zapíše do historie.`)) {
                              await del(`/api/documents/${d.id}`);
                              reload();
                            }
                          }}
                        >
                          🗑
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
      )}
      {upload && (
        <Modal title={own ? "Nahrát fotku" : "Nahrát dokument"} onClose={() => setUpload(false)}>
          <Form
            fields={
              own
                ? [{ name: "file", label: "Fotka", type: "file", accept: "image/*", required: true }]
                : [
                    { name: "category", label: "Kategorie", type: "select", options: DOC_CATEGORY, required: true },
                    { name: "title", label: "Název" },
                    { name: "status", label: "Stav", type: "select", options: DOC_STATUS },
                    { name: "file", label: "Soubor (PDF, DOCX, obrázek) — bez souboru se založí jako „chybí“", type: "file", accept: ".pdf,.doc,.docx,image/*" },
                  ]
            }
            initial={{ category: own ? "photo" : "other" }}
            onCancel={() => setUpload(false)}
            onSubmit={async (v) => {
              await post("/api/documents", toFormData({ ...v, category: own ? "photo" : v.category, dog_id: dog.id }));
              setUpload(false);
              reload();
              reloadDog();
            }}
          />
        </Modal>
      )}
    </Card>
  );
}

function DogAdoptions({ dog }: { dog: any }) {
  const { can } = useAuth();
  const { data, reload } = useApi<any[]>(`/api/adoptions?dog_id=${dog.id}`);
  const [adding, setAdding] = useState(false);
  const closed = ["adopted", "deceased", "ended_other"].includes(dog.status);
  return (
    <Card
      title="Zájemci o adopci"
      actions={
        can("adoptions", "write") &&
        !closed && (
          <button className="btn small primary" onClick={() => setAdding(true)}>
            + Zájemce
          </button>
        )
      }
    >
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty>Zatím žádní zájemci.</Empty>
      ) : (
        <ul className="list">
          {data.map((a) => (
            <li key={a.id} className="row">
              <div className="grow">
                <Link to={`/adopce?id=${a.id}`}>{a.person_name}</Link>
                <div className="muted small">
                  podáno {fmtDate(a.applied_at)}
                  {a.visit_at && ` · návštěva ${fmtDate(a.visit_at)}`}
                </div>
              </div>
              <Badge tone={a.status === "rejected" || a.status === "withdrawn" ? "muted" : a.status === "adopted" ? "green" : "gold"}>{ADOPTION_STATUS[a.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
      {adding && <NewApplicationModal dogId={dog.id} onClose={() => (setAdding(false), reload())} />}
    </Card>
  );
}

export function NewApplicationModal({ dogId, onClose }: { dogId?: number; onClose: () => void }) {
  const [newPerson, setNewPerson] = useState(false);
  const { data: dogs } = useApi<any[]>(dogId ? null : "/api/dogs?status=in_care");
  return (
    <Modal title="Nová žádost o adopci" onClose={onClose}>
      <label className="check">
        <input type="checkbox" checked={newPerson} onChange={(e) => setNewPerson(e.target.checked)} /> Zájemce zatím není v evidenci osob
      </label>
      <Form
        key={String(newPerson)}
        fields={[
          ...(dogId ? [] : [{ name: "dog_id", label: "Pes", type: "select", required: true, options: Object.fromEntries((dogs ?? []).map((d) => [d.id, `${d.name} (${d.reg_number})`])) } as FieldDef]),
          ...(newPerson
            ? ([
                { name: "first_name", label: "Jméno", required: true },
                { name: "last_name", label: "Příjmení" },
                { name: "phone", label: "Telefon", type: "tel" },
                { name: "email", label: "E-mail", type: "email" },
              ] as FieldDef[])
            : ([{ name: "person_id", label: "Zájemce", type: "person", required: true }] as FieldDef[])),
          { name: "applied_at", label: "Datum žádosti", type: "date", required: true },
          { name: "questionnaire", label: "Dotazník / odpovědi", type: "textarea" },
          { name: "notes", label: "Poznámky", type: "textarea" },
        ]}
        initial={{ applied_at: todayIso() }}
        onCancel={onClose}
        onSubmit={async (v) => {
          let personId = v.person_id;
          if (newPerson) {
            const p = await post("/api/people", { first_name: v.first_name, last_name: v.last_name, phone: v.phone, email: v.email, roles: ["adopter"] });
            personId = p.id;
          }
          await post("/api/adoptions", { dog_id: dogId ?? Number(v.dog_id), person_id: personId, applied_at: v.applied_at, questionnaire: v.questionnaire, notes: v.notes });
          onClose();
        }}
      />
    </Modal>
  );
}

function Foster({ dog, reload: reloadDog }: { dog: any; reload: () => void }) {
  const { can } = useAuth();
  const { data, reload } = useApi<any[]>(`/api/placements?dog_id=${dog.id}`);
  const [modal, setModal] = useState<null | "start" | "end" | "item">(null);
  const write = can("foster", "write");
  const current = data?.find((p) => !p.end_date);
  const closed = ["adopted", "deceased", "ended_other"].includes(dog.status);
  const done = () => {
    setModal(null);
    reload();
    reloadDog();
  };

  return (
    <>
      <Card
        title={current ? `Aktuálně v DP: ${current.person_name}` : "Pes není v dočasné péči"}
        actions={
          write &&
          !closed && (
            <>
              <button className="btn small primary" onClick={() => setModal("start")}>
                {current ? "Přesunout do jiné DP" : "Předat do DP"}
              </button>
              {current && (
                <button className="btn small" onClick={() => setModal("end")}>
                  Vrátit z DP
                </button>
              )}
            </>
          )
        }
      >
        {current && (
          <>
            <KV
              items={[
                ["Dočaskář", <Link to={`/osoby/${current.person_id}`}>{current.person_name}</Link>],
                ["Od", fmtDate(current.start_date)],
                ["Poznámka", current.note],
              ]}
            />
            <h3>Vydané vybavení, krmivo a materiál</h3>
            <ItemList placement={current} write={write} reload={reload} />
            {write && (
              <button className="btn small" onClick={() => setModal("item")}>
                + Položka
              </button>
            )}
          </>
        )}
      </Card>
      <Card title="Historie dočasné péče">
        {!data ? (
          <Loading />
        ) : data.filter((p) => p.end_date).length === 0 ? (
          <Empty>Žádná ukončená DP.</Empty>
        ) : (
          <ul className="list">
            {data
              .filter((p) => p.end_date)
              .map((p) => (
                <li key={p.id} className="row">
                  <div className="grow">
                    <Link to={`/osoby/${p.person_id}`}>{p.person_name}</Link>
                    <div className="muted small">
                      {fmtDate(p.start_date)} – {fmtDate(p.end_date)} ({p.end_reason === "transfer" ? "přesun" : p.end_reason === "adoption" ? "adopce" : "návrat"})
                    </div>
                    <ItemList placement={p} write={write} reload={reload} />
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Card>
      {modal === "start" && <StartPlacementModal dogId={dog.id} onClose={() => setModal(null)} onDone={done} />}
      {modal === "end" && current && (
        <Modal title="Vrácení z dočasné péče" onClose={() => setModal(null)}>
          <Form
            fields={[
              { name: "end_date", label: "Datum vrácení", type: "date", required: true },
              { name: "location", label: "Nové umístění", required: true },
              { name: "note", label: "Poznámka", type: "textarea" },
            ]}
            initial={{ end_date: todayIso(), location: "Hafanof" }}
            onCancel={() => setModal(null)}
            onSubmit={async (v) => {
              await post(`/api/placements/${current.id}/end`, v);
              done();
            }}
          />
        </Modal>
      )}
      {modal === "item" && current && (
        <Modal title="Vydaná položka" onClose={() => setModal(null)}>
          <Form
            fields={[
              { name: "item", label: "Položka", required: true },
              { name: "quantity", label: "Množství" },
            ]}
            onCancel={() => setModal(null)}
            onSubmit={async (v) => {
              await post(`/api/placements/${current.id}/items`, v);
              done();
            }}
          />
        </Modal>
      )}
    </>
  );
}

function ItemList({ placement, write, reload }: { placement: any; write: boolean; reload: () => void }) {
  if (!placement.items?.length) return <p className="muted small">Bez vydaných položek.</p>;
  return (
    <ul className="list compact">
      {placement.items.map((it: any) => (
        <li key={it.id} className="row">
          <span className="grow">
            {it.item} {it.quantity && <span className="muted">× {it.quantity}</span>}
          </span>
          <label className="check small">
            <input
              type="checkbox"
              checked={!!it.returned}
              disabled={!write}
              onChange={async (e) => {
                await patch(`/api/placements/items/${it.id}`, { returned: e.target.checked });
                reload();
              }}
            />{" "}
            vráceno
          </label>
        </li>
      ))}
    </ul>
  );
}

function StartPlacementModal({ dogId, onClose, onDone }: { dogId: number; onClose: () => void; onDone: () => void }) {
  return (
    <Modal title="Předání do dočasné péče" onClose={onClose}>
      <Form
        personRole="foster"
        fields={[
          { name: "person_id", label: "Dočaskář", type: "person", required: true, hint: "Seznam ukazuje osoby s rolí dočaskář." },
          { name: "start_date", label: "Datum předání", type: "date", required: true },
          { name: "items", label: "Vydané vybavení, krmivo a materiál (každá položka na nový řádek)", type: "textarea", placeholder: "Postroj M\nGranule 3 kg\nPřepravka" },
          { name: "note", label: "Poznámka k předání", type: "textarea" },
          { name: "file", label: "Předávací protokol (volitelně)", type: "file", accept: ".pdf,.doc,.docx,image/*" },
        ]}
        initial={{ start_date: todayIso() }}
        onCancel={onClose}
        onSubmit={async ({ file, items, ...v }) => {
          const list = String(items ?? "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => ({ item: s }));
          await post("/api/placements", { ...v, dog_id: dogId, items: list });
          if (file) await post("/api/documents", toFormData({ dog_id: dogId, person_id: v.person_id, category: "foster_handover", title: `Předávací protokol ${v.start_date}`, file }));
          onDone();
        }}
      />
    </Modal>
  );
}

function DogTasks({ dog }: { dog: any }) {
  const { can } = useAuth();
  const { data, reload } = useApi<any[]>(`/api/tasks?dog_id=${dog.id}&open=0`);
  const [adding, setAdding] = useState(false);
  return (
    <Card title="Úkoly k psovi" actions={can("tasks", "write") && <button className="btn small primary" onClick={() => setAdding(true)}>+ Úkol</button>}>
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty>Žádné úkoly.</Empty>
      ) : (
        <ul className="list">
          {data.map((t) => (
            <li key={t.id} className="row">
              <div className="grow">
                <Link to={`/ukoly?id=${t.id}`}>{t.title}</Link>
                <div className="muted small">
                  {fmtDate(t.due_date)} · {t.assignee_name ?? "nepřiřazeno"} · {PRIORITY[t.priority]}
                </div>
              </div>
              <Badge tone={t.status === "done" ? "green" : t.overdue ? "red" : "taupe"}>{t.overdue ? "Po termínu" : TASK_STATUS[t.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <Modal title="Nový úkol" onClose={() => setAdding(false)}>
          <Form
            fields={TASK_FIELDS}
            initial={{ priority: "normal", due_date: todayIso() }}
            onCancel={() => setAdding(false)}
            onSubmit={async (v) => {
              await post("/api/tasks", { ...v, ref_type: "dog", ref_id: dog.id, recurrence_days: v.recurrence_days ? Number(v.recurrence_days) : null });
              setAdding(false);
              reload();
            }}
          />
        </Modal>
      )}
    </Card>
  );
}

export const TASK_FIELDS: FieldDef[] = [
  { name: "title", label: "Název", required: true },
  { name: "description", label: "Popis", type: "textarea" },
  { name: "assignee_user_id", label: "Odpovědná osoba", type: "user" },
  { name: "due_date", label: "Termín", type: "date" },
  { name: "priority", label: "Priorita", type: "select", options: PRIORITY, required: true },
  { name: "recurrence_days", label: "Opakovat každých N dní", type: "number", hint: "Po splnění se založí další výskyt." },
];
