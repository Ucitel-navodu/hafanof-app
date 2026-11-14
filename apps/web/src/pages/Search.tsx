import { Link, useSearchParams } from "react-router-dom";
import { useApi } from "../api";
import { Card, Empty, Loading, PageHead } from "../ui";

interface Group {
  key: string;
  label: string;
  items: { id: number | string; title: string; subtitle?: string | null; link: string; external?: boolean }[];
}

/** Globální vyhledávání (sekce 1) — výsledky ze všech modulů, které uživatel smí vidět. */
export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { data } = useApi<Group[]>(`/api/search?q=${encodeURIComponent(q)}`);

  return (
    <>
      <PageHead title={`Hledání: „${q}“`} />
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty>Nic nenalezeno.</Empty>
      ) : (
        <div className="grid-2">
          {data.map((g) => (
            <Card key={g.key} title={`${g.label} (${g.items.length})`}>
              <ul className="list compact">
                {g.items.map((i) => (
                  <li key={i.id}>
                    {i.external ? (
                      <a href={i.link} target="_blank" rel="noreferrer">
                        {i.title}
                      </a>
                    ) : (
                      <Link to={i.link}>{i.title}</Link>
                    )}{" "}
                    {i.subtitle && <span className="muted small">{i.subtitle}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
