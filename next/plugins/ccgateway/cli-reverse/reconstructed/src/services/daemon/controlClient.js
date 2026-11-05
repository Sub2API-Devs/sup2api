/**
 * services/daemon/controlClient.ts
 *
 * 2.1.316 新增。向后台守护进程的控制 socket 发请求；另有守护进程租约（必要时启动守护进程）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v1xy4c4g.js (5)
 * attribution: placement 5
 */
import { connect } from "net";
import { StringDecoder } from "string_decoder";
import { daemonControlSocket, redactDaemonPipeKey } from "./paths.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-v1xy4c4g.js:684-1457 placement
/**
 * 向后台守护进程的控制 socket 发请求；另有守护进程租约（必要时启动守护进程）。
 */
async function controlRequest(request, options) {
  let socket;
  try {
    socket = connect(daemonControlSocket());
  } catch (error) {
    return {
      ok: false,
      code: "ENOCONN",
      error: redactDaemonPipeKey(errorMessage(error)),
      errno: getErrnoCode(error),
    };
  }
  let timeoutMs = options?.timeoutMs ?? 5000;
  let settle;
  let promise = new Promise((resolve) => {
    settle = resolve;
  });
  let done = false;
  let connected = false;
  let finish = (result) => {
    if (done) return;
    done = true;
    socket.destroy();
    settle(result);
  };
  socket.setTimeout(timeoutMs, () =>
    finish({
      ok: false,
      code: "ETIMEOUT",
      error: "control socket timeout",
      connected,
    }),
  );
  socket.on("error", (error) =>
    finish({
      ok: false,
      code: "ENOCONN",
      error: redactDaemonPipeKey(errorMessage(error)),
      connected,
      errno: getErrnoCode(error),
    }),
  );
  socket.once("connect", () => {
    connected = true;
    socket.write(
      jsonStringify(request) +
        `
`,
    );
  });
  let decoder = new StringDecoder("utf8");
  let buffer = "";
  socket.on("data", (data) => {
    buffer += decoder.write(data);
    let index = buffer.indexOf(`
`);
    if (index < 0) return;
    let sliced = buffer.slice(0, index);
    try {
      finish(jsonParse(sliced));
    } catch (error) {
      finish({
        ok: false,
        code: "ENOCONN",
        error: redactDaemonPipeKey(errorMessage(error)),
        connected,
      });
    }
  });
  socket.once("close", () => {
    if (!done)
      finish({
        ok: false,
        code: "ENOCONN",
        error: "connection dropped mid-request \u2014 it may have restarted; retry",
        connected,
      });
  });
  return promise;
}
//@ chunk-v1xy4c4g.js:1457-1522 placement
/**
 * 结束租约的操作集合（shutdown_op、upgrade、yield、displaced）。
 */
var MAX_DAEMON_SPAWNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LEASE_END_OPS;
deferInit("chunk-v1xy4c4g.js:1457", () => {
  MAX_DAEMON_SPAWNS = 4;
  LEASE_END_OPS = new Set(["shutdown_op", "upgrade", "yield", "displaced"]);
});
//@ chunk-v1xy4c4g.js:1522-1583 placement
function openDaemonLease(label) {
  return openDaemonLeaseLoop({
    label,
    cwd: getCwd(),
    pid: process.pid,
  });
}
//@ chunk-v1xy4c4g.js:1583-2877 placement
/**
 * 维持守护进程租约，必要时启动守护进程
 */
function openDaemonLeaseLoop(client, leaseClient) {
  let stopped = false;
  let socket = null;
  let retryTimer = null;
  let canSpawn = true;
  let spawnsLeft = MAX_DAEMON_SPAWNS;
  let reconnect = async (acknowledged) => {
    if (acknowledged || !leaseClient || !canSpawn || spawnsLeft === 0) {
      retryTimer = setTimeout(connectAndLease, 1000);
      retryTimer.unref();
      return;
    }
    let spawned = false;
    try {
      spawned = (await leaseClient.ensureDaemon()) === "started";
    } catch (error) {
      logForDebugging(`daemon lease: ensureDaemon failed: ${redactDaemonPipeKey(errorMessage(error))}`, {
        level: "error",
      });
    }
    canSpawn = spawned;
    spawnsLeft -= spawned ? 1 : 0;
    if (spawnsLeft === 0) {
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
    connectAndLease();
  };
  let connectAndLease = () => {
    if (stopped) return;
    let newSocket;
    try {
      newSocket = connect(daemonControlSocket());
    } catch {
      socket = null;
      reconnect(false);
      return;
    }
    socket = newSocket;
    let acknowledged = false;
    newSocket.on("error", () => newSocket.destroy());
    newSocket.once("connect", () => {
      let uid = process.getuid?.();
      if (leaseClient && uid !== undefined && getPeerUid(newSocket) !== uid) {
        if (canSpawn) {
          canSpawn = false;
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
        newSocket.destroy();
        return;
      }
      newSocket.write(
        jsonStringify({
          proto: BG_PROTO,
          op: "lease",
          client,
        }) +
          `
`,
      );
    });
    if (leaseClient)
      readStreamLines(newSocket, (line) => {
        if (stopped) return;
        let message = safeParseJSON(line, false);
        let closing = LeaseClosingNoticeSchema().safeParse(message).data?.closing;
        if (closing !== undefined) {
          if (LEASE_END_OPS.has(closing)) canSpawn = false;
          logEvent("tengu_bg_cloud_lease", {
            transition: lit("daemon_closing"),
            cause: fromEnum(closing),
          });
          leaseClient.onClosing(closing);
        } else if (!acknowledged && LeaseAcknowledgementSchema().safeParse(message).success) {
          acknowledged = true;
          canSpawn = true;
          leaseClient.onAcknowledged();
        }
      });
    else newSocket.on("data", () => {});
    newSocket.once("close", () => {
      socket = null;
      if (stopped) return;
      reconnect(acknowledged);
    });
    newSocket.unref();
  };
  connectAndLease();
  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    socket?.destroy();
  };
}
//@ chunk-v1xy4c4g.js:2877-3372 placement
function subscribeControl(short, tail, onEvent, onError) {
  let socket;
  try {
    socket = connect(daemonControlSocket());
  } catch (error) {
    queueMicrotask(() => onError(redactDaemonPipeKey(errorMessage(error))));
    return () => {};
  }
  let closed = false;
  let gotFirstLine = false;
  let fail = (message) => {
    if (closed) return;
    closed = true;
    onError(message);
  };
  socket.setTimeout(1e4, () => {
    if (!gotFirstLine) {
      fail(bgSupervisorStalledMessage());
      socket.destroy();
    }
  });
  socket.on("error", (error) => fail(redactDaemonPipeKey(errorMessage(error))));
  socket.on("close", () => fail("control socket closed"));
  socket.on("connect", () =>
    socket.write(
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
  let streamLines = readStreamLines(socket, (line) => {
    if (!gotFirstLine) {
      gotFirstLine = true;
      socket.setTimeout(0);
    }
    try {
      let message = jsonParse(line);
      if ("ok" in message && message.ok === false) fail(message.error);
      else onEvent(message);
    } catch {}
  });
  return () => {
    closed = true;
    streamLines();
    socket.destroy();
  };
}
export { controlRequest, openDaemonLease, subscribeControl };
