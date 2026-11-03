/**
 * services/daemon/controlClient.ts
 *
 * 2.1.316 新增。向后台守护进程的控制 socket 发请求；另有守护进程租约（必要时启动守护进程）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6ffkpva1.js (5)
 * attribution: placement 5
 */
import { connect } from "net";
import { StringDecoder } from "string_decoder";
import { Z6, $A } from "../../utils/sandbox/userNamespace.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { getCwd } from "../../utils/cwd.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { getPeerUid } from "../../utils/udsMessaging/peerGuard.js";
import { BG_PROTO, LeaseClosingNoticeSchema, LeaseAcknowledgementSchema } from "./leaseProtocol.js";
import { readStreamLines } from "../../utils/streamDestroy.js";
import { safeParseJSON } from "../../utils/json.js";
import { bgSupervisorStalledMessage } from "../../utils/fleetGates.js";

/**
 * 向后台守护进程的控制 socket 发请求；另有守护进程租约（必要时启动守护进程）。
 */
//@ chunk-6ffkpva1.js:683-1455 placement
async function controlRequest(g, m) {
  let s;
  try {
    s = connect(Z6());
  } catch (error) {
    return { ok: !1, code: "ENOCONN", error: $A(errorMessage(error)), errno: getErrnoCode(error) };
  }
  let p = m?.timeoutMs ?? 5000,
    o,
    promise = new Promise((r) => {
      o = r;
    }),
    u = !1,
    i = !1,
    f = (r) => {
      if (u) return;
      ((u = !0), s.destroy(), o(r));
    };
  (s.setTimeout(p, () => f({ ok: !1, code: "ETIMEOUT", error: "control socket timeout", connected: i })),
    s.on("error", (r) =>
      f({ ok: !1, code: "ENOCONN", error: $A(errorMessage(r)), connected: i, errno: getErrnoCode(r) }),
    ),
    s.once("connect", () => {
      ((i = !0),
        s.write(
          jsonStringify(g) +
            `
`,
        ));
    }));
  let e = new StringDecoder("utf8"),
    n = "";
  return (
    s.on("data", (r) => {
      n += e.write(r);
      let index = n.indexOf(`
`);
      if (index < 0) return;
      let sliced = n.slice(0, index);
      try {
        f(jsonParse(sliced));
      } catch (error) {
        f({ ok: !1, code: "ENOCONN", error: $A(errorMessage(error)), connected: i });
      }
    }),
    s.once("close", () => {
      if (!u)
        f({
          ok: !1,
          code: "ENOCONN",
          error: "connection dropped mid-request \u2014 it may have restarted; retry",
          connected: i,
        });
    }),
    promise
  );
}
//@ chunk-6ffkpva1.js:1455-1520 placement
var v = 4,
  O = new Set(["shutdown_op", "upgrade", "yield", "displaced"]);
//@ chunk-6ffkpva1.js:1520-1581 placement
function openDaemonLease(g) {
  return openDaemonLeaseLoop({ label: g, cwd: getCwd(), pid: process.pid });
}
/**
 * 维持守护进程租约，必要时启动守护进程
 */
//@ chunk-6ffkpva1.js:1581-2874 placement
function openDaemonLeaseLoop(g, m) {
  let s = !1,
    p = null,
    o = null,
    l = !0,
    u = v,
    i = async (e) => {
      if (e || !m || !l || u === 0) {
        ((o = setTimeout(f, 1000)), o.unref());
        return;
      }
      let n = !1;
      try {
        n = (await m.ensureDaemon()) === "started";
      } catch (error) {
        logForDebugging(`daemon lease: ensureDaemon failed: ${$A(errorMessage(error))}`, { level: "error" });
      }
      if (((l = n), (u -= n ? 1 : 0), u === 0))
        (logEvent("tengu_bg_cloud_lease", { transition: lit("starts_used_up") }),
          logForDebugging(`daemon lease: started a daemon ${v} times; from here it only reconnects`, {
            level: "warn",
          }));
      f();
    },
    f = () => {
      if (s) return;
      let e;
      try {
        e = connect(Z6());
      } catch {
        ((p = null), i(!1));
        return;
      }
      p = e;
      let n = !1;
      if (
        (e.on("error", () => e.destroy()),
        e.once("connect", () => {
          let r = process.getuid?.();
          if (m && r !== void 0 && getPeerUid(e) !== r) {
            if (l)
              ((l = !1),
                logEvent("tengu_bg_cloud_lease", { transition: lit("server_not_this_user") }),
                logForDebugging(
                  "daemon lease: the control socket is not served by this user, or its server cannot be told; not taking a lease there",
                  { level: "warn" },
                ));
            e.destroy();
            return;
          }
          e.write(
            jsonStringify({ proto: BG_PROTO, op: "lease", client: g }) +
              `
`,
          );
        }),
        m)
      )
        readStreamLines(e, (r) => {
          if (s) return;
          let E = safeParseJSON(r, !1),
            C = LeaseClosingNoticeSchema().safeParse(E).data?.closing;
          if (C !== void 0) {
            if (O.has(C)) l = !1;
            (logEvent("tengu_bg_cloud_lease", { transition: lit("daemon_closing"), cause: fromEnum(C) }),
              m.onClosing(C));
          } else if (!n && LeaseAcknowledgementSchema().safeParse(E).success)
            ((n = !0), (l = !0), m.onAcknowledged());
        });
      else e.on("data", () => {});
      (e.once("close", () => {
        if (((p = null), s)) return;
        i(n);
      }),
        e.unref());
    };
  return (
    f(),
    () => {
      if (((s = !0), o)) clearTimeout(o);
      p?.destroy();
    }
  );
}
//@ chunk-6ffkpva1.js:2874-3368 placement
function subscribeControl(g, m, s, p) {
  let o;
  try {
    o = connect(Z6());
  } catch (error) {
    return (queueMicrotask(() => p($A(errorMessage(error)))), () => {});
  }
  let l = !1,
    u = !1,
    i = (e) => {
      if (l) return;
      ((l = !0), p(e));
    };
  (o.setTimeout(1e4, () => {
    if (!u) (i(bgSupervisorStalledMessage()), o.destroy());
  }),
    o.on("error", (e) => i($A(errorMessage(e)))),
    o.on("close", () => i("control socket closed")),
    o.on("connect", () =>
      o.write(
        jsonStringify({ proto: BG_PROTO, op: "subscribe", short: g, tail: m }) +
          `
`,
      ),
    ));
  let f = readStreamLines(o, (e) => {
    if (!u) ((u = !0), o.setTimeout(0));
    try {
      let n = jsonParse(e);
      if ("ok" in n && n.ok === !1) i(n.error);
      else s(n);
    } catch {}
  });
  return () => {
    ((l = !0), f(), o.destroy());
  };
}

export { controlRequest, openDaemonLease, subscribeControl };
