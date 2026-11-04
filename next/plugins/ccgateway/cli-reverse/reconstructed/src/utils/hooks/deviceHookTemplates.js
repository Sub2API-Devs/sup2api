/**
 * utils/hooks/deviceHookTemplates.ts
 *
 * 2.1.316 新增：设备钩子模板
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y47q51t0.js (18)
 * attribution: placement 18
 */
import { join } from "path";
import { homedir } from "os";
import { spawn } from "child_process";
import { lstat, realpath, mkdir, open } from "fs/promises";
import { constants } from "fs";
import { createHash } from "crypto";
import { subprocessEnv } from "../subprocessEnv.js";
import { hooksSettingForEvent } from "./hookEventSets.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { hookJSONOutputSchema } from "../../types/hooks.js";
import { clipHookText, parseHookJsonOutput, isBlockingHookOutput } from "./hookSpecificOutput.js";
import { getErrnoCode } from "../errors.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";
import { getClaudeTempDirRealpath } from "../tempDirRealpaths.js";
import { verifyTempDirOwnership } from "../tempDir.js";
import { isPreToolUseTemplate, getHookTemplate } from "./hookTemplates.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../debug.js";
import { registerDeviceHookCallbacks, unregisterDeviceHookCallbacks } from "./deviceHooks/templates.js";

//@ chunk-y47q51t0.js:3894-4491 placement
/**
 * 设备 hook 模板用的 python3 候选路径与完整性校验脚本。
 */
var PYTHON3_CANDIDATES = ["/usr/bin/python3", "/usr/local/bin/python3", "/bin/python3"];
var INTEGRITY_FAILED_EXIT_CODE = 86;
var buildTemplateLauncherScript = () =>
  [
    "import hashlib,os,sys",
    "p,d,n=sys.argv[1],sys.argv[2],int(sys.argv[3])",
    `fail=lambda m:(sys.stderr.write('device hook template integrity check failed: '+m+'\\n'),sys.exit(${INTEGRITY_FAILED_EXIT_CODE}))`,
    "os.path.isfile(p) or fail('not a regular file')",
    "os.path.getsize(p)<=n or fail('too large')",
    "b=None",
    'try: b=open(p,"rb").read()',
    "except OSError as e: fail(type(e).__name__)",
    "hashlib.sha256(b).hexdigest()==d or fail('digest mismatch')",
    "sys.argv=[p]",
    "exec(compile(b,p,'exec'),{'__name__':'__main__','__file__':p})",
  ].join(`
`);
var TEMPLATE_LAUNCHER_SCRIPT = buildTemplateLauncherScript();
//@ chunk-y47q51t0.js:4491-4581 placement
async function firstVettedPython3(templateFs) {
  for (let candidate of PYTHON3_CANDIDATES) {
    let vetted = await templateFs.vet(candidate);
    if (vetted !== null) return vetted;
  }
  return null;
}
//@ chunk-y47q51t0.js:4581-4713 placement
async function writeTemplateFile(id, content, templateFs) {
  await templateFs.mkdir(templateFs.templateDir, 448);
  let path = join(templateFs.templateDir, `${id}.py`);
  await templateFs.writeFileAtomic(path, content, 384);
  return path;
}
//@ chunk-y47q51t0.js:4713-4781 placement
function templateLauncherArgs(python, scriptPath, templateId, maxBytes = 262144) {
  return [python, "-I", "-S", "-c", TEMPLATE_LAUNCHER_SCRIPT, scriptPath, templateId, String(maxBytes)];
}
//@ chunk-y47q51t0.js:4781-4847 placement
var UNSAFE_TEMPLATE_ENV_RE = /^(?:LD_|DYLD_|GCONV_PATH$|NLSPATH$|DEVELOPER_DIR$|PYTHON)/;
//@ chunk-y47q51t0.js:4847-4936 placement
function withoutUnsafeTemplateEnv(env) {
  let copy = {
    ...env,
  };
  for (let key of Object.keys(copy)) if (UNSAFE_TEMPLATE_ENV_RE.test(key)) delete copy[key];
  return copy;
}
//@ chunk-y47q51t0.js:4936-4948 placement
var MAX_TEMPLATE_OUTPUT_CHARS = 65536;
//@ chunk-y47q51t0.js:4948-5131 placement
async function runTemplateWithCwdFallback(argv, options, options_2) {
  let templateProcess = await spawnTemplateProcess(options.cwd, argv, options, options_2);
  return templateProcess.status === null &&
    templateProcess.signal === undefined &&
    !templateProcess.timedOut &&
    /ENOENT|spawn .* cwd|uv_cwd|not a directory/i.test(templateProcess.stderr)
    ? spawnTemplateProcess(homedir(), argv, options, options_2)
    : templateProcess;
}
//@ chunk-y47q51t0.js:5131-6415 placement
/**
 * 在指定 cwd 以独立进程组启动设备钩子模板（python 启动器），把钩子输入写入 stdin，收集有上限的 stdout/stderr，处理超时与中止，返回 {stdout, stderr, status, signal, timedOut}。
 */
