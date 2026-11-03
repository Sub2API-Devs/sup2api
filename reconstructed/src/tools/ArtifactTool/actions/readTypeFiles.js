/**
 * tools/ArtifactTool/actions/readTypeFiles.ts
 *
 * 2.1.316 新增：读取类型文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (17)
 * attribution: placement 17
 */
import {
  readTypeOwnInstructions,
  readArtifactTypeFile,
  instructionsTypeKey,
  TYPE_INSTRUCTIONS_READ_MS,
} from "../../../services/artifacts/artifactTypes.js";
import { logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import {
  artifactTypeResult,
  CATALOG_DOWN_REASONS,
  TYPE_FILES_RESULT_BUDGET,
  MAX_TYPE_FILES_PER_READ,
} from "../resultHelpers.js";
import { limitConcurrency } from "../../../utils/concurrencyLimit.js";
import { FILE_READ_CONCURRENCY } from "../../../services/artifacts/publishedFiles.js";
import { AbortError } from "../../../utils/errors.js";
import { count } from "../../../utils/collections.js";
import { safeJsonQuote } from "../../../services/artifacts/contentTypes.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { MAX_PUBLISHED_PATH_LENGTH } from "../../../services/artifacts/artifactUrl.js";
import { formatPathList } from "../../../services/artifacts/artifactTypeRelease.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { sanitizeDisplayTitle } from "../../../utils/textNormalize.js";
import {
  ARTIFACT_TYPE_REFERENCES,
  inlinedByCreatePaths,
  inlinedByCreateDesignPaths,
} from "../../../services/artifacts/artifactTypeReferences.js";
import { getAttestationKind } from "../../../services/artifacts/attestation.js";
import { createCombinedAbortSignal } from "../../../utils/combinedAbortSignal.js";
import { artifactViewerUrlFor } from "../artifactUrls.js";
import { hasDesignSystemReadRule } from "../../../services/artifacts/designSystemReadRules.js";
import {
  raceWithDeadline,
  READ_FAILURE_REASONS,
  clipGuideText,
  sanitizeBracketText,
} from "../../../services/artifacts/designSystemGuide.js";
import { readArtifactFileViaWebFetch } from "../../../services/artifacts/webfetchRead.js";
import { u } from "../../../../vendor/zod/v4/classic/schemas.js";
import { initReferencesSchema } from "../startKitSchemas.js";
import { fileInlineEnvelope } from "../../../services/artifacts/readArtifactForModel.js";

//@ chunk-8wvtd8sr.js:314931-315141 placement
/**
 * read 一个 Artifact 类型链接（而非实例）时：读取类型自带说明文件（如有），返回 {artifact_type, read_of_type_link}。
 */
async function readTypeLinkDescription(e, firstPartyTypeDetail, s) {
  let r = firstPartyTypeDetail.shipsInstructions
    ? await readTypeOwnInstructions(
        e,
        s.abortController.signal,
        s.credentials,
        firstPartyTypeDetail.files,
        false,
      )
    : null;
  logFeatureOk("artifact_type_link_read", {
    path: false,
  });
  return {
    artifact_type: artifactTypeResult(firstPartyTypeDetail, r),
    read_of_type_link: true,
  };
}
//@ chunk-8wvtd8sr.js:315141-315604 placement
/**
 * 读取类型的单个文件（NFC 规范化路径）：成功返回内容/字数，否则给出 unread 原因（未列出/扣留/非文本/过大/不可用），并标记目录服务是否不可用。
 */
async function readOneTypeFile(typeRef, typeInfo, path, context) {
  let normalized = path.normalize("NFC");
  let artifactTypeFile = await readArtifactTypeFile(typeRef.slug, normalized, {
    signal: context.abortController.signal,
    credentials: context.credentials,
  });
  let p =
    artifactTypeFile.kind === "read"
      ? undefined
      : artifactTypeFile.kind === "withheld" &&
          typeInfo.filesOmitted === 0 &&
          !typeInfo.files.includes(normalized)
        ? "not_listed"
        : artifactTypeFile.kind;
  return {
    typeFile: {
      path: normalized,
      ...(artifactTypeFile.kind === "read" && {
        content: artifactTypeFile.text,
        chars: artifactTypeFile.chars,
        ...(artifactTypeFile.clipped && {
          clipped: true,
        }),
      }),
      ...(p !== undefined && {
        unread: p,
      }),
      ...(artifactTypeFile.kind === "unavailable" && {
        why: artifactTypeFile.why,
      }),
    },
    catalogDown: artifactTypeFile.kind === "unavailable" && CATALOG_DOWN_REASONS.has(artifactTypeFile.reason),
  };
}
//@ chunk-8wvtd8sr.js:315604-315844 placement
/**
 * 读取 Artifact 类型链接指向的类型文件，记埋点，返回类型信息与类型文件结果。
 */
async function readTypeLinkFile(typeRef, typeInfo, path, context) {
  let { typeFile } = await readOneTypeFile(typeRef, typeInfo, path, context);
  if (typeFile.unread === undefined)
    logFeatureOk("artifact_type_link_read", {
      path: true,
    });
  else
    logFeatureSad("artifact_type_link_read", typeFile.unread, {
      path: true,
    });
  return {
    artifact_type: artifactTypeResult(typeInfo, null),
    read_of_type_link: true,
    type_file: typeFile,
  };
}
//@ chunk-8wvtd8sr.js:315844-316694 placement
/**
 * 按 paths 读取类型的多个文件（数量与结果字符预算有上限）：已有目录不可用时后续路径直接标记 unavailable，超出预算的标 result_full，记 artifact_type_link_read 埋点。
 */
async function readTypeLinkFiles(typeRef, typeInfo, paths, context, renderFile) {
  let y = {
    artifact_type: artifactTypeResult(typeInfo, null),
    read_of_type_link: true,
  };
  let p = (typeFile) =>
    renderFile({
      ...y,
      type_file: typeFile,
    });
  let budgetLeft = TYPE_FILES_RESULT_BUDGET;
  let catalogDownWhy;
  let S = 0;
  let results = await Promise.all(
    paths.slice(0, MAX_TYPE_FILES_PER_READ).map(
      limitConcurrency(FILE_READ_CONCURRENCY, async ({ path, setAside }) => {
        if (context.abortController.signal.aborted) throw new AbortError();
        if (budgetLeft < 0)
          return {
            path,
            unread: "result_full",
          };
        let typeFile;
        if (setAside !== undefined)
          typeFile = {
            path,
            unread: "unavailable",
            why: setAside,
          };
        else if (catalogDownWhy !== undefined) {
          S++;
          typeFile = {
            path,
            unread: "unavailable",
            why: `not requested, because the request for an earlier path failed: ${catalogDownWhy}`,
          };
        } else {
          let oneTypeFile = await readOneTypeFile(typeRef, typeInfo, path, context);
          typeFile = oneTypeFile.typeFile;
          if (oneTypeFile.catalogDown) catalogDownWhy ??= typeFile.why;
        }
        budgetLeft -= p(typeFile).length;
        return typeFile;
      }),
    ),
  );
  let T = countFittingFiles(results, p);
  let mapped = paths.map(({ path }, M) =>
    M < T
      ? results[M]
      : {
          path,
          unread: "result_full",
        },
  );
  let L = {
    path: true,
    paths: mapped.length,
    read: count(mapped, (V) => V.unread === undefined),
    skipped_catalog_down: S,
  };
  if (L.read > 0) logFeatureOk("artifact_type_link_read", L);
  else logFeatureSad("artifact_type_link_read", "none_read", L);
  return {
    ...y,
    type_files_read: mapped,
  };
}
//@ chunk-8wvtd8sr.js:316694-316827 placement
function countFittingFiles(e, n) {
  let s = TYPE_FILES_RESULT_BUDGET;
  let r = 0;
  for (let h of e.slice(0, MAX_TYPE_FILES_PER_READ)) {
    if (h.unread === "result_full") break;
    s -= n(h).length;
    if (s < 0) break;
    r++;
  }
  return r;
}
//@ chunk-8wvtd8sr.js:316827-317007 placement
/**
 * url 指向 Artifact 类型本身（而非由它创建的 Artifact）时的读取说明前缀。
 */
function typeLinkReadPrefix(title) {
  return `That url is the ${jsonTitleOrDefault(title)} Artifact type itself, not an Artifact made from it, so there is no Artifact content to read here; the type's description follows.

`;
}
//@ chunk-8wvtd8sr.js:317007-317231 placement
/**
 * 读取类型文件的结果标题：文件为空或显示了多少字符（不写入磁盘）。
 */
function typeFileReadHeader(path, n, s, r) {
  return r
    ? `Read ${safeJsonQuote(path)} from the ${jsonTitleOrDefault(s)} Artifact type: the file is empty; nothing was saved to disk.`
    : `Read ${safeJsonQuote(path)} (${n} characters) from the ${jsonTitleOrDefault(s)} Artifact type; shown below, not saved to disk.`;
}
//@ chunk-8wvtd8sr.js:317231-317358 placement
/**
 * 渲染读到的多个类型文件：预算内的逐个显示，其余只列路径。
 */
function renderTypeFilesRead(e, n) {
  let s = countFittingFiles(e, n);
  let mapped = e.slice(0, s).map(n);
  if (s < e.length) mapped.push(notReadPathsNote(e.slice(s).map((h) => h.path)));
  return mapped.join(`

`);
}
//@ chunk-8wvtd8sr.js:317358-317653 placement
function notReadPathsNote(e) {
  let n = safeJsonQuote(truncateToLength(e[0] ?? "", MAX_PUBLISHED_PATH_LENGTH));
  let [s, r] =
    e.length === 1
      ? ["", "it"]
      : [` and the ${e.length === 2 ? "one" : e.length - 1} after it in \`paths\``, "them"];
  return `Not read: ${n}${s}. One read of a type's files shows at most ${MAX_TYPE_FILES_PER_READ} files and about ${TYPE_FILES_RESULT_BUDGET} characters; to read ${r}, pass ${r} in another call.`;
}
//@ chunk-8wvtd8sr.js:317653-318756 placement
/**
 * 类型文件未读时给模型的说明：扣留、不在文件列表、非文本、过大、目录不可用或结果已满；可读时提示用由该类型创建的 Artifact 的 url 去读。
 */
function typeFileUnreadMessage(file, typeInfo, creatingFromType) {
  let r = safeJsonQuote(file.path);
  let h = jsonTitleOrDefault(typeInfo.title);
  let y = creatingFromType
    ? " Any Artifact made from the type carries the same file: read this path with such an Artifact's url \u2014 one the user already has, or, if you are making one from the type anyway, the one you create first (publish with its `type_url` and no files)."
    : " An Artifact made from the type carries the same file: if the user has one, read this path with that Artifact's url.";
  switch (file.unread) {
    case "withheld":
      return `${r} of the ${h} Artifact type can't be read from this session yet; nothing was saved.${y}`;
    case "not_listed":
      return `${r} is not one of the ${h} Artifact type's files (${formatPathList(typeInfo.files, typeInfo.files.length + (typeInfo.files_omitted ?? 0))}); nothing was saved.`;
    case "not_text":
      return `${r} of the ${h} Artifact type is not a text file, so it can't be shown here; nothing was saved.${y}`;
    case "too_large":
      return `${r} of the ${h} Artifact type is too large to show here; nothing was saved.${y}`;
    case "unavailable":
      return `${r} of the ${h} Artifact type was not read (${file.why ?? "the catalog did not answer"}); nothing was saved.`;
    case "result_full":
      return notReadPathsNote([file.path]);
  }
}
//@ chunk-8wvtd8sr.js:318756-318799 placement
/**
 * 把标题 JSON 化，空标题回退 Untitled。
 */
function jsonTitleOrDefault(e) {
  return jsonStringify(sanitizeDisplayTitle(e) ?? "Untitled");
}
//@ chunk-8wvtd8sr.js:318799-318868 placement
/**
 * 创建第一方类型时预取参考页面：类型到地址的映射、超时与条数上限。
 */
var TYPE_REFERENCE_URL_BY_TYPE = new Map(
  [...ARTIFACT_TYPE_REFERENCES.keys()].map((key) => [key, inlinedByCreatePaths(key)]),
);
var INIT_REFERENCE_FETCH_TIMEOUT_MS = 24000;
var INIT_REFERENCE_MAX_DOCS = 200;
//@ chunk-8wvtd8sr.js:318868-320333 placement
/**
 * 第一方类型创建后预取其说明文件要求先读的参考页面（按说明类型查表、排除已在磁盘的）：受权限规则约束的交给模型自己读，其余在超时内拉取，记 artifact_init_bundle 埋点。
 */
async function fetchInitReferences(target, options) {
  let { typeSlug, typeFiles, instructions, context } = options;
  let p = instructions === undefined ? undefined : instructionsTypeKey(instructions);
  let w = p === undefined ? undefined : TYPE_REFERENCE_URL_BY_TYPE.get(p);
  if (w === undefined || getAttestationKind(typeSlug) !== "first_party_type") return {};
  let A = typeFiles.length > 0 ? w.filter((T) => typeFiles.includes(T)) : w;
  let filtered = A.filter((T) => options.onDisk?.includes(T) !== true);
  if (filtered.length === 0) {
    if (A.length > 0)
      logFeatureOk("artifact_init_bundle", {
        references: 0,
        unread: 0,
        fetch_failed: 0,
        on_disk: A.length,
      });
    return {};
  }
  let combinedAbortSignal = createCombinedAbortSignal(context.abortController.signal, {
    timeoutMs: TYPE_INSTRUCTIONS_READ_MS,
    refTimer: true,
  });
  try {
    let T = artifactViewerUrlFor(target);
    let results = await Promise.all(
      filtered.map((x) =>
        hasDesignSystemReadRule(target, T, "read_file", context, {
          fields: {
            path: x,
          },
          pipelineRan: true,
        })
          ? Promise.resolve({
              path: x,
              why: "a permission rule governs reading it \u2014 read it yourself and that rule decides",
            })
          : raceWithDeadline(
              readArtifactFileViaWebFetch(
                target,
                x,
                combinedAbortSignal.signal,
                context.credentials,
                "artifact_type_reference_read",
              ).then((artifactFileViaWebFetch) => {
                if (artifactFileViaWebFetch.err === null)
                  return {
                    path: x,
                    text: artifactFileViaWebFetch.html,
                  };
                return {
                  path: x,
                  ...(artifactFileViaWebFetch.missingFile !== true && {
                    fetchFailed: true,
                  }),
                  why:
                    artifactFileViaWebFetch.missingFile === true
                      ? "not among the files of this release"
                      : "it could not be fetched \u2014 read it yourself",
                };
              }),
              combinedAbortSignal.signal,
              context,
              (q) => ({
                path: x,
                why: `${READ_FAILURE_REASONS[q]} \u2014 read it yourself`,
              }),
            ),
      ),
    );
    let flattened = results.flatMap((x) =>
      "text" in x && x.text.trim() !== ""
        ? [clipGuideText(x.path, x.text, INIT_REFERENCE_FETCH_TIMEOUT_MS)]
        : [],
    );
    let flattened_2 = results.flatMap((x) =>
      "why" in x
        ? [
            {
              path: x.path,
              why: x.why,
            },
          ]
        : [],
    );
    let M = count(results, (x) => "fetchFailed" in x && x.fetchFailed === true);
    if (flattened.length === 0 && M > 0) logFeatureSad("artifact_init_bundle", "references_unread");
    else
      logFeatureOk("artifact_init_bundle", {
        references: flattened.length,
        unread: flattened_2.length,
        fetch_failed: M,
      });
    return {
      init_references: {
        docs: flattened,
        ...(flattened_2.length > 0 && {
          unavailable: flattened_2,
        }),
      },
    };
  } finally {
    combinedAbortSignal.cleanup();
  }
}
//@ chunk-8wvtd8sr.js:320333-320412 placement
/**
 * 「仅配设计系统使用，而此账号未列出」的说明。
 */
var NO_DESIGN_SYSTEM_NOTE = "only of use with a design system, and none is listed for this account";
//@ chunk-8wvtd8sr.js:320412-320761 placement
/**
 * 扣留已在类型文件中的初始参考页：把这些页从 init_references.docs 移到 unavailable（附原因）并记埋点；无重叠时原样返回。
 */
function withholdInitReferences(e, n, s) {
  let initReferences = e.init_references;
  if (!s || initReferences === undefined) return e;
  let h = inlinedByCreateDesignPaths(n);
  let filtered = initReferences.docs.filter((doc) => h.includes(doc.path));
  if (filtered.length === 0) return e;
  logFeatureOk("artifact_init_reference_withheld", {
    pages: filtered.length,
  });
  return {
    init_references: {
      docs: initReferences.docs.filter((doc) => !h.includes(doc.path)),
      unavailable: [
        ...(initReferences.unavailable ?? []),
        ...filtered.map((p) => ({
          path: p.path,
          why: NO_DESIGN_SYSTEM_NOTE,
        })),
      ],
    },
  };
}
//@ chunk-8wvtd8sr.js:320761-320819 placement
/**
 * 类型参考页 id 的合法格式。
 */
var ARTIFACT_TYPE_REFERENCE_ID_REGEX = /^artifact-type\/reference\/[A-Za-z0-9_.-]{1,80}$/;
//@ chunk-8wvtd8sr.js:320819-321931 placement
/**
 * 把 init_references 渲染成结果尾部：附上参考页面内容（注明不要再取），以及未能附上的页面及原因。
 */
function renderInitReferences(e) {
  let n = u(initReferencesSchema()).safeParse({
    init_references: e.init_references,
  });
  let initReferences = n.success ? n.data.init_references : undefined;
  if (initReferences === undefined) return "";
  let mapped = initReferences.docs
    .filter((doc) => ARTIFACT_TYPE_REFERENCE_ID_REGEX.test(doc.path) && doc.text !== "")
    .map((doc) => {
      let A = clipGuideText(doc.path, doc.text, INIT_REFERENCE_FETCH_TIMEOUT_MS);
      return {
        ...A,
        chars: Math.max(A.chars, doc.chars),
        clipped: A.clipped === true || doc.clipped === true,
      };
    });
  let h = new Map();
  for (let w of initReferences.unavailable ?? [])
    if (ARTIFACT_TYPE_REFERENCE_ID_REGEX.test(w.path)) {
      let A = sanitizeBracketText(w.why, INIT_REFERENCE_MAX_DOCS);
      h.set(A, [...(h.get(A) ?? []), w.path]);
    }
  let mapped_2 = [...h].map(([w, A]) => `${A.join(", ")} (${w})`);
  if (mapped.length === 0)
    return mapped_2.length > 0
      ? `

[Type reference pages not attached: ${mapped_2.join("; ")}.]`
      : "";
  let any = mapped.some((w) => w.clipped);
  return (
    `

The type's reference pages that its instructions above say to read first follow \u2014 ${mapped.map((w) => w.path).join(", ")}, the same files a read of this Artifact returns; do not fetch them again${any ? " unless you need a clipped remainder" : ""}.${mapped_2.length > 0 ? ` Not attached: ${mapped_2.join("; ")}.` : ""}

` +
    mapped.map((w) => {
      let A = w.clipped
        ? `
[\u2026clipped at ${Array.from(w.text).length} of ${w.chars} characters; read the whole page if you need the rest]`
        : "";
      return `${w.path}:
${fileInlineEnvelope(w.text + A)}`;
    }).join(`

`)
  );
}
export {
  renderInitReferences,
  readTypeLinkFiles,
  readTypeLinkFile,
  readTypeLinkDescription,
  renderTypeFilesRead,
  typeLinkReadPrefix,
  typeFileUnreadMessage,
  typeFileReadHeader,
  fetchInitReferences,
  withholdInitReferences,
};
