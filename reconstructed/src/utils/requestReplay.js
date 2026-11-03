/**
 * utils/requestReplay.ts
 *
 * 2.1.316 新增。请求重放。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (17)
 * attribution: placement 17
 */
import { FVs, Gbt } from "./transcriptRequestBlobs.js";
import { removeLaptopMemoryText } from "./transcriptWithholding.js";
import { jsonStringify } from "./slowOperations.js";
import { wt } from "../remote/remoteMode.js";
import { getBuiltinPlugin, getBuiltinPlugins } from "../plugins/builtinPlugins.js";
import { CC_PLUGIN_TIPS } from "../services/tips/orgTips.js";
import { isBundledModLive } from "../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";

//@ chunk-18hwfzwa.js:1468823-1468962 placement
var MEMORY_SNAPSHOT_PLACEHOLDER =
    "[Request-replay record: an account-memory snapshot was sent here. It is never saved, so it is not in this record.]",
  MIN_PROBE_LINE_LENGTH = 24,
  MAX_PROBE_LINES = 32;
//@ chunk-18hwfzwa.js:1468962-1468986 placement
function Rkt() {
  FVs(withoutLaptopMemoryText);
}
//@ chunk-18hwfzwa.js:1468986-1470318 placement
function withoutLaptopMemoryText(
  h,
  x,
  D = () => {
    return;
  },
) {
  let sorted = h.filter((ze) => ze.trim() !== "").sort((ze, Xe) => Xe.trim().length - ze.trim().length);
  if (sorted.length === 0) return;
  let ee = removeLaptopMemoryText(sorted, x);
  if (ee.keys === 0)
    throw new Gbt(
      "request-replay: withoutLaptopMemoryText made no search text for the account-memory snapshots shown; this request is not recorded",
    );
  if (ee.hits === 0) {
    assertMemoryRemoved(sorted, x, MAX_PROBE_LINES, D);
    return;
  }
  let ke = (ze) => {
      let Xe = removeLaptopMemoryText(sorted, [{ role: "user", content: ze }]);
      return { remains: Xe.messages[0]?.content, hits: Xe.hits };
    },
    Re = { placeholders: 0 },
    Be = [],
    He = ee.messages.length === x.length,
    mapped = x.map((ze, Xe) => {
      if (ze.role !== "user") return ze;
      let rt;
      if (He) rt = ee.messages[Xe].content;
      else {
        let It = ke(ze.content);
        if (It.hits === 0) return ze;
        rt = It.remains;
      }
      let placeholders = Re.placeholders,
        At = replaceMemoryInContent(ze.content, rt, ke, Re);
      if (Re.placeholders === placeholders) return ze;
      return (Be.push(Xe), { ...ze, content: At });
    });
  if (removeLaptopMemoryText(sorted, mapped).hits !== 0)
    throw new Gbt(
      "request-replay: withoutLaptopMemoryText still finds account-memory snapshot text after the cut; this request is not recorded",
    );
  if (
    (assertMemoryRemoved(sorted, mapped, MAX_PROBE_LINES, D),
    assertMemoryRemoved(
      sorted,
      Be.map((ze) => mapped[ze]),
      Number.POSITIVE_INFINITY,
      D,
    ),
    Re.placeholders === 0 || Re.placeholders > ee.hits)
  )
    throw new Gbt(
      "request-replay: the placeholders do not match the cuts withoutLaptopMemoryText reported; this request is not recorded",
    );
  return {
    messages: mapped,
    cut: { kind: "laptop-account-memory", cuts: ee.hits, placeholders: Re.placeholders, messages: Be },
  };
}
/**
 * 把请求内容中的账号记忆快照替换为占位说明：字符串直接对齐；数组按块处理，文本块与工具结果内容分别与去除记忆后的版本对齐，没有变化时保持原块。
 */
