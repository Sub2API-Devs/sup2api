/**
 * services/pluginEval/credentialExclusion.ts
 *
 * 2.1.316 新增：plugin eval 授予 shell 时找出本机各类凭据存储（Anthropic profile、AWS、kube、ssh、krb5、JVM、Ansible、Azure、git 等）以从沙箱中排除
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (45)
 * attribution: placement 45
 */
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  stat,
  stat as stat_2,
  stat as stat_3,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
} from "fs/promises";
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
} from "fs";
import os_2, { default as os_2_2, default as os_3 } from "os";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { describeFenceProbeFailure, Jn } from "./evalFence.js";
import { getFileKind } from "../../utils/fileKind.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  create,
  strictCreate,
  create_2,
  create_25,
  create_15,
  create_12,
  create_20,
} from "../../../vendor/zod/lib/index.mjs";
import { getPlatform } from "../../utils/platform.js";
import { op, gp, CLAUDE_EVAL_AUTH } from "./childEnvironment.js";
import { parseYaml } from "../../utils/yaml.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import {
  splitQuotedWords,
  parseMavenSettingsFlag,
  normalizeDefineArgs,
  stripJavaLauncherPrefix,
  parseSbtDirFlag,
  BUILD_TOOL_SETTINGS_PROPERTY_PATTERN,
  JVM_OPTIONS_ENV_NAMES,
  normalizeEnvNameForMatch,
  containsCredential,
  tokensContainSecret,
  isCredentialPropertyName,
  isScalarPropertyValue,
} from "../../utils/settings/policyHelper/helperEnv.js";
import { withTimeout } from "../../utils/sleep.js";
import { uniq } from "../../utils/collections.js";

/**
 * 列出目录下的子目录（不跟随链接）；目录不存在返回空，无法分类的条目抛出隔离探测失败错误。
 */
//@ chunk-qchp9vrd.js:201749-202064 placement
async function listSubdirectories(e, n) {
  let r;
  try {
    r = await readdir_10(e, { withFileTypes: !0 });
  } catch (error) {
    let h = getErrnoCode(error);
    if (h === "ENOENT" || h === "ENOTDIR") return [];
    throw describeFenceProbeFailure(n, error);
  }
  let a = [];
  for (let s of r) {
    let joined = path_15.join(e, s.name),
      w = await getFileKind(s, joined, "unknown");
    if (w === "unknown") throw describeFenceProbeFailure(n, Error("unclassifiable directory entry"));
    if (w === "dir") a.push(joined);
  }
  return a;
}
/**
 * 把环境变量对象的键转为大写（同名保留先出现的值）。
 */
//@ chunk-qchp9vrd.js:202064-202173 placement
function upperCaseEnvKeys(e) {
  let n = {};
  for (let [r, a] of Object.entries(e)) {
    let upper = r.toUpperCase();
    if (!(upper in n)) n[upper] = a;
  }
  return n;
}
/**
 * 读取 ANTHROPIC_CONFIG_DIR 下的 profile 配置以排除其凭据文件。
 */
