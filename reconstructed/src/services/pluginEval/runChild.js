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
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
} from "fs/promises";
import { spawn, spawn as spawn_2 } from "child_process";
import { checkAddDirsInsideCase, buildEvalSandboxSettings } from "./evalSandbox.js";
import {
  buildEvalFence,
  resolveCaseFileInsideSuite,
  withPathDirectories,
  checkPathSegmentWhitespace,
  toSandboxRulePath,
  Sf,
} from "./evalFence.js";
import {
  buildChildEnv,
  writeChildManagedPolicy,
  passApiKeyToChild,
  CHILD_AUTH_ENV_VARS,
  checkAwsCredentialPointers,
  To,
} from "./childEnvironment.js";
import { checkGitVersionForEval, summarizeRunTrace, collectStubArtifactSlugs } from "./runTrace.js";
import { loadTranscriptFromFile } from "../../utils/sessionStorage.js";
import { getSelfExecArgv, vun, Eun } from "../artifacts/artifactsMcpServer.js";
import {
  findMockServersInInit,
  annotateMockedToolCalls,
  verifyMockCallLog,
  summarizeMockUsage,
} from "./mocks/mockVerification.js";
import { getPlatform } from "../../utils/platform.js";
import { Nd } from "../../utils/toolCgroup.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { MAX_STUB_PUBLISH_BYTES, collectStubPublishes, Kt } from "./artifactStub.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  Hr,
  Li,
  scopeWriteToolRules,
  scopeReadToolRules,
  anchorRelativeRules,
  hf,
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
      case_: case_,
      sandbox: sandbox,
      allowedTools: allowedTools,
      disallowedTools: disallowedTools = [],
      modelOverride: modelOverride,
      artifactPublishGranted: artifactPublishGranted,
      growthbookOverrides: growthbookOverrides,
      mocks: mocks,
      credential: credential,
    } = e,
    joined = path_15.join(sandbox.outDir, "trace.jsonl"),
    T = await checkAddDirsInsideCase(case_),
    N = await buildEvalFence(case_, T),
    x = await buildRunChildArgs(
      case_,
      sandbox,
      allowedTools,
      disallowedTools,
      modelOverride,
      mocks?.configPath,
      T,
      N,
    ),
    j = buildChildEnv(case_, sandbox, artifactPublishGranted, growthbookOverrides, mocks !== void 0);
  (await checkGitVersionForEval(j), await writeChildManagedPolicy(sandbox));
  let K = case_.context.history_file
      ? await lf(await resolveCaseFileInsideSuite(case_, case_.context.history_file, "history_file"))
      : 0,
    X = credential ? await passApiKeyToChild(credential) : null;
  try {
    return await prepareRunChildConfig(e, x, j, joined, X, { addDirs: T, readScope: N, restoredCostUsd: K });
  } finally {
    await X?.cleanup();
  }
}
//@ chunk-qchp9vrd.js:123081-123170 placement
async function lf(e) {
  try {
    return (await loadTranscriptFromFile(e)).costState?.totalCostUSD ?? 0;
  } catch {
    return 0;
  }
}
/**
 * 准备子会话的配置目录：网关 ANTHROPIC_CUSTOM_HEADERS、git 配置、settings。
 */
