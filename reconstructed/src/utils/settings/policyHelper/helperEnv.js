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
  sanitizedEnvCache,
  isPackageIndexEnv,
  flattened,
  scrubbedEnvNames,
  CREDENTIAL_SCRUB_ENV_VARS_LOWER,
  HTTP_INDEX_INVALID,
  PACKAGE_INDEX_ENV_VARS_2,
  PACKAGE_INDEX_ENV_VARS,
  sanitizeEnvCredentials,
} from "./helperExec.js";
import {
  CONNECTION_STRING_NAME_REGEX,
  camelToSnakeEnvName,
  isConnectionStringName,
  MIXED_CASE_AUTH_WORDS,
} from "../../sensitiveEnvVars.js";

//@ chunk-q8cqcff6.js:33103-33913 placement
/**
 * 机密变量名的词表与正则：连接串 glob、TOKEN/SECRET/PASSWORD/KEY 等词、只作后缀的 PWD/PASS/JWT、复数形式，以及 GIT_CONFIG_KEY_n 例外。
 */
var CONNECTION_STRING_ENV_GLOBS_2 = ["CONN", "CONNECT", "CONNECTION"].flatMap((e) =>
  ["", "_"].flatMap((n) =>
    ["STR", "STRING", "STRS", "STRINGS"].flatMap((r) => {
      let s = `*${foldCasePattern(`${e}${n}${r}`)}`;
      return [s, `${s}_*`, `${s}[0-9]*`];
    }),
  ),
);
var SECRET_NAME_WORDS = [
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
];
var SECRET_NAME_SUFFIX_WORDS = ["PWD", "PASS", "JWT"];
var SECRET_NAME_ANYWHERE_WORDS = ["TOKEN", "SECRET", "PASSWORD", "PASSWD", "PASSPHRASE"];
var SECRET_NAME_PLURAL_WORDS = ["KEY", "SECRET", "PASSWORD", "CREDENTIAL"];
var SECRET_ENV_NAME_REGEX = new RegExp(
  `((^|_)(${SECRET_NAME_WORDS.join("|")}|(${SECRET_NAME_PLURAL_WORDS.join("|")})S)|_(${SECRET_NAME_SUFFIX_WORDS.join("|")})|(${SECRET_NAME_ANYWHERE_WORDS.join("|")}))(?=$|[_0-9])`,
  "i",
);
var CONNECTION_STRING_ENV_GLOBS = ["CLOUDSDK_PROXY_PASSWORD", "GIT_CONFIG_KEY_[0-9]*"];
var GIT_CONFIG_KEY_ENV_REGEX = /^GIT_CONFIG_KEY_[0-9][A-Za-z0-9_]*$/;
//@ chunk-q8cqcff6.js:33913-33999 placement
function isGitConfigEnvName(e) {
  return /^GIT_CONFIG_(?:COUNT|PARAMETERS|(?:KEY|VALUE)_[0-9]+)$/.test(e);
}
//@ chunk-q8cqcff6.js:33999-34040 placement
/**
 * 是否 GIT_CONFIG_* 或代理类环境变量（http_proxy、npm_config_proxy 等）。
 */
function isGitConfigOrProxyEnvName(e) {
  return isGitConfigEnvName(e) || PROXY_ENV_NAME_REGEX.test(e);
}
//@ chunk-q8cqcff6.js:34040-34249 placement
var PROXY_ENV_NAME_REGEX =
  /^(?:(?:https?|ftp|all|no)_proxy|npm_config_(?:https?_)?proxy|npm_config_noproxy|yarn_proxy|(?:yarn|global_agent|docker|claude_code)_(?:https?|no)_proxy|cloudsdk_proxy_[a-z]+|electron_get_use_proxy)$/i;
//@ chunk-q8cqcff6.js:34249-34312 placement
/**
 * 判断环境变量值是否需要脱敏：JVM 选项类看 gIn 是否改动，其他看值本身是否像机密。
 */
function isSecretEnvValue(e, n) {
  let r = redactJvmOptionsEnvValue(e, n);
  return r === undefined ? containsCredential(n) : r !== n;
}
//@ chunk-q8cqcff6.js:34312-35463 placement
/**
 * 对 GOFLAGS 与 JVM 选项类环境变量（JAVA_TOOL_OPTIONS、MAVEN_OPTS…）的值逐词识别含机密的参数（-D 机密属性、口令参数、Bearer 后的值）并删除；返回脱敏值，不能安全处理时返回空串；非此类变量返回 undefined。
 */
function redactJvmOptionsEnvValue(e, n) {
  if (normalizeEnvNameForMatch(e) === "GOFLAGS")
    return n.length > MAX_SECRET_SCAN_LENGTH ? "" : redactJvmOptions(n);
  if (!JVM_OPTIONS_ENV_NAME_SET.has(normalizeEnvNameForMatch(e))) return;
  let r = n.length > MAX_SECRET_SCAN_LENGTH ? null : splitQuotedWords(n);
  if (r === null) return "";
  initEnvScrubFlag();
  let mapped = r.map((h, y) => {
    let P =
      y > 0 && /^(?:-D|--define)$/.test(stripJavaLauncherPrefix(r[y - 1]))
        ? `-D${h}`
        : normalizeDefineFlag(stripJavaLauncherPrefix(h));
    return {
      raw: h,
      word: P,
      residual: JAVA_OPTIONS_ENV_NAMES.test(P),
      goes: false,
    };
  });
  for (let j = 0; j < mapped.length; j++) {
    let y = mapped[j];
    if (y.residual) continue;
    let word = j > 0 ? mapped[j - 1].word : null;
    let O = mapped[j + 1];
    y.goes =
      y.goes ||
      isSecretJvmToken(y.word, word) ||
      (O !== undefined &&
        !O.residual &&
        !isJvmOptionToken(O.word) &&
        AUTH_VALUE_PREFIX_REGEX.test(y.word) &&
        containsCredential(`${y.word} ${O.word}`));
    if (y.goes && O !== undefined && !isJvmOptionToken(O.word) && AUTH_VALUE_PREFIX_REGEX.test(y.word))
      O.goes = true;
  }
  for (let j = 1; j < mapped.length; j++) {
    if (ENCRYPT_PASSWORD_FLAG_REGEX.test(mapped[j - 1].word)) mapped[j].goes = true;
    if (
      mapped[j].goes &&
      !stripJavaLauncherPrefix(mapped[j].raw).startsWith("-") &&
      isValueTakingFlag(mapped[j - 1].word)
    )
      mapped[j - 1].goes = true;
  }
  let filtered = mapped.filter((h) => !h.goes);
  e: while (tokensContainSecret(filtered.filter((h) => !h.residual).flatMap(javaOptionTokens))) {
    let filtered_2 = filtered.filter((y) => !y.residual);
    for (let j = 2; j <= 4; j++)
      for (let j_2 = 0; j_2 + j <= filtered_2.length; j_2++) {
        let sliced = filtered_2.slice(j_2, j_2 + j);
        if (tokensContainSecret(sliced.flatMap(javaOptionTokens))) {
          for (let T of sliced) T.goes = true;
          filtered = filtered.filter((T) => !T.goes);
          continue e;
        }
      }
    for (let y of filtered_2) y.goes = true;
    filtered = filtered.filter((y) => !y.goes);
  }
  if (filtered.length === mapped.length) return n;
  let E = JAVA_OPTIONS_ENV_NAMES_2.has(normalizeEnvNameForMatch(e))
    ? SAFE_ARG_CHARS_WITH_PIPE_REGEX
    : SAFE_ARG_CHARS_REGEX;
  return filtered.every((h) => E.test(h.raw)) ? filtered.map((h) => h.raw).join(" ") : "";
}
//@ chunk-q8cqcff6.js:35463-35642 placement
/**
 * JVM 选项脱敏后允许保留的安全字符集（Eo 额外允许 |），Tt 匹配 Bearer/Basic/token/authorization 等凭证前缀。
 */