//@ chunk-qchp9vrd.js:202173-203943 placement
async function readAnthropicProfileConfigs(e, n) {
  let joined = path_15.join(e, "configs"),
    a = n?.trim() || (await Ft(path_15.join(e, "active_config")))?.trim();
  if (a && (path_15.isAbsolute(a) || a.split(/[\\/]/).includes("..")))
    throw describeUnreadableCredentialsPointer(
      "the selected Anthropic profile name leaves the configs directory",
    );
  let s = [],
    h = [""];
  for (let b = h.pop(); b !== void 0; b = h.pop()) {
    let y;
    try {
      y = await readdir_10(path_15.join(joined, b), { withFileTypes: !0 });
    } catch (error) {
      let S = getErrnoCode(error);
      if (b === "" && (S === "ENOENT" || S === "ENOTDIR")) return [];
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the Anthropic profile configs directory (ANTHROPIC_CONFIG_DIR/configs) could not be read (${S ?? "unreadable"}), so the Bash sandbox cannot exclude its credential files \u2014 a Bash-granting evaluation cannot run here`,
        "eval shell grant refused: profile configs directory unreadable",
      );
    }
    for (let R of y) {
      let joined_2 = path_15.join(b, R.name),
        T = await getFileKind(R, path_15.join(joined, joined_2), "unknown");
      if (T === "symlink") {
        if (
          ((T = await stat_3(path_15.join(joined, joined_2)).then(
            (x) => (x.isDirectory() ? "dir" : x.isFile() ? "file" : "other"),
            (x) => {
              let j = getErrnoCode(x);
              if (j === "ENOENT" || j === "ENOTDIR") return "other";
              throw describeUnreadableCredentialsPointer(
                `a profile configs entry could not be examined (${j ?? "unreadable"})`,
              );
            },
          )),
          T === "other")
        )
          continue;
      }
      if (T !== "dir" && T !== "file")
        throw describeUnreadableCredentialsPointer("a profile configs entry is not a regular file");
      if (T === "dir") {
        if (joined_2.split(path_15.sep).length > MAX_PROFILE_DEPTH)
          throw describeUnreadableCredentialsPointer("profile configs nest too deeply to enumerate");
        h.push(joined_2);
      } else if (R.name.toLowerCase().endsWith(".json")) s.push(joined_2);
    }
  }
  let w = [];
  for (let b of s) {
    let sliced = b.slice(0, -5),
      R = await Ft(path_15.join(joined, b)),
      S = void 0;
    if (R !== null)
      try {
        S = jsonParse(R);
      } catch {
        throw describeUnreadableCredentialsPointer("a profile config is not valid JSON");
      }
    let safeParse = anthropicProfileAuthSchema().safeParse(S ?? {});
    if (!safeParse.success)
      throw describeUnreadableCredentialsPointer(
        "a profile config has an authentication block this cannot follow",
      );
    let authentication = safeParse.data.authentication,
      x = authentication?.credentials_path;
    w.push(x === void 0 ? path_15.join(e, "credentials", `${sliced}.json`) : nr(x));
    let j = authentication?.identity_token?.path;
    if (typeof j === "string") w.push(nr(j));
  }
  return w;
}
/**
 * 凭据排除用常量：配置文件递归深度上限、认证配置文件 schema、读取大小上限。
 */
//@ chunk-qchp9vrd.js:203943-204271 placement
var MAX_PROFILE_DEPTH = 4,
  anthropicProfileAuthSchema = DoctorLazy(() =>
    create({
      authentication: strictCreate({
        type: create_2().optional(),
        credentials_path: create_2().optional(),
        identity_token: strictCreate({ source: create_25("file"), path: create_2() }).optional(),
        federation_rule_id: create_2().optional(),
        service_account_id: create_2().optional(),
        scope: create_2().optional(),
        client_id: create_2().optional(),
        console_url: create_2().optional(),
      }).optional(),
    }),
  ),
  MAX_CREDENTIAL_FILE_BYTES = 1048576;
//@ chunk-qchp9vrd.js:204271-204330 placement
async function Ft(e) {
  return probePathDirectories(resolveCredentialPath(e), "a credential store");
}
//@ chunk-qchp9vrd.js:204330-205120 placement
async function resolveCredentialPath(e) {
  let n;
  try {
    n = await open_6(e, getPlatform() === "windows" ? "r" : constants_6.O_RDONLY | constants_6.O_NONBLOCK);
  } catch (error) {
    let a = getErrnoCode(error);
    if (
      (a === "ENOENT" || a === "ENOTDIR") &&
      !(await lstat_11(e).then(
        (s) => s.isSymbolicLink(),
        () => !1,
      )) &&
      (await op(e))
    )
      return null;
    if (
      (a === "EACCES" || a === "EPERM") &&
      process.getuid !== void 0 &&
      (await stat_3(e).then(
        (s) => s.uid !== process.getuid?.(),
        () => !1,
      ))
    )
      return null;
    throw describeUnreadableCredentialsPointer(getErrnoCode(error) ?? "unreadable");
  }
  try {
    let stats = await n.stat();
    if (stats.isFIFO() || stats.isSocket())
      throw describeUnreadableCredentialsPointer("it is a pipe, whose content cannot be inspected");
    if (stats.isDirectory() || (await isNullDevice(stats))) return null;
    if (!stats.isFile())
      throw describeUnreadableCredentialsPointer("it is a device, whose content cannot be inspected");
    if (stats.size > MAX_CREDENTIAL_FILE_BYTES)
      throw describeUnreadableCredentialsPointer(`larger than ${MAX_CREDENTIAL_FILE_BYTES} bytes`);
    return await n.readFile({ encoding: "utf8" });
  } catch (error) {
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw describeUnreadableCredentialsPointer(getErrnoCode(error) ?? "unreadable");
  } finally {
    await n.close();
  }
}
//@ chunk-qchp9vrd.js:205120-205522 placement
function describeUnreadableCredentialsPointer(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `a credentials file in this environment (the AWS config / shared credentials file, the GCP application-default credentials, a kubeconfig, or an Anthropic profile config) could not be followed (${e}), so the Bash sandbox cannot exclude the files it points at \u2014 a Bash-granting evaluation cannot run here`,
    "eval shell grant refused: credentials pointer file unreadable",
  );
}
/**
 * kubeconfig 中 users 段的宽松 schema：用于提取客户端证书/密钥、token 文件、exec 参数与环境、auth-provider 配置中的凭据路径。
 */
//@ chunk-qchp9vrd.js:205522-205966 placement
var kubeconfigUsersSchema = DoctorLazy(() => {
  let passthrough = create({
    "client-key": create_2().nullish(),
    "client-certificate": create_2().nullish(),
    tokenFile: create_2().nullish(),
    "token-file": create_2().nullish(),
    exec: create({
      args: create_15(create_12()).nullish(),
      env: create_15(create({ name: create_2(), value: create_12().optional() }).passthrough()).nullish(),
    })
      .passthrough()
      .nullish(),
    "auth-provider": create({ config: create_20(create_12()).nullish() })
      .passthrough()
      .nullish(),
  }).passthrough();
  return create({
    users: create_15(create({ user: passthrough.nullish() }).passthrough()).nullish(),
  }).passthrough();
});
//@ chunk-qchp9vrd.js:205966-207152 placement
async function parseKubeconfigCredentials(e) {
  let n = await Ft(e);
  if (n === null) return { files: [], execFiles: [] };
  let r;
  try {
    r = parseYaml(n);
  } catch {
    throw describeUnreadableCredentialsPointer("a kubeconfig does not parse");
  }
  if (r === null || r === void 0) return { files: [], execFiles: [] };
  let safeParse = kubeconfigUsersSchema().safeParse(r);
  if (!safeParse.success)
    throw describeUnreadableCredentialsPointer("a kubeconfig does not have the expected shape");
  let s = [],
    h = [];
  for (let { user: user } of safeParse.data.users ?? []) {
    if (!user) continue;
    for (let T of [user["client-key"], user["client-certificate"], user.tokenFile, user["token-file"]])
      if (T) s.push(path_15.resolve(path_15.dirname(e), T));
    let b = user.exec ?? null,
      y = user["auth-provider"] ?? null,
      R = [],
      S = b?.args ?? [];
    for (let T = 0; T < S.length; T++) {
      let N = S[T];
      if (typeof N !== "string" || !N.startsWith("-")) continue;
      let index = N.indexOf("=");
      if (index !== -1) R.push([N.slice(0, index), N.slice(index + 1)]);
      else R.push([N, S[T + 1]]);
    }
    for (let T of b?.env ?? []) R.push([T.name, T.value]);
    R.push(...Object.entries(y?.config ?? {}));
    for (let [T, N] of R) {
      if (
        typeof N !== "string" ||
        !(
          /token|key|secret|cred|passw|pfx|p12/i.test(T) ||
          (/cert/i.test(T) && !/authorit|(?:^|[-_.])ca(?:$|[-_.])/i.test(T))
        )
      )
        continue;
      if (path_15.isAbsolute(N)) h.push(N);
      else if (/^(?:~|\.\.?)\//.test(N) || /-(?:file|path|dir)$/i.test(T))
        throw describeUnreadableCredentialsPointer(
          "a kubeconfig exec plugin names a credential file by a relative path",
        );
    }
  }
  return { files: s, execFiles: h };
}
/**
 * 把 shell 通配模式（*、?、[...] 与 [!...]）转换为锚定的正则，其他字符转义。
 */
//@ chunk-qchp9vrd.js:207152-207500 placement
function globToRegExp(e) {
  let n = "";
  for (let r = 0; r < e.length; r++) {
    let a = e[r];
    if (a === "*") n += "[^/]*";
    else if (a === "?") n += "[^/]";
    else if (a === "[") {
      let index = e.indexOf("]", r + 1);
      if (index === -1) n += "\\[";
      else {
        let replaced = e.slice(r + 1, index).replace(/\\/g, "\\\\");
        ((n += `[${replaced.startsWith("!") ? `^${replaced.slice(1)}` : replaced}]`), (r = index));
      }
    } else n += a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${n}$`);
}
//@ chunk-qchp9vrd.js:207500-207507 placement
var Ti;
//@ chunk-qchp9vrd.js:207507-207573 placement
function Yp() {
  return (
    (Ti ??= getAccountName().catch((e) => {
      throw ((Ti = void 0), e);
    })),
    Ti
  );
}
//@ chunk-qchp9vrd.js:207573-207757 placement
async function getAccountName() {
  let { stdout: stdout, code: code } = await execFileNoThrow("id", ["-un"], { preserveOutputOnError: !1 }),
    trimmed = stdout.trim();
  if (code !== 0 || !trimmed)
    throw describeUnreadableCredentialsPointer("the account name for %u could not be determined");
  return trimmed;
}
/**
 * 解析 ssh_config（Include、ProxyCommand、IdentityFile）找出密钥文件。
 */
//@ chunk-qchp9vrd.js:207757-209172 placement
async function parseSshConfigIdentities(e, n, r = 0, a = path_15.join(n, ".ssh")) {
  let s = await Ft(e);
  if (s === null) return [];
  if (r > 16)
    throw describeUnreadableCredentialsPointer(
      "ssh_config Include / ProxyCommand -F chains nest too deeply (a cycle?)",
    );
  let joined = path_15.join(n, ".ssh"),
    w = async (R, S = joined) => {
      let T = await expandSshPathTokens(R, n);
      if (path_15.isAbsolute(T)) return T;
      if (S === null)
        throw describeUnreadableCredentialsPointer(
          "an ssh_config names a key file by a relative path (resolved against whatever directory ssh runs in)",
        );
      return path_15.join(S, T);
    },
    b = (R) => [...R.matchAll(/"([^"]*)"|(\S+)/g)].map((S) => S[1] ?? S[2]),
    y = [];
  for (let R of s.split(/\r?\n/)) {
    let match = /^\s*(identityfile|certificatefile|include|proxycommand)(?:\s*=\s*|\s+)(.+?)\s*$/i.exec(R);
    if (!match) continue;
    let [, T, N] = match;
    if (T.toLowerCase() === "proxycommand") {
      if (N.trim().toLowerCase() !== "none") y.push(...(await parseSshCommandIdentities(N, n, r + 1)));
      continue;
    }
    if (T.toLowerCase() !== "include") {
      let x = b(N)[0] ?? N;
      if (x.toLowerCase() === "none") continue;
      y.push(await w(x, null));
      continue;
    }
    for (let x of b(N)) {
      let j = await w(x, a);
      if (!Jn(j)) y.push(...(await parseSshConfigIdentities(j, n, r + 1, a)));
      else if (!Jn(path_15.dirname(j))) {
        let dir = path_15.dirname(j),
          X = globToRegExp(path_15.basename(j)),
          W;
        try {
          W = await readdir_10(dir);
        } catch (error) {
          let Z = getErrnoCode(error);
          if (Z === "ENOENT" || Z === "ENOTDIR") continue;
          throw describeUnreadableCredentialsPointer(
            `an ssh_config Include directory could not be read (${Z ?? "unreadable"})`,
          );
        }
        let startsWith = path_15.basename(j).startsWith(".");
        W = W.filter((J) => X.test(J) && (startsWith || !J.startsWith(".")));
        for (let J of W) y.push(...(await parseSshConfigIdentities(path_15.join(dir, J), n, r + 1, a)));
      } else
        throw describeUnreadableCredentialsPointer(
          "an ssh_config Include pattern with a wildcard directory cannot be followed",
        );
    }
  }
  return y;
}
//@ chunk-qchp9vrd.js:209172-210996 placement
function parseJvmBuildToolCredentials(e) {
  let n = [],
    r = (h) => {
      if (!path_15.isAbsolute(h))
        throw describeUnreadableCredentialsPointer(
          "a JVM build tool argument names a settings store by a relative path",
        );
      return h;
    },
    a = (h) => {
      let w = splitQuotedWords(e(h) ?? "");
      if (w === null)
        throw describeUnreadableCredentialsPointer(
          "a JVM build tool argument variable holds an unterminated quotation",
        );
      return w;
    };
  for (let h of MAVEN_ARGS_ENV_NAMES) {
    let w = a(h);
    for (let b = 0; b < w.length; b++) {
      let y = parseMavenSettingsFlag(w[b]);
      if (y === null) continue;
      let R = y || w[b + 1];
      if (R) n.push(r(R));
    }
  }
  let s = (h) => [
    path_15.join(h, ".credentials"),
    path_15.join(h, "1.0", "credentials.sbt"),
    path_15.join(h, "1.0", "plugins", "credentials.sbt"),
  ];
  for (let h of JVM_OPTIONS_ENV_SET) {
    let flattened = normalizeDefineArgs(a(h).map(stripJavaLauncherPrefix)).flatMap((b) => {
      let match = /^-D[^=]+=\s*(-.*)$/s.exec(b);
      if (!match) return [b];
      let R = splitQuotedWords(match[1]);
      if (R === null)
        throw describeUnreadableCredentialsPointer(
          "a JVM option variable nests an options line with an unterminated quotation",
        );
      return [b, ...normalizeDefineArgs(R.map(stripJavaLauncherPrefix))];
    });
    for (let b = 0; b < flattened.length; b++) {
      let y = flattened[b];
      if (y.startsWith("@")) throw describeUnreadableCredentialsPointer(`${h} names an @argument file`);
      if (
        y.includes("\\") &&
        /^-D[^=]*=|^-{1,2}[a-z-]*(?:settings|ivy|sbt-dir)/i.test(y) &&
        getPlatform() !== "windows"
      )
        throw describeUnreadableCredentialsPointer(
          `${h} carries a backslash escape in a store-relocating word`,
        );
      let R = parseSbtDirFlag(y);
      if (R !== null) {
        let x = R || flattened[b + 1];
        if (x && !/^-{1,2}sbt-boot/.test(y)) {
          let j = r(x);
          n.push(...(/^-{1,2}ivy/.test(y) ? [path_15.join(j, ".credentials")] : s(j)));
        }
        continue;
      }
      let match = /^-D([^=]+)=(.+)$/s.exec(y);
      if (!match || !BUILD_TOOL_SETTINGS_PROPERTY_PATTERN.test(match[1])) continue;
      let lower = match[1].toLowerCase();
      if (lower === "maven.repo.local" || lower === "sbt.boot.directory") continue;
      let N = r(match[2]);
      if (lower === "gradle.user.home") n.push(path_15.join(N, "gradle.properties"));
      else if (lower === "maven.home") n.push(path_15.join(N, "conf", "settings.xml"));
      else if (lower === "sbt.global.base") n.push(...s(N));
      else if (lower === "sbt.ivy.home") n.push(path_15.join(N, ".credentials"));
      else if (lower === "user.home")
        n.push(
          path_15.join(N, ".m2", "settings.xml"),
          path_15.join(N, ".m2", "settings-security.xml"),
          path_15.join(N, ".gradle", "gradle.properties"),
          path_15.join(N, ".ivy2", ".credentials"),
          ...s(path_15.join(N, ".sbt")),
        );
      else n.push(N);
    }
  }
  return n;
}
//@ chunk-qchp9vrd.js:210996-212315 placement
async function parseKrb5Config(e) {
  let filtered = (e?.trim() || "/etc/krb5.conf")
    .split(path_15.delimiter)
    .map((w) => w.trim())
    .filter(Boolean);
  if (filtered.some((w) => !path_15.isAbsolute(w)))
    throw describeUnreadableCredentialsPointer("KRB5_CONFIG holds a relative path");
  let r = String(process.getuid?.() ?? ""),
    a = [],
    s = new Set(),
    h = async (w, b) => {
      if (s.has(w)) return;
      if (b > 8) throw describeUnreadableCredentialsPointer("krb5.conf include files nest too deeply");
      s.add(w);
      let y = await Ft(w);
      if (y === null) return;
      let R = !1;
      for (let S of y.split(/\r?\n/)) {
        let trimmed = S.trim(),
          match = /^(include|includedir)\s+(.+)$/i.exec(trimmed);
        if (match) {
          let trimmed = match[2].trim();
          if (!path_15.isAbsolute(trimmed))
            throw describeUnreadableCredentialsPointer("a krb5.conf include names a relative path");
          if (match[1].toLowerCase() === "include") await h(trimmed, b + 1);
          else {
            let W;
            try {
              W = await readdir_10(trimmed);
            } catch (error) {
              let J = getErrnoCode(error);
              if (J === "ENOENT" || J === "ENOTDIR") continue;
              throw describeUnreadableCredentialsPointer("a krb5.conf includedir could not be listed");
            }
            for (let G of W.sort())
              if (/^[A-Za-z0-9_-]+$/.test(G) || G.endsWith(".conf")) await h(path_15.join(trimmed, G), b + 1);
          }
          continue;
        }
        let match_2 = /^\[([^\]]+)\]/.exec(trimmed);
        if (match_2) {
          R = match_2[1].trim().toLowerCase() === "libdefaults";
          continue;
        }
        if (!R) continue;
        let match_3 =
          /^(default_ccache_name|default_keytab_name|default_client_keytab_name)\s*=\s*(.+)$/i.exec(trimmed);
        if (!match_3) continue;
        let replaced = match_3[2].trim().replace(/%\{(?:uid|euid|USERID)\}/g, r);
        if (/%\{/.test(replaced))
          throw describeUnreadableCredentialsPointer(
            "a krb5.conf credential locator uses a parameter expansion that cannot be resolved",
          );
        a.push(...parseKerberosCacheName(replaced));
      }
    };
  for (let w of filtered) await h(w, 0);
  return a;
}
//@ chunk-qchp9vrd.js:212315-212667 placement
function parseKerberosCacheName(e) {
  let n = e?.trim();
  if (!n) return [];
  let match = /^([A-Za-z]+):(.*)$/.exec(n),
    a = match ? match[1].toUpperCase() : "FILE",
    s = match ? match[2] : n;
  if (a !== "FILE" && a !== "WRFILE" && a !== "DIR") return [];
  let h = !1;
  if (a === "DIR" && s.startsWith(":")) ((s = s.slice(1)), (h = !0));
  if (!path_15.isAbsolute(s))
    throw describeUnreadableCredentialsPointer(
      "a Kerberos ticket cache / keytab is named by a relative path",
    );
  return h ? [s, path_15.dirname(s)] : [s];
}
//@ chunk-qchp9vrd.js:212667-213652 placement
async function parseGoAuth(e, n, r) {
  if (!e?.trim()) return { stores: [], programs: [] };
  let a = [],
    s = [];
  for (let h of e.split(";")) {
    let w = splitShellWords_2(h);
    if (w === null) throw describeUnreadableCredentialsPointer("GOAUTH holds an unterminated quotation");
    let b = w[0] ?? "";
    if (b === "" || b === "off" || b === "netrc") continue;
    if (b === "git") {
      let y = w[1];
      if (!y || !path_15.isAbsolute(y))
        throw describeUnreadableCredentialsPointer("GOAUTH names a git directory by a relative path");
      (s.push(y), a.push(...(await parseGitconfigIncludes(path_15.join(y, "config"), n))));
      let joined = path_15.join(y, ".git"),
        S = await Ft(joined),
        T = S === null ? null : /^gitdir:\s*(.+?)\s*$/m.exec(S),
        N = [joined];
      if (T !== null) {
        let resolved = path_15.resolve(y, T[1]),
          j = await Ft(path_15.join(resolved, "commondir"));
        N.splice(0, 1, resolved, ...(j === null ? [] : [path_15.resolve(resolved, j.trim())]));
      }
      for (let x of N)
        a.push(
          ...(await parseGitconfigIncludes(path_15.join(x, "config"), n)),
          ...(await parseGitconfigIncludes(path_15.join(x, "config.worktree"), n)),
        );
      continue;
    }
    if (path_15.isAbsolute(b)) s.push(b);
    else if (b.includes("/") || b.includes(path_15.sep))
      throw describeUnreadableCredentialsPointer("GOAUTH names a credential helper by a relative path");
    else s.push(...r.map((y) => path_15.join(y, b)));
    s.push(...w.slice(1).filter((y) => path_15.isAbsolute(y)));
  }
  return { stores: a, programs: s };
}
/**
 * 按空白拆分 shell 单词（支持单/双引号）；引号未闭合返回 null。
 */
//@ chunk-qchp9vrd.js:213652-213955 placement
function splitShellWords_2(e) {
  let n = [],
    r = 0;
  while (r < e.length) {
    let a = e[r];
    if (
      a === " " ||
      a === "\t" ||
      a ===
        `
` ||
      a === "\r"
    ) {
      r++;
      continue;
    }
    if (a === "'" || a === '"') {
      let index = e.indexOf(a, r + 1);
      if (index === -1) return null;
      (n.push(e.slice(r + 1, index)), (r = index + 1));
      continue;
    }
    let s = r;
    while (s < e.length && !/[ \t\n\r]/.test(e[s])) s++;
    (n.push(e.slice(r, s)), (r = s));
  }
  return n;
}
//@ chunk-qchp9vrd.js:213955-215682 placement
async function parseGitconfigIncludes(e, n, r = 0, a) {
  let s = a ?? (e === null ? null : await Ft(e));
  if (s === null || s === "") return [];
  if (r > 10) throw describeUnreadableCredentialsPointer("gitconfig include files nest too deeply");
  let replaced = s.replace(/\\\r?\n/g, ""),
    w = (S) => {
      let T = "",
        N = !1;
      for (let x = 0; x < S.length; x++) {
        let j = S[x];
        if (j === '"') N = !N;
        else if (j === "\\" && x + 1 < S.length) {
          let K = S[++x];
          T +=
            K === "n"
              ? `
`
              : K === "t"
                ? "\t"
                : K;
        } else if (!N && (j === ";" || j === "#")) break;
        else T += j;
      }
      return T.trim();
    },
    b = (S) => S.replace(/^~(?=\/|$)/, n),
    y = [],
    R = "";
  for (let S of replaced.split(/\r?\n/)) {
    let match = /^\s*\[\s*([a-z0-9.-]+)[^\]]*\]\s*(.*)$/i.exec(S);
    if (match) ((R = match[1].toLowerCase()), (S = match[2] ?? ""));
    let match_2 = /^\s*([a-z][a-z0-9-]*)\s*=\s*(.+?)\s*$/i.exec(S);
    if (!match_2) continue;
    let lower = match_2[1].toLowerCase();
    if (lower === "path" && (R === "include" || R === "includeif")) {
      let K = b(w(match_2[2])),
        X = path_15.isAbsolute(K) ? K : path_15.resolve(e === null ? n : path_15.dirname(e), K);
      y.push(...(await parseGitconfigIncludes(X, n, r + 1)));
      continue;
    }
    if ((lower === "sslkey" || lower === "sslcert" || lower === "cookiefile") && R === "http") {
      let K = b(w(match_2[2]));
      if (K === "") continue;
      if (path_15.isAbsolute(K)) y.push(K);
      else throw describeUnreadableCredentialsPointer(`a gitconfig http.${match_2[1]} is a relative path`);
      continue;
    }
    if (lower === "signingkey" && R === "user") {
      let K = b(w(match_2[2]));
      if (path_15.isAbsolute(K)) y.push(K.replace(/\.pub$/, ""));
      continue;
    }
    if (lower === "sshcommand" && R === "core") {
      y.push(...(await parseSshCommandIdentities(w(match_2[2]), n)));
      continue;
    }
    if (lower !== "helper" || R !== "credential") continue;
    let mapped = [...w(match_2[2]).matchAll(/(?:"[^"]*"|'[^']*'|\\.|[^\s\\'"])+/g)].map((K) =>
      K[0].replace(/"([^"]*)"|'([^']*)'|\\(.)/g, (X, W, G, J) => W ?? G ?? J),
    );
    for (let K = 0; K < mapped.length; K++) {
      let X = mapped[K],
        W = /^--?[A-Za-z][\w-]*=(.*)$/s.exec(X)?.[1],
        G = b(W ?? X);
      if (path_15.isAbsolute(G)) {
        y.push(G);
        continue;
      }
      let matches = /^(?:--file|-f)$/.test(X);
      if (matches || /^--file=/.test(X)) {
        let Z = matches ? b(mapped[K + 1] ?? "") : G;
        if (!path_15.isAbsolute(Z))
          throw describeUnreadableCredentialsPointer(
            "a gitconfig credential helper names its file by a relative path",
          );
        if ((y.push(Z), matches)) K++;
      }
    }
  }
  return y;
}
/**
 * 展开 ssh 配置里密钥路径的 % 令牌（%d、%u、%i、%l、%L、%%）与开头的 ~；连接期令牌、${ENV} 或他人 ~ 无法静态解析时抛出。
 */
