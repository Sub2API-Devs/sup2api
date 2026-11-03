/**
 * utils/settings/policyHelper/helperEnv.ts
 *
 * policyHelper 子进程环境清理（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (56)
 * attribution: placement 56
 */
import {
  initEnvScrubFlag,
  Ne,
  isPackageIndexEnv,
  flattened,
  scrubbedEnvNames,
  Ln,
  HTTP_INDEX_INVALID,
  PACKAGE_INDEX_ENV_VARS,
  Hn,
  sanitizeEnvCredentials,
} from "./helperExec.js";
import {
  CONNECTION_STRING_NAME_REGEX,
  camelToSnakeEnvName,
  isConnectionStringName,
  MIXED_CASE_AUTH_WORDS,
} from "../../sensitiveEnvVars.js";

/**
 * 机密变量名的词表与正则：连接串 glob、TOKEN/SECRET/PASSWORD/KEY 等词、只作后缀的 PWD/PASS/JWT、复数形式，以及 GIT_CONFIG_KEY_n 例外。
 */
//@ chunk-q8cqcff6.js:33103-33913 placement
var CONNECTION_STRING_ENV_GLOBS = ["CONN", "CONNECT", "CONNECTION"].flatMap((e) =>
    ["", "_"].flatMap((n) =>
      ["STR", "STRING", "STRS", "STRINGS"].flatMap((r) => {
        let s = `*${ae(`${e}${n}${r}`)}`;
        return [s, `${s}_*`, `${s}[0-9]*`];
      }),
    ),
  ),
  SECRET_NAME_WORDS = [
    "TOKEN",
    "SECRET",
    "PASSWORD",
    "PASSWD",
    "PASSPHRASE",
    "KEY",
    "AUTH",
    "COOKIE",
    "PAT",
    "DSN",
    "WEBHOOK",
    "CREDENTIAL",
    "CREDENTIALS",
    "CREDS",
    "APIKEY",
    "ACCESSKEY",
    "SECRETKEY",
    "ACCOUNTKEY",
    "PRIVATEKEY",
    "AUTHKEY",
    "SSHKEY",
    "SIGNINGKEY",
    "MASTERKEY",
    "DEPLOYKEY",
    "ENCRYPTIONKEY",
    "PGPASSWORD",
    "SSHPASS",
  ],
  SECRET_NAME_SUFFIX_WORDS = ["PWD", "PASS", "JWT"],
  SECRET_NAME_ANYWHERE_WORDS = ["TOKEN", "SECRET", "PASSWORD", "PASSWD", "PASSPHRASE"],
  SECRET_NAME_PLURAL_WORDS = ["KEY", "SECRET", "PASSWORD", "CREDENTIAL"],
  SECRET_ENV_NAME_REGEX = new RegExp(
    `((^|_)(${SECRET_NAME_WORDS.join("|")}|(${SECRET_NAME_PLURAL_WORDS.join("|")})S)|_(${SECRET_NAME_SUFFIX_WORDS.join("|")})|(${SECRET_NAME_ANYWHERE_WORDS.join("|")}))(?=$|[_0-9])`,
    "i",
  ),
  fo = ["CLOUDSDK_PROXY_PASSWORD", "GIT_CONFIG_KEY_[0-9]*"],
  GIT_CONFIG_KEY_ENV_REGEX = /^GIT_CONFIG_KEY_[0-9][A-Za-z0-9_]*$/;
//@ chunk-q8cqcff6.js:33913-33999 placement
function isGitConfigEnvName(e) {
  return /^GIT_CONFIG_(?:COUNT|PARAMETERS|(?:KEY|VALUE)_[0-9]+)$/.test(e);
}
/**
 * 是否 GIT_CONFIG_* 或代理类环境变量（http_proxy、npm_config_proxy 等）。
 */
//@ chunk-q8cqcff6.js:33999-34040 placement
function isGitConfigOrProxyEnvName(e) {
  return isGitConfigEnvName(e) || PROXY_ENV_NAME_REGEX.test(e);
}
//@ chunk-q8cqcff6.js:34040-34249 placement
var PROXY_ENV_NAME_REGEX =
  /^(?:(?:https?|ftp|all|no)_proxy|npm_config_(?:https?_)?proxy|npm_config_noproxy|yarn_proxy|(?:yarn|global_agent|docker|claude_code)_(?:https?|no)_proxy|cloudsdk_proxy_[a-z]+|electron_get_use_proxy)$/i;
/**
 * 判断环境变量值是否需要脱敏：JVM 选项类看 gIn 是否改动，其他看值本身是否像机密。
 */
//@ chunk-q8cqcff6.js:34249-34312 placement
function isSecretEnvValue(e, n) {
  let r = redactJvmOptionsEnvValue(e, n);
  return r === void 0 ? containsCredential(n) : r !== n;
}
/**
 * 对 GOFLAGS 与 JVM 选项类环境变量（JAVA_TOOL_OPTIONS、MAVEN_OPTS…）的值逐词识别含机密的参数（-D 机密属性、口令参数、Bearer 后的值）并删除；返回脱敏值，不能安全处理时返回空串；非此类变量返回 undefined。
 */
//@ chunk-q8cqcff6.js:34312-35463 placement
function redactJvmOptionsEnvValue(e, n) {
  if (normalizeEnvNameForMatch(e) === "GOFLAGS") return n.length > Be ? "" : redactJvmOptions(n);
  if (!JVM_OPTIONS_ENV_NAME_SET.has(normalizeEnvNameForMatch(e))) return;
  let r = n.length > Be ? null : splitQuotedWords(n);
  if (r === null) return "";
  initEnvScrubFlag();
  let mapped = r.map((h, y) => {
    let P =
      y > 0 && /^(?:-D|--define)$/.test(stripJavaLauncherPrefix(r[y - 1]))
        ? `-D${h}`
        : normalizeDefineFlag(stripJavaLauncherPrefix(h));
    return { raw: h, word: P, residual: Jn.test(P), goes: !1 };
  });
  for (let h = 0; h < mapped.length; h++) {
    let y = mapped[h];
    if (y.residual) continue;
    let P = h > 0 ? mapped[h - 1].word : null,
      O = mapped[h + 1];
    if (
      ((y.goes =
        y.goes ||
        isSecretJvmToken(y.word, P) ||
        (O !== void 0 &&
          !O.residual &&
          !isJvmOptionToken(O.word) &&
          AUTH_VALUE_PREFIX_REGEX.test(y.word) &&
          containsCredential(`${y.word} ${O.word}`))),
      y.goes && O !== void 0 && !isJvmOptionToken(O.word) && AUTH_VALUE_PREFIX_REGEX.test(y.word))
    )
      O.goes = !0;
  }
  for (let h = 1; h < mapped.length; h++) {
    if (ENCRYPT_PASSWORD_FLAG_REGEX.test(mapped[h - 1].word)) mapped[h].goes = !0;
    if (
      mapped[h].goes &&
      !stripJavaLauncherPrefix(mapped[h].raw).startsWith("-") &&
      isValueTakingFlag(mapped[h - 1].word)
    )
      mapped[h - 1].goes = !0;
  }
  let filtered = mapped.filter((h) => !h.goes);
  e: while (tokensContainSecret(filtered.filter((h) => !h.residual).flatMap(Cn))) {
    let filtered_2 = filtered.filter((y) => !y.residual);
    for (let y = 2; y <= 4; y++)
      for (let P = 0; P + y <= filtered_2.length; P++) {
        let sliced = filtered_2.slice(P, P + y);
        if (tokensContainSecret(sliced.flatMap(Cn))) {
          for (let T of sliced) T.goes = !0;
          filtered = filtered.filter((T) => !T.goes);
          continue e;
        }
      }
    for (let y of filtered_2) y.goes = !0;
    filtered = filtered.filter((y) => !y.goes);
  }
  if (filtered.length === mapped.length) return n;
  let E = JAVA_OPTIONS_ENV_NAMES.has(normalizeEnvNameForMatch(e))
    ? SAFE_ARG_CHARS_WITH_PIPE_REGEX
    : SAFE_ARG_CHARS_REGEX;
  return filtered.every((h) => E.test(h.raw)) ? filtered.map((h) => h.raw).join(" ") : "";
}
/**
 * JVM 选项脱敏后允许保留的安全字符集（Eo 额外允许 |），Tt 匹配 Bearer/Basic/token/authorization 等凭证前缀。
 */
