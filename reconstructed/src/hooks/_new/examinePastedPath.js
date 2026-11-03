/**
 * hooks/_new/examinePastedPath.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: sole-consumer-new 4
 */
import {
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
} from "path";
import {
  readPinnedFile,
  iB,
  matchesExpectedSpellings,
  tB,
  Q_,
  T_e,
} from "../../utils/instructionFileAccess.js";
import { expandPath } from "../../utils/path.js";
import { logForDebugging } from "../../utils/debug.js";
import { uniq } from "../../utils/collections.js";
import { isUntrustedAutomountPath } from "../../utils/permissions/filesystem.js";
import { getFsImplementation } from "../../utils/fsOperations.js";

//@ chunk-e6aww6q8.js:1328376-1328638 sole-consumer-new
async function readPastedPathAnchored(e, n) {
  let r = await readPinnedFile(expandPath(e), n, AbortSignal.timeout(iB))((y) => y.handle.readFile()),
    h =
      r === void 0 && (await matchesExpectedSpellings(e, n, AbortSignal.timeout(iB))) ? "absent" : "refused";
  if (r === void 0) logForDebugging(`Pasted path is not read where it lands: ${h}`, { level: "warn" });
  return r ?? h;
}
//@ chunk-e6aww6q8.js:1328671-1328724 sole-consumer-new
var A_e = (e) => (e.split(/[\\/]/).includes("..") ? expandPath(e) : e);
/**
 * 检查粘贴的路径能否安全读取：在可写范围内拒绝，必要时限时检查真实路径。
 */
//@ chunk-e6aww6q8.js:1328724-1329189 sole-consumer-new
async function examinePastedPath(e, n, r) {
  let s = expandPath(e),
    h = n();
  if (h.length === 0 || h.some((ke) => r(e, ke) !== void 0)) return "refused";
  if (tB(s) && !h.some(Q_)) return "unexamined";
  let timeout = AbortSignal.timeout(iB),
    results = await Promise.all(uniq([s, resolve_23(A_e(e))]).map((ke) => T_e(ke, timeout))),
    [G] = results,
    q = n(),
    Z =
      !results.includes(void 0) &&
      q.length > 0 &&
      !q.some((ke) =>
        [e, ...results.flatMap((we) => we ?? [])].some(
          (we) => r(we, ke) !== void 0 || isUntrustedAutomountPath(we, ke.trustedNetworkDirectories),
        ),
      ),
    Se = q.some(Q_) ? G : "unexamined";
  return Z && Se !== void 0 ? Se : "refused";
}
/**
 * 读取粘贴进输入框的文件路径内容：先做权限与不可信自动挂载检查（拒绝时返回 "refused"），本地普通路径直接读字节，否则通过锚定句柄读取。
 */
//@ chunk-e6aww6q8.js:1329189-1329439 sole-consumer-new
async function readPastedPathSafely(e, n, r) {
  let s = await examinePastedPath(e, n, r).catch(() => "refused");
  if (s === "refused")
    return (logForDebugging("Pasted path is not read: the read is refused", { level: "warn" }), "refused");
  return s === "unexamined"
    ? getFsImplementation().readFileBytes(A_e(e))
    : readPastedPathAnchored(e, s).catch(() => "refused");
}

export { readPastedPathSafely };
