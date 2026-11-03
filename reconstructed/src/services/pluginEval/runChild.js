/**
 * services/pluginEval/runChild.ts
 *
 * 2.1.316 新增：plugin eval 启动子 claude 会话：参数（stream-json、max-turns）、设置与网关头
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (4)
 * attribution: placement 4
 */
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { spawn } from "child_process";
import { checkAddDirsInsideCase, buildEvalSandboxSettings } from "./evalSandbox.js";
import {
  buildEvalFence,
  resolveCaseFileInsideSuite,
  withPathDirectories,
  checkPathSegmentWhitespace,
  toSandboxRulePath,
  GIT_TOP_ENTRIES,
} from "./evalFence.js";
import {
  buildChildEnv,
  writeChildManagedPolicy,
  passApiKeyToChild,
  CHILD_AUTH_ENV_VARS,
  checkAwsCredentialPointers,
  AWS_CACHE_DIRS,
} from "./childEnvironment.js";
import { checkGitVersionForEval, summarizeRunTrace, collectStubArtifactSlugs } from "./runTrace.js";
import { loadTranscriptFromFile } from "../../utils/sessionStorage.js";
import { getSelfExecArgv, mcpToolNames, PUBLISH_TOOL_NAMES } from "../artifacts/artifactsMcpServer.js";
import {
  findMockServersInInit,
  annotateMockedToolCalls,
  verifyMockCallLog,
  summarizeMockUsage,
} from "./mocks/mockVerification.js";
import { getPlatform } from "../../utils/platform.js";
import { cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { MAX_STUB_PUBLISH_BYTES, collectStubPublishes, EVAL_ARTIFACTS_DIR } from "./artifactStub.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  SHELL_TOOLS,
  hasToolRule,
  scopeWriteToolRules,
  scopeReadToolRules,
  anchorRelativeRules,
  PROC_READ_RULE,
  buildDisallowedTools,
} from "./runToolRules.js";
import { readMockCallLog } from "./mocks/mockRelayProtocol.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { uniq } from "../../utils/collections.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";

//@ chunk-qchp9vrd.js:122550-123081 placement
async function readRunTraceHistory(e) {
  let {
    case_,
    sandbox,
    allowedTools,
    disallowedTools = [],
    modelOverride,
    artifactPublishGranted,
    growthbookOverrides,
    mocks,
    credential,
  } = e;
  let joined = path.join(sandbox.outDir, "trace.jsonl");
  let T = await checkAddDirsInsideCase(case_);
  let evalFence = await buildEvalFence(case_, T);
  let runChildArgs = await buildRunChildArgs(
    case_,
    sandbox,
    allowedTools,
    disallowedTools,
    modelOverride,
    mocks?.configPath,
    T,
    evalFence,
  );
  let childEnv = buildChildEnv(
    case_,
    sandbox,
    artifactPublishGranted,
    growthbookOverrides,
    mocks !== undefined,
  );
  await checkGitVersionForEval(childEnv);
  await writeChildManagedPolicy(sandbox);
  let restoredCostUsd = case_.context.history_file
    ? await readHistoryCost(
        await resolveCaseFileInsideSuite(case_, case_.context.history_file, "history_file"),
      )
    : 0;
  let X = credential ? await passApiKeyToChild(credential) : null;
  try {
    return await prepareRunChildConfig(e, runChildArgs, childEnv, joined, X, {
      addDirs: T,
      readScope: evalFence,
      restoredCostUsd,
    });
  } finally {
    await X?.cleanup();
  }
}
//@ chunk-qchp9vrd.js:123081-123170 placement
/**
 * 读取历史文件里的累计花费（失败为 0）。
 */
async function readHistoryCost(caseFileInsideSuite) {
  try {
    return (await loadTranscriptFromFile(caseFileInsideSuite)).costState?.totalCostUSD ?? 0;
  } catch {
    return 0;
  }
}
//@ chunk-qchp9vrd.js:123170-127919 placement
/**
 * 准备子会话的配置目录：网关 ANTHROPIC_CUSTOM_HEADERS、git 配置、settings。
 */
