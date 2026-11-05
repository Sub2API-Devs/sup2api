/**
 * services/artifacts/designSystemGuide.ts
 *
 * 2.1.316 新增：设计系统使用指南提示词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1xrdahqv.js (25)
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
  EMPTY_GUIDE_DOC,
  EMPTY_GUIDE_DOCS,
  recordForeignDesignSystemRead,
  hasDesignSystemReadRule,
} from "./designSystemReadRules.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getHistory_2 } from "../../history.js";
import { readArtifactDb } from "./artifactDb.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { pickByToolset } from "./artifactToolGates.js";
import { objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { designSystemSchema } from "../../tools/ArtifactTool/startKitSchemas.js";
import { ARTIFACT_CONTENT_AUTHORED_TAG } from "../../constants/xml.js";
import { fileInlineEnvelope } from "./readArtifactForModel.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1xrdahqv.js:1016-1208 placement
/**
 * 设计系统指南相关常量：README 路径、读取上限（12000/7000/700 字符）与读取失败的三种原因文案。
 */
var README_MD = "README.md";
var PROJECT_README_MD = "project/README.md";
var MAX_GUIDE_DOC_CHARS = 12000;
var MAX_GUIDE_PROJECT_CHARS = 7000;
var MAX_UNAVAILABLE_NOTE_CHARS = 700;
var READ_FAILURE_REASONS = {
  interrupted: "interrupted before it could be read",
  timeout: "reading it took too long",
  failed: "the read failed unexpectedly",
};
//@ chunk-1xrdahqv.js:1208-1576 placement
/**
 * 让一个 Promise 与截止信号赛跑：信号先触发时按原因（interrupted/timeout/failed）调用回退函数给出结果；Promise 失败时同样回退，只有 failed 才记录错误。
 */
function raceWithDeadline(promise, deadlineSignal, context, fallback) {
  let failureKind = () =>
    context.abortController.signal.aborted ? "interrupted" : deadlineSignal.aborted ? "timeout" : "failed";
  return new Promise((resolve) => {
    let settleOnAbort = () => resolve(fallback(failureKind()));
    if (deadlineSignal.aborted) {
      promise.catch(() => {});
      settleOnAbort();
      return;
    }
    deadlineSignal.addEventListener("abort", settleOnAbort, {
      once: true,
    });
    promise.then(
      (value) => {
        deadlineSignal.removeEventListener("abort", settleOnAbort);
        resolve(value);
      },
      (error) => {
        deadlineSignal.removeEventListener("abort", settleOnAbort);
        let kind = failureKind();
        if (kind === "failed") logError(error);
        resolve(fallback(kind));
      },
    );
  });
}
//@ chunk-1xrdahqv.js:1576-2189 placement
/**
 * 从账号的设计系统列表中挑默认项：没有列出任何系统或没有标默认时返回说明与代码（不要猜，让用户选），否则返回其 url 与来源（default/title）。
 */
function pickDefaultDesignSystem(systems, truncated) {
  let found = systems.find((system) => system.default !== undefined);
  if (found === undefined || found.default === undefined)
    return systems.length === 0
      ? {
          url: undefined,
          why: "the account lists no design systems \u2014 build without one unless the user names one",
          code: "default_none_listed",
        }
      : {
          url: undefined,
          why: `no default is set among the ${systems.length}${truncated ? " or more" : ""} design systems the account lists \u2014 name the listed systems to the user and ask which to use before creating, then read their pick with its own call; with nobody to ask, build without one; they are ${listDesignSystemNames(systems)}`,
          code: "default_unmarked",
        };
  return {
    url: found.url,
    source: {
      default: found.default,
      title: found.title,
    },
  };
}
//@ chunk-1xrdahqv.js:2189-2382 placement
function listDesignSystemNames(systems) {
  let mapped = systems
    .slice(0, 3)
    .map(
      (entry) =>
        `${jsonStringify(sanitizeDisplayTitle(sweepResultLineField(entry.title, 40)) ?? "Untitled")} ${canonicalArtifactTargetFor(entry.url, "(unrecognized address)")}`,
    );
  return systems.length > 3 ? `${mapped.join(", ")}, and ${systems.length - 3} more` : mapped.join(", ");
}
//@ chunk-1xrdahqv.js:2382-3426 placement
/**
 * 检查某设计系统 artifact 能否读取作为引导：必须是本会话 claude.ai 的 artifact 链接，文件/存储至少有一种可用且未被规则全挡；预热共享条目，排除其他组织与有待处理通知的情况；返回所有权与文件/存储各自是否可读。
 */
