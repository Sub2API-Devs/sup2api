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
import { LDo } from "../../../services/artifacts/publishedFiles.js";
import { AbortError } from "../../../utils/errors.js";
import { count } from "../../../utils/collections.js";
import { safeJsonQuote } from "../../../services/artifacts/contentTypes.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { MAX_PUBLISHED_PATH_LENGTH } from "../../../services/artifacts/artifactUrl.js";
import { formatPathList } from "../../../services/artifacts/artifactTypeRelease.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { sanitizeDisplayTitle } from "../../../utils/textNormalize.js";
import { ARTIFACT_TYPE_REFERENCES, N$s, $$s } from "../../../services/artifacts/artifactTypeReferences.js";
import { getAttestationKind } from "../../../services/artifacts/attestation.js";
import { createCombinedAbortSignal } from "../../../utils/combinedAbortSignal.js";
import { artifactViewerUrlFor } from "../artifactUrls.js";
import { hasDesignSystemReadRule } from "../../../services/artifacts/designSystemReadRules.js";
import {
  raceWithDeadline,
  ssn,
  clipGuideText,
  sanitizeBracketText,
} from "../../../services/artifacts/designSystemGuide.js";
import { readArtifactFileViaWebFetch } from "../../../services/artifacts/webfetchRead.js";
import { u } from "../../../../vendor/zod/v4/classic/schemas.js";
import { initReferencesSchema } from "../startKitSchemas.js";
import { fileInlineEnvelope } from "../../../services/artifacts/readArtifactForModel.js";

/**
 * read 一个 Artifact 类型链接（而非实例）时：读取类型自带说明文件（如有），返回 {artifact_type, read_of_type_link}。
 */
//@ chunk-8wvtd8sr.js:314931-315141 placement
async function readTypeLinkDescription(e, n, s) {
  let r = n.shipsInstructions
    ? await readTypeOwnInstructions(e, s.abortController.signal, s.credentials, n.files, !1)
    : null;
  return (
    logFeatureOk("artifact_type_link_read", { path: !1 }),
    { artifact_type: artifactTypeResult(n, r), read_of_type_link: !0 }
  );
}
/**
 * 读取类型的单个文件（NFC 规范化路径）：成功返回内容/字数，否则给出 unread 原因（未列出/扣留/非文本/过大/不可用），并标记目录服务是否不可用。
 */
//@ chunk-8wvtd8sr.js:315141-315604 placement
async function readOneTypeFile(typeRef, typeInfo, path, context) {
  let normalized = path.normalize("NFC"),
    y = await readArtifactTypeFile(typeRef.slug, normalized, {
      signal: context.abortController.signal,
      credentials: context.credentials,
    }),
    p =
      y.kind === "read"
        ? void 0
        : y.kind === "withheld" && typeInfo.filesOmitted === 0 && !typeInfo.files.includes(normalized)
          ? "not_listed"
          : y.kind;
  return {
    typeFile: {
      path: normalized,
      ...(y.kind === "read" && { content: y.text, chars: y.chars, ...(y.clipped && { clipped: !0 }) }),
      ...(p !== void 0 && { unread: p }),
      ...(y.kind === "unavailable" && { why: y.why }),
    },
    catalogDown: y.kind === "unavailable" && CATALOG_DOWN_REASONS.has(y.reason),
  };
}
/**
 * 读取 Artifact 类型链接指向的类型文件，记埋点，返回类型信息与类型文件结果。
 */
//@ chunk-8wvtd8sr.js:315604-315844 placement
async function readTypeLinkFile(e, n, s, r) {
  let { typeFile: typeFile } = await readOneTypeFile(e, n, s, r);
  if (typeFile.unread === void 0) logFeatureOk("artifact_type_link_read", { path: !0 });
  else logFeatureSad("artifact_type_link_read", typeFile.unread, { path: !0 });
  return { artifact_type: artifactTypeResult(n, null), read_of_type_link: !0, type_file: typeFile };
}
/**
 * 按 paths 读取类型的多个文件（数量与结果字符预算有上限）：已有目录不可用时后续路径直接标记 unavailable，超出预算的标 result_full，记 artifact_type_link_read 埋点。
 */