async function prepareRunChildConfig(
  e,
  runChildArgs,
  childEnv,
  tracePath,
  s,
  { addDirs, readScope, restoredCostUsd },
) {
  let {
    case_,
    sandbox,
    allowedTools,
    operatorAllowedTools = [],
    artifactPublishGranted,
    verbose,
    mocks,
    signal,
    credential,
  } = e;
  if (s) {
    let Z = new Set(Object.keys(s.env).map((key) => key.toUpperCase()));
    for (let key of Object.keys(childEnv)) if (Z.has(key.toUpperCase())) delete childEnv[key];
    Object.assign(childEnv, s.env);
  }
  if (credential)
    for (let key of Object.keys(childEnv)) {
      let upper = key.toUpperCase();
      if (CHILD_AUTH_ENV_VARS.has(upper)) delete childEnv[key];
      else if (upper === "ANTHROPIC_CUSTOM_HEADERS") {
        if (credential.kind === "gateway" && credential.authorizationHeaderIsCredential) continue;
        let Q =
          credential.kind === "gateway" ? /^\s*authorization\s*:/i : /^\s*(authorization|x-api-key)\s*:/i;
        let filtered = (childEnv[key] ?? "").split(/\r?\n/).filter((line) => !Q.test(line));
        if (filtered.some((we) => we.trim() !== ""))
          childEnv[key] = filtered.join(`
`);
        else delete childEnv[key];
      }
    }
  await checkAwsCredentialPointers(sandbox, childEnv);
  for (let Z of [path.join(".config", "git"), path.join(".local", "lib"), ...AWS_CACHE_DIRS])
    await mkdir(path.join(sandbox.home, Z), {
      recursive: true,
    });
  await buildEvalSandboxSettings(sandbox, allowedTools, operatorAllowedTools, case_, childEnv, undefined, {
    addDirs,
    readScope,
  });
  let [W = process.execPath, ...G] = getSelfExecArgv();
  let J = [...G, ...runChildArgs];
  return await new Promise((resolve, reject) => {
    let Q = [];
    let Se = "";
    let we = 0;
    let Be = "";
    let Je = false;
    let Ee = false;
    let Qe = false;
    let ye = null;
    let je = [];
    let pt = mocks ? findMockServersInInit(mocks) : null;
    let Pt = case_.execution.timeout_seconds * 1000;
    let ce = spawn(W, J, {
      cwd: sandbox.cwd,
      env: childEnv,
      stdio: s?.viaFd ? ["pipe", "pipe", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
      windowsHide: true,
      detached: getPlatform() !== "windows",
      ...cgroupSpawnOptions("agent"),
    });
    let At = () => {
      if (ce.pid === undefined || getPlatform() === "windows") return;
      try {
        process.kill(-ce.pid, "SIGKILL");
      } catch {}
    };
    let B = () => {
      if (getPlatform() === "windows" && ce.pid !== undefined) {
        execFileNoThrow("taskkill", ["/T", "/F", "/PID", String(ce.pid)]).then(() => {
          if (ce.exitCode === null && ce.signalCode === null) ce.kill("SIGKILL");
        });
        return;
      }
      At();
      ce.kill("SIGKILL");
    };
    process.on("exit", At);
    if (credential && s?.viaFd) {
      let he = ce.stdio[3];
      if (he && "end" in he) {
        he.on("error", () => {});
        let xe;
        switch (credential.kind) {
          case "oauth":
            xe = credential.accessToken;
            break;
          case "gateway":
            xe = credential.jwt;
            break;
          case "apiKey":
            xe = credential.apiKey;
            break;
        }
        he.end(
          xe +
            `
`,
        );
      }
    }
    ce.stdin?.on("error", () => {});
    ce.stdin?.end(case_.execution.prompt);
    let timer = setTimeout(() => {
      Je = true;
      B();
    }, Pt);
    let _e = false;
    let Ae = () => {
      _e = true;
      B();
    };
    if (signal.aborted) Ae();
    else
      signal.addEventListener("abort", Ae, {
        once: true,
      });
    ce.stdout.setEncoding("utf8");
    ce.stdout.on("data", (he) => {
      we += he.length;
      if (we > MAX_STUB_PUBLISH_BYTES) {
        if (!Ee) {
          Ee = true;
          B();
        }
        return;
      }
      Se += he;
      let xe;
      while (
        (xe = Se.indexOf(`
`)) !== -1
      ) {
        let trimmed = Se.slice(0, xe).trim();
        Se = Se.slice(xe + 1);
        if (!trimmed) continue;
        try {
          let Ne = jsonParse(trimmed);
          Q.push(Ne);
          if (verbose) logForDebugging(`eval trace: ${Ne.type}`);
          if (pt !== null && ye === null)
            je.push(
              Promise.resolve(pt(Ne)).then(
                (ot) => {
                  if (ot !== null && ye === null) {
                    ye = ot;
                    B();
                  }
                },
                (error) => {
                  logForDebugging(`eval: mock watch failed: ${error}`, {
                    level: "error",
                  });
                },
              ),
            );
        } catch {}
      }
    });
    ce.stderr.setEncoding("utf8");
    ce.stderr.on("data", (he) => {
      if (Be.length < 65536) Be += he;
    });
    function De(he) {
      if (Qe) return;
      Qe = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", Ae);
      process.removeListener("exit", At);
      let xe = summarizeRunTrace(Q, Je, he, tracePath, {
        shellGranted: SHELL_TOOLS.some((Me) => hasToolRule(allowedTools, Me)),
        restoredCostUsd,
      });
      xe.killedInFlight = Je || _e || Ee;
      writeFile(
        tracePath,
        Q.map((Me) => jsonStringify(Me)).join(`
`),
      )
        .catch(() => {})
        .then(async () => {
          if (mocks)
            try {
              await Promise.all(je);
              let mockCallLog = await readMockCallLog(mocks.callLogPath, mocks.nonce);
              xe.mockCalls = mockCallLog.records;
              annotateMockedToolCalls(xe.toolCalls, mocks);
              let Ne = ye !== null || xe.killedInFlight;
              let ot = verifyMockCallLog(
                xe.toolCalls,
                mockCallLog.truncated ? null : mockCallLog.records,
                mocks,
                ye !== null || _e ? "unprovokable" : xe.killedInFlight ? "provokable" : null,
              );
              if (ye === null && ot !== null)
                ye = {
                  kind: "integrity",
                  message:
                    Ne && xe.error !== null
                      ? `${xe.error} \xB7 ${ot} (the child was killed before it reported which calls it refused itself; a call its own hook blocked is counted as unserved)`
                      : ot,
                };
              if (ye !== null && ye.kind !== "abort") {
                let nt =
                  ye.kind === "registration" && Be.length > 0
                    ? `${ye.message} \xB7 child stderr: ${Be.slice(-1000)}`
                    : ye.message;
                let error = xe.endedOnApiError ? xe.error : null;
                xe.error = error !== null && !nt.startsWith(error) ? `${error} \xB7 ${nt}` : nt;
                xe.mockSetupFailure = ye.kind;
              } else if (ye !== null) {
                xe.aborted = ye.abort ?? {
                  server: "?",
                  tool: "?",
                  reason: ye.message,
                };
                xe.error = null;
              }
              xe.mockTally = mocks.mockedTools.length > 0 ? summarizeMockUsage(xe.toolCalls, mocks) : null;
            } catch (error) {
              logForDebugging(`eval: reading mock call log failed: ${error}`, {
                level: "error",
              });
            }
          try {
            if (artifactPublishGranted) {
              let found = Q.find((ot) => ot.type === "system" && ot.subtype === "init");
              let [Ne] = mcpToolNames(PUBLISH_TOOL_NAMES);
              if (found !== undefined && !(Array.isArray(found.tools) && found.tools.includes(Ne)))
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `the run was granted artifact publishing but the child was not offered ${Ne}, so the local Artifacts server did not attach: its grader counts would read 0`,
                  "eval: artifacts stand-in not offered",
                );
              xe.artifactPublishes.push(
                ...(await collectStubPublishes(sandbox, collectStubArtifactSlugs(Q))),
              );
            }
          } catch (error) {
            logForDebugging(`eval: folding stub publishes failed: ${error}`, {
              level: "error",
            });
            reject(error);
            return;
          }
          resolve(xe);
        });
    }
    ce.on("error", (he) =>
      De({
        kind: "error",
        message: String(he),
      }),
    );
    ce.on("close", (he, xe) => {
      At();
      De(
        _e
          ? {
              kind: "error",
              message: "interrupted",
            }
          : Ee
            ? {
                kind: "error",
                message: `subprocess stdout exceeded ${MAX_STUB_PUBLISH_BYTES} bytes \u2014 killed`,
              }
            : ye !== null
              ? {
                  kind: "error",
                  message: ye.message,
                }
              : Je
                ? {
                    kind: "error",
                    message: `timed out after ${case_.execution.timeout_seconds}s`,
                  }
                : he === 0
                  ? {
                      kind: "ok",
                    }
                  : {
                      kind: "exit",
                      code: he ?? `signal ${xe ?? "unknown"}`,
                      stderrTail: Be.slice(-2000),
                    },
      );
    });
  });
}
//@ chunk-qchp9vrd.js:127919-129357 placement
/**
 * 生成子会话命令行（--output-format stream-json --verbose --max-turns 等）。
 */
