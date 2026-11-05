/**
 * services/mcp/driveFileReferences.ts
 *
 * 2.1.316 新增：Google Drive 文件引用处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hs37d1w3.js (42)
 * attribution: placement 40, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep, basename } from "path";
import {
  isVmSessionsPath,
  screenUploadPath,
  assertPathNotBlocked,
  pathRejectionKind,
} from "../fileInputs/screenPath.js";
import {
  isSha256Value,
  fileReferenceValues,
  CREATE_DRAFT_ROW,
} from "./fileReference/wrapFileReferenceTool.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import {
  fitsLimit,
  addressLines,
  fileLines,
  fileReferenceUnavailableReason,
  disklessHostState,
} from "./fileReference/fileReferencePolicy.js";
import { getPlatform } from "../../utils/platform.js";
import { screenUnreadUpload } from "../../utils/claudeInChrome/fileUpload.js";
import { isUploadAllowedPath, statUploadCandidate } from "../fileInputs/uploadPut.js";
import { logForDebugging } from "../../utils/debug.js";
import { isDiskless } from "../../bootstrap/state.js";
import { FILE_UPLOAD_UNAVAILABLE } from "../../utils/claudeInChrome/common.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { isWellFormedString, countCharInString } from "../../utils/stringUtils.js";
import {
  isPathAbsent,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizeErrnoForTelemetry,
} from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hs37d1w3.js:6612-6769 placement
/**
 * 判断文件引用是否是 Windows 盘符形式（sha256:<哈希>:X:...）。
 */
function isWindowsForm(value) {
  let buffer = Buffer.from(value.slice(0, 80), "utf8");
  let colonIndex = 72;
  let driveLetterCode = buffer[72] ?? 0;
  return (
    value.startsWith("sha256:") &&
    buffer[71] === 58 &&
    ((driveLetterCode >= 65 && driveLetterCode <= 90) || (driveLetterCode >= 97 && driveLetterCode <= 122)) &&
    buffer[73] === 58
  );
}
//@ chunk-hs37d1w3.js:6769-6962 placement
var MAX_REFERENCE_PATH_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_REFERENCE_PATH_DEPTH;
var EXPECTED_REFUSALS;
deferInit("chunk-hs37d1w3.js:6769", () => {
  MAX_REFERENCE_PATH_BYTES = 1024;
  MAX_REFERENCE_PATH_DEPTH = 32;
  EXPECTED_REFUSALS = new Set([
    "not_available",
    "ref_malformed",
    "checksum_mismatch",
    "changed_after_check",
    "empty_file",
    "wrong_field",
    "fields_missing",
    "not_found",
    "outside_roots",
    "refused_kind",
  ]);
});
//@ chunk-hs37d1w3.js:6962-7025 placement
function pathKindMeta(path) {
  return isVmSessionsPath(path)
    ? {
        fileRefPathKind: "vm_sessions",
      }
    : {};
}
//@ chunk-hs37d1w3.js:7025-7302 placement
/**
 * 解析文件引用 sha256:<64 位哈希>:<绝对路径>，返回哈希、路径与路径形式，或 not_a_reference / ref_malformed。
 */
function parseFileReference(value) {
  if (!value.startsWith("sha256:")) return "not_a_reference";
  let match = /^sha256:([0-9a-f]{64}):([^]*)$/.exec(value);
  if (match === null) return "ref_malformed";
  let [, hash = "", path = ""] = match;
  let matches = /^[A-Za-z]:\//.test(path);
  return isWellFormedReferencePath(path, matches ? path.slice(2) : path)
    ? {
        sha256: hash,
        path,
        form: matches ? "windows" : "posix",
      }
    : "ref_malformed";
}
//@ chunk-hs37d1w3.js:7302-7347 placement
/**
 * 把可选值包装成 { entry }（未提供时为空对象）。
 */
function wrapEntry(entry) {
  return entry === undefined
    ? {}
    : {
        entry,
      };
}
//@ chunk-hs37d1w3.js:7347-8401 placement
/**
 * 检查工具调用中的文件引用：错误字段、格式错误、大小写重复的键，返回有效引用列表或错误。
 */
function checkCall(args, toolSpec) {
  let found = toolSpec.wrongArguments.find((wrongArgument) => isSha256Value(args[wrongArgument]));
  if (found !== undefined)
    return {
      error: "wrong_field",
      field: found,
    };
  let references = [];
  for (let { entry, value } of fileReferenceValues(args, toolSpec)) {
    if (typeof value !== "string") continue;
    let fileReference = parseFileReference(value);
    if (fileReference === "ref_malformed")
      return {
        error: "ref_malformed",
        ...wrapEntry(entry),
      };
    if (fileReference !== "not_a_reference")
      references.push({
        entry,
        reference: value,
        sha256: fileReference.sha256,
        path: fileReference.path,
      });
  }
  if (references.length === 0) return "not_a_reference";
  let duplicateKey = findCaseFoldDuplicateKey(args);
  if (duplicateKey !== undefined)
    return {
      error: "fields_missing",
      case: "duplicate",
      ...duplicateKey,
    };
  let argumentValue = args[toolSpec.argument];
  for (let { entry } of references) {
    let entryValue = entry !== undefined && Array.isArray(argumentValue) ? argumentValue[entry] : undefined;
    let duplicateKey = isPlainObject(entryValue) ? findCaseFoldDuplicateKey(entryValue) : undefined;
    if (duplicateKey !== undefined)
      return {
        error: "fields_missing",
        case: "duplicate",
        ...duplicateKey,
        ...wrapEntry(entry),
      };
  }
  if (toolSpec.recipientCheck === "other_tool")
    return {
      error: "not_available",
    };
  let message_2 = recipientsNotShown(args, toolSpec.recipientCheck);
  if (message_2 !== undefined)
    return {
      error: "not_available",
      case: message_2,
    };
  if (toolSpec.recipientCheck === undefined)
    return {
      references,
    };
  let modelLimit = gmailShapeRefusal(args, toolSpec);
  if (modelLimit !== undefined) return modelLimit;
  return JSON.stringify(args).length > MAX_TOTAL_JSON_BYTES ||
    !fitsLimit([
      toolSpec.firstReferenceQuestion ?? "",
      ...addressLines(args),
      ...fileLines(references.map(({ path }) => path)),
    ])
    ? {
        error: "not_available",
        case: "too_long_for_card",
      }
    : {
        references,
      };
}
//@ chunk-hs37d1w3.js:8401-8517 placement
function replaceLoneSurrogates(text) {
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "\uFFFD");
}
//@ chunk-hs37d1w3.js:8517-8725 placement
var ALLOWED_ARGUMENT_NAMES = [
  "to",
  "cc",
  "bcc",
  "subject",
  "body",
  "htmlBody",
  "attachments",
  "replyToMessageId",
  "draftId",
  "replyThreadId",
  "includeSignature",
];
var TEXT_ARGUMENT_NAMES = ["subject", "body", "htmlBody", "replyToMessageId", "draftId", "replyThreadId"];
//@ chunk-hs37d1w3.js:8725-8980 placement
function firstNonTextArgument(args) {
  return hasPrefix([
    ...TEXT_ARGUMENT_NAMES.filter((argumentName) => {
      let argumentValue = Object.hasOwn(args, argumentName) ? args[argumentName] : undefined;
      return argumentValue !== undefined && argumentValue !== null && typeof argumentValue !== "string";
    }),
    ...(args.includeSignature === undefined ||
    args.includeSignature === null ||
    typeof args.includeSignature === "boolean"
      ? []
      : ["includeSignature"]),
  ]);
}
//@ chunk-hs37d1w3.js:8980-9042 placement
var ATTACHMENT_FIELD_NAMES = ["content", "filename", "mimeType", "mime_type", "inline"];
//@ chunk-hs37d1w3.js:9042-9767 placement
/**
 * Gmail 调用参数的形状校验：未知参数、非文本参数、非法回复 id、过长主题、附件过多逐项返回原因码。
 */
