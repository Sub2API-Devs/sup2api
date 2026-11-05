/**
 * tools/ArtifactTool/actions/readTypeFiles.ts
 *
 * 2.1.316 新增：读取类型文件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { countWhere } from "../../../utils/collections.js";
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
import { readArtifactFile } from "../../../services/artifacts/webfetchRead.js";
import { objectSchema } from "../../../../vendor/zod/v4/classic/schemas.js";
import { initReferencesSchema } from "../startKitSchemas.js";
import { fileInlineEnvelope } from "../../../services/artifacts/readArtifactForModel.js";

//@ chunk-xzmy9dn4.js:317202-317412 placement
/**
 * read 一个 Artifact 类型链接（而非实例）时：读取类型自带说明文件（如有），返回 {artifact_type, read_of_type_link}。
 */
async function readTypeLinkDescription(artifactUrl, firstPartyTypeDetail, context) {
  let instructions = firstPartyTypeDetail.shipsInstructions
    ? await readTypeOwnInstructions(
        artifactUrl,
        context.abortController.signal,
        context.credentials,
        firstPartyTypeDetail.files,
        false,
      )
    : null;
  logFeatureOk("artifact_type_link_read", {
    path: false,
  });
  return {
    artifact_type: artifactTypeResult(firstPartyTypeDetail, instructions),
    read_of_type_link: true,
  };
}
//@ chunk-xzmy9dn4.js:317412-317875 placement
/**
 * 读取类型的单个文件（NFC 规范化路径）：成功返回内容/字数，否则给出 unread 原因（未列出/扣留/非文本/过大/不可用），并标记目录服务是否不可用。
 */
async function readOneTypeFile(typeRef, typeInfo, path, context) {
  let path_2 = path.normalize("NFC");
  let artifactTypeFile = await readArtifactTypeFile(typeRef.slug, path_2, {
    signal: context.abortController.signal,
    credentials: context.credentials,
  });
  let unreadReason =
    artifactTypeFile.kind === "read"
      ? undefined
      : artifactTypeFile.kind === "withheld" &&
          typeInfo.filesOmitted === 0 &&
          !typeInfo.files.includes(path_2)
        ? "not_listed"
        : artifactTypeFile.kind;
  return {
    typeFile: {
      path: path_2,
      ...(artifactTypeFile.kind === "read" && {
        content: artifactTypeFile.text,
        chars: artifactTypeFile.chars,
        ...(artifactTypeFile.clipped && {
          clipped: true,
        }),
      }),
      ...(unreadReason !== undefined && {
        unread: unreadReason,
      }),
      ...(artifactTypeFile.kind === "unavailable" && {
        why: artifactTypeFile.why,
      }),
    },
    catalogDown: artifactTypeFile.kind === "unavailable" && CATALOG_DOWN_REASONS.has(artifactTypeFile.reason),
  };
}
//@ chunk-xzmy9dn4.js:317875-318115 placement
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
//@ chunk-xzmy9dn4.js:318115-318965 placement
/**
 * 按 paths 读取类型的多个文件（数量与结果字符预算有上限）：已有目录不可用时后续路径直接标记 unavailable，超出预算的标 result_full，记 artifact_type_link_read 埋点。
 */
async function readTypeLinkFiles(typeRef, typeInfo, paths, context, renderFile) {
  let baseResult = {
    artifact_type: artifactTypeResult(typeInfo, null),
    read_of_type_link: true,
  };
  let renderOneFile = (typeFile) =>
    renderFile({
      ...baseResult,
      type_file: typeFile,
    });
  let budgetLeft = TYPE_FILES_RESULT_BUDGET;
  let catalogDownWhy;
  let skippedCount = 0;
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
          skippedCount++;
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
        budgetLeft -= renderOneFile(typeFile).length;
        return typeFile;
      }),
    ),
  );
  let fittingCount = countFittingFiles(results, renderOneFile);
  let mapped = paths.map(({ path }, index) =>
    index < fittingCount
      ? results[index]
      : {
          path,
          unread: "result_full",
        },
  );
  let stats = {
    path: true,
    paths: mapped.length,
    read: countWhere(mapped, (typeFile) => typeFile.unread === undefined),
    skipped_catalog_down: skippedCount,
  };
  if (stats.read > 0) logFeatureOk("artifact_type_link_read", stats);
  else logFeatureSad("artifact_type_link_read", "none_read", stats);
  return {
    ...baseResult,
    type_files_read: mapped,
  };
}
//@ chunk-xzmy9dn4.js:318965-319098 placement
function countFittingFiles(typeFiles, renderFile) {
  let budgetLeft = TYPE_FILES_RESULT_BUDGET;
  let count = 0;
  for (let typeFile of typeFiles.slice(0, MAX_TYPE_FILES_PER_READ)) {
    if (typeFile.unread === "result_full") break;
    budgetLeft -= renderFile(typeFile).length;
    if (budgetLeft < 0) break;
    count++;
  }
  return count;
}
//@ chunk-xzmy9dn4.js:319098-319278 placement
/**
 * url 指向 Artifact 类型本身（而非由它创建的 Artifact）时的读取说明前缀。
 */