async function checkDesignSystemReadable(url, signal, context, storeEnabled, pipelineRan, feature) {
  let parsed = parseArtifactUrl(url);
  if (parsed === null || parsed.env !== claudeAiEnvironment())
    return {
      ok: false,
      why: "it is not an Artifact URL of this session's claude.ai",
      code: "not_a_link",
    };
  let surfaces = [...(artifactFilesOnForSession() ? ["files"] : []), ...(storeEnabled ? ["store"] : [])];
  if (surfaces.length === 0)
    return {
      ok: false,
      ...describeDesignSystemUnreadable("off", "off"),
    };
  if (surfaces.every((surface) => isDesignSystemReadRuled(surface, parsed, url, context, pipelineRan)))
    return {
      ok: false,
      why: RULE_GOVERNS_READ_HINT,
      code: "rule",
    };
  let sharedContext = {
    signal,
    credentials: context.credentials,
  };
  let probeFailure = await raceWithDeadline(
    warmShareEntry(
      parsed,
      {
        toolUseId: context.toolUseId,
        abortController: {
          signal,
        },
        ...sharedContext,
      },
      feature,
    ).then(() => {
      return;
    }),
    signal,
    context,
    (kind) => kind,
  );
  if (probeFailure !== undefined)
    return {
      ok: false,
      why: `${READ_FAILURE_REASONS[probeFailure]} \u2014 read it with its own call`,
      code: `probe_${probeFailure}`,
    };
  let bootEntry = getShareEntry(parsed.slug);
  if (probedOtherOrg(bootEntry))
    return {
      ok: false,
      why: "it is in another of the user's organizations, which this login cannot read \u2014 say so rather than guess its values",
      code: "other_org",
    };
  let owned = ownedByUser(bootEntry);
  if (hasAutoReactNoticePending(parsed.slug) && !isDelegatedObservationContext(context.agentContext))
    return {
      ok: false,
      why: NEEDS_APPROVAL_HINT,
      code: "notice_pending",
    };
  await raceWithDeadline(warmOwnInstanceType(parsed, sharedContext), signal, context, () => {
    return;
  });
  let filesRuled = isDesignSystemReadRuled("files", parsed, url, context, pipelineRan);
  let storeRuled = isDesignSystemReadRuled("store", parsed, url, context, pipelineRan);
  return {
    ok: true,
    parsed,
    owned,
    filesRuled,
    storeRuled,
    filesOk:
      artifactFilesOnForSession() &&
      !filesRuled &&
      hasDesignSystemReadConsent(parsed, owned, "files", context),
    storeOk: storeEnabled && !storeRuled && hasDesignSystemReadConsent(parsed, owned, "store", context),
  };
}
//@ chunk-1xrdahqv.js:3426-3541 placement
/**
 * 判断能否读取设计系统 artifact 的文件：没有挂起的自动响应提示（或处于委派观察上下文）、未被规则拦截且已有读取同意。
 */
function canReadDesignSystemFiles(parsed, url, context, pipelineRan) {
  return (
    !(hasAutoReactNoticePending(parsed.slug) && !isDelegatedObservationContext(context.agentContext)) &&
    !isDesignSystemReadRuled("files", parsed, url, context, pipelineRan) &&
    hasDesignSystemReadConsent(parsed, ownedByUser(getShareEntry(parsed.slug)), "files", context)
  );
}
//@ chunk-1xrdahqv.js:3541-4662 placement
/**
 * 读取默认设计系统的 README 作为引导文档：先检查可读性，再并行读取存储里的 README 与发布文件（project/README.md 或 README.md），选出可用文档；读取他人 artifact 时记录外部读取；返回 design_system 记录（含不可用原因）。
 */
