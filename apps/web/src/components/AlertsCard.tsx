import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";
import { fmtDate } from "../labels";
import { Card, Empty, Loading } from "../ui";

export interface Alert {
  key: string;
  module: string;
  severity: "danger" | "warning" | "info";
  title: string;
  detail?: string | null;
  date?: string | null;
  link?: string | null;
}

const SEVERITY: Record<Alert["severity"], [string, string]> = {
  danger: ["Po termínu", "red"],
  warning: ["Pozor", "gold"],
  info: ["Info", "muted"],
};

const LIMIT = 8;

/** Upozornění ze všech modulů (sekce 18): po termínu, blížící se termíny, chybějící údaje… */
export function AlertsCard() {
  const { data, error } = useApi<Alert[]>("/api/alerts");
  const [all, setAll] = useState(false);
  const shown = all ? data : data?.slice(0, LIMIT);
  const danger = data?.filter((a) => a.severity === "danger").length ?? 0;

  return (
    <Card title={`Upozornění${data ? ` (${data.length})` : ""}`} className={danger ? "alert span-2" : "span-2"}>
      {error && <p className="error-box">{error}</p>}
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty>Vše v pořádku — žádné termíny po splatnosti ani chybějící údaje.</Empty>
      ) : (
        <>
          <ul className="list alerts">
            {shown!.map((a) => (
              <li key={a.key} className={`row alert-${a.severity}`}>
                <span className={`sev sev-${SEVERITY[a.severity][1]}`} title={SEVERITY[a.severity][0]} aria-label={SEVERITY[a.severity][0]} />
                <div className="grow">
                  {a.link ? <Link to={a.link}>{a.title}</Link> : a.title}
                  {(a.detail || a.date) && (
                    <div className="muted small">{[a.date ? fmtDate(a.date) : null, a.detail].filter(Boolean).join(" · ")}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {data.length > LIMIT && (
            <button className="btn small ghost" onClick={() => setAll((x) => !x)}>
              {all ? "Zobrazit méně" : `Zobrazit všech ${data.length}`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