function spawnTemplateProcess(cwd, argv, input, options) {
  return new Promise((resolve) => {
    let [command, ...args] = argv;
    if (command === undefined) {
      resolve({
        stdout: "",
        stderr: "no command",
        status: null,
        timedOut: false,
      });
      return;
    }
    let settled = false;
    let finish = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    let child;
    try {
      child = spawn(command, args, {
        cwd,
        env: {
          ...withoutUnsafeTemplateEnv(options.env ?? subprocessEnv()),
          CLAUDE_PROJECT_DIR: options.projectDir,
        },
        stdio: ["pipe", "pipe", "pipe"],
        detached: true,
        windowsHide: true,
        ...hooksSettingForEvent(input.hook_event_name),
      });
    } catch (error) {
      finish({
        stdout: "",
        stderr: error instanceof Error ? error.message : "spawn failed",
        status: null,
        timedOut: false,
      });
      return;
    }
    let killGroup = () => {
      try {
        if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timer = setTimeout(
      (kill) => {
        timedOut = true;
        kill();
      },
      options.timeoutMs,
      killGroup,
    );
    let onAbort = () => killGroup();
    if (options.signal !== undefined)
      if (options.signal.aborted) onAbort();
      else
        options.signal.addEventListener("abort", onAbort, {
          once: true,
        });
    let append = (current, chunk, overflow) => {
      if (current.length + chunk.length > MAX_TEMPLATE_OUTPUT_CHARS) overflow();
      return current.length >= MAX_TEMPLATE_OUTPUT_CHARS
        ? current
        : (current + chunk).slice(0, MAX_TEMPLATE_OUTPUT_CHARS);
    };
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => (stdout = append(stdout, chunk, () => (stdoutTruncated = true))));
    child.stderr?.on("data", (chunk) => (stderr = append(stderr, chunk, () => (stderrTruncated = true))));
    child.stdin?.on("error", () => {});
    let settle = (status, exitSignal) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      finish({
        stdout,
        stderr,
        status,
        ...(exitSignal !== undefined && {
          signal: exitSignal,
        }),
        timedOut,
        ...(stdoutTruncated && {
          stdoutTruncated,
        }),
        ...(stderrTruncated && {
          stderrTruncated,
        }),
      });
    };
    child.on("error", (error) => {
      stderr = stderr || error.message;
      settle(null);
    });
    child.on("close", (status, exitSignal) => settle(status, exitSignal ?? undefined));
    let inputJson;
    try {
      inputJson = jsonStringify(input);
    } catch {
      inputJson = "";
    }
    child.stdin?.end(inputJson);
  });
}
//@ chunk-y47q51t0.js:6415-6757 placement
/**
 * 解析模板 hook 的标准输出：空输出、JSON 回答或无法读取。
 */