//@ chunk-qchp9vrd.js:123170-127919 placement
async function prepareRunChildConfig(
  e,
  n,
  r,
  a,
  s,
  { addDirs: addDirs, readScope: readScope, restoredCostUsd: restoredCostUsd },
) {
  let {
    case_: case_,
    sandbox: sandbox,
    allowedTools: allowedTools,
    operatorAllowedTools: operatorAllowedTools = [],
    artifactPublishGranted: artifactPublishGranted,
    verbose: verbose,
    mocks: mocks,
    signal: signal,
    credential: credential,
  } = e;
  if (s) {
    let Z = new Set(Object.keys(s.env).map((se) => se.toUpperCase()));
    for (let se of Object.keys(r)) if (Z.has(se.toUpperCase())) delete r[se];
    Object.assign(r, s.env);
  }
  if (credential)
    for (let Z of Object.keys(r)) {
      let upper = Z.toUpperCase();
      if (CHILD_AUTH_ENV_VARS.has(upper)) delete r[Z];
      else if (upper === "ANTHROPIC_CUSTOM_HEADERS") {
        if (credential.kind === "gateway" && credential.authorizationHeaderIsCredential) continue;
        let Q =
            credential.kind === "gateway" ? /^\s*authorization\s*:/i : /^\s*(authorization|x-api-key)\s*:/i,
          filtered = (r[Z] ?? "").split(/\r?\n/).filter((we) => !Q.test(we));
        if (filtered.some((we) => we.trim() !== ""))
          r[Z] = filtered.join(`
`);
        else delete r[Z];
      }
    }
  await checkAwsCredentialPointers(sandbox, r);
  for (let Z of [path_15.join(".config", "git"), path_15.join(".local", "lib"), ...To])
    await mkdir_4(path_15.join(sandbox.home, Z), { recursive: !0 });
  await buildEvalSandboxSettings(sandbox, allowedTools, operatorAllowedTools, case_, r, void 0, {
    addDirs: addDirs,
    readScope: readScope,
  });
  let [W = process.execPath, ...G] = getSelfExecArgv(),
    J = [...G, ...n];
  return await new Promise((Z, se) => {
    let Q = [],
      Se = "",
      we = 0,
      Be = "",
      Je = !1,
      Ee = !1,
      Qe = !1,
      ye = null,
      je = [],
      pt = mocks ? findMockServersInInit(mocks) : null,
      Pt = case_.execution.timeout_seconds * 1000,
      ce = spawn_2(W, J, {
        cwd: sandbox.cwd,
        env: r,
        stdio: s?.viaFd ? ["pipe", "pipe", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
        windowsHide: !0,
        detached: getPlatform() !== "windows",
        ...Nd("agent"),
      }),
      At = () => {
        if (ce.pid === void 0 || getPlatform() === "windows") return;
        try {
          process.kill(-ce.pid, "SIGKILL");
        } catch {}
      },
      B = () => {
        if (getPlatform() === "windows" && ce.pid !== void 0) {
          execFileNoThrow("taskkill", ["/T", "/F", "/PID", String(ce.pid)]).then(() => {
            if (ce.exitCode === null && ce.signalCode === null) ce.kill("SIGKILL");
          });
          return;
        }
        (At(), ce.kill("SIGKILL"));
      };
    if ((process.on("exit", At), credential && s?.viaFd)) {
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
    (ce.stdin?.on("error", () => {}), ce.stdin?.end(case_.execution.prompt));
    let ie = setTimeout(() => {
        ((Je = !0), B());
      }, Pt),
      _e = !1,
      Ae = () => {
        ((_e = !0), B());
      };
    if (signal.aborted) Ae();
    else signal.addEventListener("abort", Ae, { once: !0 });
    (ce.stdout.setEncoding("utf8"),
      ce.stdout.on("data", (he) => {
        if (((we += he.length), we > MAX_STUB_PUBLISH_BYTES)) {
          if (!Ee) ((Ee = !0), B());
          return;
        }
        Se += he;
        let xe;
        while (
          (xe = Se.indexOf(`
`)) !== -1
        ) {
          let trimmed = Se.slice(0, xe).trim();
          if (((Se = Se.slice(xe + 1)), !trimmed)) continue;
          try {
            let Ne = jsonParse(trimmed);
            if ((Q.push(Ne), verbose)) logForDebugging(`eval trace: ${Ne.type}`);
            if (pt !== null && ye === null)
              je.push(
                Promise.resolve(pt(Ne)).then(
                  (ot) => {
                    if (ot !== null && ye === null) ((ye = ot), B());
                  },
                  (ot) => {
                    logForDebugging(`eval: mock watch failed: ${ot}`, { level: "error" });
                  },
                ),
              );
          } catch {}
        }
      }),
      ce.stderr.setEncoding("utf8"),
      ce.stderr.on("data", (he) => {
        if (Be.length < 65536) Be += he;
      }));
    function De(he) {
      if (Qe) return;
      ((Qe = !0),
        clearTimeout(ie),
        signal.removeEventListener("abort", Ae),
        process.removeListener("exit", At));
      let xe = summarizeRunTrace(Q, Je, he, a, {
        shellGranted: Hr.some((Me) => Li(allowedTools, Me)),
        restoredCostUsd: restoredCostUsd,
      });
      ((xe.killedInFlight = Je || _e || Ee),
        writeFile_2(
          a,
          Q.map((Me) => jsonStringify(Me)).join(`
`),
        )
          .catch(() => {})
          .then(async () => {
            if (mocks)
              try {
                await Promise.all(je);
                let Me = await readMockCallLog(mocks.callLogPath, mocks.nonce);
                ((xe.mockCalls = Me.records), annotateMockedToolCalls(xe.toolCalls, mocks));
                let Ne = ye !== null || xe.killedInFlight,
                  ot = verifyMockCallLog(
                    xe.toolCalls,
                    Me.truncated ? null : Me.records,
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
                        : ye.message,
                    mt = xe.endedOnApiError ? xe.error : null;
                  ((xe.error = mt !== null && !nt.startsWith(mt) ? `${mt} \xB7 ${nt}` : nt),
                    (xe.mockSetupFailure = ye.kind));
                } else if (ye !== null)
                  ((xe.aborted = ye.abort ?? { server: "?", tool: "?", reason: ye.message }),
                    (xe.error = null));
                xe.mockTally = mocks.mockedTools.length > 0 ? summarizeMockUsage(xe.toolCalls, mocks) : null;
              } catch (error) {
                logForDebugging(`eval: reading mock call log failed: ${error}`, { level: "error" });
              }
            try {
              if (artifactPublishGranted) {
                let found = Q.find((ot) => ot.type === "system" && ot.subtype === "init"),
                  [Ne] = vun(Eun);
                if (found !== void 0 && !(Array.isArray(found.tools) && found.tools.includes(Ne)))
                  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    `the run was granted artifact publishing but the child was not offered ${Ne}, so the local Artifacts server did not attach: its grader counts would read 0`,
                    "eval: artifacts stand-in not offered",
                  );
                xe.artifactPublishes.push(
                  ...(await collectStubPublishes(sandbox, collectStubArtifactSlugs(Q))),
                );
              }
            } catch (error) {
              (logForDebugging(`eval: folding stub publishes failed: ${error}`, { level: "error" }),
                se(error));
              return;
            }
            Z(xe);
          }));
    }
    (ce.on("error", (he) => De({ kind: "error", message: String(he) })),
      ce.on("close", (he, xe) => {
        (At(),
          De(
            _e
              ? { kind: "error", message: "interrupted" }
              : Ee
                ? {
                    kind: "error",
                    message: `subprocess stdout exceeded ${MAX_STUB_PUBLISH_BYTES} bytes \u2014 killed`,
                  }
                : ye !== null
                  ? { kind: "error", message: ye.message }
                  : Je
                    ? { kind: "error", message: `timed out after ${case_.execution.timeout_seconds}s` }
                    : he === 0
                      ? { kind: "ok" }
                      : {
                          kind: "exit",
                          code: he ?? `signal ${xe ?? "unknown"}`,
                          stderrTail: Be.slice(-2000),
                        },
          ));
      }));
  });
}
/**
 * 生成子会话命令行（--output-format stream-json --verbose --max-turns 等）。
 */
//@ chunk-qchp9vrd.js:127919-129357 placement
async function buildRunChildArgs(e, n, r, a, s, h, w, b) {
  let y = ["-p"];
  (y.push("--output-format", "stream-json"),
    y.push("--verbose"),
    y.push("--max-turns", String(e.execution.max_turns)),
    y.push("--permission-mode", "dontAsk"),
    y.push("--setting-sources", "user"));
  let R = s ?? e.execution.model;
  if (R) y.push(`--model=${R}`);
  for (let pluginDir of e.pluginDirs) y.push("--plugin-dir", pluginDir);
  let S = await withPathDirectories(uniq([...e.pluginDirsUnderTest, e.caseDir]));
  for (let x of [n.root, ...S, ...w])
    checkPathSegmentWhitespace(x, x === n.root ? "sandbox" : "plugin/case/add_dirs");
  let T = uniq([
    ...scopeWriteToolRules(
      scopeReadToolRules(
        anchorRelativeRules(r, n.cwd),
        [n.home, n.tmpDir, ...b.readRoots, ...w],
        b.readFiles,
      ),
      [n.cwd, n.tmpDir],
    ),
    ...w.flatMap((x) =>
      [FILE_READ_TOOL_NAME, GLOB_TOOL_NAME, GREP_TOOL_NAME].map((j) => `${j}(${toSandboxRulePath(x)}/**)`),
    ),
  ]);
  if (T.length > 0) y.push(`--allowed-tools=${T.join(",")}`);
  let N = [
    `${FILE_READ_TOOL_NAME}(${toSandboxRulePath(n.configDir)}/**)`,
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(n.configDir)}/**)`,
    `${FILE_READ_TOOL_NAME}(${toSandboxRulePath(n.outDir)}/**)`,
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(n.outDir)}/**)`,
    ...S.map((x) => `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(x)}/**)`),
    ...Sf.flatMap((x) => [
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path_15.join(n.cwd, x))})`,
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path_15.join(n.cwd, x))}/**)`,
    ]),
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path_15.join(n.cwd, Kt))})`,
    `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(path_15.join(n.cwd, Kt))}/**)`,
    ...b.denies,
    ...b.denyPaths.flatMap((denyPath) => [
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(denyPath)})`,
      `${FILE_EDIT_TOOL_NAME}(${toSandboxRulePath(denyPath)}/**)`,
    ]),
  ];
  if (getPlatform() !== "windows") N.push(hf);
  if (
    (N.push(...buildDisallowedTools(r, a)),
    y.push(`--disallowed-tools=${N.join(",")}`),
    e.context.history_file)
  )
    y.push("--resume", await resolveCaseFileInsideSuite(e, e.context.history_file, "history_file"));
  if (e.execution.append_system_prompt) y.push(`--append-system-prompt=${e.execution.append_system_prompt}`);
  if (h !== void 0) y.push(`--mcp-config=${h}`);
  return y;
}

export { readRunTraceHistory };
