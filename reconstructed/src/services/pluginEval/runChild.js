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
async function readRunTraceHistory(input) {
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
  } = input;
  let joined = path.join(sandbox.outDir, "trace.jsonl");
  let addDirs = await checkAddDirsInsideCase(case_);
  let evalFence = await buildEvalFence(case_, addDirs);
  let runChildArgs = await buildRunChildArgs(
    case_,
    sandbox,
    allowedTools,
    disallowedTools,
    modelOverride,
    mocks?.configPath,
    addDirs,
    evalFence,
  );
  let env = buildChildEnv(case_, sandbox, artifactPublishGranted, growthbookOverrides, mocks !== undefined);
  await checkGitVersionForEval(env);
  await writeChildManagedPolicy(sandbox);
  let restoredCostUsd = case_.context.history_file
    ? await readHistoryCost(
        await resolveCaseFileInsideSuite(case_, case_.context.history_file, "history_file"),
      )
    : 0;
  let credentialHelper = credential ? await passApiKeyToChild(credential) : null;
  try {
    return await prepareRunChildConfig(input, runChildArgs, env, joined, credentialHelper, {
      addDirs,
      readScope: evalFence,
      restoredCostUsd,
    });
  } finally {
    await credentialHelper?.cleanup();
  }
}
//@ chunk-qchp9vrd.js:123081-123170 placement
/**
 * 读取历史文件里的累计花费（失败为 0）。
 */
async function readHistoryCost(transcriptPath) {
  try {
    return (await loadTranscriptFromFile(transcriptPath)).costState?.totalCostUSD ?? 0;
  } catch {
    return 0;
  }
}
//@ chunk-qchp9vrd.js:123170-127919 placement
/**
 * 准备子会话的配置目录：网关 ANTHROPIC_CUSTOM_HEADERS、git 配置、settings。
 */
