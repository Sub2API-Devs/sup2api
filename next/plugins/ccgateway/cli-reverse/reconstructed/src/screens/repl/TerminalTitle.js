/**
 * screens/repl/TerminalTitle.ts
 *
 * 2.1.316 新增。终端标题更新。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import {
  subscribeSessionTitleChanged,
  getCurrentSessionTitle,
  getCurrentSessionAiTitle,
} from "../../utils/sessionStorage.js";
import { logEvent } from "../../services/analytics/index.js";
import { DEFAULT_TITLE } from "../../services/notifier.js";

//@ chunk-18hwfzwa.js:173871-173945 placement
function terminalTitleFromRename(store) {
  return store.getState().settings.terminalTitleFromRename !== false;
}
//@ chunk-18hwfzwa.js:173945-174054 placement
var TERMINAL_TITLE_SOURCES = [
  "disabled",
  "serviceName",
  "sessionTitle",
  "aiSessionTitle",
  "agentTitle",
  "haikuTitle",
  "terminalTitle",
];
//@ chunk-18hwfzwa.js:174054-175146 placement
class TerminalTitleController {
  #e = createSignal();
  #t;
  #o = [];
  #n;
  #s;
  #r;
  #c = false;
  #i = false;
  constructor(options) {
    this.#t = options;
    this.#s = terminalTitleFromRename(options.store);
    this.#r = options.store.getState().remoteSessionName;
    this.#n = this.#l();
  }
  connect() {
    if (this.#c || this.#i) return;
    this.#c = true;
    let sources = this.#t;
    this.#o.push(
      subscribeSessionTitleChanged(this.#a),
      sources.session.subscribe(this.#a),
      sources.sessionController.subscribe(this.#a),
      sources.scope.subscribe(this.#a),
      sources.store.subscribe(() => {
        let renamedTitle = terminalTitleFromRename(sources.store);
        let remoteSessionName = sources.store.getState().remoteSessionName;
        if (renamedTitle === this.#s && remoteSessionName === this.#r) return;
        this.#s = renamedTitle;
        this.#r = remoteSessionName;
        this.#a();
      }),
    );
    this.#a();
  }
  subscribe = (listener) => this.#e.subscribe(listener);
  getSnapshot = () => this.#n;
  dispose = () => {
    this.#i = true;
    this.#c = false;
    for (let unsubscribe of this.#o.splice(0)) unsubscribe();
  };
  #a = () => {
    let nextTitle = this.#l();
    let currentTitle = this.#n;
    if (TERMINAL_TITLE_SOURCES.every((source) => Object.is(nextTitle[source], currentTitle[source]))) return;
    this.#n = nextTitle;
    this.#e.emit();
  };
  #l() {
    let { session, sessionController, scope, disabled } = this.#t;
    let sessionTitle = this.#s ? getCurrentSessionTitle(session.id) : undefined;
    let currentSessionAiTitle = getCurrentSessionAiTitle(session.id);
    let { haikuTitle } = sessionController.getSnapshot();
    let agentType = scope.getSnapshot().mainThreadAgentDefinition?.agentType;
    let serviceName = this.#s ? this.#r : undefined;
    return {
      disabled,
      serviceName,
      sessionTitle,
      aiSessionTitle: currentSessionAiTitle,
      agentTitle: agentType,
      haikuTitle,
      terminalTitle:
        serviceName ?? sessionTitle ?? currentSessionAiTitle ?? agentType ?? haikuTitle ?? DEFAULT_TITLE,
    };
  }
}
export { TerminalTitleController };