//@ chunk-18hwfzwa.js:1470318-1470954 placement
function replaceMemoryInContent(content, stripped, findMemory, state) {
  if (typeof content === "string")
    return alignStrippedText(content, typeof stripped === "string" ? stripped : "", state);
  let alignedArrays = Array.isArray(stripped) && stripped.length === content.length;
  return content.map((ke, Re) => {
    let Be;
    if (alignedArrays) Be = stripped[Re];
    else {
      let He = findMemory([ke]);
      if (He.hits === 0) return ke;
      Be = Iqo(He.remains);
    }
    if (_kt(ke)) {
      let He = alignStrippedText(ke.text, Be !== void 0 && _kt(Be) ? Be.text : "", state);
      if (He === ke.text) return ke;
      return { ...ke, text: He };
    }
    if (hIe(ke) && ke.content !== void 0) {
      let He = Be !== void 0 && hIe(Be) ? Be.content : void 0;
      if (He === void 0 || He === "") {
        let rt = findMemory(ke.content);
        if (rt.hits === 0) return ke;
        He = rt.remains;
      }
      let placeholders = state.placeholders,
        ze = replaceMemoryInContent(ke.content, He, findMemory, state);
      if (state.placeholders === placeholders) return ke;
      return { ...ke, content: ze };
    }
    return ke;
  });
}
//@ chunk-18hwfzwa.js:1470954-1471006 placement
function Iqo(h) {
  return Array.isArray(h) ? h[0] : void 0;
}
/**
 * 逐段对齐原文与去除记忆后的文本，在被删除处插入占位说明并计数；无法对齐时抛错（该请求不记录）。
 */
//@ chunk-18hwfzwa.js:1471006-1471512 placement
function alignStrippedText(original, stripped, state) {
  if (original === stripped) return original;
  let parts = [],
    originalIndex = 0,
    strippedIndex = 0;
  while (originalIndex < original.length) {
    let Re = strippedIndex;
    while (
      originalIndex < original.length &&
      strippedIndex < stripped.length &&
      original[originalIndex] === stripped[strippedIndex]
    )
      (originalIndex++, strippedIndex++);
    if (
      strippedIndex > Re &&
      originalIndex < original.length &&
      Eqo(original.charCodeAt(originalIndex - 1)) &&
      Dqo(original.charCodeAt(originalIndex))
    )
      (originalIndex--, strippedIndex--);
    if ((parts.push(stripped.slice(Re, strippedIndex)), originalIndex >= original.length)) break;
    if ((parts.push(MEMORY_SNAPSHOT_PLACEHOLDER), state.placeholders++, strippedIndex >= stripped.length))
      break;
    let sliced = stripped.slice(strippedIndex),
      He = original.length - sliced.length,
      We =
        sliced.length < 32 && He > originalIndex && original.endsWith(sliced)
          ? He
          : original.indexOf(sliced.slice(0, 32), originalIndex + 1);
    if (We === -1) throw misalignedReplayError();
    originalIndex = We;
  }
  if (strippedIndex < stripped.length) throw misalignedReplayError();
  return parts.join("");
}
//@ chunk-18hwfzwa.js:1471512-1471554 placement
function Eqo(h) {
  return h >= 55296 && h <= 56319;
}
//@ chunk-18hwfzwa.js:1471554-1471596 placement
function Dqo(h) {
  return h >= 56320 && h <= 57343;
}
//@ chunk-18hwfzwa.js:1471596-1471747 placement
function misalignedReplayError() {
  return new Gbt(
    "request-replay: the text withoutLaptopMemoryText left does not line up with the request; this request is not recorded",
  );
}
/**
 * 确认账号记忆快照的行没有残留在模型轮次之外（除允许的工具结果），否则抛错使该请求不被记录。
 */
