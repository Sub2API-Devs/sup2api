/**
 * services/remoteTools/backgroundCommands.ts
 *
 * 远程后台命令（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (20)
 * attribution: placement 20
 */
import { randomUUID } from "crypto";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { aliasOfToolName } from "../tools/batchTools.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { getTeammateContext } from "../../utils/teammate.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { ToolHostRegistry } from "../../remote/tools/toolHostRegistry.js";
import { outcomeQueryEnvelope, negotiateProtocol } from "../../remote/tools/protocolSchemas.js";
import { u, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isAbortError,
} from "../../utils/errors.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { InstanceRegistry } from "../../utils/instanceRegistry.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { createSignal } from "../../utils/signal.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import {
  parseLeftState,
  REMOTE_TOOL_PROTOCOL_VERSION,
  SLEEPING_GRACE_MS,
} from "../../remote/tools/protocolConstants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  PREVIEW_SIZE_CHARS,
  persistLargeHookOutput,
  PERSISTED_OUTPUT_TAG,
} from "../../utils/toolResultStorage.js";
import { RESULT_TOKEN_BUDGET, EVENT_TOOL_SITE_NAMES } from "../../plugins/functionHooks/sites/siteRules.js";

//@ chunk-s61vbvea.js:601196-601288 placement
/**
 * 远程设备 MCP 服务器名，过滤工具表时按它识别来自设备的工具。
 */
var REMOTE_DEVICES_SERVER_NAME = REMOTE_DEVICES;
var DEVICE_PASSTHROUGH_TOOL_NAMES = new Set([
  BASH_TOOL_NAME,
  POWERSHELL_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
]);
var DEVICE_BASH = "device_bash";
var DEVICE_SYNC_FILES_TOOLS = new Set(["sync_files"]);
//@ chunk-s61vbvea.js:601288-601454 placement = getToolNameForPermissionCheck (1)
/**
 * （归属疑误：远程设备）remote-devices 服务器工具列表过滤。
 */
function getToolNameForPermissionCheck_2(tool) {
  return tool.filter((n) => {
    if (n.mcpInfo?.serverName !== REMOTE_DEVICES_SERVER_NAME) return true;
    let toolName = n.mcpInfo.toolName;
    let s = aliasOfToolName(toolName);
    return (
      !DEVICE_PASSTHROUGH_TOOL_NAMES.has(toolName) &&
      toolName !== TASKSTOP &&
      (s === undefined || !DEVICE_PASSTHROUGH_TOOL_NAMES.has(s))
    );
  });
}
//@ chunk-s61vbvea.js:601454-601549 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck_3(tool) {
  return tool.filter(
    (n) =>
      n.mcpInfo?.serverName !== REMOTE_DEVICES_SERVER_NAME ||
      !DEVICE_SYNC_FILES_TOOLS.has(n.mcpInfo.toolName),
  );
}
//@ chunk-s61vbvea.js:601549-601636 placement
/**
 * 取当前代理 id：优先自身 agentId，否则用队友上下文里的 id。
 */
function currentAgentId(e) {
  if (e.agentId) return e.agentId;
  let teammateContext = getTeammateContext();
  return teammateContext ? identityAgentId2(teammateContext.agentId) : undefined;
}
//@ chunk-s61vbvea.js:601636-601690 placement
/**
 * 归属校验：给定 agentId 为 undefined 视为匹配，否则要求相等。
 */
function agentIdMatches(e, agentId) {
  if (e === undefined) return true;
  return e === agentId;
}
//@ chunk-s61vbvea.js:601690-601731 placement
/**
 * 会话显示名，undefined 时显示 "main session"。
 */
function sessionLabel(e) {
  return e ?? "main session";
}
//@ chunk-s61vbvea.js:601731-601806 placement
/**
 * 读特性开关 tengu_violin_varnish（异常按关闭处理），控制 TaskStop 是否也走远程后台。
 */
function isViolinVarnishOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_varnish", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:601806-601869 placement
/**
 * 后台命令簿记的上限、状态时限、运行时上限、输出长度与 agentId 正则。
 */
var MAX_BACKGROUND_LEDGER_PER_HOST = 64;
var BACKGROUND_STATUS_DEADLINE_MS = 15000;
var MAX_BACKGROUND_RUNTIME_MS = 31622400000;
var MAX_BACKGROUND_OUTPUT_CHARS = 16384;
var AGENT_ID_REGEX = /^[\w-]{1,64}$/;
//@ chunk-s61vbvea.js:601869-601962 placement
/**
 * 机器是否声明支持 background_shells 且后台 shell 开关打开。
 */
