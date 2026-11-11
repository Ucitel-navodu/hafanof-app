import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { patch, post, useApi } from "../api";
import { useAuth } from "../auth";
import { ADOPTION_FLOW, ADOPTION_STATUS, DOC_STATUS, TASK_STATUS, fmtDate, todayIso } from "../labels";
import { Badge, Card, ErrorBox, Form, KV, Loading, Modal, PageHead, toFormData, type FieldDef } from "../ui";
import { NewApplicationModal } from "./DogDetail";
import { CommunicationModal } from "./People";

export function Adoptions() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const openId = params.get("id");
  const [showClosed, setShowClosed] = useState(false);
  const [adding, setAdding] = useState(false);
  const { data, error, reload } = useApi<any[]>(`/api/adoptions${showClosed ? "" : "?open=1"}`);

  const columns = showClosed ? [...ADOPTION_FLOW, "rejected", "withdrawn"] : ADOPTION_FLOW.filter((s) => s !== "adopted");

  return (
    <>
      <PageHead
        title="Adopce"
        sub="Nový zájemce → dotazník → kontaktován → návštěva → schválen → rezervace → adopce → kontroly"
        actions={
          <>
            <label className="check">
              <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Zobrazit i uzavřené
            </label>
            {can("adoptions", "write") && (
              <button className="btn primary" onClick={() => setAdding(true)}>
                + Žádost
              </button>
            )}
          </>
        }
      />
      <ErrorBox error={error} />
      {!data ? (
        <Loading />
      ) : (
        <div className="kanban">
          {columns.map((s) => {
            const items = data.filter((a) => a.status === s);
            return (
              <div key={s} className="kanban-col">
                <h3>
                  {ADOPTION_STATUS[s]} <span className="muted">({items.length})</span>
                </h3>
                {items.map((a) => (
                  <button key={a.id} className="kanban-card" onClick={() => setParams({ id: String(a.id) })}>
                    <strong>{a.dog_name}</strong>
                    <span>{a.person_name}</span>
                    <span className="muted small">
                      {fmtDate(a.applied_at)}
                      {a.visit_at && ` · návštěva ${fmtDate(a.visit_at)}`}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {openId && <AdoptionDetail id={Number(openId)} onClose={() => (setParams({}), reload())} />}
      {adding && <NewApplicationModal onClose={() => (setAdding(false), reload())} />}
    </>
  );
}

const NEXT: Record<string, string[]> = {
  new: ["questionnaire", "contacted", "rejected", "withdrawn"],
  questionnaire: ["contacted", "rejected", "withdrawn"],
  contacted: ["visit", "approved", "rejected", "withdrawn"],
  visit: ["approved", "rejected", "withdrawn"],
  approved: ["reserved", "adopted", "withdrawn"],
  reserved: ["adopted", "approved", "withdrawn"],
  adopted: [],
  rejected: ["new"],
  withdrawn: ["new"],
};

function AdoptionDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { can } = useAuth();
  const { data: a, error, reload } = useApi<any>(`/api/adoptions/${id}`);
  const [step, setStep] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "comm" | "doc" | "edit">(null);
  const write = can("adoptions", "write");

  const stepFields = (s: string): FieldDef[] => {
    if (s === "visit") return [{ name: "visit_at", label: "Termín návštěvy", type: "date", required: true }];
    if (s === "rejected") return [{ name: "rejection_reason", label: "Interní důvod zamítnutí (zájemce ho nevidí)", type: "textarea", required: true }];
    if (s === "adopted") return [{ name: "adopted_at", label: "Datum adopce", type: "date", required: true }];
    return [{ name: "notes", label: "Poznámka (volitelně)", type: "textarea" }];
  };

  return (
    <Modal title={a ? `Adopce: ${a.dog_name} ← ${a.person_name}` : "Adopce"} onClose={onClose}>
      <ErrorBox error={error} />
      {!a ? (
        <Loading />
      ) : (
        <>
          <p>
            <Badge tone={a.status === "adopted" ? "green" : a.status === "rejected" || a.status === "withdrawn" ? "muted" : "gold"}>{ADOPTION_STATUS[a.status]}</Badge>
          </p>
          <ol className="steps" aria-label="Průběh adopce">
            {ADOPTION_FLOW.map((s) => (
              <li key={s} className={ADOPTION_FLOW.indexOf(s) <= ADOPTION_FLOW.indexOf(a.status) ? "done" : ""}>
                {ADOPTION_STATUS[s]}
              </li>
            ))}
          </ol>
          {write && NEXT[a.status].length > 0 && (
            <div className="btn-row">
              {NEXT[a.status].map((s) => (
                <button key={s} className={s === "rejected" || s === "withdrawn" ? "btn small ghost" : "btn small"} onClick={() => setStep(s)}>
                  → {ADOPTION_STATUS[s]}
                </button>
              ))}
            </div>
          )}
          {step && (
            <Card title={`Posunout na: ${ADOPTION_STATUS[step]}`}>
              {step === "adopted" && <p className="small">Pes se označí jako adoptovaný, ukončí se evidence a počet dní v péči, případná DP a naplánují se kontroly po adopci.</p>}
              <Form
                fields={stepFields(step)}
                initial={{ visit_at: a.visit_at, adopted_at: todayIso() }}
                submitLabel="Potvrdit"
                onCancel={() => setStep(null)}
                onSubmit={async (v) => {
                  await patch(`/api/adoptions/${a.id}`, { ...v, status: step });
                  setStep(null);
                  reload();
                }}
              />
            </Card>
          )}
          <KV
            items={[
              ["Pes", <Link to={`/psi/${a.dog_id}`}>{a.dog_name} ({a.reg_number})</Link>],
              ["Zájemce", <Link to={`/osoby/${a.person_id}`}>{a.person_name}</Link>],
              ["Kontakt", [a.person_phone, a.person_email].filter(Boolean).join(" · ")],
              ["Datum žádosti", fmtDate(a.applied_at)],
              ["Návštěva", fmtDate(a.visit_at)],
              ["Datum adopce", fmtDate(a.adopted_at)],
              ["Dotazník", a.questionnaire],
              ["Poznámky", a.notes],
              ...(a.rejection_reason ? ([["Interní důvod zamítnutí", a.rejection_reason]] as [string, any][]) : []),
            ]}
          />
          {write && (
            <button className="btn small ghost" onClick={() => setModal("edit")}>
              Upravit dotazník a poznámky
            </button>
          )}

          <h3>Komunikace</h3>
          {a.communications.length === 0 ? (
            <p className="muted small">Zatím nic.</p>
          ) : (
            <ul className="list compact">
              {a.communications.map((c: any) => (
                <li key={c.id}>
                  <span className="muted small">
                    {fmtDate(c.date)} · {c.channel} · {c.author}
                  </span>
                  <div>{c.summary}</div>
                </li>
              ))}
            </ul>
          )}
          {can("people", "write") && (
            <button className="btn small" onClick={() => setModal("comm")}>
              + Komunikace
            </button>
          )}

          <h3>Adopční dokumentace</h3>
          {a.documents.length === 0 ? (
            <p className="muted small">Smlouva zatím chybí.</p>
          ) : (
            <ul className="list compact">
              {a.documents.map((d: any) => (
                <li key={d.id} className="row">
                  <span className="grow">{d.stored_name ? <a href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer">{d.title}</a> : d.title}</span>
                  <Badge tone={d.status === "signed" ? "green" : "gold"}>{DOC_STATUS[d.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
          {can("documents", "write") && (
            <button className="btn small" onClick={() => setModal("doc")}>
              + Dokument
            </button>
          )}

          {a.checks.length > 0 && (
            <>
              <h3>Kontroly po adopci</h3>
              <ul className="list compact">
                {a.checks.map((t: any) => (
                  <li key={t.id} className="row">
                    <Link className="grow" to={`/ukoly?id=${t.id}`}>
                      {fmtDate(t.due_date)} – {t.title}
                    </Link>
                    <Badge tone={t.status === "done" ? "green" : "taupe"}>{TASK_STATUS[t.status]}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {modal === "comm" && a && <CommunicationModal personId={a.person_id} adoptionId={a.id} dogId={a.dog_id} onClose={() => (setModal(null), reload())} />}
      {modal === "edit" && a && (
        <Modal title="Dotazník a poznámky" onClose={() => setModal(null)}>
          <Form
            fields={[
              { name: "questionnaire", label: "Dotazník", type: "textarea" },
              { name: "notes", label: "Poznámky", type: "textarea" },
              { name: "visit_at", label: "Termín návštěvy", type: "date" },
            ]}
            initial={a}
            onCancel={() => setModal(null)}
            onSubmit={async (v) => {
              await patch(`/api/adoptions/${a.id}`, { questionnaire: v.questionnaire, notes: v.notes, visit_at: v.visit_at });
              setModal(null);
              reload();
            }}
          />
        </Modal>
      )}
      {modal === "doc" && a && (
        <Modal title="Adopční dokument" onClose={() => setModal(null)}>
          <Form
            fields={[
              { name: "title", label: "Název", required: true },
              { name: "status", label: "Stav", type: "select", options: DOC_STATUS, required: true },
              { name: "file", label: "Soubor (PDF, DOCX, sken)", type: "file", accept: ".pdf,.doc,.docx,image/*" },
            ]}
            initial={{ title: "Adopční smlouva", status: "awaiting_signature" }}
            onCancel={() => setModal(null)}
            onSubmit={async (v) => {
              await post("/api/documents", toFormData({ ...v, category: "adoption", dog_id: a.dog_id, person_id: a.person_id, adoption_id: a.id }));
              setModal(null);
              reload();
            }}
          />
        </Modal>
      )}
    </Modal>
  );
}