function parseTemplateAnswer(result) {
  let trimmed = result.stdout.trim();
  if (result.stdoutTruncated === true)
    return {
      kind: "unreadable",
    };
  if (!trimmed.startsWith("{"))
    return trimmed === ""
      ? {
          kind: "silent",
        }
      : {
          kind: "unreadable",
        };
  try {
    let parsed = hookJSONOutputSchema().safeParse(jsonParse(trimmed));
    if (!parsed.success)
      return {
        kind: "unreadable",
      };
    let output = parsed.data;
    return "async" in output
      ? {
          kind: "unreadable",
        }
      : {
          kind: "answer",
          answer: output,
        };
  } catch {
    return {
      kind: "unreadable",
    };
  }
}
//@ chunk-y47q51t0.js:6757-7794 placement
/**
 * 把模板 hook 的执行结果转换为 hook 输出：退出码 2 表示阻止，0 时解析回答。
 */
function templateResultToHookOutput(result) {
  if (result.status === 2)
    return {
      decision: "block",
      reason: result.stderr.trim() || "blocked by a device hook template",
    };
  if (result.status !== 0) return {};
  let templateAnswer = parseTemplateAnswer(result);
  if (templateAnswer.kind !== "answer") return {};
  let answer = templateAnswer.answer;
  let base = {
    ...(answer.continue === false && {
      continue: false,
      ...(answer.stopReason !== undefined && {
        stopReason: answer.stopReason,
      }),
    }),
    ...(answer.decision === "block" && {
      decision: "block",
      ...(answer.reason !== undefined && {
        reason: answer.reason,
      }),
    }),
    ...(answer.systemMessage !== undefined && {
      systemMessage: answer.systemMessage,
    }),
  };
  let hookSpecificOutput = answer.hookSpecificOutput;
  if (hookSpecificOutput?.hookEventName === "PreToolUse") {
    let permissionDecision =
      hookSpecificOutput.permissionDecision === "deny" || hookSpecificOutput.permissionDecision === "ask"
        ? hookSpecificOutput.permissionDecision
        : undefined;
    return {
      ...base,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        ...(permissionDecision !== undefined && {
          permissionDecision,
        }),
        ...(permissionDecision !== undefined &&
          hookSpecificOutput.permissionDecisionReason !== undefined && {
            permissionDecisionReason: hookSpecificOutput.permissionDecisionReason,
          }),
        ...(hookSpecificOutput.additionalContext !== undefined && {
          additionalContext: hookSpecificOutput.additionalContext,
        }),
      },
    };
  }
  if (
    hookSpecificOutput?.hookEventName === "PostToolUse" &&
    hookSpecificOutput.additionalContext !== undefined
  )
    return {
      ...base,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: hookSpecificOutput.additionalContext,
      },
    };
  return base;
}
//@ chunk-y47q51t0.js:7794-8077 placement
function classifyTemplateOutcome(result, aborted) {
  if (aborted) return "aborted";
  if (result.timedOut) return "timeout";
  if (result.signal !== undefined) return "killed";
  if (result.status === null) return "spawn_failed";
  if (result.status === INTEGRITY_FAILED_EXIT_CODE) return "integrity_failed";
  if (result.status === 0) return parseTemplateAnswer(result).kind === "unreadable" ? "error" : "ok";
  return result.status === 2 ? "blocked" : "error";
}
//@ chunk-y47q51t0.js:8077-8379 placement
/**
 * 模板 hook 失败原因的说明文本。
 */
var TEMPLATE_FAILURE_REASONS = {
  integrity_failed: "its file no longer matched what was verified",
  error: "it exited with an error or an unreadable answer",
  spawn_failed: "it could not be started",
  killed: "it was killed before it answered",
  interpreter_untrusted: "its interpreter can no longer be trusted",
  timeout: "it took too long",
};
//@ chunk-y47q51t0.js:8379-9189 placement
/**
 * 创建运行设备 hook 模板的执行函数：解析解释器、按超时运行并记录结果。
 */
