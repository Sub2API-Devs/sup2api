/**
 * @opentelemetry/api/build/src/api/context.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_NoopContextManager } from "../context/NoopContextManager.js";
import { require_global_utils } from "../internal/global-utils.js";
import { require_diag } from "./diag.js";

//@ chunk-7kayq7nc.js:38550-39233 cjs-fingerprint
var require_context_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ContextAPI = undefined;
  var NoopContextManager_1 = require_NoopContextManager();
  var global_utils_1 = require_global_utils();
  var diag_1 = require_diag();
  var API_NAME = "context";
  var NOOP_CONTEXT_MANAGER = new NoopContextManager_1.NoopContextManager();
  class ContextAPI {
    constructor() {}
    static getInstance() {
      if (!this._instance) this._instance = new ContextAPI();
      return this._instance;
    }
    setGlobalContextManager(contextManager) {
      return global_utils_1.registerGlobal(API_NAME, contextManager, diag_1.DiagAPI.instance());
    }
    active() {
      return this._getContextManager().active();
    }
    with(context, fn, thisArg, ...args) {
      return this._getContextManager().with(context, fn, thisArg, ...args);
    }
    bind(context, target) {
      return this._getContextManager().bind(context, target);
    }
    _getContextManager() {
      return global_utils_1.getGlobal(API_NAME) || NOOP_CONTEXT_MANAGER;
    }
    disable() {
      this._getContextManager().disable();
      global_utils_1.unregisterGlobal(API_NAME, diag_1.DiagAPI.instance());
    }
  }
  cjsExports.ContextAPI = ContextAPI;
});
export { require_context_2 };
