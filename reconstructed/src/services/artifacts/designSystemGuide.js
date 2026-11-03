/**
 * services/artifacts/designSystemGuide.ts
 *
 * 2.1.316 新增：设计系统使用指南提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ez320trn.js (25)
 * attribution: placement 25
 */
import { logError } from "../../utils/log.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import {
  sweepResultLineField,
  canonicalArtifactTargetFor,
  scrubArtifactEnvelopeTags,
  DECISION_SURFACE_BRACKETS_RE,
  sweptArtifactTitle,
} from "../../tools/ArtifactTool/artifactUrls.js";
import { parseArtifactUrl, ARTIFACT_DATA_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { artifactFilesOnForSession } from "../../tools/ArtifactTool/permissions/readConsent.js";
import { warmShareEntry } from "./shareEntryWarm.js";
import { getShareEntry, probedOtherOrg, ownedByUser, hasAutoReactNoticePending } from "./shareEntries.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { warmOwnInstanceType } from "./publishConflicts.js";
import {
  hasDesignSystemReadConsent,
  S,
  te,
  recordForeignDesignSystemRead,
  hasDesignSystemReadRule,
} from "./designSystemReadRules.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getHistory_2 } from "../../history.js";
import { readArtifactDb } from "./artifactDb.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { pickByToolset } from "./artifactToolGates.js";
import { u } from "../../../vendor/zod/v4/classic/schemas.js";
import { designSystemSchema } from "../../tools/ArtifactTool/startKitSchemas.js";
import { Sh } from "../../constants/xml.js";
import { fileInlineEnvelope } from "./readArtifactForModel.js";

//@ chunk-ez320trn.js:1016-1208 placement
var README_MD = "README.md",
  PROJECT_README_MD = "project/README.md",
  K = 12000,
  Y = 7000,
  q = 700,
  ssn = {
    interrupted: "interrupted before it could be read",
    timeout: "reading it took too long",
    failed: "the read failed unexpectedly",
  };
/**
 * 让一个 Promise 与截止信号赛跑：信号先触发时按原因（interrupted/timeout/failed）调用回退函数给出结果；Promise 失败时同样回退，只有 failed 才记录错误。
 */
//@ chunk-ez320trn.js:1208-1576 placement
function raceWithDeadline(promise, deadlineSignal, context, fallback) {
  let r = () =>
    context.abortController.signal.aborted ? "interrupted" : deadlineSignal.aborted ? "timeout" : "failed";
  return new Promise((s) => {
    let i = () => s(fallback(r()));
    if (deadlineSignal.aborted) {
      (promise.catch(() => {}), i());
      return;
    }
    (deadlineSignal.addEventListener("abort", i, { once: !0 }),
      promise.then(
        (d) => {
          (deadlineSignal.removeEventListener("abort", i), s(d));
        },
        (d) => {
          deadlineSignal.removeEventListener("abort", i);
          let a = r();
          if (a === "failed") logError(d);
          s(fallback(a));
        },
      ));
  });
}
/**
 * 从账号的设计系统列表中挑默认项：没有列出任何系统或没有标默认时返回说明与代码（不要猜，让用户选），否则返回其 url 与来源（default/title）。
 */
//@ chunk-ez320trn.js:1576-2189 placement
function pickDefaultDesignSystem(systems, truncated) {
  let found = systems.find((o) => o.default !== void 0);
  if (found === void 0 || found.default === void 0)
    return systems.length === 0
      ? {
          url: void 0,
          why: "the account lists no design systems \u2014 build without one unless the user names one",
          code: "default_none_listed",
        }
      : {
          url: void 0,
          why: `no default is set among the ${systems.length}${truncated ? " or more" : ""} design systems the account lists \u2014 name the listed systems to the user and ask which to use before creating, then read their pick with its own call; with nobody to ask, build without one; they are ${listDesignSystemNames(systems)}`,
          code: "default_unmarked",
        };
  return { url: found.url, source: { default: found.default, title: found.title } };
}
//@ chunk-ez320trn.js:2189-2382 placement
function listDesignSystemNames(e) {
  let mapped = e
    .slice(0, 3)
    .map(
      (o) =>
        `${jsonStringify(sanitizeDisplayTitle(sweepResultLineField(o.title, 40)) ?? "Untitled")} ${canonicalArtifactTargetFor(o.url, "(unrecognized address)")}`,
    );
  return e.length > 3 ? `${mapped.join(", ")}, and ${e.length - 3} more` : mapped.join(", ");
}
/**
 * 检查某设计系统 artifact 能否读取作为引导：必须是本会话 claude.ai 的 artifact 链接，文件/存储至少有一种可用且未被规则全挡；预热共享条目，排除其他组织与有待处理通知的情况；返回所有权与文件/存储各自是否可读。
 */
//@ chunk-ez320trn.js:2382-3426 placement
async function checkDesignSystemReadable(url, signal, context, storeEnabled, pipelineRan, feature) {
  let parsed = parseArtifactUrl(url);
  if (parsed === null || parsed.env !== claudeAiEnvironment())
    return { ok: !1, why: "it is not an Artifact URL of this session's claude.ai", code: "not_a_link" };
  let a = [...(artifactFilesOnForSession() ? ["files"] : []), ...(storeEnabled ? ["store"] : [])];
  if (a.length === 0) return { ok: !1, ...describeDesignSystemUnreadable("off", "off") };
  if (a.every((b) => isDesignSystemReadRuled(b, parsed, url, context, pipelineRan)))
    return { ok: !1, why: RULE_GOVERNS_READ_HINT, code: "rule" };
  let c = { signal: signal, credentials: context.credentials },
    probeFailure = await raceWithDeadline(
      warmShareEntry(
        parsed,
        { toolUseId: context.toolUseId, abortController: { signal: signal }, ...c },
        feature,
      ).then(() => {
        return;
      }),
      signal,
      context,
      (b) => b,
    );
  if (probeFailure !== void 0)
    return {
      ok: !1,
      why: `${ssn[probeFailure]} \u2014 read it with its own call`,
      code: `probe_${probeFailure}`,
    };
  let w = getShareEntry(parsed.slug);
  if (probedOtherOrg(w))
    return {
      ok: !1,
      why: "it is in another of the user's organizations, which this login cannot read \u2014 say so rather than guess its values",
      code: "other_org",
    };
  let owned = ownedByUser(w);
  if (hasAutoReactNoticePending(parsed.slug) && !isDelegatedObservationContext(context.agentContext))
    return { ok: !1, why: NEEDS_APPROVAL_HINT, code: "notice_pending" };
  await raceWithDeadline(warmOwnInstanceType(parsed, c), signal, context, () => {
    return;
  });
  let h = isDesignSystemReadRuled("files", parsed, url, context, pipelineRan),
    A = isDesignSystemReadRuled("store", parsed, url, context, pipelineRan);
  return {
    ok: !0,
    parsed: parsed,
    owned: owned,
    filesRuled: h,
    storeRuled: A,
    filesOk: artifactFilesOnForSession() && !h && hasDesignSystemReadConsent(parsed, owned, "files", context),
    storeOk: storeEnabled && !A && hasDesignSystemReadConsent(parsed, owned, "store", context),
  };
}
/**
 * 判断能否读取设计系统 artifact 的文件：没有挂起的自动响应提示（或处于委派观察上下文）、未被规则拦截且已有读取同意。
 */
//@ chunk-ez320trn.js:3426-3541 placement
function canReadDesignSystemFiles(e, t, n, o) {
  return (
    !(hasAutoReactNoticePending(e.slug) && !isDelegatedObservationContext(n.agentContext)) &&
    !isDesignSystemReadRuled("files", e, t, n, o) &&
    hasDesignSystemReadConsent(e, ownedByUser(getShareEntry(e.slug)), "files", n)
  );
}
/**
 * 读取默认设计系统的 README 作为引导文档：先检查可读性，再并行读取存储里的 README 与发布文件（project/README.md 或 README.md），选出可用文档；读取他人 artifact 时记录外部读取；返回 design_system 记录（含不可用原因）。
 */
//@ chunk-ez320trn.js:3541-4662 placement
async function readDesignSystemGuide(url, source, signal, context, storeEnabled, pipelineRan) {
  let i = { default: source.default, title: source.title },
    unavailable = (R, O) => (
      logFeatureSad("artifact_design_system_guide", O),
      { design_system: { url: url, ...i, unavailable: R } }
    ),
    check = await checkDesignSystemReadable(
      url,
      signal,
      context,
      storeEnabled,
      pipelineRan,
      "design_system_guide",
    );
  if (!check.ok) return unavailable(check.why, check.code);
  let {
      parsed: parsed,
      owned: owned,
      filesRuled: filesRuled,
      storeRuled: storeRuled,
      filesOk: filesOk,
      storeOk: storeOk,
    } = check,
    filesState = G(artifactFilesOnForSession(), filesRuled, filesOk),
    storeState = G(storeEnabled, storeRuled, storeOk);
  if (!filesOk && !storeOk) {
    let R = describeDesignSystemUnreadable(filesState, storeState);
    return unavailable(R.why, R.code);
  }
  let [storeRead, filesRead] = await Promise.all([
      storeOk ? readStoreReadme(parsed, signal, context) : S,
      filesOk ? getHistory_2(parsed, signal, context) : te,
    ]),
    v = pickReadmeResult(filesRead),
    isProjectReadme = v.doc?.path === PROJECT_README_MD,
    fromStore = !isProjectReadme && storeRead.doc !== void 0,
    doc = isProjectReadme ? v.doc : (storeRead.doc ?? v.doc);
  if (doc === void 0) {
    let R = storeRead.why ?? v.why,
      O =
        storeRead.moved === !0 && filesState === "off"
          ? MOVED_TO_FILES_RESULT
          : describeDesignSystemUnreadable(filesState, storeState);
    return R === void 0 ? unavailable(O.why, O.code) : unavailable(R, "nothing_read");
  }
  if (!owned) recordForeignDesignSystemRead(parsed, fromStore ? "read_db" : "read_file", context);
  logFeatureOk("artifact_design_system_guide", { store: fromStore, project: isProjectReadme, owned: owned });
  let j =
    fromStore || isProjectReadme
      ? void 0
      : storeState === "ruled"
        ? `a permission rule governs reading its store, ${PUBLISHED_README_NOTE}`
        : storeState === "unconsented"
          ? `its store needs approval to read here, ${PUBLISHED_README_NOTE}`
          : storeRead.unchecked === !0
            ? `its store could not be checked, ${PUBLISHED_README_NOTE}`
            : storeRead.keptButUnread === !0
              ? `its store's README is empty or could not be read here, ${PUBLISHED_README_NOTE}`
              : void 0;
  return {
    design_system: {
      url: url,
      ...i,
      ...(fromStore && { store: !0 }),
      docs: [doc],
      ...(j !== void 0 && { unavailable: j }),
    },
  };
}
/**
 * 设计系统读取不可用时的几种说明文字（单独读取、规则约束、只能用已发布 README、已迁到自有文件）。
 */
//@ chunk-ez320trn.js:4662-4989 placement
var READ_SEPARATELY_HINT = "read it with its own call, which may ask the user",
  RULE_GOVERNS_READ_HINT =
    "a permission rule governs reading it \u2014 read it with its own call and that rule decides",
  PUBLISHED_README_NOTE = "so this is its published README, which may be older than the one in its store",
  MOVED_TO_FILES_RESULT = {
    why: "it moved to its own files, which this session does not serve",
    code: "nothing_read",
  };
//@ chunk-ez320trn.js:4989-5211 placement
function isDesignSystemReadRuled(e, t, n, o, r) {
  return e === "files"
    ? hasDesignSystemReadRule(t, n, "read_file", o, { pipelineRan: r }) ||
        hasDesignSystemReadRule(t, n, "read_file", o, { pipelineRan: r, fields: { path: PROJECT_README_MD } })
    : hasDesignSystemReadRule(t, n, "read_db", o, { pipelineRan: r }) ||
        hasDesignSystemReadRule(t, n, "read_db", o, { pipelineRan: r, fields: DS_META_DOC_FIELDS });
}
//@ chunk-ez320trn.js:5211-5277 placement
function G(e, t, n) {
  return !e ? "off" : t ? "ruled" : n ? "read" : "unconsented";
}
/**
 * 根据文件与存储的可读状态（off/read/unconsented/ruled）给出设计系统读不到的原因与代码。
 */
//@ chunk-ez320trn.js:5277-5982 placement
function describeDesignSystemUnreadable(e, t) {
  let filtered = [e, t].filter((o) => o !== "read" && o !== "off");
  if (e !== "read" && t !== "read" && filtered.length === 0)
    return { why: "this session serves neither its files nor its store", code: "not_served" };
  if (filtered.includes("unconsented"))
    return e === "read" || t === "read"
      ? {
          why: `its ${e === "unconsented" ? "files" : "store"} cannot be read here without the user's approval \u2014 ${READ_SEPARATELY_HINT}`,
          code: "nothing_read",
        }
      : { why: NEEDS_APPROVAL_HINT, code: "not_consented" };
  if (filtered.includes("ruled")) return { why: RULE_GOVERNS_READ_HINT, code: "rule" };
  return e === "off"
    ? {
        why: "its store holds no README for it, and this session does not serve its files",
        code: "nothing_read",
      }
    : {
        why:
          t === "off"
            ? "it has no README to read here (this session does not read stores)"
            : "it has no README to read",
        code: "nothing_read",
      };
}
//@ chunk-ez320trn.js:5982-6203 placement
var NEEDS_APPROVAL_HINT = `reading it here first needs the user's approval, which this call does not ask for \u2014 ${READ_SEPARATELY_HINT}`,
  DS_META_DOC_FIELDS = { db_op: "get", collection: "ds", doc_id: "meta" },
  README_READ_FIELDS = {
    read_file: { path: README_MD },
    read_db: { db_op: "get", collection: "files", doc_id: README_MD },
  };
/**
 * 在项目 README 与根 README 的读取结果中选择：有内容的优先项目级；两者都失败时合并失败原因；否则返回带说明的那个。
 */
//@ chunk-ez320trn.js:7526-7928 placement
function pickReadmeResult({ project: project, root: root }) {
  if (project.doc !== void 0 || root.doc !== void 0) return project.doc !== void 0 ? project : root;
  if (project.failed !== void 0 && root.failed !== void 0)
    return {
      doc: void 0,
      why: `its ${project.failed === root.failed ? `${PROJECT_README_MD} and ${README_MD} could not be fetched (${root.failed})` : `${PROJECT_README_MD} (${project.failed}) and ${README_MD} (${root.failed}) could not be fetched`} \u2014 read the design system with its own call, which may ask the user`,
    };
  return project.why !== void 0 ? project : root;
}
//@ chunk-ez320trn.js:7928-8022 placement
var re = new Set(["store_unavailable", "busy", "quota_or_rate", "quota_exceeded", "upstream_auth"]);
//@ chunk-ez320trn.js:8022-8223 placement
function readDesignSystemDoc(e, t, n, o, r) {
  return raceWithDeadline(
    readArtifactDb(
      r.session.host,
      { slug: e.slug, op: "get", collection: t, docId: n },
      o,
      r.storageV5,
      r.credentials,
    ),
    o,
    r,
    (s) => ({ kind: "error", code: "store_unavailable", message: ssn[s], reason: s }),
  );
}
/**
 * 从设计系统的存储读取 meta 与 files/README.md：meta 读失败时给出原因（部分错误标记未核实），已迁移到文件时标 moved，README 为空或是文件形式时说明原因。
 */
//@ chunk-ez320trn.js:8223-8992 placement
async function readStoreReadme(parsed, signal, context) {
  let [metaResult, readmeResult] = await Promise.all([
    readDesignSystemDoc(parsed, DS_META_DOC_FIELDS.collection, DS_META_DOC_FIELDS.doc_id, signal, context),
    readDesignSystemDoc(parsed, "files", README_MD, signal, context),
  ]);
  if (metaResult.kind !== "ok")
    return metaResult.kind !== "error" || metaResult.code === "not_declared"
      ? { doc: void 0, why: void 0 }
      : {
          doc: void 0,
          why: `its store could not be read (${metaResult.message}) \u2014 ${READ_SEPARATELY_HINT}`,
          ...(re.has(metaResult.code) && { unchecked: !0 }),
        };
  if (isMovedMarker(metaResult.docs[0]?.data)) return { doc: void 0, why: void 0, moved: !0 };
  let readmeText = getInlineDocText(readmeResult);
  return {
    ...(readmeText === void 0 && readmeResult.kind !== "not_found" && { keptButUnread: !0 }),
    doc: readmeText === void 0 ? void 0 : clipGuideDoc(readmeText),
    why:
      readmeResult.kind === "error"
        ? `its store could not be read (${readmeResult.message}) \u2014 ${READ_SEPARATELY_HINT}`
        : readmeResult.kind === "ok" && readmeText === void 0
          ? typeof readmeResult.docs[0]?.data.data === "string"
            ? "its README.md in the store is empty"
            : "its README.md is a stored file rather than an inline document \u2014 read it from the system with its own call"
          : void 0,
  };
}
//@ chunk-ez320trn.js:8992-9097 placement
function isMovedMarker(e) {
  let t = isPlainObject(e) ? e.movedTo : void 0;
  return isPlainObject(t) && typeof t.path === "string" && typeof t.at === "string";
}
//@ chunk-ez320trn.js:9097-9214 placement
function getInlineDocText(e) {
  if (e.kind !== "ok") return;
  let t = e.docs[0]?.data.data;
  return typeof t === "string" && t.trim() !== "" ? t : void 0;
}
/**
 * 清洗设计系统指南文本中的信封标签，超过字符上限时截断并标记 clipped。
 */
//@ chunk-ez320trn.js:9214-9349 placement
function clipGuideText(e, t, n) {
  let o = scrubArtifactEnvelopeTags(t),
    r = Array.from(o).length;
  return r > n
    ? { path: e, text: scrubArtifactEnvelopeTags(truncateCodePoints(o, n)), chars: r, clipped: !0 }
    : { path: e, text: o, chars: r };
}
//@ chunk-ez320trn.js:9349-9494 placement
var GENERATED_SECTION_MARKERS = [
    `
## Consuming this system (generated`,
    `
## Index (generated`,
  ],
  CLIPPED_GUIDE_MARKER = "[\u2026authored guide clipped here; its generated tail follows\u2026]";
/**
 * 把设计系统指南裁到长度上限：超长时保留开头的手写部分并接上末尾"自动生成"小节（中间放裁剪标记），找不到生成小节时直接截断。
 */
//@ chunk-ez320trn.js:9494-9827 placement
function clipGuideDoc(e, t = README_MD) {
  let n = K,
    o = scrubArtifactEnvelopeTags(e),
    r = Array.from(o).length;
  if (r <= n) return { path: t, text: o, chars: r };
  let s = GENERATED_SECTION_MARKERS.map((c) => o.lastIndexOf(c)).find((c) => c !== -1) ?? -1;
  if (s === -1) return clipGuideText(t, o, n);
  let i = truncateCodePoints(o.slice(s), Y),
    d = n - Array.from(i).length - Array.from(CLIPPED_GUIDE_MARKER).length - 2,
    a = truncateCodePoints(o.slice(0, s), d);
  return {
    path: t,
    text: scrubArtifactEnvelopeTags(`${a}
${CLIPPED_GUIDE_MARKER}
${i}`),
    chars: r,
    clipped: !0,
  };
}
/**
 * 生成"其他卡片未附上，需要时如何读取"的说明，按数据存储方式与当前工具集给出读取方法。
 */
//@ chunk-ez320trn.js:9827-10947 placement
function describeOtherCards(e, t, n) {
  if (n)
    return `Its other cards are not attached: read one when you need it with ${pickByToolset('action "read_file"', () => 'action "read"')}, \`url\`: ${jsonStringify(e)}, and a \`path\`: "project/api/tokens.md" (palette, type, fonts); "project/tokens.json" (exact token values); or, where the README's index is shown, a card it names, at "project/" followed by the path the index gives.`;
  return t
    ? `Its other cards are not attached: read one when you need it with ${pickByToolset('action "read_db" and `db_op`: "get"', () => `the ${ARTIFACT_DATA_TOOL_NAME} tool, action "get"`)}, \`url\`: ${jsonStringify(e)}, and a \`collection\` and \`doc_id\`: "api" and "tokens.md" (palette, type, fonts); "ds" and "tokens" (exact token values); "ds" and "meta" (the system's record). Where the README's index is shown, read a card it names by the collection and doc id the index gives.`
    : `Its other cards are not attached: read one when you need it with ${pickByToolset('action "read_file"', () => 'action "read"')}, \`url\`: ${jsonStringify(e)}, and a \`path\`: "api/tokens.md" (palette, type, fonts); "tokens.json" (exact token values); or, where the README's index is shown, a card it names, by its path there.`;
}
/**
 * 把文本截断到上限并清洗信封标签、方括号与多余空白，用作决策面中的括号内文本。
 */
//@ chunk-ez320trn.js:10947-11095 placement
function sanitizeBracketText(e, t) {
  let n = Array.from(e).length > t;
  return (
    scrubArtifactEnvelopeTags(truncateCodePoints(e, t))
      .replace(DECISION_SURFACE_BRACKETS_RE, " ")
      .replace(/[[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim() + (n ? " \u2026" : "")
  );
}
/**
 * 若记录里有带正文的 docs，返回一个把各 doc 的 text 清空的副本（用于存储/压缩）；否则 undefined。
 */
//@ chunk-ez320trn.js:11095-11349 placement
function stripDocTexts(e) {
  if (
    e === null ||
    typeof e !== "object" ||
    !("docs" in e) ||
    !Array.isArray(e.docs) ||
    !e.docs.some((doc) => doc !== null && typeof doc === "object" && "text" in doc && doc.text !== "")
  )
    return;
  return {
    ...e,
    docs: e.docs.map((doc) => (doc !== null && typeof doc === "object" ? { ...doc, text: "" } : doc)),
  };
}
/**
 * 把 design_system 记录渲染成附加到提示词里的文本：未找到默认或 README 时给出"未附加"及原因；否则写出系统链接、标题、用户/组织默认，附上（必要时裁剪的）README 正文与"不要再次获取"说明。
 */
//@ chunk-ez320trn.js:11349-12792 placement
function renderDesignSystemAttachment(record) {
  let safeParse = u(designSystemSchema()).safeParse({ design_system: record }),
    designSystem = safeParse.success ? safeParse.data.design_system : void 0;
  if (designSystem === void 0) return { text: "", attached: !1 };
  let unavailable =
    designSystem.unavailable === void 0 ? void 0 : sanitizeBracketText(designSystem.unavailable, q);
  if (typeof designSystem.url !== "string")
    return {
      text: `

[Design system not attached \u2014 ${unavailable ?? "no default could be found"}.]`,
      attached: !1,
    };
  let r = canonicalArtifactTargetFor(designSystem.url, "(unrecognized address)"),
    s =
      typeof designSystem.title === "string"
        ? ` ${jsonStringify(sanitizeBracketText(sweptArtifactTitle(sanitizeDisplayTitle(sweepResultLineField(designSystem.title, 200)) ?? ""), 200) || "Untitled")}`
        : "",
    i = `${r}${s}, the ${designSystem.default === "user" ? "user's" : "organization's"} default design system`,
    readmeDoc = (designSystem.docs ?? []).find(
      (h) => (h.path === README_MD || h.path === PROJECT_README_MD) && h.text !== "",
    );
  if (readmeDoc === void 0)
    return {
      text: `

[Design system not attached (${i}) \u2014 ${unavailable ?? "its README is not kept in this record; read it with its own call if you need it"}.]`,
      attached: !1,
    };
  let clipped = clipGuideDoc(readmeDoc.text),
    c = clipped.clipped === !0 || readmeDoc.clipped === !0,
    max = Math.max(clipped.chars, readmeDoc.chars),
    w =
      " This is the standing choice; ignore it if the user or the session named another, or declined one, in this conversation.",
    y = c
      ? `
[\u2026clipped at ${Array.from(clipped.text).length} of ${max} characters; read the whole file from the design system if you need the rest]`
      : "";
  return {
    text: `

${Sh}
Design system ${i}.${w} Its ${readmeDoc.path} (${designSystem.store === !0 ? "a document of its store" : "a published file"}) follows \u2014 do not fetch it again${c ? " unless you need the clipped remainder" : ""}.${unavailable !== void 0 ? ` (${unavailable}.)` : ""} ${describeOtherCards(r, designSystem.store === !0, readmeDoc.path === PROJECT_README_MD)}

${readmeDoc.path}:
${fileInlineEnvelope(clipped.text + y)}`,
    attached: !0,
  };
}

export {
  README_MD,
  PROJECT_README_MD,
  pickDefaultDesignSystem,
  readDesignSystemGuide,
  sanitizeBracketText,
  renderDesignSystemAttachment,
  stripDocTexts,
  raceWithDeadline,
  ssn,
  clipGuideText,
  checkDesignSystemReadable,
  canReadDesignSystemFiles,
  README_READ_FIELDS,
  clipGuideDoc,
  READ_SEPARATELY_HINT,
};