async function readDesignSystemGuide(url, source, signal, context, storeEnabled, pipelineRan) {
  let identity = {
    default: source.default,
    title: source.title,
  };
  let unavailable = (unavailable, code) => {
    logFeatureSad("artifact_design_system_guide", code);
    return {
      design_system: {
        url,
        ...identity,
        unavailable,
      },
    };
  };
  let check = await checkDesignSystemReadable(
    url,
    signal,
    context,
    storeEnabled,
    pipelineRan,
    "design_system_guide",
  );
  if (!check.ok) return unavailable(check.why, check.code);
  let { parsed, owned, filesRuled, storeRuled, filesOk, storeOk } = check;
  let filesState = readState(artifactFilesOnForSession(), filesRuled, filesOk);
  let storeState = readState(storeEnabled, storeRuled, storeOk);
  if (!filesOk && !storeOk) {
    let unreadable = describeDesignSystemUnreadable(filesState, storeState);
    return unavailable(unreadable.why, unreadable.code);
  }
  let [storeRead, filesRead] = await Promise.all([
    storeOk ? readStoreReadme(parsed, signal, context) : EMPTY_GUIDE_DOC,
    filesOk ? getHistory_2(parsed, signal, context) : EMPTY_GUIDE_DOCS,
  ]);
  let filesReadme = pickReadmeResult(filesRead);
  let isProjectReadme = filesReadme.doc?.path === PROJECT_README_MD;
  let fromStore = !isProjectReadme && storeRead.doc !== undefined;
  let doc = isProjectReadme ? filesReadme.doc : (storeRead.doc ?? filesReadme.doc);
  if (doc === undefined) {
    let why = storeRead.why ?? filesReadme.why;
    let reason =
      storeRead.moved === true && filesState === "off"
        ? MOVED_TO_FILES_RESULT
        : describeDesignSystemUnreadable(filesState, storeState);
    return why === undefined ? unavailable(reason.why, reason.code) : unavailable(why, "nothing_read");
  }
  if (!owned) recordForeignDesignSystemRead(parsed, fromStore ? "read_db" : "read_file", context);
  logFeatureOk("artifact_design_system_guide", {
    store: fromStore,
    project: isProjectReadme,
    owned,
  });
  let suffix =
    fromStore || isProjectReadme
      ? undefined
      : storeState === "ruled"
        ? `a permission rule governs reading its store, ${PUBLISHED_README_NOTE}`
        : storeState === "unconsented"
          ? `its store needs approval to read here, ${PUBLISHED_README_NOTE}`
          : storeRead.unchecked === true
            ? `its store could not be checked, ${PUBLISHED_README_NOTE}`
            : storeRead.keptButUnread === true
              ? `its store's README is empty or could not be read here, ${PUBLISHED_README_NOTE}`
              : undefined;
  return {
    design_system: {
      url,
      ...identity,
      ...(fromStore && {
        store: true,
      }),
      docs: [doc],
      ...(suffix !== undefined && {
        unavailable: suffix,
      }),
    },
  };
}
//@ chunk-1xrdahqv.js:4662-4989 placement
/**
 * 设计系统读取不可用时的几种说明文字（单独读取、规则约束、只能用已发布 README、已迁到自有文件）。
 */
var READ_SEPARATELY_HINT = "read it with its own call, which may ask the user";
var RULE_GOVERNS_READ_HINT =
  "a permission rule governs reading it \u2014 read it with its own call and that rule decides";
