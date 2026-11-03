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
import { join } from "path";
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
import { promptInputStoreFor, setPromptValue } from "../../state/promptInputStore.js";
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
import { noteAttachStamp, markDetachedSinceAttach } from "../../utils/attachStamp.js";
import { clampForAttacher } from "../../ink/colorize.js";
import { setSystemTheme } from "../../utils/systemTheme.js";
import { getSecondRootError } from "../../ink/terminal.js";
import { sleep } from "../../utils/sleep.js";
import { forkMarkerFields, setRecoverySender } from "../../utils/conversationRecovery.js";
import { attentionRegistryStore } from "../../components/fleet/sessionAttention.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { hasEarlyInput, seedEarlyInput } from "../../utils/earlyInput.js";
import { registerCleanup, runCleanups } from "../../utils/cleanupRegistry.js";
import { getReplBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { ERASE_SCREEN, CURSOR_HOME } from "../../ink/termio/csi.js";
import { enqueueCommand } from "../../utils/messageQueueManager.js";
import { getModeFromInput, stripModePrefix } from "../../components/PromptInput/inputModes.js";
import { getBgTakeover } from "../../utils/concurrentSessions.js";

//@ chunk-fd653dqq.js:1305-1364 placement
/**
 * 按宿主保存的 rendezvous 命令解析器状态。
 */
class RendezvousResolverState {
  resolver = null;
  registerResolver(resolver) {
    this.resolver = resolver;
  }
}
//@ chunk-fd653dqq.js:1364-1387 placement
/**
 * rendezvous 解析器状态的宿主作用域单例。
 */
var rendezvousResolverState = new HostScoped(() => new RendezvousResolverState());
//@ chunk-fd653dqq.js:1387-1433 placement
/**
 * 注册当前宿主的 rendezvous 命令解析器。
 */
function registerRendezvousResolver(host, r) {
  rendezvousResolverState.of(host).registerResolver(r);
}
//@ chunk-fd653dqq.js:1433-1482 placement
/**
 * 调用当前宿主的 rendezvous 命令解析器（未注册返回 false）。
 */
function resolveRendezvousCommand(rootHost, text) {
  return rendezvousResolverState.of(rootHost).resolver?.(text) ?? false;
}
//@ chunk-fd653dqq.js:1482-1535 placement
/**
 * 按宿主保存的 rendezvous 命令执行器状态。
 */
class RendezvousRunnerState {
  runner = null;
  registerRunner(runner) {
    this.runner = runner;
  }
}
//@ chunk-fd653dqq.js:1535-1558 placement
/**
 * rendezvous 执行器状态的宿主作用域单例。
 */
var rendezvousRunnerState = new HostScoped(() => new RendezvousRunnerState());
//@ chunk-fd653dqq.js:1558-1602 placement
/**
 * 注册当前宿主的 rendezvous 命令执行器。
 */
function registerRendezvousRunner(host, r) {
  rendezvousRunnerState.of(host).registerRunner(r);
}
//@ chunk-fd653dqq.js:1602-1751 placement
function runRvCommand(rootHost, text) {
  try {
    return rendezvousRunnerState.of(rootHost).runner?.(text) ?? false;
  } catch (error) {
    logForDebugging(`[bg-rv] command runner threw, queueing the reply: ${errorMessage(error)}`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-fd653dqq.js:1812-2499 placement
/**
 * 把输入框草稿跟随写入作业目录的 .prompt-draft（≤256 KB）；草稿为空或用户已返回时删除文件；写入串行化，settled 等待全部写完。
 */
class PromptDraftWriter {
  static NAME = ".prompt-draft";
  static MAX_BYTES = 262144;
  #t;
  #r;
  #e = Promise.resolve();
  #n;
  constructor(promptInput) {
    this.#t = promptInput;
  }
  follow() {
    this.#n ??= this.#t.subscribe(this.#s);
    return this.#o();
  }
  settled() {
    return this.#i(this.#e);
  }
  dispose() {
    this.#n?.();
    this.#n = undefined;
  }
  #s = () => {
    let { value: e, cameBack } = this.#t.getState();
    if (e !== this.#r?.value || cameBack !== this.#r.cameBack) this.#o();
  };
  #o(e = env.CLAUDE_JOB_DIR) {
    this.#r = this.#t.getState();
    if (e) this.#e = this.#e.then(() => this.#a(e)).catch(logJobWriteError);
    return this.#e;
  }
  #a(e) {
    let { value: r, cameBack } = this.#t.getState();
    let o = join(e, PromptDraftWriter.NAME);
    return r !== "" && !cameBack
      ? replaceFileExclusive(o, truncateToLength(r, PromptDraftWriter.MAX_BYTES))
      : rm(o, {
          force: true,
        }).catch((error) => {
          logJobWriteError(error);
          return replaceFileExclusive(o, "");
        });
  }
  async #i(e) {
    await e;
    return e === this.#e ? undefined : this.#i(this.#e);
  }
}
//@ chunk-fd653dqq.js:2499-2514 placement
/**
 * 静默对端超时的默认毫秒数（5000）。
 */
var MAX_UNAUTH_DROPS = 3;
var DEFAULT_SILENT_PEER_TIMEOUT_MS = 5000;
//@ chunk-fd653dqq.js:2514-8372 placement
/**
 * 后台会话会合点客户端：心跳、服务端错误、下一轮提示排队
 */
class RendezvousClient {
  server;
  current = undefined;
  heartbeat;
  wedgeTimer = undefined;
  wedgeDisarmed = false;
  authToken;
  currentAuthed = false;
  unadmitted = new Set();
  admitOnAccept;
  silentPeerTimeoutMs = env.CLAUDE_BG_SILENT_PEER_TIMEOUT_MS || DEFAULT_SILENT_PEER_TIMEOUT_MS;
  unauthedDrops = 0;
  gateReported = false;
  nativeBrowserEnv;
  pendingInteractiveMarks;
  storageV5;
  promptInput = promptInputStoreFor(getRootSessionRef());
  promptDraftFile = new PromptDraftWriter(this.promptInput);
  promptStash = new PromptStash(this.promptInput);
  constructor(e, authToken, admitOnAccept, nativeBrowserEnv, pendingInteractiveMarks, storageV5) {
    this.authToken = authToken;
    this.admitOnAccept = admitOnAccept;
    this.storageV5 = storageV5;
    this.nativeBrowserEnv = nativeBrowserEnv;
    this.pendingInteractiveMarks = pendingInteractiveMarks;
    this.server = createServer((u) => this.onConnection(u));
    this.server.on("error", (u) =>
      logForDebugging(`[bg-rv] server error: ${String(u)}`, {
        level: "warn",
      }),
    );
    this.server.listen(e);
    this.server.unref();
    this.heartbeat = setInterval(
      () =>
        this.send({
          type: "heartbeat",
        }),
      30000,
    );
    this.heartbeat.unref();
  }
  admit(e) {
    e.setTimeout(0);
    this.current?.destroy();
    this.current = e;
    this.currentAuthed = false;
    setRvSupervisorLinkLive(false);
    while (this.pendingInteractiveMarks.length > 0) {
      let r = this.pendingInteractiveMarks[0];
      if (r === undefined || !this.send(r)) break;
      this.pendingInteractiveMarks.shift();
    }
    this.unauthedDrops = 0;
    this.gateReported = false;
    this.clearPreBootState().catch((error) => {
      if (!isENOENT(error)) logJobWriteError(error);
    });
    this.restorePromptDraft().catch(() => {});
    this.promptStash.restore().catch(logError);
    e.once("close", () => {
      if (this.current === e) {
        this.current = undefined;
        setRvSupervisorLinkLive(false);
      }
    });
  }
  onConnection(e) {
    e.on("error", () => e.destroy());
    if (this.admitOnAccept) this.admit(e);
    else {
      this.unadmitted.add(e);
      e.once("close", () => this.unadmitted.delete(e));
      e.setTimeout(this.silentPeerTimeoutMs, () => {
        logForDebugging(`[bg-rv] closed a connection that wrote nothing in ${this.silentPeerTimeoutMs}ms`);
        e.destroy();
      });
    }
    let r = "";
    let n = new StringDecoder("utf8");
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
        r = r.slice(s + 1);
        if (sliced) {
          if (this.unadmitted.delete(e)) this.admit(e);
          this.handleLine(sliced);
        }
      }
      if (r.length > 1048576) {
        r = "";
        e.destroy();
      }
    });
  }
  stop() {
    clearInterval(this.heartbeat);
    clearTimeout(this.wedgeTimer);
    this.wedgeTimer = undefined;
    this.current?.destroy();
    this.current = undefined;
    for (let e of this.unadmitted) e.destroy();
    this.unadmitted.clear();
    setRvSupervisorLinkLive(false);
    this.restoreNativeBrowserEnv();
    this.promptDraftFile.dispose();
    this.promptStash.dispose();
    this.server.close();
  }
  send(e) {
    if (!this.current || this.current.destroyed) return false;
    try {
      this.current.write(
        jsonStringify(e) +
          `
`,
      );
      return true;
    } catch {
      return false;
    }
  }
  noteUnauthedRejection() {
    this.unauthedDrops++;
    if (!this.gateReported && this.unauthedDrops >= MAX_UNAUTH_DROPS) {
      this.gateReported = true;
      logFeatureBad("bg_rv_gate", "unauthed_drops");
    }
  }
  restoreNativeBrowserEnv() {
    if (this.nativeBrowserEnv === undefined) delete process.env.BROWSER;
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
          this.currentAuthed = true;
          if (!this.gateReported) {
            this.gateReported = true;
            logFeatureOk("bg_rv_gate");
          }
        } else {
          if (!this.currentAuthed) this.noteUnauthedRejection();
          this.send({
            type: "auth-rejected",
          });
        }
      return;
    }
    let n = r;
    if (this.authToken && !this.currentAuthed && n.type !== "repaint") {
      logForDebugging(
        `[bg-rv] dropped ${typeof n.type === "string" ? n.type : "unknown"} from un-authed connection`,
        {
          level: "warn",
        },
      );
      if (n.type !== "attacher-caps") this.noteUnauthedRejection();
      this.send({
        type: "reply-rejected",
      });
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
    setAttacherCaps(e.caps);
    setRvSupervisorLinkLive(true);
    if (e.caps) noteAttachStamp(Date.now());
    else markDetachedSinceAttach();
    clampForAttacher(e.caps?.colorLevel);
    if (!e.caps) this.restoreNativeBrowserEnv();
    else if (typeof e.caps.browser === "string") process.env.BROWSER = e.caps.browser;
    else delete process.env.BROWSER;
    if (e.caps?.systemTheme) setSystemTheme(e.caps.systemTheme);
  }
  async waitForInkMount(e) {
    for (let idx = 0; !getSecondRootError().has(process.stdout); idx++) {
      if (idx >= 60 || this.current !== e) return false;
      await sleep(500);
    }
    return true;
  }
  async clearPreBootState() {
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    if (!(await this.waitForInkMount(this.current))) return;
    await withOwnJobStateWrite(async () => {
      let jobState = await readJobState(CLAUDE_JOB_DIR, this.storageV5);
      if (!jobState) return;
      if (!jobState.forkSourceAlive) {
        let o = forkMarkerFields(env.CLAUDE_CODE_RESUME_SOURCE_ALIVE);
        if (o) {
          await writeStateAtomic(
            CLAUDE_JOB_DIR,
            {
              ...jobState,
              ...o,
            },
            this.storageV5,
          );
          Object.assign(jobState, o);
        }
      }
      if (jobState.state === "working" && jobState.detail === SEED_DETAIL)
        this.armStartupWedgeWatchdog(CLAUDE_JOB_DIR);
      let n = (o) => {
        let s = attentionRegistryStore.current();
        return o.tempo === "blocked" && isOverlayNeeds(o) && !(s?.overlay === true && s.text === o.needs);
      };
      if (n(jobState)) {
        let o = (await readJobState(CLAUDE_JOB_DIR, this.storageV5)) ?? jobState;
        if (!n(o)) return;
        await writeStateAtomic(
          CLAUDE_JOB_DIR,
          {
            ...o,
            ...(PRE_BOOT_STATES.includes(o.state) && {
              state: "running",
            }),
            tempo: "idle",
            needs: undefined,
            needsOverlay: undefined,
            block: undefined,
            updatedAt: new Date().toISOString(),
          },
          this.storageV5,
        );
        this.send({
          type: "state",
          patch: {
            ...(PRE_BOOT_STATES.includes(o.state) && {
              state: "running",
            }),
            tempo: "idle",
            needs: "",
          },
        });
        return;
      }
      if (!PRE_BOOT_STATES.includes(jobState.state)) return;
      if (jobState.tempo === "blocked") return;
      await writeStateAtomic(
        CLAUDE_JOB_DIR,
        {
          ...jobState,
          state: "running",
          tempo: "idle",
          updatedAt: new Date().toISOString(),
        },
        this.storageV5,
      );
      this.send({
        type: "state",
        patch: {
          state: "running",
          tempo: "idle",
        },
      });
    });
  }
  armStartupWedgeWatchdog(e) {
    if (this.wedgeDisarmed) return;
    clearTimeout(this.wedgeTimer);
    let CLAUDE_BG_STARTUP_WEDGE_MS = env.CLAUDE_BG_STARTUP_WEDGE_MS || 45000;
    this.wedgeTimer = setTimeout((n) => this.onStartupWedgeTimeout(n), CLAUDE_BG_STARTUP_WEDGE_MS, e);
    this.wedgeTimer.unref();
  }
  disarmStartupWedgeWatchdog() {
    this.wedgeDisarmed = true;
    clearTimeout(this.wedgeTimer);
    this.wedgeTimer = undefined;
  }
  onStartupWedgeTimeout(e) {
    readJobState(e, this.storageV5)
      .then(async (jobState) => {
        if (
          this.wedgeDisarmed ||
          jobState?.state !== "working" ||
          jobState.detail !== SEED_DETAIL ||
          jobState.tempo === "blocked"
        )
          return;
        await writeStateAtomic(
          e,
          {
            ...jobState,
            tempo: "blocked",
            detail: BLOCKED_STUCK_DIALOG_DETAIL,
            needs: BLOCKED_STUCK_DIALOG_NEEDS,
            updatedAt: new Date().toISOString(),
          },
          this.storageV5,
        );
        this.send({
          type: "state",
          patch: {
            tempo: "blocked",
            detail: BLOCKED_STUCK_DIALOG_DETAIL,
            needs: BLOCKED_STUCK_DIALOG_NEEDS,
          },
        });
      })
      .catch((error) => {
        if (!isENOENT(error)) logJobWriteError(error);
      });
  }
  async restorePromptDraft() {
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    let r = join(CLAUDE_JOB_DIR, PromptDraftWriter.NAME);
    let smallFileOrNull = await readSmallFileOrNull(r, 4 * PromptDraftWriter.MAX_BYTES);
    if (smallFileOrNull === null) return;
    await unlink(r).catch(() => {});
    let o = normalizeStashText(smallFileOrNull);
    if (!o) return;
    if (!hasEarlyInput()) seedEarlyInput(o);
    if (!(await this.waitForInkMount(this.current))) return;
    if (this.promptInput.getState().value === "") setPromptValue(this.promptInput, o);
  }
}
//@ chunk-fd653dqq.js:8372-8394 placement
/**
 * 按宿主保存的 rendezvous 服务端状态。
 */
