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
import { readdir, stat, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { BACKGROUND_ALLOWED_ENV_NAMES, ENV_FORCE_PASSTHROUGH_NAMES } from "../forwardedFlags.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { isProviderManagedByHost } from "../../utils/entrypointKinds.js";
import {
  isHostManagedEnvironment,
  PROVIDER_ENDPOINT_PAIRS,
  PROVIDER_SELECTION_ENV_VARS,
} from "../../utils/managedEnvConstants.js";
import { truncateWithEllipsis } from "../../services/sessionStatus/sessionStateClassifier.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
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
import {
  COPY_ON_CREATE_WRITE_OPTIONS,
  storageDigestMatches,
  bgSparePool,
  isSoftDispatchFailure,
} from "./bgSpare.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizeErrnoForTelemetry,
  errorMessage,
} from "../../utils/errors.js";
import { writeIfMissing, retryTransient, retryFsOp } from "../../utils/atomicPublishWrite.js";
import { getPlatform } from "../../utils/platform.js";
import { flagArgs, onOffFlagValue } from "../../services/daemon/relaunchArgs.js";
import { trackBgDispatch } from "./bgDispatch.js";
import { waitForPolicyLimitsToLoad } from "../../services/policyLimits/PolicyLimitsClient.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_ROUTINES, ROUTINES_POLICY_DISABLED_TEXT } from "../../tools/RemoteTriggerTool/policy.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { getCwd } from "../../utils/cwd.js";
import { callerProviderEnv, spawnBgSession, gateCauseExtra } from "./bgCommands.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { sleep } from "../../utils/sleep.js";
import { killJob } from "../../daemon/jobs/killJob.js";

//@ chunk-bg51yd13.js:72350-72602 placement
function getSecureStorageConfigDir() {
  let e = {};
  let env = process.env;
  for (let o of BACKGROUND_ALLOWED_ENV_NAMES) {
    let r = env[o];
    if (r === undefined) continue;
    if (ENV_FORCE_PASSTHROUGH_NAMES.has(o)) {
      if (isEnvTruthy(r)) e[o] = "1";
      continue;
    }
    if (r === "" && o !== "CLAUDE_SECURESTORAGE_CONFIG_DIR") continue;
    e[o] = r;
  }
  if (isProviderManagedByHost()) e.CLAUDE_CODE_HOST_GATEWAY_LINEAGE = "1";
  return e;
}
//@ chunk-bg51yd13.js:72602-72838 placement
/**
 * 收集要透传给后台会话子进程的云/网关提供方环境变量：端点变量已设置（且选择开关为真）时连同其伴随变量一起拷贝；宿主托管环境下返回空。
 */
