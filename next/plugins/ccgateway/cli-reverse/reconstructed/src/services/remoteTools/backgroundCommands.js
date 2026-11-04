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
import { objectSchema, stringSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:601196-601288 placement
/**
 * 远程设备 MCP 服务器名，过滤工具表时按它识别来自设备的工具。
 */
var REMOTE_DEVICES_SERVER_NAME; // deferred: uses REMOTE_DEVICES (../mcp/firstPartyServerIds.js) of its import cycle while loading; runs once the cycle is complete
var DEVICE_PASSTHROUGH_TOOL_NAMES;
var DEVICE_BASH;
var DEVICE_SYNC_FILES_TOOLS;
deferInit("chunk-s61vbvea.js:601196", () => {
  REMOTE_DEVICES_SERVER_NAME = REMOTE_DEVICES;
  DEVICE_PASSTHROUGH_TOOL_NAMES = new Set([
    BASH_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
  ]);
  DEVICE_BASH = "device_bash";
  DEVICE_SYNC_FILES_TOOLS = new Set(["sync_files"]);
});
//@ chunk-s61vbvea.js:601288-601454 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
/**
 * （归属疑误：远程设备）remote-devices 服务器工具列表过滤。
 */
function getToolNameForPermissionCheck_2(tool) {
  return tool.filter((entry) => {
    if (entry.mcpInfo?.serverName !== REMOTE_DEVICES_SERVER_NAME) return true;
    let toolName = entry.mcpInfo.toolName;
    let alias = aliasOfToolName(toolName);
    return (
      !DEVICE_PASSTHROUGH_TOOL_NAMES.has(toolName) &&
      toolName !== TASKSTOP &&
      (alias === undefined || !DEVICE_PASSTHROUGH_TOOL_NAMES.has(alias))
    );
  });
}
//@ chunk-s61vbvea.js:601454-601549 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function getToolNameForPermissionCheck_3(tool) {
  return tool.filter(
    (entry) =>
      entry.mcpInfo?.serverName !== REMOTE_DEVICES_SERVER_NAME ||
      !DEVICE_SYNC_FILES_TOOLS.has(entry.mcpInfo.toolName),
  );
}
//@ chunk-s61vbvea.js:601549-601636 placement
/**
 * 取当前代理 id：优先自身 agentId，否则用队友上下文里的 id。
 */
function currentAgentId(context) {
  if (context.agentId) return context.agentId;
  let teammateContext = getTeammateContext();
  return teammateContext ? identityAgentId2(teammateContext.agentId) : undefined;
}
//@ chunk-s61vbvea.js:601636-601690 placement
/**
 * 归属校验：给定 agentId 为 undefined 视为匹配，否则要求相等。
 */
function agentIdMatches(candidateAgentId, agentId) {
  if (candidateAgentId === undefined) return true;
  return candidateAgentId === agentId;
}
//@ chunk-s61vbvea.js:601690-601731 placement
/**
 * 会话显示名，undefined 时显示 "main session"。
 */
