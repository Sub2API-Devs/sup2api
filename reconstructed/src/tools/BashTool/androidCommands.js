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
import { Kjs, countToolProgress, mOo } from "../../utils/projectFacts.js";
import { MOBILE_APP_KINDS } from "../../entrypoints/sdk/coreSchemas.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { HostScoped } from "../../utils/hostScoped.js";

/**
 * Android 开发意图识别：manifest、gradle 插件、import android 的正则，adb/emulator/sdkmanager/gradlew assemble 等命令正则，Kotlin/Java 扩展名与编辑工具集合。
 */
//@ chunk-xcsefmky.js:566-1114 placement
var ANDROID_MANIFEST_RE = /AndroidManifest\.xml|<manifest xmlns:android=/,
  ANDROID_GRADLE_PLUGIN_RE = /com\.android\.(application|library|tools\.build)/,
  ANDROID_IMPORT_RE = /\bimport android\./,
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
  ),
  KOTLIN_JAVA_EXTENSIONS = [".kt", ".kts", ".java"],
  FILE_WRITE_TOOLS = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME]);
//@ chunk-xcsefmky.js:1114-1175 placement
function f() {
  return { kotlinOrJavaFileEdited: !1, evidence: null };
}
//@ chunk-xcsefmky.js:1175-1240 placement
function d(e) {
  return e.kotlinOrJavaFileEdited && e.evidence !== null;
}
/**
 * 扫描消息（含 agent/skill 进度中的消息），记录是否编辑了 Kotlin/Java 文件，并从写入内容、Android 命令或工具结果中找出 Android 开发证据。
 */
//@ chunk-xcsefmky.js:1240-2152 placement
function absorbAndroidEvidence(e, r) {
  for (let o of r) {
    if (d(e)) return;
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
          if ("file_path" in input && typeof input.file_path === "string" && h(input.file_path))
            e.kotlinOrJavaFileEdited = !0;
          if (e.evidence === null)
            e.evidence =
              ("content" in input && u(input.content)) ||
              ("new_string" in input && u(input.new_string)) ||
              null;
        } else if (
          e.evidence === null &&
          SHELL_TOOL_NAMES.includes(i.name) &&
          "command" in input &&
          typeof input.command === "string" &&
          ANDROID_COMMAND_RE.test(input.command)
        )
          e.evidence = "android_command";
      }
    } else if (t.type === "user" && e.evidence === null) {
      if (!Array.isArray(t.message.content)) continue;
      for (let i of t.message.content) {
        if (i.type !== "tool_result") continue;
        let n = findAndroidEvidenceInResult(i.content);
        if (n !== null) {
          e.evidence = n;
          break;
        }
      }
    }
  }
}
//@ chunk-xcsefmky.js:2152-2222 placement
function h(e) {
  let lower = e.toLowerCase();
  return KOTLIN_JAVA_EXTENSIONS.some((o) => lower.endsWith(o));
}
//@ chunk-xcsefmky.js:2222-2319 placement
function u(e) {
  if (typeof e !== "string") return null;
  if (ANDROID_IMPORT_RE.test(e)) return "android_import";
  return a(e);
}
//@ chunk-xcsefmky.js:2319-2409 placement
function a(e) {
  if (ANDROID_MANIFEST_RE.test(e)) return "android_manifest";
  return ANDROID_GRADLE_PLUGIN_RE.test(e) ? "gradle_plugin" : null;
}
//@ chunk-xcsefmky.js:2409-2577 placement
function findAndroidEvidenceInResult(e) {
  if (typeof e === "string") return a(e);
  if (!Array.isArray(e)) return null;
  for (let r of e) {
    let o = r.type === "text" ? a(r.text) : null;
    if (o !== null) return o;
  }
  return null;
}
//@ chunk-xcsefmky.js:2577-2747 placement
var DEV_INTENT_DETECTORS = {
  ios_app: () => {
    let e = Kjs();
    return { absorb: (r) => countToolProgress(e, r), trigger: () => mOo(e) };
  },
  android_app: () => {
    let e = f();
    return { absorb: (r) => absorbAndroidEvidence(e, r), trigger: () => (d(e) ? e.evidence : null) };
  },
};
//@ chunk-xcsefmky.js:2747-2801 placement
function _() {
  return new Map(MOBILE_APP_KINDS.map((e) => [e, DEV_INTENT_DETECTORS[e]()]));
}
/**
 * 开发意图检测器：对新消息逐个运行各探测器（iOS/Android），首次触发时排入 dev_intent 系统通知并上报，异常只上报一次。
 */
//@ chunk-xcsefmky.js:2801-3470 placement
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
        let trigger = i.trigger();
        if (trigger !== null)
          (enqueueTaskNotification({ type: "system", subtype: "dev_intent", kind: t, trigger: trigger }),
            this.#e.add(t),
            (n = trigger));
      } catch (error) {
        if ((logError(withTelemetryMessage(toError(error), "dev intent fold")), !this.#n.has(t)))
          (this.#n.add(t), logFeatureBad("dev_intent_detect", "fold_threw"));
      }
      let p = n;
      if (p !== null)
        (r.push(t), logFeatureOk("dev_intent_detect", { kind: fromEnum(t), trigger: fromEnum(p) }));
    }
    return r;
  }
  reset() {
    ((this.#t = _()), this.#e.clear(), this.#n.clear(), (this.#r = new WeakSet()));
  }
}
//@ chunk-xcsefmky.js:3470-3495 placement
var kAe = new HostScoped(() => new DevIntentDetector());

export { kAe };
