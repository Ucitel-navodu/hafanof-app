import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";
import { useAuth } from "../auth";
import { ACTION, ENTITY as CORE_ENTITY, FIELD as CORE_FIELD, fieldValue, fmtDateTime } from "../labels";
import { entityLabels, fieldLabels } from "../modules";

const ENTITY = { ...CORE_ENTITY, ...entityLabels() };
const FIELD = { ...CORE_FIELD, ...fieldLabels() };
import { Card, Empty, ErrorBox, Loading, PageHead } from "../ui";

function show(v: unknown) {
  if (v === null || v === undefined || v === "") return "∅";
  const s = String(v);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

export function AuditLog() {
  const { can } = useAuth();
  const [filters, setFilters] = useState({ user_id: "", dog_id: "", entity: "", from: "", to: "" });
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const { data, error } = useApi<any[]>(`/api/audit?${qs}`);
  const { data: users } = useApi<any[]>(can("users", "read") ? "/api/users" : null);
  const { data: dogs } = useApi<any[]>("/api/dogs?status=");
  const set = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHead title="Historie změn" sub="Auditní záznam nelze upravit ani smazat." />
      <div className="filters">
        <select value={filters.user_id} onChange={(e) => set("user_id", e.target.value)} aria-label="Uživatel">
          <option value="">Všichni uživatelé</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select value={filters.dog_id} onChange={(e) => set("dog_id", e.target.value)} aria-label="Pes">
          <option value="">Všichni psi</option>
          {dogs?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.reg_number})
            </option>
          ))}
        </select>
        <select value={filters.entity} onChange={(e) => set("entity", e.target.value)} aria-label="Typ záznamu">
          <option value="">Všechny záznamy</option>
          {Object.entries(ENTITY).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <label>
          Od <input type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} />
        </label>
        <label>
          Do <input type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} />
        </label>
      </div>
      <ErrorBox error={error} />
      {!data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty>Nic nenalezeno.</Empty>
      ) : (
        <Card>
          <ul className="list audit">
            {data.map((e) => (
              <li key={e.id}>
                <div className="small">
                  <strong>{e.user_name ?? "systém"}</strong> {ACTION[e.action] ?? e.action} · {ENTITY[e.entity] ?? e.entity}
                  {e.entity_id ? ` #${e.entity_id}` : ""}
                  {e.dog_id && (
                    <>
                      {" "}
                      · <Link to={`/psi/${e.dog_id}`}>pes #{e.dog_id}</Link>
                    </>
                  )}
                  <span className="muted"> · {fmtDateTime(e.at)}</span>
                </div>
                {e.action === "update" && (
                  <ul className="changes">
                    {Object.entries(e.changes).map(([k, v]: [string, any]) => (
                      <li key={k}>
                        {FIELD[k] ?? k}: <del>{fieldValue(e.entity, k, v[0]) ?? show(v[0])}</del> → <ins>{fieldValue(e.entity, k, v[1]) ?? show(v[1])}</ins>
                      </li>
                    ))}
                  </ul>
                )}
                {e.action === "delete" && <div className="muted small">Smazaný záznam: {show(e.changes.title?.[0] ?? e.changes.name?.[0] ?? "")}</div>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
