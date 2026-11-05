/**
 * tools/BashTool/androidCommands.ts
 *
 * 2.1.316 新增：Android 命令识别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8bpxxmz0.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { EDIT } from "../FileEditTool/constants.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8bpxxmz0.js:599-1147 placement
/**
 * Android 开发意图识别：manifest、gradle 插件、import android 的正则，adb/emulator/sdkmanager/gradlew assemble 等命令正则，Kotlin/Java 扩展名与编辑工具集合。
 */
var ANDROID_MANIFEST_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ANDROID_GRADLE_PLUGIN_RE;
var ANDROID_IMPORT_RE;
var ANDROID_COMMAND_RE;
var KOTLIN_JAVA_EXTENSIONS;
var FILE_WRITE_TOOLS;
deferInit("chunk-8bpxxmz0.js:599", () => {
  ANDROID_MANIFEST_RE = /AndroidManifest\.xml|<manifest xmlns:android=/;
  ANDROID_GRADLE_PLUGIN_RE = /com\.android\.(application|library|tools\.build)/;
  ANDROID_IMPORT_RE = /\bimport android\./;
  ANDROID_COMMAND_RE = new RegExp(
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
  KOTLIN_JAVA_EXTENSIONS = [".kt", ".kts", ".java"];
  FILE_WRITE_TOOLS = new Set([EDIT, FILE_WRITE_TOOL_NAME]);
});
//@ chunk-8bpxxmz0.js:1147-1208 placement
/**
 * 创建 Android 开发证据检测的初始状态：未编辑 Kotlin/Java、无证据。
 */
function createAndroidEvidenceState() {
  return {
    kotlinOrJavaFileEdited: false,
    evidence: null,
  };
}
//@ chunk-8bpxxmz0.js:1208-1273 placement
/**
 * 判断是否已收集到 Android 开发证据（编辑过 Kotlin/Java 且找到证据）。
 */
function hasAndroidEvidence(state) {
  return state.kotlinOrJavaFileEdited && state.evidence !== null;
}
//@ chunk-8bpxxmz0.js:1273-2185 placement
/**
 * 扫描消息（含 agent/skill 进度中的消息），记录是否编辑了 Kotlin/Java 文件，并从写入内容、Android 命令或工具结果中找出 Android 开发证据。
 */
function absorbAndroidEvidence(state, events) {
  for (let event of events) {
    if (hasAndroidEvidence(state)) return;
    let message =
      event.type === "progress" &&
      (event.data.type === "agent_progress" || event.data.type === "skill_progress")
        ? event.data.message
        : event;
    if (message.type === "assistant") {
      if (!Array.isArray(message.message.content)) continue;
      for (let contentBlock of message.message.content) {
        if (contentBlock.type !== "tool_use") continue;
        let input = contentBlock.input;
        if (typeof input !== "object" || input === null) continue;
        if (FILE_WRITE_TOOLS.has(contentBlock.name)) {
          if (
            "file_path" in input &&
            typeof input.file_path === "string" &&
            isKotlinOrJavaPath(input.file_path)
          )
            state.kotlinOrJavaFileEdited = true;
          if (state.evidence === null)
            state.evidence =
              ("content" in input && detectAndroidImportEvidence(input.content)) ||
              ("new_string" in input && detectAndroidImportEvidence(input.new_string)) ||
              null;
        } else if (
          state.evidence === null &&
          SHELL_TOOL_NAMES.includes(contentBlock.name) &&
          "command" in input &&
          typeof input.command === "string" &&
          ANDROID_COMMAND_RE.test(input.command)
        )
          state.evidence = "android_command";
      }
    } else if (message.type === "user" && state.evidence === null) {
      if (!Array.isArray(message.message.content)) continue;
      for (let contentBlock of message.message.content) {
        if (contentBlock.type !== "tool_result") continue;
        let androidEvidenceInResult = findAndroidEvidenceInResult(contentBlock.content);
        if (androidEvidenceInResult !== null) {
          state.evidence = androidEvidenceInResult;
          break;
        }
      }
    }
  }
}
//@ chunk-8bpxxmz0.js:2185-2255 placement
/**
 * 判断路径是否为 Kotlin/Java 源文件（按扩展名，忽略大小写）。
 */
function isKotlinOrJavaPath(filePath) {
  let lower = filePath.toLowerCase();
  return KOTLIN_JAVA_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
//@ chunk-8bpxxmz0.js:2255-2352 placement
/**
 * 在文本里找 Android 证据：先看 import，再看清单与 gradle 插件。
 */
function detectAndroidImportEvidence(text) {
  if (typeof text !== "string") return null;
  if (ANDROID_IMPORT_RE.test(text)) return "android_import";
  return detectAndroidFileEvidence(text);
}
//@ chunk-8bpxxmz0.js:2352-2442 placement
/**
 * 在文本里识别 AndroidManifest.xml 引用或 com.android.application 插件。
 */
function detectAndroidFileEvidence(text) {
  if (ANDROID_MANIFEST_RE.test(text)) return "android_manifest";
  return ANDROID_GRADLE_PLUGIN_RE.test(text) ? "gradle_plugin" : null;
}
//@ chunk-8bpxxmz0.js:2442-2610 placement
function findAndroidEvidenceInResult(text) {
  if (typeof text === "string") return detectAndroidFileEvidence(text);
  if (!Array.isArray(text)) return null;
  for (let contentBlock of text) {
    let evidence = contentBlock.type === "text" ? detectAndroidFileEvidence(contentBlock.text) : null;
    if (evidence !== null) return evidence;
  }
  return null;
}
//@ chunk-8bpxxmz0.js:2610-2780 placement
var DEV_INTENT_DETECTORS = {
  ios_app: () => {
    let evidenceState = emptyProjectFactsEvidence();
    return {
      absorb: (events) => countToolProgress(evidenceState, events),
      trigger: () => conclusiveEvidenceOf(evidenceState),
    };
  },
  android_app: () => {
    let state = createAndroidEvidenceState();
    return {
      absorb: (events) => absorbAndroidEvidence(state, events),
      trigger: () => (hasAndroidEvidence(state) ? state.evidence : null),
    };
  },
};
//@ chunk-8bpxxmz0.js:2780-2834 placement
function _() {
  return new Map(MOBILE_APP_KINDS.map((kind) => [kind, DEV_INTENT_DETECTORS[kind]()]));
}
//@ chunk-8bpxxmz0.js:2834-3503 placement
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
  absorb(events) {
    let newlyDetected = [];
    if (this.#e.size === this.#t.size) return newlyDetected;
    let filtered = events.filter((event) => !this.#r.has(event));
    for (let event of filtered) if (isPlainObject(event)) this.#r.add(event);
    for (let [kind, detector] of this.#t) {
      if (this.#e.has(kind)) continue;
      let trigger = null;
      try {
        detector.absorb(filtered);
        let detectorTrigger = detector.trigger();
        if (detectorTrigger !== null) {
          enqueueTaskNotification({
            type: "system",
            subtype: "dev_intent",
            kind,
            trigger: detectorTrigger,
          });
          this.#e.add(kind);
          trigger = detectorTrigger;
        }
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "dev intent fold"));
        if (!this.#n.has(kind)) {
          this.#n.add(kind);
          logFeatureBad("dev_intent_detect", "fold_threw");
        }
      }
      let foundTrigger = trigger;
      if (foundTrigger !== null) {
        newlyDetected.push(kind);
        logFeatureOk("dev_intent_detect", {
          kind: fromEnum(kind),
          trigger: fromEnum(foundTrigger),
        });
      }
    }
    return newlyDetected;
  }
  reset() {
    this.#t = _();
    this.#e.clear();
    this.#n.clear();
    this.#r = new WeakSet();
  }
}
//@ chunk-8bpxxmz0.js:3503-3528 placement
/**
 * 按宿主会话隔离的 Android 开发意图检测器实例，供 CLI 与 QueryEngine 记录/取出证据。
 */
var androidEvidenceByHost; // deferred: uses DevIntentDetector of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8bpxxmz0.js:3503", () => {
  androidEvidenceByHost = new HostScoped(() => new DevIntentDetector());
});
export { androidEvidenceByHost };