async function prepareRunChildConfig(
  input,
  runChildArgs,
  envVars,
  tracePath,
  credentialHelper,
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
  } = input;
  if (credentialHelper) {
    let helperKeys = new Set(Object.keys(credentialHelper.env).map((key) => key.toUpperCase()));
    for (let key of Object.keys(envVars)) if (helperKeys.has(key.toUpperCase())) delete envVars[key];
    Object.assign(envVars, credentialHelper.env);
  }
  if (credential)
    for (let key of Object.keys(envVars)) {
      let upper = key.toUpperCase();
      if (CHILD_AUTH_ENV_VARS.has(upper)) delete envVars[key];
      else if (upper === "ANTHROPIC_CUSTOM_HEADERS") {
        if (credential.kind === "gateway" && credential.authorizationHeaderIsCredential) continue;
        let authHeaderRe =
          credential.kind === "gateway" ? /^\s*authorization\s*:/i : /^\s*(authorization|x-api-key)\s*:/i;
        let filtered = (envVars[key] ?? "").split(/\r?\n/).filter((line) => !authHeaderRe.test(line));
        if (filtered.some((headerLine) => headerLine.trim() !== ""))
          envVars[key] = filtered.join(`
`);
        else delete envVars[key];
      }
    }
  await checkAwsCredentialPointers(sandbox, envVars);
  for (let cacheDir of [path.join(".config", "git"), path.join(".local", "lib"), ...AWS_CACHE_DIRS])
    await mkdir(path.join(sandbox.home, cacheDir), {
      recursive: true,
    });
  await buildEvalSandboxSettings(sandbox, allowedTools, operatorAllowedTools, case_, envVars, undefined, {
    addDirs,
    readScope,
  });
  let [execPath = process.execPath, ...execArgs] = getSelfExecArgv();
  let childArgs = [...execArgs, ...runChildArgs];
  return await new Promise((resolve, reject) => {
    let traceEvents = [];
    let stdoutBuffer = "";
    let stdoutBytes = 0;
    let stderrTail = "";
    let timedOut = false;
    let stdoutOverflow = false;
    let finished = false;
    let mockFailure = null;
    let mockWatches = [];
    let mockWatcher = mocks ? findMockServersInInit(mocks) : null;
    let timeoutMs = case_.execution.timeout_seconds * 1000;
    let child = spawn(execPath, childArgs, {
      cwd: sandbox.cwd,
      env: envVars,
      stdio: credentialHelper?.viaFd ? ["pipe", "pipe", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
      windowsHide: true,
      detached: getPlatform() !== "windows",
      ...cgroupSpawnOptions("agent"),
    });
    let killProcessGroup = () => {
      if (child.pid === undefined || getPlatform() === "windows") return;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    };
    let killChild = () => {
      if (getPlatform() === "windows" && child.pid !== undefined) {
        execFileNoThrow("taskkill", ["/T", "/F", "/PID", String(child.pid)]).then(() => {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        });
        return;
      }
      killProcessGroup();
      child.kill("SIGKILL");
    };
    process.on("exit", killProcessGroup);
    if (credential && credentialHelper?.viaFd) {
      let credentialFd = child.stdio[3];
      if (credentialFd && "end" in credentialFd) {
        credentialFd.on("error", () => {});
        let credentialValue;
        switch (credential.kind) {
          case "oauth":
            credentialValue = credential.accessToken;
            break;
          case "gateway":
            credentialValue = credential.jwt;
            break;
          case "apiKey":
            credentialValue = credential.apiKey;
            break;
        }
        credentialFd.end(
          credentialValue +
            `
`,
        );
      }
    }
    child.stdin?.on("error", () => {});
    child.stdin?.end(case_.execution.prompt);
    let timer = setTimeout(() => {
      timedOut = true;
      killChild();
    }, timeoutMs);
    let interrupted = false;
    let onAbort = () => {
      interrupted = true;
      killChild();
    };
    if (signal.aborted) onAbort();
    else
      signal.addEventListener("abort", onAbort, {
        once: true,
      });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_STUB_PUBLISH_BYTES) {
        if (!stdoutOverflow) {
          stdoutOverflow = true;
          killChild();
        }
        return;
      }
      stdoutBuffer += chunk;
      let newlineIndex;
      while (
        (newlineIndex = stdoutBuffer.indexOf(`
`)) !== -1
      ) {
        let trimmed = stdoutBuffer.slice(0, newlineIndex).trim();
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        if (!trimmed) continue;
        try {
          let event = jsonParse(trimmed);
          traceEvents.push(event);
          if (verbose) logForDebugging(`eval trace: ${event.type}`);
          if (mockWatcher !== null && mockFailure === null)
            mockWatches.push(
              Promise.resolve(mockWatcher(event)).then(
                (failure) => {
                  if (failure !== null && mockFailure === null) {
                    mockFailure = failure;
                    killChild();
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
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      if (stderrTail.length < 65536) stderrTail += chunk;
    });
    function finish(exitInfo) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      process.removeListener("exit", killProcessGroup);
      let runTrace = summarizeRunTrace(traceEvents, timedOut, exitInfo, tracePath, {
        shellGranted: SHELL_TOOLS.some((shellTool) => hasToolRule(allowedTools, shellTool)),
        restoredCostUsd,
      });
      runTrace.killedInFlight = timedOut || interrupted || stdoutOverflow;
      writeFile(
        tracePath,
        traceEvents.map((event) => jsonStringify(event)).join(`
`),
      )
        .catch(() => {})
        .then(async () => {
          if (mocks)
            try {
              await Promise.all(mockWatches);
              let mockCallLog = await readMockCallLog(mocks.callLogPath, mocks.nonce);
              runTrace.mockCalls = mockCallLog.records;
              annotateMockedToolCalls(runTrace.toolCalls, mocks);
              let skippedVerification = mockFailure !== null || runTrace.killedInFlight;
              let callLogProblem = verifyMockCallLog(
                runTrace.toolCalls,
                mockCallLog.truncated ? null : mockCallLog.records,
                mocks,
                mockFailure !== null || interrupted
                  ? "unprovokable"
                  : runTrace.killedInFlight
                    ? "provokable"
                    : null,
              );
              if (mockFailure === null && callLogProblem !== null)
                mockFailure = {
                  kind: "integrity",
                  message:
                    skippedVerification && runTrace.error !== null
                      ? `${runTrace.error} \xB7 ${callLogProblem} (the child was killed before it reported which calls it refused itself; a call its own hook blocked is counted as unserved)`
                      : callLogProblem,
                };
              if (mockFailure !== null && mockFailure.kind !== "abort") {
                let failureMessage =
                  mockFailure.kind === "registration" && stderrTail.length > 0
                    ? `${mockFailure.message} \xB7 child stderr: ${stderrTail.slice(-1000)}`
                    : mockFailure.message;
                let error = runTrace.endedOnApiError ? runTrace.error : null;
                runTrace.error =
                  error !== null && !failureMessage.startsWith(error)
                    ? `${error} \xB7 ${failureMessage}`
                    : failureMessage;
                runTrace.mockSetupFailure = mockFailure.kind;
              } else if (mockFailure !== null) {
                runTrace.aborted = mockFailure.abort ?? {
                  server: "?",
                  tool: "?",
                  reason: mockFailure.message,
                };
                runTrace.error = null;
              }
              runTrace.mockTally =
                mocks.mockedTools.length > 0 ? summarizeMockUsage(runTrace.toolCalls, mocks) : null;
            } catch (error) {
              logForDebugging(`eval: reading mock call log failed: ${error}`, {
                level: "error",
              });
            }
          try {
            if (artifactPublishGranted) {
              let found = traceEvents.find((event) => event.type === "system" && event.subtype === "init");
              let [publishToolName] = mcpToolNames(PUBLISH_TOOL_NAMES);
              if (
                found !== undefined &&
                !(Array.isArray(found.tools) && found.tools.includes(publishToolName))
              )
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `the run was granted artifact publishing but the child was not offered ${publishToolName}, so the local Artifacts server did not attach: its grader counts would read 0`,
                  "eval: artifacts stand-in not offered",
                );
              runTrace.artifactPublishes.push(
                ...(await collectStubPublishes(sandbox, collectStubArtifactSlugs(traceEvents))),
              );
            }
          } catch (error) {
            logForDebugging(`eval: folding stub publishes failed: ${error}`, {
              level: "error",
            });
            reject(error);
            return;
          }
          resolve(runTrace);
        });
    }
    child.on("error", (error) =>
      finish({
        kind: "error",
        message: String(error),
      }),
    );
    child.on("close", (code, signalName) => {
      killProcessGroup();
      finish(
        interrupted
          ? {
              kind: "error",
              message: "interrupted",
            }
          : stdoutOverflow
            ? {
                kind: "error",
                message: `subprocess stdout exceeded ${MAX_STUB_PUBLISH_BYTES} bytes \u2014 killed`,
              }
            : mockFailure !== null
              ? {
                  kind: "error",
                  message: mockFailure.message,
                }
              : timedOut
                ? {
                    kind: "error",
                    message: `timed out after ${case_.execution.timeout_seconds}s`,
                  }
                : code === 0
                  ? {
                      kind: "ok",
                    }
                  : {
                      kind: "exit",
                      code: code ?? `signal ${signalName ?? "unknown"}`,
                      stderrTail: stderrTail.slice(-2000),
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
  extraNames,
  modelOverride,
  configPath,
  addDirs,
  evalFence,
) {
  let args = ["-p"];
  args.push("--output-format", "stream-json");
  args.push("--verbose");
  args.push("--max-turns", String(case_.execution.max_turns));
  args.push("--permission-mode", "dontAsk");
  args.push("--setting-sources", "user");
  let model = modelOverride ?? case_.execution.model;
  if (model) args.push(`--model=${model}`);
  for (let pluginDir of case_.pluginDirs) args.push("--plugin-dir", pluginDir);
  let pluginDirs = await withPathDirectories(uniq([...case_.pluginDirsUnderTest, case_.caseDir]));
  for (let dir of [sandbox.root, ...pluginDirs, ...addDirs])
    checkPathSegmentWhitespace(dir, dir === sandbox.root ? "sandbox" : "plugin/case/add_dirs");
  let allowedRules = uniq([
    ...scopeWriteToolRules(
      scopeReadToolRules(
        anchorRelativeRules(allowedTools, sandbox.cwd),
        [sandbox.home, sandbox.tmpDir, ...evalFence.readRoots, ...addDirs],
        evalFence.readFiles,
      ),
      [sandbox.cwd, sandbox.tmpDir],
    ),
    ...addDirs.flatMap((addDir) =>
      [FILE_READ_TOOL_NAME, GLOB_TOOL_NAME, GREP_TOOL_NAME].map(
        (toolName) => `${toolName}(${toSandboxRulePath(addDir)}/**)`,
      ),
    ),
  ]);
  if (allowedRules.length > 0) args.push(`--allowed-tools=${allowedRules.join(",")}`);
  let disallowedRules = [
    `${FILE_READ_TOOL_NAME}(${toSandboxRulePath(sandbox.configDir)}/**)`,
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(sandbox.configDir)}/**)`,
    `${FILE_READ_TOOL_NAME}(${toSandboxRulePath(sandbox.outDir)}/**)`,
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(sandbox.outDir)}/**)`,
    ...pluginDirs.map((pluginDir) => `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(pluginDir)}/**)`),
    ...GIT_TOP_ENTRIES.flatMap((entry) => [
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path.join(sandbox.cwd, entry))})`,
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path.join(sandbox.cwd, entry))}/**)`,
    ]),
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path.join(sandbox.cwd, EVAL_ARTIFACTS_DIR))})`,
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path.join(sandbox.cwd, EVAL_ARTIFACTS_DIR))}/**)`,
    ...evalFence.denies,
    ...evalFence.denyPaths.flatMap((denyPath) => [
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(denyPath)})`,
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(denyPath)}/**)`,
    ]),
  ];
  if (getPlatform() !== "windows") disallowedRules.push(PROC_READ_RULE);
  disallowedRules.push(...buildDisallowedTools(allowedTools, extraNames));
  args.push(`--disallowed-tools=${disallowedRules.join(",")}`);
  if (case_.context.history_file)
    args.push(
      "--resume",
      await resolveCaseFileInsideSuite(case_, case_.context.history_file, "history_file"),
    );
  if (case_.execution.append_system_prompt)
    args.push(`--append-system-prompt=${case_.execution.append_system_prompt}`);
  if (configPath !== undefined) args.push(`--mcp-config=${configPath}`);
  return args;
}
export { readRunTraceHistory };
