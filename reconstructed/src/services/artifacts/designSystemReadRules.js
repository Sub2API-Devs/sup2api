/**
 * services/artifacts/designSystemReadRules.ts
 *
 * 2.1.316 新增：设计系统读取规则
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ez320trn.js (6)
 * attribution: placement 6
 */
import {
  README_READ_FIELDS,
  raceWithDeadline,
  ssn,
  clipGuideDoc,
  READ_SEPARATELY_HINT,
} from "./designSystemGuide.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { artifactCallReadRule } from "../../tools/ArtifactTool/permissions/readRules.js";
import {
  readKeepsFlagOffAsk,
  recordUnaskedForeignRead,
} from "../../tools/ArtifactTool/artifactAccessClasses.js";
import {
  readRulingFor,
  attestedDataReadConsented,
  copySourceConsented,
  attestedReadConsented,
} from "../../tools/ArtifactTool/permissions/readConsent.js";
import { rememberConsentForAsk, b3 } from "./consentClasses.js";
import { othersReadIsUserOnly } from "./artifactToolGates.js";
import { readArtifactFileViaWebFetch } from "./webfetchRead.js";

/**
 * 判断读取设计系统某动作（read_file/list_files/read_db，含等价简写）是否命中 deny 或 ask 规则。
 */
//@ chunk-ez320trn.js:6203-6587 placement
function hasDesignSystemReadRule(e, t, n, o, r = {}) {
  let s = r.fields ?? (n === "list_files" ? {} : README_READ_FIELDS[n]),
    i = getToolPermissionContext(o);
  return (
    n === "read_file"
      ? [
          { action: n, fields: s },
          { action: "read", fields: s },
        ]
      : n === "list_files"
        ? [
            { action: n, fields: s },
            { action: "list", fields: { ...s, scope: "files" } },
          ]
        : [{ action: n, fields: s }]
  ).some((a) =>
    ["deny", "ask"].some(
      (c) =>
        artifactCallReadRule(i, e, t, c, {
          action: a.action,
          fields: a.fields,
          wholeToolAskAnswered: r.pipelineRan === !0,
        }) !== null,
    ),
  );
}
/**
 * 判断是否已有读取设计系统内容的同意：开关关闭时按读取规则判定并记住同意；否则按存储或复制来源的同意判断。
 */
//@ chunk-ez320trn.js:6587-6767 placement
function hasDesignSystemReadConsent(e, t, n, o) {
  if (!readKeepsFlagOffAsk(o)) {
    let r = readRulingFor(e, o, n === "store");
    return (
      !r.ask || (r.remember === "artifact" && rememberConsentForAsk(r, e.slug, othersReadIsUserOnly(t, e)))
    );
  }
  return n === "store"
    ? t || attestedDataReadConsented(o, e.slug)
    : copySourceConsented(o, e, "files", "land");
}
/**
 * 未经询问读取他人的设计系统 artifact 时记录一次外部读取（附带是否已有证明的同意）。
 */
//@ chunk-ez320trn.js:6767-6906 placement
function recordForeignDesignSystemRead(e, t, n) {
  if (!readKeepsFlagOffAsk(n) && !b3("foreign_read", e.slug)) {
    let o = t === "read_db" ? attestedDataReadConsented(n, e.slug) : attestedReadConsented(n, e.slug);
    recordUnaskedForeignRead(t, e.slug, void 0, o || void 0);
  }
}
//@ chunk-ez320trn.js:6906-6936 placement
var S = { doc: void 0, why: void 0 };
/**
 * 读取设计系统已发布的某个文件作为文档：空文件或缺失视为无文档，其他失败给出原因。
 */
//@ chunk-ez320trn.js:6936-7329 placement
async function readPublishedReadme(e, t, n, o, r) {
  let s = await raceWithDeadline(
    readArtifactFileViaWebFetch(e, t, o, r.credentials, "artifact_design_system_guide_read"),
    o,
    r,
    (a) => ({ err: ssn[a], late: a }),
  );
  if (s.err === null) return s.html.trim() === "" ? S : { doc: clipGuideDoc(s.html, t), why: void 0 };
  if (s.missingFile === !0 || (n && s.status === 404 && s.errorCode === void 0)) return S;
  let d = s.late !== void 0 ? ssn[s.late] : "the content host refused or failed";
  return { doc: void 0, why: ee(t, d), failed: d };
}
//@ chunk-ez320trn.js:7329-7416 placement
var ee = (e, t) => `its ${e} could not be fetched (${t}) \u2014 ${READ_SEPARATELY_HINT}`,
  te = { root: S, project: S };

export {
  readPublishedReadme,
  hasDesignSystemReadRule,
  recordForeignDesignSystemRead,
  hasDesignSystemReadConsent,
  S,
  te,
};