//@ chunk-q8cqcff6.js:35463-35642 placement
var SAFE_ARG_CHARS_REGEX = /^[A-Za-z0-9_.,:=\/@+~*?-]+$/,
  SAFE_ARG_CHARS_WITH_PIPE_REGEX = /^[A-Za-z0-9_.,:=\/@+~|*?-]+$/,
  AUTH_VALUE_PREFIX_REGEX =
    /(?:\b(?:Bearer|Basic|token)|authorization\s*[:=]\s*["']?(?:[a-z][a-z0-9_-]*)?|-token\s*[:=])\s*["']?$/i;
//@ chunk-q8cqcff6.js:35642-35713 placement
function isValueTakingFlag(e) {
  return (
    parseMavenSettingsFlag(e) === "" ||
    parseSbtDirFlag(e) === "" ||
    MAVEN_VALUE_FLAG_PATTERN.test(e) ||
    CLASSPATH_FLAG_REGEX.test(e)
  );
}
/**
 * Maven 带值参数、加密密码参数的正则。
 */
//@ chunk-q8cqcff6.js:35713-36098 placement
var MAVEN_VALUE_FLAG_PATTERN =
    /^(?:-D|--define|-f|--file|-pl|--projects|-rf|--resume-from|-l|--log-file|-t|--toolchains|-gt|--global-toolchains|-itr|--install-toolchains|-P|--activate-profiles|-b|--builder|-T|--threads|-emp|--encrypt-master-password|-ep|--encrypt-password)$/,
  ENCRYPT_PASSWORD_FLAG_REGEX = /^(?:-emp|--encrypt-master-password|-ep|--encrypt-password)$/,
  ENCRYPT_PASSWORD_INLINE_REGEX = /^(?:-emp|--encrypt-master-password|-ep|--encrypt-password)=./s;
//@ chunk-q8cqcff6.js:36098-36359 placement
function isJvmOptionToken(e) {
  return (
    /^-D[A-Za-z_][\w.-]*=.+$/s.test(e) ||
    /^-D[A-Za-z_]\w*(?:\.\w+)+=$/.test(e) ||
    /^-D[A-Za-z_][A-Za-z_.]*$/.test(e) ||
    (e.startsWith("-J-") && isJvmOptionToken(e.slice(2))) ||
    /^--[a-z][a-z0-9-]*(?:=.*)?$/s.test(e) ||
    JVM_X_OPTION_REGEX.test(e) ||
    /^(?:@|-[A-Za-z]{1,4}\d{0,2}$)/.test(e)
  );
}
//@ chunk-q8cqcff6.js:36359-37036 placement
var JVM_X_OPTION_REGEX =
  /^-(?:X(?:mx|ms|ss|mn|rs|int|comp|mixed|batch|diag|debug|future|prof|noclassgc|internalversion|check:jni|share:(?:on|off|auto|dump)|verify(?::[a-z]+)?|log(?::.*)?|loggc:.+|bootclasspath(?:\/[ap])?:.+|runjdwp:.+|dock:.+|startOnFirstThread|showSettings(?::[a-z]+)?)[0-9kKmMgGtT]*$|XX:[+-]?[A-Za-z]\w*(?:=.*)?$|(?:javaagent|agentlib|agentpath):.|verbose(?::[a-z]+)?$|[ed](?:s?a)(?::[a-z][\w$]*(?:\.[\w$]+)*(?:\.\.\.)?)?$|(?:server|client|d64|showversion)$|-(?:add-opens|add-exports|add-reads|add-modules|limit-modules|patch-module|module-path|upgrade-module-path|class-path|enable-native-access|illegal-access|enable-preview|source|release)(?:=.*)?$|(?:cp|classpath|p)$)/s;
/**
 * 一组参数拼接后是否含机密（-D 选项只取值部分参与判断）。
 */
//@ chunk-q8cqcff6.js:37036-37143 placement
function tokensContainSecret(e) {
  return containsCredential(
    e
      .map((n) => (isJvmOptionToken(n) ? `; ${n.includes("=") ? n.replace(/^[^=]*=/, "") : ""}` : n))
      .join(" "),
  );
}
//@ chunk-q8cqcff6.js:37143-37377 placement
function isSecretJvmToken(e, n) {
  let r = jvmOptionTokens(e);
  if (r === null) return isSecretArgToken(e, n);
  let s = /^-D([^=]+)=/.exec(e)[1];
  return (
    No(e) ||
    Zn(s, e.slice(s.length + 3)) ||
    tokensContainSecret(r) ||
    r.some(
      (S, E) =>
        isSecretArgToken(S, E > 0 ? r[E - 1] : null) ||
        (E + 1 < r.length &&
          !isJvmOptionToken(r[E + 1]) &&
          AUTH_VALUE_PREFIX_REGEX.test(S) &&
          containsCredential(`${S} ${r[E + 1]}`)),
    )
  );
}
//@ chunk-q8cqcff6.js:37377-37420 placement
function Cn(e) {
  return jvmOptionTokens(e.word) ?? [e.word];
}
//@ chunk-q8cqcff6.js:37420-37551 placement
function jvmOptionTokens(e) {
  let match = /^-D[^=]+=\s*(-.*)$/s.exec(e);
  if (match === null) return null;
  return (splitQuotedWords(match[1]) ?? []).map(stripJavaLauncherPrefix).filter((r) => !Jn.test(r));
}
//@ chunk-q8cqcff6.js:37551-37636 placement
function No(e) {
  let match = /^-D[^=]+=\s*(-.*)$/s.exec(e);
  return match !== null && splitQuotedWords(match[1]) === null;
}
//@ chunk-q8cqcff6.js:37636-38009 placement
function isSecretArgToken(e, n) {
  if (ENCRYPT_PASSWORD_INLINE_REGEX.test(e)) return !0;
  let match = /^-D([^=]+)=(.+)$/s.exec(e);
  if (match !== null) {
    let [, s, S] = match;
    if (Zn(s, S) || containsCredential(S)) return !0;
    if (Ne === !0)
      return (
        BUILD_TOOL_SETTINGS_PROPERTY_PATTERN.test(s) ||
        e.includes("\\") ||
        (!vo.test(s) &&
          !(
            /^sonar\./i.test(s) &&
            !isCredentialPropertyName(s) &&
            !/key.?store|cert|pkcs|p12|pfx|\.pem$/i.test(s)
          ) &&
          looksLikePathValue(S))
      );
    return !1;
  }
  if (containsCredential(e)) return !0;
  if (Ne === !0)
    return (
      !JAVA_OPTIONS_ENV_VARS.test(e) && !(n !== null && CLASSPATH_FLAG_REGEX.test(n)) && looksLikePathValue(e)
    );
  return !1;
}
//@ chunk-q8cqcff6.js:38009-38052 placement
function looksLikePathValue(e) {
  return /[\\/]|^[@~]/.test(e);
}
/**
 * JVM 非机密选项、classpath 类选项、路径型系统属性的正则，以及 JVM 选项类环境变量名单。
 */
//@ chunk-q8cqcff6.js:38052-39241 placement
var JAVA_OPTIONS_ENV_VARS =
    /^-(?:X|XX:|javaagent:|agentlib:|agentpath:|verbose|ea\b|da\b|esa$|dsa$|server$|client$|d64$|showversion$|-(?:add-opens|add-exports|add-reads|add-modules|limit-modules|patch-module|module-path|upgrade-module-path|class-path|enable-native-access|illegal-access|enable-preview|source|release)\b|(?:cp|classpath|p)$)/,
  CLASSPATH_FLAG_REGEX =
    /^-(?:-(?:add-opens|add-exports|add-reads|add-modules|limit-modules|patch-module|module-path|upgrade-module-path|class-path|enable-native-access|source|release)|cp|classpath|p)$/,
  vo =
    /^(?:javax\.net\.ssl\.trustStore|java\.io\.tmpdir|java\.security\.egd|java\.library\.path|jna\.library\.path|java\.class\.path|(?:https?|ftp)\.nonProxyHosts|socksNonProxyHosts|jna\.tmpdir|java\.util\.logging\.config\.file|log4j2?\.configurationFile|logback\.configurationFile|logging\.config|user\.dir|file\.encoding|maven\.multiModuleProjectDirectory|library\.jansi\.path|jansi\.tmpdir)$/i,
  JVM_OPTIONS_ENV_NAMES = [
    "JAVA_TOOL_OPTIONS",
    "JDK_JAVA_OPTIONS",
    "_JAVA_OPTIONS",
    "IBM_JAVA_OPTIONS",
    "OPENJ9_JAVA_OPTIONS",
    "MAVEN_OPTS",
    "GRADLE_OPTS",
    "MAVEN_ARGS",
    "MAVEN_CONFIG",
    "ANT_OPTS",
    "ANT_ARGS",
    "JAVA_OPTS",
    "SBT_OPTS",
    "JVM_OPTS",
    "LEIN_JVM_OPTS",
    "ES_JAVA_OPTS",
    "SONAR_SCANNER_OPTS",
    "SONAR_SCANNER_JAVA_OPTS",
  ];
/**
 * 规范化环境变量名用于匹配：大写、去 INPUT_ 前缀（GitHub Actions 输入）、- 换 _。
 */
//@ chunk-q8cqcff6.js:39241-39320 placement
function normalizeEnvNameForMatch(e) {
  return e
    .toUpperCase()
    .replace(/^INPUT_/, "")
    .replace(/-/g, "_");
}
/**
 * Java 启动器选项类变量集合、JVM 选项变量集合，以及可视为无害的默认凭证 -D 选项正则。
 */
//@ chunk-q8cqcff6.js:39320-39619 placement
var JAVA_OPTIONS_ENV_NAMES = new Set([
    "JAVA_TOOL_OPTIONS",
    "JDK_JAVA_OPTIONS",
    "_JAVA_OPTIONS",
    "IBM_JAVA_OPTIONS",
    "OPENJ9_JAVA_OPTIONS",
  ]),
  JVM_OPTIONS_ENV_NAME_SET = new Set(JVM_OPTIONS_ENV_NAMES),
  Jn =
    /^-D(?:(?:(?:https?|ftp)\.proxy(?:User|Password)|socksProxy(?:User|Password)|java\.net\.socks\.(?:username|password))=\S*$|[\w.-]*trust-?store-?password=changeit$)/i;
/**
 * 简易分词：按空白切分，处理单双引号；引号未闭合返回 null。
 */
//@ chunk-q8cqcff6.js:39619-39908 placement
function splitQuotedWords(e) {
  let n = [],
    r = "",
    s = !1,
    S = 0;
  while (S < e.length) {
    let E = e[S];
    if (
      E === " " ||
      E === "\t" ||
      E ===
        `
` ||
      E === "\r"
    ) {
      if (s) (n.push(r), (r = ""), (s = !1));
      S++;
      continue;
    }
    if (E === "'" || E === '"') {
      let index = e.indexOf(E, S + 1);
      if (index === -1) return null;
      ((r += e.slice(S + 1, index)), (s = !0), (S = index + 1));
      continue;
    }
    ((r += E), (s = !0), S++);
  }
  if (s) n.push(r);
  return n;
}
//@ chunk-q8cqcff6.js:39908-40010 placement = normalize (1)
function camelToSnake(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2");
}
/**
 * 指向构建工具设置文件/凭证文件的系统属性名正则（maven/gradle/sbt 等）。
 */
//@ chunk-q8cqcff6.js:40010-40281 placement
var BUILD_TOOL_SETTINGS_PROPERTY_PATTERN =
  /^(?:maven\.(?:user\.settings|global\.settings|installation\.settings|project\.settings|settings\.security|repo\.local|home)|settings\.security|gradle\.user\.home|sbt\.(?:boot\.credentials|repository\.config|global\.base|ivy\.home|boot\.directory)|user\.home)$/i;
/**
 * 解析 Maven settings 类参数（-s/--settings 等），返回值或空串，不匹配为 null。
 */
//@ chunk-q8cqcff6.js:40281-40531 placement
function parseMavenSettingsFlag(e) {
  if (/^-(?:show-version|strict-checksums)$/.test(e)) return null;
  let n =
    /^(?:--?settings|--?global-settings|--?install-settings|--?project-settings|-gs|-is|-ps|-s)(?:=(.+))?$/.exec(
      e,
    ) ?? /^-g?s=?(.+)$/.exec(e);
  return n === null ? null : (n[1] ?? "");
}
/**
 * 解析 sbt 的 -ivy/-sbt-dir/-sbt-boot 参数值。
 */
//@ chunk-q8cqcff6.js:40531-40636 placement
function parseSbtDirFlag(e) {
  let match = /^-{1,2}(?:ivy|sbt-dir|sbt-boot)(?:=(.+))?$/.exec(e);
  return match === null ? null : (match[1] ?? "");
}
/**
 * 去掉 Java 启动器转发前缀 -J。
 */
//@ chunk-q8cqcff6.js:40636-40684 placement
function stripJavaLauncherPrefix(e) {
  return e.replace(/^-J(?=-)/, "");
}
//@ chunk-q8cqcff6.js:40684-40735 placement
function normalizeDefineFlag(e) {
  return e.replace(/^--define=/, "-D");
}
/**
 * 规范化参数列表：把 "-D x" 合成 "-Dx"，--define= 转 -D。
 */
//@ chunk-q8cqcff6.js:40735-40897 placement
function normalizeDefineArgs(e) {
  let n = [];
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (/^(?:-D|--define)$/.test(s) && r + 1 < e.length) ((r += 1), n.push(`-D${e[r]}`));
    else n.push(normalizeDefineFlag(s));
  }
  return n;
}
//@ chunk-q8cqcff6.js:40897-40972 placement
function Zn(e, n) {
  return isSecretProperty(e, n) && !/^(?:[\\/~]|[a-z]:[\\/]|file:)/i.test(n);
}
/**
 * 系统属性名是否像凭证（且值不是纯数字/布尔等非机密标量）。
 */
//@ chunk-q8cqcff6.js:40972-41151 placement
function isSecretProperty(e, n) {
  let r = e.split(".").at(-1) ?? "";
  return (
    isCredentialPropertyName(e) &&
    (SECRET_ID_SUFFIX_PATTERN.test(camelToSnake(e)) ||
      !/(?:user(?:name)?|id|store|file|path|dir|location|url|host|port|alias|type)$/i.test(r)) &&
    !isScalarPropertyValue(e, n)
  );
}
//@ chunk-q8cqcff6.js:41151-41360 placement
var SECRET_ID_SUFFIX_PATTERN = /(?:PASSWORD|PASSWD|SECRET)S?[._-]ID$/i,
  SONAR_SECRET_PROPERTIES = new Set(["sonar.login", "sonar.token", "sonar.password"]),
  SONAR_KEY_NAME_REGEX = /^(?:projectKey|moduleKey|componentKey|ruleKey|resourceKey)$/,
  SONAR_NON_SECRET_PROPERTIES = new Set(["sonar.pullrequest.key"]);
/**
 * 属性值是否是数字或布尔等非机密标量（属性名本身不是机密名时）。
 */
//@ chunk-q8cqcff6.js:41360-41491 placement
function isScalarPropertyValue(e, n) {
  let r = e.split(".").at(-1) ?? "";
  return (
    /^(?:\d+[a-z]{0,2}|true|false)$/i.test(n) &&
    !isSecretEnvName(r.replace(/-/g, "_")) &&
    !hasSecretSegment(e)
  );
}
/**
 * 系统属性名是否表示凭证：sonar 特例、机密词结尾、USERNAME/USER 结尾等。
 */
//@ chunk-q8cqcff6.js:41491-41934 placement
function isCredentialPropertyName(e) {
  if (SONAR_SECRET_PROPERTIES.has(e.toLowerCase())) return !0;
  let n = e.split(".").at(-1) ?? "",
    filtered = camelToSnake(n)
      .split(/[_-]+/)
      .filter(Boolean)
      .map((S) => S.toUpperCase().replace(/\d+$/, ""))
      .filter(Boolean),
    at = filtered.at(-1);
  if (!at) return !1;
  if (/^sonar\./i.test(e)) {
    if (at === "SECURED") return !0;
    if (
      (SONAR_KEY_NAME_REGEX.test(n) || SONAR_NON_SECRET_PROPERTIES.has(e.toLowerCase())) &&
      !hasSecretSegment(e)
    )
      return !1;
  }
  if (
    isSecretEnvName(n.replace(/-/g, "_")) ||
    hasSecretSegment(e) ||
    CONNECTION_STRING_NAME_REGEX.test(camelToSnake(e).replace(/[.-]/g, "_"))
  )
    return !0;
  return at === "USERNAME" || (at === "USER" && filtered.length > 1);
}
//@ chunk-q8cqcff6.js:41934-42157 placement
function hasSecretSegment(e) {
  let filtered = camelToSnake(e)
      .toUpperCase()
      .split(/[._-]+/)
      .filter(Boolean),
    r = filtered.at(-1) ?? "",
    s = filtered.at(-2) ?? "";
  return (
    filtered.slice(0, -1).some((S) => SECRET_SEGMENT_REGEX.test(S)) &&
    (!xo.test(r) || (/^IDS?$/.test(r) && /^(?:PASSWORDS?|PASSWD|SECRETS?)$/.test(s)))
  );
}
//@ chunk-q8cqcff6.js:42157-42819 placement
var SECRET_SEGMENT_REGEX = /^(?:PASSWORDS?|PASSWD|PASSPHRASE|SECRETS?|TOKENS?|KEYS?|APIKEY|CREDENTIALS?)$/,
  xo =
    /^(?:USER(?:NAME)?|ID|IDS|STORE|FILE|FILES|PATH|PATHS|DIR|DIRECTORY|LOCATION|URL|URI|HOST|PORT|ALIAS|TYPE|PREFERENCE|SCHEMES?|ENABLED?|DISABLED?|MODE|CLASS|PROVIDER|ALGORITHM|FORMAT|LENGTH|SIZE|BITS|TIMEOUT|TTL|HEADER|NAME|NAMES|PREFIX|SUFFIX|VERSION|ENCODING|POLICY|COUNT|CACHE|SERVICE|ENDPOINT|REGION|SCOPE|SCOPES|AUDIENCE|ISSUER|EXPIRY|EXPIRATION|ROTATION|REQUIRED|OPTIONAL|SECONDS?|SECS?|MS|MILLIS(?:ECONDS)?|MINUTES?|MINS?|HOURS?|DAYS?|AGE|CAPACITY|RATE|INTERVAL|DELAY|PERIOD|DURATION|VALIDITY|LIFETIME|WINDOW|MAX|MIN|LIMIT|THRESHOLD|BUDGET|RETRY|RETRIES|ATTEMPTS)$/;
/**
 * 判断环境变量名是否像机密（TOKEN/SECRET/PASSWORD/KEY 等词、连接串、Bundler 凭证变量），GIT_CONFIG_KEY_n 例外。
 */
//@ chunk-q8cqcff6.js:42819-42945 placement
function isSecretEnvName(e) {
  let replaced = e.replace(AUTH0_PREFIX_REGEX, "").replace(/-/g, "_");
  return (
    (SECRET_ENV_NAME_REGEX.test(replaced) ||
      SECRET_ENV_NAME_REGEX.test(camelToSnakeEnvName(replaced)) ||
      isConnectionStringName(replaced) ||
      BUNDLE_CREDENTIAL_ENV_REGEX.test(replaced)) &&
    !GIT_CONFIG_KEY_ENV_REGEX.test(e)
  );
}
/**
 * AUTH0_ 前缀与 Bundler（BUNDLE_<HOST>__）凭证变量的正则和 glob，以及 Claude Code 自身名字含 KEY/TOKEN 但非机密的变量白名单。
 */
//@ chunk-q8cqcff6.js:42945-43802 placement
var AUTH0_PREFIX_REGEX = /^AUTH0_/i,
  $o = "[Aa][Uu][Tt][Hh]0_*",
  qn = ["BUILD", "LOCAL", "MIRROR", "PATH", "WITH", "WITHOUT", "CACHE", "DISABLE", "IGNORE", "ONLY"],
  Go = "(?:[A-Za-z0-9]+(?:___[A-Za-z0-9]+)*__)+[A-Za-z]{2,}",
  BUNDLE_CREDENTIAL_ENV_REGEX = new RegExp(
    `^(?:INPUT_)?BUNDLE_(?!(?:${qn.join("|")})__(?!${Go}$))\\w*__`,
    "i",
  ),
  Wo = "[Bb][Uu][Nn][Dd][Ll][Ee]_*__*|[Ii][Nn][Pp][Uu][Tt]_[Bb][Uu][Nn][Dd][Ll][Ee]_*__*",
  joined = qn
    .flatMap((e) => [
      `[Bb][Uu][Nn][Dd][Ll][Ee]_${ae(e)}__*`,
      `[Ii][Nn][Pp][Uu][Tt]_[Bb][Uu][Nn][Dd][Ll][Ee]_${ae(e)}__*`,
    ])
    .join("|"),
  CLAUDE_CODE_NON_SECRET_ENV_NAMES = new Set([
    "CLAUDE_CODE_CLIENT_KEY",
    "CLAUDE_CODE_API_KEY_HELPER_TTL_MS",
    "CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS",
    "CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER",
    "CLAUDE_CODE_AUTH_FAIL_EXIT_MS",
    "CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT",
    "CLAUDE_CODE_IDLE_TOKEN_THRESHOLD",
    "CLAUDE_CODE_RESUME_TOKEN_THRESHOLD",
    "CLAUDE_CODE_ARG_KEY_SHAPE",
  ]),
  CLAUDE_CODE_SKIP_AUTH_ENV_REGEX = /^CLAUDE_CODE_SKIP_[A-Z0-9_]+_AUTH$/;
/**
 * Claude Code 自身的非机密环境变量（名字含 KEY/TOKEN 但不是凭证）白名单判断。
 */
//@ chunk-q8cqcff6.js:43802-43847 placement
function isNonSecretClaudeCodeEnvName(e) {
  return CLAUDE_CODE_NON_SECRET_ENV_NAMES.has(e) || CLAUDE_CODE_SKIP_AUTH_ENV_REGEX.test(e);
}
//@ chunk-q8cqcff6.js:43847-44225 placement
var CREDENTIAL_ENV_VARS = new Set([
    "GITHUB_TOKEN",
    "GH_TOKEN",
    "GH_ENTERPRISE_TOKEN",
    "GITHUB_ENTERPRISE_TOKEN",
  ]),
  er = [
    "INPUT_",
    "ORG_GRADLE_PROJECT_",
    "POETRY_PYPI_TOKEN_",
    "POETRY_HTTP_BASIC_",
    "CARGO_REGISTRIES_",
    "CONAN_LOGIN_USERNAME_",
    "CONAN_PASSWORD_",
  ],
  It = ["POETRY_HTTP_BASIC_", "CONAN_LOGIN_USERNAME_"],
  regExp = new RegExp(`^(?:${er.join("|")})`, "i"),
  regExp_2 = new RegExp(`^(?:INPUT_)?(?:${It.join("|")})`, "i");
/**
 * 判断环境变量名是否为凭证相关的用户名类变量。
 */
//@ chunk-q8cqcff6.js:44225-44344 placement
function isCredentialUserEnv(e) {
  let replaced = e.replace(/-/g, "_");
  return (
    regExp.test(replaced) &&
    (regExp_2.test(replaced) || /USER(?:_?NAME)?_?[0-9]*$/i.test(replaced) || isSecretEnvName(replaced))
  );
}
//@ chunk-q8cqcff6.js:44344-44708 placement
var joined_2 = It.flatMap((e) => [
    `${ae(e)}*`,
    `${ae(`INPUT_${e}`)}*`,
    `${ae(`INPUT_${e.replace(/_/g, "-")}`).replace(/^INPUT-/, "INPUT_")}*`,
  ])
    .concat(
      er
        .filter((e) => !It.includes(e))
        .flatMap((e) =>
          ["USER", "USERNAME", "USER_NAME", "USER-NAME"].flatMap((n) =>
            ["", "[0-9]", "[0-9][0-9]", "[_-][0-9]", "[_-][0-9][0-9]"].map((r) => `${ae(e)}*${ae(n)}${r}`),
          ),
        ),
    )
    .join("|"),
  Ie = "__CLAUDE_CC_KEEP_";
/**
 * 挑出值需要清洗的环境变量（包索引 URL 类或含 JVM 选项的），排除拒绝与屏蔽名单后加前缀转交。
 */
//@ chunk-q8cqcff6.js:44708-45067 placement
function prefixedSanitizableEnv(e, n = {}) {
  let r = new Set((n.denied ?? []).map((E) => E.toUpperCase())),
    s = new Set((n.masked ?? []).map((E) => E.toUpperCase())),
    S = {};
  for (let [E, h] of Object.entries(e)) {
    if (r.has(E.toUpperCase())) continue;
    if (s.has(E.toUpperCase())) continue;
    if (
      h !== void 0 &&
      h.trim() !== "" &&
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(E) &&
      (isPackageIndexEnv(E) || redactJvmOptionsEnvValue(E, "") !== void 0)
    )
      S[`${Ie}${E}`] = h;
  }
  return S;
}
/**
 * 生成 shell 脚本：在 policyHelper 子进程环境中逐一 unset 敏感变量
 */
//@ chunk-q8cqcff6.js:45067-51453 placement
function buildEnvScrubScript({ sandboxMasked: e = [] } = {}) {
  let filtered = e.filter((Q) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(Q)),
    s = `case "$__cc_name" in (${filtered.length > 0 ? filtered.join("|") : "''__cc_none__"}) \\builtin true;; (*) \\builtin false;; esac`,
    joined_3 = SECRET_NAME_WORDS.map(ae)
      .concat(SECRET_NAME_PLURAL_WORDS.map((Q) => ae(`${Q}S`)))
      .flatMap((Q) => [Q, `${Q}[_0-9]*`, `*_${Q}`, `*_${Q}[_0-9]*`])
      .concat(
        SECRET_NAME_ANYWHERE_WORDS.map(ae).flatMap((Q) => [`*${Q}`, `*${Q}[_0-9]*`]),
        SECRET_NAME_SUFFIX_WORDS.map(ae).flatMap((Q) => [`*_${Q}`, `*_${Q}[_0-9]*`]),
      )
      .concat(CONNECTION_STRING_ENV_GLOBS)
      .join("|"),
    E = [...flattened, ...scrubbedEnvNames(), "GITHUB_TOKEN", "GH_TOKEN"],
    joined_4 = E.join(" "),
    joined_5 = E.map((Q) => Q.toUpperCase()).join(" "),
    P = `__cc_uc=; ( LC_ALL=C \\builtin eval ': "\${__cc_uc^^}"' ) 2>/dev/null && __cc_uc=b; \\builtin test -n "$__cc_uc" || { ( LC_ALL=C \\builtin eval ': "\${(U)__cc_uc}"' ) 2>/dev/null && __cc_uc=z; } || \\builtin true`,
    O = `__cc_upper="$__cc_name"; case "$__cc_uc" in b) LC_ALL=C \\builtin eval '__cc_upper="\${__cc_name^^}"';; z) LC_ALL=C \\builtin eval '__cc_upper="\${(U)__cc_name}"';; esac`,
    T = `{ ! ${s} && (\\builtin unset -v "$__cc_name") && \\builtin unset -v "$__cc_name"; }`,
    v = '\\builtin eval "__cc_set=\\${$__cc_name+x}"; \\builtin test -n "$__cc_set"',
    M = "{ \\builtin compgen -v || \\builtin set; }",
    joined_6 = MIXED_CASE_AUTH_WORDS.map(
      (Q) => `__cc_fold="\${__cc_fold//${Q}/${Q[0] + Q.slice(1).toLowerCase()}}"`,
    ).join("; "),
    L = (Q, pe = "__cc_fold") =>
      `__cc_fold="\${${Q}}"; ${joined_6}; __cc_split=; __cc_prev=; __cc_i=0; while \\builtin test "$__cc_i" -lt "\${#${pe}}"; do __cc_c="\${${pe}:$__cc_i:1}"; case "$__cc_prev$__cc_c" in [[:lower:][:digit:]][[:upper:]]) __cc_split="\${__cc_split}_";; [[:upper:]][[:upper:]]) case "\${${pe}:$((__cc_i+1)):1}" in [[:lower:]]) __cc_split="\${__cc_split}_";; esac;; esac; __cc_split="$__cc_split$__cc_c"; __cc_prev="$__cc_c"; __cc_i=$((__cc_i+1)); done; case "$__cc_split" in ''|${joined_3}) ${T};; esac`,
    G = L("__cc_name"),
    q =
      "__cc_ncm=; \\builtin shopt -q nocasematch && __cc_ncm=1; \\builtin shopt -u nocasematch || \\builtin true",
    K = '\\builtin test -z "$__cc_ncm" || \\builtin shopt -s nocasematch || \\builtin true',
    U =
      '{ (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; }',
    j = '{ (\\builtin unset -v "$__cc_name") && \\builtin unset -v "$__cc_name"; }',
    joined_7 = Ln.join(" "),
    joined_8 = [...JVM_OPTIONS_ENV_NAME_SET, "GOFLAGS"].join(" "),
    re = ((Q) => `'${Q.replace(/'/g, "'\\''")}'`)(HTTP_INDEX_INVALID),
    joined_9 = Object.entries(
      Object.entries(PACKAGE_INDEX_ENV_VARS).reduce((Q, [pe, ut]) => ((Q[ut] ??= []).push(pe), Q), {}),
    )
      .map(([Q, pe]) => {
        let joined = [Q, ...(Hn[Q] ?? [])].map((oi) => `\\\${${oi}:+x}`).join("");
        return `for __cc_name in ${pe.join(" ")}; do \\builtin eval "__cc_val=\\\${$__cc_name-}"; \\builtin test "$__cc_val" = ${re} || \\builtin continue; \\builtin eval "__cc_set=${joined}"; \\builtin test -n "$__cc_set" || { __cc_name=${Q}; __cc_r=${re}; { (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; }; }; \\builtin break; done`;
      })
      .join("; "),
    Ys =
      "CARGO_REGISTRIES_*_INDEX|POETRY_REPOSITORIES_*_URL|[Cc]argo_[Rr]egistries_*_[Ii]ndex|npm_config_registry|[Nn][Pp][Mm]_[Cc][Oo][Nn][Ff][Ii][Gg]_[Rr][Ee][Gg][Ii][Ss][Tt][Rr][Yy]",
    ni = `\\builtin eval "$({ \\builtin compgen -v || \\builtin set; } 2>/dev/null | while \\builtin read -r __cc_line; do __cc_v="\${__cc_line%%=*}"; __cc_v="\${__cc_v#${Ie}}"; case "$__cc_v" in (''|[0-9]*|*[!A-Za-z0-9_]*) ;; (CARGO_REGISTRIES_*_INDEX|POETRY_REPOSITORIES_*_URL|[Cc]argo_[Rr]egistries_*_[Ii]ndex|npm_config_registry|[Nn][Pp][Mm]_[Cc][Oo][Nn][Ff][Ii][Gg]_[Rr][Ee][Gg][Ii][Ss][Tt][Rr][Yy]) \\builtin printf '__cc_visit %s\\n' "$__cc_v";; esac; done)"`,
    ri = `\\builtin eval "$({ \\builtin compgen -v || \\builtin set; } 2>/dev/null | while \\builtin read -r __cc_line; do __cc_v="\${__cc_line%%=*}"; case "$__cc_v" in (*[!A-Za-z0-9_]*) ;; (${Ie}*) \\builtin printf '\\\\builtin unset -v %s\\n' "$__cc_v";; esac; done)"`,
    ii = `__cc_visit() { ${`__cc_name=$1; case "$__cc_name" in ''|[0-9]*|*[!A-Za-z0-9_]*) return 0;; esac; ! ${s} || return 0; \\builtin eval "__cc_k=\\\${${Ie}$__cc_name+x}; __cc_r=\\\${${Ie}$__cc_name-}; __cc_val=\\\${$__cc_name-}; __cc_has=\\\${$__cc_name+x}"; if \\builtin test -n "$__cc_k"; then \\builtin test "$__cc_has$__cc_val" = "x$__cc_r" || { (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; }; else \\builtin test -n "$__cc_val" || return 0; case " ${joined_8} " in *" $__cc_name "*) { (\\builtin unset -v "$__cc_name") && \\builtin unset -v "$__cc_name"; };; *) __cc_r=${re}; { (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; };; esac; fi; return 0`}; }; for __cc_n in ${joined_7} ${joined_8}; do __cc_visit "$__cc_n"; done; ${ni}; ${joined_9}; ${ri}; \\builtin unset -f __cc_visit`;
  return `{ __cc_ncm=; \\builtin shopt -q nocasematch && __cc_ncm=1; \\builtin shopt -u nocasematch || \\builtin true; __cc_uc=; ( LC_ALL=C \\builtin eval ': "\${__cc_uc^^}"' ) 2>/dev/null && __cc_uc=b; \\builtin test -n "$__cc_uc" || { ( LC_ALL=C \\builtin eval ': "\${(U)__cc_uc}"' ) 2>/dev/null && __cc_uc=z; } || \\builtin true; while \\builtin read -r __cc_line; do __cc_name="\${__cc_line%%=*}"; case "$__cc_name" in ''|[0-9]*|*[!A-Za-z0-9_]*) \\builtin continue;; esac; __cc_upper="$__cc_name"; case "$__cc_uc" in b) LC_ALL=C \\builtin eval '__cc_upper="\${__cc_name^^}"';; z) LC_ALL=C \\builtin eval '__cc_upper="\${(U)__cc_name}"';; esac; case " ${joined_5} " in *" $__cc_upper "*) ${T}; \\builtin continue;; esac; case "$__cc_name" in ${joined_2}) ${T}; \\builtin continue;; esac; case "$__cc_name" in ${fo.join("|")}) ;; ${$o}) __cc_rest="\${__cc_name#*_}"; case "$__cc_rest" in ${joined_3}) ${T};; *[[:lower:][:digit:]][[:upper:]]*|*[[:upper:]][[:upper:]][[:lower:]]*) ${L("__cc_rest")};; esac;; ${joined_3}) ${T};; ${joined}) __cc_rest="\${__cc_name#*__}"; __cc_rest="\${__cc_rest//___/-}"; case "$__cc_rest" in *__*[A-Za-z][A-Za-z]) ${T};; *) case "$__cc_name" in *[[:lower:][:digit:]][[:upper:]]*|*[[:upper:]][[:upper:]][[:lower:]]*) ${G};; esac;; esac;; ${Wo}) ${T};; *[[:lower:][:digit:]][[:upper:]]*|*[[:upper:]][[:upper:]][[:lower:]]*) ${G};; esac; done < <({ \\builtin compgen -v || \\builtin set; }); for __cc_name in ${joined_4}; do \\builtin eval "__cc_set=\\\${$__cc_name+x}"; \\builtin test -n "$__cc_set" && ${T}; done; ${ii}; \\builtin test -z "$__cc_ncm" || \\builtin shopt -s nocasematch || \\builtin true; \\builtin unset -v __cc_line __cc_name __cc_rest __cc_set __cc_val __cc_r __cc_v __cc_k __cc_has __cc_n __cc_split __cc_fold __cc_prev __cc_i __cc_c __cc_ncm __cc_uc __cc_upper; \\builtin true; } 2>/dev/null`;
}
/**
 * 列出合并环境中应视为机密的变量名：已知凭证名与用户名类变量，加上值看起来含凭证的变量（排除 git 配置/代理、包索引与 JVM 选项变量）。
 */
