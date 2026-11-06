import { useState } from "react";
import { patch, post, useApi } from "../api";
import { useAuth } from "../auth";
import { USER_ROLE, fmtDateTime } from "../labels";
import { Badge, Card, ErrorBox, Form, Loading, Modal, PageHead, type FieldDef } from "../ui";

const ROLE_HELP: Record<string, string> = {
  admin: "Vše včetně správy uživatelů a záloh.",
  director: "Vše kromě správy uživatelů a záloh.",
  auditor: "Čtení všeho včetně historie změn, bez úprav.",
  team: "Psi, zdraví, dokumenty, osoby, adopce, DP, úkoly.",
  foster: "Jen vlastní svěřenci (váha, foto, poznámka, problém) a vlastní úkoly. Účet propojte s osobou.",
  volunteer: "Jen přidělené úkoly a základní údaje o psech.",
};

export function Admin() {
  const { can, me } = useAuth();
  const { data: users, error, reload } = useApi<any[]>("/api/users");
  const { data: people } = useApi<any[]>(can("people") ? "/api/people" : null);
  const { data: backups, reload: reloadBackups } = useApi<any[]>(can("backup", "write") ? "/api/admin/backups" : null);
  const { data: settings, reload: reloadSettings } = useApi<any>("/api/admin/settings");
  const [edit, setEdit] = useState<any | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const write = can("users", "write");

  const fields = (isNew: boolean): FieldDef[] => [
    { name: "name", label: "Jméno", required: true },
    ...(isNew ? ([{ name: "email", label: "E-mail (přihlašovací)", type: "email", required: true }] as FieldDef[]) : []),
    { name: "roles", label: "Role", type: "multi", options: USER_ROLE },
    {
      name: "person_id",
      label: "Propojená osoba (u dočaskáře nutné)",
      type: "select",
      options: Object.fromEntries((people ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`])),
    },
    { name: "password", label: isNew ? "Heslo (min. 10 znaků)" : "Nové heslo (nechte prázdné)", type: "password", required: isNew },
  ];

  return (
    <>
      <PageHead title="Správa" actions={write && <button className="btn primary" onClick={() => setEdit({ roles: [] })}>+ Uživatel</button>} />
      <ErrorBox error={error} />
      <Card title="Uživatelé a role">
        {!users ? (
          <Loading />
        ) : (
          <ul className="list">
            {users.map((u) => (
              <li key={u.id} className="row">
                <div className="grow">
                  <strong className={u.active ? "" : "strike"}>{u.name}</strong> <span className="muted small">{u.email}</span>
                  <div className="badges">
                    {u.roles.map((r: string) => (
                      <Badge key={r}>{USER_ROLE[r]}</Badge>
                    ))}
                    {!u.active && <Badge tone="red">Deaktivován</Badge>}
                  </div>
                </div>
                {write && (
                  <>
                    <button className="btn small" onClick={() => setEdit(u)}>
                      Upravit
                    </button>
                    {u.id !== me!.id && (
                      <button
                        className="btn small ghost"
                        onClick={async () => {
                          await patch(`/api/users/${u.id}`, { active: !u.active });
                          reload();
                        }}
                      >
                        {u.active ? "Deaktivovat" : "Aktivovat"}
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <details className="small">
          <summary>Co která role smí</summary>
          <ul>
            {Object.entries(ROLE_HELP).map(([k, v]) => (
              <li key={k}>
                <strong>{USER_ROLE[k]}:</strong> {v}
              </li>
            ))}
          </ul>
          <p className="muted">Změna rolí nebo deaktivace platí okamžitě, bez nového přihlášení.</p>
        </details>
      </Card>

      {settings && (
        <Card title="Nastavení">
          <Form
            fields={[{ name: "days", label: "Kontroly po adopci (dny od adopce, oddělené čárkou)", hint: "Platí pro nově dokončené adopce." }]}
            initial={{ days: settings.post_adoption_check_days.join(", ") }}
            onSubmit={async (v) => {
              const days = String(v.days)
                .split(",")
                .map((s) => Number(s.trim()))
                .filter((n) => n > 0);
              await patch("/api/admin/settings", { post_adoption_check_days: days });
              reloadSettings();
            }}
          />
        </Card>
      )}

      {backups && (
        <Card
          title="Zálohy"
          actions={
            <button
              className="btn small primary"
              onClick={async () => {
                const b = await post("/api/admin/backups");
                setBackupMsg(`Záloha ${b.name} vytvořena.`);
                reloadBackups();
              }}
            >
              Zálohovat teď
            </button>
          }
        >
          {backupMsg && <p className="ok-box">{backupMsg}</p>}
          <p className="muted small">Automatickou denní zálohu a obnovu nastavuje správce serveru (viz README). Obnova se spouští na serveru příkazem npm run restore.</p>
          <ul className="list compact">
            {backups.slice(0, 10).map((b) => (
              <li key={b.name} className="row">
                <span className="grow">{fmtDateTime(b.created_at)}</span>
                <span className="muted small">
                  {b.dogs} psů · kontrola: {b.integrity}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {edit && (
        <Modal title={edit.id ? `Upravit: ${edit.name}` : "Nový uživatel"} onClose={() => setEdit(null)}>
          <Form
            fields={fields(!edit.id)}
            initial={edit}
            onCancel={() => setEdit(null)}
            onSubmit={async (v) => {
              const body = { name: v.name, roles: v.roles, person_id: v.person_id ? Number(v.person_id) : null, ...(v.password ? { password: v.password } : {}) };
              if (edit.id) await patch(`/api/users/${edit.id}`, body);
              else await post("/api/users", { ...body, email: v.email });
              setEdit(null);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
