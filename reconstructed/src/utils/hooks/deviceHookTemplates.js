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
  for (let r of PYTHON3_CANDIDATES) {
    let e = await templateFs.vet(r);
    if (e !== null) return e;
  }
  return null;
}
//@ chunk-y47q51t0.js:4581-4713 placement
async function writeTemplateFile(o, r, templateFs) {
  await templateFs.mkdir(templateFs.templateDir, 448);
  let n = join(templateFs.templateDir, `${o}.py`);
  await templateFs.writeFileAtomic(n, r, 384);
  return n;
}
//@ chunk-y47q51t0.js:4713-4781 placement
function templateLauncherArgs(o, r, e, maxBytes = 262144) {
  return [o, "-I", "-S", "-c", TEMPLATE_LAUNCHER_SCRIPT, r, e, String(maxBytes)];
}
//@ chunk-y47q51t0.js:4781-4847 placement
var UNSAFE_TEMPLATE_ENV_RE = /^(?:LD_|DYLD_|GCONV_PATH$|NLSPATH$|DEVELOPER_DIR$|PYTHON)/;
//@ chunk-y47q51t0.js:4847-4936 placement
function withoutUnsafeTemplateEnv(o) {
  let r = {
    ...o,
  };
  for (let key of Object.keys(r)) if (UNSAFE_TEMPLATE_ENV_RE.test(key)) delete r[key];
  return r;
}
//@ chunk-y47q51t0.js:4936-4948 placement
var MAX_TEMPLATE_OUTPUT_CHARS = 65536;
//@ chunk-y47q51t0.js:4948-5131 placement
async function runTemplateWithCwdFallback(argv, r, options) {
  let templateProcess = await spawnTemplateProcess(r.cwd, argv, r, options);
  return templateProcess.status === null &&
    templateProcess.signal === undefined &&
    !templateProcess.timedOut &&
    /ENOENT|spawn .* cwd|uv_cwd|not a directory/i.test(templateProcess.stderr)
    ? spawnTemplateProcess(homedir(), argv, r, options)
    : templateProcess;
}
//@ chunk-y47q51t0.js:5131-6415 placement
/**
 * 在指定 cwd 以独立进程组启动设备钩子模板（python 启动器），把钩子输入写入 stdin，收集有上限的 stdout/stderr，处理超时与中止，返回 {stdout, stderr, status, signal, timedOut}。
 */
function spawnTemplateProcess(cwd, argv, e, options) {
  return new Promise((resolve) => {
    let [l, ...s] = argv;
    if (l === undefined) {
      resolve({
        stdout: "",
        stderr: "no command",
        status: null,
        timedOut: false,
      });
      return;
    }
    let p = false;
    let y = (d) => {
      if (!p) {
        p = true;
        resolve(d);
      }
    };
    let child;
    try {
      child = spawn(l, s, {
        cwd,
        env: {
          ...withoutUnsafeTemplateEnv(options.env ?? subprocessEnv()),
          CLAUDE_PROJECT_DIR: options.projectDir,
        },
        stdio: ["pipe", "pipe", "pipe"],
        detached: true,
        windowsHide: true,
        ...hooksSettingForEvent(e.hook_event_name),
      });
    } catch (error) {
      y({
        stdout: "",
        stderr: error instanceof Error ? error.message : "spawn failed",
        status: null,
        timedOut: false,
      });
      return;
    }
    let f = () => {
      try {
        if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    let m = "";
    let stderr = "";
    let timedOut = false;
    let g = false;
    let h = false;
    let timer = setTimeout(
      (d) => {
        timedOut = true;
        d();
      },
      options.timeoutMs,
      f,
    );
    let T = () => f();
    if (options.signal !== undefined)
      if (options.signal.aborted) T();
      else
        options.signal.addEventListener("abort", T, {
          once: true,
        });
    let D = (d, v, M) => {
      if (d.length + v.length > MAX_TEMPLATE_OUTPUT_CHARS) M();
      return d.length >= MAX_TEMPLATE_OUTPUT_CHARS ? d : (d + v).slice(0, MAX_TEMPLATE_OUTPUT_CHARS);
    };
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (d) => (m = D(m, d, () => (g = true))));
    child.stderr?.on("data", (d) => (stderr = D(stderr, d, () => (h = true))));
    child.stdin?.on("error", () => {});
    let C = (status, v) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", T);
      y({
        stdout: m,
        stderr,
        status,
        ...(v !== undefined && {
          signal: v,
        }),
        timedOut,
        ...(g && {
          stdoutTruncated: g,
        }),
        ...(h && {
          stderrTruncated: h,
        }),
      });
    };
    child.on("error", (d) => {
      stderr = stderr || d.message;
      C(null);
    });
    child.on("close", (status, v) => C(status, v ?? undefined));
    let O;
    try {
      O = jsonStringify(e);
    } catch {
      O = "";
    }
    child.stdin?.end(O);
  });
}
//@ chunk-y47q51t0.js:6415-6757 placement
/**
 * 解析模板 hook 的标准输出：空输出、JSON 回答或无法读取。
 */