function gmailShapeRefusal(args, toolSpec) {
  let unknownArgumentKey = hasPrefix(
    Object.keys(args).filter((argumentName) => !ALLOWED_ARGUMENT_NAMES.includes(argumentName)),
  );
  if (unknownArgumentKey !== undefined)
    return {
      error: "not_available",
      case: "unknown_argument",
      key: unknownArgumentKey,
    };
  let nonTextArgumentKey = firstNonTextArgument(args);
  if (nonTextArgumentKey !== undefined)
    return {
      error: "not_available",
      case: "argument_not_text",
      key: nonTextArgumentKey,
    };
  let replyId = args.replyToMessageId;
  if (typeof replyId === "string" && replyId !== "" && !/^[0-9a-fA-F]{8,32}$/.test(replyId))
    return {
      error: "not_available",
      case: "reply_id_invalid",
      key: "replyToMessageId",
    };
  let subject = typeof args.subject === "string" ? args.subject : "";
  if (
    CONTROL_CHAR_RE.test(subject) ||
    hasUnsafeChars(subject) ||
    subject.includes("=?") ||
    [...subject].length > 250
  )
    return {
      error: "not_available",
      case: "subject_unsafe",
      key: "subject",
    };
  let attachments = Array.isArray(args.attachments) ? args.attachments : [];
  if (attachments.length > (toolSpec.maxAttachments ?? 1 / 0))
    return {
      error: "not_available",
      case: "too_many_attachments",
    };
  return checkAttachments(attachments);
}
//@ chunk-hs37d1w3.js:9767-9781 placement
/**
 * Gmail 附件内容允许的最大字节数。
 */
var MAX_TOTAL_JSON_BYTES = 150000;
//@ chunk-hs37d1w3.js:9781-10730 placement
/**
 * Gmail 附件校验：附件不是对象、inline 非布尔、缺字段、重名、文件名/类型不安全逐项返回原因码。
 */
function checkAttachments(attachments) {
  for (let [entryIndex, attachment] of attachments.entries()) {
    if (!isPlainObject(attachment))
      return {
        error: "not_available",
        case: "attachment_not_object",
        entry: entryIndex,
      };
    let badFieldKey = hasPrefix([
      ...Object.entries(attachment).flatMap(([fieldName, fieldValue]) =>
        !ATTACHMENT_FIELD_NAMES.includes(fieldName) ||
        (fieldName === "inline"
          ? fieldValue !== null && typeof fieldValue !== "boolean"
          : typeof fieldValue !== "string" && (fieldValue !== null || fieldName === "content"))
          ? [fieldName]
          : [],
      ),
      ...(Object.hasOwn(attachment, "content") ? [] : ["content"]),
    ]);
    if (badFieldKey !== undefined)
      return {
        error: "not_available",
        case: "attachment_field",
        key: badFieldKey,
        entry: entryIndex,
      };
    let duplicateFieldKey = findCaseFoldDuplicateKey(attachment);
    if (duplicateFieldKey !== undefined)
      return {
        error: "fields_missing",
        case: "duplicate",
        ...duplicateFieldKey,
        entry: entryIndex,
      };
    let unsafeFieldKey = hasPrefix(
      ["filename", "mimeType", "mime_type"].filter((fieldName) => {
        let fieldValue = typeof attachment[fieldName] === "string" ? attachment[fieldName] : "";
        return (
          CONTROL_CHAR_RE.test(fieldValue) ||
          hasUnsafeChars(fieldValue) ||
          fieldValue.includes("=?") ||
          /%[0-9A-Fa-f]{2}/.test(fieldValue) ||
          [...fieldValue].length > 120 ||
          (fieldName === "filename" &&
            (/["\\/;]/.test(fieldValue) || (fieldValue !== "" && !/[\p{L}\p{Nd}]/u.test(fieldValue)))) ||
          (fieldName !== "filename" &&
            fieldValue !== "" &&
            !/^[!#$%&'*+\-.0-9A-Z^_`a-z{|}~]+\/[!#$%&'*+\-.0-9A-Z^_`a-z{|}~]+$/.test(fieldValue))
        );
      }),
    );
    if (unsafeFieldKey !== undefined)
      return {
        error: "not_available",
        case: "attachment_unsafe",
        key: unsafeFieldKey,
        entry: entryIndex,
      };
  }
  return;
}
//@ chunk-hs37d1w3.js:10730-10791 placement
var INVISIBLE_CHAR_RE = /(?![\u200C\u200D\u00AD])[\p{Cf}\p{Co}\p{Cs}\uFFFD]/u;
//@ chunk-hs37d1w3.js:10791-10831 placement
function hasUnsafeChars(text) {
  return INVISIBLE_CHAR_RE.test(text) || hasTooManyCombiningMarks(text);
}
//@ chunk-hs37d1w3.js:10831-10940 placement
var STACKING_SIGN_CODEPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hs37d1w3.js:10831", () => {
  STACKING_SIGN_CODEPOINTS = new Set([
    4153, 6098, 6752, 6980, 7083, 43456, 43766, 68159, 69939, 70608, 71998, 72263, 72345, 73029, 73111, 73538,
  ]);
});
//@ chunk-hs37d1w3.js:10940-11260 placement
/**
 * 按码位判断一个字符是否算作 Gmail 的安全字符。
 */
function hasTooManyCombiningMarks(text) {
  let combiningRunLength = 0;
  let stackingRunLength = 0;
  let sawStackingSign = false;
  for (let character of replaceLoneSurrogates(text)) {
    let codePoint = character.codePointAt(0) ?? 0;
    if (STACKING_SIGN_CODEPOINTS.has(codePoint)) {
      stackingRunLength++;
      if (stackingRunLength > 4) return true;
      sawStackingSign = true;
    }
    let isUnassignedCodePoint = /\p{Cn}/u.test(character);
    let isSymbolOrEnclosedRange =
      (codePoint >= 126976 && codePoint <= 129791) || (codePoint >= 8352 && codePoint <= 8399);
    if (/[\p{Mn}\p{Me}]/u.test(character) || (isUnassignedCodePoint && !isSymbolOrEnclosedRange)) {
      combiningRunLength++;
      if (combiningRunLength > 4) return true;
    } else if (!(/[\p{Cf}\p{Mc}]/u.test(character) || isUnassignedCodePoint || codePoint === 65533)) {
      combiningRunLength = 0;
      if (!sawStackingSign) stackingRunLength = 0;
      sawStackingSign = false;
    }
  }
  return false;
}
//@ chunk-hs37d1w3.js:11260-11323 placement
var CONTROL_CHAR_RE = /[\u0000-\u0008\u000A-\u001F\u007F-\u009F\u2028\u2029]/;
//@ chunk-hs37d1w3.js:11323-11432 placement (2.1.88 match: hasPrefix, 1)
function hasPrefix(candidates) {
  return candidates.reduce(
    (smallestSoFar, candidate) =>
      smallestSoFar === undefined || Buffer.compare(Buffer.from(candidate), Buffer.from(smallestSoFar)) < 0
        ? candidate
        : smallestSoFar,
    undefined,
  );
}
//@ chunk-hs37d1w3.js:11432-11456 placement
var RECIPIENT_FIELD_NAMES = ["to", "cc", "bcc"];
//@ chunk-hs37d1w3.js:11546-11675 placement
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  return isPlainObject(value)
    ? Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, sortKeysDeep(value[key])]),
      )
    : value;
}
//@ chunk-hs37d1w3.js:11675-12177 placement
/**
 * 算出收件人里的“不点名”情况：草稿更新、回复线程、只按 draftId 保存时提示哪些收件人没写。
 */
