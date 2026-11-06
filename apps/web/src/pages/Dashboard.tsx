import { Link, useNavigate } from "react-router-dom";
import { patch, useApi } from "../api";
import { useAuth } from "../auth";
import { DOC_CATEGORY, DOC_STATUS, ADOPTION_STATUS, DOG_STATUS, PRIORITY, fmtDate } from "../labels";
import { Badge, Card, DogLink, Empty, ErrorBox, Loading, PageHead, Paw } from "../ui";

function TaskRow({ t, onDone }: { t: any; onDone: () => void }) {
  return (
    <li className="row">
      <button className="check-btn" title="Označit jako hotové" aria-label="Hotovo" onClick={() => patch(`/api/tasks/${t.id}`, { status: "done" }).then(onDone)}>
        ✓
      </button>
      <div className="grow">
        <Link to={`/ukoly?id=${t.id}`}>{t.title}</Link>
        <div className="muted small">
          {fmtDate(t.due_date)}
          {t.assignee_name ? ` · ${t.assignee_name}` : ""}
          {t.ref_label ? ` · ${t.ref_label}` : ""}
        </div>
      </div>
      {t.priority === "high" && <Badge tone="red">{PRIORITY.high}</Badge>}
    </li>
  );
}

export function Dashboard() {
  const { me, can } = useAuth();
  const nav = useNavigate();
  const { data, error, loading, reload } = useApi<any>("/api/dashboard");
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox error={error} />;
  const c = data.counts;

  return (
    <>
      <PageHead
        title="Můj Hafanof"
        sub={`Dobrý den, ${me!.name}`}
        actions={
          <div className="quick">
            {can("dogs", "write") && (
              <button className="btn primary" onClick={() => nav("/psi/novy")}>
                + Pes
              </button>
            )}
            {can("people", "write") && (
              <button className="btn" onClick={() => nav("/osoby?nova=1")}>
                + Osoba
              </button>
            )}
            {can("tasks", "own") && (
              <button className="btn" onClick={() => nav("/ukoly?novy=1")}>
                {can("tasks", "read") ? "+ Úkol" : "+ Požadavek"}
              </button>
            )}
          </div>
        }
      />

      {c && (
        <div className="stats-row">
          {[
            ["V péči", c.in_care, "/psi?status=in_care"],
            ["V dočasce", c.in_foster, "/psi?status=in_foster"],
            ["K adopci", c.for_adoption, "/psi?status=for_adoption"],
            ["Rezervovaní", c.reserved, "/psi?status=reserved"],
          ].map(([label, n, to]) => (
            <Link key={label as string} to={to as string} className="stat">
              <span className="stat-n">{n as number}</span>
              <span className="stat-l">{label}</span>
            </Link>
          ))}
        </div>
      )}

      {data.my_dogs && (
        <Card title="Moji svěřenci">
          {data.my_dogs.length === 0 ? (
            <Empty>Momentálně u vás není žádný pes.</Empty>
          ) : (
            <div className="dog-grid">
              {data.my_dogs.map((d: any) => (
                <Link to={`/psi/${d.id}`} key={d.id} className="dog-tile">
                  {d.photo_url ? <img src={d.photo_url} alt="" /> : <div className="ph"><Paw /></div>}
                  <strong>{d.name}</strong>
                  <span className="muted small">{DOG_STATUS[d.status]}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="grid-2">
        {data.tasks_today && (
          <Card title={`Úkoly po termínu (${data.tasks_overdue.length})`} className={data.tasks_overdue.length ? "alert" : ""}>
            {data.tasks_overdue.length === 0 ? (
              <Empty>Nic po termínu 👍</Empty>
            ) : (
              <ul className="list">
                {data.tasks_overdue.map((t: any) => (
                  <TaskRow key={t.id} t={t} onDone={reload} />
                ))}
              </ul>
            )}
          </Card>
        )}
        {data.tasks_today && (
          <Card title={`Dnešní úkoly (${data.tasks_today.length})`} actions={<Link to="/ukoly">Všechny úkoly →</Link>}>
            {data.tasks_today.length === 0 ? (
              <Empty>Na dnešek nic.</Empty>
            ) : (
              <ul className="list">
                {data.tasks_today.map((t: any) => (
                  <TaskRow key={t.id} t={t} onDone={reload} />
                ))}
              </ul>
            )}
          </Card>
        )}
        {data.health_upcoming && (
          <Card title="Zdraví: kontroly, očkování, dávky" actions={<Link to="/kalendar">Kalendář →</Link>}>
            {data.health_upcoming.length === 0 ? (
              <Empty>Žádné blížící se termíny.</Empty>
            ) : (
              <ul className="list">
                {data.health_upcoming.map((i: any, k: number) => (
                  <li key={k} className="row">
                    <span className={i.overdue ? "date overdue" : "date"}>{fmtDate(i.date)}</span>
                    <Link className="grow" to={`/psi/${i.dog_id}?tab=health`}>
                      {i.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {data.medications_active?.length > 0 && (
              <>
                <h3>Aktuálně podávané léky</h3>
                <ul className="list">
                  {data.medications_active.map((m: any) => (
                    <li key={m.id} className="row">
                      <DogLink id={m.dog_id} name={m.dog_name} />
                      <span className="grow">
                        {" "}
                        – {m.name} {m.dose} {m.frequency && `(${m.frequency})`}
                      </span>
                      <span className="muted small">do {fmtDate(m.end_date)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        )}
        {data.adoptions_pending && (
          <Card title={`Nevyřízené žádosti o adopci (${data.adoptions_pending.length})`} actions={<Link to="/adopce">Adopce →</Link>}>
            {data.adoptions_pending.length === 0 ? (
              <Empty>Žádné otevřené žádosti.</Empty>
            ) : (
              <ul className="list">
                {data.adoptions_pending.map((a: any) => (
                  <li key={a.id} className="row">
                    <div className="grow">
                      <Link to={`/adopce?id=${a.id}`}>
                        {a.dog_name} ← {a.person_name}
                      </Link>
                      <div className="muted small">
                        {ADOPTION_STATUS[a.status]} · podáno {fmtDate(a.applied_at)}
                      </div>
                    </div>
                    {a.waiting_days >= 3 && a.status === "new" && <Badge tone="red">{a.waiting_days} dní bez reakce</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        {data.documents_pending && data.documents_pending.length > 0 && (
          <Card title="Dokumenty k doplnění / podpisu">
            <ul className="list">
              {data.documents_pending.map((d: any) => (
                <li key={d.id} className="row">
                  <div className="grow">
                    {d.title} <span className="muted small">({DOC_CATEGORY[d.category]})</span>
                    <div className="small">
                      <DogLink id={d.dog_id} name={d.dog_name} />
                    </div>
                  </div>
                  <Badge tone={d.status === "missing" ? "red" : "gold"}>{DOC_STATUS[d.status]}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