var PUBLISHED_README_NOTE = "so this is its published README, which may be older than the one in its store";
var MOVED_TO_FILES_RESULT = {
  why: "it moved to its own files, which this session does not serve",
  code: "nothing_read",
};
//@ chunk-1xrdahqv.js:4989-5211 placement
function isDesignSystemReadRuled(surface, parsed, url, context, pipelineRan) {
  return surface === "files"
    ? hasDesignSystemReadRule(parsed, url, "read_file", context, {
        pipelineRan,
      }) ||
        hasDesignSystemReadRule(parsed, url, "read_file", context, {
          pipelineRan,
          fields: {
            path: PROJECT_README_MD,
          },
        })
    : hasDesignSystemReadRule(parsed, url, "read_db", context, {
        pipelineRan,
      }) ||
        hasDesignSystemReadRule(parsed, url, "read_db", context, {
          pipelineRan,
          fields: DS_META_DOC_FIELDS,
        });
}
//@ chunk-1xrdahqv.js:5211-5277 placement
function readState(enabled, ruled, ok) {
  return !enabled ? "off" : ruled ? "ruled" : ok ? "read" : "unconsented";
}
//@ chunk-1xrdahqv.js:5277-5982 placement
/**
 * 根据文件与存储的可读状态（off/read/unconsented/ruled）给出设计系统读不到的原因与代码。
 */
function describeDesignSystemUnreadable(filesState, storeState) {
  let filtered = [filesState, storeState].filter((state) => state !== "read" && state !== "off");
  if (filesState !== "read" && storeState !== "read" && filtered.length === 0)
    return {
      why: "this session serves neither its files nor its store",
      code: "not_served",
    };
  if (filtered.includes("unconsented"))
    return filesState === "read" || storeState === "read"
      ? {
          why: `its ${filesState === "unconsented" ? "files" : "store"} cannot be read here without the user's approval \u2014 ${READ_SEPARATELY_HINT}`,
          code: "nothing_read",
        }
      : {
          why: NEEDS_APPROVAL_HINT,
          code: "not_consented",
        };
  if (filtered.includes("ruled"))
    return {
      why: RULE_GOVERNS_READ_HINT,
      code: "rule",
    };
  return filesState === "off"
    ? {
        why: "its store holds no README for it, and this session does not serve its files",
        code: "nothing_read",
      }
    : {
        why:
          storeState === "off"
            ? "it has no README to read here (this session does not read stores)"
            : "it has no README to read",
        code: "nothing_read",
      };
}
//@ chunk-1xrdahqv.js:5982-6203 placement
var NEEDS_APPROVAL_HINT = `reading it here first needs the user's approval, which this call does not ask for \u2014 ${READ_SEPARATELY_HINT}`;
var DS_META_DOC_FIELDS = {
  db_op: "get",
  collection: "ds",
  doc_id: "meta",
};
var README_READ_FIELDS = {
  read_file: {
    path: README_MD,
  },
  read_db: {
    db_op: "get",
    collection: "files",
    doc_id: README_MD,
  },
};
//@ chunk-1xrdahqv.js:7526-7928 placement
/**
 * 在项目 README 与根 README 的读取结果中选择：有内容的优先项目级；两者都失败时合并失败原因；否则返回带说明的那个。
 */