//@ chunk-qchp9vrd.js:215682-216259 placement
async function expandSshPathTokens(template, home) {
  let hostname = os_3.hostname(),
    result = "";
  for (let s = 0; s < template.length; s++) {
    let h = template[s];
    if (h !== "%") {
      result += h;
      continue;
    }
    let w = template[++s];
    if (w === "%") result += "%";
    else if (w === "d") result += home;
    else if (w === "u") result += await Yp();
    else if (w === "i") result += String(process.getuid?.() ?? "");
    else if (w === "l") result += hostname;
    else if (w === "L") result += hostname.replace(/\..*$/s, "");
    else
      throw describeUnreadableCredentialsPointer(
        "an ssh configuration or command names a key file with a connection-time %-token",
      );
  }
  if (/\$\{[^}]*\}/.test(result) || /^~[^/]/.test(result))
    throw describeUnreadableCredentialsPointer(
      "an ssh configuration or command names a key file through ${ENV} or another user's ~",
    );
  return result.replace(/^~(?=\/|$)/, home);
}
//@ chunk-qchp9vrd.js:216259-217157 placement
async function parseSshCommandIdentities(e, n, r = 0) {
  let a = splitShellWords(e, n),
    s = [],
    h = [],
    w = async (R) => {
      if (!R || R.toLowerCase() === "none" || R === "/dev/null") return;
      let S = await expandSshPathTokens(R, n);
      if (!path_15.isAbsolute(S))
        throw describeUnreadableCredentialsPointer(
          "an ssh command names an identity or configuration file by a relative path",
        );
      return S;
    },
    b = async (R) => {
      let S = await w(R);
      if (S) s.push(S);
    },
    y = findSshDestinationIndex(a);
  for (let R = y === -1 ? 1 : y + 1; R < a.length; R++) {
    let S = a[R];
    if (S === "--") break;
    if (!S.startsWith("-") || S.startsWith("--")) continue;
    for (let T = 1; T < S.length; T++) {
      let N = S[T];
      if (!tm.has(N)) continue;
      let x = T + 1 < S.length ? S.slice(T + 1) : a[++R];
      if (N === "i") await b(x);
      else if (N === "F") {
        let j = await w(x);
        if (j) h.push(j);
      } else if (N === "o") {
        let match = /^(IdentityFile|CertificateFile|ProxyCommand)(?:\s*=\s*|\s+)(.+)$/i.exec(x ?? "");
        if (match && match[1].toLowerCase() === "proxycommand") {
          if (match[2].trim().toLowerCase() !== "none")
            s.push(...(await parseSshCommandIdentities(match[2], n, r + 1)));
        } else await b(match?.[2]);
      }
      break;
    }
  }
  for (let R of h) s.push(...(await parseSshConfigIdentities(R, n, r + 1)));
  return s;
}
//@ chunk-qchp9vrd.js:217157-217193 placement
var Ci = /(?:^|[\\/])ssh(?:\.exe)?$/i;
//@ chunk-qchp9vrd.js:217193-217360 placement
function findSshDestinationIndex(e) {
  if (e.length > 0 && Ci.test(e[0])) return 0;
  let index = e.indexOf("--");
  if (index !== -1 && index + 1 < e.length && Ci.test(e[index + 1])) return index + 1;
  return e.findLastIndex((r) => Ci.test(r));
}
//@ chunk-qchp9vrd.js:217360-217401 placement
var tm = new Set("BbcDEeFIiJLlmOoPpQRSWw");
//@ chunk-qchp9vrd.js:217401-218417 placement
function splitShellWords(e, n) {
  let r = (y) => {
      throw describeUnreadableCredentialsPointer(`an ssh command ${y}`);
    },
    a = [],
    s = "",
    h = !1,
    w = 0,
    b = () => {
      let sliced = e.slice(w),
        match = /^\$\{HOME\}|^\$HOME(?![A-Za-z0-9_])/.exec(sliced);
      if (!match) r("uses a shell expansion that cannot be resolved here");
      ((s += n), (h = !0), (w += match[0].length));
    };
  while (w < e.length) {
    let y = e[w];
    if (
      y === " " ||
      y === "\t" ||
      y ===
        `
`
    ) {
      if (h) (a.push(s), (s = ""), (h = !1));
      w++;
    } else if (y === "\\") {
      if (w + 1 < e.length) ((s += e[w + 1]), (w += 2));
      else w++;
      h = !0;
    } else if (y === "'") {
      let index = e.indexOf("'", w + 1);
      if (index === -1) r("holds an unterminated quotation");
      ((s += e.slice(w + 1, index)), (h = !0), (w = index + 1));
    } else if (y === '"') {
      ((h = !0), w++);
      for (;;) {
        if (w >= e.length) r("holds an unterminated quotation");
        let R = e[w];
        if (R === '"') {
          w++;
          break;
        }
        if (R === "\\" && w + 1 < e.length && '$`"\\'.includes(e[w + 1])) ((s += e[w + 1]), (w += 2));
        else if (R === "$") b();
        else if (R === "`") r("uses a shell expansion that cannot be resolved here");
        else ((s += R), w++);
      }
    } else if (y === "$") b();
    else if (y === "`") r("uses a shell expansion that cannot be resolved here");
    else if (y === "~" && !h && (w + 1 >= e.length || /[\/\s]/.test(e[w + 1]))) ((s += n), (h = !0), w++);
    else ((s += y), (h = !0), w++);
  }
  if (h) a.push(s);
  return a;
}
//@ chunk-qchp9vrd.js:218417-219644 placement
async function parseAnsibleVaultSources(e, n, r) {
  let a = [],
    s = (R) => {
      let replaced = R.trim().replace(/^~(?=\/|$)/, n);
      if (!replaced || replaced === "prompt" || replaced.startsWith("prompt_")) return;
      if (!path_15.isAbsolute(replaced))
        throw describeUnreadableCredentialsPointer("an Ansible vault password source is a relative path");
      a.push(replaced);
    },
    h = (R) => {
      for (let S of R.split(",")) {
        let index = S.indexOf("@");
        s(index === -1 ? S : S.slice(index + 1));
      }
    },
    w = e("ANSIBLE_VAULT_IDENTITY_LIST");
  if (w) h(w);
  let b = e("ANSIBLE_CONFIG")?.trim();
  if (b !== void 0 && b !== "" && !path_15.isAbsolute(b))
    throw describeUnreadableCredentialsPointer("ANSIBLE_CONFIG holds a relative path");
  let y = await stat_3(r).then(
    (R) => (R.mode & 2) !== 0,
    () => !0,
  );
  for (let R of [
    ...(b ? [b, path_15.join(b, "ansible.cfg")] : []),
    ...(y ? [] : [path_15.join(r, "ansible.cfg")]),
    path_15.join(n, ".ansible.cfg"),
    "/etc/ansible/ansible.cfg",
  ]) {
    let S = await Ft(R);
    if (S === null) continue;
    let T = !1,
      N = [];
    for (let x of S.split(/\r?\n/))
      if (/^[ \t]+\S/.test(x) && N.length > 0 && !/^[ \t]*[#;]/.test(x))
        N[N.length - 1] += `
${x.trim()}`;
      else N.push(x);
    for (let x of N) {
      let trimmed = x.trim(),
        match = /^\[([^\]]+)\]/.exec(trimmed);
      if (match) {
        T = match[1].trim().toLowerCase() === "defaults";
        continue;
      }
      if (!T) continue;
      let match_2 = /^(vault_password_file|vault_identity_list)\s*[=:]\s*([^]*)$/i.exec(trimmed);
      if (!match_2) continue;
      if (
        ((match_2[2] = match_2[2]
          .split(
            `
`,
          )
          .map((W) => W.replace(/\s;.*$/, "").trim())
          .join(",")),
        match_2[1].toLowerCase() === "vault_password_file")
      )
        s(match_2[2]);
      else h(match_2[2]);
    }
    break;
  }
  return a;
}
//@ chunk-qchp9vrd.js:219644-219656 placement
var Nr = 5000;
/**
 * 检查 PATH 中的目录（超时视为不可达挂载）以排除凭据助手。
 */
//@ chunk-qchp9vrd.js:219656-221311 placement
async function probePathDirectories(e, n = "a PATH entry") {
  try {
    return await withTimeout(e, Nr, "PATH probe timed out");
  } catch (error) {
    if (error instanceof Error && error.message === "PATH probe timed out")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        n === "a PATH entry"
          ? `examining the PATH directories took longer than ${Nr / 1000}s (a PATH entry on an unreachable mount?), so the Bash sandbox's credential exclusions cannot be computed \u2014 a Bash-granting evaluation cannot run until PATH is trimmed`
          : n === "a CA-bundle pointer"
            ? `examining the CA-bundle files named in the environment (SSL_CERT_FILE, CURL_CA_BUNDLE, NODE_EXTRA_CA_CERTS \u2026) took longer than ${Nr / 1000}s (a pointer at an unreachable mount?), so the Bash sandbox's exclusions cannot be computed \u2014 a Bash-granting evaluation cannot run until that pointer is fixed or unset`
            : n === "a credential store"
              ? `examining a credential store or a credentials pointer file (~/.aws, ~/.kube, CLOUDSDK_CONFIG, GNUPGHOME, a kubeconfig \u2026) took longer than ${Nr / 1000}s (a store on an unreachable mount?), so the Bash sandbox's credential exclusions cannot be computed \u2014 a Bash-granting evaluation cannot run until that store is reachable or its pointer unset`
              : `resolving a directory this evaluation names (a plugin, suite or case directory, the home, a shared temp dir, a credential root) took longer than ${Nr / 1000}s (an unreachable mount?), so the sandbox settings cannot be computed`,
        n === "a PATH entry"
          ? "eval shell grant refused: PATH probe timed out"
          : n === "a CA-bundle pointer"
            ? "eval shell grant refused: CA-bundle probe timed out"
            : n === "a credential store"
              ? "eval shell grant refused: credential store probe timed out"
              : "eval refused: directory realpath timed out",
      );
    throw error;
  }
}
//@ chunk-qchp9vrd.js:221311-221896 placement
async function probeMacKeychain(e) {
  let n = ["/usr/bin/security"];
  for (let r of uniq([...e, ...GIT_EXEC_PATH_DIRS])) {
    let a;
    try {
      a = await readdir_10(r);
    } catch (error) {
      let h = getErrnoCode(error);
      if (h === "ENOENT" || h === "ENOTDIR") continue;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `a PATH directory could not be examined for keychain credential helpers (${h ?? "unreadable"}), so the Bash sandbox cannot exclude them \u2014 a Bash-granting evaluation cannot run in this environment`,
        "eval shell grant refused: PATH directory unreadable",
      );
    }
    for (let s of a)
      if (
        s.startsWith("docker-credential-") ||
        s.startsWith("git-credential-") ||
        s === "secret-tool" ||
        s === "kwallet-query"
      )
        n.push(path_15.join(r, s));
  }
  return n;
}
/**
 * 常见的 git exec-path 目录（git-core、gcm-core、Homebrew、Xcode 等），用于凭据排除。
 */