async function buildRunChildArgs(
  case_,
  sandbox,
  allowedTools,
  disallowedTools,
  modelOverride,
  configPath,
  w,
  evalFence,
) {
  let y = ["-p"];
  y.push("--output-format", "stream-json");
  y.push("--verbose");
  y.push("--max-turns", String(case_.execution.max_turns));
  y.push("--permission-mode", "dontAsk");
  y.push("--setting-sources", "user");
  let R = modelOverride ?? case_.execution.model;
  if (R) y.push(`--model=${R}`);
  for (let pluginDir of case_.pluginDirs) y.push("--plugin-dir", pluginDir);
  let S = await withPathDirectories(uniq([...case_.pluginDirsUnderTest, case_.caseDir]));
  for (let x of [sandbox.root, ...S, ...w])
    checkPathSegmentWhitespace(x, x === sandbox.root ? "sandbox" : "plugin/case/add_dirs");
  let T = uniq([
    ...scopeWriteToolRules(
      scopeReadToolRules(
        anchorRelativeRules(allowedTools, sandbox.cwd),
        [sandbox.home, sandbox.tmpDir, ...evalFence.readRoots, ...w],
        evalFence.readFiles,
      ),
      [sandbox.cwd, sandbox.tmpDir],
    ),
    ...w.flatMap((x) =>
      [FILE_READ_TOOL_NAME, GLOB_TOOL_NAME, GREP_TOOL_NAME].map((j) => `${j}(${toSandboxRulePath(x)}/**)`),
    ),
  ]);
  if (T.length > 0) y.push(`--allowed-tools=${T.join(",")}`);
  let N = [
    `${FILE_READ_TOOL_NAME}(${toSandboxRulePath(sandbox.configDir)}/**)`,
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(sandbox.configDir)}/**)`,
    `${FILE_READ_TOOL_NAME}(${toSandboxRulePath(sandbox.outDir)}/**)`,
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(sandbox.outDir)}/**)`,
    ...S.map((x) => `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(x)}/**)`),
    ...GIT_TOP_ENTRIES.flatMap((x) => [
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path.join(sandbox.cwd, x))})`,
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path.join(sandbox.cwd, x))}/**)`,
    ]),
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path.join(sandbox.cwd, EVAL_ARTIFACTS_DIR))})`,
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path.join(sandbox.cwd, EVAL_ARTIFACTS_DIR))}/**)`,
    ...evalFence.denies,
    ...evalFence.denyPaths.flatMap((denyPath) => [
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(denyPath)})`,
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(denyPath)}/**)`,
    ]),
  ];
  if (getPlatform() !== "windows") N.push(PROC_READ_RULE);
  N.push(...buildDisallowedTools(allowedTools, disallowedTools));
  y.push(`--disallowed-tools=${N.join(",")}`);
  if (case_.context.history_file)
    y.push("--resume", await resolveCaseFileInsideSuite(case_, case_.context.history_file, "history_file"));
  if (case_.execution.append_system_prompt)
    y.push(`--append-system-prompt=${case_.execution.append_system_prompt}`);
  if (configPath !== undefined) y.push(`--mcp-config=${configPath}`);
  return y;
}
export { readRunTraceHistory };
