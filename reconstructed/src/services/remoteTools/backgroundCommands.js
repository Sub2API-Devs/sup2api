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
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { Aqe } from "../tools/batchTools.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { getTeammateContext } from "../../utils/teammate.js";
import { Mr } from "../../utils/agentId.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { ToolHostRegistry } from "../../remote/tools/toolHostRegistry.js";
import { outcomeQueryEnvelope, negotiateProtocol } from "../../remote/tools/protocolSchemas.js";
import { u, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { parseLeftState, REMOTE_TOOL_PROTOCOL_VERSION, ylr } from "../../remote/tools/protocolConstants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  PREVIEW_SIZE_CHARS,
  persistLargeHookOutput,
  PERSISTED_OUTPUT_TAG,
} from "../../utils/toolResultStorage.js";
import { RAn, ofr } from "../../plugins/functionHooks/sites/siteRules.js";

//@ chunk-s61vbvea.js:601196-601288 placement
var jX = REMOTE_DEVICES,
  iie = new Set([
    BASH_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
  ]),
  DEVICE_BASH = "device_bash",
  lqe = new Set(["sync_files"]);
/**
 * （归属疑误：远程设备）remote-devices 服务器工具列表过滤。
 */
//@ chunk-s61vbvea.js:601288-601454 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck_2(tool) {
  return tool.filter((n) => {
    if (n.mcpInfo?.serverName !== jX) return !0;
    let toolName = n.mcpInfo.toolName,
      s = Aqe(toolName);
    return !iie.has(toolName) && toolName !== TASKSTOP && (s === void 0 || !iie.has(s));
  });
}
//@ chunk-s61vbvea.js:601454-601549 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck_3(tool) {
  return tool.filter((n) => n.mcpInfo?.serverName !== jX || !lqe.has(n.mcpInfo.toolName));
}
//@ chunk-s61vbvea.js:601549-601636 placement
function aie(e) {
  if (e.agentId) return e.agentId;
  let n = getTeammateContext();
  return n ? Mr(n.agentId) : void 0;
}
//@ chunk-s61vbvea.js:601636-601690 placement
function Kvt(e, n) {
  if (e === void 0) return !0;
  return e === n;
}
//@ chunk-s61vbvea.js:601690-601731 placement
function b_n(e) {
  return e ?? "main session";
}
//@ chunk-s61vbvea.js:601731-601806 placement
function P6() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_varnish", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:601806-601869 placement
var rG = 64,
  oG = 15000,
  vE = 31622400000,
  sG = 16384,
  Wti = /^[\w-]{1,64}$/;
//@ chunk-s61vbvea.js:601869-601962 placement
function LKt(e) {
  return e.description?.capabilities?.includes("background_shells") === !0 && P6();
}
//@ chunk-s61vbvea.js:601962-602009 placement
function Sp(e) {
  return iie.has(e) || (e === TASKSTOP && P6());
}
/**
 * 远程后台命令记录：按 id 记下启动信息（每台机器有上限），查找时校验代理归属。
 */