var SAFE_ARG_CHARS_REGEX = /^[A-Za-z0-9_.,:=\/@+~*?-]+$/;
var SAFE_ARG_CHARS_WITH_PIPE_REGEX = /^[A-Za-z0-9_.,:=\/@+~|*?-]+$/;
var AUTH_VALUE_PREFIX_REGEX =
  /(?:\b(?:Bearer|Basic|token)|authorization\s*[:=]\s*["']?(?:[a-z][a-z0-9_-]*)?|-token\s*[:=])\s*["']?$/i;
//@ chunk-q8cqcff6.js:35642-35713 placement
function isValueTakingFlag(word) {
  return (
    parseMavenSettingsFlag(word) === "" ||
    parseSbtDirFlag(word) === "" ||
    MAVEN_VALUE_FLAG_PATTERN.test(word) ||
    CLASSPATH_FLAG_REGEX.test(word)
  );
}
//@ chunk-q8cqcff6.js:35713-36098 placement
/**
 * Maven 带值参数、加密密码参数的正则。
 */
var MAVEN_VALUE_FLAG_PATTERN =
  /^(?:-D|--define|-f|--file|-pl|--projects|-rf|--resume-from|-l|--log-file|-t|--toolchains|-gt|--global-toolchains|-itr|--install-toolchains|-P|--activate-profiles|-b|--builder|-T|--threads|-emp|--encrypt-master-password|-ep|--encrypt-password)$/;
var ENCRYPT_PASSWORD_FLAG_REGEX = /^(?:-emp|--encrypt-master-password|-ep|--encrypt-password)$/;
var ENCRYPT_PASSWORD_INLINE_REGEX = /^(?:-emp|--encrypt-master-password|-ep|--encrypt-password)=./s;
//@ chunk-q8cqcff6.js:36098-36359 placement
function isJvmOptionToken(word) {
  return (
    /^-D[A-Za-z_][\w.-]*=.+$/s.test(word) ||
    /^-D[A-Za-z_]\w*(?:\.\w+)+=$/.test(word) ||
    /^-D[A-Za-z_][A-Za-z_.]*$/.test(word) ||
    (word.startsWith("-J-") && isJvmOptionToken(word.slice(2))) ||
    /^--[a-z][a-z0-9-]*(?:=.*)?$/s.test(word) ||
    JVM_X_OPTION_REGEX.test(word) ||
    /^(?:@|-[A-Za-z]{1,4}\d{0,2}$)/.test(word)
  );
}
//@ chunk-q8cqcff6.js:36359-37036 placement
var JVM_X_OPTION_REGEX =
  /^-(?:X(?:mx|ms|ss|mn|rs|int|comp|mixed|batch|diag|debug|future|prof|noclassgc|internalversion|check:jni|share:(?:on|off|auto|dump)|verify(?::[a-z]+)?|log(?::.*)?|loggc:.+|bootclasspath(?:\/[ap])?:.+|runjdwp:.+|dock:.+|startOnFirstThread|showSettings(?::[a-z]+)?)[0-9kKmMgGtT]*$|XX:[+-]?[A-Za-z]\w*(?:=.*)?$|(?:javaagent|agentlib|agentpath):.|verbose(?::[a-z]+)?$|[ed](?:s?a)(?::[a-z][\w$]*(?:\.[\w$]+)*(?:\.\.\.)?)?$|(?:server|client|d64|showversion)$|-(?:add-opens|add-exports|add-reads|add-modules|limit-modules|patch-module|module-path|upgrade-module-path|class-path|enable-native-access|illegal-access|enable-preview|source|release)(?:=.*)?$|(?:cp|classpath|p)$)/s;
//@ chunk-q8cqcff6.js:37036-37143 placement
/**
 * 一组参数拼接后是否含机密（-D 选项只取值部分参与判断）。
 */
function tokensContainSecret(e) {
  return containsCredential(
    e
      .map((n) => (isJvmOptionToken(n) ? `; ${n.includes("=") ? n.replace(/^[^=]*=/, "") : ""}` : n))
      .join(" "),
  );
}
//@ chunk-q8cqcff6.js:37143-37377 placement
function isSecretJvmToken(word, word_2) {
  let r = jvmOptionTokens(word);
  if (r === null) return isSecretArgToken(word, word_2);
  let s = /^-D([^=]+)=/.exec(word)[1];
  return (
    isUnquotedJavaProperty(word) ||
    isSecretJavaProperty(s, word.slice(s.length + 3)) ||
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
function javaOptionTokens(e) {
  return jvmOptionTokens(e.word) ?? [e.word];
}
//@ chunk-q8cqcff6.js:37420-37551 placement
function jvmOptionTokens(e) {
  let match = /^-D[^=]+=\s*(-.*)$/s.exec(e);
  if (match === null) return null;
  return (splitQuotedWords(match[1]) ?? [])
    .map(stripJavaLauncherPrefix)
    .filter((r) => !JAVA_OPTIONS_ENV_NAMES.test(r));
}
//@ chunk-q8cqcff6.js:37551-37636 placement
function isUnquotedJavaProperty(e) {
  let match = /^-D[^=]+=\s*(-.*)$/s.exec(e);
  return match !== null && splitQuotedWords(match[1]) === null;
}
//@ chunk-q8cqcff6.js:37636-38009 placement
function isSecretArgToken(e, n) {
  if (ENCRYPT_PASSWORD_INLINE_REGEX.test(e)) return true;
  let match = /^-D([^=]+)=(.+)$/s.exec(e);
  if (match !== null) {
    let [, s, S] = match;
    if (isSecretJavaProperty(s, S) || containsCredential(S)) return true;
    if (sanitizedEnvCache === true)
      return (
        BUILD_TOOL_SETTINGS_PROPERTY_PATTERN.test(s) ||
        e.includes("\\") ||
        (!JAVA_OPTIONS_TOKEN_RE.test(s) &&
          !(
            /^sonar\./i.test(s) &&
            !isCredentialPropertyName(s) &&
            !/key.?store|cert|pkcs|p12|pfx|\.pem$/i.test(s)
          ) &&
          looksLikePathValue(S))
      );
    return false;
  }
  if (containsCredential(e)) return true;
  if (sanitizedEnvCache === true)
    return (
      !JAVA_OPTIONS_ENV_VARS.test(e) && !(n !== null && CLASSPATH_FLAG_REGEX.test(n)) && looksLikePathValue(e)
    );
  return false;
}
//@ chunk-q8cqcff6.js:38009-38052 placement
function looksLikePathValue(e) {
  return /[\\/]|^[@~]/.test(e);
}
//@ chunk-q8cqcff6.js:38052-39241 placement
/**
 * JVM 非机密选项、classpath 类选项、路径型系统属性的正则，以及 JVM 选项类环境变量名单。
 */
var JAVA_OPTIONS_ENV_VARS =
  /^-(?:X|XX:|javaagent:|agentlib:|agentpath:|verbose|ea\b|da\b|esa$|dsa$|server$|client$|d64$|showversion$|-(?:add-opens|add-exports|add-reads|add-modules|limit-modules|patch-module|module-path|upgrade-module-path|class-path|enable-native-access|illegal-access|enable-preview|source|release)\b|(?:cp|classpath|p)$)/;
var CLASSPATH_FLAG_REGEX =
  /^-(?:-(?:add-opens|add-exports|add-reads|add-modules|limit-modules|patch-module|module-path|upgrade-module-path|class-path|enable-native-access|source|release)|cp|classpath|p)$/;
var JAVA_OPTIONS_TOKEN_RE =
  /^(?:javax\.net\.ssl\.trustStore|java\.io\.tmpdir|java\.security\.egd|java\.library\.path|jna\.library\.path|java\.class\.path|(?:https?|ftp)\.nonProxyHosts|socksNonProxyHosts|jna\.tmpdir|java\.util\.logging\.config\.file|log4j2?\.configurationFile|logback\.configurationFile|logging\.config|user\.dir|file\.encoding|maven\.multiModuleProjectDirectory|library\.jansi\.path|jansi\.tmpdir)$/i;
var JVM_OPTIONS_ENV_NAMES = [
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
//@ chunk-q8cqcff6.js:39241-39320 placement
/**
 * 规范化环境变量名用于匹配：大写、去 INPUT_ 前缀（GitHub Actions 输入）、- 换 _。
 */
function normalizeEnvNameForMatch(name) {
  return name
    .toUpperCase()
    .replace(/^INPUT_/, "")
    .replace(/-/g, "_");
}
//@ chunk-q8cqcff6.js:39320-39619 placement
/**
 * Java 启动器选项类变量集合、JVM 选项变量集合，以及可视为无害的默认凭证 -D 选项正则。
 */
var JAVA_OPTIONS_ENV_NAMES_2 = new Set([
  "JAVA_TOOL_OPTIONS",
  "JDK_JAVA_OPTIONS",
  "_JAVA_OPTIONS",
  "IBM_JAVA_OPTIONS",
  "OPENJ9_JAVA_OPTIONS",
]);
var JVM_OPTIONS_ENV_NAME_SET = new Set(JVM_OPTIONS_ENV_NAMES);
var JAVA_OPTIONS_ENV_NAMES =
  /^-D(?:(?:(?:https?|ftp)\.proxy(?:User|Password)|socksProxy(?:User|Password)|java\.net\.socks\.(?:username|password))=\S*$|[\w.-]*trust-?store-?password=changeit$)/i;
//@ chunk-q8cqcff6.js:39619-39908 placement
/**
 * 简易分词：按空白切分，处理单双引号；引号未闭合返回 null。
 */
function splitQuotedWords(e) {
  let n = [];
  let r = "";
  let s = false;
  let S = 0;
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
      if (s) {
        n.push(r);
        r = "";
        s = false;
      }
      S++;
      continue;
    }
    if (E === "'" || E === '"') {
      let index = e.indexOf(E, S + 1);
      if (index === -1) return null;
      r += e.slice(S + 1, index);
      s = true;
      S = index + 1;
      continue;
    }
    r += E;
    s = true;
    S++;
  }
  if (s) n.push(r);
  return n;
}
//@ chunk-q8cqcff6.js:39908-40010 placement = normalize (1)
function camelToSnake(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2");
}
//@ chunk-q8cqcff6.js:40010-40281 placement
/**
 * 指向构建工具设置文件/凭证文件的系统属性名正则（maven/gradle/sbt 等）。
 */
var BUILD_TOOL_SETTINGS_PROPERTY_PATTERN =
  /^(?:maven\.(?:user\.settings|global\.settings|installation\.settings|project\.settings|settings\.security|repo\.local|home)|settings\.security|gradle\.user\.home|sbt\.(?:boot\.credentials|repository\.config|global\.base|ivy\.home|boot\.directory)|user\.home)$/i;
//@ chunk-q8cqcff6.js:40281-40531 placement
/**
 * 解析 Maven settings 类参数（-s/--settings 等），返回值或空串，不匹配为 null。
 */
function parseMavenSettingsFlag(e) {
  if (/^-(?:show-version|strict-checksums)$/.test(e)) return null;
  let n =
    /^(?:--?settings|--?global-settings|--?install-settings|--?project-settings|-gs|-is|-ps|-s)(?:=(.+))?$/.exec(
      e,
    ) ?? /^-g?s=?(.+)$/.exec(e);
  return n === null ? null : (n[1] ?? "");
}
//@ chunk-q8cqcff6.js:40531-40636 placement
/**
 * 解析 sbt 的 -ivy/-sbt-dir/-sbt-boot 参数值。
 */
function parseSbtDirFlag(e) {
  let match = /^-{1,2}(?:ivy|sbt-dir|sbt-boot)(?:=(.+))?$/.exec(e);
  return match === null ? null : (match[1] ?? "");
}
//@ chunk-q8cqcff6.js:40636-40684 placement
/**
 * 去掉 Java 启动器转发前缀 -J。
 */
function stripJavaLauncherPrefix(e) {
  return e.replace(/^-J(?=-)/, "");
}
//@ chunk-q8cqcff6.js:40684-40735 placement
function normalizeDefineFlag(e) {
  return e.replace(/^--define=/, "-D");
}
//@ chunk-q8cqcff6.js:40735-40897 placement
/**
 * 规范化参数列表：把 "-D x" 合成 "-Dx"，--define= 转 -D。
 */
function normalizeDefineArgs(e) {
  let n = [];
  for (let j = 0; j < e.length; j++) {
    let s = e[j];
    if (/^(?:-D|--define)$/.test(s) && j + 1 < e.length) {
      j += 1;
      n.push(`-D${e[j]}`);
    } else n.push(normalizeDefineFlag(s));
  }
  return n;
}
//@ chunk-q8cqcff6.js:40897-40972 placement
function isSecretJavaProperty(e, n) {
  return isSecretProperty(e, n) && !/^(?:[\\/~]|[a-z]:[\\/]|file:)/i.test(n);
}
//@ chunk-q8cqcff6.js:40972-41151 placement
/**
 * 系统属性名是否像凭证（且值不是纯数字/布尔等非机密标量）。
 */
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
var SECRET_ID_SUFFIX_PATTERN = /(?:PASSWORD|PASSWD|SECRET)S?[._-]ID$/i;
var SONAR_SECRET_PROPERTIES = new Set(["sonar.login", "sonar.token", "sonar.password"]);
var SONAR_KEY_NAME_REGEX = /^(?:projectKey|moduleKey|componentKey|ruleKey|resourceKey)$/;
var SONAR_NON_SECRET_PROPERTIES = new Set(["sonar.pullrequest.key"]);
//@ chunk-q8cqcff6.js:41360-41491 placement
/**
 * 属性值是否是数字或布尔等非机密标量（属性名本身不是机密名时）。
 */
function isScalarPropertyValue(e, n) {
  let r = e.split(".").at(-1) ?? "";
  return (
    /^(?:\d+[a-z]{0,2}|true|false)$/i.test(n) &&
    !isSecretEnvName(r.replace(/-/g, "_")) &&
    !hasSecretSegment(e)
  );
}
//@ chunk-q8cqcff6.js:41491-41934 placement
/**
 * 系统属性名是否表示凭证：sonar 特例、机密词结尾、USERNAME/USER 结尾等。
 */
function isCredentialPropertyName(e) {
  if (SONAR_SECRET_PROPERTIES.has(e.toLowerCase())) return true;
  let n = e.split(".").at(-1) ?? "";
  let filtered = camelToSnake(n)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((S) => S.toUpperCase().replace(/\d+$/, ""))
    .filter(Boolean);
  let last = filtered.at(-1);
  if (!last) return false;
  if (/^sonar\./i.test(e)) {
    if (last === "SECURED") return true;
    if (
      (SONAR_KEY_NAME_REGEX.test(n) || SONAR_NON_SECRET_PROPERTIES.has(e.toLowerCase())) &&
      !hasSecretSegment(e)
    )
      return false;
  }
  if (
    isSecretEnvName(n.replace(/-/g, "_")) ||
    hasSecretSegment(e) ||
    CONNECTION_STRING_NAME_REGEX.test(camelToSnake(e).replace(/[.-]/g, "_"))
  )
    return true;
  return last === "USERNAME" || (last === "USER" && filtered.length > 1);
}
//@ chunk-q8cqcff6.js:41934-42157 placement
function hasSecretSegment(e) {
  let filtered = camelToSnake(e)
    .toUpperCase()
    .split(/[._-]+/)
    .filter(Boolean);
  let r = filtered.at(-1) ?? "";
  let s = filtered.at(-2) ?? "";
  return (
    filtered.slice(0, -1).some((S) => SECRET_SEGMENT_REGEX_2.test(S)) &&
    (!SECRET_SEGMENT_REGEX.test(r) || (/^IDS?$/.test(r) && /^(?:PASSWORDS?|PASSWD|SECRETS?)$/.test(s)))
  );
}
//@ chunk-q8cqcff6.js:42157-42819 placement
/**
 * SECRET_SEGMENT_REGEX：形似机密的段名。
 */
var SECRET_SEGMENT_REGEX_2 = /^(?:PASSWORDS?|PASSWD|PASSPHRASE|SECRETS?|TOKENS?|KEYS?|APIKEY|CREDENTIALS?)$/;
var SECRET_SEGMENT_REGEX =
  /^(?:USER(?:NAME)?|ID|IDS|STORE|FILE|FILES|PATH|PATHS|DIR|DIRECTORY|LOCATION|URL|URI|HOST|PORT|ALIAS|TYPE|PREFERENCE|SCHEMES?|ENABLED?|DISABLED?|MODE|CLASS|PROVIDER|ALGORITHM|FORMAT|LENGTH|SIZE|BITS|TIMEOUT|TTL|HEADER|NAME|NAMES|PREFIX|SUFFIX|VERSION|ENCODING|POLICY|COUNT|CACHE|SERVICE|ENDPOINT|REGION|SCOPE|SCOPES|AUDIENCE|ISSUER|EXPIRY|EXPIRATION|ROTATION|REQUIRED|OPTIONAL|SECONDS?|SECS?|MS|MILLIS(?:ECONDS)?|MINUTES?|MINS?|HOURS?|DAYS?|AGE|CAPACITY|RATE|INTERVAL|DELAY|PERIOD|DURATION|VALIDITY|LIFETIME|WINDOW|MAX|MIN|LIMIT|THRESHOLD|BUDGET|RETRY|RETRIES|ATTEMPTS)$/;
//@ chunk-q8cqcff6.js:42819-42945 placement
/**
 * 判断环境变量名是否像机密（TOKEN/SECRET/PASSWORD/KEY 等词、连接串、Bundler 凭证变量），GIT_CONFIG_KEY_n 例外。
 */
function isSecretEnvName(e) {
  let name = e.replace(AUTH0_PREFIX_REGEX_2, "").replace(/-/g, "_");
  return (
    (SECRET_ENV_NAME_REGEX.test(name) ||
      SECRET_ENV_NAME_REGEX.test(camelToSnakeEnvName(name)) ||
      isConnectionStringName(name) ||
      BUNDLE_CREDENTIAL_ENV_REGEX.test(name)) &&
    !GIT_CONFIG_KEY_ENV_REGEX.test(e)
  );
}
//@ chunk-q8cqcff6.js:42945-43802 placement
/**
 * AUTH0_ 前缀与 Bundler（BUNDLE_<HOST>__）凭证变量的正则和 glob，以及 Claude Code 自身名字含 KEY/TOKEN 但非机密的变量白名单。
 */
var AUTH0_PREFIX_REGEX_2 = /^AUTH0_/i;
var AUTH0_PREFIX_REGEX = "[Aa][Uu][Tt][Hh]0_*";
var AUTH0_ENV_PATTERN = [
  "BUILD",
  "LOCAL",
  "MIRROR",
  "PATH",
  "WITH",
  "WITHOUT",
  "CACHE",
  "DISABLE",
  "IGNORE",
  "ONLY",
];
var NON_SECRET_WORDS = "(?:[A-Za-z0-9]+(?:___[A-Za-z0-9]+)*__)+[A-Za-z]{2,}";
var BUNDLE_CREDENTIAL_ENV_REGEX = new RegExp(
  `^(?:INPUT_)?BUNDLE_(?!(?:${AUTH0_ENV_PATTERN.join("|")})__(?!${NON_SECRET_WORDS}$))\\w*__`,
  "i",
);
var SECRET_ENV_NAME_PATTERN_SOURCE =
  "[Bb][Uu][Nn][Dd][Ll][Ee]_*__*|[Ii][Nn][Pp][Uu][Tt]_[Bb][Uu][Nn][Dd][Ll][Ee]_*__*";
var joined = AUTH0_ENV_PATTERN.flatMap((e) => [
  `[Bb][Uu][Nn][Dd][Ll][Ee]_${foldCasePattern(e)}__*`,
  `[Ii][Nn][Pp][Uu][Tt]_[Bb][Uu][Nn][Dd][Ll][Ee]_${foldCasePattern(e)}__*`,
]).join("|");
var CLAUDE_CODE_NON_SECRET_ENV_NAMES = new Set([
  "CLAUDE_CODE_CLIENT_KEY",
  "CLAUDE_CODE_API_KEY_HELPER_TTL_MS",
  "CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS",
  "CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER",
  "CLAUDE_CODE_AUTH_FAIL_EXIT_MS",
  "CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT",
  "CLAUDE_CODE_IDLE_TOKEN_THRESHOLD",
  "CLAUDE_CODE_RESUME_TOKEN_THRESHOLD",
  "CLAUDE_CODE_ARG_KEY_SHAPE",
]);
var CLAUDE_CODE_SKIP_AUTH_ENV_REGEX = /^CLAUDE_CODE_SKIP_[A-Z0-9_]+_AUTH$/;
//@ chunk-q8cqcff6.js:43802-43847 placement
/**
 * Claude Code 自身的非机密环境变量（名字含 KEY/TOKEN 但不是凭证）白名单判断。
 */
function isNonSecretClaudeCodeEnvName(e) {
  return CLAUDE_CODE_NON_SECRET_ENV_NAMES.has(e) || CLAUDE_CODE_SKIP_AUTH_ENV_REGEX.test(e);
}
//@ chunk-q8cqcff6.js:43847-44225 placement
/**
 * GITHUB_TOKEN_ENV_NAMES：GitHub 令牌环境变量；SECRET_ENV_NAME_PREFIXES：机密环境变量的前缀（同一声明共 2 个绑定）。
 */
var CREDENTIAL_ENV_VARS = new Set([
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "GH_ENTERPRISE_TOKEN",
  "GITHUB_ENTERPRISE_TOKEN",
]);
var GITHUB_TOKEN_ENV_NAMES = [
  "INPUT_",
  "ORG_GRADLE_PROJECT_",
  "POETRY_PYPI_TOKEN_",
  "POETRY_HTTP_BASIC_",
  "CARGO_REGISTRIES_",
  "CONAN_LOGIN_USERNAME_",
  "CONAN_PASSWORD_",
];
var SECRET_ENV_NAME_PREFIXES = ["POETRY_HTTP_BASIC_", "CONAN_LOGIN_USERNAME_"];
var regExp = new RegExp(`^(?:${GITHUB_TOKEN_ENV_NAMES.join("|")})`, "i");
var regExp_2 = new RegExp(`^(?:INPUT_)?(?:${SECRET_ENV_NAME_PREFIXES.join("|")})`, "i");
//@ chunk-q8cqcff6.js:44225-44344 placement
/**
 * 判断环境变量名是否为凭证相关的用户名类变量。
 */
function isCredentialUserEnv(e) {
  let replaced = e.replace(/-/g, "_");
  return (
    regExp.test(replaced) &&
    (regExp_2.test(replaced) || /USER(?:_?NAME)?_?[0-9]*$/i.test(replaced) || isSecretEnvName(replaced))
  );
}
//@ chunk-q8cqcff6.js:44344-44708 placement
/**
 * secretEnvGlobs：机密环境变量的 glob 列表。
 */
var joined_2 = SECRET_ENV_NAME_PREFIXES.flatMap((e) => [
  `${foldCasePattern(e)}*`,
  `${foldCasePattern(`INPUT_${e}`)}*`,
  `${foldCasePattern(`INPUT_${e.replace(/_/g, "-")}`).replace(/^INPUT-/, "INPUT_")}*`,
])
  .concat(
    GITHUB_TOKEN_ENV_NAMES.filter((e) => !SECRET_ENV_NAME_PREFIXES.includes(e)).flatMap((e) =>
      ["USER", "USERNAME", "USER_NAME", "USER-NAME"].flatMap((n) =>
        ["", "[0-9]", "[0-9][0-9]", "[_-][0-9]", "[_-][0-9][0-9]"].map(
          (r) => `${foldCasePattern(e)}*${foldCasePattern(n)}${r}`,
        ),
      ),
    ),
  )
  .join("|");
var secretEnvGlobs = "__CLAUDE_CC_KEEP_";
//@ chunk-q8cqcff6.js:44708-45067 placement
/**
 * 挑出值需要清洗的环境变量（包索引 URL 类或含 JVM 选项的），排除拒绝与屏蔽名单后加前缀转交。
 */
function prefixedSanitizableEnv(e, n = {}) {
  let r = new Set((n.denied ?? []).map((E) => E.toUpperCase()));
  let s = new Set((n.masked ?? []).map((E) => E.toUpperCase()));
  let S = {};
  for (let [key, value] of Object.entries(e)) {
    if (r.has(key.toUpperCase())) continue;
    if (s.has(key.toUpperCase())) continue;
    if (
      value !== undefined &&
      value.trim() !== "" &&
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) &&
      (isPackageIndexEnv(key) || redactJvmOptionsEnvValue(key, "") !== undefined)
    )
      S[`${secretEnvGlobs}${key}`] = value;
  }
  return S;
}
//@ chunk-q8cqcff6.js:45067-51453 placement
/**
 * 生成 shell 脚本：在 policyHelper 子进程环境中逐一 unset 敏感变量
 */
function buildEnvScrubScript({ sandboxMasked: e = [] } = {}) {
  let filtered = e.filter((Q) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(Q));
  let s = `case "$__cc_name" in (${filtered.length > 0 ? filtered.join("|") : "''__cc_none__"}) \\builtin true;; (*) \\builtin false;; esac`;
  let joined_3 = SECRET_NAME_WORDS.map(foldCasePattern)
    .concat(SECRET_NAME_PLURAL_WORDS.map((Q) => foldCasePattern(`${Q}S`)))
    .flatMap((Q) => [Q, `${Q}[_0-9]*`, `*_${Q}`, `*_${Q}[_0-9]*`])
    .concat(
      SECRET_NAME_ANYWHERE_WORDS.map(foldCasePattern).flatMap((Q) => [`*${Q}`, `*${Q}[_0-9]*`]),
      SECRET_NAME_SUFFIX_WORDS.map(foldCasePattern).flatMap((Q) => [`*_${Q}`, `*_${Q}[_0-9]*`]),
    )
    .concat(CONNECTION_STRING_ENV_GLOBS_2)
    .join("|");
  let E = [...flattened, ...scrubbedEnvNames(), "GITHUB_TOKEN", "GH_TOKEN"];
  let joined_4 = E.join(" ");
  let joined_5 = E.map((Q) => Q.toUpperCase()).join(" ");
  let P = `__cc_uc=; ( LC_ALL=C \\builtin eval ': "\${__cc_uc^^}"' ) 2>/dev/null && __cc_uc=b; \\builtin test -n "$__cc_uc" || { ( LC_ALL=C \\builtin eval ': "\${(U)__cc_uc}"' ) 2>/dev/null && __cc_uc=z; } || \\builtin true`;
  let O = `__cc_upper="$__cc_name"; case "$__cc_uc" in b) LC_ALL=C \\builtin eval '__cc_upper="\${__cc_name^^}"';; z) LC_ALL=C \\builtin eval '__cc_upper="\${(U)__cc_name}"';; esac`;
  let T = `{ ! ${s} && (\\builtin unset -v "$__cc_name") && \\builtin unset -v "$__cc_name"; }`;
  let v = '\\builtin eval "__cc_set=\\${$__cc_name+x}"; \\builtin test -n "$__cc_set"';
  let M = "{ \\builtin compgen -v || \\builtin set; }";
  let joined_6 = MIXED_CASE_AUTH_WORDS.map(
    (Q) => `__cc_fold="\${__cc_fold//${Q}/${Q[0] + Q.slice(1).toLowerCase()}}"`,
  ).join("; ");
  let L = (Q, pe = "__cc_fold") =>
    `__cc_fold="\${${Q}}"; ${joined_6}; __cc_split=; __cc_prev=; __cc_i=0; while \\builtin test "$__cc_i" -lt "\${#${pe}}"; do __cc_c="\${${pe}:$__cc_i:1}"; case "$__cc_prev$__cc_c" in [[:lower:][:digit:]][[:upper:]]) __cc_split="\${__cc_split}_";; [[:upper:]][[:upper:]]) case "\${${pe}:$((__cc_i+1)):1}" in [[:lower:]]) __cc_split="\${__cc_split}_";; esac;; esac; __cc_split="$__cc_split$__cc_c"; __cc_prev="$__cc_c"; __cc_i=$((__cc_i+1)); done; case "$__cc_split" in ''|${joined_3}) ${T};; esac`;
  let G = L("__cc_name");
  let q =
    "__cc_ncm=; \\builtin shopt -q nocasematch && __cc_ncm=1; \\builtin shopt -u nocasematch || \\builtin true";
  let K = '\\builtin test -z "$__cc_ncm" || \\builtin shopt -s nocasematch || \\builtin true';
  let U =
    '{ (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; }';
  let j = '{ (\\builtin unset -v "$__cc_name") && \\builtin unset -v "$__cc_name"; }';
  let joined_7 = CREDENTIAL_SCRUB_ENV_VARS_LOWER.join(" ");
  let joined_8 = [...JVM_OPTIONS_ENV_NAME_SET, "GOFLAGS"].join(" ");
  let re = ((Q) => `'${Q.replace(/'/g, "'\\''")}'`)(HTTP_INDEX_INVALID);
  let joined_9 = Object.entries(
    Object.entries(PACKAGE_INDEX_ENV_VARS_2).reduce((acc, [pe, ut]) => {
      (acc[ut] ??= []).push(pe);
      return acc;
    }, {}),
  )
    .map(([key, value]) => {
      let joined = [key, ...(PACKAGE_INDEX_ENV_VARS[key] ?? [])].map((oi) => `\\\${${oi}:+x}`).join("");
      return `for __cc_name in ${value.join(" ")}; do \\builtin eval "__cc_val=\\\${$__cc_name-}"; \\builtin test "$__cc_val" = ${re} || \\builtin continue; \\builtin eval "__cc_set=${joined}"; \\builtin test -n "$__cc_set" || { __cc_name=${key}; __cc_r=${re}; { (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; }; }; \\builtin break; done`;
    })
    .join("; ");
  let Ys =
    "CARGO_REGISTRIES_*_INDEX|POETRY_REPOSITORIES_*_URL|[Cc]argo_[Rr]egistries_*_[Ii]ndex|npm_config_registry|[Nn][Pp][Mm]_[Cc][Oo][Nn][Ff][Ii][Gg]_[Rr][Ee][Gg][Ii][Ss][Tt][Rr][Yy]";
  let ni = `\\builtin eval "$({ \\builtin compgen -v || \\builtin set; } 2>/dev/null | while \\builtin read -r __cc_line; do __cc_v="\${__cc_line%%=*}"; __cc_v="\${__cc_v#${secretEnvGlobs}}"; case "$__cc_v" in (''|[0-9]*|*[!A-Za-z0-9_]*) ;; (CARGO_REGISTRIES_*_INDEX|POETRY_REPOSITORIES_*_URL|[Cc]argo_[Rr]egistries_*_[Ii]ndex|npm_config_registry|[Nn][Pp][Mm]_[Cc][Oo][Nn][Ff][Ii][Gg]_[Rr][Ee][Gg][Ii][Ss][Tt][Rr][Yy]) \\builtin printf '__cc_visit %s\\n' "$__cc_v";; esac; done)"`;
  let ri = `\\builtin eval "$({ \\builtin compgen -v || \\builtin set; } 2>/dev/null | while \\builtin read -r __cc_line; do __cc_v="\${__cc_line%%=*}"; case "$__cc_v" in (*[!A-Za-z0-9_]*) ;; (${secretEnvGlobs}*) \\builtin printf '\\\\builtin unset -v %s\\n' "$__cc_v";; esac; done)"`;
  let ii = `__cc_visit() { ${`__cc_name=$1; case "$__cc_name" in ''|[0-9]*|*[!A-Za-z0-9_]*) return 0;; esac; ! ${s} || return 0; \\builtin eval "__cc_k=\\\${${secretEnvGlobs}$__cc_name+x}; __cc_r=\\\${${secretEnvGlobs}$__cc_name-}; __cc_val=\\\${$__cc_name-}; __cc_has=\\\${$__cc_name+x}"; if \\builtin test -n "$__cc_k"; then \\builtin test "$__cc_has$__cc_val" = "x$__cc_r" || { (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; }; else \\builtin test -n "$__cc_val" || return 0; case " ${joined_8} " in *" $__cc_name "*) { (\\builtin unset -v "$__cc_name") && \\builtin unset -v "$__cc_name"; };; *) __cc_r=${re}; { (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; };; esac; fi; return 0`}; }; for __cc_n in ${joined_7} ${joined_8}; do __cc_visit "$__cc_n"; done; ${ni}; ${joined_9}; ${ri}; \\builtin unset -f __cc_visit`;
  return `{ __cc_ncm=; \\builtin shopt -q nocasematch && __cc_ncm=1; \\builtin shopt -u nocasematch || \\builtin true; __cc_uc=; ( LC_ALL=C \\builtin eval ': "\${__cc_uc^^}"' ) 2>/dev/null && __cc_uc=b; \\builtin test -n "$__cc_uc" || { ( LC_ALL=C \\builtin eval ': "\${(U)__cc_uc}"' ) 2>/dev/null && __cc_uc=z; } || \\builtin true; while \\builtin read -r __cc_line; do __cc_name="\${__cc_line%%=*}"; case "$__cc_name" in ''|[0-9]*|*[!A-Za-z0-9_]*) \\builtin continue;; esac; __cc_upper="$__cc_name"; case "$__cc_uc" in b) LC_ALL=C \\builtin eval '__cc_upper="\${__cc_name^^}"';; z) LC_ALL=C \\builtin eval '__cc_upper="\${(U)__cc_name}"';; esac; case " ${joined_5} " in *" $__cc_upper "*) ${T}; \\builtin continue;; esac; case "$__cc_name" in ${joined_2}) ${T}; \\builtin continue;; esac; case "$__cc_name" in ${CONNECTION_STRING_ENV_GLOBS.join("|")}) ;; ${AUTH0_PREFIX_REGEX}) __cc_rest="\${__cc_name#*_}"; case "$__cc_rest" in ${joined_3}) ${T};; *[[:lower:][:digit:]][[:upper:]]*|*[[:upper:]][[:upper:]][[:lower:]]*) ${L("__cc_rest")};; esac;; ${joined_3}) ${T};; ${joined}) __cc_rest="\${__cc_name#*__}"; __cc_rest="\${__cc_rest//___/-}"; case "$__cc_rest" in *__*[A-Za-z][A-Za-z]) ${T};; *) case "$__cc_name" in *[[:lower:][:digit:]][[:upper:]]*|*[[:upper:]][[:upper:]][[:lower:]]*) ${G};; esac;; esac;; ${SECRET_ENV_NAME_PATTERN_SOURCE}) ${T};; *[[:lower:][:digit:]][[:upper:]]*|*[[:upper:]][[:upper:]][[:lower:]]*) ${G};; esac; done < <({ \\builtin compgen -v || \\builtin set; }); for __cc_name in ${joined_4}; do \\builtin eval "__cc_set=\\\${$__cc_name+x}"; \\builtin test -n "$__cc_set" && ${T}; done; ${ii}; \\builtin test -z "$__cc_ncm" || \\builtin shopt -s nocasematch || \\builtin true; \\builtin unset -v __cc_line __cc_name __cc_rest __cc_set __cc_val __cc_r __cc_v __cc_k __cc_has __cc_n __cc_split __cc_fold __cc_prev __cc_i __cc_c __cc_ncm __cc_uc __cc_upper; \\builtin true; } 2>/dev/null`;
}
//@ chunk-q8cqcff6.js:51453-51665 placement
/**
 * 列出合并环境中应视为机密的变量名：已知凭证名与用户名类变量，加上值看起来含凭证的变量（排除 git 配置/代理、包索引与 JVM 选项变量）。
 */
function listSecretEnvNames(e = {}) {
  let n = {
    ...process.env,
    ...e,
  };
  let r = new Set(secretEnvNameCandidates(n));
  for (let [key, value] of Object.entries(n))
    if (
      value !== undefined &&
      !isGitConfigOrProxyEnvName(key) &&
      !isPackageIndexEnv(key) &&
      redactJvmOptionsEnvValue(key, "") === undefined &&
      isSecretEnvValue(key, typeof value === "string" ? value : String(value))
    )
      r.add(key);
  return [...r];
}
//@ chunk-q8cqcff6.js:51665-51808 placement
/**
 * 汇总可能是机密的环境变量名：已知列表、清理列表、GitHub 令牌与名字像机密的变量。
 */
function secretEnvNameCandidates(e) {
  let n = new Set([...flattened, ...scrubbedEnvNames(), "GITHUB_TOKEN", "GH_TOKEN"]);
  for (let key of Object.keys(e)) if (isSecretEnvName(key) || isCredentialUserEnv(key)) n.add(key);
  return [...n];
}
//@ chunk-q8cqcff6.js:51808-51904 placement
function foldCasePattern(e) {
  return [...e].map((n) => (n.toLowerCase() === n ? n : `[${n}${n.toLowerCase()}]`)).join("");
}
//@ chunk-q8cqcff6.js:51904-53023 placement
/**
 * 判断文本是否含凭证：URL 中的 user:pass@ 或令牌型用户信息、私钥头、Slack/Discord/Office 等 webhook、password=/token= 赋值、sonar.login、Authorization/Bearer/Basic/Token 后的令牌等；排除 host:port 路径、制品坐标等误报。
 */
function containsCredential(e) {
  let text = e.length > MAX_SECRET_SCAN_LENGTH ? e.slice(0, MAX_SECRET_SCAN_LENGTH) : e;
  let hasCredentialUserInfo = (rest) => {
    let E = rest.search(/\s/);
    let authority = E === -1 ? rest : rest.slice(0, E);
    let index = authority.lastIndexOf("@");
    if (index === -1) return false;
    let sliced = authority.slice(0, index);
    if (isHostPortPath(sliced, authority.slice(index + 1))) return false;
    return sliced.includes(":") || (!/[/?#]/.test(sliced) && looksLikeToken(sliced));
  };
  let index = text.indexOf("://");
  while (index !== -1) {
    if (index > 0 && /[a-z0-9+.-]/i.test(text[index - 1] ?? "")) {
      if (hasCredentialUserInfo(text.slice(index + 3))) return true;
    }
    index = text.indexOf("://", index + 3);
  }
  if (text.startsWith("//") && hasCredentialUserInfo(text.slice(2))) return true;
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
var MAX_SECRET_SCAN_LENGTH = 8192;
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
  if (!match) return false;
  if (/[?#&]/.test(match[2])) return true;
  if (HOST_LIKE_PATTERN.test(n)) return false;
  if (e.endsWith("/")) return true;
  if (/^(?:v?\d|sha\d*:)/i.test(n)) return true;
  return !HOSTNAME_PATTERN.test(n);
}
//@ chunk-q8cqcff6.js:53428-54532 placement
/**
 * 凭证检测用的正则：制品坐标（镜像摘要、npm、Maven）、主机样式、私钥头、webhook URL、机密赋值。
 */
var ARTIFACT_COORDINATE_PATTERN =
  /^(?:[\w.-]+(?::[\w.-]+)?@sha(?:256|384|512):[0-9a-f]{32,}|npm:(?:@[\w.-]+\/)?[\w.-]+@[\w.^~<>=*|+-]*|[a-z_][\w.-]*:[\w.-]+:v?\d[\w.+\[\](),-]*@(?:jar|war|ear|aar|apk|aab|pom|zip|tar|tgz|module|klib|exe|dll|so|dylib)?)$/i;
var HOST_LIKE_PATTERN =
  /^(?:localhost|[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.(?=[a-z0-9-]*[a-z])[a-z0-9-]+|[a-z0-9_.-]+(?=:\d+(?:[/?#]|$))|\d{1,3}(?:\.\d{1,3}){3}|\[[0-9a-f:.]+\])(?::\d+)?(?:[/?#]|$)/i;
var HOSTNAME_PATTERN =
  /^(?:(?=[a-z0-9._-]*[a-z])[a-z0-9._-]+|\d{1,3}(?:\.\d{1,3}){3}|\[[0-9a-f:.]+\])(?::\d+)?(?:[/?#]|$)/i;
var PRIVATE_KEY_PATTERN = /-----BEGIN [A-Z ]*PRIVATE KEY(?: BLOCK)?-----/;
var WEBHOOK_URL_PATTERN =
  /https:\/\/(?:hooks\.slack\.com\/(?:services|workflows|triggers)\/|(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/|[\w.-]+\.webhook\.office\.com\/webhookb2\/)[\w\/@.~-]{16,}/i;
var SECRET_ASSIGNMENT_PATTERN =
  /(?:(?:^|[;&?#,{]|\/:)\s*|\s)["']?(?!-*jobserver-auth\s*[=:])(?:[a-z0-9_.-]{0,64}(?:password|passwd|pwd|secret|token|(?:account|access|api|private|subscription)[-_]?key|signature|sig|credential)|[a-z0-9_.-]{0,63}[_.-]auth)["']?\s*[=:]\s*["']?(?!(?:true|false|none|null|yes|no|on|off|enabled|disabled|required|optional)(?:$|[;&,\s"']))[^;&,\s"']+/i;
//@ chunk-q8cqcff6.js:54532-55845 placement
/**
 * 从 JVM/构建工具选项字符串中删除含凭证的参数：逐个判断 -D/-X 属性名与值，再检查连续 2–4 个参数拼起来是否含凭证，-X 与其后参数同去留，引号括起的整组同去留；无删除时原样返回。
 */
function redactJvmOptions(e) {
  let tokens = e.split(/\s+/).filter(Boolean);
  let afterXFlag = false;
  let mapped = tokens.map((token) => {
    let replaced = token.replace(/["']/g, "");
    let replaced_2 = replaced.replace(/^--?[\w-]+=/, "");
    let match = /(?:^|[=\s])--?X[= ]?([^\s=]+)=(.*)$/.exec(replaced);
    let v = match ?? (afterXFlag ? /^()([^\s=-][^\s=]*)=(.*)$/.exec(replaced) : null);
    afterXFlag = /(?:^|=)--?X$/.test(replaced);
    if (v === null)
      return {
        bare: replaced,
        contribution: replaced_2,
        goes:
          (/(?:^|[=\s])--?X\b/.test(replaced) && !/(?:^|=)--?X$/.test(replaced)) ||
          containsCredential(replaced_2),
      };
    let M = v.at(-2) ?? "";
    let x = M.split("/").at(-1) ?? "";
    let L = v.at(-1) ?? "";
    let G = match === null ? "" : replaced.slice(0, match.index);
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
  for (let j = 0; j < mapped.length; j++)
    for (let j_2 = 2; j_2 <= 4 && j + j_2 <= mapped.length; j_2++) {
      let sliced = mapped.slice(j, j + j_2);
      if (sliced.some((T) => T.goes) || sliced.slice(1).some((T) => T.bare.startsWith("-"))) break;
      if (containsCredential(sliced.map((T) => T.contribution).join(" "))) {
        for (let T of sliced) T.goes = true;
        break;
      }
    }
  mapped.forEach((y, P) => {
    if (!/(?:^|=)--?X$/.test(y.bare)) return;
    let O = mapped[P + 1];
    let goes = O === undefined || O.goes || y.goes;
    y.goes = goes;
    if (O !== undefined) O.goes = goes;
  });
  let mapped_2 = tokens.map(() => -1);
  let openQuoteIndex = -1;
  let quoteChar = "";
  tokens.forEach((token, P) => {
    if (openQuoteIndex === -1) {
      let O = token[0];
      if ((O === '"' || O === "'") && !(token.length > 1 && token.endsWith(O))) {
        openQuoteIndex = P;
        quoteChar = O;
        mapped_2[P] = openQuoteIndex;
      }
      return;
    }
    mapped_2[P] = openQuoteIndex;
    if (token.endsWith(quoteChar)) openQuoteIndex = -1;
  });
  if (openQuoteIndex !== -1)
    mapped.forEach((y, P) => {
      if (mapped_2[P] === openQuoteIndex) y.goes = true;
    });
  mapped.forEach((y, P) => {
    if (y.goes && mapped_2[P] !== -1)
      mapped.forEach((O, T) => {
        if (mapped_2[T] === mapped_2[P]) O.goes = true;
      });
  });
  if (mapped.every((y) => !y.goes)) return e;
  return tokens
    .filter((token, P) => !mapped[P].goes && (mapped_2[P] !== -1 || SAFE_ARG_CHARS_REGEX.test(token)))
    .join(" ");
}
//@ chunk-q8cqcff6.js:55845-57038 placement
/**
 * UNSAFE_ENV_PREFIXES：需要去除的危险环境变量前缀（同一声明共 8 个绑定）。
 */
var UNSAFE_ENV_PREFIXES_9 = [
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
];
var UNSAFE_ENV_PREFIXES = new Set([
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
]);
var UNSAFE_ENV_PREFIXES_2 = "/usr/bin:/bin:/usr/sbin:/sbin";
var UNSAFE_ENV_PREFIXES_3 =
  "C:\\Windows\\System32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Windows\\System32\\WindowsPowerShell\\v1.0";
var UNSAFE_ENV_PREFIXES_4 = "C:\\Windows\\System32\\cmd.exe";
var UNSAFE_ENV_PREFIXES_5 =
  "C:\\Program Files\\WindowsPowerShell\\Modules;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules";
var UNSAFE_ENV_PREFIXES_6 = ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC";
var UNSAFE_ENV_PREFIXES_7 = "/var/empty/claude-code-policy-helper";
var UNSAFE_ENV_PREFIXES_8 = "C:\\Windows\\claude-code-policy-helper";
//@ chunk-q8cqcff6.js:57038-57123 placement
function isUnsafeHelperEnvVar(e) {
  let upper = e.toUpperCase();
  return UNSAFE_ENV_PREFIXES.has(upper) || UNSAFE_ENV_PREFIXES_9.some((r) => upper.startsWith(r));
}
//@ chunk-q8cqcff6.js:57123-57614 placement
/**
 * 构造 policyHelper 子进程环境：删除机密与危险变量、清洗凭证值，固定 PYTHONNOUSERSITE、GIT_CONFIG_NOSYSTEM，并按平台把 PATH、COMSPEC、PSModulePath、git 全局配置等设为安全值。
 */
function helperProcessEnv(e, n) {
  let r = {
    ...e,
  };
  let s = new Set(listSecretEnvNames(e).map((S) => S.toUpperCase()));
  for (let key of Object.keys(r)) if (isUnsafeHelperEnvVar(key) || s.has(key.toUpperCase())) delete r[key];
  Object.assign(r, sanitizeEnvCredentials(r).respelled);
  r.PYTHONNOUSERSITE = "1";
  r.GIT_CONFIG_NOSYSTEM = "1";
  if (n === "win32") {
    r.GIT_CONFIG_GLOBAL = UNSAFE_ENV_PREFIXES_8;
    r.PATH = UNSAFE_ENV_PREFIXES_3;
    r.COMSPEC = UNSAFE_ENV_PREFIXES_4;
    r.PSModulePath = UNSAFE_ENV_PREFIXES_5;
    r.PATHEXT = UNSAFE_ENV_PREFIXES_6;
    r.SystemRoot = "C:\\Windows";
    r.windir = "C:\\Windows";
    r.SystemDrive = "C:";
  } else {
    r.GIT_CONFIG_GLOBAL = UNSAFE_ENV_PREFIXES_7;
    r.PATH = UNSAFE_ENV_PREFIXES_2;
    r.ZDOTDIR = UNSAFE_ENV_PREFIXES_7;
    r.XDG_CONFIG_HOME = UNSAFE_ENV_PREFIXES_7;
    r.PSModulePath = UNSAFE_ENV_PREFIXES_7;
  }
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
