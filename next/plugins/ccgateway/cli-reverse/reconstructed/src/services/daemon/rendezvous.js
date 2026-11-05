/**
 * services/daemon/rendezvous.ts
 *
 * 后台会话会合点客户端（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wyc3ddyy.js (31)
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
import { logError } from "../../utils/log.js";
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
import { enqueue } from "../../utils/messageQueueManager.js";
import { getModeFromInput, stripModePrefix } from "../../components/PromptInput/inputModes.js";
import { getBgTakeover } from "../../utils/concurrentSessions.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wyc3ddyy.js:1304-1363 placement
/**
 * 按宿主保存的 rendezvous 命令解析器状态。
 */
class RendezvousResolverState {
  resolver = null;
  registerResolver(resolver) {
    this.resolver = resolver;
  }
}
//@ chunk-wyc3ddyy.js:1363-1386 placement
/**
 * rendezvous 解析器状态的宿主作用域单例。
 */
var rendezvousResolverState; // deferred: uses RendezvousResolverState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wyc3ddyy.js:1363", () => {
  rendezvousResolverState = new HostScoped(() => new RendezvousResolverState());
});
//@ chunk-wyc3ddyy.js:1386-1432 placement
/**
 * 注册当前宿主的 rendezvous 命令解析器。
 */
function registerRendezvousResolver(host, resolver) {
  rendezvousResolverState.of(host).registerResolver(resolver);
}
//@ chunk-wyc3ddyy.js:1432-1481 placement
/**
 * 调用当前宿主的 rendezvous 命令解析器（未注册返回 false）。
 */
function resolveRendezvousCommand(rootHost, text) {
  return rendezvousResolverState.of(rootHost).resolver?.(text) ?? false;
}
//@ chunk-wyc3ddyy.js:1481-1534 placement
/**
 * 按宿主保存的 rendezvous 命令执行器状态。
 */
class RendezvousRunnerState {
  runner = null;
  registerRunner(runner) {
    this.runner = runner;
  }
}
//@ chunk-wyc3ddyy.js:1534-1557 placement
/**
 * rendezvous 执行器状态的宿主作用域单例。
 */
var rendezvousRunnerState; // deferred: uses RendezvousRunnerState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wyc3ddyy.js:1534", () => {
  rendezvousRunnerState = new HostScoped(() => new RendezvousRunnerState());
});
//@ chunk-wyc3ddyy.js:1557-1601 placement
/**
 * 注册当前宿主的 rendezvous 命令执行器。
 */
function registerRendezvousRunner(host, runner) {
  rendezvousRunnerState.of(host).registerRunner(runner);
}
//@ chunk-wyc3ddyy.js:1601-1750 placement
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
//@ chunk-wyc3ddyy.js:1811-2497 placement
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
    let { value, cameBack } = this.#t.getState();
    if (value !== this.#r?.value || cameBack !== this.#r.cameBack) this.#o();
  };
  #o(jobDir = env.CLAUDE_JOB_DIR) {
    this.#r = this.#t.getState();
    if (jobDir) this.#e = this.#e.then(() => this.#a(jobDir)).catch(logJobWriteError);
    return this.#e;
  }
  #a(jobDir) {
    let { value, cameBack } = this.#t.getState();
    let path = join(jobDir, PromptDraftWriter.NAME);
    return value !== "" && !cameBack
      ? replaceFileExclusive(path, truncateToLength(value, PromptDraftWriter.MAX_BYTES))
      : rm(path, {
          force: true,
        }).catch((error) => {
          logJobWriteError(error);
          return replaceFileExclusive(path, "");
        });
  }
  async #i(promise) {
    await promise;
    return promise === this.#e ? undefined : this.#i(this.#e);
  }
}
//@ chunk-wyc3ddyy.js:2497-2512 placement
/**
 * 静默对端超时的默认毫秒数（5000）。
 */
