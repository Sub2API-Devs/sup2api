/**
 * tools/ArtifactTool/preview/emulatorLook.ts
 *
 * 2.1.316 新增：模拟器 look
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (15)
 * attribution: placement 15
 */
import { join, isAbsolute, relative, sep } from "path";
import { realpath, open, readlink } from "fs/promises";
import { constants } from "fs";
import { execFileNoThrowWithCwd } from "../../../utils/execFileNoThrow.js";
import {
  artifactEmulatorDir,
  SCRIPTS_BOOTSTRAP_PY,
  checkInsideMount,
} from "../../../services/artifactPreview/browserDiscovery.js";
import { subprocessEnv } from "../../../utils/subprocessEnv.js";
import { AbortError, getErrnoCode } from "../../../utils/errors.js";
import { getPlatform } from "../../../utils/platform.js";
import { encodePreviewJpeg } from "../../../utils/imageResizer.js";
import { ensureToolResultsDir, writeToolResultFile } from "../../../utils/toolResultStorage.js";
import { jsonParse } from "../../../utils/slowOperations.js";

//@ chunk-8wvtd8sr.js:160191-160482 placement
/**
 * 查看器仿真"看一眼"的常量：python 路径、需要的技能文件、下载/look 超时与宽限、图片数/大小上限、标记/错误/提纲截断长度、停止前缀、路径长度上限、协议版本、合约版本正则、PNG 文件头。
 */
var SYSTEM_PYTHON3 = "/usr/bin/python3";
var SCRIPTS_AUTO_LOOK_PY = "scripts/auto_look.py";
var LOOK_SKILL_FILES = ["SKILL.md", "look-node.md"];
var EMULATOR_DOWNLOAD_TIMEOUT_MS = 600000;
var LOOK_TIMEOUT_MS = 105000;
var PROCESS_GRACE_MS = 15000;
var MAX_LOOK_PICTURES = 4;
var MAX_PICTURE_BYTES = 20971520;
var MAX_LOOK_ERRORS = 10;
var LOOK_ERROR_MAX_CHARS = 700;
var MAX_LOOK_MARKS = 50;
var LOOK_MARK_MAX_CHARS = 64;
var LOOK_OUTLINE_MAX_CHARS = 3000;
var STOPPED_REASON_MAX_CHARS = 500;
var EMULATOR_STOPPED_LINE_PREFIX = "artifact-emulator: stopped:";
var MAX_LOOK_PATH_CHARS = 4096;
var LOOK_FORMAT_VERSION = 1;
var CONTRACT_VERSION_RE = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
var buffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
//@ chunk-8wvtd8sr.js:160482-161683 placement
/**
 * 用 artifact 查看器仿真看一眼页面：先运行 bootstrap 脚本下载查看器（超时/失败/停止分别处理），再运行 auto_look.py look，解析输出，
 * 读取并校验每张 PNG 截图（必须在工作目录内）转成 JPEG 保存。返回 {kind:"looked", pictures, marks, errors, outline} 或 failed/stopped。
 */
async function runEmulatorLook(target, options) {
  let exec = options.exec ?? execFileNoThrowWithCwd;
  let targetArgs = lookTargetArgs(target);
  if (targetArgs === undefined)
    return {
      kind: "failed",
      reason: "bad_target",
    };
  let h = join(artifactEmulatorDir(), SCRIPTS_BOOTSTRAP_PY);
  let y = join(artifactEmulatorDir(), SCRIPTS_AUTO_LOOK_PY);
  let p = [y, ...LOOK_SKILL_FILES.map((V) => join(artifactEmulatorDir(), V))];
  let w = firstInsideMountProblem([h, ...p]);
  if (w !== undefined)
    return {
      kind: "failed",
      reason: `mount_${w}`,
    };
  let bootstrap = await runPythonScript(exec, [h], EMULATOR_DOWNLOAD_TIMEOUT_MS, options.signal, {
    readStderr: true,
  });
  if (bootstrap.timedOut)
    return {
      kind: "failed",
      reason: "download_timed_out",
    };
  if (bootstrap.code !== 0) {
    let V = stoppedReasonFromStderr(bootstrap.stderr);
    return V === undefined
      ? {
          kind: "failed",
          reason: "download_failed",
        }
      : {
          kind: "stopped",
          reason: V,
        };
  }
  let workDir = parseWorkDir(bootstrap.stdout);
  if (workDir === undefined)
    return {
      kind: "failed",
      reason: "download_unreadable",
    };
  let R = firstInsideMountProblem(p);
  if (R !== undefined)
    return {
      kind: "failed",
      reason: `mount_${R}`,
    };
  let look = await runPythonScript(exec, [y, "look", ...targetArgs], LOOK_TIMEOUT_MS, options.signal, {
    readStderr: false,
  });
  if (look.timedOut)
    return {
      kind: "failed",
      reason: "look_timed_out",
    };
  if (look.code !== 0)
    return {
      kind: "failed",
      reason: look.code === 2 ? "look_usage" : "look_failed",
    };
  let parsed = parseLookOutput(look.stdout);
  if (typeof parsed === "string")
    return {
      kind: "failed",
      reason: parsed,
    };
  let pictures = [];
  for (let [V, picturePath] of parsed.pictures.entries()) {
    let lookPicture = await readLookPicture(picturePath, workDir);
    if (typeof lookPicture === "string")
      return {
        kind: "failed",
        reason: lookPicture,
      };
    let q = await saveLookPicture(lookPicture, options, V);
    if (q === undefined)
      return {
        kind: "failed",
        reason: "picture_not_saved",
      };
    pictures.push(q);
  }
  return {
    kind: "looked",
    pictures,
    marks: parsed.marks,
    errors: parsed.errors,
    outline: parsed.outline,
  };
}
//@ chunk-8wvtd8sr.js:161683-161757 placement
/**
 * 取第一个落在挂载目录内的路径问题。
 */