//@ chunk-8wvtd8sr.js:315844-316694 placement
async function readTypeLinkFiles(typeRef, typeInfo, paths, context, renderFile) {
  let y = { artifact_type: artifactTypeResult(typeInfo, null), read_of_type_link: !0 },
    p = (V) => renderFile({ ...y, type_file: V }),
    budgetLeft = TYPE_FILES_RESULT_BUDGET,
    catalogDownWhy,
    S = 0,
    results = await Promise.all(
      paths.slice(0, MAX_TYPE_FILES_PER_READ).map(
        limitConcurrency(LDo, async ({ path: path, setAside: setAside }) => {
          if (context.abortController.signal.aborted) throw new AbortError();
          if (budgetLeft < 0) return { path: path, unread: "result_full" };
          let x;
          if (setAside !== void 0) x = { path: path, unread: "unavailable", why: setAside };
          else if (catalogDownWhy !== void 0)
            (S++,
              (x = {
                path: path,
                unread: "unavailable",
                why: `not requested, because the request for an earlier path failed: ${catalogDownWhy}`,
              }));
          else {
            let q = await readOneTypeFile(typeRef, typeInfo, path, context);
            if (((x = q.typeFile), q.catalogDown)) catalogDownWhy ??= x.why;
          }
          return ((budgetLeft -= p(x).length), x);
        }),
      ),
    ),
    T = countFittingFiles(results, p),
    mapped = paths.map(({ path: path }, M) => (M < T ? results[M] : { path: path, unread: "result_full" })),
    L = {
      path: !0,
      paths: mapped.length,
      read: count(mapped, (V) => V.unread === void 0),
      skipped_catalog_down: S,
    };
  if (L.read > 0) logFeatureOk("artifact_type_link_read", L);
  else logFeatureSad("artifact_type_link_read", "none_read", L);
  return { ...y, type_files_read: mapped };
}
//@ chunk-8wvtd8sr.js:316694-316827 placement
function countFittingFiles(e, n) {
  let s = TYPE_FILES_RESULT_BUDGET,
    r = 0;
  for (let h of e.slice(0, MAX_TYPE_FILES_PER_READ)) {
    if (h.unread === "result_full") break;
    if (((s -= n(h).length), s < 0)) break;
    r++;
  }
  return r;
}
/**
 * url 指向 Artifact 类型本身（而非由它创建的 Artifact）时的读取说明前缀。
 */
//@ chunk-8wvtd8sr.js:316827-317007 placement
function typeLinkReadPrefix(e) {
  return `That url is the ${Va(e)} Artifact type itself, not an Artifact made from it, so there is no Artifact content to read here; the type's description follows.

`;
}
/**
 * 读取类型文件的结果标题：文件为空或显示了多少字符（不写入磁盘）。
 */
//@ chunk-8wvtd8sr.js:317007-317231 placement
function typeFileReadHeader(e, n, s, r) {
  return r
    ? `Read ${safeJsonQuote(e)} from the ${Va(s)} Artifact type: the file is empty; nothing was saved to disk.`
    : `Read ${safeJsonQuote(e)} (${n} characters) from the ${Va(s)} Artifact type; shown below, not saved to disk.`;
}
/**
 * 渲染读到的多个类型文件：预算内的逐个显示，其余只列路径。
 */
//@ chunk-8wvtd8sr.js:317231-317358 placement
function renderTypeFilesRead(e, n) {
  let s = countFittingFiles(e, n),
    mapped = e.slice(0, s).map(n);
  if (s < e.length) mapped.push(notReadPathsNote(e.slice(s).map((h) => h.path)));
  return mapped.join(`

`);
}
//@ chunk-8wvtd8sr.js:317358-317653 placement
function notReadPathsNote(e) {
  let n = safeJsonQuote(truncateToLength(e[0] ?? "", MAX_PUBLISHED_PATH_LENGTH)),
    [s, r] =
      e.length === 1
        ? ["", "it"]
        : [` and the ${e.length === 2 ? "one" : e.length - 1} after it in \`paths\``, "them"];
  return `Not read: ${n}${s}. One read of a type's files shows at most ${MAX_TYPE_FILES_PER_READ} files and about ${TYPE_FILES_RESULT_BUDGET} characters; to read ${r}, pass ${r} in another call.`;
}
/**
 * 类型文件未读时给模型的说明：扣留、不在文件列表、非文本、过大、目录不可用或结果已满；可读时提示用由该类型创建的 Artifact 的 url 去读。
 */
