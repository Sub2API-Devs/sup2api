/**
 * services/projects/devIntent.ts
 *
 * 2.1.316 新增：项目开发意图探测的状态（会话开始、目录变化、回合）；开发意图追踪器单例。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y304retf.js (3)
 * attribution: placement 3
 */
import { getProjectFactsForStartup } from "../../utils/projectFacts.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-y304retf.js:448-564 placement
var MOBILE_APP_PROBES = [
  { kind: "ios_app", found: (t) => t.has_ios_app_project },
  { kind: "android_app", found: (t) => t.has_android_app_project },
];
/**
 * 项目开发意图探测的状态（会话开始、目录变化、回合）。
 */
//@ chunk-y304retf.js:564-1510 placement
class DevIntentTracker {
  #t = 0;
  #o = 0;
  #e = new Map();
  get started() {
    return this.#t > 0;
  }
  start() {
    (this.#t++, this.#r(!1));
  }
  conversationReset() {
    if (this.started) (this.#t++, this.#r(!1));
  }
  directoryChanged() {
    if (!this.started) {
      this.start();
      return;
    }
    this.#r(!1);
  }
  turnStarting() {
    let t = this.#t;
    if (!this.started || this.#o === t) return;
    if (((this.#o = t), MOBILE_APP_PROBES.some(({ kind: kind }) => this.#e.get(kind) !== t))) this.#r(!0);
  }
  #r(t) {
    let e = this.#t;
    getProjectFactsForStartup({ fresh: t }).then((r) => {
      if (e !== this.#t || r === null) return;
      if (r.has_ios_app_project === null && this.#e.get("ios_app") !== e)
        logFeatureSad("dev_intent_detect", "project_unreadable", {
          kind: lit("ios_app"),
          trigger: lit("project_scan"),
        });
      for (let { kind: kind, found: found } of MOBILE_APP_PROBES)
        if (found(r) === !0 && this.#e.get(kind) !== e) (this.#e.set(kind, e), this.#n(kind));
    });
  }
  #n(t) {
    try {
      (enqueueTaskNotification({ type: "system", subtype: "dev_intent", kind: t, trigger: "project_scan" }),
        logFeatureOk("dev_intent_detect", { kind: fromEnum(t), trigger: lit("project_scan") }));
    } catch (error) {
      (logError(withTelemetryMessage(toError(error), "project dev intent send failed")),
        logFeatureBad("dev_intent_detect", "project_send_threw", {
          kind: fromEnum(t),
          trigger: lit("project_scan"),
        }));
    }
  }
}
/**
 * 开发意图追踪器单例。
 */
//@ chunk-y304retf.js:1510-1535 placement
var devIntentTracker = new HostScoped(() => new DevIntentTracker());

export { devIntentTracker };
