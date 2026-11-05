/**
 * tools/ArtifactTool/preview/emulatorLook.ts
 *
 * 2.1.316 新增：模拟器 look
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (15)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-xzmy9dn4.js:162373-162664 placement
/**
 * 查看器仿真"看一眼"的常量：python 路径、需要的技能文件、下载/look 超时与宽限、图片数/大小上限、标记/错误/提纲截断长度、停止前缀、路径长度上限、协议版本、合约版本正则、PNG 文件头。
 */
var SYSTEM_PYTHON3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SCRIPTS_AUTO_LOOK_PY;
var LOOK_SKILL_FILES;
var EMULATOR_DOWNLOAD_TIMEOUT_MS;
var LOOK_TIMEOUT_MS;
var PROCESS_GRACE_MS;
var MAX_LOOK_PICTURES;
var MAX_PICTURE_BYTES;
var MAX_LOOK_ERRORS;
var LOOK_ERROR_MAX_CHARS;
var MAX_LOOK_MARKS;
var LOOK_MARK_MAX_CHARS;
var LOOK_OUTLINE_MAX_CHARS;
var STOPPED_REASON_MAX_CHARS;
var EMULATOR_STOPPED_LINE_PREFIX;
var MAX_LOOK_PATH_CHARS;
var LOOK_FORMAT_VERSION;
var CONTRACT_VERSION_RE;
var buffer;
deferInit("chunk-xzmy9dn4.js:162373", () => {
  SYSTEM_PYTHON3 = "/usr/bin/python3";
  SCRIPTS_AUTO_LOOK_PY = "scripts/auto_look.py";
  LOOK_SKILL_FILES = ["SKILL.md", "look-node.md"];
  EMULATOR_DOWNLOAD_TIMEOUT_MS = 600000;
  LOOK_TIMEOUT_MS = 105000;
  PROCESS_GRACE_MS = 15000;
  MAX_LOOK_PICTURES = 4;
  MAX_PICTURE_BYTES = 20971520;
  MAX_LOOK_ERRORS = 10;
  LOOK_ERROR_MAX_CHARS = 700;
  MAX_LOOK_MARKS = 50;
  LOOK_MARK_MAX_CHARS = 64;
  LOOK_OUTLINE_MAX_CHARS = 3000;
  STOPPED_REASON_MAX_CHARS = 500;
  EMULATOR_STOPPED_LINE_PREFIX = "artifact-emulator: stopped:";
  MAX_LOOK_PATH_CHARS = 4096;
  LOOK_FORMAT_VERSION = 1;
  CONTRACT_VERSION_RE = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
  buffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
});
//@ chunk-xzmy9dn4.js:162664-163865 placement
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
  let bootstrapPath = join(artifactEmulatorDir(), SCRIPTS_BOOTSTRAP_PY);
  let autoLookPath = join(artifactEmulatorDir(), SCRIPTS_AUTO_LOOK_PY);
  let lookScripts = [autoLookPath, ...LOOK_SKILL_FILES.map((file) => join(artifactEmulatorDir(), file))];
  let mountProblem = firstInsideMountProblem([bootstrapPath, ...lookScripts]);
  if (mountProblem !== undefined)
    return {
      kind: "failed",
      reason: `mount_${mountProblem}`,
    };
  let bootstrap = await runPythonScript(exec, [bootstrapPath], EMULATOR_DOWNLOAD_TIMEOUT_MS, options.signal, {
    readStderr: true,
  });
  if (bootstrap.timedOut)
    return {
      kind: "failed",
      reason: "download_timed_out",
    };
  if (bootstrap.code !== 0) {
    let stopReason = stoppedReasonFromStderr(bootstrap.stderr);
    return stopReason === undefined
      ? {
          kind: "failed",
          reason: "download_failed",
        }
      : {
          kind: "stopped",
          reason: stopReason,
        };
  }
  let workDir = parseWorkDir(bootstrap.stdout);
  if (workDir === undefined)
    return {
      kind: "failed",
      reason: "download_unreadable",
    };
  let scriptsMountProblem = firstInsideMountProblem(lookScripts);
  if (scriptsMountProblem !== undefined)
    return {
      kind: "failed",
      reason: `mount_${scriptsMountProblem}`,
    };
  let look = await runPythonScript(
    exec,
    [autoLookPath, "look", ...targetArgs],
    LOOK_TIMEOUT_MS,
    options.signal,
    {
      readStderr: false,
    },
  );
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
  for (let [index, picturePath] of parsed.pictures.entries()) {
    let lookPicture = await readLookPicture(picturePath, workDir);
    if (typeof lookPicture === "string")
      return {
        kind: "failed",
        reason: lookPicture,
      };
    let saved = await saveLookPicture(lookPicture, options, index);
    if (saved === undefined)
      return {
        kind: "failed",
        reason: "picture_not_saved",
      };
    pictures.push(saved);
  }
  return {
    kind: "looked",
    pictures,
    marks: parsed.marks,
    errors: parsed.errors,
    outline: parsed.outline,
  };
}
//@ chunk-xzmy9dn4.js:163865-163939 placement
/**
 * 取第一个落在挂载目录内的路径问题。
 */