//@ chunk-qchp9vrd.js:221896-222241 placement
var GIT_EXEC_PATH_DIRS = [
  "/usr/local/share/gcm-core",
  "/usr/lib/git-core",
  "/usr/libexec/git-core",
  "/usr/local/libexec/git-core",
  "/opt/homebrew/opt/git/libexec/git-core",
  "/usr/local/opt/git/libexec/git-core",
  "/opt/local/libexec/git-core",
  "/Library/Developer/CommandLineTools/usr/libexec/git-core",
  "/Applications/Xcode.app/Contents/Developer/usr/libexec/git-core",
];
//@ chunk-qchp9vrd.js:222241-222534 placement
async function parsePgServiceConf(e) {
  let n = [];
  for (let r of e) {
    let a = await Ft(r);
    if (a === null) continue;
    for (let s of a.split(/\r?\n/)) {
      let match = /^\s*(sslkey|passfile)\s*=\s*(.+?)\s*$/i.exec(s);
      if (!match) continue;
      if (path_15.isAbsolute(match[2])) n.push(match[2]);
      else throw describeUnreadableCredentialsPointer(`a pg_service.conf ${match[1]} is a relative path`);
    }
  }
  return n;
}
//@ chunk-qchp9vrd.js:222534-222945 placement
async function describeAwsCredentialProcess(e) {
  let n = await Ft(e);
  if (n === null) return [];
  if (
    /^[ \t]*credential_process[ \t]*[=:]/im.test(n) ||
    /^[ \t]*credential_source[ \t]*[=:](?![ \t]*environment[ \t]*\r?$)/im.test(n)
  )
    throw describeUnreadableCredentialsPointer(
      "an AWS credential_process / credential_source cannot be excluded from the shell",
    );
  return [...n.matchAll(/^[ \t]*web_identity_token_file[ \t]*[=:][ \t]*(.+?)[ \t\r]*$/gim)]
    .map((r) => r[1])
    .filter((r) => !!r)
    .map(nr);
}
//@ chunk-qchp9vrd.js:222945-223642 placement
async function parseAwsSourceCredentials(e) {
  let n = await Ft(e);
  if (n === null) return [];
  let r;
  try {
    r = jsonParse(n);
  } catch {
    throw describeUnreadableCredentialsPointer("not valid JSON");
  }
  let a = [],
    s = r;
  for (let h = 0; s !== null && s !== void 0; h++) {
    if (h >= MAX_AWS_SOURCE_DEPTH)
      throw describeUnreadableCredentialsPointer("its source_credentials chain is too deep");
    let safeParse = awsCredentialSourceSchema().safeParse(s);
    if (!safeParse.success)
      throw describeUnreadableCredentialsPointer("its credential_source is not a shape this knows");
    let credential_source = safeParse.data.credential_source;
    if (credential_source?.certificate !== void 0 && credential_source.certificate !== null)
      throw describeUnreadableCredentialsPointer(
        "an X.509 certificate credential source cannot be excluded from the shell",
      );
    if (credential_source?.executable !== void 0 && credential_source.executable !== null)
      throw describeUnreadableCredentialsPointer(
        "an executable credential source cannot be excluded from the shell",
      );
    if (typeof credential_source?.file === "string") a.push(nr(credential_source.file));
    s = safeParse.data.source_credentials;
  }
  return a;
}
//@ chunk-qchp9vrd.js:223642-224052 placement
async function parseAzureServicePrincipals(e) {
  let n = await Ft(path_15.join(e, "service_principal_entries.json"));
  if (n === null) return [];
  let r;
  try {
    r = jsonParse(n);
  } catch {
    throw describeUnreadableCredentialsPointer("the Azure service principal store is not valid JSON");
  }
  let safeParse = azureServicePrincipalsSchema().safeParse(r);
  if (!safeParse.success)
    throw describeUnreadableCredentialsPointer("the Azure service principal store is not a shape this knows");
  return safeParse.data
    .flatMap((s) => [s.certificate, s.certificateFile])
    .filter((s) => typeof s === "string" && s !== "")
    .map(nr);
}
/**
 * Azure CLI 服务主体文件的 schema：client_id、tenant、client_secret、证书等字段。
 */
