/**
 * google-logging-utils/build/src/logging-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-logging-utils@1.0.1..1.1.3
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_colours } from "./colours.js";

//@ chunk-na3pph4p.js:45073-49774 cjs-fingerprint
var require_logging_utils = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    (function () {
      var ownKeys = function (o) {
        ownKeys =
          Object.getOwnPropertyNames ||
          function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
          };
        return ownKeys(o);
      };
      return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++)
            if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.env =
    cjsExports.DebugLogBackendBase =
    cjsExports.placeholder =
    cjsExports.AdhocDebugLogger =
    cjsExports.LogSeverity =
      undefined;
  cjsExports.getNodeBackend = getNodeBackend;
  cjsExports.getDebugBackend = getDebugBackend;
  cjsExports.getStructuredBackend = getStructuredBackend;
  cjsExports.setBackend = setBackend;
  cjsExports.log = log;
  var events_1 = importMetaRequire("events");
  var processModule = __importStar(importMetaRequire("process"));
  var util = __importStar(importMetaRequire("util"));
  var colours_1 = require_colours();
  var LogSeverity;
  (function (LogSeverity) {
    LogSeverity.DEFAULT = "DEFAULT";
    LogSeverity.DEBUG = "DEBUG";
    LogSeverity.INFO = "INFO";
    LogSeverity.WARNING = "WARNING";
    LogSeverity.ERROR = "ERROR";
  })(LogSeverity || (cjsExports.LogSeverity = LogSeverity = {}));
  class AdhocDebugLogger extends events_1.EventEmitter {
    constructor(namespace, upstream) {
      super();
      this.namespace = namespace;
      this.upstream = upstream;
      this.func = Object.assign(this.invoke.bind(this), {
        instance: this,
        on: (event, listener) => this.on(event, listener),
      });
      this.func.debug = (...args) => this.invokeSeverity(LogSeverity.DEBUG, ...args);
      this.func.info = (...args) => this.invokeSeverity(LogSeverity.INFO, ...args);
      this.func.warn = (...args) => this.invokeSeverity(LogSeverity.WARNING, ...args);
      this.func.error = (...args) => this.invokeSeverity(LogSeverity.ERROR, ...args);
      this.func.sublog = (namespace) => log(namespace, this.func);
    }
    invoke(fields, ...args) {
      if (this.upstream)
        try {
          this.upstream(fields, ...args);
        } catch (e) {}
      try {
        this.emit("log", fields, args);
      } catch (e) {}
    }
    invokeSeverity(severity, ...args) {
      this.invoke(
        {
          severity,
        },
        ...args,
      );
    }
  }
  cjsExports.AdhocDebugLogger = AdhocDebugLogger;
  cjsExports.placeholder = new AdhocDebugLogger("", () => {}).func;
  class DebugLogBackendBase {
    constructor() {
      var _a;
      this.cached = new Map();
      this.filters = [];
      this.filtersSet = false;
      let nodeFlag =
        (_a = processModule.env[cjsExports.env.nodeEnables]) !== null && _a !== undefined ? _a : "*";
      if (nodeFlag === "all") nodeFlag = "*";
      this.filters = nodeFlag.split(",");
    }
    log(namespace, fields, ...args) {
      try {
        if (!this.filtersSet) {
          this.setFilters();
          this.filtersSet = true;
        }
        let logger = this.cached.get(namespace);
        if (!logger) {
          logger = this.makeLogger(namespace);
          this.cached.set(namespace, logger);
        }
        logger(fields, ...args);
      } catch (e) {
        console.error(e);
      }
    }
  }
  cjsExports.DebugLogBackendBase = DebugLogBackendBase;
  class NodeBackend extends DebugLogBackendBase {
    constructor() {
      super(...arguments);
      this.enabledRegexp = /.*/g;
    }
    isEnabled(namespace) {
      return this.enabledRegexp.test(namespace);
    }
    makeLogger(namespace) {
      if (!this.enabledRegexp.test(namespace)) return () => {};
      return (fields, ...args) => {
        var _a;
        let nscolour = `${colours_1.Colours.green}${namespace}${colours_1.Colours.reset}`;
        let pid = `${colours_1.Colours.yellow}${processModule.pid}${colours_1.Colours.reset}`;
        let level;
        switch (fields.severity) {
          case LogSeverity.ERROR:
            level = `${colours_1.Colours.red}${fields.severity}${colours_1.Colours.reset}`;
            break;
          case LogSeverity.INFO:
            level = `${colours_1.Colours.magenta}${fields.severity}${colours_1.Colours.reset}`;
            break;
          case LogSeverity.WARNING:
            level = `${colours_1.Colours.yellow}${fields.severity}${colours_1.Colours.reset}`;
            break;
          default:
            level = (_a = fields.severity) !== null && _a !== undefined ? _a : LogSeverity.DEFAULT;
            break;
        }
        let msg = util.formatWithOptions(
          {
            colors: colours_1.Colours.enabled,
          },
          ...args,
        );
        let filteredFields = Object.assign({}, fields);
        delete filteredFields.severity;
        let fieldsJson = Object.getOwnPropertyNames(filteredFields).length
          ? JSON.stringify(filteredFields)
          : "";
        let fieldsColour = fieldsJson
          ? `${colours_1.Colours.grey}${fieldsJson}${colours_1.Colours.reset}`
          : "";
        console.error("%s [%s|%s] %s%s", pid, nscolour, level, msg, fieldsJson ? ` ${fieldsColour}` : "");
      };
    }
    setFilters() {
      let replaced = this.filters
        .join(",")
        .replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/,/g, "$|^");
      this.enabledRegexp = new RegExp(`^${replaced}$`, "i");
    }
  }
  function getNodeBackend() {
    return new NodeBackend();
  }
  class DebugBackend extends DebugLogBackendBase {
    constructor(pkg) {
      super();
      this.debugPkg = pkg;
    }
    makeLogger(namespace) {
      let debugLogger = this.debugPkg(namespace);
      return (fields, ...args) => {
        debugLogger(args[0], ...args.slice(1));
      };
    }
    setFilters() {
      var _a;
      let existingFilters = (_a = processModule.env.NODE_DEBUG) !== null && _a !== undefined ? _a : "";
      processModule.env.NODE_DEBUG = `${existingFilters}${existingFilters ? "," : ""}${this.filters.join(",")}`;
    }
  }
  function getDebugBackend(debugPkg) {
    return new DebugBackend(debugPkg);
  }
  class StructuredBackend extends DebugLogBackendBase {
    constructor(upstream) {
      var _a;
      super();
      this.upstream = (_a = upstream) !== null && _a !== undefined ? _a : undefined;
    }
    makeLogger(namespace) {
      var _a;
      let debugLogger =
        (_a = this.upstream) === null || _a === undefined ? undefined : _a.makeLogger(namespace);
      return (fields, ...args) => {
        var _a;
        let severity = (_a = fields.severity) !== null && _a !== undefined ? _a : LogSeverity.INFO;
        let json = Object.assign(
          {
            severity,
            message: util.format(...args),
          },
          fields,
        );
        let jsonString = JSON.stringify(json);
        if (debugLogger) debugLogger(fields, jsonString);
        else console.log("%s", jsonString);
      };
    }
    setFilters() {
      var _a;
      if (!((_a = this.upstream) === null || _a === undefined)) _a.setFilters();
    }
  }
  function getStructuredBackend(upstream) {
    return new StructuredBackend(upstream);
  }
  cjsExports.env = {
    nodeEnables: "GOOGLE_SDK_NODE_LOGGING",
  };
  var loggerCache = new Map();
  var cachedBackend = undefined;
  function setBackend(backend) {
    cachedBackend = backend;
    loggerCache.clear();
  }
  function log(namespace, parent) {
    if (!cachedBackend) {
      if (!processModule.env[cjsExports.env.nodeEnables]) return cjsExports.placeholder;
    }
    if (!namespace) return cjsExports.placeholder;
    if (parent) namespace = `${parent.instance.namespace}:${namespace}`;
    let existing = loggerCache.get(namespace);
    if (existing) return existing.func;
    if (cachedBackend === null) return cjsExports.placeholder;
    else if (cachedBackend === undefined) cachedBackend = getNodeBackend();
    let logger = (() => {
      let previousBackend = undefined;
      return new AdhocDebugLogger(namespace, (fields, ...args) => {
        if (previousBackend !== cachedBackend) {
          if (cachedBackend === null) return;
          else if (cachedBackend === undefined) cachedBackend = getNodeBackend();
          previousBackend = cachedBackend;
        }
        if (!(cachedBackend === null || cachedBackend === undefined))
          cachedBackend.log(namespace, fields, ...args);
      });
    })();
    loggerCache.set(namespace, logger);
    return logger.func;
  }
});
export { require_logging_utils };
