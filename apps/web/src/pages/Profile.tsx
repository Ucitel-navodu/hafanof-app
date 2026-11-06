import { useState } from "react";
import { post } from "../api";
import { useAuth } from "../auth";
import { USER_ROLE } from "../labels";
import { Card, Form, KV, PageHead } from "../ui";

export function Profile() {
  const { me, logout } = useAuth();
  const [done, setDone] = useState(false);
  return (
    <>
      <PageHead title="Můj účet" actions={<button className="btn ghost" onClick={logout}>Odhlásit</button>} />
      <div className="grid-2">
        <Card title="Údaje">
          <KV
            items={[
              ["Jméno", me!.name],
              ["E-mail", me!.email],
              ["Role", me!.roles.map((r) => USER_ROLE[r] ?? r).join(", ")],
            ]}
          />
        </Card>
        <Card title="Změna hesla">
          {done && <p className="ok-box">Heslo změněno.</p>}
          <Form
            fields={[
              { name: "current", label: "Současné heslo", type: "password", required: true },
              { name: "next", label: "Nové heslo (min. 10 znaků)", type: "password", required: true },
            ]}
            submitLabel="Změnit heslo"
            onSubmit={async (v) => {
              await post("/api/auth/password", v);
              setDone(true);
            }}
          />
        </Card>
      </div>
    </>
  );
}