//@ chunk-qchp9vrd.js:224052-224370 placement
var azureServicePrincipalsSchema = DoctorLazy(() =>
  create_15(
    strictCreate({
      client_id: create_2().nullish(),
      tenant: create_2().nullish(),
      client_secret: create_2().nullish(),
      certificate: create_2().nullish(),
      use_cert_sn_issuer: create_12().optional(),
      servicePrincipalId: create_2().nullish(),
      servicePrincipalTenant: create_2().nullish(),
      accessToken: create_2().nullish(),
      certificateFile: create_2().nullish(),
      thumbprint: create_2().nullish(),
    }),
  ),
);
//@ chunk-qchp9vrd.js:224370-225062 placement
async function listGcloudConfigurations(e, n) {
  let r;
  try {
    r = (await readdir_10(path_15.join(e, "configurations"))).filter((h) => h.startsWith("config_"));
  } catch (error) {
    let w = getErrnoCode(error);
    if (w === "ENOENT" || w === "ENOTDIR") r = [];
    else
      throw describeUnreadableCredentialsPointer(
        `the gcloud configurations directory could not be read (${w ?? "unreadable"})`,
      );
  }
  let a = [],
    s = [];
  for (let h of [
    ...(n && path_15.isAbsolute(n) ? [path_15.join(n, "properties")] : []),
    path_15.join(e, "properties"),
    ...r.map((w) => path_15.join(e, "configurations", w)),
  ]) {
    let w = await Ft(h);
    if (w === null) continue;
    for (let b of w.matchAll(
      /^[ \t]*(credential_file_override|access_token_file|authorization_token_file)[ \t]*[=:][ \t]*(.+?)[ \t\r]*$/gim,
    ))
      if (b[2]) (b[1]?.toLowerCase() === "credential_file_override" ? a : s).push(nr(b[2]));
  }
  return { overrides: a, tokenFiles: s };
}
//@ chunk-qchp9vrd.js:225062-225110 placement
var NULL_DEVICE = getPlatform() === "windows" ? "\\\\.\\nul" : "/dev/null";
//@ chunk-qchp9vrd.js:225110-225234 placement
async function isNullDevice(e) {
  if (!e.isCharacterDevice()) return !1;
  return (
    (nullDeviceRdevPromise ??= stat_3(NULL_DEVICE).then(
      (n) => n.rdev,
      () => {
        return;
      },
    )),
    e.rdev === (await nullDeviceRdevPromise)
  );
}
//@ chunk-qchp9vrd.js:225234-225370 placement
var nullDeviceRdevPromise,
  DEFAULT_TRUSTSTORE_PASSWORD_RE = /^-D[\w.-]*trust-?store-?password=changeit$/i,
  JVM_OPTIONS_ENV_SET = new Set(JVM_OPTIONS_ENV_NAMES),
  MAVEN_ARGS_ENV_NAMES = new Set(["MAVEN_ARGS", "MAVEN_CONFIG"]),
  UNTERMINATED_MARKER = "\x00unterminated";
