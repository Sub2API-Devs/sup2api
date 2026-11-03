/**
 * cli/bg/bgSpawnEnv.ts
 *
 * 2.1.316 新增：后台会话子进程环境（认证/网关/云凭据变量透传）、粘贴图片落盘与派发参数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bg51yd13.js (15)
 * attribution: placement 15
 */
import { readdir, readdir as readdir_2, stat, rm, rm as rm_2 } from "fs/promises";
import { join, join as join_2 } from "path";
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { knt, VKo } from "../forwardedFlags.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { isProviderManagedByHost } from "../../utils/entrypointKinds.js";
import { isHostManagedEnvironment, hct, gj } from "../../utils/managedEnvConstants.js";
import { truncateWithEllipsis } from "../../services/sessionStatus/sessionStateClassifier.js";
import { qa } from "../../utils/stripAnsi.js";
import { CLAUDE_AGENT } from "../../tools/AgentTool/built-in/claudeAgent.js";
import {
  getBuiltInAgents,
  getAgentDefinitionsWithOverrides,
  isBuiltInAgent,
  isRunTimeRegisteredAgent,
} from "../../tools/AgentTool/loadAgentsDir.js";
import { parsePastedRefs } from "../../history.js";
import {
  getJobDir,
  writeStateAtomic,
  makeInitialState,
  invalidateJobStateCache,
} from "../../services/daemon/jobState.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { ensureJobTmpFolder } from "../../services/daemon/jobFolder.js";
import { qt, storageDigestMatches, _e, Zt } from "./bgSpare.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizeErrnoForTelemetry,
  errorMessage,
} from "../../utils/errors.js";
import { writeIfMissing, retryTransient, retryFsOp } from "../../utils/atomicPublishWrite.js";
import { getPlatform } from "../../utils/platform.js";
import { xT, syn } from "../../services/daemon/relaunchArgs.js";
import { trackBgDispatch } from "./bgDispatch.js";
import { waitForPolicyLimitsToLoad } from "../../services/policyLimits/PolicyLimitsClient.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_ROUTINES, $Ns } from "../../tools/RemoteTriggerTool/policy.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { getCwd } from "../../utils/cwd.js";
import { callerProviderEnv, spawnBgSession, gateCauseExtra } from "./bgCommands.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { sleep } from "../../utils/sleep.js";
import { killJob } from "../../daemon/jobs/killJob.js";

//@ chunk-bg51yd13.js:72350-72602 placement
function getSecureStorageConfigDir() {
  let e = {},
    env = process.env;
  for (let o of knt) {
    let r = env[o];
    if (r === void 0) continue;
    if (VKo.has(o)) {
      if (isEnvTruthy(r)) e[o] = "1";
      continue;
    }
    if (r === "" && o !== "CLAUDE_SECURESTORAGE_CONFIG_DIR") continue;
    e[o] = r;
  }
  if (isProviderManagedByHost()) e.CLAUDE_CODE_HOST_GATEWAY_LINEAGE = "1";
  return e;
}
/**
 * 收集要透传给后台会话子进程的云/网关提供方环境变量：端点变量已设置（且选择开关为真）时连同其伴随变量一起拷贝；宿主托管环境下返回空。
 */
//@ chunk-bg51yd13.js:72602-72838 placement
function collectProviderPassthroughEnv(e) {
  if (isHostManagedEnvironment(process.env)) return {};
  let n = {};
  for (let o of hct) {
    if (!process.env[o.endpoint] || (o.selection !== void 0 && !isEnvTruthy(e[o.selection]))) continue;
    for (let r of [o.endpoint, ...o.companions]) {
      let s = process.env[r];
      if (s) n[r] = s;
    }
  }
  return n;
}
//@ chunk-bg51yd13.js:72838-72921 placement
function Ot(e) {
  return truncateWithEllipsis(
    qa(e)
      .replace(/[\s\x00-\x1f\x7f-\x9f]+/g, " ")
      .trim(),
    200,
  );
}
//@ chunk-bg51yd13.js:72921-73203 placement
var PASSTHROUGH_ENV_VARS = new Set([
  ...gj,
  "CLAUDE_CODE_HOST_GATEWAY_LINEAGE",
  "AWS_CONFIG_FILE",
  "AWS_SHARED_CREDENTIALS_FILE",
  "AWS_PROFILE",
  "AWS_REGION",
  "AWS_DEFAULT_REGION",
  "ANTHROPIC_BEDROCK_REGION_PREFIX",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CLOUD_PROJECT",
  "GCLOUD_PROJECT",
  "CLAUDE_CONFIG_DIR",
]);
//@ chunk-bg51yd13.js:73203-73311 placement
function toBgAgentTemplate(e) {
  return { name: e.agentType, description: e.whenToUse, initialPrompt: e.initialPrompt, color: e.color };
}
//@ chunk-bg51yd13.js:73311-73327 placement
var ace = toBgAgentTemplate(CLAUDE_AGENT);
/**
 * 按 --agent 名字解析后台会话模板：先在用户代理列表里按名字（或 插件:名字 后缀）找，再查内置代理，含冒号的当作插件代理名；都没有时返回默认模板。
 */
