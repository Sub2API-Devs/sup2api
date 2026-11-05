/**
 * cli/bg/bgSpawnEnv.ts
 *
 * 2.1.316 新增：后台会话子进程环境（认证/网关/云凭据变量透传）、粘贴图片落盘与派发参数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gwh0qn2w.js (15)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-gwh0qn2w.js:72642-72894 placement
function getSecureStorageConfigDir() {
  let env = {};
  let env_2 = process.env;
  for (let name of BACKGROUND_ALLOWED_ENV_NAMES) {
    let value = env_2[name];
    if (value === undefined) continue;
    if (ENV_FORCE_PASSTHROUGH_NAMES.has(name)) {
      if (isEnvTruthy(value)) env[name] = "1";
      continue;
    }
    if (value === "" && name !== "CLAUDE_SECURESTORAGE_CONFIG_DIR") continue;
    env[name] = value;
  }
  if (isProviderManagedByHost()) env.CLAUDE_CODE_HOST_GATEWAY_LINEAGE = "1";
  return env;
}
//@ chunk-gwh0qn2w.js:72894-73130 placement
/**
 * 收集要透传给后台会话子进程的云/网关提供方环境变量：端点变量已设置（且选择开关为真）时连同其伴随变量一起拷贝；宿主托管环境下返回空。
 */
function collectProviderPassthroughEnv(providerEnv) {
  if (isHostManagedEnvironment(process.env)) return {};
  let passthrough = {};
  for (let pair of PROVIDER_ENDPOINT_PAIRS) {
    if (
      !process.env[pair.endpoint] ||
      (pair.selection !== undefined && !isEnvTruthy(providerEnv[pair.selection]))
    )
      continue;
    for (let name of [pair.endpoint, ...pair.companions]) {
      let value = process.env[name];
      if (value) passthrough[name] = value;
    }
  }
  return passthrough;
}
//@ chunk-gwh0qn2w.js:73130-73213 placement
function sanitizeLogLine(detail) {
  return truncateWithEllipsis(
    stripAnsiPerLine(detail)
      .replace(/[\s\x00-\x1f\x7f-\x9f]+/g, " ")
      .trim(),
    200,
  );
}
//@ chunk-gwh0qn2w.js:73213-73495 placement
var PASSTHROUGH_ENV_VARS; // deferred: uses PROVIDER_ENV_VARS (../../utils/managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gwh0qn2w.js:73213", () => {
  PASSTHROUGH_ENV_VARS = new Set([
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
});
//@ chunk-gwh0qn2w.js:73495-73603 placement
function toBgAgentTemplate(agent) {
  return {
    name: agent.agentType,
    description: agent.whenToUse,
    initialPrompt: agent.initialPrompt,
    color: agent.color,
  };
}
//@ chunk-gwh0qn2w.js:73603-73619 placement
/**
 * 后台会话的默认 agent 模板（由 CLAUDE_AGENT 转成后台用的形状）。
 */
var DEFAULT_BG_AGENT_TEMPLATE; // deferred: uses toBgAgentTemplate of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gwh0qn2w.js:73603", () => {
  DEFAULT_BG_AGENT_TEMPLATE = toBgAgentTemplate(CLAUDE_AGENT);
});
//@ chunk-gwh0qn2w.js:73619-73962 placement
/**
 * 按 --agent 名字解析后台会话模板：先在用户代理列表里按名字（或 插件:名字 后缀）找，再查内置代理，含冒号的当作插件代理名；都没有时返回默认模板。
 */
function resolveBgAgentTemplate(defaults, templates) {
  if (!defaults?.agent) return DEFAULT_BG_AGENT_TEMPLATE;
  let agent = defaults.agent;
  let lower = agent.toLowerCase();
  let userMatch =
    templates?.find((template) => template.name.toLowerCase() === lower) ??
    templates?.find((template) => template.name.toLowerCase().endsWith(`:${lower}`));
  if (userMatch) return userMatch;
  let found = getBuiltInAgents().find((agent) => agent.agentType.toLowerCase() === lower);
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
  return templates
    ? DEFAULT_BG_AGENT_TEMPLATE
    : {
        ...DEFAULT_BG_AGENT_TEMPLATE,
        name: agent,
      };
}
//@ chunk-gwh0qn2w.js:73962-74066 placement
/**
 * 读取当前目录可用的代理定义，过滤掉内置与运行时注册的代理，转成后台会话模板列表。
 */