//@ chunk-8wvtd8sr.js:317653-318756 placement
function typeFileUnreadMessage(file, typeInfo, creatingFromType) {
  let r = safeJsonQuote(file.path),
    h = Va(typeInfo.title),
    y = creatingFromType
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
function Va(e) {
  return jsonStringify(sanitizeDisplayTitle(e) ?? "Untitled");
}
//@ chunk-8wvtd8sr.js:318799-318868 placement
var Ib = new Map([...ARTIFACT_TYPE_REFERENCES.keys()].map((e) => [e, N$s(e)])),
  hp = 24000,
  Lb = 200;
/**
 * 第一方类型创建后预取其说明文件要求先读的参考页面（按说明类型查表、排除已在磁盘的）：受权限规则约束的交给模型自己读，其余在超时内拉取，记 artifact_init_bundle 埋点。
 */
//@ chunk-8wvtd8sr.js:318868-320333 placement
async function fetchInitReferences(target, options) {
  let { typeSlug: typeSlug, typeFiles: typeFiles, instructions: instructions, context: context } = options,
    p = instructions === void 0 ? void 0 : instructionsTypeKey(instructions),
    w = p === void 0 ? void 0 : Ib.get(p);
  if (w === void 0 || getAttestationKind(typeSlug) !== "first_party_type") return {};
  let A = typeFiles.length > 0 ? w.filter((T) => typeFiles.includes(T)) : w,
    filtered = A.filter((T) => options.onDisk?.includes(T) !== !0);
  if (filtered.length === 0) {
    if (A.length > 0)
      logFeatureOk("artifact_init_bundle", { references: 0, unread: 0, fetch_failed: 0, on_disk: A.length });
    return {};
  }
  let R = createCombinedAbortSignal(context.abortController.signal, {
    timeoutMs: TYPE_INSTRUCTIONS_READ_MS,
    refTimer: !0,
  });
  try {
    let T = artifactViewerUrlFor(target),
      results = await Promise.all(
        filtered.map((x) =>
          hasDesignSystemReadRule(target, T, "read_file", context, { fields: { path: x }, pipelineRan: !0 })
            ? Promise.resolve({
                path: x,
                why: "a permission rule governs reading it \u2014 read it yourself and that rule decides",
              })
            : raceWithDeadline(
                readArtifactFileViaWebFetch(
                  target,
                  x,
                  R.signal,
                  context.credentials,
                  "artifact_type_reference_read",
                ).then((q) => {
                  if (q.err === null) return { path: x, text: q.html };
                  return {
                    path: x,
                    ...(q.missingFile !== !0 && { fetchFailed: !0 }),
                    why:
                      q.missingFile === !0
                        ? "not among the files of this release"
                        : "it could not be fetched \u2014 read it yourself",
                  };
                }),
                R.signal,
                context,
                (q) => ({ path: x, why: `${ssn[q]} \u2014 read it yourself` }),
              ),
        ),
      ),
      flattened = results.flatMap((x) =>
        "text" in x && x.text.trim() !== "" ? [clipGuideText(x.path, x.text, hp)] : [],
      ),
      flattened_2 = results.flatMap((x) => ("why" in x ? [{ path: x.path, why: x.why }] : [])),
      M = count(results, (x) => "fetchFailed" in x && x.fetchFailed === !0);
    if (flattened.length === 0 && M > 0) logFeatureSad("artifact_init_bundle", "references_unread");
    else
      logFeatureOk("artifact_init_bundle", {
        references: flattened.length,
        unread: flattened_2.length,
        fetch_failed: M,
      });
    return {
      init_references: { docs: flattened, ...(flattened_2.length > 0 && { unavailable: flattened_2 }) },
    };
  } finally {
    R.cleanup();
  }
}
//@ chunk-8wvtd8sr.js:320333-320412 placement
var Db = "only of use with a design system, and none is listed for this account";
/**
 * 扣留已在类型文件中的初始参考页：把这些页从 init_references.docs 移到 unavailable（附原因）并记埋点；无重叠时原样返回。
 */
//@ chunk-8wvtd8sr.js:320412-320761 placement
function withholdInitReferences(e, n, s) {
  let init_references = e.init_references;
  if (!s || init_references === void 0) return e;
  let h = $$s(n),
    filtered = init_references.docs.filter((doc) => h.includes(doc.path));
  if (filtered.length === 0) return e;
  return (
    logFeatureOk("artifact_init_reference_withheld", { pages: filtered.length }),
    {
      init_references: {
        docs: init_references.docs.filter((doc) => !h.includes(doc.path)),
        unavailable: [
          ...(init_references.unavailable ?? []),
          ...filtered.map((p) => ({ path: p.path, why: Db })),
        ],
      },
    }
  );
}
//@ chunk-8wvtd8sr.js:320761-320819 placement
var fp = /^artifact-type\/reference\/[A-Za-z0-9_.-]{1,80}$/;
/**
 * 把 init_references 渲染成结果尾部：附上参考页面内容（注明不要再取），以及未能附上的页面及原因。
 */
//@ chunk-8wvtd8sr.js:320819-321931 placement
function renderInitReferences(e) {
  let safeParse = u(initReferencesSchema()).safeParse({ init_references: e.init_references }),
    s = safeParse.success ? safeParse.data.init_references : void 0;
  if (s === void 0) return "";
  let mapped = s.docs
      .filter((doc) => fp.test(doc.path) && doc.text !== "")
      .map((w) => {
        let A = clipGuideText(w.path, w.text, hp);
        return { ...A, chars: Math.max(A.chars, w.chars), clipped: A.clipped === !0 || w.clipped === !0 };
      }),
    h = new Map();
  for (let w of s.unavailable ?? [])
    if (fp.test(w.path)) {
      let A = sanitizeBracketText(w.why, Lb);
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