function firstInsideMountProblem(paths) {
  for (let path of paths) {
    let problem = checkInsideMount(path);
    if (problem !== undefined) return problem;
  }
  return;
}
//@ chunk-xzmy9dn4.js:163939-164298 placement
/**
 * 生成模拟器预览的命令行参数：页面模式为 --source，类型模式为 --type-files/--project/--contract；路径须为绝对路径、长度受限且无控制字符。
 */
function lookTargetArgs(target) {
  let isSafe = (candidate) =>
    typeof candidate === "string" &&
    isAbsolute(candidate) &&
    [...candidate].length > 1 &&
    [...candidate].length <= MAX_LOOK_PATH_CHARS &&
    !/[\u0000-\u001f\u007f]/.test(candidate);
  if (target.kind === "page") return isSafe(target.source) ? ["--source", target.source] : undefined;
  return isSafe(target.typeFiles) &&
    isSafe(target.project) &&
    typeof target.contract === "string" &&
    CONTRACT_VERSION_RE.test(target.contract)
    ? ["--type-files", target.typeFiles, "--project", target.project, "--contract", target.contract]
    : undefined;
}
//@ chunk-xzmy9dn4.js:164298-164969 placement
/**
 * 以 -I 运行系统 python3 脚本（干净环境、无控制终端、cwd 为 /），附加超出 timeout 的宽限截止与中断；返回 {code, stdout, stderr, timedOut}。
 */
