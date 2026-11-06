import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { patch, post, useApi } from "../api";
import { useAuth } from "../auth";
import { ADOPTION_STATUS, DOG_STATUS, PERSON_ROLE, fmtDate, fullName, todayIso } from "../labels";
import { Badge, Card, Empty, ErrorBox, Form, KV, Loading, Modal, PageHead, type FieldDef } from "../ui";

const PERSON_FIELDS: FieldDef[] = [
  { name: "first_name", label: "Jméno", required: true },
  { name: "last_name", label: "Příjmení" },
  { name: "phone", label: "Telefon", type: "tel" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "address", label: "Adresa", wide: true },
  { name: "roles", label: "Role", type: "multi", options: PERSON_ROLE },
  { name: "foster_capacity", label: "Kapacita DP (počet psů)", type: "number" },
  { name: "foster_availability", label: "Dostupnost DP" },
  { name: "foster_limits", label: "Omezení DP (děti, kočky, byt…)", wide: true },
  { name: "gdpr_consent_at", label: "Souhlas se zpracováním údajů (datum)", type: "date" },
  { name: "notes", label: "Interní poznámky", type: "textarea" },
];

export function PeopleList() {
  const { can } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const role = params.get("role") ?? "";
  const [q, setQ] = useState("");
  const { data, error, loading } = useApi<any[]>(`/api/people?${role ? "role=" + role + "&" : ""}${q.length >= 2 ? "q=" + encodeURIComponent(q) : ""}`);
  const [adding, setAdding] = useState(params.get("nova") === "1");

  return (
    <>
      <PageHead title="Osoby" actions={can("people", "write") && <button className="btn primary" onClick={() => setAdding(true)}>+ Osoba</button>} />
      <div className="filters">
        <button className={!role ? "chip on" : "chip"} onClick={() => setParams({})}>
          Všechny
        </button>
        {Object.entries(PERSON_ROLE).map(([k, l]) => (
          <button key={k} className={role === k ? "chip on" : "chip"} onClick={() => setParams({ role: k })}>
            {l}
          </button>
        ))}
        <input type="search" className="filter-search" placeholder="Jméno, telefon, e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ErrorBox error={error} />
      {loading && !data ? (
        <Loading />
      ) : data?.length === 0 ? (
        <Empty>Nikdo neodpovídá filtru.</Empty>
      ) : (
        <Card>
          <ul className="list">
            {data?.map((p) => (
              <li key={p.id} className="row">
                <div className="grow">
                  <Link to={`/osoby/${p.id}`}>
                    <strong>{fullName(p)}</strong>
                  </Link>
                  <div className="muted small">{[p.phone, p.email].filter(Boolean).join(" · ") || "bez kontaktu"}</div>
                </div>
                <div className="badges">
                  {p.roles.map((r: string) => (
                    <Badge key={r}>{PERSON_ROLE[r]}</Badge>
                  ))}
                  {p.active_placements > 0 && <Badge tone="blue">{p.active_placements} v DP</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {adding && (
        <Modal title="Nová osoba" onClose={() => setAdding(false)}>
          <Form
            fields={PERSON_FIELDS}
            initial={{ roles: role ? [role] : [] }}
            onCancel={() => setAdding(false)}
            onSubmit={async (v) => {
              const p = await post("/api/people", { ...v, foster_capacity: v.foster_capacity ? Number(v.foster_capacity) : null });
              nav(`/osoby/${p.id}`);
            }}
          />
        </Modal>
      )}
    </>
  );
}

export function PersonDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data: p, error, reload } = useApi<any>(`/api/people/${id}`);
  const [modal, setModal] = useState<null | "edit" | "comm">(null);
  if (error) return <ErrorBox error={error} />;
  if (!p) return <Loading />;
  const write = can("people", "write");

  return (
    <>
      <PageHead
        title={fullName(p)}
        sub={
          <span className="badges">
            {p.roles.map((r: string) => (
              <Badge key={r}>{PERSON_ROLE[r]}</Badge>
            ))}
          </span>
        }
        actions={write && <button className="btn" onClick={() => setModal("edit")}>Upravit</button>}
      />
      <div className="grid-2">
        <Card title="Kontakt">
          <KV
            items={[
              ["Telefon", p.phone && <a href={`tel:${p.phone}`}>{p.phone}</a>],
              ["E-mail", p.email && <a href={`mailto:${p.email}`}>{p.email}</a>],
              ["Adresa", p.address],
              ["Souhlas GDPR", p.gdpr_consent_at ? fmtDate(p.gdpr_consent_at) : "nezaznamenán"],
              ...(p.roles.includes("foster")
                ? ([
                    ["Kapacita DP", p.foster_capacity],
                    ["Dostupnost", p.foster_availability],
                    ["Omezení", p.foster_limits],
                  ] as [string, any][])
                : []),
              ["Interní poznámky", p.notes],
            ]}
          />
        </Card>
        <Card title="Vazby na psy">
          {p.placements.length + p.adoptions.length + p.dogs.length === 0 && <Empty>Žádné vazby.</Empty>}
          {p.placements.length > 0 && (
            <>
              <h3>Dočasná péče</h3>
              <ul className="list compact">
                {p.placements.map((pl: any) => (
                  <li key={pl.id} className="row">
                    <Link className="grow" to={`/psi/${pl.dog_id}?tab=foster`}>
                      {pl.dog_name} ({pl.reg_number})
                    </Link>
                    <span className="muted small">
                      {fmtDate(pl.start_date)} – {pl.end_date ? fmtDate(pl.end_date) : <Badge tone="blue">aktuálně</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {p.adoptions.length > 0 && (
            <>
              <h3>Adopce</h3>
              <ul className="list compact">
                {p.adoptions.map((a: any) => (
                  <li key={a.id} className="row">
                    <Link className="grow" to={`/adopce?id=${a.id}`}>
                      {a.dog_name}
                    </Link>
                    <Badge>{ADOPTION_STATUS[a.status]}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
          {p.dogs.length > 0 && (
            <>
              <h3>Odpovědná osoba / majitel</h3>
              <ul className="list compact">
                {p.dogs.map((d: any) => (
                  <li key={d.id} className="row">
                    <Link className="grow" to={`/psi/${d.id}`}>
                      {d.name}
                    </Link>
                    <Badge>{DOG_STATUS[d.status]}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <Card title="Komunikace a události" className="span-2" actions={write && <button className="btn small primary" onClick={() => setModal("comm")}>+ Záznam</button>}>
          {p.communications.length === 0 ? (
            <Empty>Zatím bez záznamů.</Empty>
          ) : (
            <ul className="list">
              {p.communications.map((c: any) => (
                <li key={c.id} className="row">
                  <div className="grow">
                    {c.summary}
                    <div className="muted small">
                      {fmtDate(c.date)} · {c.channel ?? "—"} · {c.author}
                      {c.dog_name && ` · ${c.dog_name}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {modal === "edit" && (
        <Modal title="Upravit osobu" onClose={() => setModal(null)}>
          <Form
            fields={PERSON_FIELDS}
            initial={p}
            onCancel={() => setModal(null)}
            onSubmit={async (v) => {
              await patch(`/api/people/${p.id}`, { ...v, foster_capacity: v.foster_capacity ? Number(v.foster_capacity) : null });
              setModal(null);
              reload();
            }}
          />
        </Modal>
      )}
      {modal === "comm" && <CommunicationModal personId={p.id} onClose={() => (setModal(null), reload())} />}
    </>
  );
}

export function CommunicationModal({ personId, adoptionId, dogId, onClose }: { personId: number; adoptionId?: number; dogId?: number; onClose: () => void }) {
  return (
    <Modal title="Záznam komunikace" onClose={onClose}>
      <Form
        fields={[
          { name: "date", label: "Datum", type: "date", required: true },
          { name: "channel", label: "Kanál", type: "select", options: { telefon: "Telefon", "e-mail": "E-mail", osobně: "Osobně", zpráva: "SMS / zpráva", "sociální sítě": "Sociální sítě" } },
          { name: "summary", label: "Shrnutí", type: "textarea", required: true },
        ]}
        initial={{ date: todayIso(), channel: "telefon" }}
        onCancel={onClose}
        onSubmit={async (v) => {
          await post(`/api/people/${personId}/communications`, { ...v, adoption_id: adoptionId, dog_id: dogId });
          onClose();
        }}
      />
    </Modal>
  );
}