//@ chunk-q8cqcff6.js:51453-51665 placement
function listSecretEnvNames(e = {}) {
  let n = { ...process.env, ...e },
    r = new Set(secretEnvNameCandidates(n));
  for (let [s, S] of Object.entries(n))
    if (
      S !== void 0 &&
      !isGitConfigOrProxyEnvName(s) &&
      !isPackageIndexEnv(s) &&
      redactJvmOptionsEnvValue(s, "") === void 0 &&
      isSecretEnvValue(s, typeof S === "string" ? S : String(S))
    )
      r.add(s);
  return [...r];
}
/**
 * 汇总可能是机密的环境变量名：已知列表、清理列表、GitHub 令牌与名字像机密的变量。
 */
//@ chunk-q8cqcff6.js:51665-51808 placement
function secretEnvNameCandidates(e) {
  let n = new Set([...flattened, ...scrubbedEnvNames(), "GITHUB_TOKEN", "GH_TOKEN"]);
  for (let r of Object.keys(e)) if (isSecretEnvName(r) || isCredentialUserEnv(r)) n.add(r);
  return [...n];
}
//@ chunk-q8cqcff6.js:51808-51904 placement
function ae(e) {
  return [...e].map((n) => (n.toLowerCase() === n ? n : `[${n}${n.toLowerCase()}]`)).join("");
}
/**
 * 判断文本是否含凭证：URL 中的 user:pass@ 或令牌型用户信息、私钥头、Slack/Discord/Office 等 webhook、password=/token= 赋值、sonar.login、Authorization/Bearer/Basic/Token 后的令牌等；排除 host:port 路径、制品坐标等误报。
 */