//@ chunk-bg51yd13.js:73327-73670 placement
function resolveBgAgentTemplate(e, n) {
  if (!e?.agent) return ace;
  let agent = e.agent,
    lower = agent.toLowerCase(),
    s =
      n?.find((u) => u.name.toLowerCase() === lower) ??
      n?.find((u) => u.name.toLowerCase().endsWith(`:${lower}`));
  if (s) return s;
  let found = getBuiltInAgents().find((u) => u.agentType.toLowerCase() === lower);
  if (found) return { ...ace, name: found.agentType };
  if (agent.includes(":")) return { ...ace, name: agent };
  return n ? ace : { ...ace, name: agent };
}
/**
 * 读取当前目录可用的代理定义，过滤掉内置与运行时注册的代理，转成后台会话模板列表。
 */
//@ chunk-bg51yd13.js:73670-73774 placement
async function listUserAgentTemplates(e, n) {
  let { activeAgents: activeAgents } = await getAgentDefinitionsWithOverrides(e, n);
  return activeAgents
    .filter((r) => !isBuiltInAgent(r) && !isRunTimeRegisteredAgent(r))
    .map(toBgAgentTemplate);
}
//@ chunk-bg51yd13.js:73774-74134 placement
async function findGitRoot(e) {
  let n;
  try {
    n = await readdir(e, { withFileTypes: !0 });
  } catch {
    return {};
  }
  let mapped = n
      .filter((s) => (s.isDirectory() || s.isSymbolicLink()) && !s.name.startsWith(".") && !/\s/.test(s.name))
      .map(async (s) => {
        let l = join(e, s.name);
        try {
          return (await stat(join(l, ".git")), [s.name, l]);
        } catch {
          return null;
        }
      }),
    filtered = (await Promise.all(mapped)).filter((s) => s !== null);
  return Object.fromEntries(filtered);
}
/**
 * 把粘贴的图片写到会话 tmp 目录，并把消息中的图片换成路径引用。
 */
//@ chunk-bg51yd13.js:74134-75312 placement
async function materializePastedImages(e, n, o, r, s = "path") {
  let filtered = parsePastedRefs(e).filter((A) => n[A.id]?.type === "image");
  if (filtered.length === 0) return e;
  let u = join(getJobDir(o), "tmp"),
    mapped = filtered.map((A) => {
      let R = n[A.id],
        buffer = Buffer.from(R.content, "base64"),
        D = (R.mediaType ?? "image/png").split("/")[1] || "png",
        S = computeContentHash(buffer),
        E = `pasted-${S.slice(0, 12)}.${D}`;
      return { ref: A, bytes: buffer, digest: S, name: E };
    }),
    p =
      isStorageV5Enabled() &&
      r !== void 0 &&
      isValidKeySegment(o) &&
      mapped.every((A) => isValidKeySegment(A.name));
  await ensureJobTmpFolder(o, p ? r : void 0);
  let w = e;
  for (let A = mapped.length - 1; A >= 0; A--) {
    let { ref: ref, bytes: bytes, digest: digest, name: S } = mapped[A],
      E = join(u, S);
    if (p) {
      let job = STORAGE_SPACES.job(o, ["tmp", S]),
        write = await r.write(job, bytes, qt),
        T = write.ok || (await storageDigestMatches(r, job, bytes, digest));
      if (!T)
        (await r.delete(job),
          (write = await r.write(job, bytes, qt)),
          (T = write.ok || (await storageDigestMatches(r, job, bytes, digest))));
      if (!T && !write.ok) {
        let N = formatStorageError(write.error);
        throw (
          logForDebugging(`pasted-image write failed: ${N}`, { level: "error" }),
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `pasted-image write failed: ${N}`,
              "pasted-image write failed",
            ),
            "telemetryCode" in write.error && write.error.telemetryCode !== void 0
              ? { code: write.error.telemetryCode }
              : {},
          )
        );
      }
    } else {
      let x = await writeIfMissing(E, bytes);
      try {
        if (getPlatform() === "windows") await retryTransient(() => rm(E, { force: !0 }), E);
        await retryFsOp(x, E);
      } catch (error) {
        throw (await rm(x, { force: !0 }).catch(() => {}), error);
      }
    }
    w =
      w.slice(0, ref.index) +
      (s === "note" ? `[Image not shown, read it from ${E}]` : E) +
      w.slice(ref.index + ref.match.length);
  }
  return w;
}
//@ chunk-bg51yd13.js:75312-75349 placement
function pxs(e) {
  _e().setExtraArgs(e);
}
//@ chunk-bg51yd13.js:75349-75386 placement
function gAr() {
  return _e().extraArgs;
}
//@ chunk-bg51yd13.js:75386-75762 placement
function buildDispatchArgs(e) {
  if (!e) return [];
  return [
    ...xT("--model", e.model),
    ...xT("--effort", e.effort),
    ...xT(e.permissionModeInherited ? "--inherit-permission-mode" : "--permission-mode", e.permissionMode),
    ...(e.allowBypass ? ["--allow-dangerously-skip-permissions"] : []),
    ...xT("--json-schema", e.jsonSchema),
    ...xT("--append-system-prompt", e.appendSystemPrompt),
    ...xT("--fast-mode", syn(e.fastMode)),
  ];
}
/**
 * 派发一个后台会话（没有会话 id 时生成 UUID），并以其前 8 位登记到在途派发表。
 */