function sessionLabel(agentId) {
  return agentId ?? "main session";
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
function supportsBackgroundShells(server) {
  return server.description?.capabilities?.includes("background_shells") === true && isViolinVarnishOn();
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
  started(taskId, record) {
    this.#e.set(taskId, this.#e.get(taskId) ?? record);
    let filtered = [...this.#e].filter(([, entry]) => entry.hostName === record.hostName);
    if (filtered.length > MAX_BACKGROUND_LEDGER_PER_HOST) this.#e.delete(filtered[0]?.[0] ?? taskId);
  }
  find(taskId, agentId) {
    let record = this.#e.get(taskId);
    return record && agentIdMatches(agentId, record.agentId) ? record : undefined;
  }
}
//@ chunk-s61vbvea.js:602247-603648 placement
async function describeRemoteBackgroundResult(taskId, agentId, toolState, signal) {
  let found = toolState.get(RemoteBackgroundLedger).find(taskId, agentId);
  if (found === undefined) return;
  let { hostName, callId } = found;
  let resolved = toolState.get(ToolHostRegistry).resolve(hostName);
  let reply =
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
  let envelope = reply?.kind === "result" ? reply.envelope : undefined;
  let background =
    envelope?.outcome === "completed"
      ? objectSchema({
          background: objectSchema({
            state: stringSchema(),
            exit_code: numberSchema().optional(),
            ran_ms: numberSchema().nonnegative().max(MAX_BACKGROUND_RUNTIME_MS),
            ended_ms_ago: numberSchema().nonnegative().max(MAX_BACKGROUND_RUNTIME_MS).optional(),
          }),
        }).safeParse(envelope.output).data?.background
      : undefined;
  if (envelope?.outcome !== "completed" || background === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${hostName} did not say what became of background command ${taskId}: it is not attached or did not answer in time, or it no longer reports on the command (it keeps the last 16 that ended, and its record goes with a restart of Claude Code there or with background commands being switched off there).`,
      "no status for a background command on an attached machine",
    );
  let { content } = envelope;
  let outputText =
    typeof content === "string"
      ? content
      : content.map((block) => (block.type === "text" ? block.text : "")).join("");
  let text = `[from ${hostName}, about background command ${taskId}]
${truncateToLength(outputText, MAX_BACKGROUND_OUTPUT_CHARS)}`;
  let endedAtMs = Date.now() - (background.ended_ms_ago ?? 0);
  let base = {
    taskId,
    createdAt: new Date(endedAtMs - background.ran_ms).toISOString(),
    lastUpdatedAt: new Date(endedAtMs).toISOString(),
  };
  return background.state === "exited"
    ? {
        ...base,
        status: "completed",
        statusMessage: `Exited on ${hostName}.`,
        result: {
          content: [
            {
              type: "text",
              text,
            },
          ],
          isError: background.exit_code !== 0,
        },
      }
    : {
        ...base,
        status: background.state === "running" ? "working" : "cancelled",
        statusMessage: text,
      };
}
//@ chunk-s61vbvea.js:603762-603803 placement
/**
 * 每会话保存的远程工具状态槽。
 */
var toolStateSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:603762", () => {
  toolStateSlot = new SessionRootSlot(() => ({
    toolState: new InstanceRegistry(),
  }));
});
//@ chunk-s61vbvea.js:603803-603843 placement
/**
 * 写回远程工具状态。
 */
function setToolState(sessionRoot, toolState) {
  toolStateSlot.of(sessionRoot).toolState = toolState;
}
//@ chunk-s61vbvea.js:603843-603854 placement
var MAX_TRACKED_TOOL_NAMES = 256;
//@ chunk-s61vbvea.js:603854-603967 placement
/**
 * 判断工具公告是否为空（无工具、透传、管道与忽略项）。
 */
function isEmptyAnnouncement(announcement) {
  return (
    announcement.tools.length === 0 &&
    announcement.passthrough.length === 0 &&
    announcement.plumbing.length === 0 &&
    announcement.ignored.length === 0
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
  constructor(clock = Date.now) {
    this.#d = clock;
  }
  accept(announcement, { instanceId, now, transport }) {
    let hostName = announcement.host.name;
    let mapped = announcement.tools
      .filter((tool) => !isBackgroundServerTool(tool.name))
      .map((tool) => tool.name);
    let ignoredTools = [...announcement.ignored, ...mapped];
    let keys = [...this.#e.values()]
      .filter((host) => host.instanceId === instanceId)
      .map((host) => host.name);
    if (isEmptyAnnouncement(announcement)) {
      this.#e = omitKeys(this.#e, keys);
      let existing = this.#e.get(hostName);
      let heldByOtherInstance = existing !== undefined && existing.instanceId !== instanceId;
      let included = keys.includes(hostName);
      let leftState = parseLeftState(announcement.host.capabilities);
      for (let name of heldByOtherInstance || included ? keys : [...keys, hostName]) {
        if (!this.#o.has(name) && this.#o.size < MAX_TRACKED_TOOL_NAMES)
          this.#o.set(name, name !== hostName || included ? now : undefined);
        let ownerInstance = this.#c.get(name);
        if (this.#o.has(name) && (ownerInstance === undefined || ownerInstance === instanceId))
          if (leftState === undefined) this.#a.delete(name);
          else this.#a.set(name, leftState);
        this.#m(name);
      }
      this.#t++;
      this.#y();
      return {
        status: "withdrawn",
        ignoredTools,
        removed: keys,
        heldByAnother: heldByOtherInstance,
      };
    }
    let previous = this.#e.get(hostName);
    let filtered = announcement.tools.filter((tool) => isBackgroundServerTool(tool.name));
    let protocol = negotiateProtocol(
      (filtered[0] ?? announcement.tools[0])?.protocol_versions ?? [REMOTE_TOOL_PROTOCOL_VERSION],
    );
    let entry = {
      name: hostName,
      instanceId,
      description: announcement.host,
      servedTools: new Set(filtered.map((tool) => tool.name)),
      plumbing: announcement.plumbing,
      passthrough: new Map(announcement.passthrough.map((tool) => [tool.name, tool])),
      protocol,
      status: "online",
      awayReason: undefined,
      asleepSince: undefined,
      takenOverAt:
        previous === undefined ? undefined : previous.instanceId !== instanceId ? now : previous.takenOverAt,
      lastHeardAt: now,
      lastStillHereAt: undefined,
      transport,
    };
    this.#e = new Map([...omitKeys(this.#e, keys), [hostName, entry]]);
    this.#o.delete(hostName);
    this.#a.delete(hostName);
    if (this.#c.has(hostName) || this.#c.size < MAX_TRACKED_TOOL_NAMES) this.#c.set(hostName, instanceId);
    for (let name of keys) if (name !== hostName) this.#m(name);
    this.#t++;
    this.#S(hostName);
    this.#y();
    return {
      status: "announced",
      served: entry.servedTools.size,
      passthroughAdopted: entry.passthrough.size,
      protocolVersion: protocol.kind === "compatible" ? protocol.version : null,
      ignoredTools,
      displaced:
        previous !== undefined && previous.instanceId !== instanceId ? previous.instanceId : undefined,
    };
  }
  hasAnnouncedThisLife() {
    return this.#i;
  }
  withdrawnThisLife(hostName) {
    return this.#o.has(hostName);
  }
  withdrawnAt(hostName) {
    return this.#o.get(hostName);
  }
  withdrawnFor(hostName) {
    return this.#a.get(hostName);
  }
  onNextAnnounce(listener) {
    this.#n.add(listener);
    return () => {
      this.#n.delete(listener);
    };
  }
  announceWaitExpired() {
    return this.#l;
  }
  markAnnounceWaitExpired(reason) {
    this.#l = reason;
  }
  #y() {
    this.#i = true;
    let listeners = [...this.#n];
    this.#n.clear();
    for (let listener of listeners)
      try {
        listener();
      } catch {}
  }
  heard(instanceId, lastHeardAt, epoch) {
    let hostName = this.#p(instanceId, (entry) => ({
      ...entry,
      status: "online",
      awayReason: undefined,
      asleepSince: undefined,
      lastHeardAt,
      lastStillHereAt: undefined,
      description:
        epoch !== undefined && epoch !== entry.description.epoch
          ? {
              ...entry.description,
              epoch,
            }
          : entry.description,
    }));
    if (hostName !== undefined) this.#S(hostName);
  }
  noteStillHere(instanceId, now) {
    let found = this.entries().find((entry) => entry.instanceId === instanceId);
    if (found === undefined || found.awayReason === "asleep") return false;
    this.#p(instanceId, (entry) => ({
      ...entry,
      lastStillHereAt: Math.max(entry.lastStillHereAt ?? now, now),
    }));
    return true;
  }
  markAway(instanceId, reason) {
    let hostName = this.#p(instanceId, (entry) => ({
      ...entry,
      status: "offline",
      awayReason: entry.awayReason === "asleep" ? "asleep" : reason,
    }));
    if (hostName === undefined || this.#r.has(hostName)) return;
    let toldModel = this.#s.get(hostName)?.toldModel ?? false;
    this.#s.delete(hostName);
    let now = this.#d();
    this.#r.set(hostName, {
      awaySince: now,
      lastHeardAt: this.#e.get(hostName)?.lastHeardAt ?? now,
      toldModel,
    });
    this.#f(() =>
      this.#u.emit({
        name: hostName,
        change: "away",
        toldModel,
      }),
    );
  }
  now() {
    return this.#d();
  }
  awayEpisode(hostName) {
    return this.#r.get(hostName);
  }
  noteModelToldAway(hostName) {
    let episode = this.#r.get(hostName);
    if (episode === undefined || episode.toldModel) return;
    this.#r.set(hostName, {
      ...episode,
      toldModel: true,
    });
    this.#f(() => this.#g.emit(hostName));
  }
  backNotePending(hostName) {
    return this.#s.get(hostName)?.toldModel === true;
  }
  takeBackNote(hostName) {
    let note = this.#s.get(hostName);
    this.#s.delete(hostName);
    return note;
  }
  onHostStatusChange(listener) {
    return this.#u.subscribe(listener);
  }
  onModelToldAway(listener) {
    return this.#g.subscribe(listener);
  }
  onAwayEpisodeDropped(listener) {
    return this.#h.subscribe(listener);
  }
  #m(hostName) {
    this.#s.delete(hostName);
    if (!this.#r.delete(hostName)) return;
    this.#f(() => this.#h.emit(hostName));
  }
  #S(hostName) {
    let episode = this.#r.get(hostName);
    if (episode === undefined) return;
    this.#r.delete(hostName);
    let now = this.#d();
    let max = Math.max(0, now - episode.awaySince);
    let note = {
      backAt: now,
      awayMs: max,
      sinceHeardMs: Math.max(max, now - episode.lastHeardAt),
      toldModel: episode.toldModel,
    };
    this.#s.set(hostName, note);
    this.#f(() =>
      this.#u.emit({
        name: hostName,
        change: "back",
        ...note,
      }),
    );
  }
  #f(listener) {
    try {
      listener();
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
  markAsleep(instanceId, asleepSince) {
    this.#p(instanceId, (entry) => ({
      ...entry,
      awayReason: "asleep",
      asleepSince,
      lastStillHereAt: undefined,
    }));
    this.markAway(instanceId, "probe_missed");
  }
  handleFor(hostName) {
    let entry = this.#e.get(hostName);
    if (entry === undefined) return;
    let { instanceId } = entry;
    return {
      instanceId,
      hostName,
      live: () => {
        let current = this.#e.get(hostName);
        return current !== undefined && current.instanceId === instanceId
          ? {
              status: current.status,
              lastHeardAt: current.lastHeardAt,
              ...(current.asleepSince !== undefined && {
                asleepSince: current.asleepSince,
              }),
              ...(current.lastStillHereAt !== undefined && {
                lastStillHereAt: current.lastStillHereAt,
              }),
            }
          : undefined;
      },
      epoch: () => {
        let current = this.#e.get(hostName);
        return current !== undefined && current.instanceId === instanceId
          ? current.description.epoch
          : undefined;
      },
      heard: (heardAt, epoch) => {
        let asleepSince = this.entries().find((entry) => entry.instanceId === instanceId)?.asleepSince;
        if (asleepSince === undefined || heardAt < asleepSince || heardAt - asleepSince >= SLEEPING_GRACE_MS)
          this.heard(instanceId, heardAt, epoch);
      },
      markAway: (reason) => this.markAway(instanceId, reason),
    };
  }
  hostsForTable() {
    return this.entries().map((entry) => ({
      kind: "remote",
      source: "session",
      name: entry.name,
      status: entry.status,
      enforcement: "self",
      description: entry.description,
      servedTools: entry.servedTools,
      ...(entry.plumbing.some((tool) => DEVICE_SYNC_FILES_TOOLS.has(tool)) && {
        plumbingTools: new Set(entry.plumbing.filter((tool) => DEVICE_SYNC_FILES_TOOLS.has(tool))),
      }),
      ...(entry.passthrough.size > 0 && {
        passthroughTools: new Map(
          [...entry.passthrough.values()].map((tool) => [
            tool.name,
            {
              localName: tool.local_name,
            },
          ]),
        ),
      }),
      protocol: entry.protocol,
      transport: entry.transport,
      ...(entry.takenOverAt !== undefined && {
        takenOverAt: entry.takenOverAt,
      }),
      ...(entry.awayReason === "asleep" && {
        asleep: true,
      }),
      ...(entry.status === "offline" &&
        entry.awayReason !== "asleep" &&
        entry.lastStillHereAt !== undefined &&
        entry.lastStillHereAt > entry.lastHeardAt && {
          busy: true,
        }),
      ...(entry.status === "offline" && {
        lastHeardAt:
          entry.awayReason === "asleep"
            ? (this.#r.get(entry.name)?.awaySince ?? entry.asleepSince ?? entry.lastHeardAt)
            : entry.lastHeardAt,
      }),
    }));
  }
  #p(instanceId, update) {
    let found = this.entries().find((entry) => entry.instanceId === instanceId);
    if (found === undefined) return;
    let next = update(found);
    this.#e = new Map([...this.#e, [found.name, next]]);
    if (
      next.status !== found.status ||
      next.awayReason !== found.awayReason ||
      next.description !== found.description
    )
      this.#t++;
    return found.name;
  }
}
//@ chunk-s61vbvea.js:609673-609743 placement
/**
 * 复制 Map 并去掉指定键。
 */
function omitKeys(map, keys) {
  return new Map([...map].filter(([key]) => !keys.includes(key)));
}
//@ chunk-s61vbvea.js:609743-609755 placement
var MAX_PREVIEW_CHARS; // deferred: uses PREVIEW_SIZE_CHARS (../../utils/toolResultStorage.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:609743", () => {
  MAX_PREVIEW_CHARS = 2 * PREVIEW_SIZE_CHARS;
});
//@ chunk-s61vbvea.js:609792-610375 placement
async function truncateAdditionalContext({ entries, limit, event, storageV5 }) {
  let joined = entries.join(`

`);
  let persisted = await persistLargeHookOutput(joined, `${event}-${randomUUID()}`, "additionalContext", {
    threshold: limit,
    storageV5,
  }).catch((error) => {
    if (!isAbortError(error)) logError(error);
    return `${truncateToLength(joined, limit)}

[${event} context of ${joined.length} characters cut at ${limit}: writing it to disk failed]`;
  });
  let entryLabel = entries.length === 1 ? "a context entry" : `${entries.length} context entries`;
  let persistText = persisted.startsWith(PERSISTED_OUTPUT_TAG)
    ? "written to disk, its head and path kept"
    : "not written to disk (the persist failed), its head kept inline";
  logForDebugging(
    `${event}: ${entryLabel} of ${joined.length} characters ${persistText} (${RESULT_TOKEN_BUDGET} an entry, ${EVENT_TOOL_SITE_NAMES} a dispatch; nothing refused)`,
  );
  return persisted;
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
