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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  relative,
  relative as relative_2,
  relative as relative_3,
  sep,
  sep as sep_2,
  sep as sep_3,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  open,
  open as open_2,
  readlink,
} from "fs/promises";
import { constants, constants as constants_2, constants as constants_3 } from "fs";
import { execFileNoThrowWithCwd } from "../../../utils/execFileNoThrow.js";
import {
  LYn,
  SCRIPTS_BOOTSTRAP_PY,
  checkInsideMount,
} from "../../../services/artifactPreview/browserDiscovery.js";
import { subprocessEnv } from "../../../utils/subprocessEnv.js";
import { AbortError, getErrnoCode } from "../../../utils/errors.js";
import { getPlatform } from "../../../utils/platform.js";
import { encodePreviewJpeg } from "../../../utils/imageResizer.js";
import { ensureToolResultsDir, writeToolResultFile } from "../../../utils/toolResultStorage.js";
import { jsonParse } from "../../../utils/slowOperations.js";

/**
 * 查看器仿真"看一眼"的常量：python 路径、需要的技能文件、下载/look 超时与宽限、图片数/大小上限、标记/错误/提纲截断长度、停止前缀、路径长度上限、协议版本、合约版本正则、PNG 文件头。
 */
//@ chunk-8wvtd8sr.js:160191-160482 placement
var SYSTEM_PYTHON3 = "/usr/bin/python3",
  SCRIPTS_AUTO_LOOK_PY = "scripts/auto_look.py",
  LOOK_SKILL_FILES = ["SKILL.md", "look-node.md"],
  EMULATOR_DOWNLOAD_TIMEOUT_MS = 600000,
  LOOK_TIMEOUT_MS = 105000,
  PROCESS_GRACE_MS = 15000,
  MAX_LOOK_PICTURES = 4,
  MAX_PICTURE_BYTES = 20971520,
  MAX_LOOK_ERRORS = 10,
  LOOK_ERROR_MAX_CHARS = 700,
  MAX_LOOK_MARKS = 50,
  LOOK_MARK_MAX_CHARS = 64,
  LOOK_OUTLINE_MAX_CHARS = 3000,
  STOPPED_REASON_MAX_CHARS = 500,
  EMULATOR_STOPPED_LINE_PREFIX = "artifact-emulator: stopped:",
  MAX_LOOK_PATH_CHARS = 4096,
  LOOK_FORMAT_VERSION = 1,
  CONTRACT_VERSION_RE = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/,
  buffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
/**
 * 用 artifact 查看器仿真看一眼页面：先运行 bootstrap 脚本下载查看器（超时/失败/停止分别处理），再运行 auto_look.py look，解析输出，
 * 读取并校验每张 PNG 截图（必须在工作目录内）转成 JPEG 保存。返回 {kind:"looked", pictures, marks, errors, outline} 或 failed/stopped。
 */
//@ chunk-8wvtd8sr.js:160482-161683 placement
async function runEmulatorLook(target, options) {
  let exec = options.exec ?? execFileNoThrowWithCwd,
    targetArgs = lookTargetArgs(target);
  if (targetArgs === void 0) return { kind: "failed", reason: "bad_target" };
  let h = join_4(LYn(), SCRIPTS_BOOTSTRAP_PY),
    y = join_4(LYn(), SCRIPTS_AUTO_LOOK_PY),
    p = [y, ...LOOK_SKILL_FILES.map((V) => join_4(LYn(), V))],
    w = Cf([h, ...p]);
  if (w !== void 0) return { kind: "failed", reason: `mount_${w}` };
  let bootstrap = await runPythonScript(exec, [h], EMULATOR_DOWNLOAD_TIMEOUT_MS, options.signal, {
    readStderr: !0,
  });
  if (bootstrap.timedOut) return { kind: "failed", reason: "download_timed_out" };
  if (bootstrap.code !== 0) {
    let V = stoppedReasonFromStderr(bootstrap.stderr);
    return V === void 0 ? { kind: "failed", reason: "download_failed" } : { kind: "stopped", reason: V };
  }
  let workDir = parseWorkDir(bootstrap.stdout);
  if (workDir === void 0) return { kind: "failed", reason: "download_unreadable" };
  let R = Cf(p);
  if (R !== void 0) return { kind: "failed", reason: `mount_${R}` };
  let look = await runPythonScript(exec, [y, "look", ...targetArgs], LOOK_TIMEOUT_MS, options.signal, {
    readStderr: !1,
  });
  if (look.timedOut) return { kind: "failed", reason: "look_timed_out" };
  if (look.code !== 0) return { kind: "failed", reason: look.code === 2 ? "look_usage" : "look_failed" };
  let parsed = parseLookOutput(look.stdout);
  if (typeof parsed === "string") return { kind: "failed", reason: parsed };
  let pictures = [];
  for (let [V, M] of parsed.pictures.entries()) {
    let x = await readLookPicture(M, workDir);
    if (typeof x === "string") return { kind: "failed", reason: x };
    let q = await saveLookPicture(x, options, V);
    if (q === void 0) return { kind: "failed", reason: "picture_not_saved" };
    pictures.push(q);
  }
  return {
    kind: "looked",
    pictures: pictures,
    marks: parsed.marks,
    errors: parsed.errors,
    outline: parsed.outline,
  };
}
//@ chunk-8wvtd8sr.js:161683-161757 placement
function Cf(e) {
  for (let n of e) {
    let s = checkInsideMount(n);
    if (s !== void 0) return s;
  }
  return;
}
/**
 * 生成模拟器预览的命令行参数：页面模式为 --source，类型模式为 --type-files/--project/--contract；路径须为绝对路径、长度受限且无控制字符。
 */