class RendezvousServerState {
  server = undefined;
}
//@ chunk-fd653dqq.js:8394-8417 placement
/**
 * rendezvous 服务端状态的宿主作用域单例。
 */
var rendezvousServerState = new HostScoped(() => new RendezvousServerState());
//@ chunk-fd653dqq.js:8417-8441 placement
/**
 * 取当前根会话对象。
 */
function getRootSessionRef() {
  return getRootSession();
}
//@ chunk-fd653dqq.js:8441-8470 placement
/**
 * 取当前根会话对应的宿主标识。
 */
function getRootHost() {
  return getRootSessionRef().host;
}
//@ chunk-fd653dqq.js:8470-8500 placement
/**
 * 取当前宿主的 rendezvous 服务端状态。
 */
function getRendezvousServerState() {
  return rendezvousServerState.of(getRootHost());
}
//@ chunk-fd653dqq.js:8500-9115 placement
async function startRendezvousServer(storageV5) {
  let CLAUDE_BG_RENDEZVOUS_SOCK = env.CLAUDE_BG_RENDEZVOUS_SOCK;
  let rendezvousServerState = getRendezvousServerState();
  if (!CLAUDE_BG_RENDEZVOUS_SOCK || rendezvousServerState.server) return;
  let BROWSER = env.BROWSER;
  let pendingInteractiveMarks = [];
  setRecoverySender((c) => {
    let y = {
      type: "interactive-mark",
      ...c,
    };
    if (sendRv(y)) return true;
    pendingInteractiveMarks.push(y);
    return true;
  });
  delete process.env.CLAUDE_BG_RENDEZVOUS_SOCK;
  let CLAUDE_BG_RV_AUTH = env.CLAUDE_BG_RV_AUTH;
  delete process.env.CLAUDE_BG_RV_AUTH;
  let CLAUDE_BG_SOCKET_TOKENS_PATH = env.CLAUDE_BG_SOCKET_TOKENS_PATH;
  delete process.env.CLAUDE_BG_SOCKET_TOKENS_PATH;
  if (CLAUDE_BG_SOCKET_TOKENS_PATH) {
    let sessionAuthFile = await readSessionAuthFile(CLAUDE_BG_SOCKET_TOKENS_PATH);
    if (sessionAuthFile?.rvAuth) CLAUDE_BG_RV_AUTH = sessionAuthFile.rvAuth;
    await unlink(CLAUDE_BG_SOCKET_TOKENS_PATH).catch(() => {});
  }
  let admitOnAccept =
    env.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS === "1" || (!CLAUDE_BG_RV_AUTH && !CLAUDE_BG_SOCKET_TOKENS_PATH);
  await unlink(CLAUDE_BG_RENDEZVOUS_SOCK).catch(() => {});
  rendezvousServerState.server = new RendezvousClient(
    CLAUDE_BG_RENDEZVOUS_SOCK,
    CLAUDE_BG_RV_AUTH,
    admitOnAccept,
    BROWSER,
    pendingInteractiveMarks,
    storageV5,
  );
  let server = rendezvousServerState.server;
  registerCleanup(() => server.promptStash.flush());
}
//@ chunk-fd653dqq.js:9115-9162 placement
function sendRv(e) {
  return getRendezvousServerState().server?.send(e) ?? false;
}
//@ chunk-fd653dqq.js:9162-9494 placement
/**
 * 后台会话关闭：通知 rendezvous，拆除 REPL 桥（记录最后序号），运行清理并刷新草稿，最多等 5 秒后退出。
 */