async function listUserAgentTemplates(cwd, storage) {
  let { activeAgents } = await getAgentDefinitionsWithOverrides(cwd, storage);
  return activeAgents
    .filter((activeAgent) => !isBuiltInAgent(activeAgent) && !isRunTimeRegisteredAgent(activeAgent))
    .map(toBgAgentTemplate);
}
//@ chunk-gwh0qn2w.js:74066-74426 placement
async function findGitRoot(dir) {
  let entries;
  try {
    entries = await readdir(dir, {
      withFileTypes: true,
    });
  } catch {
    return {};
  }
  let mapped = entries
    .filter(
      (entry) =>
        (entry.isDirectory() || entry.isSymbolicLink()) &&
        !entry.name.startsWith(".") &&
        !/\s/.test(entry.name),
    )
    .map(async (entry) => {
      let childPath = join(dir, entry.name);
      try {
        await stat(join(childPath, ".git"));
        return [entry.name, childPath];
      } catch {
        return null;
      }
    });
  let filtered = (await Promise.all(mapped)).filter((pair) => pair !== null);
  return Object.fromEntries(filtered);
}
//@ chunk-gwh0qn2w.js:74426-75604 placement
/**
 * 把粘贴的图片写到会话 tmp 目录，并把消息中的图片换成路径引用。
 */
async function materializePastedImages(text, pastedById, short, storage, renderMode = "path") {
  let filtered = parsePastedRefs(text).filter((ref) => pastedById[ref.id]?.type === "image");
  if (filtered.length === 0) return text;
  let tmpDir = join(getJobDir(short), "tmp");
  let mapped = filtered.map((ref) => {
    let pasted = pastedById[ref.id];
    let buffer = Buffer.from(pasted.content, "base64");
    let ext = (pasted.mediaType ?? "image/png").split("/")[1] || "png";
    let contentHash = computeContentHash(buffer);
    let name = `pasted-${contentHash.slice(0, 12)}.${ext}`;
    return {
      ref,
      bytes: buffer,
      digest: contentHash,
      name,
    };
  });
  let useStorage =
    isStorageV5Enabled() &&
    storage !== undefined &&
    isValidKeySegment(short) &&
    mapped.every((image) => isValidKeySegment(image.name));
  await ensureJobTmpFolder(short, useStorage ? storage : undefined);
  let output = text;
  for (let j = mapped.length - 1; j >= 0; j--) {
    let { ref, bytes, digest, name } = mapped[j];
    let path = join(tmpDir, name);
    if (useStorage) {
      let key = STORAGE_SPACES.job(short, ["tmp", name]);
      let writeResult = await storage.write(key, bytes, COPY_ON_CREATE_WRITE_OPTIONS);
      let isWritten = writeResult.ok || (await storageDigestMatches(storage, key, bytes, digest));
      if (!isWritten) {
        await storage.delete(key);
        writeResult = await storage.write(key, bytes, COPY_ON_CREATE_WRITE_OPTIONS);
        isWritten = writeResult.ok || (await storageDigestMatches(storage, key, bytes, digest));
      }
      if (!isWritten && !writeResult.ok) {
        let detail = formatStorageError(writeResult.error);
        logForDebugging(`pasted-image write failed: ${detail}`, {
          level: "error",
        });
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `pasted-image write failed: ${detail}`,
            "pasted-image write failed",
          ),
          "telemetryCode" in writeResult.error && writeResult.error.telemetryCode !== undefined
            ? {
                code: writeResult.error.telemetryCode,
              }
            : {},
        );
      }
    } else {
      let tempPath = await writeIfMissing(path, bytes);
      try {
        if (getPlatform() === "windows")
          await retryTransient(
            () =>
              rm(path, {
                force: true,
              }),
            path,
          );
        await retryFsOp(tempPath, path);
      } catch (error) {
        await rm(tempPath, {
          force: true,
        }).catch(() => {});
        throw error;
      }
    }
    output =
      output.slice(0, ref.index) +
      (renderMode === "note" ? `[Image not shown, read it from ${path}]` : path) +
      output.slice(ref.index + ref.match.length);
  }
  return output;
}
//@ chunk-gwh0qn2w.js:75604-75641 placement
/**
 * 设置 spare 池的额外启动参数。
 */
