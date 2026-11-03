/**
 * services/daemon/rendezvous.ts
 *
 * 后台会话会合点客户端（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fd653dqq.js (31)
 * attribution: placement 31
 */
import { join, join as join_2 } from "path";
import { rm, unlink } from "fs/promises";
import { createServer } from "net";
import { StringDecoder } from "string_decoder";
import { HostScoped } from "../../utils/hostScoped.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import {
  logJobWriteError,
  withOwnJobStateWrite,
  readJobState,
  writeStateAtomic,
  SEED_DETAIL,
  isOverlayNeeds,
  PRE_BOOT_STATES,
  IDLE_NEEDS,
  invalidateJobStateCache,
  isTerminal,
} from "./jobState.js";
import { replaceFileExclusive, PromptStash, normalizeStashText } from "./promptStash.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { bM, setPromptValue } from "../../state/promptInputStore.js";
import {
  setRvSupervisorLinkLive,
  setAttacherCaps,
  getRootSession,
  getAttacherCaps,
  mainAgentId,
  recordSubmitTime,
} from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { timingSafeEqualStrings, readSessionAuthFile } from "../../utils/sessionRecords.js";
import { noteAttachStamp, aon } from "../../utils/attachStamp.js";
import { uAi } from "../../ink/colorize.js";
import { setSystemTheme } from "../../utils/systemTheme.js";
import { di } from "../../ink/terminal.js";
import { sleep } from "../../utils/sleep.js";
import { forkMarkerFields, h5s } from "../../utils/conversationRecovery.js";
import { KE } from "../../components/fleet/sessionAttention.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { hasEarlyInput, seedEarlyInput } from "../../utils/earlyInput.js";
import { registerCleanup, runCleanups } from "../../utils/cleanupRegistry.js";
import { getReplBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { ERASE_SCREEN, CURSOR_HOME } from "../../ink/termio/csi.js";
import { enqueueCommand } from "../../utils/messageQueueManager.js";
import { getModeFromInput, stripModePrefix } from "../../components/PromptInput/inputModes.js";
import { getBgTakeover } from "../../utils/concurrentSessions.js";

//@ chunk-fd653dqq.js:1305-1364 placement
class k {
  resolver = null;
  registerResolver(e) {
    this.resolver = e;
  }
}
//@ chunk-fd653dqq.js:1364-1387 placement
var E = new HostScoped(() => new k());
//@ chunk-fd653dqq.js:1387-1433 placement
function ion(e, r) {
  E.of(e).registerResolver(r);
}
//@ chunk-fd653dqq.js:1433-1482 placement
function R(e, r) {
  return E.of(e).resolver?.(r) ?? !1;
}
//@ chunk-fd653dqq.js:1482-1535 placement
class D {
  runner = null;
  registerRunner(e) {
    this.runner = e;
  }
}
//@ chunk-fd653dqq.js:1535-1558 placement
var P = new HostScoped(() => new D());
//@ chunk-fd653dqq.js:1558-1602 placement
function Jwo(e, r) {
  P.of(e).registerRunner(r);
}
//@ chunk-fd653dqq.js:1602-1751 placement
function runRvCommand(e, r) {
  try {
    return P.of(e).runner?.(r) ?? !1;
  } catch (error) {
    return (
      logForDebugging(`[bg-rv] command runner threw, queueing the reply: ${errorMessage(error)}`, {
        level: "warn",
      }),
      !1
    );
  }
}
/**
 * 把输入框草稿跟随写入作业目录的 .prompt-draft（≤256 KB）；草稿为空或用户已返回时删除文件；写入串行化，settled 等待全部写完。
 */
//@ chunk-fd653dqq.js:1812-2499 placement
class PromptDraftWriter {
  static NAME = ".prompt-draft";
  static MAX_BYTES = 262144;
  #t;
  #r;
  #e = Promise.resolve();
  #n;
  constructor(e) {
    this.#t = e;
  }
  follow() {
    return ((this.#n ??= this.#t.subscribe(this.#s)), this.#o());
  }
  settled() {
    return this.#i(this.#e);
  }
  dispose() {
    (this.#n?.(), (this.#n = void 0));
  }
  #s = () => {
    let { value: e, cameBack: cameBack } = this.#t.getState();
    if (e !== this.#r?.value || cameBack !== this.#r.cameBack) this.#o();
  };
  #o(e = env.CLAUDE_JOB_DIR) {
    if (((this.#r = this.#t.getState()), e)) this.#e = this.#e.then(() => this.#a(e)).catch(logJobWriteError);
    return this.#e;
  }
  #a(e) {
    let { value: r, cameBack: cameBack } = this.#t.getState(),
      o = join_2(e, PromptDraftWriter.NAME);
    return r !== "" && !cameBack
      ? replaceFileExclusive(o, truncateToLength(r, PromptDraftWriter.MAX_BYTES))
      : rm(o, { force: !0 }).catch((a) => (logJobWriteError(a), replaceFileExclusive(o, "")));
  }
  async #i(e) {
    return (await e, e === this.#e ? void 0 : this.#i(this.#e));
  }
}
//@ chunk-fd653dqq.js:2499-2514 placement
var F = 3,
  V = 5000;
/**
 * 后台会话会合点客户端：心跳、服务端错误、下一轮提示排队
 */
//@ chunk-fd653dqq.js:2514-8372 placement
class RendezvousClient {
  server;
  current = void 0;
  heartbeat;
  wedgeTimer = void 0;
  wedgeDisarmed = !1;
  authToken;
  currentAuthed = !1;
  unadmitted = new Set();
  admitOnAccept;
  silentPeerTimeoutMs = env.CLAUDE_BG_SILENT_PEER_TIMEOUT_MS || V;
  unauthedDrops = 0;
  gateReported = !1;
  nativeBrowserEnv;
  pendingInteractiveMarks;
  storageV5;
  promptInput = bM(O());
  promptDraftFile = new PromptDraftWriter(this.promptInput);
  promptStash = new PromptStash(this.promptInput);
  constructor(e, r, n, o, s, a) {
    ((this.authToken = r),
      (this.admitOnAccept = n),
      (this.storageV5 = a),
      (this.nativeBrowserEnv = o),
      (this.pendingInteractiveMarks = s),
      (this.server = createServer((u) => this.onConnection(u))),
      this.server.on("error", (u) =>
        logForDebugging(`[bg-rv] server error: ${String(u)}`, { level: "warn" }),
      ),
      this.server.listen(e),
      this.server.unref(),
      (this.heartbeat = setInterval(() => this.send({ type: "heartbeat" }), 30000)),
      this.heartbeat.unref());
  }
  admit(e) {
    (e.setTimeout(0),
      this.current?.destroy(),
      (this.current = e),
      (this.currentAuthed = !1),
      setRvSupervisorLinkLive(!1));
    while (this.pendingInteractiveMarks.length > 0) {
      let r = this.pendingInteractiveMarks[0];
      if (r === void 0 || !this.send(r)) break;
      this.pendingInteractiveMarks.shift();
    }
    ((this.unauthedDrops = 0),
      (this.gateReported = !1),
      this.clearPreBootState().catch((r) => {
        if (!isENOENT(r)) logJobWriteError(r);
      }),
      this.restorePromptDraft().catch(() => {}),
      this.promptStash.restore().catch(logError),
      e.once("close", () => {
        if (this.current === e) ((this.current = void 0), setRvSupervisorLinkLive(!1));
      }));
  }
  onConnection(e) {
    if ((e.on("error", () => e.destroy()), this.admitOnAccept)) this.admit(e);
    else
      (this.unadmitted.add(e),
        e.once("close", () => this.unadmitted.delete(e)),
        e.setTimeout(this.silentPeerTimeoutMs, () => {
          (logForDebugging(`[bg-rv] closed a connection that wrote nothing in ${this.silentPeerTimeoutMs}ms`),
            e.destroy());
        }));
    let r = "",
      n = new StringDecoder("utf8");
    e.on("data", (o) => {
      if (this.current !== e && !this.unadmitted.has(e)) {
        e.destroy();
        return;
      }
      r += n.write(o);
      let s;
      while (
        (s = r.indexOf(`
`)) >= 0
      ) {
        let sliced = r.slice(0, s);
        if (((r = r.slice(s + 1)), sliced)) {
          if (this.unadmitted.delete(e)) this.admit(e);
          this.handleLine(sliced);
        }
      }
      if (r.length > 1048576) ((r = ""), e.destroy());
    });
  }
  stop() {
    (clearInterval(this.heartbeat),
      clearTimeout(this.wedgeTimer),
      (this.wedgeTimer = void 0),
      this.current?.destroy(),
      (this.current = void 0));
    for (let e of this.unadmitted) e.destroy();
    (this.unadmitted.clear(),
      setRvSupervisorLinkLive(!1),
      this.restoreNativeBrowserEnv(),
      this.promptDraftFile.dispose(),
      this.promptStash.dispose(),
      this.server.close());
  }
  send(e) {
    if (!this.current || this.current.destroyed) return !1;
    try {
      return (
        this.current.write(
          jsonStringify(e) +
            `
`,
        ),
        !0
      );
    } catch {
      return !1;
    }
  }
  noteUnauthedRejection() {
    if ((this.unauthedDrops++, !this.gateReported && this.unauthedDrops >= F))
      ((this.gateReported = !0), logFeatureBad("bg_rv_gate", "unauthed_drops"));
  }
  restoreNativeBrowserEnv() {
    if (this.nativeBrowserEnv === void 0) delete process.env.BROWSER;
    else process.env.BROWSER = this.nativeBrowserEnv;
  }
  handleLine(e) {
    let r;
    try {
      r = jsonParse(e);
    } catch {
      return;
    }
    if (!r || typeof r !== "object") return;
    if ("role" in r) {
      if (this.authToken)
        if ("auth" in r && timingSafeEqualStrings(r.auth, this.authToken)) {
          if (((this.currentAuthed = !0), !this.gateReported))
            ((this.gateReported = !0), logFeatureOk("bg_rv_gate"));
        } else {
          if (!this.currentAuthed) this.noteUnauthedRejection();
          this.send({ type: "auth-rejected" });
        }
      return;
    }
    let n = r;
    if (this.authToken && !this.currentAuthed && n.type !== "repaint") {
      if (
        (logForDebugging(
          `[bg-rv] dropped ${typeof n.type === "string" ? n.type : "unknown"} from un-authed connection`,
          { level: "warn" },
        ),
        n.type !== "attacher-caps")
      )
        this.noteUnauthedRejection();
      this.send({ type: "reply-rejected" });
      return;
    }
    if (n.type === "shutdown") {
      shutdownBgSession(this.promptDraftFile, this.storageV5);
      return;
    }
    if (n.type === "repaint") {
      repaintForAttacher();
      return;
    }
    if (n.type === "attacher-caps") {
      this.handleAttacherCaps(n);
      return;
    }
    if (n.type === "reply" && typeof n.text === "string") enqueueNextTurnPrompt(n);
  }
  handleAttacherCaps(e) {
    if ((setAttacherCaps(e.caps), setRvSupervisorLinkLive(!0), e.caps)) noteAttachStamp(Date.now());
    else aon();
    if ((uAi(e.caps?.colorLevel), !e.caps)) this.restoreNativeBrowserEnv();
    else if (typeof e.caps.browser === "string") process.env.BROWSER = e.caps.browser;
    else delete process.env.BROWSER;
    if (e.caps?.systemTheme) setSystemTheme(e.caps.systemTheme);
  }
  async waitForInkMount(e) {
    for (let r = 0; !di().has(process.stdout); r++) {
      if (r >= 60 || this.current !== e) return !1;
      await sleep(500);
    }
    return !0;
  }
  async clearPreBootState() {
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    if (!(await this.waitForInkMount(this.current))) return;
    await withOwnJobStateWrite(async () => {
      let r = await readJobState(CLAUDE_JOB_DIR, this.storageV5);
      if (!r) return;
      if (!r.forkSourceAlive) {
        let o = forkMarkerFields(env.CLAUDE_CODE_RESUME_SOURCE_ALIVE);
        if (o) (await writeStateAtomic(CLAUDE_JOB_DIR, { ...r, ...o }, this.storageV5), Object.assign(r, o));
      }
      if (r.state === "working" && r.detail === SEED_DETAIL) this.armStartupWedgeWatchdog(CLAUDE_JOB_DIR);
      let n = (o) => {
        let s = KE.current();
        return o.tempo === "blocked" && isOverlayNeeds(o) && !(s?.overlay === !0 && s.text === o.needs);
      };
      if (n(r)) {
        let o = (await readJobState(CLAUDE_JOB_DIR, this.storageV5)) ?? r;
        if (!n(o)) return;
        (await writeStateAtomic(
          CLAUDE_JOB_DIR,
          {
            ...o,
            ...(PRE_BOOT_STATES.includes(o.state) && { state: "running" }),
            tempo: "idle",
            needs: void 0,
            needsOverlay: void 0,
            block: void 0,
            updatedAt: new Date().toISOString(),
          },
          this.storageV5,
        ),
          this.send({
            type: "state",
            patch: {
              ...(PRE_BOOT_STATES.includes(o.state) && { state: "running" }),
              tempo: "idle",
              needs: "",
            },
          }));
        return;
      }
      if (!PRE_BOOT_STATES.includes(r.state)) return;
      if (r.tempo === "blocked") return;
      (await writeStateAtomic(
        CLAUDE_JOB_DIR,
        { ...r, state: "running", tempo: "idle", updatedAt: new Date().toISOString() },
        this.storageV5,
      ),
        this.send({ type: "state", patch: { state: "running", tempo: "idle" } }));
    });
  }
  armStartupWedgeWatchdog(e) {
    if (this.wedgeDisarmed) return;
    clearTimeout(this.wedgeTimer);
    let r = env.CLAUDE_BG_STARTUP_WEDGE_MS || 45000;
    ((this.wedgeTimer = setTimeout((n) => this.onStartupWedgeTimeout(n), r, e)), this.wedgeTimer.unref());
  }
  disarmStartupWedgeWatchdog() {
    ((this.wedgeDisarmed = !0), clearTimeout(this.wedgeTimer), (this.wedgeTimer = void 0));
  }
  onStartupWedgeTimeout(e) {
    readJobState(e, this.storageV5)
      .then(async (r) => {
        if (this.wedgeDisarmed || r?.state !== "working" || r.detail !== SEED_DETAIL || r.tempo === "blocked")
          return;
        (await writeStateAtomic(
          e,
          { ...r, tempo: "blocked", detail: h, needs: f, updatedAt: new Date().toISOString() },
          this.storageV5,
        ),
          this.send({ type: "state", patch: { tempo: "blocked", detail: h, needs: f } }));
      })
      .catch((r) => {
        if (!isENOENT(r)) logJobWriteError(r);
      });
  }
  async restorePromptDraft() {
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    let r = join(CLAUDE_JOB_DIR, PromptDraftWriter.NAME),
      n = await readSmallFileOrNull(r, 4 * PromptDraftWriter.MAX_BYTES);
    if (n === null) return;
    await unlink(r).catch(() => {});
    let o = normalizeStashText(n);
    if (!o) return;
    if (!hasEarlyInput()) seedEarlyInput(o);
    if (!(await this.waitForInkMount(this.current))) return;
    if (this.promptInput.getState().value === "") setPromptValue(this.promptInput, o);
  }
}
//@ chunk-fd653dqq.js:8372-8394 placement
class T {
  server = void 0;
}
//@ chunk-fd653dqq.js:8394-8417 placement
var G = new HostScoped(() => new T());
//@ chunk-fd653dqq.js:8417-8441 placement
function O() {
  return getRootSession();
}
//@ chunk-fd653dqq.js:8441-8470 placement
function w() {
  return O().host;
}
//@ chunk-fd653dqq.js:8470-8500 placement
function v() {
  return G.of(w());
}
//@ chunk-fd653dqq.js:8500-9115 placement
async function startRendezvousServer(e) {
  let CLAUDE_BG_RENDEZVOUS_SOCK = env.CLAUDE_BG_RENDEZVOUS_SOCK,
    n = v();
  if (!CLAUDE_BG_RENDEZVOUS_SOCK || n.server) return;
  let BROWSER = env.BROWSER,
    s = [];
  (h5s((c) => {
    let y = { type: "interactive-mark", ...c };
    if (sendRv(y)) return !0;
    return (s.push(y), !0);
  }),
    delete process.env.CLAUDE_BG_RENDEZVOUS_SOCK);
  let CLAUDE_BG_RV_AUTH = env.CLAUDE_BG_RV_AUTH;
  delete process.env.CLAUDE_BG_RV_AUTH;
  let CLAUDE_BG_SOCKET_TOKENS_PATH = env.CLAUDE_BG_SOCKET_TOKENS_PATH;
  if ((delete process.env.CLAUDE_BG_SOCKET_TOKENS_PATH, CLAUDE_BG_SOCKET_TOKENS_PATH)) {
    let c = await readSessionAuthFile(CLAUDE_BG_SOCKET_TOKENS_PATH);
    if (c?.rvAuth) CLAUDE_BG_RV_AUTH = c.rvAuth;
    await unlink(CLAUDE_BG_SOCKET_TOKENS_PATH).catch(() => {});
  }
  let x =
    env.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS === "1" || (!CLAUDE_BG_RV_AUTH && !CLAUDE_BG_SOCKET_TOKENS_PATH);
  (await unlink(CLAUDE_BG_RENDEZVOUS_SOCK).catch(() => {}),
    (n.server = new RendezvousClient(CLAUDE_BG_RENDEZVOUS_SOCK, CLAUDE_BG_RV_AUTH, x, BROWSER, s, e)));
  let server = n.server;
  registerCleanup(() => server.promptStash.flush());
}
//@ chunk-fd653dqq.js:9115-9162 placement
function sendRv(e) {
  return v().server?.send(e) ?? !1;
}
/**
 * 后台会话关闭：通知 rendezvous，拆除 REPL 桥（记录最后序号），运行清理并刷新草稿，最多等 5 秒后退出。
 */
//@ chunk-fd653dqq.js:9162-9494 placement
function shutdownBgSession(e, r) {
  sendRv({ type: "shutting-down" });
  let n = getReplBridgeHandle(),
    o = [e.follow()];
  if (n) {
    let lastSequenceNum = n.getLastSequenceNum();
    n.teardown({ skipArchive: !0 }).catch(() => {});
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (CLAUDE_JOB_DIR && lastSequenceNum > 0)
      o.push(recordBridgeSessionSeq(CLAUDE_JOB_DIR, lastSequenceNum, r).catch(() => {}));
  }
  (o.push(runCleanups()),
    Promise.race([
      Promise.all(o)
        .catch(() => {})
        .then(() => e.settled()),
      sleep(5000),
    ]).finally(() => {
      process.exit(0);
    }));
}
//@ chunk-fd653dqq.js:9494-9727 placement
function repaintForAttacher() {
  if (getAttacherCaps() !== null) noteAttachStamp(Date.now());
  if (!di().get(process.stdout)?.forceRedraw({ flushReact: !0 }))
    process.stdout.write(
      ERASE_SCREEN +
        CURSOR_HOME +
        `
  \x1B[2mSession can't redraw right now \u2014 Ctrl+Z to detach\x1B[0m
`,
    );
  sendRv({ type: "repaint-done" });
}
//@ chunk-fd653dqq.js:9727-10318 placement
function enqueueNextTurnPrompt(e) {
  if (e.nextTurn === !0) {
    (enqueueCommand({
      agentId: mainAgentId(),
      mode: "prompt",
      value: e.text,
      priority: "next",
      origin: { kind: "human" },
      skipSlashCommands: !0,
    }),
      recordSubmitTime(),
      logForDebugging(`[bg-rv] enqueued next-turn prompt: ${e.text.slice(0, 80)}`));
    return;
  }
  if (R(w(), e.text)) {
    logForDebugging(`[bg-rv] peer reply answered question: ${e.text.slice(0, 80)}`);
    return;
  }
  if (runRvCommand(w(), e.text)) {
    logForDebugging(`[bg-rv] peer reply ran at once: ${e.text.slice(0, 80)}`);
    return;
  }
  let r = getModeFromInput(e.text);
  if (
    (enqueueCommand({
      agentId: mainAgentId(),
      mode: r,
      value: stripModePrefix(e.text),
      priority: "next",
      origin: { kind: "human" },
    }),
    r === "prompt" && !e.text.trim().startsWith("/"))
  )
    recordSubmitTime();
  logForDebugging(`[bg-rv] enqueued reply: ${e.text.slice(0, 80)}`);
}
//@ chunk-fd653dqq.js:10318-10392 placement
var h = "stuck on a startup dialog",
  f = "open this session to continue setup";
//@ chunk-fd653dqq.js:10392-10448 placement
function disarmStartupWedgeWatchdog() {
  v().server?.disarmStartupWedgeWatchdog();
}
/**
 * 把作业状态改为 blocked 并写入需要的输入（已是同一需求返回 already，被其他需求占用返回 refused），同步给 rendezvous，返回之前的状态。
 */
//@ chunk-fd653dqq.js:10448-10866 placement
async function markJobBlocked(e, r, n, o) {
  let s = await readJobState(e, o);
  if (!s) return { kind: "refused" };
  if (s.tempo === "blocked" && s.needs === r) return { kind: "already" };
  if (s.tempo === "blocked" && s.needs !== IDLE_NEEDS) return { kind: "refused" };
  return (
    await writeStateAtomic(
      e,
      { ...s, tempo: "blocked", detail: n, needs: r, updatedAt: new Date().toISOString() },
      o,
    ),
    sendRv({ type: "state", patch: { tempo: "blocked", detail: n, needs: r } }),
    { kind: "wrote", prior: { tempo: s.tempo, needs: s.needs, detail: s.detail } }
  );
}
//@ chunk-fd653dqq.js:10866-11092 placement
async function restoreJobFromBlocked(e, r, n, o) {
  let s = await readJobState(e, o);
  if (!s || s.tempo !== "blocked" || s.needs !== r) return;
  (await writeStateAtomic(e, { ...s, ...n, updatedAt: new Date().toISOString() }, o),
    sendRv({ type: "state", patch: { tempo: n.tempo, needs: n.needs, detail: n.detail } }));
}
//@ chunk-fd653dqq.js:11092-11261 placement
async function markStartupDialogBlocked(e, r) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || v().server?.wedgeDisarmed) return;
  let o = e ? `${h} (${e})` : h,
    s = await markJobBlocked(CLAUDE_JOB_DIR, f, o, r);
  return s.kind === "wrote" ? s.prior : void 0;
}
//@ chunk-fd653dqq.js:11261-11338 placement
async function clearStartupDialogBlocked(e, r) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR) return;
  await restoreJobFromBlocked(CLAUDE_JOB_DIR, f, e, r);
}
//@ chunk-fd653dqq.js:11338-11443 placement
async function markCommandParkBlocked(e, r, n) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR) return { kind: "refused" };
  return withOwnJobStateWrite(() => markJobBlocked(CLAUDE_JOB_DIR, e, r, n));
}
//@ chunk-fd653dqq.js:11443-11531 placement
async function clearCommandParkBlocked(e, r, n) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR) return;
  await withOwnJobStateWrite(() => restoreJobFromBlocked(CLAUDE_JOB_DIR, e, r, n));
}
//@ chunk-fd653dqq.js:11531-12162 placement
async function markReplayNoOp(e) {
  let r = env.CLAUDE_CODE_SESSION_KIND === "bg" ? env.CLAUDE_JOB_DIR : void 0,
    n = r ?? getBgTakeover()?.jobDir;
  if (!n) return;
  let o = await readJobState(n, e);
  if (
    o?.replayOwed === !0 &&
    (await withOwnJobStateWrite(async () => {
      invalidateJobStateCache(n);
      let a = await readJobState(n, e);
      if (a?.replayOwed !== !0 || a.tempo !== "active" || !isTerminal(a.state)) return !1;
      return writeStateAtomic(
        n,
        { ...a, tempo: "idle", replayOwed: void 0, updatedAt: new Date().toISOString() },
        e,
      ).then(
        () => !0,
        (u) => (logJobWriteError(u), !1),
      );
    }))
  ) {
    sendRv({ type: "state", patch: { tempo: "idle" } });
    return;
  }
  if (!r || !o || o.state !== "working" || o.tempo !== "active") return;
  (await writeStateAtomic(
    n,
    { ...o, tempo: "blocked", needs: IDLE_NEEDS, updatedAt: new Date().toISOString() },
    e,
  ),
    sendRv({ type: "state", patch: { tempo: "blocked", needs: IDLE_NEEDS } }));
}
//@ chunk-fd653dqq.js:12162-12318 placement
async function recordBridgeSessionSeq(e, r, n) {
  let o = await readJobState(e, n);
  if (!o || o.bridgeSessionSeq === r) return;
  await writeStateAtomic(e, { ...o, bridgeSessionSeq: r, updatedAt: new Date().toISOString() }, n);
}

export {
  sendRv,
  markReplayNoOp,
  ion,
  Jwo,
  markCommandParkBlocked,
  clearCommandParkBlocked,
  disarmStartupWedgeWatchdog,
};