function shutdownBgSession(promptDraftFile, storageV5) {
  sendRv({
    type: "shutting-down",
  });
  let replBridgeHandle = getReplBridgeHandle();
  let o = [promptDraftFile.follow()];
  if (replBridgeHandle) {
    let lastSequenceNum = replBridgeHandle.getLastSequenceNum();
    replBridgeHandle
      .teardown({
        skipArchive: true,
      })
      .catch(() => {});
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (CLAUDE_JOB_DIR && lastSequenceNum > 0)
      o.push(recordBridgeSessionSeq(CLAUDE_JOB_DIR, lastSequenceNum, storageV5).catch(() => {}));
  }
  o.push(runCleanups());
  Promise.race([
    Promise.all(o)
      .catch(() => {})
      .then(() => promptDraftFile.settled()),
    sleep(5000),
  ]).finally(() => {
    process.exit(0);
  });
}
//@ chunk-fd653dqq.js:9494-9727 placement
function repaintForAttacher() {
  if (getAttacherCaps() !== null) noteAttachStamp(Date.now());
  if (
    !getSecondRootError().get(process.stdout)?.forceRedraw({
      flushReact: true,
    })
  )
    process.stdout.write(
      ERASE_SCREEN +
        CURSOR_HOME +
        `
  \x1B[2mSession can't redraw right now \u2014 Ctrl+Z to detach\x1B[0m
`,
    );
  sendRv({
    type: "repaint-done",
  });
}
//@ chunk-fd653dqq.js:9727-10318 placement
function enqueueNextTurnPrompt(e) {
  if (e.nextTurn === true) {
    enqueueCommand({
      agentId: mainAgentId(),
      mode: "prompt",
      value: e.text,
      priority: "next",
      origin: {
        kind: "human",
      },
      skipSlashCommands: true,
    });
    recordSubmitTime();
    logForDebugging(`[bg-rv] enqueued next-turn prompt: ${e.text.slice(0, 80)}`);
    return;
  }
  if (resolveRendezvousCommand(getRootHost(), e.text)) {
    logForDebugging(`[bg-rv] peer reply answered question: ${e.text.slice(0, 80)}`);
    return;
  }
  if (runRvCommand(getRootHost(), e.text)) {
    logForDebugging(`[bg-rv] peer reply ran at once: ${e.text.slice(0, 80)}`);
    return;
  }
  let modeFromInput = getModeFromInput(e.text);
  enqueueCommand({
    agentId: mainAgentId(),
    mode: modeFromInput,
    value: stripModePrefix(e.text),
    priority: "next",
    origin: {
      kind: "human",
    },
  });
  if (modeFromInput === "prompt" && !e.text.trim().startsWith("/")) recordSubmitTime();
  logForDebugging(`[bg-rv] enqueued reply: ${e.text.slice(0, 80)}`);
}
//@ chunk-fd653dqq.js:10318-10392 placement
/**
 * 会话卡在启动对话框时作业状态的 needs 文案。
 */