var MAX_UNAUTH_DROPS = 3;
var DEFAULT_SILENT_PEER_TIMEOUT_MS = 5000;
//@ chunk-wyc3ddyy.js:2512-8370 placement
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
  constructor(socketPath, authToken, admitOnAccept, nativeBrowserEnv, pendingInteractiveMarks, storageV5) {
    this.authToken = authToken;
    this.admitOnAccept = admitOnAccept;
    this.storageV5 = storageV5;
    this.nativeBrowserEnv = nativeBrowserEnv;
    this.pendingInteractiveMarks = pendingInteractiveMarks;
    this.server = createServer((socket) => this.onConnection(socket));
    this.server.on("error", (error) =>
      logForDebugging(`[bg-rv] server error: ${String(error)}`, {
        level: "warn",
      }),
    );
    this.server.listen(socketPath);
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
  admit(socket) {
    socket.setTimeout(0);
    this.current?.destroy();
    this.current = socket;
    this.currentAuthed = false;
    setRvSupervisorLinkLive(false);
    while (this.pendingInteractiveMarks.length > 0) {
      let mark = this.pendingInteractiveMarks[0];
      if (mark === undefined || !this.send(mark)) break;
      this.pendingInteractiveMarks.shift();
    }
    this.unauthedDrops = 0;
    this.gateReported = false;
    this.clearPreBootState().catch((error) => {
      if (!isENOENT(error)) logJobWriteError(error);
    });
    this.restorePromptDraft().catch(() => {});
    this.promptStash.restore().catch(logError);
    socket.once("close", () => {
      if (this.current === socket) {
        this.current = undefined;
        setRvSupervisorLinkLive(false);
      }
    });
  }
  onConnection(socket) {
    socket.on("error", () => socket.destroy());
    if (this.admitOnAccept) this.admit(socket);
    else {
      this.unadmitted.add(socket);
      socket.once("close", () => this.unadmitted.delete(socket));
      socket.setTimeout(this.silentPeerTimeoutMs, () => {
        logForDebugging(`[bg-rv] closed a connection that wrote nothing in ${this.silentPeerTimeoutMs}ms`);
        socket.destroy();
      });
    }
    let buffer = "";
    let decoder = new StringDecoder("utf8");
    socket.on("data", (data) => {
      if (this.current !== socket && !this.unadmitted.has(socket)) {
        socket.destroy();
        return;
      }
      buffer += decoder.write(data);
      let newlineIndex;
      while (
        (newlineIndex = buffer.indexOf(`
`)) >= 0
      ) {
        let sliced = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (sliced) {
          if (this.unadmitted.delete(socket)) this.admit(socket);
          this.handleLine(sliced);
        }
      }
      if (buffer.length > 1048576) {
        buffer = "";
        socket.destroy();
      }
    });
  }
  stop() {
    clearInterval(this.heartbeat);
    clearTimeout(this.wedgeTimer);
    this.wedgeTimer = undefined;
    this.current?.destroy();
    this.current = undefined;
    for (let socket of this.unadmitted) socket.destroy();
    this.unadmitted.clear();
    setRvSupervisorLinkLive(false);
    this.restoreNativeBrowserEnv();
    this.promptDraftFile.dispose();
    this.promptStash.dispose();
    this.server.close();
  }
  send(message) {
    if (!this.current || this.current.destroyed) return false;
    try {
      this.current.write(
        jsonStringify(message) +
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
  handleLine(line) {
    let parsed;
    try {
      parsed = jsonParse(line);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== "object") return;
    if ("role" in parsed) {
      if (this.authToken)
        if ("auth" in parsed && timingSafeEqualStrings(parsed.auth, this.authToken)) {
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
    let message = parsed;
    if (this.authToken && !this.currentAuthed && message.type !== "repaint") {
      logForDebugging(
        `[bg-rv] dropped ${typeof message.type === "string" ? message.type : "unknown"} from un-authed connection`,
        {
          level: "warn",
        },
      );
      if (message.type !== "attacher-caps") this.noteUnauthedRejection();
      this.send({
        type: "reply-rejected",
      });
      return;
    }
    if (message.type === "shutdown") {
      shutdownBgSession(this.promptDraftFile, this.storageV5);
      return;
    }
    if (message.type === "repaint") {
      repaintForAttacher();
      return;
    }
    if (message.type === "attacher-caps") {
      this.handleAttacherCaps(message);
      return;
    }
    if (message.type === "reply" && typeof message.text === "string") enqueueNextTurnPrompt(message);
  }
  handleAttacherCaps(message) {
    setAttacherCaps(message.caps);
    setRvSupervisorLinkLive(true);
    if (message.caps) noteAttachStamp(Date.now());
    else markDetachedSinceAttach();
    clampForAttacher(message.caps?.colorLevel);
    if (!message.caps) this.restoreNativeBrowserEnv();
    else if (typeof message.caps.browser === "string") process.env.BROWSER = message.caps.browser;
    else delete process.env.BROWSER;
    if (message.caps?.systemTheme) setSystemTheme(message.caps.systemTheme);
  }
  async waitForInkMount(socket) {
    for (let idx = 0; !getSecondRootError().has(process.stdout); idx++) {
      if (idx >= 60 || this.current !== socket) return false;
      await sleep(500);
    }
    return true;
  }
  async clearPreBootState() {
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (!CLAUDE_JOB_DIR) return;
    if (!(await this.waitForInkMount(this.current))) return;
    await withOwnJobStateWrite(async () => {
      let state = await readJobState(CLAUDE_JOB_DIR, this.storageV5);
      if (!state) return;
      if (!state.forkSourceAlive) {
        let markerFields = forkMarkerFields(env.CLAUDE_CODE_RESUME_SOURCE_ALIVE);
        if (markerFields) {
          await writeStateAtomic(
            CLAUDE_JOB_DIR,
            {
              ...state,
              ...markerFields,
            },
            this.storageV5,
          );
          Object.assign(state, markerFields);
        }
      }
      if (state.state === "working" && state.detail === SEED_DETAIL)
        this.armStartupWedgeWatchdog(CLAUDE_JOB_DIR);
      let shouldPrompt = (state) => {
        let attention = attentionRegistryStore.current();
        return (
          state.tempo === "blocked" &&
          isOverlayNeeds(state) &&
          !(attention?.overlay === true && attention.text === state.needs)
        );
      };
      if (shouldPrompt(state)) {
        let fresh = (await readJobState(CLAUDE_JOB_DIR, this.storageV5)) ?? state;
        if (!shouldPrompt(fresh)) return;
        await writeStateAtomic(
          CLAUDE_JOB_DIR,
          {
            ...fresh,
            ...(PRE_BOOT_STATES.includes(fresh.state) && {
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
            ...(PRE_BOOT_STATES.includes(fresh.state) && {
              state: "running",
            }),
            tempo: "idle",
            needs: "",
          },
        });
        return;
      }
      if (!PRE_BOOT_STATES.includes(state.state)) return;
      if (state.tempo === "blocked") return;
      await writeStateAtomic(
        CLAUDE_JOB_DIR,
        {
          ...state,
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
  armStartupWedgeWatchdog(jobDir) {
    if (this.wedgeDisarmed) return;
    clearTimeout(this.wedgeTimer);
    let CLAUDE_BG_STARTUP_WEDGE_MS = env.CLAUDE_BG_STARTUP_WEDGE_MS || 45000;
    this.wedgeTimer = setTimeout(
      (jobDir) => this.onStartupWedgeTimeout(jobDir),
      CLAUDE_BG_STARTUP_WEDGE_MS,
      jobDir,
    );
    this.wedgeTimer.unref();
  }
  disarmStartupWedgeWatchdog() {
    this.wedgeDisarmed = true;
    clearTimeout(this.wedgeTimer);
    this.wedgeTimer = undefined;
  }
  onStartupWedgeTimeout(jobDir) {
    readJobState(jobDir, this.storageV5)
      .then(async (jobState) => {
        if (
          this.wedgeDisarmed ||
          jobState?.state !== "working" ||
          jobState.detail !== SEED_DETAIL ||
          jobState.tempo === "blocked"
        )
          return;
        await writeStateAtomic(
          jobDir,
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
    let draftPath = join(CLAUDE_JOB_DIR, PromptDraftWriter.NAME);
    let text = await readSmallFileOrNull(draftPath, 4 * PromptDraftWriter.MAX_BYTES);
    if (text === null) return;
    await unlink(draftPath).catch(() => {});
    let draftText = normalizeStashText(text);
    if (!draftText) return;
    if (!hasEarlyInput()) seedEarlyInput(draftText);
    if (!(await this.waitForInkMount(this.current))) return;
    if (this.promptInput.getState().value === "") setPromptValue(this.promptInput, draftText);
  }
}
//@ chunk-wyc3ddyy.js:8370-8392 placement
/**
 * 按宿主保存的 rendezvous 服务端状态。
 */
class RendezvousServerState {
  server = undefined;
}
//@ chunk-wyc3ddyy.js:8392-8415 placement
/**
 * rendezvous 服务端状态的宿主作用域单例。
 */
var rendezvousServerState; // deferred: uses RendezvousServerState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wyc3ddyy.js:8392", () => {
  rendezvousServerState = new HostScoped(() => new RendezvousServerState());
});
//@ chunk-wyc3ddyy.js:8415-8439 placement
/**
 * 取当前根会话对象。
 */
function getRootSessionRef() {
  return getRootSession();
}
//@ chunk-wyc3ddyy.js:8439-8468 placement
/**
 * 取当前根会话对应的宿主标识。
 */
function getRootHost() {
  return getRootSessionRef().host;
}
//@ chunk-wyc3ddyy.js:8468-8498 placement
/**
 * 取当前宿主的 rendezvous 服务端状态。
 */
function getRendezvousServerState() {
  return rendezvousServerState.of(getRootHost());
}
//@ chunk-wyc3ddyy.js:8498-9113 placement
async function startRendezvousServer(storageV5) {
  let CLAUDE_BG_RENDEZVOUS_SOCK = env.CLAUDE_BG_RENDEZVOUS_SOCK;
  let rendezvousServerState = getRendezvousServerState();
  if (!CLAUDE_BG_RENDEZVOUS_SOCK || rendezvousServerState.server) return;
  let BROWSER = env.BROWSER;
  let pendingInteractiveMarks = [];
  setRecoverySender((mark) => {
    let frame = {
      type: "interactive-mark",
      ...mark,
    };
    if (sendRv(frame)) return true;
    pendingInteractiveMarks.push(frame);
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
//@ chunk-wyc3ddyy.js:9113-9160 placement
function sendRv(frame) {
  return getRendezvousServerState().server?.send(frame) ?? false;
}
//@ chunk-wyc3ddyy.js:9160-9524 placement
/**
 * 后台会话关闭：通知 rendezvous，拆除 REPL 桥（记录最后序号），运行清理并刷新草稿，最多等 5 秒后退出。
 */
function shutdownBgSession(promptDraftFile, storageV5) {
  sendRv({
    type: "shutting-down",
  });
  let replBridgeHandle = getReplBridgeHandle();
  let cleanups = [promptDraftFile.follow()];
  if (replBridgeHandle) {
    let seq = replBridgeHandle.getLastSequenceNum();
    replBridgeHandle
      .teardown({
        skipArchive: true,
      })
      .catch(() => {});
    let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
    if (CLAUDE_JOB_DIR && seq > 0)
      cleanups.push(recordBridgeSessionSeq(CLAUDE_JOB_DIR, seq, storageV5).catch(() => {}));
  }
  cleanups.push(runCleanups());
  Promise.race([
    Promise.all(cleanups)
      .catch(() => {})
      .then(() => Promise.all([promptDraftFile.settled(), withOwnJobStateWrite(async () => {})])),
    sleep(5000),
  ]).finally(() => {
    process.exit(0);
  });
}
//@ chunk-wyc3ddyy.js:9524-9757 placement
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
//@ chunk-wyc3ddyy.js:9757-10348 placement
function enqueueNextTurnPrompt(frame) {
  if (frame.nextTurn === true) {
    enqueue({
      agentId: mainAgentId(),
      mode: "prompt",
      value: frame.text,
      priority: "next",
      origin: {
        kind: "human",
      },
      skipSlashCommands: true,
    });
    recordSubmitTime();
    logForDebugging(`[bg-rv] enqueued next-turn prompt: ${frame.text.slice(0, 80)}`);
    return;
  }
  if (resolveRendezvousCommand(getRootHost(), frame.text)) {
    logForDebugging(`[bg-rv] peer reply answered question: ${frame.text.slice(0, 80)}`);
    return;
  }
  if (runRvCommand(getRootHost(), frame.text)) {
    logForDebugging(`[bg-rv] peer reply ran at once: ${frame.text.slice(0, 80)}`);
    return;
  }
  let modeFromInput = getModeFromInput(frame.text);
  enqueue({
    agentId: mainAgentId(),
    mode: modeFromInput,
    value: stripModePrefix(frame.text),
    priority: "next",
    origin: {
      kind: "human",
    },
  });
  if (modeFromInput === "prompt" && !frame.text.trim().startsWith("/")) recordSubmitTime();
  logForDebugging(`[bg-rv] enqueued reply: ${frame.text.slice(0, 80)}`);
}
//@ chunk-wyc3ddyy.js:10348-10422 placement
/**
 * 会话卡在启动对话框时作业状态的 needs 文案。
 */
var BLOCKED_STUCK_DIALOG_DETAIL = "stuck on a startup dialog";
var BLOCKED_STUCK_DIALOG_NEEDS = "open this session to continue setup";
//@ chunk-wyc3ddyy.js:10422-10478 placement
function disarmStartupWedgeWatchdog() {
  getRendezvousServerState().server?.disarmStartupWedgeWatchdog();
}
//@ chunk-wyc3ddyy.js:10478-10896 placement
/**
 * 把作业状态改为 blocked 并写入需要的输入（已是同一需求返回 already，被其他需求占用返回 refused），同步给 rendezvous，返回之前的状态。
 */
async function markJobBlocked(jobDir, needs, detail, storageV5) {
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState)
    return {
      kind: "refused",
    };
  if (jobState.tempo === "blocked" && jobState.needs === needs)
    return {
      kind: "already",
    };
  if (jobState.tempo === "blocked" && jobState.needs !== IDLE_NEEDS)
    return {
      kind: "refused",
    };
  await writeStateAtomic(
    jobDir,
    {
      ...jobState,
      tempo: "blocked",
      detail,
      needs,
      updatedAt: new Date().toISOString(),
    },
    storageV5,
  );
  sendRv({
    type: "state",
    patch: {
      tempo: "blocked",
      detail,
      needs,
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
//@ chunk-wyc3ddyy.js:10896-11122 placement
async function restoreJobFromBlocked(jobDir, needs, patch, storageV5) {
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState || jobState.tempo !== "blocked" || jobState.needs !== needs) return;
  await writeStateAtomic(
    jobDir,
    {
      ...jobState,
      ...patch,
      updatedAt: new Date().toISOString(),
    },
    storageV5,
  );
  sendRv({
    type: "state",
    patch: {
      tempo: patch.tempo,
      needs: patch.needs,
      detail: patch.detail,
    },
  });
}
//@ chunk-wyc3ddyy.js:11122-11291 placement
async function markStartupDialogBlocked(detail, storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || getRendezvousServerState().server?.wedgeDisarmed) return;
  let detail_2 = detail ? `${BLOCKED_STUCK_DIALOG_DETAIL} (${detail})` : BLOCKED_STUCK_DIALOG_DETAIL;
  let result = await markJobBlocked(CLAUDE_JOB_DIR, BLOCKED_STUCK_DIALOG_NEEDS, detail_2, storageV5);
  return result.kind === "wrote" ? result.prior : undefined;
}
//@ chunk-wyc3ddyy.js:11291-11368 placement
async function clearStartupDialogBlocked(patch, storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR) return;
  await restoreJobFromBlocked(CLAUDE_JOB_DIR, BLOCKED_STUCK_DIALOG_NEEDS, patch, storageV5);
}
//@ chunk-wyc3ddyy.js:11368-11473 placement
async function markCommandParkBlocked(needs, detail, storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR)
    return {
      kind: "refused",
    };
  return withOwnJobStateWrite(() => markJobBlocked(CLAUDE_JOB_DIR, needs, detail, storageV5));
}
//@ chunk-wyc3ddyy.js:11473-11561 placement
async function clearCommandParkBlocked(needs, patch, storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR) return;
  await withOwnJobStateWrite(() => restoreJobFromBlocked(CLAUDE_JOB_DIR, needs, patch, storageV5));
}
//@ chunk-wyc3ddyy.js:11561-12192 placement
async function markReplayNoOp(storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_CODE_SESSION_KIND === "bg" ? env.CLAUDE_JOB_DIR : undefined;
  let jobDir = CLAUDE_JOB_DIR ?? getBgTakeover()?.jobDir;
  if (!jobDir) return;
  let jobState = await readJobState(jobDir, storageV5);
  if (
    jobState?.replayOwed === true &&
    (await withOwnJobStateWrite(async () => {
      invalidateJobStateCache(jobDir);
      let jobState = await readJobState(jobDir, storageV5);
      if (jobState?.replayOwed !== true || jobState.tempo !== "active" || !isTerminal(jobState.state))
        return false;
      return writeStateAtomic(
        jobDir,
        {
          ...jobState,
          tempo: "idle",
          replayOwed: undefined,
          updatedAt: new Date().toISOString(),
        },
        storageV5,
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
    jobDir,
    {
      ...jobState,
      tempo: "blocked",
      needs: IDLE_NEEDS,
      updatedAt: new Date().toISOString(),
    },
    storageV5,
  );
  sendRv({
    type: "state",
    patch: {
      tempo: "blocked",
      needs: IDLE_NEEDS,
    },
  });
}
//@ chunk-wyc3ddyy.js:12192-12348 placement
async function recordBridgeSessionSeq(jobDir, seq, storageV5) {
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState || jobState.bridgeSessionSeq === seq) return;
  await writeStateAtomic(
    jobDir,
    {
      ...jobState,
      bridgeSessionSeq: seq,
      updatedAt: new Date().toISOString(),
    },
    storageV5,
  );
}
export {
  sendRv,
  disarmStartupWedgeWatchdog,
  markReplayNoOp,
  registerRendezvousResolver,
  registerRendezvousRunner,
  markCommandParkBlocked,
  clearCommandParkBlocked,
  clearStartupDialogBlocked,
  markStartupDialogBlocked,
  startRendezvousServer,
};
