/**
 * screens/repl/TerminalTitle.ts
 *
 * 2.1.316 新增。终端标题更新。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: affinity 1, placement 3
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { logEvent } from "../../services/analytics/index.js";
import { env } from "../../utils/env.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  subscribeSessionTitleChanged,
  getCurrentSessionTitle,
  getCurrentSessionAiTitle,
} from "../../utils/sessionStorage.js";
import { logError } from "../../utils/log.js";

//@ chunk-czq1j3j2.js:179221-179243 affinity (2.1.88 match: DEFAULT_TITLE, 1)
var DEFAULT_TITLE = "Claude Code";
//@ chunk-czq1j3j2.js:179243-179317 placement
function terminalTitleFromRename(store) {
  return store.getState().settings.terminalTitleFromRename !== false;
}
//@ chunk-czq1j3j2.js:179317-179426 placement
var TERMINAL_TITLE_SOURCES = [
  "disabled",
  "serviceName",
  "sessionTitle",
  "aiSessionTitle",
  "agentTitle",
  "haikuTitle",
  "terminalTitle",
];
//@ chunk-czq1j3j2.js:179426-180518 placement
class TerminalTitleController {
  #e = createSignal();
  #t;
  #o = [];
  #n;
  #r;
  #s;
  #l = false;
  #i = false;
  constructor(options) {
    this.#t = options;
    this.#r = terminalTitleFromRename(options.store);
    this.#s = options.store.getState().remoteSessionName;
    this.#n = this.#c();
  }
  connect() {
    if (this.#l || this.#i) return;
    this.#l = true;
    let sources = this.#t;
    this.#o.push(
      subscribeSessionTitleChanged(this.#a),
      sources.session.subscribe(this.#a),
      sources.sessionController.subscribe(this.#a),
      sources.scope.subscribe(this.#a),
      sources.store.subscribe(() => {
        let renamedTitle = terminalTitleFromRename(sources.store);
        let remoteSessionName = sources.store.getState().remoteSessionName;
        if (renamedTitle === this.#r && remoteSessionName === this.#s) return;
        this.#r = renamedTitle;
        this.#s = remoteSessionName;
        this.#a();
      }),
    );
    this.#a();
  }
  subscribe = (listener) => this.#e.subscribe(listener);
  getSnapshot = () => this.#n;
  dispose = () => {
    this.#i = true;
    this.#l = false;
    for (let unsubscribe of this.#o.splice(0)) unsubscribe();
  };
  #a = () => {
    let nextTitle = this.#c();
    let currentTitle = this.#n;
    if (TERMINAL_TITLE_SOURCES.every((source) => Object.is(nextTitle[source], currentTitle[source]))) return;
    this.#n = nextTitle;
    this.#e.emit();
  };
  #c() {
    let { session, sessionController, scope, disabled } = this.#t;
    let sessionTitle = this.#r ? getCurrentSessionTitle(session.id) : undefined;
    let currentSessionAiTitle = getCurrentSessionAiTitle(session.id);
    let { haikuTitle } = sessionController.getSnapshot();
    let agentType = scope.getSnapshot().mainThreadAgentDefinition?.agentType;
    let serviceName = this.#r ? this.#s : undefined;
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