function pickReadmeResult({ project, root }) {
  if (project.doc !== undefined || root.doc !== undefined) return project.doc !== undefined ? project : root;
  if (project.failed !== undefined && root.failed !== undefined)
    return {
      doc: undefined,
      why: `its ${project.failed === root.failed ? `${PROJECT_README_MD} and ${README_MD} could not be fetched (${root.failed})` : `${PROJECT_README_MD} (${project.failed}) and ${README_MD} (${root.failed}) could not be fetched`} \u2014 read the design system with its own call, which may ask the user`,
    };
  return project.why !== undefined ? project : root;
}
//@ chunk-1xrdahqv.js:7928-8022 placement
var DESIGN_STORE_FAILURE_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1xrdahqv.js:7928", () => {
  DESIGN_STORE_FAILURE_CODES = new Set([
    "store_unavailable",
    "busy",
    "quota_or_rate",
    "quota_exceeded",
    "upstream_auth",
  ]);
});
//@ chunk-1xrdahqv.js:8022-8223 placement
function readDesignSystemDoc(parsed, collection, docId, scope, context) {
  return raceWithDeadline(
    readArtifactDb(
      context.session.host,
      {
        slug: parsed.slug,
        op: "get",
        collection,
        docId,
      },
      scope,
      context.storageV5,
      context.credentials,
    ),
    scope,
    context,
    (doc) => ({
      kind: "error",
      code: "store_unavailable",
      message: READ_FAILURE_REASONS[doc],
      reason: doc,
    }),
  );
}
//@ chunk-1xrdahqv.js:8223-8992 placement
/**
 * 从设计系统的存储读取 meta 与 files/README.md：meta 读失败时给出原因（部分错误标记未核实），已迁移到文件时标 moved，README 为空或是文件形式时说明原因。
 */
async function readStoreReadme(parsed, signal, context) {
  let [metaResult, readmeResult] = await Promise.all([
    readDesignSystemDoc(parsed, DS_META_DOC_FIELDS.collection, DS_META_DOC_FIELDS.doc_id, signal, context),
    readDesignSystemDoc(parsed, "files", README_MD, signal, context),
  ]);
  if (metaResult.kind !== "ok")
    return metaResult.kind !== "error" || metaResult.code === "not_declared"
      ? {
          doc: undefined,
          why: undefined,
        }
      : {
          doc: undefined,
          why: `its store could not be read (${metaResult.message}) \u2014 ${READ_SEPARATELY_HINT}`,
          ...(DESIGN_STORE_FAILURE_CODES.has(metaResult.code) && {
            unchecked: true,
          }),
        };
  if (isMovedMarker(metaResult.docs[0]?.data))
    return {
      doc: undefined,
      why: undefined,
      moved: true,
    };
  let readmeText = getInlineDocText(readmeResult);
  return {
    ...(readmeText === undefined &&
      readmeResult.kind !== "not_found" && {
        keptButUnread: true,
      }),
    doc: readmeText === undefined ? undefined : clipGuideDoc(readmeText),
    why:
      readmeResult.kind === "error"
        ? `its store could not be read (${readmeResult.message}) \u2014 ${READ_SEPARATELY_HINT}`
        : readmeResult.kind === "ok" && readmeText === undefined
          ? typeof readmeResult.docs[0]?.data.data === "string"
            ? "its README.md in the store is empty"
            : "its README.md is a stored file rather than an inline document \u2014 read it from the system with its own call"
          : undefined,
  };
}
//@ chunk-1xrdahqv.js:8992-9097 placement
function isMovedMarker(text) {
  let movedTo = isPlainObject(text) ? text.movedTo : undefined;
  return isPlainObject(movedTo) && typeof movedTo.path === "string" && typeof movedTo.at === "string";
}
//@ chunk-1xrdahqv.js:9097-9214 placement
function getInlineDocText(readmeResult) {
  if (readmeResult.kind !== "ok") return;
  let projectDoc = readmeResult.docs[0]?.data.data;
  return typeof projectDoc === "string" && projectDoc.trim() !== "" ? projectDoc : undefined;
}
//@ chunk-1xrdahqv.js:9214-9349 placement
/**
 * 清洗设计系统指南文本中的信封标签，超过字符上限时截断并标记 clipped。
 */
function clipGuideText(path, text, maxChars) {
  let cleaned = scrubArtifactEnvelopeTags(text);
  let chars = Array.from(cleaned).length;
  return chars > maxChars
    ? {
        path,
        text: scrubArtifactEnvelopeTags(truncateCodePoints(cleaned, maxChars)),
        chars,
        clipped: true,
      }
    : {
        path,
        text: cleaned,
        chars,
      };
}
//@ chunk-1xrdahqv.js:9349-9494 placement
var GENERATED_SECTION_MARKERS = [
  `
## Consuming this system (generated`,
  `
## Index (generated`,
];
var CLIPPED_GUIDE_MARKER = "[\u2026authored guide clipped here; its generated tail follows\u2026]";
//@ chunk-1xrdahqv.js:9494-9827 placement
/**
 * 把设计系统指南裁到长度上限：超长时保留开头的手写部分并接上末尾"自动生成"小节（中间放裁剪标记），找不到生成小节时直接截断。
 */