//@ chunk-8wvtd8sr.js:161757-162116 placement
function lookTargetArgs(e) {
  let n = (s) =>
    typeof s === "string" &&
    isAbsolute_3(s) &&
    [...s].length > 1 &&
    [...s].length <= MAX_LOOK_PATH_CHARS &&
    !/[\u0000-\u001f\u007f]/.test(s);
  if (e.kind === "page") return n(e.source) ? ["--source", e.source] : void 0;
  return n(e.typeFiles) &&
    n(e.project) &&
    typeof e.contract === "string" &&
    CONTRACT_VERSION_RE.test(e.contract)
    ? ["--type-files", e.typeFiles, "--project", e.project, "--contract", e.contract]
    : void 0;
}
/**
 * 以 -I 运行系统 python3 脚本（干净环境、无控制终端、cwd 为 /），附加超出 timeout 的宽限截止与中断；返回 {code, stdout, stderr, timedOut}。
 */
//@ chunk-8wvtd8sr.js:162116-162787 placement
async function runPythonScript(exec, args, timeoutMs, signal, { readStderr: readStderr }) {
  let y = exec(SYSTEM_PYTHON3, ["-I", ...args], {
    abortSignal: signal,
    timeout: timeoutMs,
    cwd: "/",
    preserveOutputOnError: !0,
    env: subprocessEnv(),
    extendEnv: !1,
    stdin: "ignore",
    stderr: readStderr ? "pipe" : "ignore",
    withoutControllingTerminal: !0,
    toolCgroupClass: "shell",
  });
  if (signal.aborted) throw new AbortError();
  let p,
    w,
    promise = new Promise((R) => {
      ((p = setTimeout((T) => T("deadline"), timeoutMs + PROCESS_GRACE_MS, R)),
        (w = () => R("aborted")),
        signal.addEventListener("abort", w, { once: !0 }));
    }),
    S;
  try {
    S = await Promise.race([y, promise]);
  } finally {
    (clearTimeout(p), signal.removeEventListener("abort", w));
  }
  if (signal.aborted) throw new AbortError();
  if (S === "deadline" || S === "aborted") return { code: -1, stdout: "", stderr: "", timedOut: !0 };
  return { code: S.code, stdout: S.stdout, stderr: S.stderr, timedOut: S.timedOut === !0 };
}
//@ chunk-8wvtd8sr.js:162787-162893 placement
function stoppedReasonFromStderr(e) {
  let found = e
    .split(
      `
`,
    )
    .reverse()
    .find((s) => s.startsWith(EMULATOR_STOPPED_LINE_PREFIX));
  return found === void 0 ? void 0 : La(found, STOPPED_REASON_MAX_CHARS);
}
//@ chunk-8wvtd8sr.js:162893-163027 placement
function parseWorkDir(e) {
  let n = yw(e),
    s = n !== null && typeof n === "object" && "workDir" in n ? n.workDir : void 0;
  return typeof s === "string" && isAbsolute_3(s) ? s : void 0;
}
/**
 * 解析 look 的单行 JSON 输出：校验格式版本与字段形状（图片 1–4 张、marks/errors 数组、outline 字符串），截断各项后返回，否则返回失败原因码。
 */
