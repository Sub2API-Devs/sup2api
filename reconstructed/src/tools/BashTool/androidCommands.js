/**
 * tools/BashTool/androidCommands.ts
 *
 * 2.1.316 新增：Android 命令识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xcsefmky.js (12)
 * attribution: placement 12
 */
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { SHELL_TOOL_NAMES } from "../../utils/shell/shellToolUtils.js";
import {
  emptyProjectFactsEvidence,
  countToolProgress,
  conclusiveEvidenceOf,
} from "../../utils/projectFacts.js";
import { MOBILE_APP_KINDS } from "../../entrypoints/sdk/coreSchemas.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-xcsefmky.js:566-1114 placement
/**
 * Android 开发意图识别：manifest、gradle 插件、import android 的正则，adb/emulator/sdkmanager/gradlew assemble 等命令正则，Kotlin/Java 扩展名与编辑工具集合。
 */
var ANDROID_MANIFEST_RE = /AndroidManifest\.xml|<manifest xmlns:android=/;
var ANDROID_GRADLE_PLUGIN_RE = /com\.android\.(application|library|tools\.build)/;
var ANDROID_IMPORT_RE = /\bimport android\./;
var ANDROID_COMMAND_RE = new RegExp(
  String.raw`(?:^|[;&|(]\s*)(?:(?:\w+=\S*|sudo|time|env)\s+)*(?:\S*[\\/])?(?:` +
    [
      String.raw`adb(?:\.exe)?\s`,
      String.raw`emulator(?:\.exe)?\s+(?:-|@)`,
      String.raw`(?:sdkmanager|avdmanager)\b`,
      String.raw`gradlew?(?:\.bat)?\s(?:\\\n|[^\n&|;])*\b(?:assemble|install|bundle)\w*(?:Debug|Release)\b`,
      String.raw`(?:npx\s+)?react-native\s+run-android\b`,
    ].join("|") +
    ")",
  "m",
);
var KOTLIN_JAVA_EXTENSIONS = [".kt", ".kts", ".java"];
var FILE_WRITE_TOOLS = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME]);
//@ chunk-xcsefmky.js:1114-1175 placement
/**
 * 创建 Android 开发证据检测的初始状态：未编辑 Kotlin/Java、无证据。
 */
function createAndroidEvidenceState() {
  return {
    kotlinOrJavaFileEdited: false,
    evidence: null,
  };
}
//@ chunk-xcsefmky.js:1175-1240 placement
/**
 * 判断是否已收集到 Android 开发证据（编辑过 Kotlin/Java 且找到证据）。
 */
function hasAndroidEvidence(e) {
  return e.kotlinOrJavaFileEdited && e.evidence !== null;
}
//@ chunk-xcsefmky.js:1240-2152 placement
/**
 * 扫描消息（含 agent/skill 进度中的消息），记录是否编辑了 Kotlin/Java 文件，并从写入内容、Android 命令或工具结果中找出 Android 开发证据。
 */
function absorbAndroidEvidence(androidEvidenceState, r) {
  for (let o of r) {
    if (hasAndroidEvidence(androidEvidenceState)) return;
    let t =
      o.type === "progress" && (o.data.type === "agent_progress" || o.data.type === "skill_progress")
        ? o.data.message
        : o;
    if (t.type === "assistant") {
      if (!Array.isArray(t.message.content)) continue;
      for (let i of t.message.content) {
        if (i.type !== "tool_use") continue;
        let input = i.input;
        if (typeof input !== "object" || input === null) continue;
        if (FILE_WRITE_TOOLS.has(i.name)) {
          if (
            "file_path" in input &&
            typeof input.file_path === "string" &&
            isKotlinOrJavaPath(input.file_path)
          )
            androidEvidenceState.kotlinOrJavaFileEdited = true;
          if (androidEvidenceState.evidence === null)
            androidEvidenceState.evidence =
              ("content" in input && detectAndroidImportEvidence(input.content)) ||
              ("new_string" in input && detectAndroidImportEvidence(input.new_string)) ||
              null;
        } else if (
          androidEvidenceState.evidence === null &&
          SHELL_TOOL_NAMES.includes(i.name) &&
          "command" in input &&
          typeof input.command === "string" &&
          ANDROID_COMMAND_RE.test(input.command)
        )
          androidEvidenceState.evidence = "android_command";
      }
    } else if (t.type === "user" && androidEvidenceState.evidence === null) {
      if (!Array.isArray(t.message.content)) continue;
      for (let i of t.message.content) {
        if (i.type !== "tool_result") continue;
        let androidEvidenceInResult = findAndroidEvidenceInResult(i.content);
        if (androidEvidenceInResult !== null) {
          androidEvidenceState.evidence = androidEvidenceInResult;
          break;
        }
      }
    }
  }
}
//@ chunk-xcsefmky.js:2152-2222 placement
/**
 * 判断路径是否为 Kotlin/Java 源文件（按扩展名，忽略大小写）。
 */