function collectProviderPassthroughEnv(providerEnv) {
  if (isHostManagedEnvironment(process.env)) return {};
  let n = {};
  for (let o of PROVIDER_ENDPOINT_PAIRS) {
    if (!process.env[o.endpoint] || (o.selection !== undefined && !isEnvTruthy(providerEnv[o.selection])))
      continue;
    for (let r of [o.endpoint, ...o.companions]) {
      let s = process.env[r];
      if (s) n[r] = s;
    }
  }
  return n;
}
//@ chunk-bg51yd13.js:72838-72921 placement
function sanitizeLogLine(detail) {
  return truncateWithEllipsis(
    stripAnsiPerLine(detail)
      .replace(/[\s\x00-\x1f\x7f-\x9f]+/g, " ")
      .trim(),
    200,
  );
}
//@ chunk-bg51yd13.js:72921-73203 placement
var PASSTHROUGH_ENV_VARS = new Set([
  ...PROVIDER_SELECTION_ENV_VARS,
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
  return {
    name: e.agentType,
    description: e.whenToUse,
    initialPrompt: e.initialPrompt,
    color: e.color,
  };
}
//@ chunk-bg51yd13.js:73311-73327 placement
/**
 * 后台会话的默认 agent 模板（由 CLAUDE_AGENT 转成后台用的形状）。
 */
var DEFAULT_BG_AGENT_TEMPLATE = toBgAgentTemplate(CLAUDE_AGENT);
//@ chunk-bg51yd13.js:73327-73670 placement
/**
 * 按 --agent 名字解析后台会话模板：先在用户代理列表里按名字（或 插件:名字 后缀）找，再查内置代理，含冒号的当作插件代理名；都没有时返回默认模板。
 */
function resolveBgAgentTemplate(e, n) {
  if (!e?.agent) return DEFAULT_BG_AGENT_TEMPLATE;
  let agent = e.agent;
  let lower = agent.toLowerCase();
  let s =
    n?.find((u) => u.name.toLowerCase() === lower) ??
    n?.find((u) => u.name.toLowerCase().endsWith(`:${lower}`));
  if (s) return s;
  let found = getBuiltInAgents().find((u) => u.agentType.toLowerCase() === lower);
  if (found)
    return {
      ...DEFAULT_BG_AGENT_TEMPLATE,
      name: found.agentType,
    };
  if (agent.includes(":"))
    return {
      ...DEFAULT_BG_AGENT_TEMPLATE,
      name: agent,
    };
  return n
    ? DEFAULT_BG_AGENT_TEMPLATE
    : {
        ...DEFAULT_BG_AGENT_TEMPLATE,
        name: agent,
      };
}
//@ chunk-bg51yd13.js:73670-73774 placement
/**
 * 读取当前目录可用的代理定义，过滤掉内置与运行时注册的代理，转成后台会话模板列表。
 */
async function listUserAgentTemplates(cwd, n) {
  let { activeAgents } = await getAgentDefinitionsWithOverrides(cwd, n);
  return activeAgents
    .filter((activeAgent) => !isBuiltInAgent(activeAgent) && !isRunTimeRegisteredAgent(activeAgent))
    .map(toBgAgentTemplate);
}
//@ chunk-bg51yd13.js:73774-74134 placement
async function findGitRoot(e) {
  let n;
  try {
    n = await readdir(e, {
      withFileTypes: true,
    });
  } catch {
    return {};
  }
  let mapped = n
    .filter((s) => (s.isDirectory() || s.isSymbolicLink()) && !s.name.startsWith(".") && !/\s/.test(s.name))
    .map(async (s) => {
      let l = join(e, s.name);
      try {
        await stat(join(l, ".git"));
        return [s.name, l];
      } catch {
        return null;
      }
    });
  let filtered = (await Promise.all(mapped)).filter((s) => s !== null);
  return Object.fromEntries(filtered);
}
//@ chunk-bg51yd13.js:74134-75312 placement
/**
 * 把粘贴的图片写到会话 tmp 目录，并把消息中的图片换成路径引用。
 */
async function materializePastedImages(e, n, o, storageV5, s = "path") {
  let filtered = parsePastedRefs(e).filter((A) => n[A.id]?.type === "image");
  if (filtered.length === 0) return e;
  let u = join(getJobDir(o), "tmp");
  let mapped = filtered.map((A) => {
    let R = n[A.id];
    let buffer = Buffer.from(R.content, "base64");
    let D = (R.mediaType ?? "image/png").split("/")[1] || "png";
    let contentHash = computeContentHash(buffer);
    let name = `pasted-${contentHash.slice(0, 12)}.${D}`;
    return {
      ref: A,
      bytes: buffer,
      digest: contentHash,
      name,
    };
  });
  let p =
    isStorageV5Enabled() &&
    storageV5 !== undefined &&
    isValidKeySegment(o) &&
    mapped.every((A) => isValidKeySegment(A.name));
  await ensureJobTmpFolder(o, p ? storageV5 : undefined);
  let w = e;
  for (let j = mapped.length - 1; j >= 0; j--) {
    let { ref, bytes, digest, name: S } = mapped[j];
    let E = join(u, S);
    if (p) {
      let x = STORAGE_SPACES.job(o, ["tmp", S]);
      let P = await storageV5.write(x, bytes, COPY_ON_CREATE_WRITE_OPTIONS);
      let T = P.ok || (await storageDigestMatches(storageV5, x, bytes, digest));
      if (!T) {
        await storageV5.delete(x);
        P = await storageV5.write(x, bytes, COPY_ON_CREATE_WRITE_OPTIONS);
        T = P.ok || (await storageDigestMatches(storageV5, x, bytes, digest));
      }
      if (!T && !P.ok) {
        let N = formatStorageError(P.error);
        logForDebugging(`pasted-image write failed: ${N}`, {
          level: "error",
        });
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `pasted-image write failed: ${N}`,
            "pasted-image write failed",
          ),
          "telemetryCode" in P.error && P.error.telemetryCode !== undefined
            ? {
                code: P.error.telemetryCode,
              }
            : {},
        );
      }
    } else {
      let x = await writeIfMissing(E, bytes);
      try {
        if (getPlatform() === "windows")
          await retryTransient(
            () =>
              rm(E, {
                force: true,
              }),
            E,
          );
        await retryFsOp(x, E);
      } catch (error) {
        await rm(x, {
          force: true,
        }).catch(() => {});
        throw error;
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
/**
 * 设置 spare 池的额外启动参数。
 */
function setSpareExtraArgs(e) {
  bgSparePool().setExtraArgs(e);
}
//@ chunk-bg51yd13.js:75349-75386 placement
/**
 * 读取 spare 池当前的额外启动参数。
 */
function spareExtraArgs() {
  return bgSparePool().extraArgs;
}
//@ chunk-bg51yd13.js:75386-75762 placement
function buildDispatchArgs(defaults) {
  if (!defaults) return [];
  return [
    ...flagArgs("--model", defaults.model),
    ...flagArgs("--effort", defaults.effort),
    ...flagArgs(
      defaults.permissionModeInherited ? "--inherit-permission-mode" : "--permission-mode",
      defaults.permissionMode,
    ),
    ...(defaults.allowBypass ? ["--allow-dangerously-skip-permissions"] : []),
    ...flagArgs("--json-schema", defaults.jsonSchema),
    ...flagArgs("--append-system-prompt", defaults.appendSystemPrompt),
    ...flagArgs("--fast-mode", onOffFlagValue(defaults.fastMode)),
  ];
}
//@ chunk-bg51yd13.js:75762-75863 placement
/**
 * 派发一个后台会话（没有会话 id 时生成 UUID），并以其前 8 位登记到在途派发表。
 */
function dispatchBgSessionTracked(e, n, o, r) {
  let s = o?.sessionId ?? randomUUID();
  return trackBgDispatch(
    s.slice(0, 8),
    dispatchBgSession(
      e,
      n,
      {
        ...o,
        sessionId: s,
      },
      r,
    ),
  );
}
//@ chunk-bg51yd13.js:75863-77499 placement
/**
 * 派发一个后台会话（含 Routines 预备、性能打点）。
 */
async function dispatchBgSession(e, n, o, r) {
  let { sessionId, targetCwd, routine, defaults, displayIntent } = o;
  if (routine) {
    await waitForPolicyLimitsToLoad();
    let T = policyDeniedReason(ALLOW_ROUTINES, "Routines", "are", ROUTINES_POLICY_DISABLED_TEXT);
    if (T) {
      logOrgPolicyDenied(ALLOW_ROUTINES, "dispatch");
      return {
        ok: false,
        error: T,
      };
    }
  }
  logForDebugging("[PERF:bg-dispatch-start]");
  let sliced = sessionId.slice(0, 8);
  let A = targetCwd ?? getCwd();
  let R = routine ? flagArgs("--routine", routine) : flagArgs("--agent", e.name);
  let h = [...bgSparePool().extraArgs, ...R, ...buildDispatchArgs(defaults)];
  let jobDir = getJobDir(sliced);
  try {
    await ensureJobTmpFolder(sliced, r);
    await writeStateAtomic(
      jobDir,
      makeInitialState({
        template: routine
          ? {
              name: routine,
              description: "",
            }
          : e,
        routine,
        respawnFlags: h,
        intent: n,
        displayIntent,
        ...(routine &&
          !n && {
            tempo: "idle",
            detail: "(idle \u2014 waiting for trigger)",
          }),
        providerEnv: callerProviderEnv(),
        sessionId,
        cwd: A,
        originCwd: A,
      }),
      r,
    );
  } catch (error) {
    await rm(jobDir, {
      recursive: true,
      force: true,
    }).catch(() => {});
    invalidateJobStateCache(jobDir);
    logFeatureBad("fleet_view_dispatch", "state_write_failed", {
      errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
    });
    return {
      ok: false,
      error: `Couldn't create the job \u2014 ${errorMessage(error)}`,
    };
  }
  let S = [...h, ...(n ? ["--", n] : [])];
  let now = Date.now();
  let bgSession = await spawnBgSession(S, sessionId, "fleet", A, undefined, undefined, undefined, r);
  let P = !bgSession.ok && (bgSession.reason === "gate_blocked" || bgSession.reason === "cwd_gone");
  if (!bgSession.ok && !bgSession.alive && bgSession.reason === "ack_timeout" && Date.now() - now < 2000) {
    logForDebugging(`bg: dispatch fast-failed (${Date.now() - now}ms) \u2014 retrying once`, {
      level: "warn",
    });
    await sleep(500);
    bgSession = await spawnBgSession(S, sessionId, "fleet", A, undefined, undefined, undefined, r);
  }
  if (!bgSession.ok) {
    if (bgSession.alive) {
      logFeatureSad("fleet_view_dispatch", "alive_collision");
      return {
        ok: false,
        error: bgSession.error,
        alive: true,
      };
    }
    if (!P) await killJob(sliced, undefined, undefined, r).catch(() => {});
    await rm(jobDir, {
      recursive: true,
      force: true,
    }).catch(() => {});
    invalidateJobStateCache(jobDir);
    (isSoftDispatchFailure(bgSession.reason) ? logFeatureSad : logFeatureBad)(
      "fleet_view_dispatch",
      bgSession.reason ?? "spawn_failed",
      ...gateCauseExtra(bgSession.gateCause),
    );
    return {
      ok: false,
      error: bgSession.error,
      reason: bgSession.reason,
    };
  }
  logForDebugging("[PERF:bg-dispatch-end]");
  if (bgSession.rescued) logFeatureSad("fleet_view_dispatch", "rescued");
  else logFeatureOk("fleet_view_dispatch");
  return {
    ok: true,
    jobId: bgSession.short,
    sessionId,
  };
}
export {
  buildDispatchArgs,
  findGitRoot,
  listUserAgentTemplates,
  setSpareExtraArgs,
  DEFAULT_BG_AGENT_TEMPLATE,
  spareExtraArgs,
  resolveBgAgentTemplate,
  materializePastedImages,
  dispatchBgSessionTracked,
  collectProviderPassthroughEnv,
  sanitizeLogLine,
  getSecureStorageConfigDir,
  PASSTHROUGH_ENV_VARS,
};