function clipGuideDoc(rawText, path = README_MD) {
  let maxChars = MAX_GUIDE_DOC_CHARS;
  let text = scrubArtifactEnvelopeTags(rawText);
  let chars = Array.from(text).length;
  if (chars <= maxChars)
    return {
      path,
      text,
      chars,
    };
  let generatedAt =
    GENERATED_SECTION_MARKERS.map((marker) => text.lastIndexOf(marker)).find((index) => index !== -1) ?? -1;
  if (generatedAt === -1) return clipGuideText(path, text, maxChars);
  let generatedSection = truncateCodePoints(text.slice(generatedAt), MAX_GUIDE_PROJECT_CHARS);
  let projectBudget =
    maxChars - Array.from(generatedSection).length - Array.from(CLIPPED_GUIDE_MARKER).length - 2;
  let projectSection = truncateCodePoints(text.slice(0, generatedAt), projectBudget);
  return {
    path,
    text: scrubArtifactEnvelopeTags(`${projectSection}
${CLIPPED_GUIDE_MARKER}
${generatedSection}`),
    chars,
    clipped: true,
  };
}
//@ chunk-1xrdahqv.js:9827-10947 placement
/**
 * 生成"其他卡片未附上，需要时如何读取"的说明，按数据存储方式与当前工具集给出读取方法。
 */
function describeOtherCards(filesState, storeState, otherCards) {
  if (otherCards)
    return `Its other cards are not attached: read one when you need it with ${pickByToolset('action "read_file"', () => 'action "read"')}, \`url\`: ${jsonStringify(filesState)}, and a \`path\`: "project/api/tokens.md" (palette, type, fonts); "project/tokens.json" (exact token values); or, where the README's index is shown, a card it names, at "project/" followed by the path the index gives.`;
  return storeState
    ? `Its other cards are not attached: read one when you need it with ${pickByToolset('action "read_db" and `db_op`: "get"', () => `the ${ARTIFACT_DATA_TOOL_NAME} tool, action "get"`)}, \`url\`: ${jsonStringify(filesState)}, and a \`collection\` and \`doc_id\`: "api" and "tokens.md" (palette, type, fonts); "ds" and "tokens" (exact token values); "ds" and "meta" (the system's record). Where the README's index is shown, read a card it names by the collection and doc id the index gives.`
    : `Its other cards are not attached: read one when you need it with ${pickByToolset('action "read_file"', () => 'action "read"')}, \`url\`: ${jsonStringify(filesState)}, and a \`path\`: "api/tokens.md" (palette, type, fonts); "tokens.json" (exact token values); or, where the README's index is shown, a card it names, by its path there.`;
}
//@ chunk-1xrdahqv.js:10947-11095 placement
/**
 * 把文本截断到上限并清洗信封标签、方括号与多余空白，用作决策面中的括号内文本。
 */
