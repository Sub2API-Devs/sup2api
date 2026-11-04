/**
 * which/which.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: which@2.0.2
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_isexe } from "../isexe/index.js";

//@ chunk-m4p5zn6n.js:2251-3688 cjs-fingerprint
var require_which = __commonJS(function (cjsExports, cjsModule) {
  var isWindows = process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
  var path = importMetaRequire("path");
  var COLON = isWindows ? ";" : ":";
  var isexe = require_isexe();
  var getNotFoundError = (cmd) =>
    Object.assign(Error(`not found: ${cmd}`), {
      code: "ENOENT",
    });
  var getPathInfo = (cmd, opt) => {
    let colon = opt.colon || COLON;
    let pathEnv =
      cmd.match(/\//) || (isWindows && cmd.match(/\\/))
        ? [""]
        : [...(isWindows ? [process.cwd()] : []), ...(opt.path || process.env.PATH || "").split(colon)];
    let pathExtExe = isWindows ? opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
    let pathExt = isWindows ? pathExtExe.split(colon) : [""];
    if (isWindows) {
      if (cmd.indexOf(".") !== -1 && pathExt[0] !== "") pathExt.unshift("");
    }
    return {
      pathEnv,
      pathExt,
      pathExtExe,
    };
  };
  var which = (cmd, opt, cb) => {
    if (typeof opt === "function") {
      cb = opt;
      opt = {};
    }
    if (!opt) opt = {};
    let { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
    let found = [];
    let step = (i) =>
      new Promise((resolve, reject) => {
        if (i === pathEnv.length)
          return opt.all && found.length ? resolve(found) : reject(getNotFoundError(cmd));
        let ppRaw = pathEnv[i];
        let pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
        let pCmd = path.join(pathPart, cmd);
        let p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
        resolve(subStep(p, i, 0));
      });
    let subStep = (cmdPath, i, ii) =>
      new Promise((resolve, reject) => {
        if (ii === pathExt.length) return resolve(step(i + 1));
        let ext = pathExt[ii];
        isexe(
          cmdPath + ext,
          {
            pathExt: pathExtExe,
          },
          (er, is) => {
            if (!er && is)
              if (opt.all) found.push(cmdPath + ext);
              else return resolve(cmdPath + ext);
            return resolve(subStep(cmdPath, i, ii + 1));
          },
        );
      });
    return cb ? step(0).then((res) => cb(null, res), cb) : step(0);
  };
  var whichSync = (cmd, opt) => {
    opt = opt || {};
    let { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
    let found = [];
    for (let i = 0; i < pathEnv.length; i++) {
      let ppRaw = pathEnv[i];
      let pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
      let pCmd = path.join(pathPart, cmd);
      let p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
      for (let j = 0; j < pathExt.length; j++) {
        let cur = p + pathExt[j];
        try {
          if (
            isexe.sync(cur, {
              pathExt: pathExtExe,
            })
          )
            if (opt.all) found.push(cur);
            else return cur;
        } catch (ex) {}
      }
    }
    if (opt.all && found.length) return found;
    if (opt.nothrow) return null;
    throw getNotFoundError(cmd);
  };
  cjsModule.exports = which;
  which.sync = whichSync;
});
export { require_which };