async function runPythonScript(exec, args, timeoutMs, signal, { readStderr }) {
  let result = exec(SYSTEM_PYTHON3, ["-I", ...args], {
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
  let timeout;
  let kill;
  let promise = new Promise((resolve) => {
    timeout = setTimeout((stderr) => stderr("deadline"), timeoutMs + PROCESS_GRACE_MS, resolve);
    kill = () => resolve("aborted");
    signal.addEventListener("abort", kill, {
      once: true,
    });
  });
  let errorText;
  try {
    errorText = await Promise.race([result, promise]);
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", kill);
  }
  if (signal.aborted) throw new AbortError();
  if (errorText === "deadline" || errorText === "aborted")
    return {
      code: -1,
      stdout: "",
      stderr: "",
      timedOut: true,
    };
  return {
    code: errorText.code,
    stdout: errorText.stdout,
    stderr: errorText.stderr,
    timedOut: errorText.timedOut === true,
  };
}
//@ chunk-xzmy9dn4.js:164969-165075 placement
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
//@ chunk-xzmy9dn4.js:165075-165209 placement
function parseWorkDir(text) {
  let line = lastNonEmptyLine(text);
  let workDir = line !== null && typeof line === "object" && "workDir" in line ? line.workDir : undefined;
  return typeof workDir === "string" && isAbsolute(workDir) ? workDir : undefined;
}
//@ chunk-xzmy9dn4.js:165209-165711 placement
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
//@ chunk-xzmy9dn4.js:165711-166665 placement
/**
 * 读取 look 产出的截图：必须在工作目录内（realpath 与 /proc fd 双重核对）、普通非空文件、不超过大小上限且为 PNG；返回内容或失败原因码。
 */
async function readLookPicture(picturePath, workDir) {
  let realWorkDir;
  try {
    realWorkDir = await realpath(workDir);
  } catch {
    return "picture_missing";
  }
  if (
    !isAbsolute(picturePath) ||
    [...picturePath].length > MAX_LOOK_PATH_CHARS ||
    /[\u0000-\u001f\u007f]/.test(picturePath) ||
    !(isStrictlyUnder(workDir, picturePath) || isStrictlyUnder(realWorkDir, picturePath))
  )
    return "picture_outside_work_dir";
  let realPicture;
  try {
    realPicture = await realpath(picturePath);
  } catch {
    return "picture_missing";
  }
  if (!isStrictlyUnder(realWorkDir, realPicture)) return "picture_outside_work_dir";
  let bytes;
  try {
    bytes = await open(realPicture, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    let handle = getPlatform();
    if (
      (handle === "linux" || handle === "wsl") &&
      (await readlink(`/proc/self/fd/${bytes.fd}`)) !== realPicture
    )
      return "picture_outside_work_dir";
    let stats = await bytes.stat();
    if (!stats.isFile()) return "picture_not_a_file";
    if (stats.size === 0) return "picture_empty";
    if (stats.size > MAX_PICTURE_BYTES) return "picture_too_large";
    let mediaType = Buffer.alloc(stats.size + 1);
    let imageSize = 0;
    while (imageSize < mediaType.length) {
      let { bytesRead } = await bytes.read(mediaType, imageSize, mediaType.length - imageSize, imageSize);
      if (bytesRead === 0) break;
      imageSize += bytesRead;
    }
    if (imageSize > stats.size) return "picture_too_large";
    let chunk = mediaType.subarray(0, imageSize);
    return chunk.subarray(0, buffer.length).equals(buffer) ? chunk : "picture_not_png";
  } catch (error) {
    return getErrnoCode(error) === "ELOOP" ? "picture_not_a_file" : "picture_missing";
  } finally {
    await bytes?.close().catch(() => {});
  }
}
//@ chunk-xzmy9dn4.js:166665-166858 placement
async function saveLookPicture(buffer, options, index) {
  try {
    let { jpeg } = await encodePreviewJpeg(buffer);
    let filePath = join(options.shotDir, `${options.shotName(index)}.jpg`);
    await ensureToolResultsDir(options.shotDir, undefined);
    await writeToolResultFile(filePath, jpeg);
    return {
      path: filePath,
      base64: jpeg.toString("base64"),
    };
  } catch {
    return;
  }
}
//@ chunk-xzmy9dn4.js:166858-166956 placement
/**
 * 取文本中最后一个非空行。
 */
function lastNonEmptyLine(text) {
  let line = text
    .split(
      `
`,
    )
    .reverse()
    .find((line) => line.trim() !== "");
  return line === undefined ? null : parseJsonOrNull(line);
}
//@ chunk-xzmy9dn4.js:166956-167007 placement
/**
 * 解析 JSON，失败返回 null。
 */
function parseJsonOrNull(line) {
  try {
    return jsonParse(line);
  } catch {
    return null;
  }
}
//@ chunk-xzmy9dn4.js:167007-167081 placement
/**
 * 判断值是否是元素全为字符串的数组。
 */
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
//@ chunk-xzmy9dn4.js:167081-167170 placement
/**
 * 判断路径是否严格位于另一目录之下。
 */
function isStrictlyUnder(picturePath, basePath) {
  let relativePath = relative(picturePath, basePath);
  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}
//@ chunk-xzmy9dn4.js:167170-167254 placement
/**
 * 按码点截断文本并在截断处加省略号。
 */
function truncateCodePointsWithEllipsis(text, maxChars) {
  let chars = [...text];
  return chars.length <= maxChars ? text : `${chars.slice(0, maxChars).join("")}\u2026`;
}
export { runEmulatorLook };