function supportsBackgroundShells(e) {
  return e.description?.capabilities?.includes("background_shells") === true && isViolinVarnishOn();
}
//@ chunk-s61vbvea.js:601962-602009 placement
/**
 * 判断工具是否属于远程设备透传集合（TaskStop 需开关打开）。
 */
function isBackgroundServerTool(name) {
  return DEVICE_PASSTHROUGH_TOOL_NAMES.has(name) || (name === TASKSTOP && isViolinVarnishOn());
}
//@ chunk-s61vbvea.js:602009-602247 placement
/**
 * 远程后台命令记录：按 id 记下启动信息（每台机器有上限），查找时校验代理归属。
 */
class RemoteBackgroundLedger {
  #e = new Map();
  started(e, n) {
    this.#e.set(e, this.#e.get(e) ?? n);
    let filtered = [...this.#e].filter(([, s]) => s.hostName === n.hostName);
    if (filtered.length > MAX_BACKGROUND_LEDGER_PER_HOST) this.#e.delete(filtered[0]?.[0] ?? e);
  }
  find(e, n) {
    let r = this.#e.get(e);
    return r && agentIdMatches(n, r.agentId) ? r : undefined;
  }
}
//@ chunk-s61vbvea.js:602247-603648 placement
async function describeRemoteBackgroundResult(taskId, n, toolState, signal) {
  let found = toolState.get(RemoteBackgroundLedger).find(taskId, n);
  if (found === undefined) return;
  let { hostName, callId } = found;
  let resolved = toolState.get(ToolHostRegistry).resolve(hostName);
  let R =
    resolved.kind === "remote"
      ? await resolved.host.transport
          .call(BASH_TOOL_NAME, {}, outcomeQueryEnvelope(callId), {
            signal,
            deadlineMs: BACKGROUND_STATUS_DEADLINE_MS,
            toolUseId: callId,
          })
          .catch(() => {
            return;
          })
      : undefined;
  let envelope = R?.kind === "result" ? R.envelope : undefined;
  let background =
    envelope?.outcome === "completed"
      ? u({
          background: u({
            state: string(),
            exit_code: E().optional(),
            ran_ms: E().nonnegative().max(MAX_BACKGROUND_RUNTIME_MS),
            ended_ms_ago: E().nonnegative().max(MAX_BACKGROUND_RUNTIME_MS).optional(),
          }),
        }).safeParse(envelope.output).data?.background
      : undefined;
  if (envelope?.outcome !== "completed" || background === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${hostName} did not say what became of background command ${taskId}: it is not attached or did not answer in time, or it no longer reports on the command (it keeps the last 16 that ended, and its record goes with a restart of Claude Code there or with background commands being switched off there).`,
      "no status for a background command on an attached machine",
    );
  let { content } = envelope;
  let G =
    typeof content === "string" ? content : content.map((Z) => (Z.type === "text" ? Z.text : "")).join("");
  let L = `[from ${hostName}, about background command ${taskId}]
${truncateToLength(G, MAX_BACKGROUND_OUTPUT_CHARS)}`;
  let q = Date.now() - (background.ended_ms_ago ?? 0);
  let Q = {
    taskId,
    createdAt: new Date(q - background.ran_ms).toISOString(),
    lastUpdatedAt: new Date(q).toISOString(),
  };
  return background.state === "exited"
    ? {
        ...Q,
        status: "completed",
        statusMessage: `Exited on ${hostName}.`,
        result: {
          content: [
            {
              type: "text",
              text: L,
            },
          ],
          isError: background.exit_code !== 0,
        },
      }
    : {
        ...Q,
        status: background.state === "running" ? "working" : "cancelled",
        statusMessage: L,
      };
}
//@ chunk-s61vbvea.js:603762-603803 placement
/**
 * 每会话保存的远程工具状态槽。
 */
var toolStateSlot = new SessionRootSlot(() => ({
  toolState: new InstanceRegistry(),
}));
//@ chunk-s61vbvea.js:603803-603843 placement
/**
 * 写回远程工具状态。
 */
function setToolState(e, toolState) {
  toolStateSlot.of(e).toolState = toolState;
}
//@ chunk-s61vbvea.js:603843-603854 placement
var MAX_TRACKED_TOOL_NAMES = 256;
//@ chunk-s61vbvea.js:603854-603967 placement
/**
 * 判断工具公告是否为空（无工具、透传、管道与忽略项）。
 */
function isEmptyAnnouncement(e) {
  return (
    e.tools.length === 0 && e.passthrough.length === 0 && e.plumbing.length === 0 && e.ignored.length === 0
  );
}
//@ chunk-s61vbvea.js:603967-609673 placement
/**
 * 远程后台命令跟踪：上线、宣告、撤回
 */
class RemoteBackgroundCommands {
  #e = new Map();
  #t = 0;
  #n = new Set();
  #i = false;
  #l = undefined;
  #o = new Map();
  #a = new Map();
  #c = new Map();
  #r = new Map();
  #s = new Map();
  #u = createSignal();
  #g = createSignal();
  #h = createSignal();
  #d;
  constructor(e = Date.now) {
    this.#d = e;
  }
  accept(e, { instanceId, now, transport }) {
    let h = e.host.name;
    let mapped = e.tools.filter((tool) => !isBackgroundServerTool(tool.name)).map((tool) => tool.name);
    let ignoredTools = [...e.ignored, ...mapped];
    let mapped_2 = [...this.#e.values()].filter((G) => G.instanceId === instanceId).map((G) => G.name);
    if (isEmptyAnnouncement(e)) {
      this.#e = omitKeys(this.#e, mapped_2);
      let G = this.#e.get(h);
      let L = G !== undefined && G.instanceId !== instanceId;
      let included = mapped_2.includes(h);
      let leftState = parseLeftState(e.host.capabilities);
      for (let Z of L || included ? mapped_2 : [...mapped_2, h]) {
        if (!this.#o.has(Z) && this.#o.size < MAX_TRACKED_TOOL_NAMES)
          this.#o.set(Z, Z !== h || included ? now : undefined);
        let ee = this.#c.get(Z);
        if (this.#o.has(Z) && (ee === undefined || ee === instanceId))
          if (leftState === undefined) this.#a.delete(Z);
          else this.#a.set(Z, leftState);
        this.#m(Z);
      }
      this.#t++;
      this.#y();
      return {
        status: "withdrawn",
        ignoredTools,
        removed: mapped_2,
        heldByAnother: L,
      };
    }
    let R = this.#e.get(h);
    let filtered = e.tools.filter((tool) => isBackgroundServerTool(tool.name));
    let P = negotiateProtocol(
      (filtered[0] ?? e.tools[0])?.protocol_versions ?? [REMOTE_TOOL_PROTOCOL_VERSION],
    );
    let j = {
      name: h,
      instanceId,
      description: e.host,
      servedTools: new Set(filtered.map((G) => G.name)),
      plumbing: e.plumbing,
      passthrough: new Map(e.passthrough.map((G) => [G.name, G])),
      protocol: P,
      status: "online",
      awayReason: undefined,
      asleepSince: undefined,
      takenOverAt: R === undefined ? undefined : R.instanceId !== instanceId ? now : R.takenOverAt,
      lastHeardAt: now,
      lastStillHereAt: undefined,
      transport,
    };
    this.#e = new Map([...omitKeys(this.#e, mapped_2), [h, j]]);
    this.#o.delete(h);
    this.#a.delete(h);
    if (this.#c.has(h) || this.#c.size < MAX_TRACKED_TOOL_NAMES) this.#c.set(h, instanceId);
    for (let G of mapped_2) if (G !== h) this.#m(G);
    this.#t++;
    this.#S(h);
    this.#y();
    return {
      status: "announced",
      served: j.servedTools.size,
      passthroughAdopted: j.passthrough.size,
      protocolVersion: P.kind === "compatible" ? P.version : null,
      ignoredTools,
      displaced: R !== undefined && R.instanceId !== instanceId ? R.instanceId : undefined,
    };
  }
  hasAnnouncedThisLife() {
    return this.#i;
  }
  withdrawnThisLife(e) {
    return this.#o.has(e);
  }
  withdrawnAt(e) {
    return this.#o.get(e);
  }
  withdrawnFor(e) {
    return this.#a.get(e);
  }
  onNextAnnounce(e) {
    this.#n.add(e);
    return () => {
      this.#n.delete(e);
    };
  }
  announceWaitExpired() {
    return this.#l;
  }
  markAnnounceWaitExpired(e) {
    this.#l = e;
  }
  #y() {
    this.#i = true;
    let e = [...this.#n];
    this.#n.clear();
    for (let n of e)
      try {
        n();
      } catch {}
  }
  heard(e, lastHeardAt, r) {
    let s = this.#p(e, (h) => ({
      ...h,
      status: "online",
      awayReason: undefined,
      asleepSince: undefined,
      lastHeardAt,
      lastStillHereAt: undefined,
      description:
        r !== undefined && r !== h.description.epoch
          ? {
              ...h.description,
              epoch: r,
            }
          : h.description,
    }));
    if (s !== undefined) this.#S(s);
  }
  noteStillHere(e, n) {
    let found = this.entries().find((s) => s.instanceId === e);
    if (found === undefined || found.awayReason === "asleep") return false;
    this.#p(e, (s) => ({
      ...s,
      lastStillHereAt: Math.max(s.lastStillHereAt ?? n, n),
    }));
    return true;
  }
  markAway(e, n) {
    let r = this.#p(e, (y) => ({
      ...y,
      status: "offline",
      awayReason: y.awayReason === "asleep" ? "asleep" : n,
    }));
    if (r === undefined || this.#r.has(r)) return;
    let toldModel = this.#s.get(r)?.toldModel ?? false;
    this.#s.delete(r);
    let h = this.#d();
    this.#r.set(r, {
      awaySince: h,
      lastHeardAt: this.#e.get(r)?.lastHeardAt ?? h,
      toldModel,
    });
    this.#f(() =>
      this.#u.emit({
        name: r,
        change: "away",
        toldModel,
      }),
    );
  }
  now() {
    return this.#d();
  }
  awayEpisode(e) {
    return this.#r.get(e);
  }
  noteModelToldAway(e) {
    let n = this.#r.get(e);
    if (n === undefined || n.toldModel) return;
    this.#r.set(e, {
      ...n,
      toldModel: true,
    });
    this.#f(() => this.#g.emit(e));
  }
  backNotePending(e) {
    return this.#s.get(e)?.toldModel === true;
  }
  takeBackNote(e) {
    let n = this.#s.get(e);
    this.#s.delete(e);
    return n;
  }
  onHostStatusChange(e) {
    return this.#u.subscribe(e);
  }
  onModelToldAway(e) {
    return this.#g.subscribe(e);
  }
  onAwayEpisodeDropped(e) {
    return this.#h.subscribe(e);
  }
  #m(e) {
    this.#s.delete(e);
    if (!this.#r.delete(e)) return;
    this.#f(() => this.#h.emit(e));
  }
  #S(e) {
    let n = this.#r.get(e);
    if (n === undefined) return;
    this.#r.delete(e);
    let r = this.#d();
    let max = Math.max(0, r - n.awaySince);
    let h = {
      backAt: r,
      awayMs: max,
      sinceHeardMs: Math.max(max, r - n.lastHeardAt),
      toldModel: n.toldModel,
    };
    this.#s.set(e, h);
    this.#f(() =>
      this.#u.emit({
        name: e,
        change: "back",
        ...h,
      }),
    );
  }
  #f(e) {
    try {
      e();
    } catch (error) {
      logForDebugging(`[remote-tools] an away-episode listener threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  clear() {
    this.#e = new Map();
    for (let key of [...this.#r.keys()]) this.#m(key);
    this.#s.clear();
    this.#t++;
  }
  generation() {
    return this.#t;
  }
  entries() {
    return [...this.#e.values()];
  }
  markAsleep(e, asleepSince) {
    this.#p(e, (r) => ({
      ...r,
      awayReason: "asleep",
      asleepSince,
      lastStillHereAt: undefined,
    }));
    this.markAway(e, "probe_missed");
  }
  handleFor(e) {
    let n = this.#e.get(e);
    if (n === undefined) return;
    let { instanceId } = n;
    return {
      instanceId,
      hostName: e,
      live: () => {
        let s = this.#e.get(e);
        return s !== undefined && s.instanceId === instanceId
          ? {
              status: s.status,
              lastHeardAt: s.lastHeardAt,
              ...(s.asleepSince !== undefined && {
                asleepSince: s.asleepSince,
              }),
              ...(s.lastStillHereAt !== undefined && {
                lastStillHereAt: s.lastStillHereAt,
              }),
            }
          : undefined;
      },
      epoch: () => {
        let s = this.#e.get(e);
        return s !== undefined && s.instanceId === instanceId ? s.description.epoch : undefined;
      },
      heard: (s, h) => {
        let asleepSince = this.entries().find((S) => S.instanceId === instanceId)?.asleepSince;
        if (asleepSince === undefined || s < asleepSince || s - asleepSince >= SLEEPING_GRACE_MS)
          this.heard(instanceId, s, h);
      },
      markAway: (s) => this.markAway(instanceId, s),
    };
  }
  hostsForTable() {
    return this.entries().map((e) => ({
      kind: "remote",
      source: "session",
      name: e.name,
      status: e.status,
      enforcement: "self",
      description: e.description,
      servedTools: e.servedTools,
      ...(e.plumbing.some((n) => DEVICE_SYNC_FILES_TOOLS.has(n)) && {
        plumbingTools: new Set(e.plumbing.filter((n) => DEVICE_SYNC_FILES_TOOLS.has(n))),
      }),
      ...(e.passthrough.size > 0 && {
        passthroughTools: new Map(
          [...e.passthrough.values()].map((n) => [
            n.name,
            {
              localName: n.local_name,
            },
          ]),
        ),
      }),
      protocol: e.protocol,
      transport: e.transport,
      ...(e.takenOverAt !== undefined && {
        takenOverAt: e.takenOverAt,
      }),
      ...(e.awayReason === "asleep" && {
        asleep: true,
      }),
      ...(e.status === "offline" &&
        e.awayReason !== "asleep" &&
        e.lastStillHereAt !== undefined &&
        e.lastStillHereAt > e.lastHeardAt && {
          busy: true,
        }),
      ...(e.status === "offline" && {
        lastHeardAt:
          e.awayReason === "asleep"
            ? (this.#r.get(e.name)?.awaySince ?? e.asleepSince ?? e.lastHeardAt)
            : e.lastHeardAt,
      }),
    }));
  }
  #p(e, n) {
    let found = this.entries().find((h) => h.instanceId === e);
    if (found === undefined) return;
    let s = n(found);
    this.#e = new Map([...this.#e, [found.name, s]]);
    if (s.status !== found.status || s.awayReason !== found.awayReason || s.description !== found.description)
      this.#t++;
    return found.name;
  }
}
//@ chunk-s61vbvea.js:609673-609743 placement
/**
 * 复制 Map 并去掉指定键。
 */
function omitKeys(e, n) {
  return new Map([...e].filter(([r]) => !n.includes(r)));
}
//@ chunk-s61vbvea.js:609743-609755 placement
var MAX_PREVIEW_CHARS = 2 * PREVIEW_SIZE_CHARS;
//@ chunk-s61vbvea.js:609792-610375 placement
async function truncateAdditionalContext({ entries, limit, event, storageV5 }) {
  let joined = entries.join(`

`);
  let y = await persistLargeHookOutput(joined, `${event}-${randomUUID()}`, "additionalContext", {
    threshold: limit,
    storageV5,
  }).catch((error) => {
    if (!isAbortError(error)) logError(error);
    return `${truncateToLength(joined, limit)}

[${event} context of ${joined.length} characters cut at ${limit}: writing it to disk failed]`;
  });
  let w = entries.length === 1 ? "a context entry" : `${entries.length} context entries`;
  let x = y.startsWith(PERSISTED_OUTPUT_TAG)
    ? "written to disk, its head and path kept"
    : "not written to disk (the persist failed), its head kept inline";
  logForDebugging(
    `${event}: ${w} of ${joined.length} characters ${x} (${RESULT_TOKEN_BUDGET} an entry, ${EVENT_TOOL_SITE_NAMES} a dispatch; nothing refused)`,
  );
  return y;
}
export {
  setToolState,
  DEVICE_SYNC_FILES_TOOLS,
  DEVICE_PASSTHROUGH_TOOL_NAMES,
  RemoteBackgroundCommands,
  REMOTE_DEVICES_SERVER_NAME,
  isViolinVarnishOn,
  currentAgentId,
  RemoteBackgroundLedger,
  supportsBackgroundShells,
  MAX_PREVIEW_CHARS,
  truncateAdditionalContext,
  getToolNameForPermissionCheck_3,
  getToolNameForPermissionCheck_2,
  DEVICE_BASH,
  agentIdMatches,
  sessionLabel,
  describeRemoteBackgroundResult,
  AGENT_ID_REGEX,
  isEmptyAnnouncement,
  toolStateSlot,
};