function typeLinkReadPrefix(title) {
  return `That url is the ${jsonTitleOrDefault(title)} Artifact type itself, not an Artifact made from it, so there is no Artifact content to read here; the type's description follows.

`;
}
//@ chunk-xzmy9dn4.js:319278-319502 placement
/**
 * 读取类型文件的结果标题：文件为空或显示了多少字符（不写入磁盘）。
 */
function typeFileReadHeader(path, chars, typeTitle, isEmpty) {
  return isEmpty
    ? `Read ${safeJsonQuote(path)} from the ${jsonTitleOrDefault(typeTitle)} Artifact type: the file is empty; nothing was saved to disk.`
    : `Read ${safeJsonQuote(path)} (${chars} characters) from the ${jsonTitleOrDefault(typeTitle)} Artifact type; shown below, not saved to disk.`;
}
//@ chunk-xzmy9dn4.js:319502-319629 placement
/**
 * 渲染读到的多个类型文件：预算内的逐个显示，其余只列路径。
 */
function renderTypeFilesRead(typeFiles, renderFile) {
  let fittingCount = countFittingFiles(typeFiles, renderFile);
  let mapped = typeFiles.slice(0, fittingCount).map(renderFile);
  if (fittingCount < typeFiles.length)
    mapped.push(notReadPathsNote(typeFiles.slice(fittingCount).map((typeFile) => typeFile.path)));
  return mapped.join(`

`);
}
//@ chunk-xzmy9dn4.js:319629-319923 placement
function notReadPathsNote(typeFiles) {
  let firstPath = safeJsonQuote(truncateToLength(typeFiles[0] ?? "", MAX_PUBLISHED_PATH_LENGTH));
  let [restNote, themWord] =
    typeFiles.length === 1
      ? ["", "it"]
      : [` and the ${typeFiles.length === 2 ? "one" : typeFiles.length - 1} after it in \`paths\``, "them"];
  return `Not read: ${firstPath}${restNote}. One read of a type's files shows at most ${MAX_TYPE_FILES_PER_READ} files and about ${TYPE_FILES_RESULT_BUDGET} characters; to read ${themWord}, pass ${themWord} in another call.`;
}
//@ chunk-xzmy9dn4.js:319923-321026 placement
/**
 * 类型文件未读时给模型的说明：扣留、不在文件列表、非文本、过大、目录不可用或结果已满；可读时提示用由该类型创建的 Artifact 的 url 去读。
 */
function typeFileUnreadMessage(file, typeInfo, creatingFromType) {
  let shownPath = safeJsonQuote(file.path);
  let shownTitle = jsonTitleOrDefault(typeInfo.title);
  let createHint = creatingFromType
    ? " Any Artifact made from the type carries the same file: read this path with such an Artifact's url \u2014 one the user already has, or, if you are making one from the type anyway, the one you create first (publish with its `type_url` and no files)."
    : " An Artifact made from the type carries the same file: if the user has one, read this path with that Artifact's url.";
  switch (file.unread) {
    case "withheld":
      return `${shownPath} of the ${shownTitle} Artifact type can't be read from this session yet; nothing was saved.${createHint}`;
    case "not_listed":
      return `${shownPath} is not one of the ${shownTitle} Artifact type's files (${formatPathList(typeInfo.files, typeInfo.files.length + (typeInfo.files_omitted ?? 0))}); nothing was saved.`;
    case "not_text":
      return `${shownPath} of the ${shownTitle} Artifact type is not a text file, so it can't be shown here; nothing was saved.${createHint}`;
    case "too_large":
      return `${shownPath} of the ${shownTitle} Artifact type is too large to show here; nothing was saved.${createHint}`;
    case "unavailable":
      return `${shownPath} of the ${shownTitle} Artifact type was not read (${file.why ?? "the catalog did not answer"}); nothing was saved.`;
    case "result_full":
      return notReadPathsNote([file.path]);
  }
}
//@ chunk-xzmy9dn4.js:321026-321069 placement
/**
 * 把标题 JSON 化，空标题回退 Untitled。
 */
