import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";
import { addDays, fmtDate, todayIso } from "../labels";
import { Badge, Card, Empty, Loading, PageHead } from "../ui";

interface Item {
  date: string;
  type: string;
  label: string;
  tone: string;
  title: string;
  link?: string | null;
  time?: string | null;
}

const WEEKDAY = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];

/** Kalendář (sekce 12) — položky ze všech modulů: úkoly, zdraví, adopční návštěvy, směny, příspěvky, termíny spolku… */
export function Calendar() {
  const [from, setFrom] = useState(todayIso());
  const to = addDays(from, 27);
  const { data } = useApi<Item[]>(`/api/calendar?from=${from}&to=${to}`);
  const byDay = new Map<string, Item[]>();
  for (const i of data ?? []) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
  const legend = new Map<string, [string, string]>();
  for (const i of data ?? []) legend.set(i.type, [i.label, i.tone]);

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
      {legend.size > 0 && (
        <div className="legend">
          {[...legend.entries()].map(([k, [l, tone]]) => (
            <Badge key={k} tone={tone}>
              {l}
            </Badge>
          ))}
        </div>
      )}
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
                  <Badge tone={i.tone}>{i.label}</Badge>
                  {i.time && <span className="muted small">{i.time}</span>}
                  <span className="grow">{i.link ? <Link to={i.link}>{i.title}</Link> : i.title}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </>
  );
}
