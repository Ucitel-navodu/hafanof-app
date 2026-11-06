import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";
import { addDays, fmtDate, todayIso } from "../labels";
import { Badge, Card, Empty, Loading, PageHead } from "../ui";

const TYPE: Record<string, [string, string]> = {
  task: ["Úkol", "taupe"],
  health: ["Zdraví", "red"],
  visit: ["Adopční návštěva", "purple"],
  check: ["Kontrola po adopci", "green"],
};

const WEEKDAY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];

export function Calendar() {
  const [from, setFrom] = useState(todayIso());
  const to = addDays(from, 27);
  const { data } = useApi<any[]>(`/api/calendar?from=${from}&to=${to}`);
  const byDay = new Map<string, any[]>();
  for (const i of data ?? []) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);

  return (
    <>
      <PageHead
        title="Kalendář"
        sub={`${fmtDate(from)} – ${fmtDate(to)}`}
        actions={
          <div className="btn-row">
            <button className="btn small" onClick={() => setFrom(addDays(from, -28))}>
              ← Dříve
            </button>
            <button className="btn small" onClick={() => setFrom(todayIso())}>
              Dnes
            </button>
            <button className="btn small" onClick={() => setFrom(addDays(from, 28))}>
              Později →
            </button>
          </div>
        }
      />
      <div className="legend">
        {Object.entries(TYPE).map(([k, [l, tone]]) => (
          <Badge key={k} tone={tone}>
            {l}
          </Badge>
        ))}
      </div>
      {!data ? (
        <Loading />
      ) : byDay.size === 0 ? (
        <Empty>V tomto období nic naplánováno.</Empty>
      ) : (
        [...byDay.entries()].map(([date, items]) => (
          <Card key={date} title={`${WEEKDAY[new Date(date + "T12:00:00").getDay()]} ${fmtDate(date)}${date === todayIso() ? " · dnes" : ""}`}>
            <ul className="list compact">
              {items.map((i, k) => (
                <li key={k} className="row">
                  <Badge tone={TYPE[i.type]?.[1]}>{TYPE[i.type]?.[0] ?? i.type}</Badge>
                  <span className="grow">
                    {i.task_id ? <Link to={`/ukoly?id=${i.task_id}`}>{i.title}</Link> : i.dog_id ? <Link to={`/psi/${i.dog_id}?tab=health`}>{i.title}</Link> : i.title}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </>
  );
}