//@ chunk-qchp9vrd.js:225370-225984 placement
function parseMavenArgs(e) {
  let n = [];
  for (let [r, a] of Object.entries(e)) {
    let s = a === void 0 ? void 0 : String(a).trim();
    if (!s) continue;
    let h = JVM_OPTIONS_ENV_SET.has(normalizeEnvNameForMatch(r));
    if (!h && containsCredential(s)) {
      n.push(r);
      continue;
    }
    if (h) {
      let w = splitQuotedWords(s),
        b =
          w === null
            ? void 0
            : normalizeDefineArgs(w.map(stripJavaLauncherPrefix)).flatMap((y) => {
                let match = /^-D[^=]+=\s*(-.*)$/s.exec(y);
                return match
                  ? [
                      y,
                      ...normalizeDefineArgs(
                        (splitQuotedWords(match[1]) ?? [UNTERMINATED_MARKER]).map(stripJavaLauncherPrefix),
                      ),
                    ]
                  : [y];
              });
      if (
        b === void 0 ||
        tokensContainSecret(b.filter((y) => !DEFAULT_TRUSTSTORE_PASSWORD_RE.test(y))) ||
        b.some((y) => {
          if (y === UNTERMINATED_MARKER) return !0;
          if (DEFAULT_TRUSTSTORE_PASSWORD_RE.test(y)) return !1;
          let match = /^-D([^=]+)=(.*)$/s.exec(y);
          return match === null
            ? containsCredential(y)
            : (isCredentialPropertyName(match[1] ?? "") &&
                !isScalarPropertyValue(match[1] ?? "", match[2] ?? "")) ||
                containsCredential(match[2] ?? "");
        })
      )
        n.push(r);
      continue;
    }
    if (/proxy/i.test(r) && s.includes("@")) n.push(r);
  }
  return n;
}
//@ chunk-qchp9vrd.js:225984-226235 placement
var SYSTEM_GITCONFIG_PATHS = [
  "/etc/gitconfig",
  "/opt/homebrew/etc/gitconfig",
  "/usr/local/etc/gitconfig",
  "/opt/local/etc/gitconfig",
  "/Library/Developer/CommandLineTools/usr/share/git-core/gitconfig",
  "/Applications/Xcode.app/Contents/Developer/usr/share/git-core/gitconfig",
];
//@ chunk-qchp9vrd.js:226235-226332 placement
function nr(e) {
  if (!path_15.isAbsolute(e))
    throw describeUnreadableCredentialsPointer("it names a token file by a relative path");
  return e;
}
//@ chunk-qchp9vrd.js:226332-226524 placement
var MAX_AWS_SOURCE_DEPTH = 8,
  awsCredentialSourceSchema = DoctorLazy(() =>
    create({
      credential_source: strictCreate({
        file: create_2().nullish(),
        format: create_12().optional(),
        executable: create_12().optional(),
        certificate: create_12().optional(),
      }).nullish(),
      source_credentials: create_12().optional(),
    }),
  );
