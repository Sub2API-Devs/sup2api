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
import { xvt } from "./hookEventSets.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { hookJSONOutputSchema } from "../../types/hooks.js";
import { jVo, parseHookJsonOutput, isBlockingHookOutput } from "./hookSpecificOutput.js";
import { getErrnoCode } from "../errors.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";
import { getClaudeTempDirRealpath } from "../tempDirRealpaths.js";
import { verifyTempDirOwnership } from "../tempDir.js";
import { isPreToolUseTemplate, getHookTemplate } from "./hookTemplates.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../debug.js";
import { registerDeviceHookCallbacks, der } from "./deviceHooks/templates.js";

/**
 * 设备 hook 模板用的 python3 候选路径与完整性校验脚本。
 */
//@ chunk-y47q51t0.js:3894-4491 placement
var PYTHON3_CANDIDATES = ["/usr/bin/python3", "/usr/local/bin/python3", "/bin/python3"],
  INTEGRITY_FAILED_EXIT_CODE = 86,
  buildTemplateLauncherScript = () =>
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
`),
  TEMPLATE_LAUNCHER_SCRIPT = buildTemplateLauncherScript();
//@ chunk-y47q51t0.js:4491-4581 placement
async function Y(o) {
  for (let r of PYTHON3_CANDIDATES) {
    let vet = await o.vet(r);
    if (vet !== null) return vet;
  }
  return null;
}
//@ chunk-y47q51t0.js:4581-4713 placement
async function writeTemplateFile(o, r, e) {
  await e.mkdir(e.templateDir, 448);
  let n = join(e.templateDir, `${o}.py`);
  return (await e.writeFileAtomic(n, r, 384), n);
}
//@ chunk-y47q51t0.js:4713-4781 placement
function W(o, r, e, n = 262144) {
  return [o, "-I", "-S", "-c", TEMPLATE_LAUNCHER_SCRIPT, r, e, String(n)];
}
//@ chunk-y47q51t0.js:4781-4847 placement
var K = /^(?:LD_|DYLD_|GCONV_PATH$|NLSPATH$|DEVELOPER_DIR$|PYTHON)/;
//@ chunk-y47q51t0.js:4847-4936 placement
function X(o) {
  let r = { ...o };
  for (let e of Object.keys(r)) if (K.test(e)) delete r[e];
  return r;
}
//@ chunk-y47q51t0.js:4936-4948 placement
var P = 65536;
//@ chunk-y47q51t0.js:4948-5131 placement
async function runTemplateWithCwdFallback(o, r, e) {
  let n = await spawnTemplateProcess(r.cwd, o, r, e);
  return n.status === null &&
    n.signal === void 0 &&
    !n.timedOut &&
    /ENOENT|spawn .* cwd|uv_cwd|not a directory/i.test(n.stderr)
    ? spawnTemplateProcess(homedir(), o, r, e)
    : n;
}
/**
 * 在指定 cwd 以独立进程组启动设备钩子模板（python 启动器），把钩子输入写入 stdin，收集有上限的 stdout/stderr，处理超时与中止，返回 {stdout, stderr, status, signal, timedOut}。
 */
//@ chunk-y47q51t0.js:5131-6415 placement
function spawnTemplateProcess(cwd, argv, e, options) {
  return new Promise((i) => {
    let [l, ...s] = argv;
    if (l === void 0) {
      i({ stdout: "", stderr: "no command", status: null, timedOut: !1 });
      return;
    }
    let p = !1,
      y = (d) => {
        if (!p) ((p = !0), i(d));
      },
      child;
    try {
      child = spawn(l, s, {
        cwd: cwd,
        env: { ...X(options.env ?? subprocessEnv()), CLAUDE_PROJECT_DIR: options.projectDir },
        stdio: ["pipe", "pipe", "pipe"],
        detached: !0,
        windowsHide: !0,
        ...xvt(e.hook_event_name),
      });
    } catch (error) {
      y({
        stdout: "",
        stderr: error instanceof Error ? error.message : "spawn failed",
        status: null,
        timedOut: !1,
      });
      return;
    }
    let f = () => {
        try {
          if (child.pid !== void 0) process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      },
      m = "",
      stderr = "",
      b = !1,
      g = !1,
      h = !1,
      R = setTimeout(
        (d) => {
          ((b = !0), d());
        },
        options.timeoutMs,
        f,
      ),
      T = () => f();
    if (options.signal !== void 0)
      if (options.signal.aborted) T();
      else options.signal.addEventListener("abort", T, { once: !0 });
    let D = (d, v, M) => {
      if (d.length + v.length > P) M();
      return d.length >= P ? d : (d + v).slice(0, P);
    };
    (child.stdout?.setEncoding("utf8"),
      child.stderr?.setEncoding("utf8"),
      child.stdout?.on("data", (d) => (m = D(m, d, () => (g = !0)))),
      child.stderr?.on("data", (d) => (stderr = D(stderr, d, () => (h = !0)))),
      child.stdin?.on("error", () => {}));
    let C = (d, v) => {
      (clearTimeout(R),
        options.signal?.removeEventListener("abort", T),
        y({
          stdout: m,
          stderr: stderr,
          status: d,
          ...(v !== void 0 && { signal: v }),
          timedOut: b,
          ...(g && { stdoutTruncated: g }),
          ...(h && { stderrTruncated: h }),
        }));
    };
    (child.on("error", (d) => {
      ((stderr = stderr || d.message), C(null));
    }),
      child.on("close", (d, v) => C(d, v ?? void 0)));
    let O;
    try {
      O = jsonStringify(e);
    } catch {
      O = "";
    }
    child.stdin?.end(O);
  });
}
/**
 * 解析模板 hook 的标准输出：空输出、JSON 回答或无法读取。
 */
//@ chunk-y47q51t0.js:6415-6757 placement
function parseTemplateAnswer(o) {
  let trimmed = o.stdout.trim();
  if (o.stdoutTruncated === !0) return { kind: "unreadable" };
  if (!trimmed.startsWith("{")) return trimmed === "" ? { kind: "silent" } : { kind: "unreadable" };
  try {
    let safeParse = hookJSONOutputSchema().safeParse(jsonParse(trimmed));
    if (!safeParse.success) return { kind: "unreadable" };
    let n = safeParse.data;
    return "async" in n ? { kind: "unreadable" } : { kind: "answer", answer: n };
  } catch {
    return { kind: "unreadable" };
  }
}
/**
 * 把模板 hook 的执行结果转换为 hook 输出：退出码 2 表示阻止，0 时解析回答。
 */
//@ chunk-y47q51t0.js:6757-7794 placement
function templateResultToHookOutput(result) {
  if (result.status === 2)
    return { decision: "block", reason: result.stderr.trim() || "blocked by a device hook template" };
  if (result.status !== 0) return {};
  let r = parseTemplateAnswer(result);
  if (r.kind !== "answer") return {};
  let answer = r.answer,
    n = {
      ...(answer.continue === !1 && {
        continue: !1,
        ...(answer.stopReason !== void 0 && { stopReason: answer.stopReason }),
      }),
      ...(answer.decision === "block" && {
        decision: "block",
        ...(answer.reason !== void 0 && { reason: answer.reason }),
      }),
      ...(answer.systemMessage !== void 0 && { systemMessage: answer.systemMessage }),
    },
    hookSpecificOutput = answer.hookSpecificOutput;
  if (hookSpecificOutput?.hookEventName === "PreToolUse") {
    let l =
      hookSpecificOutput.permissionDecision === "deny" || hookSpecificOutput.permissionDecision === "ask"
        ? hookSpecificOutput.permissionDecision
        : void 0;
    return {
      ...n,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        ...(l !== void 0 && { permissionDecision: l }),
        ...(l !== void 0 &&
          hookSpecificOutput.permissionDecisionReason !== void 0 && {
            permissionDecisionReason: hookSpecificOutput.permissionDecisionReason,
          }),
        ...(hookSpecificOutput.additionalContext !== void 0 && {
          additionalContext: hookSpecificOutput.additionalContext,
        }),
      },
    };
  }
  if (hookSpecificOutput?.hookEventName === "PostToolUse" && hookSpecificOutput.additionalContext !== void 0)
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
  if (o.signal !== void 0) return "killed";
  if (o.status === null) return "spawn_failed";
  if (o.status === INTEGRITY_FAILED_EXIT_CODE) return "integrity_failed";
  if (o.status === 0) return parseTemplateAnswer(o).kind === "unreadable" ? "error" : "ok";
  return o.status === 2 ? "blocked" : "error";
}
/**
 * 模板 hook 失败原因的说明文本。
 */
//@ chunk-y47q51t0.js:8077-8379 placement
var TEMPLATE_FAILURE_REASONS = {
  integrity_failed: "its file no longer matched what was verified",
  error: "it exited with an error or an unreadable answer",
  spawn_failed: "it could not be started",
  killed: "it was killed before it answered",
  interpreter_untrusted: "its interpreter can no longer be trusted",
  timeout: "it took too long",
};
/**
 * 创建运行设备 hook 模板的执行函数：解析解释器、按超时运行并记录结果。
 */
//@ chunk-y47q51t0.js:8379-9189 placement
function createTemplateHookRunner(o, r, e, n, i, l) {
  return async (s, p, y) => {
    let now = Date.now(),
      f = await i(),
      m = f
        ? await runTemplateWithCwdFallback(o, s, {
            timeoutMs: Math.max(1000, r * 1000 - 2000),
            projectDir: l(),
            ...(y !== void 0 && { signal: y }),
          })
        : { stdout: "", stderr: "interpreter no longer trusted", status: null, timedOut: !1 },
      w = templateResultToHookOutput({ ...m, stderr: jVo(m.stderr, 2000).text }),
      { answer: answer, report: report } = parseHookJsonOutput(w, e.event),
      h = f ? classifyTemplateOutcome(m, y?.aborted === !0) : "interpreter_untrusted",
      R = h === "ok" && isBlockingHookOutput(answer) ? "blocked" : h;
    if (
      (n({
        outcome: R,
        durationMs: Date.now() - now,
        fieldsDropped: report.dropped.length > 0 || report.truncated.length > 0,
      }),
      R === "aborted")
    )
      return e.failClosed
        ? { decision: "block", reason: `cloud template ${e.id} was interrupted before it could answer` }
        : {};
    let T = TEMPLATE_FAILURE_REASONS[R];
    if (T !== void 0) {
      let D = `cloud template ${e.id} did not run cleanly: ${T}`;
      return e.failClosed
        ? { decision: "block", reason: D, systemMessage: D }
        : { ...answer, systemMessage: D };
    }
    return answer;
  };
}
/**
 * 模板运行所需的文件操作：vet 检查解释器路径每一级目录不可被组/其他人写、不属于当前普通用户，且目标是可执行文件；mkdir 确保模板目录属于当前用户且权限 0700。
 */
//@ chunk-y47q51t0.js:9189-10011 placement
function createTemplateFs(o) {
  return {
    vet: async (r) => {
      try {
        let e = typeof process.getuid === "function" ? process.getuid() : void 0,
          n = (p) => e !== void 0 && e !== 0 && p === e,
          i = async (p) => {
            let filtered = p.split("/").filter(Boolean);
            for (let u = 0; u < filtered.length; u += 1) {
              let f = await lstat("/" + filtered.slice(0, u).join("/"));
              if (!f.isDirectory() || (f.mode & 18) !== 0 || n(f.uid)) return !1;
            }
            return !0;
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
    mkdir: async (r, e) => {
      try {
        await mkdir(r, { mode: e });
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
      let n = await lstat(r),
        i = typeof process.getuid === "function" ? process.getuid() : void 0;
      if (!n.isDirectory() || (i !== void 0 && n.uid !== i) || (n.mode & 63) !== 0)
        throw Error("unsafe device-hook template directory");
    },
    writeFileAtomic: (r, e, n) => writeFileAtomic(r, e, n),
    templateDir: o,
  };
}
/**
 * 创建设备钩子模板宿主：解析可信的绝对路径 python3，prepare 时把模板写入私有临时目录（已写过且 sha256 仍匹配则复用），并返回运行该模板的钩子执行器。
 */
//@ chunk-y47q51t0.js:10011-11235 placement
function createDeviceHookTemplateHost(o) {
  let tempRoot = getClaudeTempDirRealpath(),
    e = createTemplateFs(join(tempRoot, "device-hook-templates", String(process.pid))),
    n,
    i = () => (
      (n ??= Y(e).then((s) => {
        if (s === null) n = void 0;
        return s;
      })),
      n
    ),
    prepared = new Map();
  return {
    resolveInterpreter: i,
    async prepare(s, p, y, u) {
      let f = await i();
      if (f === null) throw Error("no absolute python3 for a device hook template");
      (await mkdir(tempRoot, { recursive: !0, mode: 448 }), verifyTempDirOwnership(tempRoot));
      let m = prepared.get(p);
      if (m !== void 0 && !(await verifyTemplateFileDigest(await m.catch(() => null), p, s.maxBytes)))
        (prepared.delete(p), (m = void 0));
      if (m === void 0)
        ((m = (async () => (
          await e.mkdir(join(tempRoot, "device-hook-templates"), 448),
          writeTemplateFile(p, y, e)
        ))()),
          prepared.set(p, m),
          m.catch(() => prepared.delete(p)));
      let w = await m,
        b = isPreToolUseTemplate(s);
      return createTemplateHookRunner(
        W(f, w, p, s.maxBytes),
        u,
        { id: s.id, event: s.event, failClosed: b },
        (g) => {
          if (
            (logEvent("tengu_device_hook_template_run", {
              template: fromEnum(ie(s.id)),
              outcome: fromEnum(g.outcome),
              duration_ms: g.durationMs,
              fields_dropped: g.fieldsDropped,
            }),
            g.outcome === "integrity_failed")
          )
            logForDebugging(
              `Device hook template ${s.id} refused at run time: integrity check failed (${w})`,
              { level: "warn" },
            );
          else if (g.outcome === "interpreter_untrusted")
            logForDebugging(
              `Device hook template ${s.id} refused at run time: ${f} no longer vets as a trusted interpreter`,
              { level: "warn" },
            );
        },
        async () => {
          let g = (await e.vet(f)) === f;
          if (!g) n = void 0;
          return g;
        },
        o,
      );
    },
    install: (s, p, y) => registerDeviceHookCallbacks(s, p, "templates", y),
    remove: (s) => der(s, "templates"),
  };
}
/**
 * 校验模板文件摘要：不跟随链接地打开普通文件，大小受限，计算哈希比较。
 */
//@ chunk-y47q51t0.js:11235-11578 placement
async function verifyTemplateFileDigest(o, r, e) {
  if (o === null) return !1;
  let n;
  try {
    n = await open(o, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
    let stats = await n.stat();
    if (!stats.isFile() || stats.size > e) return !1;
    let alloc = Buffer.alloc(stats.size),
      { bytesRead: bytesRead } = await n.read(alloc, 0, stats.size, 0);
    return bytesRead === stats.size && createHash("sha256").update(alloc).digest("hex") === r;
  } catch {
    return !1;
  } finally {
    await n?.close().catch(() => {});
  }
}
//@ chunk-y47q51t0.js:11578-11622 placement
function ie(o) {
  return getHookTemplate(o)?.id ?? "unknown";
}