function parseTemplateAnswer(o) {
  let trimmed = o.stdout.trim();
  if (o.stdoutTruncated === true)
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
    let e = hookJSONOutputSchema().safeParse(jsonParse(trimmed));
    if (!e.success)
      return {
        kind: "unreadable",
      };
    let n = e.data;
    return "async" in n
      ? {
          kind: "unreadable",
        }
      : {
          kind: "answer",
          answer: n,
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
  let n = {
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
      ...n,
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
      ...n,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: hookSpecificOutput.additionalContext,
      },
    };
  return n;
}
//@ chunk-y47q51t0.js:7794-8077 placement
function classifyTemplateOutcome(o, r) {
  if (r) return "aborted";
  if (o.timedOut) return "timeout";
  if (o.signal !== undefined) return "killed";
  if (o.status === null) return "spawn_failed";
  if (o.status === INTEGRITY_FAILED_EXIT_CODE) return "integrity_failed";
  if (o.status === 0) return parseTemplateAnswer(o).kind === "unreadable" ? "error" : "ok";
  return o.status === 2 ? "blocked" : "error";
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
function createTemplateHookRunner(o, r, e, n, i, l) {
  return async (s, p, y) => {
    let now = Date.now();
    let f = await i();
    let m = f
      ? await runTemplateWithCwdFallback(o, s, {
          timeoutMs: Math.max(1000, r * 1000 - 2000),
          projectDir: l(),
          ...(y !== undefined && {
            signal: y,
          }),
        })
      : {
          stdout: "",
          stderr: "interpreter no longer trusted",
          status: null,
          timedOut: false,
        };
    let w = templateResultToHookOutput({
      ...m,
      stderr: clipHookText(m.stderr, 2000).text,
    });
    let { answer, report } = parseHookJsonOutput(w, e.event);
    let h = f ? classifyTemplateOutcome(m, y?.aborted === true) : "interpreter_untrusted";
    let R = h === "ok" && isBlockingHookOutput(answer) ? "blocked" : h;
    n({
      outcome: R,
      durationMs: Date.now() - now,
      fieldsDropped: report.dropped.length > 0 || report.truncated.length > 0,
    });
    if (R === "aborted")
      return e.failClosed
        ? {
            decision: "block",
            reason: `cloud template ${e.id} was interrupted before it could answer`,
          }
        : {};
    let T = TEMPLATE_FAILURE_REASONS[R];
    if (T !== undefined) {
      let D = `cloud template ${e.id} did not run cleanly: ${T}`;
      return e.failClosed
        ? {
            decision: "block",
            reason: D,
            systemMessage: D,
          }
        : {
            ...answer,
            systemMessage: D,
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
    vet: async (r) => {
      try {
        let e = typeof process.getuid === "function" ? process.getuid() : undefined;
        let n = (uid) => e !== undefined && e !== 0 && uid === e;
        let i = async (p) => {
          let filtered = p.split("/").filter(Boolean);
          for (let u = 0; u < filtered.length; u += 1) {
            let f = await lstat("/" + filtered.slice(0, u).join("/"));
            if (!f.isDirectory() || (f.mode & 18) !== 0 || n(f.uid)) return false;
          }
          return true;
        };
        if (!(await i(r))) return null;
        let l = await realpath(r);
        if (!(await i(l))) return null;
        let s = await lstat(l);
        return s.isFile() && (s.mode & 73) !== 0 && (s.mode & 18) === 0 && !n(s.uid) ? l : null;
      } catch {
        return null;
      }
    },
    mkdir: async (r, mode) => {
      try {
        await mkdir(r, {
          mode,
        });
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
      let n = await lstat(r);
      let i = typeof process.getuid === "function" ? process.getuid() : undefined;
      if (!n.isDirectory() || (i !== undefined && n.uid !== i) || (n.mode & 63) !== 0)
        throw Error("unsafe device-hook template directory");
    },
    writeFileAtomic: (r, e, n) => writeFileAtomic(r, e, n),
    templateDir,
  };
}
//@ chunk-y47q51t0.js:10011-11235 placement
/**
 * 创建设备钩子模板宿主：解析可信的绝对路径 python3，prepare 时把模板写入私有临时目录（已写过且 sha256 仍匹配则复用），并返回运行该模板的钩子执行器。
 */
function createDeviceHookTemplateHost(o) {
  let tempRoot = getClaudeTempDirRealpath();
  let templateFs = createTemplateFs(join(tempRoot, "device-hook-templates", String(process.pid)));
  let n;
  let i = () => {
    n ??= firstVettedPython3(templateFs).then((s) => {
      if (s === null) n = undefined;
      return s;
    });
    return n;
  };
  let prepared = new Map();
  return {
    resolveInterpreter: i,
    async prepare(s, p, y, u) {
      let f = await i();
      if (f === null) throw Error("no absolute python3 for a device hook template");
      await mkdir(tempRoot, {
        recursive: true,
        mode: 448,
      });
      verifyTempDirOwnership(tempRoot);
      let m = prepared.get(p);
      if (m !== undefined && !(await verifyTemplateFileDigest(await m.catch(() => null), p, s.maxBytes))) {
        prepared.delete(p);
        m = undefined;
      }
      if (m === undefined) {
        m = (async () => {
          await templateFs.mkdir(join(tempRoot, "device-hook-templates"), 448);
          return writeTemplateFile(p, y, templateFs);
        })();
        prepared.set(p, m);
        m.catch(() => prepared.delete(p));
      }
      let w = await m;
      let failClosed = isPreToolUseTemplate(s);
      return createTemplateHookRunner(
        templateLauncherArgs(f, w, p, s.maxBytes),
        u,
        {
          id: s.id,
          event: s.event,
          failClosed,
        },
        (g) => {
          logEvent("tengu_device_hook_template_run", {
            template: fromEnum(hookTemplateId(s.id)),
            outcome: fromEnum(g.outcome),
            duration_ms: g.durationMs,
            fields_dropped: g.fieldsDropped,
          });
          if (g.outcome === "integrity_failed")
            logForDebugging(
              `Device hook template ${s.id} refused at run time: integrity check failed (${w})`,
              {
                level: "warn",
              },
            );
          else if (g.outcome === "interpreter_untrusted")
            logForDebugging(
              `Device hook template ${s.id} refused at run time: ${f} no longer vets as a trusted interpreter`,
              {
                level: "warn",
              },
            );
        },
        async () => {
          let g = (await templateFs.vet(f)) === f;
          if (!g) n = undefined;
          return g;
        },
        o,
      );
    },
    install: (s, p, y) => registerDeviceHookCallbacks(s, p, "templates", y),
    remove: (s) => unregisterDeviceHookCallbacks(s, "templates"),
  };
}
//@ chunk-y47q51t0.js:11235-11578 placement
/**
 * 校验模板文件摘要：不跟随链接地打开普通文件，大小受限，计算哈希比较。
 */
async function verifyTemplateFileDigest(o, r, maxBytes) {
  if (o === null) return false;
  let n;
  try {
    n = await open(o, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
    let stats = await n.stat();
    if (!stats.isFile() || stats.size > maxBytes) return false;
    let l = Buffer.alloc(stats.size);
    let { bytesRead } = await n.read(l, 0, stats.size, 0);
    return bytesRead === stats.size && createHash("sha256").update(l).digest("hex") === r;
  } catch {
    return false;
  } finally {
    await n?.close().catch(() => {});
  }
}
//@ chunk-y47q51t0.js:11578-11622 placement
function hookTemplateId(id) {
  return getHookTemplate(id)?.id ?? "unknown";
}