function isKotlinOrJavaPath(filePath) {
  let lower = filePath.toLowerCase();
  return KOTLIN_JAVA_EXTENSIONS.some((o) => lower.endsWith(o));
}
//@ chunk-xcsefmky.js:2222-2319 placement
/**
 * 在文本里找 Android 证据：先看 import，再看清单与 gradle 插件。
 */
function detectAndroidImportEvidence(e) {
  if (typeof e !== "string") return null;
  if (ANDROID_IMPORT_RE.test(e)) return "android_import";
  return detectAndroidFileEvidence(e);
}
//@ chunk-xcsefmky.js:2319-2409 placement
/**
 * 在文本里识别 AndroidManifest.xml 引用或 com.android.application 插件。
 */
function detectAndroidFileEvidence(e) {
  if (ANDROID_MANIFEST_RE.test(e)) return "android_manifest";
  return ANDROID_GRADLE_PLUGIN_RE.test(e) ? "gradle_plugin" : null;
}
//@ chunk-xcsefmky.js:2409-2577 placement
function findAndroidEvidenceInResult(content) {
  if (typeof content === "string") return detectAndroidFileEvidence(content);
  if (!Array.isArray(content)) return null;
  for (let r of content) {
    let o = r.type === "text" ? detectAndroidFileEvidence(r.text) : null;
    if (o !== null) return o;
  }
  return null;
}
//@ chunk-xcsefmky.js:2577-2747 placement
var DEV_INTENT_DETECTORS = {
  ios_app: () => {
    let e = emptyProjectFactsEvidence();
    return {
      absorb: (r) => countToolProgress(e, r),
      trigger: () => conclusiveEvidenceOf(e),
    };
  },
  android_app: () => {
    let androidEvidenceState = createAndroidEvidenceState();
    return {
      absorb: (r) => absorbAndroidEvidence(androidEvidenceState, r),
      trigger: () => (hasAndroidEvidence(androidEvidenceState) ? androidEvidenceState.evidence : null),
    };
  },
};
//@ chunk-xcsefmky.js:2747-2801 placement
function _() {
  return new Map(MOBILE_APP_KINDS.map((e) => [e, DEV_INTENT_DETECTORS[e]()]));
}
//@ chunk-xcsefmky.js:2801-3470 placement
/**
 * 开发意图检测器：对新消息逐个运行各探测器（iOS/Android），首次触发时排入 dev_intent 系统通知并上报，异常只上报一次。
 */
class DevIntentDetector {
  #t = _();
  #e = new Set();
  #n = new Set();
  #r = new WeakSet();
  get intents() {
    return this.#e;
  }
  absorb(e) {
    let r = [];
    if (this.#e.size === this.#t.size) return r;
    let filtered = e.filter((t) => !this.#r.has(t));
    for (let t of filtered) if (isPlainObject(t)) this.#r.add(t);
    for (let [t, i] of this.#t) {
      if (this.#e.has(t)) continue;
      let n = null;
      try {
        i.absorb(filtered);
        let s = i.trigger();
        if (s !== null) {
          enqueueTaskNotification({
            type: "system",
            subtype: "dev_intent",
            kind: t,
            trigger: s,
          });
          this.#e.add(t);
          n = s;
        }
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "dev intent fold"));
        if (!this.#n.has(t)) {
          this.#n.add(t);
          logFeatureBad("dev_intent_detect", "fold_threw");
        }
      }
      let p = n;
      if (p !== null) {
        r.push(t);
        logFeatureOk("dev_intent_detect", {
          kind: fromEnum(t),
          trigger: fromEnum(p),
        });
      }
    }
    return r;
  }
  reset() {
    this.#t = _();
    this.#e.clear();
    this.#n.clear();
    this.#r = new WeakSet();
  }
}
//@ chunk-xcsefmky.js:3470-3495 placement
/**
 * 按宿主会话隔离的 Android 开发意图检测器实例，供 CLI 与 QueryEngine 记录/取出证据。
 */
var androidEvidenceByHost = new HostScoped(() => new DevIntentDetector());
export { androidEvidenceByHost };
