/**
 * @smithy/shared-ini-file-loader/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-a1ttyqdw.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { m } from "./getHomeDir.js";
import { _ } from "./getSSOTokenFilepath.js";
import { q } from "./getSSOTokenFromFile.js";
import { W1e } from "../../types/dist-cjs/index.js";
import { V } from "./readFile.js";

//@ chunk-a1ttyqdw.js:1663-4692 cjs-fingerprint
var hU = x(function (a) {
  var f = m(),
    G = _(),
    P = q(),
    F = importMetaRequire("path"),
    g = W1e(),
    u = V(),
    X = "AWS_PROFILE",
    B = "default",
    re = (e) => e.profile || process.env[X] || B,
    c = ".",
    oe = (e) =>
      Object.entries(e)
        .filter(([t]) => {
          let index = t.indexOf(c);
          if (index === -1) return !1;
          return Object.values(g.IniSectionType).includes(t.substring(0, index));
        })
        .reduce(
          (t, [r, o]) => {
            let index = r.indexOf(c),
              i = r.substring(0, index) === g.IniSectionType.PROFILE ? r.substring(index + 1) : r;
            return ((t[i] = o), t);
          },
          { ...(e.default && { default: e.default }) },
        ),
    ne = "AWS_CONFIG_FILE",
    J = () => process.env[ne] || F.join(f.getHomeDir(), ".aws", "config"),
    ie = "AWS_SHARED_CREDENTIALS_FILE",
    se = () => process.env[ie] || F.join(f.getHomeDir(), ".aws", "credentials"),
    ce = /^([\w-]+)\s(["'])?([\w-@\+\.%:/]+)\2$/,
    ae = ["__proto__", "profile __proto__"],
    T = (e) => {
      let t = {},
        r,
        o;
      for (let n of e.split(/\r?\n/)) {
        let trimmed = n.split(/(^|\s)[;#]/)[0].trim();
        if (trimmed[0] === "[" && trimmed[trimmed.length - 1] === "]") {
          ((r = void 0), (o = void 0));
          let substring = trimmed.substring(1, trimmed.length - 1),
            match = ce.exec(substring);
          if (match) {
            let [, p, , O] = match;
            if (Object.values(g.IniSectionType).includes(p)) r = [p, O].join(c);
          } else r = substring;
          if (ae.includes(substring)) throw Error(`Found invalid profile name "${substring}"`);
        } else if (r) {
          let index = trimmed.indexOf("=");
          if (![0, -1].includes(index)) {
            let [l, p] = [trimmed.substring(0, index).trim(), trimmed.substring(index + 1).trim()];
            if (p === "") o = l;
            else {
              if (o && n.trimStart() === n) o = void 0;
              t[r] = t[r] || {};
              let O = o ? [o, l].join(c) : l;
              t[r][O] = p;
            }
          }
        }
      }
      return t;
    },
    U = () => ({}),
    z = async (e = {}) => {
      let { filepath: filepath = se(), configFilepath: configFilepath = J() } = e,
        homeDir = f.getHomeDir(),
        n = "~/",
        i = filepath;
      if (filepath.startsWith("~/")) i = F.join(homeDir, filepath.slice(2));
      let S = configFilepath;
      if (configFilepath.startsWith("~/")) S = F.join(homeDir, configFilepath.slice(2));
      let results = await Promise.all([
        u.readFile(S, { ignoreCache: e.ignoreCache }).then(T).then(oe).catch(U),
        u.readFile(i, { ignoreCache: e.ignoreCache }).then(T).catch(U),
      ]);
      return { configFile: results[0], credentialsFile: results[1] };
    },
    le = (e) =>
      Object.entries(e)
        .filter(([t]) => t.startsWith(g.IniSectionType.SSO_SESSION + c))
        .reduce((t, [r, o]) => ({ ...t, [r.substring(r.indexOf(c) + 1)]: o }), {}),
    ue = () => ({}),
    pe = async (e = {}) =>
      u
        .readFile(e.configFilepath ?? J())
        .then(T)
        .then(le)
        .catch(ue),
    fe = (...e) => {
      let t = {};
      for (let r of e)
        for (let [o, n] of Object.entries(r))
          if (t[o] !== void 0) Object.assign(t[o], n);
          else t[o] = n;
      return t;
    },
    de = async (e) => {
      let t = await z(e);
      return fe(t.configFile, t.credentialsFile);
    },
    Fe = {
      getFileRecord() {
        return u.fileIntercept;
      },
      interceptFile(e, t) {
        u.fileIntercept[e] = Promise.resolve(t);
      },
      getTokenRecord() {
        return P.tokenIntercept;
      },
      interceptToken(e, t) {
        P.tokenIntercept[e] = t;
      },
    };
  Object.defineProperty(a, "getSSOTokenFromFile", {
    enumerable: !0,
    get: function () {
      return P.getSSOTokenFromFile;
    },
  });
  Object.defineProperty(a, "readFile", {
    enumerable: !0,
    get: function () {
      return u.readFile;
    },
  });
  a.CONFIG_PREFIX_SEPARATOR = c;
  a.DEFAULT_PROFILE = B;
  a.ENV_PROFILE = X;
  a.externalDataInterceptor = Fe;
  a.getProfileName = re;
  a.loadSharedConfigFiles = z;
  a.loadSsoSessionData = pe;
  a.parseKnownFiles = de;
  Object.keys(f).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(a, e))
      Object.defineProperty(a, e, {
        enumerable: !0,
        get: function () {
          return f[e];
        },
      });
  });
  Object.keys(G).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(a, e))
      Object.defineProperty(a, e, {
        enumerable: !0,
        get: function () {
          return G[e];
        },
      });
  });
});

export { hU };