//@ chunk-s61vbvea.js:602009-602247 placement
class RemoteBackgroundLedger {
  #e = new Map();
  started(e, n) {
    this.#e.set(e, this.#e.get(e) ?? n);
    let filtered = [...this.#e].filter(([, s]) => s.hostName === n.hostName);
    if (filtered.length > rG) this.#e.delete(filtered[0]?.[0] ?? e);
  }
  find(e, n) {
    let r = this.#e.get(e);
    return r && Kvt(n, r.agentId) ? r : void 0;
  }
}
//@ chunk-s61vbvea.js:602247-603648 placement
async function describeRemoteBackgroundResult(e, n, r, s) {
  let found = r.get(RemoteBackgroundLedger).find(e, n);
  if (found === void 0) return;
  let { hostName: hostName, callId: callId } = found,
    resolved = r.get(ToolHostRegistry).resolve(hostName),
    R =
      resolved.kind === "remote"
        ? await resolved.host.transport
            .call(BASH_TOOL_NAME, {}, outcomeQueryEnvelope(callId), {
              signal: s,
              deadlineMs: oG,
              toolUseId: callId,
            })
            .catch(() => {
              return;
            })
        : void 0,
    x = R?.kind === "result" ? R.envelope : void 0,
    P =
      x?.outcome === "completed"
        ? u({
            background: u({
              state: o(),
              exit_code: E().optional(),
              ran_ms: E().nonnegative().max(vE),
              ended_ms_ago: E().nonnegative().max(vE).optional(),
            }),
          }).safeParse(x.output).data?.background
        : void 0;
  if (x?.outcome !== "completed" || P === void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${hostName} did not say what became of background command ${e}: it is not attached or did not answer in time, or it no longer reports on the command (it keeps the last 16 that ended, and its record goes with a restart of Claude Code there or with background commands being switched off there).`,
      "no status for a background command on an attached machine",
    );
  let { content: content } = x,
    G =
      typeof content === "string" ? content : content.map((Z) => (Z.type === "text" ? Z.text : "")).join(""),
    L = `[from ${hostName}, about background command ${e}]
${truncateToLength(G, sG)}`,
    q = Date.now() - (P.ended_ms_ago ?? 0),
    Q = {
      taskId: e,
      createdAt: new Date(q - P.ran_ms).toISOString(),
      lastUpdatedAt: new Date(q).toISOString(),
    };
  return P.state === "exited"
    ? {
        ...Q,
        status: "completed",
        statusMessage: `Exited on ${hostName}.`,
        result: { content: [{ type: "text", text: L }], isError: P.exit_code !== 0 },
      }
    : { ...Q, status: P.state === "running" ? "working" : "cancelled", statusMessage: L };
}
//@ chunk-s61vbvea.js:603762-603803 placement
var j4r = new SessionRootSlot(() => ({ toolState: new InstanceRegistry() }));
//@ chunk-s61vbvea.js:603803-603843 placement
function zti(e, n) {
  j4r.of(e).toolState = n;
}
//@ chunk-s61vbvea.js:603843-603854 placement
var CE = 256;
/**
 * 判断工具公告是否为空（无工具、透传、管道与忽略项）。
 */
//@ chunk-s61vbvea.js:603854-603967 placement
function isEmptyAnnouncement(e) {
  return (
    e.tools.length === 0 && e.passthrough.length === 0 && e.plumbing.length === 0 && e.ignored.length === 0
  );
}
/**
 * 远程后台命令跟踪：上线、宣告、撤回
 */
//@ chunk-s61vbvea.js:603967-609673 placement
class RemoteBackgroundCommands {
  #e = new Map();
  #t = 0;
  #n = new Set();
  #i = !1;
  #l = void 0;
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
  accept(e, { instanceId: n, now: r, transport: s }) {
    let h = e.host.name,
      mapped = e.tools.filter((tool) => !Sp(tool.name)).map((G) => G.name),
      S = [...e.ignored, ...mapped],
      mapped_2 = [...this.#e.values()].filter((G) => G.instanceId === n).map((G) => G.name);
    if (isEmptyAnnouncement(e)) {
      this.#e = PE(this.#e, mapped_2);
      let G = this.#e.get(h),
        L = G !== void 0 && G.instanceId !== n,
        included = mapped_2.includes(h),
        Q = parseLeftState(e.host.capabilities);
      for (let Z of L || included ? mapped_2 : [...mapped_2, h]) {
        if (!this.#o.has(Z) && this.#o.size < CE) this.#o.set(Z, Z !== h || included ? r : void 0);
        let ee = this.#c.get(Z);
        if (this.#o.has(Z) && (ee === void 0 || ee === n))
          if (Q === void 0) this.#a.delete(Z);
          else this.#a.set(Z, Q);
        this.#m(Z);
      }
      return (
        this.#t++,
        this.#y(),
        { status: "withdrawn", ignoredTools: S, removed: mapped_2, heldByAnother: L }
      );
    }
    let R = this.#e.get(h),
      filtered = e.tools.filter((tool) => Sp(tool.name)),
      P = negotiateProtocol((filtered[0] ?? e.tools[0])?.protocol_versions ?? [REMOTE_TOOL_PROTOCOL_VERSION]),
      j = {
        name: h,
        instanceId: n,
        description: e.host,
        servedTools: new Set(filtered.map((G) => G.name)),
        plumbing: e.plumbing,
        passthrough: new Map(e.passthrough.map((G) => [G.name, G])),
        protocol: P,
        status: "online",
        awayReason: void 0,
        asleepSince: void 0,
        takenOverAt: R === void 0 ? void 0 : R.instanceId !== n ? r : R.takenOverAt,
        lastHeardAt: r,
        lastStillHereAt: void 0,
        transport: s,
      };
    if (
      ((this.#e = new Map([...PE(this.#e, mapped_2), [h, j]])),
      this.#o.delete(h),
      this.#a.delete(h),
      this.#c.has(h) || this.#c.size < CE)
    )
      this.#c.set(h, n);
    for (let G of mapped_2) if (G !== h) this.#m(G);
    return (
      this.#t++,
      this.#S(h),
      this.#y(),
      {
        status: "announced",
        served: j.servedTools.size,
        passthroughAdopted: j.passthrough.size,
        protocolVersion: P.kind === "compatible" ? P.version : null,
        ignoredTools: S,
        displaced: R !== void 0 && R.instanceId !== n ? R.instanceId : void 0,
      }
    );
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
    return (
      this.#n.add(e),
      () => {
        this.#n.delete(e);
      }
    );
  }
  announceWaitExpired() {
    return this.#l;
  }
  markAnnounceWaitExpired(e) {
    this.#l = e;
  }
  #y() {
    this.#i = !0;
    let e = [...this.#n];
    this.#n.clear();
    for (let n of e)
      try {
        n();
      } catch {}
  }
  heard(e, n, r) {
    let s = this.#p(e, (h) => ({
      ...h,
      status: "online",
      awayReason: void 0,
      asleepSince: void 0,
      lastHeardAt: n,
      lastStillHereAt: void 0,
      description: r !== void 0 && r !== h.description.epoch ? { ...h.description, epoch: r } : h.description,
    }));
    if (s !== void 0) this.#S(s);
  }
  noteStillHere(e, n) {
    let found = this.entries().find((s) => s.instanceId === e);
    if (found === void 0 || found.awayReason === "asleep") return !1;
    return (this.#p(e, (s) => ({ ...s, lastStillHereAt: Math.max(s.lastStillHereAt ?? n, n) })), !0);
  }
  markAway(e, n) {
    let r = this.#p(e, (y) => ({
      ...y,
      status: "offline",
      awayReason: y.awayReason === "asleep" ? "asleep" : n,
    }));
    if (r === void 0 || this.#r.has(r)) return;
    let s = this.#s.get(r)?.toldModel ?? !1;
    this.#s.delete(r);
    let h = this.#d();
    (this.#r.set(r, { awaySince: h, lastHeardAt: this.#e.get(r)?.lastHeardAt ?? h, toldModel: s }),
      this.#f(() => this.#u.emit({ name: r, change: "away", toldModel: s })));
  }
  now() {
    return this.#d();
  }
  awayEpisode(e) {
    return this.#r.get(e);
  }
  noteModelToldAway(e) {
    let n = this.#r.get(e);
    if (n === void 0 || n.toldModel) return;
    (this.#r.set(e, { ...n, toldModel: !0 }), this.#f(() => this.#g.emit(e)));
  }
  backNotePending(e) {
    return this.#s.get(e)?.toldModel === !0;
  }
  takeBackNote(e) {
    let n = this.#s.get(e);
    return (this.#s.delete(e), n);
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
    if ((this.#s.delete(e), !this.#r.delete(e))) return;
    this.#f(() => this.#h.emit(e));
  }
  #S(e) {
    let n = this.#r.get(e);
    if (n === void 0) return;
    this.#r.delete(e);
    let r = this.#d(),
      max = Math.max(0, r - n.awaySince),
      h = { backAt: r, awayMs: max, sinceHeardMs: Math.max(max, r - n.lastHeardAt), toldModel: n.toldModel };
    (this.#s.set(e, h), this.#f(() => this.#u.emit({ name: e, change: "back", ...h })));
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
    for (let e of [...this.#r.keys()]) this.#m(e);
    (this.#s.clear(), this.#t++);
  }
  generation() {
    return this.#t;
  }
  entries() {
    return [...this.#e.values()];
  }
  markAsleep(e, n) {
    (this.#p(e, (r) => ({ ...r, awayReason: "asleep", asleepSince: n, lastStillHereAt: void 0 })),
      this.markAway(e, "probe_missed"));
  }
  handleFor(e) {
    let n = this.#e.get(e);
    if (n === void 0) return;
    let { instanceId: instanceId } = n;
    return {
      instanceId: instanceId,
      hostName: e,
      live: () => {
        let s = this.#e.get(e);
        return s !== void 0 && s.instanceId === instanceId
          ? {
              status: s.status,
              lastHeardAt: s.lastHeardAt,
              ...(s.asleepSince !== void 0 && { asleepSince: s.asleepSince }),
              ...(s.lastStillHereAt !== void 0 && { lastStillHereAt: s.lastStillHereAt }),
            }
          : void 0;
      },
      epoch: () => {
        let s = this.#e.get(e);
        return s !== void 0 && s.instanceId === instanceId ? s.description.epoch : void 0;
      },
      heard: (s, h) => {
        let y = this.entries().find((S) => S.instanceId === instanceId)?.asleepSince;
        if (y === void 0 || s < y || s - y >= ylr) this.heard(instanceId, s, h);
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
      ...(e.plumbing.some((n) => lqe.has(n)) && {
        plumbingTools: new Set(e.plumbing.filter((n) => lqe.has(n))),
      }),
      ...(e.passthrough.size > 0 && {
        passthroughTools: new Map(
          [...e.passthrough.values()].map((n) => [n.name, { localName: n.local_name }]),
        ),
      }),
      protocol: e.protocol,
      transport: e.transport,
      ...(e.takenOverAt !== void 0 && { takenOverAt: e.takenOverAt }),
      ...(e.awayReason === "asleep" && { asleep: !0 }),
      ...(e.status === "offline" &&
        e.awayReason !== "asleep" &&
        e.lastStillHereAt !== void 0 &&
        e.lastStillHereAt > e.lastHeardAt && { busy: !0 }),
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
    if (found === void 0) return;
    let s = n(found);
    if (
      ((this.#e = new Map([...this.#e, [found.name, s]])),
      s.status !== found.status || s.awayReason !== found.awayReason || s.description !== found.description)
    )
      this.#t++;
    return found.name;
  }
}
//@ chunk-s61vbvea.js:609673-609743 placement
function PE(e, n) {
  return new Map([...e].filter(([r]) => !n.includes(r)));
}
//@ chunk-s61vbvea.js:609743-609755 placement
var OE = 2 * PREVIEW_SIZE_CHARS;
//@ chunk-s61vbvea.js:609792-610375 placement
async function truncateAdditionalContext({
  entries: entries,
  limit: limit,
  event: event,
  storageV5: storageV5,
}) {
  let joined = entries.join(`

`),
    y = await persistLargeHookOutput(joined, `${event}-${randomUUID_3()}`, "additionalContext", {
      threshold: limit,
      storageV5: storageV5,
    }).catch((P) => {
      if (!isAbortError(P)) logError(P);
      return `${truncateToLength(joined, limit)}

[${event} context of ${joined.length} characters cut at ${limit}: writing it to disk failed]`;
    }),
    w = entries.length === 1 ? "a context entry" : `${entries.length} context entries`,
    x = y.startsWith(PERSISTED_OUTPUT_TAG)
      ? "written to disk, its head and path kept"
      : "not written to disk (the persist failed), its head kept inline";
  return (
    logForDebugging(
      `${event}: ${w} of ${joined.length} characters ${x} (${RAn} an entry, ${ofr} a dispatch; nothing refused)`,
    ),
    y
  );
}

export {
  zti,
  lqe,
  iie,
  RemoteBackgroundCommands,
  jX,
  P6,
  aie,
  RemoteBackgroundLedger,
  LKt,
  OE,
  truncateAdditionalContext,
  getToolNameForPermissionCheck_3,
  getToolNameForPermissionCheck_2,
  DEVICE_BASH,
  Kvt,
  b_n,
  describeRemoteBackgroundResult,
  Wti,
  isEmptyAnnouncement,
  j4r,
};