function firstInsideMountProblem(e) {
  for (let n of e) {
    let s = checkInsideMount(n);
    if (s !== undefined) return s;
  }
  return;
}
//@ chunk-8wvtd8sr.js:161757-162116 placement
/**
 * 生成模拟器预览的命令行参数：页面模式为 --source，类型模式为 --type-files/--project/--contract；路径须为绝对路径、长度受限且无控制字符。
 */
function lookTargetArgs(target) {
  let n = (s) =>
    typeof s === "string" &&
    isAbsolute(s) &&
    [...s].length > 1 &&
    [...s].length <= MAX_LOOK_PATH_CHARS &&
    !/[\u0000-\u001f\u007f]/.test(s);
  if (target.kind === "page") return n(target.source) ? ["--source", target.source] : undefined;
  return n(target.typeFiles) &&
    n(target.project) &&
    typeof target.contract === "string" &&
    CONTRACT_VERSION_RE.test(target.contract)
    ? ["--type-files", target.typeFiles, "--project", target.project, "--contract", target.contract]
    : undefined;
}
//@ chunk-8wvtd8sr.js:162116-162787 placement
/**
 * 以 -I 运行系统 python3 脚本（干净环境、无控制终端、cwd 为 /），附加超出 timeout 的宽限截止与中断；返回 {code, stdout, stderr, timedOut}。
 */
async function runPythonScript(exec, args, timeoutMs, signal, { readStderr }) {
  let y = exec(SYSTEM_PYTHON3, ["-I", ...args], {
    abortSignal: signal,
    timeout: timeoutMs,
    cwd: "/",
    preserveOutputOnError: true,
    env: subprocessEnv(),
    extendEnv: false,
    stdin: "ignore",
    stderr: readStderr ? "pipe" : "ignore",
    withoutControllingTerminal: true,
    toolCgroupClass: "shell",
  });
  if (signal.aborted) throw new AbortError();
  let p;
  let w;
  let promise = new Promise((resolve) => {
    p = setTimeout((T) => T("deadline"), timeoutMs + PROCESS_GRACE_MS, resolve);
    w = () => resolve("aborted");
    signal.addEventListener("abort", w, {
      once: true,
    });
  });
  let S;
  try {
    S = await Promise.race([y, promise]);
  } finally {
    clearTimeout(p);
    signal.removeEventListener("abort", w);
  }
  if (signal.aborted) throw new AbortError();
  if (S === "deadline" || S === "aborted")
    return {
      code: -1,
      stdout: "",
      stderr: "",
      timedOut: true,
    };
  return {
    code: S.code,
    stdout: S.stdout,
    stderr: S.stderr,
    timedOut: S.timedOut === true,
  };
}
//@ chunk-8wvtd8sr.js:162787-162893 placement
function stoppedReasonFromStderr(stderr) {
  let found = stderr
    .split(
      `
`,
    )
    .reverse()
    .find((line) => line.startsWith(EMULATOR_STOPPED_LINE_PREFIX));
  return found === undefined ? undefined : truncateCodePointsWithEllipsis(found, STOPPED_REASON_MAX_CHARS);
}
//@ chunk-8wvtd8sr.js:162893-163027 placement
function parseWorkDir(stdout) {
  let n = lastNonEmptyLine(stdout);
  let workDir = n !== null && typeof n === "object" && "workDir" in n ? n.workDir : undefined;
  return typeof workDir === "string" && isAbsolute(workDir) ? workDir : undefined;
}
//@ chunk-8wvtd8sr.js:163027-163529 placement
/**
 * 解析 look 的单行 JSON 输出：校验格式版本与字段形状（图片 1–4 张、marks/errors 数组、outline 字符串），截断各项后返回，否则返回失败原因码。
 */