var BLOCKED_STUCK_DIALOG_DETAIL = "stuck on a startup dialog";
var BLOCKED_STUCK_DIALOG_NEEDS = "open this session to continue setup";
//@ chunk-fd653dqq.js:10392-10448 placement
function disarmStartupWedgeWatchdog() {
  getRendezvousServerState().server?.disarmStartupWedgeWatchdog();
}
//@ chunk-fd653dqq.js:10448-10866 placement
/**
 * 把作业状态改为 blocked 并写入需要的输入（已是同一需求返回 already，被其他需求占用返回 refused），同步给 rendezvous，返回之前的状态。
 */
async function markJobBlocked(e, r, detail, o) {
  let jobState = await readJobState(e, o);
  if (!jobState)
    return {
      kind: "refused",
    };
  if (jobState.tempo === "blocked" && jobState.needs === r)
    return {
      kind: "already",
    };
  if (jobState.tempo === "blocked" && jobState.needs !== IDLE_NEEDS)
    return {
      kind: "refused",
    };
  await writeStateAtomic(
    e,
    {
      ...jobState,
      tempo: "blocked",
      detail,
      needs: r,
      updatedAt: new Date().toISOString(),
    },
    o,
  );
  sendRv({
    type: "state",
    patch: {
      tempo: "blocked",
      detail,
      needs: r,
    },
  });
  return {
    kind: "wrote",
    prior: {
      tempo: jobState.tempo,
      needs: jobState.needs,
      detail: jobState.detail,
    },
  };
}
//@ chunk-fd653dqq.js:10866-11092 placement
async function restoreJobFromBlocked(e, r, n, o) {
  let jobState = await readJobState(e, o);
  if (!jobState || jobState.tempo !== "blocked" || jobState.needs !== r) return;
  await writeStateAtomic(
    e,
    {
      ...jobState,
      ...n,
      updatedAt: new Date().toISOString(),
    },
    o,
  );
  sendRv({
    type: "state",
    patch: {
      tempo: n.tempo,
      needs: n.needs,
      detail: n.detail,
    },
  });
}
//@ chunk-fd653dqq.js:11092-11261 placement
async function markStartupDialogBlocked(e, r) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || getRendezvousServerState().server?.wedgeDisarmed) return;
  let detail = e ? `${BLOCKED_STUCK_DIALOG_DETAIL} (${e})` : BLOCKED_STUCK_DIALOG_DETAIL;
  let s = await markJobBlocked(CLAUDE_JOB_DIR, BLOCKED_STUCK_DIALOG_NEEDS, detail, r);
  return s.kind === "wrote" ? s.prior : undefined;
}
//@ chunk-fd653dqq.js:11261-11338 placement
async function clearStartupDialogBlocked(e, r) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR) return;
  await restoreJobFromBlocked(CLAUDE_JOB_DIR, BLOCKED_STUCK_DIALOG_NEEDS, e, r);
}
//@ chunk-fd653dqq.js:11338-11443 placement
async function markCommandParkBlocked(e, detail, n) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR)
    return {
      kind: "refused",
    };
  return withOwnJobStateWrite(() => markJobBlocked(CLAUDE_JOB_DIR, e, detail, n));
}
//@ chunk-fd653dqq.js:11443-11531 placement
async function clearCommandParkBlocked(e, prior, storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR) return;
  await withOwnJobStateWrite(() => restoreJobFromBlocked(CLAUDE_JOB_DIR, e, prior, storageV5));
}
//@ chunk-fd653dqq.js:11531-12162 placement
async function markReplayNoOp(e) {
  let CLAUDE_JOB_DIR = env.CLAUDE_CODE_SESSION_KIND === "bg" ? env.CLAUDE_JOB_DIR : undefined;
  let n = CLAUDE_JOB_DIR ?? getBgTakeover()?.jobDir;
  if (!n) return;
  let jobState = await readJobState(n, e);
  if (
    jobState?.replayOwed === true &&
    (await withOwnJobStateWrite(async () => {
      invalidateJobStateCache(n);
      let jobState = await readJobState(n, e);
      if (jobState?.replayOwed !== true || jobState.tempo !== "active" || !isTerminal(jobState.state))
        return false;
      return writeStateAtomic(
        n,
        {
          ...jobState,
          tempo: "idle",
          replayOwed: undefined,
          updatedAt: new Date().toISOString(),
        },
        e,
      ).then(
        () => true,
        (error) => {
          logJobWriteError(error);
          return false;
        },
      );
    }))
  ) {
    sendRv({
      type: "state",
      patch: {
        tempo: "idle",
      },
    });
    return;
  }
  if (!CLAUDE_JOB_DIR || !jobState || jobState.state !== "working" || jobState.tempo !== "active") return;
  await writeStateAtomic(
    n,
    {
      ...jobState,
      tempo: "blocked",
      needs: IDLE_NEEDS,
      updatedAt: new Date().toISOString(),
    },
    e,
  );
  sendRv({
    type: "state",
    patch: {
      tempo: "blocked",
      needs: IDLE_NEEDS,
    },
  });
}
//@ chunk-fd653dqq.js:12162-12318 placement
async function recordBridgeSessionSeq(e, r, n) {
  let jobState = await readJobState(e, n);
  if (!jobState || jobState.bridgeSessionSeq === r) return;
  await writeStateAtomic(
    e,
    {
      ...jobState,
      bridgeSessionSeq: r,
      updatedAt: new Date().toISOString(),
    },
    n,
  );
}
export {
  sendRv,
  markReplayNoOp,
  registerRendezvousResolver,
  registerRendezvousRunner,
  markCommandParkBlocked,
  clearCommandParkBlocked,
  disarmStartupWedgeWatchdog,
};