function recipientsNotShown(args, recipientCheck) {
  if (recipientCheck === undefined) return;
  if (recipientCheck === "never") return "draft_update";
  if (hasKeyInsensitive(args, "draftId")) return "saved_draft";
  if (recipientCheck === "draft" && hasKeyInsensitive(args, "replyToMessageId")) return "draft_reply";
  let any = Object.entries(args).some(
    ([key, value]) =>
      value !== null &&
      value !== "" &&
      value !== undefined &&
      RECIPIENT_FIELD_NAMES.some(
        (recipientField) => key !== recipientField && foldKeyName(key) === foldKeyName(recipientField),
      ),
  );
  if (
    hasKeyInsensitive(args, "threadId") ||
    hasKeyInsensitive(args, "replyThreadId") ||
    any ||
    !areRecipientsPlain(args) ||
    (hasKeyInsensitive(args, "replyToMessageId") &&
      !namesAnyAddress(Object.hasOwn(args, "to") ? args.to : undefined))
  )
    return "recipients_not_named";
  return RECIPIENT_FIELD_NAMES.some((recipientField) =>
    namesAnyAddress(Object.hasOwn(args, recipientField) ? args[recipientField] : undefined),
  )
    ? undefined
    : "recipients_not_named";
}
//@ chunk-hs37d1w3.js:12177-12275 placement
function hasKeyInsensitive(args, expectedKey) {
  return Object.entries(args).some(
    ([key, value]) =>
      foldKeyName(key) === foldKeyName(expectedKey) && value !== null && value !== "" && value !== undefined,
  );
}
//@ chunk-hs37d1w3.js:12275-12485 placement
function areRecipientsPlain(args) {
  let addressCount = 0;
  for (let recipientField of RECIPIENT_FIELD_NAMES) {
    let recipientValue = Object.hasOwn(args, recipientField) ? args[recipientField] : undefined;
    if (recipientValue === undefined || recipientValue === null) continue;
    let addresses = Array.isArray(recipientValue) ? recipientValue : [recipientValue];
    for (let address of addresses) {
      addressCount++;
      if (typeof address !== "string" || !isPlainAddress(address)) return false;
    }
  }
  return addressCount <= 25;
}
//@ chunk-hs37d1w3.js:12485-12529 placement
var PLAIN_LOCAL_PART_RE = /^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]+$/;
//@ chunk-hs37d1w3.js:12529-12708 placement
function isPlainAddress(address) {
  let index = address.indexOf("@");
  return (
    Buffer.byteLength(address) <= 254 &&
    !address.includes("=?") &&
    index >= 0 &&
    [address.slice(0, index), address.slice(index + 1)].every(
      (addressPart) =>
        addressPart !== "" && addressPart.split(".").every((label) => PLAIN_LOCAL_PART_RE.test(label)),
    )
  );
}
//@ chunk-hs37d1w3.js:12708-12801 placement
function namesAnyAddress(value) {
  return (Array.isArray(value) ? value : [value]).some(
    (address) => typeof address === "string" && address.includes("@"),
  );
}
//@ chunk-hs37d1w3.js:12801-13184 placement
/**
 * 找出对象中大小写折叠后重复的键（按字节序取最先出现的一对）。
 */