/**
 * 清理临时目录中过期的评测认证目录。
 */
//@ chunk-qchp9vrd.js:226524-226805 placement
async function cleanupStaleEvalAuthDirs() {
  let e;
  try {
    e = await readdir_10(os_3.tmpdir());
  } catch {
    return;
  }
  let n = Date.now() - gp;
  await Promise.all(
    e
      .filter((r) => r.startsWith(CLAUDE_EVAL_AUTH))
      .map(async (r) => {
        let joined = path_15.join(os_3.tmpdir(), r);
        try {
          let s = await lstat_11(joined);
          if (s.isDirectory() && s.mtimeMs < n) await rm_4(joined, { recursive: !0, force: !0 });
        } catch {}
      }),
  );
}

export {
  probePathDirectories,
  readAnthropicProfileConfigs,
  describeUnreadableCredentialsPointer,
  parseAnsibleVaultSources,
  parseSshCommandIdentities,
  parseJvmBuildToolCredentials,
  parseKerberosCacheName,
  parseKrb5Config,
  parsePgServiceConf,
  probeMacKeychain,
  parseSshConfigIdentities,
  SYSTEM_GITCONFIG_PATHS,
  parseGitconfigIncludes,
  parseGoAuth,
  parseKubeconfigCredentials,
  describeAwsCredentialProcess,
  parseAwsSourceCredentials,
  listGcloudConfigurations,
  parseAzureServicePrincipals,
  NULL_DEVICE,
  parseMavenArgs,
  listSubdirectories,
  cleanupStaleEvalAuthDirs,
  upperCaseEnvKeys,
};