function parseLookOutput(stdout) {
  let filtered = stdout
    .split(
      `
`,
    )
    .filter((line) => line.trim() !== "");
  if (filtered.length !== 1) return "look_unreadable";
  let jsonOrNull = parseJsonOrNull(filtered[0]);
  if (jsonOrNull === null || typeof jsonOrNull !== "object" || Array.isArray(jsonOrNull))
    return "look_unreadable";
  let { format, pictures, marks, errors, outline } = jsonOrNull;
  if (format !== undefined && format !== LOOK_FORMAT_VERSION) return "look_version";
  if (
    !isStringArray(pictures) ||
    pictures.length === 0 ||
    pictures.length > MAX_LOOK_PICTURES ||
    !isStringArray(marks) ||
    !isStringArray(errors) ||
    typeof outline !== "string"
  )
    return "look_wrong_shape";
  return {
    pictures,
    marks: marks
      .slice(0, MAX_LOOK_MARKS)
      .map((mark) => truncateCodePointsWithEllipsis(mark, LOOK_MARK_MAX_CHARS)),
    errors: errors
      .slice(0, MAX_LOOK_ERRORS)
      .map((error) => truncateCodePointsWithEllipsis(error, LOOK_ERROR_MAX_CHARS)),
    outline: truncateCodePointsWithEllipsis(outline, LOOK_OUTLINE_MAX_CHARS),
  };
}
//@ chunk-8wvtd8sr.js:163529-164483 placement
/**
 * 读取 look 产出的截图：必须在工作目录内（realpath 与 /proc fd 双重核对）、普通非空文件、不超过大小上限且为 PNG；返回内容或失败原因码。
 */
async function readLookPicture(picturePath, workDir) {
  let s;
  try {
    s = await realpath(workDir);
  } catch {
    return "picture_missing";
  }
  if (
    !isAbsolute(picturePath) ||
    [...picturePath].length > MAX_LOOK_PATH_CHARS ||
    /[\u0000-\u001f\u007f]/.test(picturePath) ||
    !(isStrictlyUnder(workDir, picturePath) || isStrictlyUnder(s, picturePath))
  )
    return "picture_outside_work_dir";
  let r;
  try {
    r = await realpath(picturePath);
  } catch {
    return "picture_missing";
  }
  if (!isStrictlyUnder(s, r)) return "picture_outside_work_dir";
  let h;
  try {
    h = await open(r, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    let platform = getPlatform();
    if ((platform === "linux" || platform === "wsl") && (await readlink(`/proc/self/fd/${h.fd}`)) !== r)
      return "picture_outside_work_dir";
    let stats = await h.stat();
    if (!stats.isFile()) return "picture_not_a_file";
    if (stats.size === 0) return "picture_empty";
    if (stats.size > MAX_PICTURE_BYTES) return "picture_too_large";
    let w = Buffer.alloc(stats.size + 1);
    let A = 0;
    while (A < w.length) {
      let { bytesRead } = await h.read(w, A, w.length - A, A);
      if (bytesRead === 0) break;
      A += bytesRead;
    }
    if (A > stats.size) return "picture_too_large";
    let chunk = w.subarray(0, A);
    return chunk.subarray(0, buffer.length).equals(buffer) ? chunk : "picture_not_png";
  } catch (error) {
    return getErrnoCode(error) === "ELOOP" ? "picture_not_a_file" : "picture_missing";
  } finally {
    await h?.close().catch(() => {});
  }
}
//@ chunk-8wvtd8sr.js:164483-164676 placement
async function saveLookPicture(lookPicture, options, s) {
  try {
    let { jpeg } = await encodePreviewJpeg(lookPicture);
    let h = join(options.shotDir, `${options.shotName(s)}.jpg`);
    await ensureToolResultsDir(options.shotDir, undefined);
    await writeToolResultFile(h, jpeg);
    return {
      path: h,
      base64: jpeg.toString("base64"),
    };
  } catch {
    return;
  }
}
//@ chunk-8wvtd8sr.js:164676-164774 placement
/**
 * 取文本中最后一个非空行。
 */
function lastNonEmptyLine(e) {
  let found = e
    .split(
      `
`,
    )
    .reverse()
    .find((line) => line.trim() !== "");
  return found === undefined ? null : parseJsonOrNull(found);
}
//@ chunk-8wvtd8sr.js:164774-164825 placement
/**
 * 解析 JSON，失败返回 null。
 */
function parseJsonOrNull(e) {
  try {
    return jsonParse(e);
  } catch {
    return null;
  }
}
//@ chunk-8wvtd8sr.js:164825-164899 placement
/**
 * 判断值是否是元素全为字符串的数组。
 */
function isStringArray(e) {
  return Array.isArray(e) && e.every((n) => typeof n === "string");
}
//@ chunk-8wvtd8sr.js:164899-164988 placement
/**
 * 判断路径是否严格位于另一目录之下。
 */
function isStrictlyUnder(e, picturePath) {
  let s = relative(e, picturePath);
  return s !== "" && s !== ".." && !s.startsWith(`..${sep}`) && !isAbsolute(s);
}
//@ chunk-8wvtd8sr.js:164988-165072 placement
/**
 * 按码点截断文本并在截断处加省略号。
 */
function truncateCodePointsWithEllipsis(e, n) {
  let s = [...e];
  return s.length <= n ? e : `${s.slice(0, n).join("")}\u2026`;
}
export { runEmulatorLook };
