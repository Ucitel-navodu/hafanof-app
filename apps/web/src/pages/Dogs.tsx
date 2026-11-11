import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { post, useApi } from "../api";
import { useAuth } from "../auth";
import { DOG_STATUS, DOG_STATUS_TONE, SEX, fmtDate, todayIso } from "../labels";
import { Badge, Card, Empty, ErrorBox, Form, Loading, PageHead, type FieldDef, Paw } from "../ui";

const FILTERS: [string, string][] = [
  ["in_care", "V péči"],
  ["new", "Nově přijatí"],
  ["in_foster", "V dočasce"],
  ["for_adoption", "K adopci"],
  ["reserved", "Rezervovaní"],
  ["ended", "Ukončení"],
  ["", "Všichni"],
];

export function DogList() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "in_care";
  const [q, setQ] = useState("");
  const url = `/api/dogs?status=${status}${q.length >= 2 ? "&q=" + encodeURIComponent(q) : ""}`;
  const { data, error, loading } = useApi<any[]>(url);
  const basic = !can("dogs", "own");

  return (
    <>
      <PageHead
        title="Psi"
        actions={
          can("dogs", "write") && (
            <Link className="btn primary" to="/psi/novy">
              + Přijmout psa
            </Link>
          )
        }
      />
      <div className="filters">
        {can("dogs", "read") &&
          FILTERS.map(([k, l]) => (
            <button key={k} className={status === k ? "chip on" : "chip"} onClick={() => setParams(k ? { status: k } : { status: "" })}>
              {l}
            </button>
          ))}
        <input type="search" className="filter-search" placeholder="Jméno, ev. číslo, čip…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ErrorBox error={error} />
      {loading && !data ? (
        <Loading />
      ) : data && data.length === 0 ? (
        <Empty>Žádný pes neodpovídá filtru.</Empty>
      ) : (
        <div className="dog-cards">
          {data?.map((d) => (
            <Link key={d.id} to={`/psi/${d.id}`} className="dog-card">
              {d.photo_url ? <img src={d.photo_url} alt="" loading="lazy" /> : <div className="ph"><Paw /></div>}
              <div className="dog-card-body">
                <div className="dog-card-top">
                  <strong>{d.name}</strong>
                  <Badge tone={DOG_STATUS_TONE[d.status]}>{DOG_STATUS[d.status]}</Badge>
                </div>
                <div className="muted small">
                  {d.reg_number} · {SEX[d.sex] ?? ""} {d.breed ? `· ${d.breed}` : ""}
                </div>
                <div className="small">{d.location ?? "—"}</div>
                {!basic && (
                  <div className="muted small">
                    Přijat {fmtDate(d.intake_date)} · {d.days_in_care} dní v péči
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export const DOG_BASIC_FIELDS: FieldDef[] = [
  { name: "name", label: "Jméno", required: true },
  { name: "alias", label: "Původní jméno / alias" },
  { name: "sex", label: "Pohlaví", type: "select", options: SEX },
  { name: "breed", label: "Plemeno / kříženec" },
  { name: "color", label: "Barva / popis" },
  { name: "birth_date", label: "Datum narození", type: "date" },
  { name: "birth_estimated", label: "Datum narození je odhad", type: "checkbox", placeholder: "Odhad" },
  { name: "chip", label: "Číslo čipu" },
  { name: "passport", label: "Číslo pasu" },
  { name: "other_id", label: "Jiná identifikace" },
];

export const DOG_INTAKE_FIELDS: FieldDef[] = [
  { name: "intake_date", label: "Datum přijetí", type: "date", required: true },
  { name: "intake_type", label: "Způsob přijetí", type: "select", options: { "Odebrání": "Odebrání", "Od obce": "Od obce", "Od majitele": "Vzdání se majitele", "Nález": "Nález", "Z jiného útulku": "Z jiného útulku", "Jiné": "Jiné" } },
  { name: "intake_origin", label: "Původ přijetí (odkud, kontakt)" },
  { name: "location", label: "Aktuální umístění" },
  { name: "responsible_person_id", label: "Odpovědná osoba", type: "person" },
  { name: "intake_health", label: "Vstupní zdravotní stav", type: "textarea" },
];

export function DogNew() {
  const nav = useNavigate();
  return (
    <>
      <PageHead title="Přijmout nového psa" sub="Evidenční číslo se přidělí automaticky po uložení." />
      <Card>
        <Form
          fields={[...DOG_BASIC_FIELDS, ...DOG_INTAKE_FIELDS]}
          initial={{ intake_date: todayIso(), sex: "unknown", location: "Hafanof" }}
          submitLabel="Založit psa"
          onCancel={() => nav(-1)}
          onSubmit={async (v) => {
            const dog = await post("/api/dogs", v);
            nav(`/psi/${dog.id}`);
          }}
        />
      </Card>
    </>
  );
}