//@ chunk-q8cqcff6.js:51904-53023 placement
function containsCredential(e) {
  let text = e.length > Be ? e.slice(0, Be) : e,
    hasCredentialUserInfo = (rest) => {
      let search = rest.search(/\s/),
        authority = search === -1 ? rest : rest.slice(0, search),
        index = authority.lastIndexOf("@");
      if (index === -1) return !1;
      let sliced = authority.slice(0, index);
      if (isHostPortPath(sliced, authority.slice(index + 1))) return !1;
      return sliced.includes(":") || (!/[/?#]/.test(sliced) && looksLikeToken(sliced));
    },
    index = text.indexOf("://");
  while (index !== -1) {
    if (index > 0 && /[a-z0-9+.-]/i.test(text[index - 1] ?? "")) {
      if (hasCredentialUserInfo(text.slice(index + 3))) return !0;
    }
    index = text.indexOf("://", index + 3);
  }
  if (text.startsWith("//") && hasCredentialUserInfo(text.slice(2))) return !0;
  return (
    (/^[^\s/@:]+:(?!\/\/)(?![\\/])[^\s@]*@[^\s/@]+/.test(text) &&
      !/^[a-z]:[\\/]/i.test(text) &&
      !ARTIFACT_COORDINATE_PATTERN.test(text) &&
      !isHostPortPath(
        text.slice(0, text.lastIndexOf("@", text.search(/\s|$/))),
        text.slice(text.lastIndexOf("@", text.search(/\s|$/)) + 1),
      ) &&
      !/^(?:mailto|sips?|xmpp|im|acct):/i.test(text)) ||
    SECRET_ASSIGNMENT_PATTERN.test(text) ||
    WEBHOOK_URL_PATTERN.test(text) ||
    /["']?sonar\.login["']?\s*[:=]\s*["']?[^\s"',}]{8,}/.test(text) ||
    PRIVATE_KEY_PATTERN.test(text) ||
    /\bauthorization\s*[:=]\s*["']?[a-z][a-z0-9_-]*\s+[A-Za-z0-9._~+\/=-]{8,}/i.test(text) ||
    /\b(?:[Tt]oken|TOKEN)\s+(?=[A-Za-z0-9_~+=-]*[0-9])(?=[A-Za-z0-9_~+=-]*[A-Z])(?=([A-Za-z0-9_~+=-]{20,}))\1(?![\/.])/.test(
      text,
    ) ||
    /\b(?:Bearer|Basic)\s+(?=[A-Za-z._~+\/=-]*[0-9]|(?:[A-Za-z0-9._~+\/=-]*?[a-z][A-Z](?![a-z])){2}|[A-Za-z0-9.-]*[_~+\/=])[A-Za-z0-9._~+\/=-]{8,}/.test(
      text,
    )
  );
}
//@ chunk-q8cqcff6.js:53023-53035 placement
var Be = 8192;
//@ chunk-q8cqcff6.js:53035-53190 placement
function looksLikeToken(e) {
  return (
    /^(?:gh[opusr]_|github_pat_|glpat-|xox[abpr]-|sk-|pk-|AKIA|eyJ|ya29\.|npm_)/.test(e) ||
    (e.length >= 20 && /[0-9]/.test(e) && /[a-z]/i.test(e))
  );
}
//@ chunk-q8cqcff6.js:53190-53428 placement
function isHostPortPath(e, n) {
  let match = /^([a-z0-9_-]+(?:\.[a-z0-9_-]+)*):\d+([/?#].*)$/is.exec(e);
  if (!match) return !1;
  if (/[?#&]/.test(match[2])) return !0;
  if (HOST_LIKE_PATTERN.test(n)) return !1;
  if (e.endsWith("/")) return !0;
  if (/^(?:v?\d|sha\d*:)/i.test(n)) return !0;
  return !HOSTNAME_PATTERN.test(n);
}
/**
 * 凭证检测用的正则：制品坐标（镜像摘要、npm、Maven）、主机样式、私钥头、webhook URL、机密赋值。
 */
//@ chunk-q8cqcff6.js:53428-54532 placement
var ARTIFACT_COORDINATE_PATTERN =
    /^(?:[\w.-]+(?::[\w.-]+)?@sha(?:256|384|512):[0-9a-f]{32,}|npm:(?:@[\w.-]+\/)?[\w.-]+@[\w.^~<>=*|+-]*|[a-z_][\w.-]*:[\w.-]+:v?\d[\w.+\[\](),-]*@(?:jar|war|ear|aar|apk|aab|pom|zip|tar|tgz|module|klib|exe|dll|so|dylib)?)$/i,
  HOST_LIKE_PATTERN =
    /^(?:localhost|[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.(?=[a-z0-9-]*[a-z])[a-z0-9-]+|[a-z0-9_.-]+(?=:\d+(?:[/?#]|$))|\d{1,3}(?:\.\d{1,3}){3}|\[[0-9a-f:.]+\])(?::\d+)?(?:[/?#]|$)/i,
  HOSTNAME_PATTERN =
    /^(?:(?=[a-z0-9._-]*[a-z])[a-z0-9._-]+|\d{1,3}(?:\.\d{1,3}){3}|\[[0-9a-f:.]+\])(?::\d+)?(?:[/?#]|$)/i,
  PRIVATE_KEY_PATTERN = /-----BEGIN [A-Z ]*PRIVATE KEY(?: BLOCK)?-----/,
  WEBHOOK_URL_PATTERN =
    /https:\/\/(?:hooks\.slack\.com\/(?:services|workflows|triggers)\/|(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/|[\w.-]+\.webhook\.office\.com\/webhookb2\/)[\w\/@.~-]{16,}/i,
  SECRET_ASSIGNMENT_PATTERN =
    /(?:(?:^|[;&?#,{]|\/:)\s*|\s)["']?(?!-*jobserver-auth\s*[=:])(?:[a-z0-9_.-]{0,64}(?:password|passwd|pwd|secret|token|(?:account|access|api|private|subscription)[-_]?key|signature|sig|credential)|[a-z0-9_.-]{0,63}[_.-]auth)["']?\s*[=:]\s*["']?(?!(?:true|false|none|null|yes|no|on|off|enabled|disabled|required|optional)(?:$|[;&,\s"']))[^;&,\s"']+/i;
/**
 * 从 JVM/构建工具选项字符串中删除含凭证的参数：逐个判断 -D/-X 属性名与值，再检查连续 2–4 个参数拼起来是否含凭证，-X 与其后参数同去留，引号括起的整组同去留；无删除时原样返回。
 */
//@ chunk-q8cqcff6.js:54532-55845 placement
function redactJvmOptions(e) {
  let tokens = e.split(/\s+/).filter(Boolean),
    afterXFlag = !1,
    mapped = tokens.map((y) => {
      let replaced = y.replace(/["']/g, ""),
        replaced_2 = replaced.replace(/^--?[\w-]+=/, ""),
        match = /(?:^|[=\s])--?X[= ]?([^\s=]+)=(.*)$/.exec(replaced),
        v = match ?? (afterXFlag ? /^()([^\s=-][^\s=]*)=(.*)$/.exec(replaced) : null);
      if (((afterXFlag = /(?:^|=)--?X$/.test(replaced)), v === null))
        return {
          bare: replaced,
          contribution: replaced_2,
          goes:
            (/(?:^|[=\s])--?X\b/.test(replaced) && !/(?:^|=)--?X$/.test(replaced)) ||
            containsCredential(replaced_2),
        };
      let M = v.at(-2) ?? "",
        x = M.split("/").at(-1) ?? "",
        L = v.at(-1) ?? "",
        G = match === null ? "" : replaced.slice(0, match.index);
      return {
        bare: replaced,
        contribution: replaced_2,
        goes:
          isSecretProperty(x, L) ||
          containsCredential(L) ||
          containsCredential(M) ||
          (G !== "" && containsCredential(G)),
      };
    });
  for (let y = 0; y < mapped.length; y++)
    for (let P = 2; P <= 4 && y + P <= mapped.length; P++) {
      let sliced = mapped.slice(y, y + P);
      if (sliced.some((T) => T.goes) || sliced.slice(1).some((T) => T.bare.startsWith("-"))) break;
      if (containsCredential(sliced.map((T) => T.contribution).join(" "))) {
        for (let T of sliced) T.goes = !0;
        break;
      }
    }
  mapped.forEach((y, P) => {
    if (!/(?:^|=)--?X$/.test(y.bare)) return;
    let O = mapped[P + 1],
      T = O === void 0 || O.goes || y.goes;
    if (((y.goes = T), O !== void 0)) O.goes = T;
  });
  let mapped_2 = tokens.map(() => -1),
    openQuoteIndex = -1,
    quoteChar = "";
  if (
    (tokens.forEach((y, P) => {
      if (openQuoteIndex === -1) {
        let O = y[0];
        if ((O === '"' || O === "'") && !(y.length > 1 && y.endsWith(O)))
          ((openQuoteIndex = P), (quoteChar = O), (mapped_2[P] = openQuoteIndex));
        return;
      }
      if (((mapped_2[P] = openQuoteIndex), y.endsWith(quoteChar))) openQuoteIndex = -1;
    }),
    openQuoteIndex !== -1)
  )
    mapped.forEach((y, P) => {
      if (mapped_2[P] === openQuoteIndex) y.goes = !0;
    });
  if (
    (mapped.forEach((y, P) => {
      if (y.goes && mapped_2[P] !== -1)
        mapped.forEach((O, T) => {
          if (mapped_2[T] === mapped_2[P]) O.goes = !0;
        });
    }),
    mapped.every((y) => !y.goes))
  )
    return e;
  return tokens
    .filter((y, P) => !mapped[P].goes && (mapped_2[P] !== -1 || SAFE_ARG_CHARS_REGEX.test(y)))
    .join(" ");
}
//@ chunk-q8cqcff6.js:55845-57038 placement
var UNSAFE_ENV_PREFIXES = [
    "LD_",
    "DYLD_",
    "BASH_FUNC_",
    "__BASH_FUNC<",
    "PYTHON",
    "PERL5",
    "RUBY",
    "LUA_",
    "DOTNET_",
    "COMPLUS_",
    "COR_",
    "CORECLR_",
    "APPDOMAIN_MANAGER_",
    "GIT_",
  ],
  rs = new Set([
    "NODE_OPTIONS",
    "NODE_PATH",
    "BASH_ENV",
    "ENV",
    "SHELLOPTS",
    "BASHOPTS",
    "PS4",
    "PERLLIB",
    "GEM_PATH",
    "GEM_HOME",
    "JAVA_TOOL_OPTIONS",
    "_JAVA_OPTIONS",
    "JDK_JAVA_OPTIONS",
    "IBM_JAVA_OPTIONS",
    "OPENJ9_JAVA_OPTIONS",
    "CLASSPATH",
    "BUN_OPTIONS",
    "MONO_PATH",
    "R_PROFILE_USER",
    "DEVPATH",
    "GCONV_PATH",
    "OPENSSL_CONF",
    "OPENSSL_MODULES",
    "OPENSSL_ENGINES",
    "KRB5_CONFIG",
    "GTK_PATH",
    "QT_PLUGIN_PATH",
    "GIO_MODULE_DIR",
    "FPATH",
    "IFS",
    "CDPATH",
    "SSH_ASKPASS",
    "SSH_ASKPASS_REQUIRE",
    "SASL_PATH",
    "PHPRC",
    "PHP_INI_SCAN_DIR",
    "PATH",
    "COMSPEC",
    "ZDOTDIR",
    "XDG_CONFIG_HOME",
    "PSMODULEPATH",
    "SYSTEMROOT",
    "WINDIR",
    "SYSTEMDRIVE",
    "PATHEXT",
  ]),
  os = "/usr/bin:/bin:/usr/sbin:/sbin",
  ss =
    "C:\\Windows\\System32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Windows\\System32\\WindowsPowerShell\\v1.0",
  as = "C:\\Windows\\System32\\cmd.exe",
  ls =
    "C:\\Program Files\\WindowsPowerShell\\Modules;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules",
  cs = ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC",
  ze = "/var/empty/claude-code-policy-helper",
  ds = "C:\\Windows\\claude-code-policy-helper";
//@ chunk-q8cqcff6.js:57038-57123 placement
function us(e) {
  let upper = e.toUpperCase();
  return rs.has(upper) || UNSAFE_ENV_PREFIXES.some((r) => upper.startsWith(r));
}
/**
 * 构造 policyHelper 子进程环境：删除机密与危险变量、清洗凭证值，固定 PYTHONNOUSERSITE、GIT_CONFIG_NOSYSTEM，并按平台把 PATH、COMSPEC、PSModulePath、git 全局配置等设为安全值。
 */
//@ chunk-q8cqcff6.js:57123-57614 placement
function helperProcessEnv(e, n) {
  let r = { ...e },
    s = new Set(listSecretEnvNames(e).map((S) => S.toUpperCase()));
  for (let S of Object.keys(r)) if (us(S) || s.has(S.toUpperCase())) delete r[S];
  if (
    (Object.assign(r, sanitizeEnvCredentials(r).respelled),
    (r.PYTHONNOUSERSITE = "1"),
    (r.GIT_CONFIG_NOSYSTEM = "1"),
    n === "win32")
  )
    ((r.GIT_CONFIG_GLOBAL = ds),
      (r.PATH = ss),
      (r.COMSPEC = as),
      (r.PSModulePath = ls),
      (r.PATHEXT = cs),
      (r.SystemRoot = "C:\\Windows"),
      (r.windir = "C:\\Windows"),
      (r.SystemDrive = "C:"));
  else
    ((r.GIT_CONFIG_GLOBAL = ze),
      (r.PATH = os),
      (r.ZDOTDIR = ze),
      (r.XDG_CONFIG_HOME = ze),
      (r.PSModulePath = ze));
  return r;
}

export {
  isSecretEnvName,
  containsCredential,
  helperProcessEnv,
  listSecretEnvNames,
  isGitConfigOrProxyEnvName,
  CREDENTIAL_ENV_VARS,
  isNonSecretClaudeCodeEnvName,
  BUNDLE_CREDENTIAL_ENV_REGEX,
  isCredentialUserEnv,
  redactJvmOptionsEnvValue,
  isSecretEnvValue,
  buildEnvScrubScript,
  prefixedSanitizableEnv,
  PRIVATE_KEY_PATTERN,
  secretEnvNameCandidates,
  splitQuotedWords,
  parseMavenSettingsFlag,
  normalizeDefineArgs,
  stripJavaLauncherPrefix,
  parseSbtDirFlag,
  BUILD_TOOL_SETTINGS_PROPERTY_PATTERN,
  JVM_OPTIONS_ENV_NAMES,
  normalizeEnvNameForMatch,
  tokensContainSecret,
  isCredentialPropertyName,
  isScalarPropertyValue,
};