//@ chunk-bg51yd13.js:75762-75863 placement
function dispatchBgSessionTracked(e, n, o, r) {
  let s = o?.sessionId ?? randomUUID();
  return trackBgDispatch(s.slice(0, 8), dispatchBgSession(e, n, { ...o, sessionId: s }, r));
}
/**
 * 派发一个后台会话（含 Routines 预备、性能打点）。
 */
//@ chunk-bg51yd13.js:75863-77499 placement
async function dispatchBgSession(e, n, o, r) {
  let {
    sessionId: sessionId,
    targetCwd: targetCwd,
    routine: routine,
    defaults: defaults,
    displayIntent: displayIntent,
  } = o;
  if (routine) {
    await waitForPolicyLimitsToLoad();
    let T = policyDeniedReason(ALLOW_ROUTINES, "Routines", "are", $Ns);
    if (T) return (logOrgPolicyDenied(ALLOW_ROUTINES, "dispatch"), { ok: !1, error: T });
  }
  logForDebugging("[PERF:bg-dispatch-start]");
  let sliced = sessionId.slice(0, 8),
    A = targetCwd ?? getCwd(),
    R = routine ? xT("--routine", routine) : xT("--agent", e.name),
    h = [..._e().extraArgs, ...R, ...buildDispatchArgs(defaults)],
    D = getJobDir(sliced);
  try {
    (await ensureJobTmpFolder(sliced, r),
      await writeStateAtomic(
        D,
        makeInitialState({
          template: routine ? { name: routine, description: "" } : e,
          routine: routine,
          respawnFlags: h,
          intent: n,
          displayIntent: displayIntent,
          ...(routine && !n && { tempo: "idle", detail: "(idle \u2014 waiting for trigger)" }),
          providerEnv: callerProviderEnv(),
          sessionId: sessionId,
          cwd: A,
          originCwd: A,
        }),
        r,
      ));
  } catch (error) {
    return (
      await rm(D, { recursive: !0, force: !0 }).catch(() => {}),
      invalidateJobStateCache(D),
      logFeatureBad("fleet_view_dispatch", "state_write_failed", {
        errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
      }),
      { ok: !1, error: `Couldn't create the job \u2014 ${errorMessage(error)}` }
    );
  }
  let S = [...h, ...(n ? ["--", n] : [])],
    now = Date.now(),
    x = await spawnBgSession(S, sessionId, "fleet", A, void 0, void 0, void 0, r),
    P = !x.ok && (x.reason === "gate_blocked" || x.reason === "cwd_gone");
  if (!x.ok && !x.alive && x.reason === "ack_timeout" && Date.now() - now < 2000)
    (logForDebugging(`bg: dispatch fast-failed (${Date.now() - now}ms) \u2014 retrying once`, {
      level: "warn",
    }),
      await sleep(500),
      (x = await spawnBgSession(S, sessionId, "fleet", A, void 0, void 0, void 0, r)));
  if (!x.ok) {
    if (x.alive)
      return (logFeatureSad("fleet_view_dispatch", "alive_collision"), { ok: !1, error: x.error, alive: !0 });
    if (!P) await killJob(sliced, void 0, void 0, r).catch(() => {});
    return (
      await rm(D, { recursive: !0, force: !0 }).catch(() => {}),
      invalidateJobStateCache(D),
      (Zt(x.reason) ? logFeatureSad : logFeatureBad)(
        "fleet_view_dispatch",
        x.reason ?? "spawn_failed",
        ...gateCauseExtra(x.gateCause),
      ),
      { ok: !1, error: x.error, reason: x.reason }
    );
  }
  if ((logForDebugging("[PERF:bg-dispatch-end]"), x.rescued)) logFeatureSad("fleet_view_dispatch", "rescued");
  else logFeatureOk("fleet_view_dispatch");
  return { ok: !0, jobId: x.short, sessionId: sessionId };
}

export {
  buildDispatchArgs,
  findGitRoot,
  listUserAgentTemplates,
  pxs,
  ace,
  gAr,
  resolveBgAgentTemplate,
  materializePastedImages,
  dispatchBgSessionTracked,
  collectProviderPassthroughEnv,
  Ot,
  getSecureStorageConfigDir,
  PASSTHROUGH_ENV_VARS,
};
