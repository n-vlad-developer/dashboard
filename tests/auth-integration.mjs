// Run after npm run build. Uses an isolated local backend; never sends real email.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";

let requests = 0;
let refreshed = false;
const backend = createServer(async (req, res) => {
  requests++;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const reply = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (req.url === "/auth/login/")
    return reply(202, {
      requires_email_code: true,
      challenge_id: "test-challenge",
      expires_in: 600,
    });
  if (req.url === "/auth/login/verify/")
    return body.code === "123456" && body.challenge_id === "test-challenge"
      ? reply(200, { access: "test-access", refresh: "test-refresh" })
      : reply(401, { detail: "Неверный код" });
  if (req.url === "/auth/refresh/") {
    assert.equal(body.refresh, "test-refresh");
    refreshed = true;
    return reply(200, { access: "renewed-access", refresh: "renewed-refresh" });
  }
  if (req.url === "/me/")
    return req.headers.authorization === "Bearer renewed-access"
      ? reply(200, { id: 42, email: "fixture@example.test", venues: [] })
      : reply(401, { detail: "Expired" });
  if (req.url === "/auth/logout/") {
    assert.equal(body.refresh, "renewed-refresh");
    return reply(200, { ok: true });
  }
  reply(404, {});
});
backend.listen(0, "127.0.0.1");
await once(backend, "listening");
const upstream = `http://127.0.0.1:${backend.address().port}`;

async function run(secret, configured) {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const base = `http://localhost:${port}`;
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "localhost",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        SESSION_SECRET: secret,
        Q1_API_BASE_URL: upstream,
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, "isolated Next server starts");
    const post = (path, data, cookie = "") =>
      fetch(base + path, {
        method: "POST",
        headers: { origin: base, "Content-Type": "application/json", cookie },
        body: JSON.stringify(data),
      });
    const before = requests;
    const login = await post("/api/auth/login", {
      email: "fixture@example.test",
      password: "synthetic-password",
    });
    if (!configured) {
      assert.equal(login.status, 503);
      const verify = await post("/api/auth/login/verify", {
        challenge_id: "test-challenge",
        code: "123456",
      });
      assert.equal(verify.status, 503);
      assert.equal(
        requests,
        before,
        "invalid configuration must not send or consume a code",
      );
      return;
    }
    assert.equal(login.status, 202);
    const { challenge_id } = await login.json();
    const wrong = await post("/api/auth/login/verify", {
      challenge_id,
      code: "000000",
    });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers.get("set-cookie"), null);
    const verify = await post("/api/auth/login/verify", {
      challenge_id,
      code: "123456",
    });
    assert.equal(verify.status, 200);
    assert.deepEqual(await verify.json(), { ok: true });
    const setCookie = verify.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Secure/i);
    assert.match(setCookie, /SameSite=lax/i);
    assert.ok(!setCookie.includes("test-access"));
    let cookie = setCookie.split(";")[0];
    const dashboard = await fetch(base + "/dashboard", {
      headers: { cookie },
      redirect: "manual",
    });
    assert.equal(dashboard.status, 200, "saved session opens dashboard");
    const me = await fetch(base + "/api/q1/me", { headers: { cookie } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).id, 42);
    assert.ok(refreshed);
    cookie = me.headers.get("set-cookie").split(";")[0];
    assert.equal(
      (await fetch(base + "/api/q1/me", { headers: { cookie } })).status,
      200,
    );
    const logout = await post("/api/auth/logout", {}, cookie);
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /q1_session=;/);
    assert.equal((await fetch(base + "/api/q1/me")).status, 401);
  } finally {
    child.kill();
    await once(child, "exit");
  }
}
try {
  await run(randomBytes(48).toString("hex"), true);
  await run("", false);
  console.log(
    "PASS: OTP, encrypted cookie, dashboard, profile, token rotation, logout and configuration preflight",
  );
} finally {
  backend.close();
}
