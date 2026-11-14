import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { patch, post, useApi } from "../api";
import { useAuth } from "../auth";
import { PRIORITY, TASK_STATUS, fmtDate, fmtDateTime, todayIso } from "../labels";
import { Badge, Card, Empty, ErrorBox, Form, KV, Loading, Modal, PageHead, toFormData } from "../ui";
import { TASK_FIELDS } from "./DogDetail";
import { DocLink } from "../components/DocLink";

const VIEWS: [string, string][] = [
  ["mine", "Moje úkoly"],
  ["overdue", "Po termínu"],
  ["open", "Všechny otevřené"],
  ["all", "Včetně hotových"],
];

export function Tasks() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const own = !can("tasks", "read");
  const view = params.get("view") ?? (own ? "open" : "mine");
  const openId = params.get("id");
  const [adding, setAdding] = useState(params.get("novy") === "1");
  const qs = view === "mine" ? "mine=1" : view === "overdue" ? "overdue=1" : view === "all" ? "open=0" : "";
  const { data, error, reload } = useApi<any[]>(`/api/tasks?${qs}`);

  return (
    <>
      <PageHead title="Úkoly" actions={<button className="btn primary" onClick={() => setAdding(true)}>{own ? "+ Požadavek" : "+ Úkol"}</button>} />
      {!own && (
        <div className="filters">
          {VIEWS.map(([k, l]) => (
            <button key={k} className={view === k ? "chip on" : "chip"} onClick={() => setParams({ view: k })}>
              {l}
            </button>
          ))}
        </div>
      )}
      <ErrorBox error={error} />
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty>Žádné úkoly.</Empty>
      ) : (
        <Card>
          <ul className="list">
            {data.map((t) => (
              <li key={t.id} className={`row ${t.overdue ? "is-overdue" : ""}`}>
                {["open", "in_progress"].includes(t.status) ? (
                  <button className="check-btn" aria-label="Označit jako hotové" title="Hotovo" onClick={() => patch(`/api/tasks/${t.id}`, { status: "done" }).then(reload)}>
                    ✓
                  </button>
                ) : (
                  <span className="check-btn done" aria-hidden>
                    ✓
                  </span>
                )}
                <button className="grow link-btn" onClick={() => setParams({ view, id: String(t.id) })}>
                  <span className={t.status === "done" ? "strike" : ""}>{t.title}</span>
                  <span className="muted small block">
                    {t.due_date ? fmtDate(t.due_date) : "bez termínu"} · {t.assignee_name ?? "nepřiřazeno"}
                    {t.ref_label ? ` · ${t.ref_label}` : ""}
                    {t.recurrence_days ? ` · ↻ ${t.recurrence_days} dní` : ""}
                  </span>
                </button>
                {t.overdue && <Badge tone="red">Po termínu</Badge>}
                {t.priority === "high" && <Badge tone="red">Vysoká</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {adding && (
        <Modal title={own ? "Nový požadavek" : "Nový úkol"} onClose={() => setAdding(false)}>
          <Form
            fields={own ? TASK_FIELDS.filter((f) => ["title", "description", "due_date", "priority"].includes(f.name)) : TASK_FIELDS}
            initial={{ priority: "normal", due_date: todayIso() }}
            onCancel={() => setAdding(false)}
            onSubmit={async (v) => {
              await post("/api/tasks", { ...v, recurrence_days: v.recurrence_days ? Number(v.recurrence_days) : null });
              setAdding(false);
              reload();
            }}
          />
        </Modal>
      )}
      {openId && <TaskDetail id={Number(openId)} onClose={() => (setParams({ view }), reload())} />}
    </>
  );
}

function TaskDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { can } = useAuth();
  const { data: t, error, reload } = useApi<any>(`/api/tasks/${id}`);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const write = can("tasks", "write");
  const refLink = t?.dog_id ? `/psi/${t.dog_id}` : t?.ref_type === "person" ? `/osoby/${t.ref_id}` : null;

  return (
    <Modal title={t?.title ?? "Úkol"} onClose={onClose}>
      <ErrorBox error={error} />
      {!t ? (
        <Loading />
      ) : editing ? (
        <Form
          fields={TASK_FIELDS}
          initial={t}
          onCancel={() => setEditing(false)}
          onSubmit={async (v) => {
            await patch(`/api/tasks/${t.id}`, { ...v, recurrence_days: v.recurrence_days ? Number(v.recurrence_days) : null });
            setEditing(false);
            reload();
          }}
        />
      ) : (
        <>
          <KV
            items={[
              ["Stav", TASK_STATUS[t.status]],
              ["Termín", fmtDate(t.due_date)],
              ["Odpovědná osoba", t.assignee_name ?? "nepřiřazeno"],
              ["Priorita", PRIORITY[t.priority]],
              ["Vazba", refLink ? <Link to={refLink}>{t.ref_label}</Link> : (t.ref_label ?? "—")],
              ["Opakování", t.recurrence_days ? `každých ${t.recurrence_days} dní` : "ne"],
              ["Zadal(a)", `${t.created_by_name ?? "systém"}, ${fmtDateTime(t.created_at)}`],
              ["Popis", t.description],
            ]}
          />
          <div className="btn-row">
            {t.status !== "done" && (
              <button className="btn primary small" onClick={() => patch(`/api/tasks/${t.id}`, { status: "done" }).then(reload)}>
                ✓ Hotovo
              </button>
            )}
            {t.status === "open" && (
              <button className="btn small" onClick={() => patch(`/api/tasks/${t.id}`, { status: "in_progress" }).then(reload)}>
                Rozpracovat
              </button>
            )}
            {t.status === "done" && (
              <button className="btn small" onClick={() => patch(`/api/tasks/${t.id}`, { status: "open" }).then(reload)}>
                Znovu otevřít
              </button>
            )}
            {write && (
              <button className="btn small ghost" onClick={() => setEditing(true)}>
                Upravit
              </button>
            )}
          </div>

          <h3>Přílohy</h3>
          {t.attachments.length === 0 ? (
            <p className="muted small">Bez příloh.</p>
          ) : (
            <ul className="list compact">
              {t.attachments.map((a: any) => (
                <li key={a.id}>
                  <DocLink doc={a} />
                </li>
              ))}
            </ul>
          )}
          {can("documents", "write") && (
            <input
              type="file"
              aria-label="Přidat přílohu"
              accept=".pdf,.doc,.docx,image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await post("/api/documents", toFormData({ task_id: t.id, dog_id: t.dog_id, category: "other", title: file.name, file }));
                reload();
              }}
            />
          )}

          <h3>Komentáře</h3>
          {t.comments.length === 0 && <p className="muted small">Zatím bez komentářů.</p>}
          <ul className="list compact">
            {t.comments.map((c: any) => (
              <li key={c.id}>
                <span className="muted small">
                  {c.author} · {fmtDateTime(c.created_at)}
                </span>
                <div>{c.body}</div>
              </li>
            ))}
          </ul>
          <form
            className="inline-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!comment.trim()) return;
              await post(`/api/tasks/${t.id}/comments`, { body: comment });
              setComment("");
              reload();
            }}
          >
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Napsat komentář…" aria-label="Komentář" />
            <button className="btn small">Přidat</button>
          </form>
        </>
      )}
    </Modal>
  );
}
