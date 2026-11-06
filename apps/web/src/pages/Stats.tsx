import { useState } from "react";
import { useApi } from "../api";
import { DOG_STATUS } from "../labels";
import { Card, Loading, PageHead } from "../ui";

export function Stats() {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);
  const { data: s } = useApi<any>(`/api/stats?from=${from}&to=${to}`);

  return (
    <>
      <PageHead
        title="Statistiky"
        actions={
          <div className="btn-row">
            <label>
              Od <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              Do <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        }
      />
      {!s ? (
        <Loading />
      ) : (
        <>
          <div className="stats-row">
            {[
              ["Přijatí psi za období", s.intake],
              ["Adopce za období", s.adoptions],
              ["Aktuálně v péči", s.in_care],
              ["Aktuálně v DP", s.in_foster],
            ].map(([l, n]) => (
              <div key={l} className="stat">
                <span className="stat-n">{n}</span>
                <span className="stat-l">{l}</span>
              </div>
            ))}
          </div>
          <div className="grid-2">
            <Card title="Průměrná délka pobytu">
              <dl className="kv">
                <div>
                  <dt>Psi s ukončenou evidencí v období</dt>
                  <dd>{s.avg_stay_days_ended ?? "—"} dní</dd>
                </div>
                <div>
                  <dt>Psi aktuálně v péči (zatím)</dt>
                  <dd>{s.avg_stay_days_current ?? "—"} dní</dd>
                </div>
              </dl>
            </Card>
            <Card title="Ukončení evidence v období">
              {Object.keys(s.ended).length === 0 ? (
                <p className="muted">Žádná ukončení.</p>
              ) : (
                <dl className="kv">
                  {Object.entries(s.ended).map(([k, n]) => (
                    <div key={k}>
                      <dt>{DOG_STATUS[k]}</dt>
                      <dd>{n as number}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
            <Card title="Náklady" className="span-2">
              <p className="muted">Náklady na psy a celkové náklady se začnou počítat s modulem Finance (milník 2).</p>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
