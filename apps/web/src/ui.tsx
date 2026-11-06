import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useApi } from "./api";
import { fullName } from "./labels";

export function Badge({ tone = "taupe", children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Card({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export const Loading = () => <p className="muted pad">Načítám…</p>;
export const ErrorBox = ({ error }: { error: string | null }) => (error ? <p className="error-box">{error}</p> : null);
export const Empty = ({ children }: { children: ReactNode }) => <p className="empty">{children}</p>;

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Zavřít">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: [string, string][]; active: string; onChange: (k: string) => void }) {
  return (
    <nav className="tabs" role="tablist">
      {tabs.map(([k, label]) => (
        <button key={k} role="tab" aria-selected={active === k} className={active === k ? "tab active" : "tab"} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </nav>
  );
}

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "password" | "email" | "tel" | "date" | "datetime" | "number" | "textarea" | "select" | "checkbox" | "person" | "user" | "file" | "multi";
  options?: Record<string, string>;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  accept?: string;
};

type Values = Record<string, any>;

function PersonSelect({ id, value, onChange, required, role }: { id: string; value: any; onChange: (v: any) => void; required?: boolean; role?: string }) {
  const { data } = useApi<any[]>(`/api/people${role ? "?role=" + role : ""}`);
  return (
    <select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} required={required}>
      <option value="">— vyberte osobu —</option>
      {data?.map((p) => (
        <option key={p.id} value={p.id}>
          {fullName(p)}
          {p.phone ? ` · ${p.phone}` : ""}
        </option>
      ))}
    </select>
  );
}

function UserSelect({ id, value, onChange }: { id: string; value: any; onChange: (v: any) => void }) {
  const { data } = useApi<any[]>("/api/users/lookup");
  return (
    <select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">— nepřiřazeno —</option>
      {data?.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}

/** Jednoduchý formulář podle definice polí. */
export function Form({
  fields,
  initial = {},
  submitLabel = "Uložit",
  onSubmit,
  onCancel,
  personRole,
}: {
  fields: FieldDef[];
  initial?: Values;
  submitLabel?: string;
  onSubmit: (values: Values) => Promise<unknown>;
  onCancel?: () => void;
  personRole?: string;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setValues((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        {fields.map((f) => {
          const v = values[f.name];
          const id = `f-${f.name}`;
          let input: ReactNode;
          switch (f.type) {
            case "textarea":
              input = <textarea id={id} value={v ?? ""} onChange={(e) => set(f.name, e.target.value)} required={f.required} placeholder={f.placeholder} rows={3} />;
              break;
            case "select":
              input = (
                <select id={id} value={v ?? ""} onChange={(e) => set(f.name, e.target.value || null)} required={f.required}>
                  {!f.required && <option value="">—</option>}
                  {Object.entries(f.options ?? {}).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              );
              break;
            case "multi":
              input = (
                <div className="chips">
                  {Object.entries(f.options ?? {}).map(([k, l]) => {
                    const arr: string[] = v ?? [];
                    const on = arr.includes(k);
                    return (
                      <button type="button" key={k} className={on ? "chip on" : "chip"} aria-pressed={on} onClick={() => set(f.name, on ? arr.filter((x) => x !== k) : [...arr, k])}>
                        {l}
                      </button>
                    );
                  })}
                </div>
              );
              break;
            case "checkbox":
              input = (
                <label className="check">
                  <input id={id} type="checkbox" checked={!!v} onChange={(e) => set(f.name, e.target.checked)} /> {f.placeholder ?? "Ano"}
                </label>
              );
              break;
            case "person":
              input = <PersonSelect id={id} value={v} onChange={(x) => set(f.name, x)} required={f.required} role={personRole} />;
              break;
            case "user":
              input = <UserSelect id={id} value={v} onChange={(x) => set(f.name, x)} />;
              break;
            case "file":
              input = <input id={id} type="file" accept={f.accept} required={f.required} onChange={(e) => set(f.name, e.target.files?.[0] ?? null)} />;
              break;
            default:
              input = (
                <input
                  id={id}
                  type={f.type === "datetime" ? "datetime-local" : (f.type ?? "text")}
                  value={v ?? ""}
                  step={f.type === "number" ? "any" : undefined}
                  onChange={(e) => set(f.name, e.target.value)}
                  required={f.required}
                  placeholder={f.placeholder}
                />
              );
          }
          return (
            <div key={f.name} className={`field ${f.wide || f.type === "textarea" || f.type === "multi" ? "wide" : ""}`}>
              <label htmlFor={id}>
                {f.label}
                {f.required && <span className="req"> *</span>}
              </label>
              {input}
              {f.hint && <small className="muted">{f.hint}</small>}
            </div>
          );
        })}
      </div>
      <ErrorBox error={error} />
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Zrušit
          </button>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? "Ukládám…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Vytvoří FormData pro nahrání souboru. */
export function toFormData(values: Values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) if (v !== null && v !== undefined && v !== "") fd.append(k, v instanceof File ? v : String(v));
  return fd;
}

export function KV({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v === null || v === undefined || v === "" ? "—" : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DogLink({ id, name }: { id?: number | null; name?: string | null }) {
  if (!id) return <>{name ?? "—"}</>;
  return <Link to={`/psi/${id}`}>{name ?? "pes"}</Link>;
}

/** Tlapka v barvě značky (místo emoji, které se vykresluje modře). */
export function Paw({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="6" cy="9.5" rx="2.2" ry="2.8" />
      <ellipse cx="10" cy="5.8" rx="2.2" ry="2.9" />
      <ellipse cx="14.5" cy="5.8" rx="2.2" ry="2.9" />
      <ellipse cx="18.4" cy="9.6" rx="2.2" ry="2.8" />
      <path d="M12.2 11.2c-2.9 0-6.1 3.6-6.1 6.4 0 1.8 1.4 2.6 3 2.6 1.3 0 2-.6 3.1-.6s1.8.6 3.1.6c1.6 0 3-.8 3-2.6 0-2.8-3.2-6.4-6.1-6.4z" />
    </svg>
  );
}