function jsonTitleOrDefault(title) {
  return jsonStringify(sanitizeDisplayTitle(title) ?? "Untitled");
}
//@ chunk-xzmy9dn4.js:321069-321138 placement
/**
 * 创建第一方类型时预取参考页面：类型到地址的映射、超时与条数上限。
 */
var TYPE_REFERENCE_URL_BY_TYPE = new Map(
  [...ARTIFACT_TYPE_REFERENCES.keys()].map((key) => [key, inlinedByCreatePaths(key)]),
);
var INIT_REFERENCE_FETCH_TIMEOUT_MS = 24000;
var INIT_REFERENCE_MAX_DOCS = 200;
//@ chunk-xzmy9dn4.js:321138-322603 placement
/**
 * 第一方类型创建后预取其说明文件要求先读的参考页面（按说明类型查表、排除已在磁盘的）：受权限规则约束的交给模型自己读，其余在超时内拉取，记 artifact_init_bundle 埋点。
 */
async function fetchInitReferences(target, options) {
  let { typeSlug, typeFiles, instructions, context } = options;
  let instructionsKey = instructions === undefined ? undefined : instructionsTypeKey(instructions);
  let referenceUrls =
    instructionsKey === undefined ? undefined : TYPE_REFERENCE_URL_BY_TYPE.get(instructionsKey);
  if (referenceUrls === undefined || getAttestationKind(typeSlug) !== "first_party_type") return {};
  let wantedUrls =
    typeFiles.length > 0 ? referenceUrls.filter((url) => typeFiles.includes(url)) : referenceUrls;
  let filtered = wantedUrls.filter((url) => options.onDisk?.includes(url) !== true);
  if (filtered.length === 0) {
    if (wantedUrls.length > 0)
      logFeatureOk("artifact_init_bundle", {
        references: 0,
        unread: 0,
        fetch_failed: 0,
        on_disk: wantedUrls.length,
      });
    return {};
  }
  let combinedAbortSignal = createCombinedAbortSignal(context.abortController.signal, {
    timeoutMs: TYPE_INSTRUCTIONS_READ_MS,
    refTimer: true,
  });
  try {
    let viewerUrl = artifactViewerUrlFor(target);
    let results = await Promise.all(
      filtered.map((url) =>
        hasDesignSystemReadRule(target, viewerUrl, "read_file", context, {
          fields: {
            path: url,
          },
          pipelineRan: true,
        })
          ? Promise.resolve({
              path: url,
              why: "a permission rule governs reading it \u2014 read it yourself and that rule decides",
            })
          : raceWithDeadline(
              readArtifactFile(
                target,
                url,
                combinedAbortSignal.signal,
                context.credentials,
                "artifact_type_reference_read",
              ).then((artifactFile) => {
                if (artifactFile.err === null)
                  return {
                    path: url,
                    text: artifactFile.html,
                  };
                return {
                  path: url,
                  ...(artifactFile.missingFile !== true && {
                    fetchFailed: true,
                  }),
                  why:
                    artifactFile.missingFile === true
                      ? "not among the files of this release"
                      : "it could not be fetched \u2014 read it yourself",
                };
              }),
              combinedAbortSignal.signal,
              context,
              (failure) => ({
                path: url,
                why: `${READ_FAILURE_REASONS[failure]} \u2014 read it yourself`,
              }),
            ),
      ),
    );
    let flattened = results.flatMap((result) =>
      "text" in result && result.text.trim() !== ""
        ? [clipGuideText(result.path, result.text, INIT_REFERENCE_FETCH_TIMEOUT_MS)]
        : [],
    );
    let flattened_2 = results.flatMap((result) =>
      "why" in result
        ? [
            {
              path: result.path,
              why: result.why,
            },
          ]
        : [],
    );
    let fetchFailedCount = countWhere(
      results,
      (result) => "fetchFailed" in result && result.fetchFailed === true,
    );
    if (flattened.length === 0 && fetchFailedCount > 0)
      logFeatureSad("artifact_init_bundle", "references_unread");
    else
      logFeatureOk("artifact_init_bundle", {
        references: flattened.length,
        unread: flattened_2.length,
        fetch_failed: fetchFailedCount,
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
//@ chunk-xzmy9dn4.js:322603-322682 placement
/**
 * 「仅配设计系统使用，而此账号未列出」的说明。
 */
var NO_DESIGN_SYSTEM_NOTE = "only of use with a design system, and none is listed for this account";
//@ chunk-xzmy9dn4.js:322682-323031 placement
/**
 * 扣留已在类型文件中的初始参考页：把这些页从 init_references.docs 移到 unavailable（附原因）并记埋点；无重叠时原样返回。
 */
function withholdInitReferences(result, typeKey, loadedNone) {
  let initReferences = result.init_references;
  if (!loadedNone || initReferences === undefined) return result;
  let designPaths = inlinedByCreateDesignPaths(typeKey);
  let filtered = initReferences.docs.filter((doc) => designPaths.includes(doc.path));
  if (filtered.length === 0) return result;
  logFeatureOk("artifact_init_reference_withheld", {
    pages: filtered.length,
  });
  return {
    init_references: {
      docs: initReferences.docs.filter((doc) => !designPaths.includes(doc.path)),
      unavailable: [
        ...(initReferences.unavailable ?? []),
        ...filtered.map((doc) => ({
          path: doc.path,
          why: NO_DESIGN_SYSTEM_NOTE,
        })),
      ],
    },
  };
}
//@ chunk-xzmy9dn4.js:323031-323089 placement
/**
 * 类型参考页 id 的合法格式。
 */
var ARTIFACT_TYPE_REFERENCE_ID_REGEX = /^artifact-type\/reference\/[A-Za-z0-9_.-]{1,80}$/;
//@ chunk-xzmy9dn4.js:323089-324201 placement
/**
 * 把 init_references 渲染成结果尾部：附上参考页面内容（注明不要再取），以及未能附上的页面及原因。
 */
function renderInitReferences(result) {
  let parsed = objectSchema(initReferencesSchema()).safeParse({
    init_references: result.init_references,
  });
  let initReferences = parsed.success ? parsed.data.init_references : undefined;
  if (initReferences === undefined) return "";
  let mapped = initReferences.docs
    .filter((doc) => ARTIFACT_TYPE_REFERENCE_ID_REGEX.test(doc.path) && doc.text !== "")
    .map((doc) => {
      let initReferences = clipGuideText(doc.path, doc.text, INIT_REFERENCE_FETCH_TIMEOUT_MS);
      return {
        ...initReferences,
        chars: Math.max(initReferences.chars, doc.chars),
        clipped: initReferences.clipped === true || doc.clipped === true,
      };
    });
  let docsMapped = new Map();
  for (let doc of initReferences.unavailable ?? [])
    if (ARTIFACT_TYPE_REFERENCE_ID_REGEX.test(doc.path)) {
      let unavailable = sanitizeBracketText(doc.why, INIT_REFERENCE_MAX_DOCS);
      docsMapped.set(unavailable, [...(docsMapped.get(unavailable) ?? []), doc.path]);
    }
  let mapped_2 = [...docsMapped].map(([item, mapped_2]) => `${mapped_2.join(", ")} (${item})`);
  if (mapped.length === 0)
    return mapped_2.length > 0
      ? `

[Type reference pages not attached: ${mapped_2.join("; ")}.]`
      : "";
  let any = mapped.some((doc) => doc.clipped);
  return (
    `

The type's reference pages that its instructions above say to read first follow \u2014 ${mapped.map((doc) => doc.path).join(", ")}, the same files a read of this Artifact returns; do not fetch them again${any ? " unless you need a clipped remainder" : ""}.${mapped_2.length > 0 ? ` Not attached: ${mapped_2.join("; ")}.` : ""}

` +
    mapped.map((doc) => {
      let clipNote = doc.clipped
        ? `
[\u2026clipped at ${Array.from(doc.text).length} of ${doc.chars} characters; read the whole page if you need the rest]`
        : "";
      return `${doc.path}:
${fileInlineEnvelope(doc.text + clipNote)}`;
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