function setSpareExtraArgs(args) {
  bgSparePool().setExtraArgs(args);
}
//@ chunk-gwh0qn2w.js:75641-75678 placement
/**
 * 读取 spare 池当前的额外启动参数。
 */
function spareExtraArgs() {
  return bgSparePool().extraArgs;
}
//@ chunk-gwh0qn2w.js:75678-76054 placement
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
//@ chunk-gwh0qn2w.js:76054-76155 placement
/**
 * 派发一个后台会话（没有会话 id 时生成 UUID），并以其前 8 位登记到在途派发表。
 */
function dispatchBgSessionTracked(template, intent, options, storage) {
  let sessionId = options?.sessionId ?? randomUUID();
  return trackBgDispatch(
    sessionId.slice(0, 8),
    dispatchBgSession(
      template,
      intent,
      {
        ...options,
        sessionId,
      },
      storage,
    ),
  );
}
//@ chunk-gwh0qn2w.js:76155-77791 placement
/**
 * 派发一个后台会话（含 Routines 预备、性能打点）。
 */
async function dispatchBgSession(template, intent, options, storage) {
  let { sessionId, targetCwd, routine, defaults, displayIntent } = options;
  if (routine) {
    await waitForPolicyLimitsToLoad();
    let deniedReason = policyDeniedReason(ALLOW_ROUTINES, "Routines", "are", ROUTINES_POLICY_DISABLED_TEXT);
    if (deniedReason) {
      logOrgPolicyDenied(ALLOW_ROUTINES, "dispatch");
      return {
        ok: false,
        error: deniedReason,
      };
    }
  }
  logForDebugging("[PERF:bg-dispatch-start]");
  let sliced = sessionId.slice(0, 8);
  let cwd = targetCwd ?? getCwd();
  let templateArgs = routine ? flagArgs("--routine", routine) : flagArgs("--agent", template.name);
  let respawnFlags = [...bgSparePool().extraArgs, ...templateArgs, ...buildDispatchArgs(defaults)];
  let jobDir = getJobDir(sliced);
  try {
    await ensureJobTmpFolder(sliced, storage);
    await writeStateAtomic(
      jobDir,
      makeInitialState({
        template: routine
          ? {
              name: routine,
              description: "",
            }
          : template,
        routine,
        respawnFlags,
        intent,
        displayIntent,
        ...(routine &&
          !intent && {
            tempo: "idle",
            detail: "(idle \u2014 waiting for trigger)",
          }),
        providerEnv: callerProviderEnv(),
        sessionId,
        cwd,
        originCwd: cwd,
      }),
      storage,
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
  let childArgs = [...respawnFlags, ...(intent ? ["--", intent] : [])];
  let now = Date.now();
  let bgSession = await spawnBgSession(
    childArgs,
    sessionId,
    "fleet",
    cwd,
    undefined,
    undefined,
    undefined,
    storage,
  );
  let isExpectedGateFailure =
    !bgSession.ok && (bgSession.reason === "gate_blocked" || bgSession.reason === "cwd_gone");
  if (!bgSession.ok && !bgSession.alive && bgSession.reason === "ack_timeout" && Date.now() - now < 2000) {
    logForDebugging(`bg: dispatch fast-failed (${Date.now() - now}ms) \u2014 retrying once`, {
      level: "warn",
    });
    await sleep(500);
    bgSession = await spawnBgSession(
      childArgs,
      sessionId,
      "fleet",
      cwd,
      undefined,
      undefined,
      undefined,
      storage,
    );
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
    if (!isExpectedGateFailure) await killJob(sliced, undefined, undefined, storage).catch(() => {});
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
  findGitRoot,
  listUserAgentTemplates,
  setSpareExtraArgs,
  DEFAULT_BG_AGENT_TEMPLATE,
  spareExtraArgs,
  buildDispatchArgs,
  resolveBgAgentTemplate,
  materializePastedImages,
  dispatchBgSessionTracked,
  collectProviderPassthroughEnv,
  sanitizeLogLine,
  getSecureStorageConfigDir,
  PASSTHROUGH_ENV_VARS,
};