function findCaseFoldDuplicateKey(input) {
  let mapped = Object.keys(input)
    .map((key) => ({
      key,
      bytes: Buffer.from(key, "utf8"),
    }))
    .sort((entryA, entryB) => Buffer.compare(entryA.bytes, entryB.bytes))
    .map((entry) => entry.key);
  let firstIndexByName = new Map();
  let duplicateIndexByName = new Map();
  for (let [index, key] of mapped.entries()) {
    let foldedName = foldKeyName(key);
    let firstIndex = firstIndexByName.get(foldedName);
    if (firstIndex === undefined) firstIndexByName.set(foldedName, index);
    else if (!duplicateIndexByName.has(firstIndex)) duplicateIndexByName.set(firstIndex, index);
  }
  let lowestIndex;
  for (let key of duplicateIndexByName.keys())
    if (lowestIndex === undefined || key < lowestIndex) lowestIndex = key;
  return lowestIndex === undefined
    ? undefined
    : {
        key: mapped[lowestIndex] ?? "",
        also: mapped[duplicateIndexByName.get(lowestIndex) ?? 0] ?? "",
      };
}
//@ chunk-hs37d1w3.js:13184-13359 placement
function foldKeyName(key) {
  return [...key]
    .map((char) => {
      if (char === "_" || char === "-") return "";
      if (/^[\uD800-\uDFFF]$/.test(char)) return "\uFFFD";
      return LEXICAL_CASE_FOLD[char] ?? (/^[A-Z]$/.test(char) ? char.toLowerCase() : char);
    })
    .join("");
}
//@ chunk-hs37d1w3.js:13359-13420 placement
/**
 * 少数 Unicode 字符的大小写折叠表。
 */
var LEXICAL_CASE_FOLD = {
  "\u017F": "s",
  "\u212A": "k",
  "\u0131": "i",
  "\u0130": "i",
};
//@ chunk-hs37d1w3.js:13420-18072 placement
/**
 * 解析 MCP 工具参数里的 Drive 文件引用：检查读取限制、读取文件并替换参数。
 */