function sanitizeBracketText(text, maxChars) {
  let clipped = Array.from(text).length > maxChars;
  return (
    scrubArtifactEnvelopeTags(truncateCodePoints(text, maxChars))
      .replace(DECISION_SURFACE_BRACKETS_RE, " ")
      .replace(/[[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim() + (clipped ? " \u2026" : "")
  );
}
//@ chunk-1xrdahqv.js:11095-11349 placement
/**
 * 若记录里有带正文的 docs，返回一个把各 doc 的 text 清空的副本（用于存储/压缩）；否则 undefined。
 */
function stripDocTexts(designSystem) {
  if (
    designSystem === null ||
    typeof designSystem !== "object" ||
    !("docs" in designSystem) ||
    !Array.isArray(designSystem.docs) ||
    !designSystem.docs.some(
      (doc) => doc !== null && typeof doc === "object" && "text" in doc && doc.text !== "",
    )
  )
    return;
  return {
    ...designSystem,
    docs: designSystem.docs.map((doc) =>
      doc !== null && typeof doc === "object"
        ? {
            ...doc,
            text: "",
          }
        : doc,
    ),
  };
}
//@ chunk-1xrdahqv.js:11349-12792 placement
/**
 * 把 design_system 记录渲染成附加到提示词里的文本：未找到默认或 README 时给出"未附加"及原因；否则写出系统链接、标题、用户/组织默认，附上（必要时裁剪的）README 正文与"不要再次获取"说明。
 */
function renderDesignSystemAttachment(record) {
  let parsed = objectSchema(designSystemSchema()).safeParse({
    design_system: record,
  });
  let designSystem = parsed.success ? parsed.data.design_system : undefined;
  if (designSystem === undefined)
    return {
      text: "",
      attached: false,
    };
  let unavailable =
    designSystem.unavailable === undefined
      ? undefined
      : sanitizeBracketText(designSystem.unavailable, MAX_UNAVAILABLE_NOTE_CHARS);
  if (typeof designSystem.url !== "string")
    return {
      text: `

[Design system not attached \u2014 ${unavailable ?? "no default could be found"}.]`,
      attached: false,
    };
  let target = canonicalArtifactTargetFor(designSystem.url, "(unrecognized address)");
  let titleSuffix =
    typeof designSystem.title === "string"
      ? ` ${jsonStringify(sanitizeBracketText(sweptArtifactTitle(sanitizeDisplayTitle(sweepResultLineField(designSystem.title, 200)) ?? ""), 200) || "Untitled")}`
      : "";
  let location = `${target}${titleSuffix}, the ${designSystem.default === "user" ? "user's" : "organization's"} default design system`;
  let readmeDoc = (designSystem.docs ?? []).find(
    (doc) => (doc.path === README_MD || doc.path === PROJECT_README_MD) && doc.text !== "",
  );
  if (readmeDoc === undefined)
    return {
      text: `

[Design system not attached (${location}) \u2014 ${unavailable ?? "its README is not kept in this record; read it with its own call if you need it"}.]`,
      attached: false,
    };
  let clipped = clipGuideDoc(readmeDoc.text);
  let clippedFlag = clipped.clipped === true || readmeDoc.clipped === true;
  let max = Math.max(clipped.chars, readmeDoc.chars);
  let sourceNote =
    " This is the standing choice; ignore it if the user or the session named another, or declined one, in this conversation.";
  let text = clippedFlag
    ? `
[\u2026clipped at ${Array.from(clipped.text).length} of ${max} characters; read the whole file from the design system if you need the rest]`
    : "";
  return {
    text: `

${ARTIFACT_CONTENT_AUTHORED_TAG}
Design system ${location}.${sourceNote} Its ${readmeDoc.path} (${designSystem.store === true ? "a document of its store" : "a published file"}) follows \u2014 do not fetch it again${clippedFlag ? " unless you need the clipped remainder" : ""}.${unavailable !== undefined ? ` (${unavailable}.)` : ""} ${describeOtherCards(target, designSystem.store === true, readmeDoc.path === PROJECT_README_MD)}

${readmeDoc.path}:
${fileInlineEnvelope(clipped.text + text)}`,
    attached: true,
  };
}
export {
  README_READ_FIELDS,
  raceWithDeadline,
  READ_FAILURE_REASONS,
  clipGuideDoc,
  READ_SEPARATELY_HINT,
  README_MD,
  PROJECT_README_MD,
  stripDocTexts,
  checkDesignSystemReadable,
  canReadDesignSystemFiles,
  pickDefaultDesignSystem,
  readDesignSystemGuide,
  sanitizeBracketText,
  renderDesignSystemAttachment,
  clipGuideText,
};