function createTemplateHookRunner(argv, timeoutSec, hookEntry, report, isTrusted, projectDirOf) {
  return async (argv_2, timeoutMs, signal) => {
    let now = Date.now();
    let trusted = await isTrusted();
    let run = trusted
      ? await runTemplateWithCwdFallback(argv, argv_2, {
          timeoutMs: Math.max(1000, timeoutSec * 1000 - 2000),
          projectDir: projectDirOf(),
          ...(signal !== undefined && {
            signal,
          }),
        })
      : {
          stdout: "",
          stderr: "interpreter no longer trusted",
          status: null,
          timedOut: false,
        };
    let output = templateResultToHookOutput({
      ...run,
      stderr: clipHookText(run.stderr, 2000).text,
    });
    let { answer, report: report_2 } = parseHookJsonOutput(output, hookEntry.event);
    let outcome = trusted ? classifyTemplateOutcome(run, signal?.aborted === true) : "interpreter_untrusted";
    let finalOutcome = outcome === "ok" && isBlockingHookOutput(answer) ? "blocked" : outcome;
    report({
      outcome: finalOutcome,
      durationMs: Date.now() - now,
      fieldsDropped: report_2.dropped.length > 0 || report_2.truncated.length > 0,
    });
    if (finalOutcome === "aborted")
      return hookEntry.failClosed
        ? {
            decision: "block",
            reason: `cloud template ${hookEntry.id} was interrupted before it could answer`,
          }
        : {};
    let failureText = TEMPLATE_FAILURE_REASONS[finalOutcome];
    if (failureText !== undefined) {
      let message = `cloud template ${hookEntry.id} did not run cleanly: ${failureText}`;
      return hookEntry.failClosed
        ? {
            decision: "block",
            reason: message,
            systemMessage: message,
          }
        : {
            ...answer,
            systemMessage: message,
          };
    }
    return answer;
  };
}
//@ chunk-y47q51t0.js:9189-10011 placement
/**
 * 模板运行所需的文件操作：vet 检查解释器路径每一级目录不可被组/其他人写、不属于当前普通用户，且目标是可执行文件；mkdir 确保模板目录属于当前用户且权限 0700。
 */