async function resolveDriveFileReference(args, context, phase, toolSpec, toolContext, checkedReferences) {
  let formatError = (reason, extra = {}) =>
    formatFileReferenceError(toolSpec, reason, {
      ...extra,
      readsBlocked:
        !toolSpec.hostFills &&
        (context.blockReadsOutsideWorkingDirectories === true || context.restricted === true),
    });
  let notAvailable = (detail) => ({
    ...fileReferenceRefusal(
      toolSpec.featureName,
      "not_available",
      formatError("not_available"),
      detail,
      true,
    ),
    beforeRead: true,
  });
  let refuse = (refuse, refuseWith, error) => ({
    ...fileReferenceRefusal(toolSpec.featureName, refuse, refuseWith, error),
    beforeRead: true,
  });
  let unavailableReason = fileReferenceUnavailableReason(toolSpec);
  if (unavailableReason !== undefined) return notAvailable(unavailableReason);
  if (toolSpec.stillHeld?.() === false) return notAvailable("entry_not_held");
  let isWindows = getPlatform() === "windows";
  let values = fileReferenceValues(args, toolSpec);
  if (
    !isWindows &&
    [
      ...values.map((entry) => entry.value),
      ...toolSpec.wrongArguments.map((wrongArgument) => args[wrongArgument]),
    ].some((value) => typeof value === "string" && isWindowsForm(value))
  )
    return notAvailable("windows_path");
  if (phase === "send") {
    let change;
    if (checkedReferences === undefined) {
      let entry = values.find((candidate) => isSha256Value(candidate.value)) ?? values[0];
      change = {
        now: entry?.value,
        ...wrapEntry(entry?.entry),
        detail: "not_checked",
      };
    } else {
      let checkedByEntry = new Map(checkedReferences.map(({ entry, reference }) => [entry, reference]));
      for (let value of values) {
        let checkedReference = checkedByEntry.get(value.entry);
        if (checkedReference === undefined ? isSha256Value(value.value) : value.value !== checkedReference) {
          change = {
            was: checkedReference,
            now: value.value,
            ...wrapEntry(value.entry),
            detail:
              checkedReference === undefined
                ? "reference_added"
                : isSha256Value(value.value)
                  ? "reference_changed"
                  : "reference_removed",
          };
          break;
        }
      }
      let presentEntries = new Set(values.map((value) => value.entry));
      let found = checkedReferences.find((checkedReference) => !presentEntries.has(checkedReference.entry));
      if (change === undefined && found !== undefined)
        change = {
          was: found.reference,
          now: undefined,
          ...wrapEntry(found.entry),
          detail: "reference_gone",
        };
    }
    if (change !== undefined)
      return refuse(
        "changed_after_check",
        formatError("changed_after_check", {
          name: referencedFileName(change.was) ?? referencedFileName(change.now),
          entry: change.entry,
        }),
        change.detail,
      );
  }
  let check = checkCall(args, toolSpec);
  if (check === "not_a_reference")
    return refuse(
      "wrong_field",
      formatError("wrong_field", {
        field: toolSpec.wrongArguments[0],
      }),
    );
  if ("error" in check) {
    let code = formatError(check.error, {
      field: check.field,
      key: check.key,
      also: check.also,
      entry: check.entry,
      case: check.case,
    });
    return check.error === "not_available"
      ? {
          ...fileReferenceRefusal(toolSpec.featureName, check.error, code, check.case, true),
          beforeRead: true,
        }
      : refuse(check.error, code, check.case);
  }
  let posixOnWindows = isWindows
    ? check.references.find(({ path }) => !/^[A-Za-z]:\//.test(path))
    : undefined;
  if (posixOnWindows !== undefined)
    return {
      ...refuse(
        "ref_malformed",
        formatError("ref_malformed", {
          entry: posixOnWindows.entry,
        }),
        "posix_on_windows",
      ),
      ...pathKindMeta(posixOnWindows.path),
    };
  let files = [];
  let path = 0;
  for (let { entry, reference, sha256, path: path_2 } of check.references) {
    if (toolSpec.hostFills) {
      let pathRejection;
      try {
        let screened = await screenUnreadUpload(path_2, context);
        if (screened.judged.split(sep).join("/") !== path_2)
          pathRejection = {
            reason: "outside_roots",
            detail: "spelling_changed",
          };
        else if (screened.resolved === undefined && screened.linked)
          pathRejection = {
            reason: "outside_roots",
            detail: "link_unresolved",
          };
        else if (await isUploadAllowedPath(path_2, screened.resolved ?? path_2))
          pathRejection = {
            reason: "refused_kind",
            detail: "credential_or_own_file",
          };
      } catch (error) {
        pathRejection = classifyReadFailure(error);
      }
      let unavailableReason = fileReferenceUnavailableReason(toolSpec);
      if (pathRejection === undefined && unavailableReason !== undefined)
        return notAvailable(unavailableReason);
      if (pathRejection === undefined) continue;
      logForDebugging(`[file reference] a path was rejected: ${pathRejection.detail}`);
      return {
        ...fileReferenceRefusal(
          toolSpec.featureName,
          pathRejection.reason,
          formatError("cannot_upload", {
            entry,
            path: path_2,
          }),
          pathRejection.detail,
          true,
        ),
        beforeRead: true,
      };
    }
    let name = basename(path_2);
    let readFailure;
    let uploadCandidate;
    if (isDiskless()) {
      let host = disklessHostState.peek(toolContext.session)?.host;
      if (host === undefined) return notAvailable("diskless");
      let readResult = await host.read([path_2], context, toolSpec.maxFileBytes, toolContext.signal, true);
      if ("error" in readResult) {
        if (readResult.error === FILE_UPLOAD_UNAVAILABLE)
          return fileReferenceRefusal(
            toolSpec.featureName,
            "not_available",
            formatError("not_available"),
            readResult.reason,
            true,
          );
        if (readResult.reason === "daemon_refused")
          return phase === "send"
            ? fileReferenceRefusal(
                toolSpec.featureName,
                "changed_after_check",
                formatError("changed_after_check", {
                  entry,
                  name,
                }),
                "container_refused",
              )
            : fileReferenceRefusal(
                toolSpec.featureName,
                "outside_roots",
                formatError("cannot_upload", {
                  entry,
                  path: path_2,
                }),
                "container_refused",
                true,
              );
        return fileReferenceRefusal(
          toolSpec.featureName,
          "read_failed",
          formatError("read_failed", {
            entry,
            name,
          }),
          readResult.reason,
        );
      }
      let fileData = readResult.files[0]?.data;
      if (fileData === undefined)
        return fileReferenceRefusal(
          toolSpec.featureName,
          "read_failed",
          formatError("read_failed", {
            entry,
            name,
          }),
          "no_file",
        );
      if (toolSpec.stillHeld?.() === false)
        return fileReferenceRefusal(
          toolSpec.featureName,
          "not_available",
          formatError("not_available"),
          "entry_not_held",
          true,
        );
      let buffer = Buffer.from(fileData, "base64");
      uploadCandidate = {
        buf: buffer,
        name,
        sha256: computeContentHash(buffer),
      };
    } else
      uploadCandidate = await statUploadCandidate(
        path_2,
        async (resolvedPath) => {
          let screened;
          try {
            screened = await screenUploadPath(resolvedPath, context);
            assertPathNotBlocked(resolvedPath, screened, context);
          } catch (error) {
            readFailure = classifyReadFailure(error);
            logForDebugging(`[file reference] a path was rejected: ${readFailure.detail}`);
            return;
          }
          return screened;
        },
        toolSpec.maxFileBytes,
        {
          followsLinks: true,
        },
      );
    if ("code" in uploadCandidate) {
      let readError = classifyGuardedReadFailure(uploadCandidate.code, readFailure);
      if (phase === "send" && (readError.reason === "not_found" || readError.reason === "too_large"))
        return fileReferenceRefusal(
          toolSpec.featureName,
          "changed_after_check",
          formatError("changed_after_check", {
            entry,
            name,
          }),
          readError.reason,
        );
      if (
        uploadCandidate.code !== "path_rejected" &&
        (readError.reason === "too_large" || readError.reason === "read_failed")
      )
        return fileReferenceRefusal(
          toolSpec.featureName,
          readError.reason,
          formatError(readError.reason, {
            entry,
            name,
          }),
          readError.detail,
        );
      return {
        ...fileReferenceRefusal(
          toolSpec.featureName,
          readError.reason,
          formatError("cannot_upload", {
            entry,
            path: path_2,
          }),
          readError.detail,
          true,
        ),
        ...(readError.reason === "not_found" && pathKindMeta(path_2)),
      };
    }
    if (uploadCandidate.buf.length === 0)
      return phase === "check"
        ? fileReferenceRefusal(
            toolSpec.featureName,
            "empty_file",
            formatError("empty_file", {
              entry,
              name,
            }),
          )
        : fileReferenceRefusal(
            toolSpec.featureName,
            "changed_after_check",
            formatError("changed_after_check", {
              entry,
              name,
            }),
            "empty_file",
          );
    if (uploadCandidate.sha256 !== sha256)
      return phase === "check"
        ? fileReferenceRefusal(
            toolSpec.featureName,
            "checksum_mismatch",
            formatError("checksum_mismatch", {
              entry,
              name,
            }),
          )
        : fileReferenceRefusal(
            toolSpec.featureName,
            "changed_after_check",
            formatError("changed_after_check", {
              entry,
              name,
            }),
          );
    files.push({
      entry,
      reference,
      buf: uploadCandidate.buf,
    });
    path += uploadCandidate.buf.length;
    if (toolSpec.maxTotalBytes !== undefined && path > toolSpec.maxTotalBytes)
      return fileReferenceRefusal(
        toolSpec.featureName,
        "total_too_large",
        formatError("total_too_large", {
          entry,
        }),
      );
  }
  let laterUnavailableReason = toolSpec.hostFills ? undefined : fileReferenceUnavailableReason(toolSpec);
  if (laterUnavailableReason !== undefined)
    return fileReferenceRefusal(
      toolSpec.featureName,
      "not_available",
      formatError("not_available"),
      laterUnavailableReason,
      true,
    );
  return toolSpec.hostFills
    ? {
        hostReads: true,
        references: check.references.map(({ entry, reference }) => ({
          entry,
          reference,
        })),
      }
    : {
        files,
      };
}
//@ chunk-hs37d1w3.js:18072-18201 placement
function fileReferenceRefusal(featureName, feature, message, code, refusalMessage) {
  if (EXPECTED_REFUSALS.has(feature)) logFeatureSad(featureName, feature);
  else logFeatureBad(featureName, feature);
  return {
    refusal: feature,
    message,
    ...(code !== undefined && {
      detail: code,
    }),
    ...(refusalMessage && {
      notAnError: refusalMessage,
    }),
  };
}
//@ chunk-hs37d1w3.js:18201-18282 placement
/**
 * 上传失败时给用户的提示句。
 */
var UPLOAD_FAILURE_HINT = ": tell the user the upload didn't work, and ask what they'd like to do.";
//@ chunk-hs37d1w3.js:18282-18454 placement
/**
 * 按平台给出计算 sha256 的命令提示。
 */
function hashCommand() {
  return getPlatform() === "windows"
    ? "sha256sum in Git Bash, or (Get-FileHash -Algorithm SHA256 <file>).Hash.ToLower() in PowerShell"
    : "sha256sum, or shasum -a 256 on macOS";
}
//@ chunk-hs37d1w3.js:18454-32610 placement
function formatFileReferenceError(toolSpec, reason, details) {
  if (toolSpec.entryKey !== undefined) {
    let entryKey = toolSpec.entryKey;
    let keyLabel = `so nothing was sent to ${toolSpec.serviceName}.`;
    let nothingSent = quoteName(details.path ?? "");
    let fileLabel =
      details.name === undefined && details.path === undefined
        ? "A file"
        : quoteName(details.name ?? basename(details.path ?? ""));
    let entryNumber = (details.entry ?? 0) + 1;
    let ordinal =
      details.entry === undefined
        ? undefined
        : `${entryNumber}${entryNumber % 100 >= 11 && entryNumber % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][entryNumber % 10] ?? "th")}`;
    switch (reason) {
      case "not_available": {
        let serviceName = toolSpec.serviceName;
        let serviceNameText = `This ${toolSpec.toolName} call`;
        let callLabel = `so files can't be attached by reference and nothing was sent to ${serviceName}.`;
        let attachmentLabel = `The ${ordinal} attachment`;
        let key = details.key ?? "";
        let keyValue =
          'Make the call again with no fields in an attachment but "content", "filename", "mimeType" and "inline".';
        let found = ALLOWED_ARGUMENT_NAMES.find(
          (candidate) =>
            candidate !== "draftId" &&
            candidate !== "replyThreadId" &&
            foldKeyName(candidate) === foldKeyName(key),
        );
        switch (details.case) {
          case "unknown_argument":
            return found !== undefined
              ? `${serviceNameText} writes ${describeName(key)}, which a call attaching files by reference must spell exactly ${quoteName(found)}, ${keyLabel} Make the call again with it written as ${quoteName(found)}, or without it.`
              : `${serviceNameText} carries ${key === "" ? "an argument with an empty name" : `an argument, ${describeName(key)},`} that a call attaching files by reference can't carry, ${keyLabel} Make the call again without it, and put anything it holds that the message needs under one of these names, spelled exactly so in plain ASCII: "to", "cc", "bcc", "subject", "body", "htmlBody", "attachments", "replyToMessageId" and "includeSignature".`;
          case "reply_id_invalid":
            return `${serviceNameText}'s "replyToMessageId" isn't the Gmail id of a message (8 to 32 hexadecimal characters, not its Message-ID header), so files can't be attached to it by reference and nothing was sent to ${serviceName}. Make the call again with the id of the message it answers, or without it to start a new email.`;
          case "too_long_for_card":
            return `${serviceNameText} is too long for the approval card to show who gets which files, so files can't be attached to it by reference and nothing was sent to ${serviceName}. Make the call again with a shorter message and any long text or typed attachment in a file attached by reference, or with fewer recipients or files or shorter file paths, or with each file's base64 in its attachment's "content", and send the rest in another email.`;
          case "too_many_attachments":
            return `${serviceNameText} carries more than ${toolSpec.maxAttachments ?? 0} attachments, so files can't be attached to it by reference and nothing was sent to ${serviceName}. Make the call again with at most ${toolSpec.maxAttachments ?? 0} attachments, and send the others in another email.`;
          case "subject_unsafe":
            return `${serviceNameText}'s "subject" holds a line break, a control character, an invisible or direction-changing character (such as a zero-width space or U+202E), a private-use character, U+FFFD, more than four combining marks on one character or more than four stacking signs (such as Khmer's coeng) in one stack of letters, or "=?", or is longer than 250 characters, so files can't be attached to it by reference and nothing was sent to ${serviceName}. Make the call again with a subject of at most 250 characters on one line, without those characters (for "=?", a space between "=" and "?" is enough).`;
          case "attachment_not_object":
            return `${attachmentLabel} in this call isn't an object, ${callLabel} Make the call again with each attachment an object, such as {"content": "...", "filename": "report.pdf"}.`;
          case "attachment_field":
            return key === "content"
              ? `${attachmentLabel} has no "content" that is a string, ${callLabel} Make the call again with each attachment's file, as base64 or a file reference, in "content".`
              : key === "inline"
                ? `${attachmentLabel}'s "inline" isn't true or false, ${callLabel} Make the call again with it as true or false, or without it.`
                : key === "filename" || key === "mimeType" || key === "mime_type"
                  ? `${attachmentLabel}'s ${quoteName(key)} isn't text, ${callLabel} Make the call again with it as a string, or without it.`
                  : key === ""
                    ? `${attachmentLabel} carries a field with an empty name, ${callLabel} Make the call again with no fields in an attachment but "content", "filename", "mimeType" and "inline".`
                    : `${attachmentLabel} carries a field, ${quoteName(key)}, that an attachment can't have here, ${callLabel} Make the call again with no fields in an attachment but "content", "filename", "mimeType" and "inline".`;
          case "attachment_unsafe":
            return key === "filename"
              ? `${attachmentLabel}'s ${quoteName(key)} holds a line break, a control character, an invisible or direction-changing character (such as a zero-width space or U+202E), a private-use character, U+FFFD, more than four combining marks on one character or more than four stacking signs (such as Khmer's coeng) in one stack of letters, a double quote ("), a backslash, a slash, a semicolon, "=?" or a percent escape such as %2F, has no letter or digit, or is longer than 120 characters, ${callLabel} Make the call again with a name of at most 120 characters on one line, without those characters and with at least one letter or digit (for "=?", a space between "=" and "?" is enough).`
              : `${attachmentLabel}'s ${quoteName(key)} isn't just a media type, such as "application/pdf", of at most 120 characters, ${callLabel} Make the call again with only the type, or without it.`;
          case "argument_not_text":
            if (key === "attachments")
              return `${serviceNameText}'s "attachments" isn't a list, ${keyLabel} Make the call again with it as a list of attachments, or without it.`;
            return key === "includeSignature"
              ? `${serviceNameText}'s ${quoteName(key)} isn't true or false, so files can't be attached to it by reference and nothing was sent to ${serviceName}. Make the call again with it as true or false, or without it.`
              : `${serviceNameText}'s ${quoteName(key)} isn't text, so files can't be attached to it by reference and nothing was sent to ${serviceName}. Make the call again with it as a string, or without it.`;
          default:
            break;
        }
        if (details.case === "draft_update")
          return `Files can't be attached by reference with ${toolSpec.toolName}, because Google keeps any of the draft's recipients that the call leaves out, and the person approving the call doesn't see those. Nothing was sent to ${serviceName} and the draft wasn't changed. Make a new draft with ${CREATE_DRAFT_ROW.toolName} that names all of its recipients and attaches the files.`;
        if (details.case === "saved_draft" && toolSpec.recipientCheck === "draft")
          return `This ${toolSpec.toolName} call names a saved draft in "draftId", and the call doesn't show that draft's recipients, so files can't be attached to it by reference and nothing was sent to ${serviceName}. The saved draft wasn't changed. To attach the files, make a new draft: make the call again without "draftId", naming all of its recipients in "to", "cc" or "bcc".`;
        if (details.case === "saved_draft")
          return `This ${toolSpec.toolName} call sends the saved draft that "draftId" names, and the call doesn't show that draft's recipients, so files can't be attached to it by reference and nothing was sent to ${serviceName}. Make a new draft with ${CREATE_DRAFT_ROW.toolName} that names the recipients and attaches the files, or send a new message without "draftId" that names its recipients in "to", "cc" or "bcc".`;
        if (details.case === "draft_reply")
          return `This ${toolSpec.toolName} call names a message to answer in "replyToMessageId", and who a reply saved as a draft reaches when it's sent hasn't been checked, so files can't be attached to it by reference and nothing was sent to ${serviceName}. Make the call again without "replyToMessageId", which saves a new draft outside the thread. If the person wants the reply sent now, use send_message.`;
        if (details.case === "recipients_not_named")
          return `This ${toolSpec.toolName} call doesn't show who gets its files, so files can't be attached to it by reference and nothing was sent to ${serviceName}. A call that attaches files this way must leave out "threadId" and "replyThreadId", must name an address in "to" when it has "replyToMessageId", must write "to", "cc" and "bcc" under exactly those names, each as an address or a list of addresses written plainly, such as name@example.com (no names, angle brackets, spaces, empty strings or non-ASCII letters; at most 25 addresses in all), and must name an address in one of them. To keep a reply in its thread, set "replyToMessageId" to the id of the message you are answering, put that person's address in "to", and put anyone else who should get it in "to" or "cc". Make the call again that way.`;
        if (details.case === "code_mode")
          return `Files can't be attached by reference in a ${toolSpec.toolName} call made from a script, ${keyLabel} Put each file's base64 in its attachment's ${entryKey} field instead.`;
        if (details.case === "not_a_direct_call")
          return `Files can't be attached by reference in a ${toolSpec.toolName} call made by an artifact or a plugin's own code, so nothing was sent to ${serviceName}. Make the ${toolSpec.toolName} call directly, or put each file's base64 in its attachment's ${entryKey} field.`;
        if (details.case === "record_dropped")
          return `This ${toolSpec.toolName} call's permission check is no longer on record, so files can't be attached to it by reference and nothing was sent to ${serviceName}. Make the call again; it will be checked again.`;
        if (details.case === "call_changed")
          return `This ${toolSpec.toolName} call was changed after its permission check, so files can't be attached to it by reference and nothing was sent to ${serviceName}. Tell the user the call was changed after it was checked, and ask what they'd like to do.`;
        return `File references can't be used here, ${keyLabel} Put each file's base64 in its attachment's ${entryKey} field instead.`;
      }
      case "ref_malformed":
        return ordinal === undefined
          ? `This call's arguments are not one JSON object, ${keyLabel} Fix them and make the call again.`
          : `The file reference in the ${entryKey} of the ${ordinal} attachment is not valid, ${keyLabel} Write it as sha256:<64 lowercase hex digits>:<absolute path>, with / between folders, also on Windows (C:/Users/...). No folder or file name in the path may be empty, be made only of dots and spaces (such as . or ..), or contain ':'. The path may not end in '/', contain backslashes, escapes like %20, or unusual characters, be over 1,024 bytes, or have more than 32 parts. Fix it, or put the file's base64 in that attachment's ${entryKey}.`;
      case "fields_missing": {
        let key = details.key ?? "";
        let part = ordinal === undefined ? "has" : `its ${ordinal} attachment has`;
        let candidate = ordinal === undefined ? "argument" : "field";
        if (details.also) {
          let found = (ordinal === undefined ? [toolSpec.argument] : [entryKey, "filename"]).find(
            (candidate) => foldKeyName(candidate) === foldKeyName(key),
          );
          return `This ${toolSpec.toolName} call attaches a file by reference but ${part} one ${candidate} under two spellings, ${describeName(key)} and ${describeName(details.also)}, ${keyLabel} Keep only ${found === undefined ? "one of them" : quoteName(found)} and make the call again.`;
        }
        let withArgument =
          key === ""
            ? `${part} ${ordinal === undefined ? "an argument" : "a field"} with an empty name twice`
            : `${part} the ${candidate} ${quoteName(key)} twice`;
        return `This ${toolSpec.toolName} call attaches a file by reference but ${withArgument}, ${keyLabel} Fix that and make the call again.`;
      }
      case "cannot_upload":
        return `Nothing was sent to ${toolSpec.serviceName}: ${nothingSent} either does not exist or can't be attached by reference from here (this message doesn't say which). Check the path. If it is right, tell the user this file can't be attached by reference from here, and ask what they'd like to do.`;
      case "empty_file":
        return `${fileLabel} is empty, ${keyLabel} If it was just written, make sure it is saved and make the call once more; if it really is empty, tell the user.`;
      case "too_large":
        return `${fileLabel} is over the ${toolSpec.maxFileText} limit for attachments from here, ${keyLabel} Don't try to attach it another way, such as putting its base64 in the ${entryKey} field. Tell the user the file is too large to attach from here.`;
      case "total_too_large":
        return `The files this call attaches by reference come to more than ${toolSpec.maxTotalText ?? ""} together, over the limit for attachments sent in one email from here, ${keyLabel} Don't try to attach them another way, such as putting their base64 in the ${entryKey} fields. Tell the user the files are too large to send in one email, and ask what they'd like to do.`;
      case "checksum_mismatch":
        return `${fileLabel} doesn't match the SHA-256 in its reference, ${keyLabel} Compute its SHA-256 again (${hashCommand()}) and make the call again. A SHA-256 that wasn't computed from the file won't match.`;
      case "changed_after_check":
        return `${fileLabel} changed after it was checked, ${keyLabel} Compute its SHA-256 again and make the call again. If it changes again, tell the user.`;
      default:
        return `${fileLabel} couldn't be read just now, ${keyLabel} Make the call once more; if it fails again, tell the user.`;
    }
  }
  let argument = toolSpec.argument;
  let pathText = displaySafeText(details.path ?? "");
  let nameText = displaySafeText(
    details.name ?? (details.path === undefined ? "The file" : basename(details.path)),
  );
  let fieldName = details.field ?? toolSpec.wrongArguments[0] ?? "content";
  switch (reason) {
    case "not_available":
      return `File references can't be used here, so nothing was uploaded. Put the file's content in ${argument} as base64 instead.`;
    case "ref_malformed":
      return `The file reference in ${argument} is not valid, so nothing was uploaded. Write it as sha256:<64 lowercase hex digits>:<absolute path>, with / between folders, also on Windows (C:/Users/...). No folder or file name in the path may be empty, be made only of dots and spaces (such as . or ..), or contain ':'. The path may not end in '/', contain backslashes, escapes like %20, or unusual characters, be over 1,024 bytes, or have more than 32 parts. Fix it, or put the file's base64 in ${argument}.`;
    case "wrong_field":
      return `The ${fieldName} field holds a file reference, so nothing was uploaded. Put the reference in ${argument} instead and leave ${fieldName} out.`;
    case "fields_missing": {
      let quoteName = (name) => (name === "" ? "an empty name" : displaySafeText(name));
      let key = details.key ?? "";
      if (details.also) {
        let keepLabel = foldKeyName(key) === foldKeyName(argument) ? argument : "one of them";
        return `This ${toolSpec.toolName} call names a file by reference but has one argument under two spellings, ${quoteName(key)} and ${quoteName(details.also)}, so nothing was uploaded. Keep only ${keepLabel} and make the call again.`;
      }
      let duplicateText =
        key === ""
          ? "has an argument with an empty name twice"
          : `has the argument ${displaySafeText(key)} twice`;
      return `This ${toolSpec.toolName} call names a file by reference but ${duplicateText}, so nothing was uploaded. Fix that and make the call again.`;
    }
    case "cannot_upload":
      return `Nothing was uploaded: ${pathText} either does not exist or can't be sent by reference from here (this message doesn't say which). Check the path. If it is right, a reference won't work for this file${details.readsBlocked ? UPLOAD_FAILURE_HINT : `, but ${argument} still accepts a file's base64.`}`;
    case "empty_file":
      return `${nameText} is empty, so nothing was uploaded. If it was just written, make sure it is saved and make the call once more; if it really is empty, tell the user.`;
    case "too_large":
      return `${nameText} is over the ${toolSpec.maxFileText} limit for uploads from here, so nothing was uploaded. Tell the user the file is too large to upload from here.`;
    case "checksum_mismatch":
      return `${nameText} doesn't match the SHA-256 in the reference, so nothing was uploaded. Compute its SHA-256 again (${hashCommand()}) and make the call again. A SHA-256 that wasn't computed from the file won't match.`;
    case "changed_after_check":
      return `${nameText} changed after it was checked, so nothing was uploaded. Compute its SHA-256 again and make the call again. If it changes again, tell the user.`;
    default:
      return `${nameText} couldn't be read just now, so nothing was uploaded. Make the call once more; if it fails again, tell the user.`;
  }
}
//@ chunk-hs37d1w3.js:32610-32662 layout
function quoteName(key) {
  return `"${displaySafeText(key).replaceAll('"', "?")}"`;
}
//@ chunk-hs37d1w3.js:32662-32711 layout
function describeName(key) {
  return key === "" ? "an empty name" : quoteName(key);
}
//@ chunk-hs37d1w3.js:32711-32818 placement
function referencedFileName(reference) {
  let parsed = typeof reference === "string" ? parseFileReference(reference) : "not_a_reference";
  return typeof parsed === "string" ? undefined : basename(parsed.path);
}
//@ chunk-hs37d1w3.js:32818-32977 placement
function displaySafeText(text) {
  let mapped = [...text].map((char) => (/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\uFFFD]/u.test(char) ? "?" : char));
  return mapped.length > 200 ? `${mapped.slice(0, 200).join("")}\u2026` : mapped.join("");
}
//@ chunk-hs37d1w3.js:32977-33298 placement
/**
 * 判断引用路径是否格式良好：绝对路径、长度与层数受限、没有空段或冒号、不含反斜杠、百分号编码与控制/格式字符。
 */
