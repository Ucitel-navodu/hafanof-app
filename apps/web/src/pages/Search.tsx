import { Link, useSearchParams } from "react-router-dom";
import { useApi } from "../api";
import { DOC_CATEGORY, DOG_STATUS, HEALTH_KIND, fmtDate, fullName } from "../labels";
import { Card, Empty, Loading, PageHead } from "../ui";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { data } = useApi<any>(`/api/search?q=${encodeURIComponent(q)}`);
  const total = data ? Object.values(data).reduce((s: number, a: any) => s + a.length, 0) : 0;

  return (
    <>
      <PageHead title={`Hledání: „${q}“`} />
      {!data ? (
        <Loading />
      ) : total === 0 ? (
        <Empty>Nic nenalezeno.</Empty>
      ) : (
        <div className="grid-2">
          {data.dogs.length > 0 && (
            <Card title="Psi">
              <ul className="list compact">
                {data.dogs.map((d: any) => (
                  <li key={d.id}>
                    <Link to={`/psi/${d.id}`}>{d.name}</Link> <span className="muted small">{d.reg_number} · {DOG_STATUS[d.status]}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {data.people.length > 0 && (
            <Card title="Osoby">
              <ul className="list compact">
                {data.people.map((p: any) => (
                  <li key={p.id}>
                    <Link to={`/osoby/${p.id}`}>{fullName(p)}</Link> <span className="muted small">{[p.phone, p.email].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {data.documents.length > 0 && (
            <Card title="Dokumenty">
              <ul className="list compact">
                {data.documents.map((d: any) => (
                  <li key={d.id}>
                    <a href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer">
                      {d.title}
                    </a>{" "}
                    <span className="muted small">
                      {DOC_CATEGORY[d.category]}
                      {d.dog_name && ` · ${d.dog_name}`}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {data.health?.length > 0 && (
            <Card title="Zdravotní záznamy">
              <ul className="list compact">
                {data.health.map((h: any) => (
                  <li key={h.id}>
                    <Link to={`/psi/${h.dog_id}?tab=health`}>
                      {h.dog_name}: {HEALTH_KIND[h.kind]} {h.name ?? ""}
                    </Link>{" "}
                    <span className="muted small">{fmtDate(h.date)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {data.tasks.length > 0 && (
            <Card title="Úkoly">
              <ul className="list compact">
                {data.tasks.map((t: any) => (
                  <li key={t.id}>
                    <Link to={`/ukoly?id=${t.id}`}>{t.title}</Link> <span className="muted small">{fmtDate(t.due_date)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
