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
import { daemonControlSocket, redactDaemonPipeKey } from "../../utils/sandbox/userNamespace.js";
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

//@ chunk-6ffkpva1.js:683-1455 placement
/**
 * 向后台守护进程的控制 socket 发请求；另有守护进程租约（必要时启动守护进程）。
 */
async function controlRequest(g, m) {
  let s;
  try {
    s = connect(daemonControlSocket());
  } catch (error) {
    return {
      ok: false,
      code: "ENOCONN",
      error: redactDaemonPipeKey(errorMessage(error)),
      errno: getErrnoCode(error),
    };
  }
  let timeoutMs = m?.timeoutMs ?? 5000;
  let o;
  let promise = new Promise((resolve) => {
    o = resolve;
  });
  let u = false;
  let connected = false;
  let f = (r) => {
    if (u) return;
    u = true;
    s.destroy();
    o(r);
  };
  s.setTimeout(timeoutMs, () =>
    f({
      ok: false,
      code: "ETIMEOUT",
      error: "control socket timeout",
      connected,
    }),
  );
  s.on("error", (r) =>
    f({
      ok: false,
      code: "ENOCONN",
      error: redactDaemonPipeKey(errorMessage(r)),
      connected,
      errno: getErrnoCode(r),
    }),
  );
  s.once("connect", () => {
    connected = true;
    s.write(
      jsonStringify(g) +
        `
`,
    );
  });
  let e = new StringDecoder("utf8");
  let n = "";
  s.on("data", (r) => {
    n += e.write(r);
    let index = n.indexOf(`
`);
    if (index < 0) return;
    let sliced = n.slice(0, index);
    try {
      f(jsonParse(sliced));
    } catch (error) {
      f({
        ok: false,
        code: "ENOCONN",
        error: redactDaemonPipeKey(errorMessage(error)),
        connected,
      });
    }
  });
  s.once("close", () => {
    if (!u)
      f({
        ok: false,
        code: "ENOCONN",
        error: "connection dropped mid-request \u2014 it may have restarted; retry",
        connected,
      });
  });
  return promise;
}
//@ chunk-6ffkpva1.js:1455-1520 placement
/**
 * 结束租约的操作集合（shutdown_op、upgrade、yield、displaced）。
 */
var MAX_DAEMON_SPAWNS = 4;
var LEASE_END_OPS = new Set(["shutdown_op", "upgrade", "yield", "displaced"]);
//@ chunk-6ffkpva1.js:1520-1581 placement
function openDaemonLease(label) {
  return openDaemonLeaseLoop({
    label,
    cwd: getCwd(),
    pid: process.pid,
  });
}
//@ chunk-6ffkpva1.js:1581-2874 placement
/**
 * 维持守护进程租约，必要时启动守护进程
 */
function openDaemonLeaseLoop(client, m) {
  let s = false;
  let p = null;
  let o = null;
  let l = true;
  let u = MAX_DAEMON_SPAWNS;
  let i = async (e) => {
    if (e || !m || !l || u === 0) {
      o = setTimeout(f, 1000);
      o.unref();
      return;
    }
    let n = false;
    try {
      n = (await m.ensureDaemon()) === "started";
    } catch (error) {
      logForDebugging(`daemon lease: ensureDaemon failed: ${redactDaemonPipeKey(errorMessage(error))}`, {
        level: "error",
      });
    }
    l = n;
    u -= n ? 1 : 0;
    if (u === 0) {
      logEvent("tengu_bg_cloud_lease", {
        transition: lit("starts_used_up"),
      });
      logForDebugging(
        `daemon lease: started a daemon ${MAX_DAEMON_SPAWNS} times; from here it only reconnects`,
        {
          level: "warn",
        },
      );
    }
    f();
  };
  let f = () => {
    if (s) return;
    let e;
    try {
      e = connect(daemonControlSocket());
    } catch {
      p = null;
      i(false);
      return;
    }
    p = e;
    let n = false;
    e.on("error", () => e.destroy());
    e.once("connect", () => {
      let r = process.getuid?.();
      if (m && r !== undefined && getPeerUid(e) !== r) {
        if (l) {
          l = false;
          logEvent("tengu_bg_cloud_lease", {
            transition: lit("server_not_this_user"),
          });
          logForDebugging(
            "daemon lease: the control socket is not served by this user, or its server cannot be told; not taking a lease there",
            {
              level: "warn",
            },
          );
        }
        e.destroy();
        return;
      }
      e.write(
        jsonStringify({
          proto: BG_PROTO,
          op: "lease",
          client,
        }) +
          `
`,
      );
    });
    if (m)
      readStreamLines(e, (r) => {
        if (s) return;
        let E = safeParseJSON(r, false);
        let closing = LeaseClosingNoticeSchema().safeParse(E).data?.closing;
        if (closing !== undefined) {
          if (LEASE_END_OPS.has(closing)) l = false;
          logEvent("tengu_bg_cloud_lease", {
            transition: lit("daemon_closing"),
            cause: fromEnum(closing),
          });
          m.onClosing(closing);
        } else if (!n && LeaseAcknowledgementSchema().safeParse(E).success) {
          n = true;
          l = true;
          m.onAcknowledged();
        }
      });
    else e.on("data", () => {});
    e.once("close", () => {
      p = null;
      if (s) return;
      i(n);
    });
    e.unref();
  };
  f();
  return () => {
    s = true;
    if (o) clearTimeout(o);
    p?.destroy();
  };
}
//@ chunk-6ffkpva1.js:2874-3368 placement
function subscribeControl(short, tail, s, p) {
  let o;
  try {
    o = connect(daemonControlSocket());
  } catch (error) {
    queueMicrotask(() => p(redactDaemonPipeKey(errorMessage(error))));
    return () => {};
  }
  let l = false;
  let u = false;
  let i = (e) => {
    if (l) return;
    l = true;
    p(e);
  };
  o.setTimeout(1e4, () => {
    if (!u) {
      i(bgSupervisorStalledMessage());
      o.destroy();
    }
  });
  o.on("error", (e) => i(redactDaemonPipeKey(errorMessage(e))));
  o.on("close", () => i("control socket closed"));
  o.on("connect", () =>
    o.write(
      jsonStringify({
        proto: BG_PROTO,
        op: "subscribe",
        short,
        tail,
      }) +
        `
`,
    ),
  );
  let streamLines = readStreamLines(o, (e) => {
    if (!u) {
      u = true;
      o.setTimeout(0);
    }
    try {
      let n = jsonParse(e);
      if ("ok" in n && n.ok === false) i(n.error);
      else s(n);
    } catch {}
  });
  return () => {
    l = true;
    streamLines();
    o.destroy();
  };
}
export { controlRequest, openDaemonLease, subscribeControl };