//@ chunk-8wvtd8sr.js:163027-163529 placement
function parseLookOutput(e) {
  let filtered = e
    .split(
      `
`,
    )
    .filter((A) => A.trim() !== "");
  if (filtered.length !== 1) return "look_unreadable";
  let s = Pf(filtered[0]);
  if (s === null || typeof s !== "object" || Array.isArray(s)) return "look_unreadable";
  let { format: format, pictures: pictures, marks: marks, errors: errors, outline: outline } = s;
  if (format !== void 0 && format !== LOOK_FORMAT_VERSION) return "look_version";
  if (
    !Yl(pictures) ||
    pictures.length === 0 ||
    pictures.length > MAX_LOOK_PICTURES ||
    !Yl(marks) ||
    !Yl(errors) ||
    typeof outline !== "string"
  )
    return "look_wrong_shape";
  return {
    pictures: pictures,
    marks: marks.slice(0, MAX_LOOK_MARKS).map((A) => La(A, LOOK_MARK_MAX_CHARS)),
    errors: errors.slice(0, MAX_LOOK_ERRORS).map((A) => La(A, LOOK_ERROR_MAX_CHARS)),
    outline: La(outline, LOOK_OUTLINE_MAX_CHARS),
  };
}
/**
 * 读取 look 产出的截图：必须在工作目录内（realpath 与 /proc fd 双重核对）、普通非空文件、不超过大小上限且为 PNG；返回内容或失败原因码。
 */
//@ chunk-8wvtd8sr.js:163529-164483 placement
async function readLookPicture(picturePath, workDir) {
  let s;
  try {
    s = await realpath_3(workDir);
  } catch {
    return "picture_missing";
  }
  if (
    !isAbsolute_3(picturePath) ||
    [...picturePath].length > MAX_LOOK_PATH_CHARS ||
    /[\u0000-\u001f\u007f]/.test(picturePath) ||
    !(Xl(workDir, picturePath) || Xl(s, picturePath))
  )
    return "picture_outside_work_dir";
  let r;
  try {
    r = await realpath_3(picturePath);
  } catch {
    return "picture_missing";
  }
  if (!Xl(s, r)) return "picture_outside_work_dir";
  let h;
  try {
    h = await open_2(r, constants_2.O_RDONLY | constants_2.O_NOFOLLOW | constants_2.O_NONBLOCK);
    let y = getPlatform();
    if ((y === "linux" || y === "wsl") && (await readlink(`/proc/self/fd/${h.fd}`)) !== r)
      return "picture_outside_work_dir";
    let stats = await h.stat();
    if (!stats.isFile()) return "picture_not_a_file";
    if (stats.size === 0) return "picture_empty";
    if (stats.size > MAX_PICTURE_BYTES) return "picture_too_large";
    let alloc = Buffer.alloc(stats.size + 1),
      A = 0;
    while (A < alloc.length) {
      let { bytesRead: bytesRead } = await h.read(alloc, A, alloc.length - A, A);
      if (bytesRead === 0) break;
      A += bytesRead;
    }
    if (A > stats.size) return "picture_too_large";
    let chunk = alloc.subarray(0, A);
    return chunk.subarray(0, buffer.length).equals(buffer) ? chunk : "picture_not_png";
  } catch (error) {
    return getErrnoCode(error) === "ELOOP" ? "picture_not_a_file" : "picture_missing";
  } finally {
    await h?.close().catch(() => {});
  }
}
//@ chunk-8wvtd8sr.js:164483-164676 placement
async function saveLookPicture(e, n, s) {
  try {
    let { jpeg: jpeg } = await encodePreviewJpeg(e),
      h = join_4(n.shotDir, `${n.shotName(s)}.jpg`);
    return (
      await ensureToolResultsDir(n.shotDir, void 0),
      await writeToolResultFile(h, jpeg),
      { path: h, base64: jpeg.toString("base64") }
    );
  } catch {
    return;
  }
}
//@ chunk-8wvtd8sr.js:164676-164774 placement
function yw(e) {
  let found = e
    .split(
      `
`,
    )
    .reverse()
    .find((s) => s.trim() !== "");
  return found === void 0 ? null : Pf(found);
}
//@ chunk-8wvtd8sr.js:164774-164825 placement
function Pf(e) {
  try {
    return jsonParse(e);
  } catch {
    return null;
  }
}
//@ chunk-8wvtd8sr.js:164825-164899 placement
function Yl(e) {
  return Array.isArray(e) && e.every((n) => typeof n === "string");
}
//@ chunk-8wvtd8sr.js:164899-164988 placement
function Xl(e, n) {
  let s = relative_3(e, n);
  return s !== "" && s !== ".." && !s.startsWith(`..${sep_3}`) && !isAbsolute_3(s);
}
//@ chunk-8wvtd8sr.js:164988-165072 placement
function La(e, n) {
  let s = [...e];
  return s.length <= n ? e : `${s.slice(0, n).join("")}\u2026`;
}

export { runEmulatorLook };