function isWellFormedReferencePath(reference, path) {
  if (
    !path.startsWith("/") ||
    !isWellFormedString(reference) ||
    Buffer.byteLength(reference, "utf8") > MAX_REFERENCE_PATH_BYTES ||
    countCharInString(reference, "/") > MAX_REFERENCE_PATH_DEPTH
  )
    return false;
  if (
    path
      .slice(1)
      .split("/")
      .some(
        (segment) => /^[.\p{Zs}]*$/u.test(segment) || /(?! )\p{Zs}+$/u.test(segment) || segment.includes(":"),
      )
  )
    return false;
  return !(
    /[\\]|%[0-9a-f]{2}/i.test(reference) ||
    /[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}\uFFFD\u2000\u2001]/u.test(reference)
  );
}
//@ chunk-hs37d1w3.js:33298-33793 placement
/**
 * 把读取引用文件的失败归类：不存在、凭据类文件被拒、读取失败，或位于允许根目录之外。
 */
function classifyReadFailure(error) {
  if (isPathAbsent(error))
    return {
      reason: "not_found",
      detail: "not_found",
    };
  if (pathRejectionKind(error) === "credential_name")
    return {
      reason: "refused_kind",
      detail: "credential_name",
    };
  if (!(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS))
    return {
      reason: "read_failed",
      detail: sanitizeErrnoForTelemetry(error) ?? "not_readable",
    };
  let sliced = error.telemetryMessage
    .replace(/^[^:]*:\s*/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 63);
  return {
    reason: /kernel|device|credential|name_or_place/.test(sliced) ? "refused_kind" : "outside_roots",
    detail: /^[a-z]/.test(sliced) ? sliced : "not_readable",
  };
}
//@ chunk-hs37d1w3.js:33793-34091 placement
function classifyGuardedReadFailure(code, fallback) {
  switch (code) {
    case "path_rejected":
      return (
        fallback ?? {
          reason: "refused_kind",
          detail: "credential_or_own_file",
        }
      );
    case "hard_links":
    case "not_regular":
    case "name_direction":
      return {
        reason: "refused_kind",
        detail: code,
      };
    case "too_large":
      return {
        reason: "too_large",
      };
    default:
      return {
        reason: "read_failed",
        detail: code,
      };
  }
}
export {
  sortKeysDeep,
  checkCall,
  gmailShapeRefusal,
  hashCommand,
  isWindowsForm,
  parseFileReference,
  resolveDriveFileReference,
  recipientsNotShown,
  formatFileReferenceError,
};