function createTemplateFs(templateDir) {
  return {
    vet: async (path) => {
      try {
        let uid = typeof process.getuid === "function" ? process.getuid() : undefined;
        let ownedByUs = (uid_2) => uid !== undefined && uid !== 0 && uid_2 === uid;
        let ancestorsSafe = async (path) => {
          let filtered = path.split("/").filter(Boolean);
          for (let index = 0; index < filtered.length; index += 1) {
            let stats = await lstat("/" + filtered.slice(0, index).join("/"));
            if (!stats.isDirectory() || (stats.mode & 18) !== 0 || ownedByUs(stats.uid)) return false;
          }
          return true;
        };
        if (!(await ancestorsSafe(path))) return null;
        let resolved = await realpath(path);
        if (!(await ancestorsSafe(resolved))) return null;
        let stats = await lstat(resolved);
        return stats.isFile() && (stats.mode & 73) !== 0 && (stats.mode & 18) === 0 && !ownedByUs(stats.uid)
          ? resolved
          : null;
      } catch {
        return null;
      }
    },
    mkdir: async (dir, mode) => {
      try {
        await mkdir(dir, {
          mode,
        });
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
      let stats = await lstat(dir);
      let uid = typeof process.getuid === "function" ? process.getuid() : undefined;
      if (!stats.isDirectory() || (uid !== undefined && stats.uid !== uid) || (stats.mode & 63) !== 0)
        throw Error("unsafe device-hook template directory");
    },
    writeFileAtomic: (path, data, mode) => writeFileAtomic(path, data, mode),
    templateDir,
  };
}
//@ chunk-y47q51t0.js:10011-11235 placement
/**
 * 创建设备钩子模板宿主：解析可信的绝对路径 python3，prepare 时把模板写入私有临时目录（已写过且 sha256 仍匹配则复用），并返回运行该模板的钩子执行器。
 */
function createDeviceHookTemplateHost(options) {
  let tempRoot = getClaudeTempDirRealpath();
  let templateFs = createTemplateFs(join(tempRoot, "device-hook-templates", String(process.pid)));
  let interpreter;
  let resolveInterpreter = () => {
    interpreter ??= firstVettedPython3(templateFs).then((found) => {
      if (found === null) interpreter = undefined;
      return found;
    });
    return interpreter;
  };
  let prepared = new Map();
  return {
    resolveInterpreter,
    async prepare(spec, id, content, timeoutSec) {
      let python = await resolveInterpreter();
      if (python === null) throw Error("no absolute python3 for a device hook template");
      await mkdir(tempRoot, {
        recursive: true,
        mode: 448,
      });
      verifyTempDirOwnership(tempRoot);
      let cached = prepared.get(id);
      if (
        cached !== undefined &&
        !(await verifyTemplateFileDigest(await cached.catch(() => null), id, spec.maxBytes))
      ) {
        prepared.delete(id);
        cached = undefined;
      }
      if (cached === undefined) {
        cached = (async () => {
          await templateFs.mkdir(join(tempRoot, "device-hook-templates"), 448);
          return writeTemplateFile(id, content, templateFs);
        })();
        prepared.set(id, cached);
        cached.catch(() => prepared.delete(id));
      }
      let scriptPath = await cached;
      let failClosed = isPreToolUseTemplate(spec);
      return createTemplateHookRunner(
        templateLauncherArgs(python, scriptPath, id, spec.maxBytes),
        timeoutSec,
        {
          id: spec.id,
          event: spec.event,
          failClosed,
        },
        (report) => {
          logEvent("tengu_device_hook_template_run", {
            template: fromEnum(hookTemplateId(spec.id)),
            outcome: fromEnum(report.outcome),
            duration_ms: report.durationMs,
            fields_dropped: report.fieldsDropped,
          });
          if (report.outcome === "integrity_failed")
            logForDebugging(
              `Device hook template ${spec.id} refused at run time: integrity check failed (${scriptPath})`,
              {
                level: "warn",
              },
            );
          else if (report.outcome === "interpreter_untrusted")
            logForDebugging(
              `Device hook template ${spec.id} refused at run time: ${python} no longer vets as a trusted interpreter`,
              {
                level: "warn",
              },
            );
        },
        async () => {
          let stillTrusted = (await templateFs.vet(python)) === python;
          if (!stillTrusted) interpreter = undefined;
          return stillTrusted;
        },
        options,
      );
    },
    install: (owner, hooks, templateIdFor) =>
      registerDeviceHookCallbacks(owner, hooks, "templates", templateIdFor),
    remove: (owner) => unregisterDeviceHookCallbacks(owner, "templates"),
  };
}
//@ chunk-y47q51t0.js:11235-11578 placement
/**
 * 校验模板文件摘要：不跟随链接地打开普通文件，大小受限，计算哈希比较。
 */
async function verifyTemplateFileDigest(path, digest, maxBytes) {
  if (path === null) return false;
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
    let stats = await handle.stat();
    if (!stats.isFile() || stats.size > maxBytes) return false;
    let buffer = Buffer.alloc(stats.size);
    let { bytesRead } = await handle.read(buffer, 0, stats.size, 0);
    return bytesRead === stats.size && createHash("sha256").update(buffer).digest("hex") === digest;
  } catch {
    return false;
  } finally {
    await handle?.close().catch(() => {});
  }
}
//@ chunk-y47q51t0.js:11578-11622 placement
function hookTemplateId(templateId) {
  return getHookTemplate(templateId)?.id ?? "unknown";
}
export { createDeviceHookTemplateHost, hookTemplateId };
