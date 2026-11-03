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
  READ_FAILURE_REASONS,
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
import { rememberConsentForAsk, hasClassConsent } from "./consentClasses.js";
import { othersReadIsUserOnly } from "./artifactToolGates.js";
import { readArtifactFileViaWebFetch } from "./webfetchRead.js";

//@ chunk-ez320trn.js:6203-6587 placement
/**
 * 判断读取设计系统某动作（read_file/list_files/read_db，含等价简写）是否命中 deny 或 ask 规则。
 */
function hasDesignSystemReadRule(e, t, n, o, r = {}) {
  let s = r.fields ?? (n === "list_files" ? {} : README_READ_FIELDS[n]);
  let toolPermissionContext = getToolPermissionContext(o);
  return (
    n === "read_file"
      ? [
          {
            action: n,
            fields: s,
          },
          {
            action: "read",
            fields: s,
          },
        ]
      : n === "list_files"
        ? [
            {
              action: n,
              fields: s,
            },
            {
              action: "list",
              fields: {
                ...s,
                scope: "files",
              },
            },
          ]
        : [
            {
              action: n,
              fields: s,
            },
          ]
  ).some((a) =>
    ["deny", "ask"].some(
      (c) =>
        artifactCallReadRule(toolPermissionContext, e, t, c, {
          action: a.action,
          fields: a.fields,
          wholeToolAskAnswered: r.pipelineRan === true,
        }) !== null,
    ),
  );
}
//@ chunk-ez320trn.js:6587-6767 placement
/**
 * 判断是否已有读取设计系统内容的同意：开关关闭时按读取规则判定并记住同意；否则按存储或复制来源的同意判断。
 */
function hasDesignSystemReadConsent(parsed, owned, n, context) {
  if (!readKeepsFlagOffAsk(context)) {
    let rulingFor = readRulingFor(parsed, context, n === "store");
    return (
      !rulingFor.ask ||
      (rulingFor.remember === "artifact" &&
        rememberConsentForAsk(rulingFor, parsed.slug, othersReadIsUserOnly(owned, parsed)))
    );
  }
  return n === "store"
    ? owned || attestedDataReadConsented(context, parsed.slug)
    : copySourceConsented(context, parsed, "files", "land");
}
//@ chunk-ez320trn.js:6767-6906 placement
/**
 * 未经询问读取他人的设计系统 artifact 时记录一次外部读取（附带是否已有证明的同意）。
 */
function recordForeignDesignSystemRead(parsed, t, context) {
  if (!readKeepsFlagOffAsk(context) && !hasClassConsent("foreign_read", parsed.slug)) {
    let o =
      t === "read_db"
        ? attestedDataReadConsented(context, parsed.slug)
        : attestedReadConsented(context, parsed.slug);
    recordUnaskedForeignRead(t, parsed.slug, undefined, o || undefined);
  }
}
//@ chunk-ez320trn.js:6906-6936 placement
var EMPTY_GUIDE_DOC = {
  doc: undefined,
  why: undefined,
};
//@ chunk-ez320trn.js:6936-7329 placement
/**
 * 读取设计系统已发布的某个文件作为文档：空文件或缺失视为无文档，其他失败给出原因。
 */
async function readPublishedReadme(e, t, n, o, r) {
  let s = await raceWithDeadline(
    readArtifactFileViaWebFetch(e, t, o, r.credentials, "artifact_design_system_guide_read"),
    o,
    r,
    (a) => ({
      err: READ_FAILURE_REASONS[a],
      late: a,
    }),
  );
  if (s.err === null)
    return s.html.trim() === ""
      ? EMPTY_GUIDE_DOC
      : {
          doc: clipGuideDoc(s.html, t),
          why: undefined,
        };
  if (s.missingFile === true || (n && s.status === 404 && s.errorCode === undefined)) return EMPTY_GUIDE_DOC;
  let d = s.late !== undefined ? READ_FAILURE_REASONS[s.late] : "the content host refused or failed";
  return {
    doc: undefined,
    why: separateReadHint(t, d),
    failed: d,
  };
}
//@ chunk-ez320trn.js:7329-7416 placement
var separateReadHint = (e, t) => `its ${e} could not be fetched (${t}) \u2014 ${READ_SEPARATELY_HINT}`;
var EMPTY_GUIDE_DOCS = {
  root: EMPTY_GUIDE_DOC,
  project: EMPTY_GUIDE_DOC,
};
export {
  readPublishedReadme,
  hasDesignSystemReadRule,
  recordForeignDesignSystemRead,
  hasDesignSystemReadConsent,
  EMPTY_GUIDE_DOC,
  EMPTY_GUIDE_DOCS,
};