//@ chunk-18hwfzwa.js:1471747-1472219 placement
function assertMemoryRemoved(h, x, D, L) {
  let filtered = x.filter((Re) => Re.role !== "assistant"),
    mapped = filtered.map((Re) => jsonStringify(Re));
  for (let Re of h) {
    let sliced = Re.split(
      `
`,
    )
      .map((He) => He.trim())
      .filter((He) => He.length >= MIN_PROBE_LINE_LENGTH)
      .sort((He, We) => We.length - He.length)
      .slice(0, D);
    for (let He of sliced) {
      let sliced = jsonStringify(He).slice(1, -1);
      if (mapped.some((ze) => ze.includes(sliced)) && !isOnlyInToolResults(filtered, mapped, He, sliced, L))
        throw new Gbt(
          "request-replay: a line of a shown account-memory snapshot is still present outside the model's turns; this request is not recorded",
        );
    }
  }
}
/**
 * 判断记忆行的出现是否全部来自对应工具结果的原文（数量一致、未被改写），用于放行。
 */
//@ chunk-18hwfzwa.js:1472219-1472811 placement
function isOnlyInToolResults(messages, serialized, line, escapedLine, findToolResult) {
  let seenToolUseIds = new Set();
  for (let [Re, Be] of messages.entries()) {
    let He = NF(serialized[Re], escapedLine);
    if (He === 0) continue;
    if (!Array.isArray(Be.content)) return !1;
    let We = 0;
    for (let ze of Be.content) {
      let Xe = NF(jsonStringify(ze), escapedLine);
      if (Xe === 0) continue;
      if (!hIe(ze) || typeof ze.tool_use_id !== "string" || seenToolUseIds.has(ze.tool_use_id)) return !1;
      seenToolUseIds.add(ze.tool_use_id);
      let rt = jsonStringify(ze.content ?? "");
      if (rt.includes(MEMORY_SNAPSHOT_PLACEHOLDER)) return !1;
      let kt = findToolResult(ze.tool_use_id),
        At = plainTextOf(ze.content),
        It = kt && plainTextOf(kt.content);
      if (
        kt === void 0 ||
        At === void 0 ||
        It === void 0 ||
        Xe !== NF(rt, escapedLine) ||
        Xe > NF(jsonStringify(kt.content ?? ""), escapedLine) ||
        NF(At, line) > NF(It, line)
      )
        return !1;
      We += Xe;
    }
    if (We !== He) return !1;
  }
  return !0;
}
/**
 * 取出纯文本内容块的文本（只含 text 块且无其他字段），否则返回 undefined。
 */
//@ chunk-18hwfzwa.js:1472811-1473112 placement
function plainTextOf(h) {
  if (h === void 0 || typeof h === "string") return h ?? "";
  if (!Array.isArray(h)) return;
  let x = [];
  for (let D of h) {
    if (typeof D !== "object" || D === null) return;
    let { type: L, text: text, cache_control: cache_control, ...Re } = D;
    if (L !== "text" || typeof text !== "string" || Object.keys(Re).length > 0) return;
    x.push(text);
  }
  return x.join(`
`);
}
//@ chunk-18hwfzwa.js:1473112-1473206 placement
function NF(h, x) {
  let D = 0;
  for (let index = h.indexOf(x); index !== -1; index = h.indexOf(x, index + x.length)) D++;
  return D;
}
//@ chunk-18hwfzwa.js:1473206-1473283 placement
function _kt(h) {
  return h.type === "text" && "text" in h && typeof h.text === "string";
}
//@ chunk-18hwfzwa.js:1473283-1473329 placement
function hIe(h) {
  return h.type === "tool_result";
}
//@ chunk-18hwfzwa.js:1473329-1473426 placement
var Pkt = () =>
  !wt() &&
  getBuiltinPlugin(CC_PLUGIN_TIPS)?.isAvailable?.() === !0 &&
  getBuiltinPlugins().enabled.some((h) => h.name === CC_PLUGIN_TIPS) &&
  isBundledModLive(CC_PLUGIN_TIPS);
//@ chunk-18hwfzwa.js:1473426-1473473 placement
var Nqo = "00000000-0000-0000-0000-000000000000";

export { Nqo, Pkt, Rkt };
