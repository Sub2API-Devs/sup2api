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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-q8cqcff6.js:33103-33913 placement
/**
 * 机密变量名的词表与正则：连接串 glob、TOKEN/SECRET/PASSWORD/KEY 等词、只作后缀的 PWD/PASS/JWT、复数形式，以及 GIT_CONFIG_KEY_n 例外。
 */
var CONNECTION_STRING_ENV_GLOBS_2; // deferred: uses foldCasePattern of its import cycle while loading; runs once the cycle is complete
var SECRET_NAME_WORDS;
var SECRET_NAME_SUFFIX_WORDS;
var SECRET_NAME_ANYWHERE_WORDS;
var SECRET_NAME_PLURAL_WORDS;
var SECRET_ENV_NAME_REGEX;
var CONNECTION_STRING_ENV_GLOBS;
var GIT_CONFIG_KEY_ENV_REGEX;
deferInit("chunk-q8cqcff6.js:33103", () => {
  CONNECTION_STRING_ENV_GLOBS_2 = ["CONN", "CONNECT", "CONNECTION"].flatMap((head) =>
    ["", "_"].flatMap((sep) =>
      ["STR", "STRING", "STRS", "STRINGS"].flatMap((tail) => {
        let base = `*${foldCasePattern(`${head}${sep}${tail}`)}`;
        return [base, `${base}_*`, `${base}[0-9]*`];
      }),
    ),
  );
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
  ];
  SECRET_NAME_SUFFIX_WORDS = ["PWD", "PASS", "JWT"];
  SECRET_NAME_ANYWHERE_WORDS = ["TOKEN", "SECRET", "PASSWORD", "PASSWD", "PASSPHRASE"];
  SECRET_NAME_PLURAL_WORDS = ["KEY", "SECRET", "PASSWORD", "CREDENTIAL"];
  SECRET_ENV_NAME_REGEX = new RegExp(
    `((^|_)(${SECRET_NAME_WORDS.join("|")}|(${SECRET_NAME_PLURAL_WORDS.join("|")})S)|_(${SECRET_NAME_SUFFIX_WORDS.join("|")})|(${SECRET_NAME_ANYWHERE_WORDS.join("|")}))(?=$|[_0-9])`,
    "i",
  );
  CONNECTION_STRING_ENV_GLOBS = ["CLOUDSDK_PROXY_PASSWORD", "GIT_CONFIG_KEY_[0-9]*"];
  GIT_CONFIG_KEY_ENV_REGEX = /^GIT_CONFIG_KEY_[0-9][A-Za-z0-9_]*$/;
});
//@ chunk-q8cqcff6.js:33913-33999 placement
function isGitConfigEnvName(name) {
  return /^GIT_CONFIG_(?:COUNT|PARAMETERS|(?:KEY|VALUE)_[0-9]+)$/.test(name);
}
//@ chunk-q8cqcff6.js:33999-34040 placement
/**
 * 是否 GIT_CONFIG_* 或代理类环境变量（http_proxy、npm_config_proxy 等）。
 */
function isGitConfigOrProxyEnvName(name) {
  return isGitConfigEnvName(name) || PROXY_ENV_NAME_REGEX.test(name);
}
//@ chunk-q8cqcff6.js:34040-34249 placement
var PROXY_ENV_NAME_REGEX =
  /^(?:(?:https?|ftp|all|no)_proxy|npm_config_(?:https?_)?proxy|npm_config_noproxy|yarn_proxy|(?:yarn|global_agent|docker|claude_code)_(?:https?|no)_proxy|cloudsdk_proxy_[a-z]+|electron_get_use_proxy)$/i;
//@ chunk-q8cqcff6.js:34249-34312 placement
/**
 * 判断环境变量值是否需要脱敏：JVM 选项类看 gIn 是否改动，其他看值本身是否像机密。
 */
function isSecretEnvValue(name, value) {
  let redacted = redactJvmOptionsEnvValue(name, value);
  return redacted === undefined ? containsCredential(value) : redacted !== value;
}
//@ chunk-q8cqcff6.js:34312-35463 placement
/**
 * 对 GOFLAGS 与 JVM 选项类环境变量（JAVA_TOOL_OPTIONS、MAVEN_OPTS…）的值逐词识别含机密的参数（-D 机密属性、口令参数、Bearer 后的值）并删除；返回脱敏值，不能安全处理时返回空串；非此类变量返回 undefined。
 */
function redactJvmOptionsEnvValue(name, value) {
  if (normalizeEnvNameForMatch(name) === "GOFLAGS")
    return value.length > MAX_SECRET_SCAN_LENGTH ? "" : redactJvmOptions(value);
  if (!JVM_OPTIONS_ENV_NAME_SET.has(normalizeEnvNameForMatch(name))) return;
  let words = value.length > MAX_SECRET_SCAN_LENGTH ? null : splitQuotedWords(value);
  if (words === null) return "";
  initEnvScrubFlag();
  let mapped = words.map((word, index) => {
    let normalized =
      index > 0 && /^(?:-D|--define)$/.test(stripJavaLauncherPrefix(words[index - 1]))
        ? `-D${word}`
        : normalizeDefineFlag(stripJavaLauncherPrefix(word));
    return {
      raw: word,
      word: normalized,
      residual: JAVA_OPTIONS_ENV_NAMES.test(normalized),
      goes: false,
    };
  });
  for (let j = 0; j < mapped.length; j++) {
    let token = mapped[j];
    if (token.residual) continue;
    let word = j > 0 ? mapped[j - 1].word : null;
    let next = mapped[j + 1];
    token.goes =
      token.goes ||
      isSecretJvmToken(token.word, word) ||
      (next !== undefined &&
        !next.residual &&
        !isJvmOptionToken(next.word) &&
        AUTH_VALUE_PREFIX_REGEX.test(token.word) &&
        containsCredential(`${token.word} ${next.word}`));
    if (
      token.goes &&
      next !== undefined &&
      !isJvmOptionToken(next.word) &&
      AUTH_VALUE_PREFIX_REGEX.test(token.word)
    )
      next.goes = true;
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
  let filtered = mapped.filter((token) => !token.goes);
  e: while (tokensContainSecret(filtered.filter((token) => !token.residual).flatMap(javaOptionTokens))) {
    let filtered_2 = filtered.filter((token) => !token.residual);
    for (let j = 2; j <= 4; j++)
      for (let j_2 = 0; j_2 + j <= filtered_2.length; j_2++) {
        let sliced = filtered_2.slice(j_2, j_2 + j);
        if (tokensContainSecret(sliced.flatMap(javaOptionTokens))) {
          for (let token of sliced) token.goes = true;
          filtered = filtered.filter((token) => !token.goes);
          continue e;
        }
      }
    for (let token of filtered_2) token.goes = true;
    filtered = filtered.filter((token) => !token.goes);
  }
  if (filtered.length === mapped.length) return value;
  let safe = JAVA_OPTIONS_ENV_NAMES_2.has(normalizeEnvNameForMatch(name))
    ? SAFE_ARG_CHARS_WITH_PIPE_REGEX
    : SAFE_ARG_CHARS_REGEX;
  return filtered.every((token) => safe.test(token.raw)) ? filtered.map((token) => token.raw).join(" ") : "";
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
function isValueTakingFlag(token) {
  return (
    parseMavenSettingsFlag(token) === "" ||
    parseSbtDirFlag(token) === "" ||
    MAVEN_VALUE_FLAG_PATTERN.test(token) ||
    CLASSPATH_FLAG_REGEX.test(token)
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
function isJvmOptionToken(token) {
  return (
    /^-D[A-Za-z_][\w.-]*=.+$/s.test(token) ||
    /^-D[A-Za-z_]\w*(?:\.\w+)+=$/.test(token) ||
    /^-D[A-Za-z_][A-Za-z_.]*$/.test(token) ||
    (token.startsWith("-J-") && isJvmOptionToken(token.slice(2))) ||
    /^--[a-z][a-z0-9-]*(?:=.*)?$/s.test(token) ||
    JVM_X_OPTION_REGEX.test(token) ||
    /^(?:@|-[A-Za-z]{1,4}\d{0,2}$)/.test(token)
  );
}
//@ chunk-q8cqcff6.js:36359-37036 placement
var JVM_X_OPTION_REGEX =
  /^-(?:X(?:mx|ms|ss|mn|rs|int|comp|mixed|batch|diag|debug|future|prof|noclassgc|internalversion|check:jni|share:(?:on|off|auto|dump)|verify(?::[a-z]+)?|log(?::.*)?|loggc:.+|bootclasspath(?:\/[ap])?:.+|runjdwp:.+|dock:.+|startOnFirstThread|showSettings(?::[a-z]+)?)[0-9kKmMgGtT]*$|XX:[+-]?[A-Za-z]\w*(?:=.*)?$|(?:javaagent|agentlib|agentpath):.|verbose(?::[a-z]+)?$|[ed](?:s?a)(?::[a-z][\w$]*(?:\.[\w$]+)*(?:\.\.\.)?)?$|(?:server|client|d64|showversion)$|-(?:add-opens|add-exports|add-reads|add-modules|limit-modules|patch-module|module-path|upgrade-module-path|class-path|enable-native-access|illegal-access|enable-preview|source|release)(?:=.*)?$|(?:cp|classpath|p)$)/s;
//@ chunk-q8cqcff6.js:37036-37143 placement
/**
 * 一组参数拼接后是否含机密（-D 选项只取值部分参与判断）。
 */
function tokensContainSecret(tokens) {
  return containsCredential(
    tokens
      .map((token) =>
        isJvmOptionToken(token) ? `; ${token.includes("=") ? token.replace(/^[^=]*=/, "") : ""}` : token,
      )
      .join(" "),
  );
}
//@ chunk-q8cqcff6.js:37143-37377 placement
function isSecretJvmToken(word, previous) {
  let subTokens = jvmOptionTokens(word);
  if (subTokens === null) return isSecretArgToken(word, previous);
  let key = /^-D([^=]+)=/.exec(word)[1];
  return (
    isUnquotedJavaProperty(word) ||
    isSecretJavaProperty(key, word.slice(key.length + 3)) ||
    tokensContainSecret(subTokens) ||
    subTokens.some(
      (token, index) =>
        isSecretArgToken(token, index > 0 ? subTokens[index - 1] : null) ||
        (index + 1 < subTokens.length &&
          !isJvmOptionToken(subTokens[index + 1]) &&
          AUTH_VALUE_PREFIX_REGEX.test(token) &&
          containsCredential(`${token} ${subTokens[index + 1]}`)),
    )
  );
}
//@ chunk-q8cqcff6.js:37377-37420 placement
function javaOptionTokens(token) {
  return jvmOptionTokens(token.word) ?? [token.word];
}
//@ chunk-q8cqcff6.js:37420-37551 placement
function jvmOptionTokens(word) {
  let match = /^-D[^=]+=\s*(-.*)$/s.exec(word);
  if (match === null) return null;
  return (splitQuotedWords(match[1]) ?? [])
    .map(stripJavaLauncherPrefix)
    .filter((token) => !JAVA_OPTIONS_ENV_NAMES.test(token));
}
//@ chunk-q8cqcff6.js:37551-37636 placement
function isUnquotedJavaProperty(word) {
  let match = /^-D[^=]+=\s*(-.*)$/s.exec(word);
  return match !== null && splitQuotedWords(match[1]) === null;
}
//@ chunk-q8cqcff6.js:37636-38009 placement
function isSecretArgToken(token, previous) {
  if (ENCRYPT_PASSWORD_INLINE_REGEX.test(token)) return true;
  let match = /^-D([^=]+)=(.+)$/s.exec(token);
  if (match !== null) {
    let [, key, value] = match;
    if (isSecretJavaProperty(key, value) || containsCredential(value)) return true;
    if (sanitizedEnvCache === true)
      return (
        BUILD_TOOL_SETTINGS_PROPERTY_PATTERN.test(key) ||
        token.includes("\\") ||
        (!JAVA_OPTIONS_TOKEN_RE.test(key) &&
          !(
            /^sonar\./i.test(key) &&
            !isCredentialPropertyName(key) &&
            !/key.?store|cert|pkcs|p12|pfx|\.pem$/i.test(key)
          ) &&
          looksLikePathValue(value))
      );
    return false;
  }
  if (containsCredential(token)) return true;
  if (sanitizedEnvCache === true)
    return (
      !JAVA_OPTIONS_ENV_VARS.test(token) &&
      !(previous !== null && CLASSPATH_FLAG_REGEX.test(previous)) &&
      looksLikePathValue(token)
    );
  return false;
}
//@ chunk-q8cqcff6.js:38009-38052 placement
function looksLikePathValue(token) {
  return /[\\/]|^[@~]/.test(token);
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
var JAVA_OPTIONS_ENV_NAMES_2; // deferred: uses JAVA_OPTIONS_ENV_VARS of its import cycle while loading; runs once the cycle is complete
var JVM_OPTIONS_ENV_NAME_SET;
var JAVA_OPTIONS_ENV_NAMES;
deferInit("chunk-q8cqcff6.js:39320", () => {
  JAVA_OPTIONS_ENV_NAMES_2 = new Set([
    "JAVA_TOOL_OPTIONS",
    "JDK_JAVA_OPTIONS",
    "_JAVA_OPTIONS",
    "IBM_JAVA_OPTIONS",
    "OPENJ9_JAVA_OPTIONS",
  ]);
  JVM_OPTIONS_ENV_NAME_SET = new Set(JVM_OPTIONS_ENV_NAMES);
  JAVA_OPTIONS_ENV_NAMES =
    /^-D(?:(?:(?:https?|ftp)\.proxy(?:User|Password)|socksProxy(?:User|Password)|java\.net\.socks\.(?:username|password))=\S*$|[\w.-]*trust-?store-?password=changeit$)/i;
});
//@ chunk-q8cqcff6.js:39619-39908 placement
/**
 * 简易分词：按空白切分，处理单双引号；引号未闭合返回 null。
 */
function splitQuotedWords(text) {
  let words = [];
  let current = "";
  let hasWord = false;
  let index = 0;
  while (index < text.length) {
    let char = text[index];
    if (
      char === " " ||
      char === "\t" ||
      char ===
        `
` ||
      char === "\r"
    ) {
      if (hasWord) {
        words.push(current);
        current = "";
        hasWord = false;
      }
      index++;
      continue;
    }
    if (char === "'" || char === '"') {
      let index_2 = text.indexOf(char, index + 1);
      if (index_2 === -1) return null;
      current += text.slice(index + 1, index_2);
      hasWord = true;
      index = index_2 + 1;
      continue;
    }
    current += char;
    hasWord = true;
    index++;
  }
  if (hasWord) words.push(current);
  return words;
}
//@ chunk-q8cqcff6.js:39908-40010 placement (2.1.88 match: normalize, 1)
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
function parseMavenSettingsFlag(token) {
  if (/^-(?:show-version|strict-checksums)$/.test(token)) return null;
  let match =
    /^(?:--?settings|--?global-settings|--?install-settings|--?project-settings|-gs|-is|-ps|-s)(?:=(.+))?$/.exec(
      token,
    ) ?? /^-g?s=?(.+)$/.exec(token);
  return match === null ? null : (match[1] ?? "");
}
//@ chunk-q8cqcff6.js:40531-40636 placement
/**
 * 解析 sbt 的 -ivy/-sbt-dir/-sbt-boot 参数值。
 */
function parseSbtDirFlag(token) {
  let match = /^-{1,2}(?:ivy|sbt-dir|sbt-boot)(?:=(.+))?$/.exec(token);
  return match === null ? null : (match[1] ?? "");
}
//@ chunk-q8cqcff6.js:40636-40684 placement
/**
 * 去掉 Java 启动器转发前缀 -J。
 */
function stripJavaLauncherPrefix(token) {
  return token.replace(/^-J(?=-)/, "");
}
//@ chunk-q8cqcff6.js:40684-40735 placement
function normalizeDefineFlag(token) {
  return token.replace(/^--define=/, "-D");
}
//@ chunk-q8cqcff6.js:40735-40897 placement
/**
 * 规范化参数列表：把 "-D x" 合成 "-Dx"，--define= 转 -D。
 */
function normalizeDefineArgs(args) {
  let out = [];
  for (let j = 0; j < args.length; j++) {
    let arg = args[j];
    if (/^(?:-D|--define)$/.test(arg) && j + 1 < args.length) {
      j += 1;
      out.push(`-D${args[j]}`);
    } else out.push(normalizeDefineFlag(arg));
  }
  return out;
}
//@ chunk-q8cqcff6.js:40897-40972 placement
function isSecretJavaProperty(key, value) {
  return isSecretProperty(key, value) && !/^(?:[\\/~]|[a-z]:[\\/]|file:)/i.test(value);
}
//@ chunk-q8cqcff6.js:40972-41151 placement
/**
 * 系统属性名是否像凭证（且值不是纯数字/布尔等非机密标量）。
 */
function isSecretProperty(key, value) {
  let lastSegment = key.split(".").at(-1) ?? "";
  return (
    isCredentialPropertyName(key) &&
    (SECRET_ID_SUFFIX_PATTERN.test(camelToSnake(key)) ||
      !/(?:user(?:name)?|id|store|file|path|dir|location|url|host|port|alias|type)$/i.test(lastSegment)) &&
    !isScalarPropertyValue(key, value)
  );
}
//@ chunk-q8cqcff6.js:41151-41360 placement
var SECRET_ID_SUFFIX_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SONAR_SECRET_PROPERTIES;
var SONAR_KEY_NAME_REGEX;
var SONAR_NON_SECRET_PROPERTIES;
deferInit("chunk-q8cqcff6.js:41151", () => {
  SECRET_ID_SUFFIX_PATTERN = /(?:PASSWORD|PASSWD|SECRET)S?[._-]ID$/i;
  SONAR_SECRET_PROPERTIES = new Set(["sonar.login", "sonar.token", "sonar.password"]);
  SONAR_KEY_NAME_REGEX = /^(?:projectKey|moduleKey|componentKey|ruleKey|resourceKey)$/;
  SONAR_NON_SECRET_PROPERTIES = new Set(["sonar.pullrequest.key"]);
});
//@ chunk-q8cqcff6.js:41360-41491 placement
/**
 * 属性值是否是数字或布尔等非机密标量（属性名本身不是机密名时）。
 */
function isScalarPropertyValue(key, value) {
  let lastSegment = key.split(".").at(-1) ?? "";
  return (
    /^(?:\d+[a-z]{0,2}|true|false)$/i.test(value) &&
    !isSecretEnvName(lastSegment.replace(/-/g, "_")) &&
    !hasSecretSegment(key)
  );
}
//@ chunk-q8cqcff6.js:41491-41934 placement
/**
 * 系统属性名是否表示凭证：sonar 特例、机密词结尾、USERNAME/USER 结尾等。
 */
function isCredentialPropertyName(key) {
  if (SONAR_SECRET_PROPERTIES.has(key.toLowerCase())) return true;
  let lastSegment = key.split(".").at(-1) ?? "";
  let filtered = camelToSnake(lastSegment)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.toUpperCase().replace(/\d+$/, ""))
    .filter(Boolean);
  let last = filtered.at(-1);
  if (!last) return false;
  if (/^sonar\./i.test(key)) {
    if (last === "SECURED") return true;
    if (
      (SONAR_KEY_NAME_REGEX.test(lastSegment) || SONAR_NON_SECRET_PROPERTIES.has(key.toLowerCase())) &&
      !hasSecretSegment(key)
    )
      return false;
  }
  if (
    isSecretEnvName(lastSegment.replace(/-/g, "_")) ||
    hasSecretSegment(key) ||
    CONNECTION_STRING_NAME_REGEX.test(camelToSnake(key).replace(/[.-]/g, "_"))
  )
    return true;
  return last === "USERNAME" || (last === "USER" && filtered.length > 1);
}
//@ chunk-q8cqcff6.js:41934-42157 placement
function hasSecretSegment(key) {
  let filtered = camelToSnake(key)
    .toUpperCase()
    .split(/[._-]+/)
    .filter(Boolean);
  let last = filtered.at(-1) ?? "";
  let secondLast = filtered.at(-2) ?? "";
  return (
    filtered.slice(0, -1).some((segment) => SECRET_SEGMENT_REGEX_2.test(segment)) &&
    (!SECRET_SEGMENT_REGEX.test(last) ||
      (/^IDS?$/.test(last) && /^(?:PASSWORDS?|PASSWD|SECRETS?)$/.test(secondLast)))
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
function isSecretEnvName(name) {
  let name_2 = name.replace(AUTH0_PREFIX_REGEX_2, "").replace(/-/g, "_");
  return (
    (SECRET_ENV_NAME_REGEX.test(name_2) ||
      SECRET_ENV_NAME_REGEX.test(camelToSnakeEnvName(name_2)) ||
      isConnectionStringName(name_2) ||
      BUNDLE_CREDENTIAL_ENV_REGEX.test(name_2)) &&
    !GIT_CONFIG_KEY_ENV_REGEX.test(name)
  );
}
//@ chunk-q8cqcff6.js:42945-43802 placement
/**
 * AUTH0_ 前缀与 Bundler（BUNDLE_<HOST>__）凭证变量的正则和 glob，以及 Claude Code 自身名字含 KEY/TOKEN 但非机密的变量白名单。
 */
var AUTH0_PREFIX_REGEX_2; // deferred: uses foldCasePattern of its import cycle while loading; runs once the cycle is complete
var AUTH0_PREFIX_REGEX;
var AUTH0_ENV_PATTERN;
var NON_SECRET_WORDS;
var BUNDLE_CREDENTIAL_ENV_REGEX;
var SECRET_ENV_NAME_PATTERN_SOURCE;
var joined;
var CLAUDE_CODE_NON_SECRET_ENV_NAMES;
var CLAUDE_CODE_SKIP_AUTH_ENV_REGEX;
deferInit("chunk-q8cqcff6.js:42945", () => {
  AUTH0_PREFIX_REGEX_2 = /^AUTH0_/i;
  AUTH0_PREFIX_REGEX = "[Aa][Uu][Tt][Hh]0_*";
  AUTH0_ENV_PATTERN = [
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
  NON_SECRET_WORDS = "(?:[A-Za-z0-9]+(?:___[A-Za-z0-9]+)*__)+[A-Za-z]{2,}";
  BUNDLE_CREDENTIAL_ENV_REGEX = new RegExp(
    `^(?:INPUT_)?BUNDLE_(?!(?:${AUTH0_ENV_PATTERN.join("|")})__(?!${NON_SECRET_WORDS}$))\\w*__`,
    "i",
  );
  SECRET_ENV_NAME_PATTERN_SOURCE =
    "[Bb][Uu][Nn][Dd][Ll][Ee]_*__*|[Ii][Nn][Pp][Uu][Tt]_[Bb][Uu][Nn][Dd][Ll][Ee]_*__*";
  joined = AUTH0_ENV_PATTERN.flatMap((word) => [
    `[Bb][Uu][Nn][Dd][Ll][Ee]_${foldCasePattern(word)}__*`,
    `[Ii][Nn][Pp][Uu][Tt]_[Bb][Uu][Nn][Dd][Ll][Ee]_${foldCasePattern(word)}__*`,
  ]).join("|");
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
  ]);
  CLAUDE_CODE_SKIP_AUTH_ENV_REGEX = /^CLAUDE_CODE_SKIP_[A-Z0-9_]+_AUTH$/;
});
//@ chunk-q8cqcff6.js:43802-43847 placement
/**
 * Claude Code 自身的非机密环境变量（名字含 KEY/TOKEN 但不是凭证）白名单判断。
 */
function isNonSecretClaudeCodeEnvName(name) {
  return CLAUDE_CODE_NON_SECRET_ENV_NAMES.has(name) || CLAUDE_CODE_SKIP_AUTH_ENV_REGEX.test(name);
}
//@ chunk-q8cqcff6.js:43847-44225 placement
/**
 * GITHUB_TOKEN_ENV_NAMES：GitHub 令牌环境变量；SECRET_ENV_NAME_PREFIXES：机密环境变量的前缀（同一声明共 2 个绑定）。
 */
var CREDENTIAL_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GITHUB_TOKEN_ENV_NAMES;
var SECRET_ENV_NAME_PREFIXES;
var regExp;
var regExp_2;
deferInit("chunk-q8cqcff6.js:43847", () => {
  CREDENTIAL_ENV_VARS = new Set([
    "GITHUB_TOKEN",
    "GH_TOKEN",
    "GH_ENTERPRISE_TOKEN",
    "GITHUB_ENTERPRISE_TOKEN",
  ]);
  GITHUB_TOKEN_ENV_NAMES = [
    "INPUT_",
    "ORG_GRADLE_PROJECT_",
    "POETRY_PYPI_TOKEN_",
    "POETRY_HTTP_BASIC_",
    "CARGO_REGISTRIES_",
    "CONAN_LOGIN_USERNAME_",
    "CONAN_PASSWORD_",
  ];
  SECRET_ENV_NAME_PREFIXES = ["POETRY_HTTP_BASIC_", "CONAN_LOGIN_USERNAME_"];
  regExp = new RegExp(`^(?:${GITHUB_TOKEN_ENV_NAMES.join("|")})`, "i");
  regExp_2 = new RegExp(`^(?:INPUT_)?(?:${SECRET_ENV_NAME_PREFIXES.join("|")})`, "i");
});
//@ chunk-q8cqcff6.js:44225-44344 placement
/**
 * 判断环境变量名是否为凭证相关的用户名类变量。
 */
function isCredentialUserEnv(name) {
  let replaced = name.replace(/-/g, "_");
  return (
    regExp.test(replaced) &&
    (regExp_2.test(replaced) || /USER(?:_?NAME)?_?[0-9]*$/i.test(replaced) || isSecretEnvName(replaced))
  );
}
//@ chunk-q8cqcff6.js:44344-44708 placement
/**
 * secretEnvGlobs：机密环境变量的 glob 列表。
 */
var joined_2; // deferred: uses CREDENTIAL_ENV_VARS of its import cycle while loading; runs once the cycle is complete
var secretEnvGlobs;
deferInit("chunk-q8cqcff6.js:44344", () => {
  joined_2 = SECRET_ENV_NAME_PREFIXES.flatMap((prefix) => [
    `${foldCasePattern(prefix)}*`,
    `${foldCasePattern(`INPUT_${prefix}`)}*`,
    `${foldCasePattern(`INPUT_${prefix.replace(/_/g, "-")}`).replace(/^INPUT-/, "INPUT_")}*`,
  ])
    .concat(
      GITHUB_TOKEN_ENV_NAMES.filter((name) => !SECRET_ENV_NAME_PREFIXES.includes(name)).flatMap((name) =>
        ["USER", "USERNAME", "USER_NAME", "USER-NAME"].flatMap((suffix) =>
          ["", "[0-9]", "[0-9][0-9]", "[_-][0-9]", "[_-][0-9][0-9]"].map(
            (digits) => `${foldCasePattern(name)}*${foldCasePattern(suffix)}${digits}`,
          ),
        ),
      ),
    )
    .join("|");
  secretEnvGlobs = "__CLAUDE_CC_KEEP_";
});
//@ chunk-q8cqcff6.js:44708-45067 placement
/**
 * 挑出值需要清洗的环境变量（包索引 URL 类或含 JVM 选项的），排除拒绝与屏蔽名单后加前缀转交。
 */
function prefixedSanitizableEnv(env, options = {}) {
  let denied = new Set((options.denied ?? []).map((name) => name.toUpperCase()));
  let masked = new Set((options.masked ?? []).map((name) => name.toUpperCase()));
  let out = {};
  for (let [key, value] of Object.entries(env)) {
    if (denied.has(key.toUpperCase())) continue;
    if (masked.has(key.toUpperCase())) continue;
    if (
      value !== undefined &&
      value.trim() !== "" &&
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) &&
      (isPackageIndexEnv(key) || redactJvmOptionsEnvValue(key, "") !== undefined)
    )
      out[`${secretEnvGlobs}${key}`] = value;
  }
  return out;
}
//@ chunk-q8cqcff6.js:45067-51453 placement
/**
 * 生成 shell 脚本：在 policyHelper 子进程环境中逐一 unset 敏感变量
 */
function buildEnvScrubScript({ sandboxMasked = [] } = {}) {
  let filtered = sandboxMasked.filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
  let maskCase = `case "$__cc_name" in (${filtered.length > 0 ? filtered.join("|") : "''__cc_none__"}) \\builtin true;; (*) \\builtin false;; esac`;
  let joined_3 = SECRET_NAME_WORDS.map(foldCasePattern)
    .concat(SECRET_NAME_PLURAL_WORDS.map((word) => foldCasePattern(`${word}S`)))
    .flatMap((pattern) => [pattern, `${pattern}[_0-9]*`, `*_${pattern}`, `*_${pattern}[_0-9]*`])
    .concat(
      SECRET_NAME_ANYWHERE_WORDS.map(foldCasePattern).flatMap((word) => [`*${word}`, `*${word}[_0-9]*`]),
      SECRET_NAME_SUFFIX_WORDS.map(foldCasePattern).flatMap((word) => [`*_${word}`, `*_${word}[_0-9]*`]),
    )
    .concat(CONNECTION_STRING_ENV_GLOBS_2)
    .join("|");
  let names = [...flattened, ...scrubbedEnvNames(), "GITHUB_TOKEN", "GH_TOKEN"];
  let joined_4 = names.join(" ");
  let joined_5 = names.map((name) => name.toUpperCase()).join(" ");
  let upperProbe = `__cc_uc=; ( LC_ALL=C \\builtin eval ': "\${__cc_uc^^}"' ) 2>/dev/null && __cc_uc=b; \\builtin test -n "$__cc_uc" || { ( LC_ALL=C \\builtin eval ': "\${(U)__cc_uc}"' ) 2>/dev/null && __cc_uc=z; } || \\builtin true`;
  let upperAssign = `__cc_upper="$__cc_name"; case "$__cc_uc" in b) LC_ALL=C \\builtin eval '__cc_upper="\${__cc_name^^}"';; z) LC_ALL=C \\builtin eval '__cc_upper="\${(U)__cc_name}"';; esac`;
  let unsetStmt = `{ ! ${maskCase} && (\\builtin unset -v "$__cc_name") && \\builtin unset -v "$__cc_name"; }`;
  let isSetTest = '\\builtin eval "__cc_set=\\${$__cc_name+x}"; \\builtin test -n "$__cc_set"';
  let listVars = "{ \\builtin compgen -v || \\builtin set; }";
  let joined_6 = MIXED_CASE_AUTH_WORDS.map(
    (word) => `__cc_fold="\${__cc_fold//${word}/${word[0] + word.slice(1).toLowerCase()}}"`,
  ).join("; ");
  let foldStmt = (varName, from = "__cc_fold") =>
    `__cc_fold="\${${varName}}"; ${joined_6}; __cc_split=; __cc_prev=; __cc_i=0; while \\builtin test "$__cc_i" -lt "\${#${from}}"; do __cc_c="\${${from}:$__cc_i:1}"; case "$__cc_prev$__cc_c" in [[:lower:][:digit:]][[:upper:]]) __cc_split="\${__cc_split}_";; [[:upper:]][[:upper:]]) case "\${${from}:$((__cc_i+1)):1}" in [[:lower:]]) __cc_split="\${__cc_split}_";; esac;; esac; __cc_split="$__cc_split$__cc_c"; __cc_prev="$__cc_c"; __cc_i=$((__cc_i+1)); done; case "$__cc_split" in ''|${joined_3}) ${unsetStmt};; esac`;
  let foldName = foldStmt("__cc_name");
  let nocaseProbe =
    "__cc_ncm=; \\builtin shopt -q nocasematch && __cc_ncm=1; \\builtin shopt -u nocasematch || \\builtin true";
  let nocaseOn = '\\builtin test -z "$__cc_ncm" || \\builtin shopt -s nocasematch || \\builtin true';
  let exportStmt =
    '{ (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; }';
  let unsetOnSuccessStmt = '{ (\\builtin unset -v "$__cc_name") && \\builtin unset -v "$__cc_name"; }';
  let joined_7 = CREDENTIAL_SCRUB_ENV_VARS_LOWER.join(" ");
  let joined_8 = [...JVM_OPTIONS_ENV_NAME_SET, "GOFLAGS"].join(" ");
  let quotedInvalid = ((text) => `'${text.replace(/'/g, "'\\''")}'`)(HTTP_INDEX_INVALID);
  let joined_9 = Object.entries(
    Object.entries(PACKAGE_INDEX_ENV_VARS_2).reduce((acc, [alias, canonical]) => {
      (acc[canonical] ??= []).push(alias);
      return acc;
    }, {}),
  )
    .map(([key, value]) => {
      let joined = [key, ...(PACKAGE_INDEX_ENV_VARS[key] ?? [])]
        .map((varName) => `\\\${${varName}:+x}`)
        .join("");
      return `for __cc_name in ${value.join(" ")}; do \\builtin eval "__cc_val=\\\${$__cc_name-}"; \\builtin test "$__cc_val" = ${quotedInvalid} || \\builtin continue; \\builtin eval "__cc_set=${joined}"; \\builtin test -n "$__cc_set" || { __cc_name=${key}; __cc_r=${quotedInvalid}; { (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; }; }; \\builtin break; done`;
    })
    .join("; ");
  let unusedPatterns =
    "CARGO_REGISTRIES_*_INDEX|POETRY_REPOSITORIES_*_URL|[Cc]argo_[Rr]egistries_*_[Ii]ndex|npm_config_registry|[Nn][Pp][Mm]_[Cc][Oo][Nn][Ff][Ii][Gg]_[Rr][Ee][Gg][Ii][Ss][Tt][Rr][Yy]";
  let visitIndex = `\\builtin eval "$({ \\builtin compgen -v || \\builtin set; } 2>/dev/null | while \\builtin read -r __cc_line; do __cc_v="\${__cc_line%%=*}"; __cc_v="\${__cc_v#${secretEnvGlobs}}"; case "$__cc_v" in (''|[0-9]*|*[!A-Za-z0-9_]*) ;; (CARGO_REGISTRIES_*_INDEX|POETRY_REPOSITORIES_*_URL|[Cc]argo_[Rr]egistries_*_[Ii]ndex|npm_config_registry|[Nn][Pp][Mm]_[Cc][Oo][Nn][Ff][Ii][Gg]_[Rr][Ee][Gg][Ii][Ss][Tt][Rr][Yy]) \\builtin printf '__cc_visit %s\\n' "$__cc_v";; esac; done)"`;
  let unsetKept = `\\builtin eval "$({ \\builtin compgen -v || \\builtin set; } 2>/dev/null | while \\builtin read -r __cc_line; do __cc_v="\${__cc_line%%=*}"; case "$__cc_v" in (*[!A-Za-z0-9_]*) ;; (${secretEnvGlobs}*) \\builtin printf '\\\\builtin unset -v %s\\n' "$__cc_v";; esac; done)"`;
  let visitFn = `__cc_visit() { ${`__cc_name=$1; case "$__cc_name" in ''|[0-9]*|*[!A-Za-z0-9_]*) return 0;; esac; ! ${maskCase} || return 0; \\builtin eval "__cc_k=\\\${${secretEnvGlobs}$__cc_name+x}; __cc_r=\\\${${secretEnvGlobs}$__cc_name-}; __cc_val=\\\${$__cc_name-}; __cc_has=\\\${$__cc_name+x}"; if \\builtin test -n "$__cc_k"; then \\builtin test "$__cc_has$__cc_val" = "x$__cc_r" || { (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; }; else \\builtin test -n "$__cc_val" || return 0; case " ${joined_8} " in *" $__cc_name "*) { (\\builtin unset -v "$__cc_name") && \\builtin unset -v "$__cc_name"; };; *) __cc_r=${quotedInvalid}; { (\\builtin unset -v "$__cc_name") && \\builtin eval "$__cc_name=\\$__cc_r; \\builtin export $__cc_name"; };; esac; fi; return 0`}; }; for __cc_n in ${joined_7} ${joined_8}; do __cc_visit "$__cc_n"; done; ${visitIndex}; ${joined_9}; ${unsetKept}; \\builtin unset -f __cc_visit`;
  return `{ __cc_ncm=; \\builtin shopt -q nocasematch && __cc_ncm=1; \\builtin shopt -u nocasematch || \\builtin true; __cc_uc=; ( LC_ALL=C \\builtin eval ': "\${__cc_uc^^}"' ) 2>/dev/null && __cc_uc=b; \\builtin test -n "$__cc_uc" || { ( LC_ALL=C \\builtin eval ': "\${(U)__cc_uc}"' ) 2>/dev/null && __cc_uc=z; } || \\builtin true; while \\builtin read -r __cc_line; do __cc_name="\${__cc_line%%=*}"; case "$__cc_name" in ''|[0-9]*|*[!A-Za-z0-9_]*) \\builtin continue;; esac; __cc_upper="$__cc_name"; case "$__cc_uc" in b) LC_ALL=C \\builtin eval '__cc_upper="\${__cc_name^^}"';; z) LC_ALL=C \\builtin eval '__cc_upper="\${(U)__cc_name}"';; esac; case " ${joined_5} " in *" $__cc_upper "*) ${unsetStmt}; \\builtin continue;; esac; case "$__cc_name" in ${joined_2}) ${unsetStmt}; \\builtin continue;; esac; case "$__cc_name" in ${CONNECTION_STRING_ENV_GLOBS.join("|")}) ;; ${AUTH0_PREFIX_REGEX}) __cc_rest="\${__cc_name#*_}"; case "$__cc_rest" in ${joined_3}) ${unsetStmt};; *[[:lower:][:digit:]][[:upper:]]*|*[[:upper:]][[:upper:]][[:lower:]]*) ${foldStmt("__cc_rest")};; esac;; ${joined_3}) ${unsetStmt};; ${joined}) __cc_rest="\${__cc_name#*__}"; __cc_rest="\${__cc_rest//___/-}"; case "$__cc_rest" in *__*[A-Za-z][A-Za-z]) ${unsetStmt};; *) case "$__cc_name" in *[[:lower:][:digit:]][[:upper:]]*|*[[:upper:]][[:upper:]][[:lower:]]*) ${foldName};; esac;; esac;; ${SECRET_ENV_NAME_PATTERN_SOURCE}) ${unsetStmt};; *[[:lower:][:digit:]][[:upper:]]*|*[[:upper:]][[:upper:]][[:lower:]]*) ${foldName};; esac; done < <({ \\builtin compgen -v || \\builtin set; }); for __cc_name in ${joined_4}; do \\builtin eval "__cc_set=\\\${$__cc_name+x}"; \\builtin test -n "$__cc_set" && ${unsetStmt}; done; ${visitFn}; \\builtin test -z "$__cc_ncm" || \\builtin shopt -s nocasematch || \\builtin true; \\builtin unset -v __cc_line __cc_name __cc_rest __cc_set __cc_val __cc_r __cc_v __cc_k __cc_has __cc_n __cc_split __cc_fold __cc_prev __cc_i __cc_c __cc_ncm __cc_uc __cc_upper; \\builtin true; } 2>/dev/null`;
}
//@ chunk-q8cqcff6.js:51453-51665 placement
/**
 * 列出合并环境中应视为机密的变量名：已知凭证名与用户名类变量，加上值看起来含凭证的变量（排除 git 配置/代理、包索引与 JVM 选项变量）。
 */
function listSecretEnvNames(extra = {}) {
  let merged = {
    ...process.env,
    ...extra,
  };
  let names = new Set(secretEnvNameCandidates(merged));
  for (let [key, value] of Object.entries(merged))
    if (
      value !== undefined &&
      !isGitConfigOrProxyEnvName(key) &&
      !isPackageIndexEnv(key) &&
      redactJvmOptionsEnvValue(key, "") === undefined &&
      isSecretEnvValue(key, typeof value === "string" ? value : String(value))
    )
      names.add(key);
  return [...names];
}
//@ chunk-q8cqcff6.js:51665-51808 placement
/**
 * 汇总可能是机密的环境变量名：已知列表、清理列表、GitHub 令牌与名字像机密的变量。
 */
function secretEnvNameCandidates(env) {
  let names = new Set([...flattened, ...scrubbedEnvNames(), "GITHUB_TOKEN", "GH_TOKEN"]);
  for (let key of Object.keys(env)) if (isSecretEnvName(key) || isCredentialUserEnv(key)) names.add(key);
  return [...names];
}
//@ chunk-q8cqcff6.js:51808-51904 placement
function foldCasePattern(text) {
  return [...text]
    .map((char) => (char.toLowerCase() === char ? char : `[${char}${char.toLowerCase()}]`))
    .join("");
}
//@ chunk-q8cqcff6.js:51904-53023 placement
/**
 * 判断文本是否含凭证：URL 中的 user:pass@ 或令牌型用户信息、私钥头、Slack/Discord/Office 等 webhook、password=/token= 赋值、sonar.login、Authorization/Bearer/Basic/Token 后的令牌等；排除 host:port 路径、制品坐标等误报。
 */
function containsCredential(text) {
  let text_2 = text.length > MAX_SECRET_SCAN_LENGTH ? text.slice(0, MAX_SECRET_SCAN_LENGTH) : text;
  let hasCredentialUserInfo = (rest) => {
    let space = rest.search(/\s/);
    let authority = space === -1 ? rest : rest.slice(0, space);
    let index = authority.lastIndexOf("@");
    if (index === -1) return false;
    let sliced = authority.slice(0, index);
    if (isHostPortPath(sliced, authority.slice(index + 1))) return false;
    return sliced.includes(":") || (!/[/?#]/.test(sliced) && looksLikeToken(sliced));
  };
  let index = text_2.indexOf("://");
  while (index !== -1) {
    if (index > 0 && /[a-z0-9+.-]/i.test(text_2[index - 1] ?? "")) {
      if (hasCredentialUserInfo(text_2.slice(index + 3))) return true;
    }
    index = text_2.indexOf("://", index + 3);
  }
  if (text_2.startsWith("//") && hasCredentialUserInfo(text_2.slice(2))) return true;
  return (
    (/^[^\s/@:]+:(?!\/\/)(?![\\/])[^\s@]*@[^\s/@]+/.test(text_2) &&
      !/^[a-z]:[\\/]/i.test(text_2) &&
      !ARTIFACT_COORDINATE_PATTERN.test(text_2) &&
      !isHostPortPath(
        text_2.slice(0, text_2.lastIndexOf("@", text_2.search(/\s|$/))),
        text_2.slice(text_2.lastIndexOf("@", text_2.search(/\s|$/)) + 1),
      ) &&
      !/^(?:mailto|sips?|xmpp|im|acct):/i.test(text_2)) ||
    SECRET_ASSIGNMENT_PATTERN.test(text_2) ||
    WEBHOOK_URL_PATTERN.test(text_2) ||
    /["']?sonar\.login["']?\s*[:=]\s*["']?[^\s"',}]{8,}/.test(text_2) ||
    PRIVATE_KEY_PATTERN.test(text_2) ||
    /\bauthorization\s*[:=]\s*["']?[a-z][a-z0-9_-]*\s+[A-Za-z0-9._~+\/=-]{8,}/i.test(text_2) ||
    /\b(?:[Tt]oken|TOKEN)\s+(?=[A-Za-z0-9_~+=-]*[0-9])(?=[A-Za-z0-9_~+=-]*[A-Z])(?=([A-Za-z0-9_~+=-]{20,}))\1(?![\/.])/.test(
      text_2,
    ) ||
    /\b(?:Bearer|Basic)\s+(?=[A-Za-z._~+\/=-]*[0-9]|(?:[A-Za-z0-9._~+\/=-]*?[a-z][A-Z](?![a-z])){2}|[A-Za-z0-9.-]*[_~+\/=])[A-Za-z0-9._~+\/=-]{8,}/.test(
      text_2,
    )
  );
}
//@ chunk-q8cqcff6.js:53023-53035 placement
var MAX_SECRET_SCAN_LENGTH = 8192;
//@ chunk-q8cqcff6.js:53035-53190 placement
function looksLikeToken(token) {
  return (
    /^(?:gh[opusr]_|github_pat_|glpat-|xox[abpr]-|sk-|pk-|AKIA|eyJ|ya29\.|npm_)/.test(token) ||
    (token.length >= 20 && /[0-9]/.test(token) && /[a-z]/i.test(token))
  );
}
//@ chunk-q8cqcff6.js:53190-53428 placement
function isHostPortPath(head, tail) {
  let match = /^([a-z0-9_-]+(?:\.[a-z0-9_-]+)*):\d+([/?#].*)$/is.exec(head);
  if (!match) return false;
  if (/[?#&]/.test(match[2])) return true;
  if (HOST_LIKE_PATTERN.test(tail)) return false;
  if (head.endsWith("/")) return true;
  if (/^(?:v?\d|sha\d*:)/i.test(tail)) return true;
  return !HOSTNAME_PATTERN.test(tail);
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
function redactJvmOptions(text) {
  let tokens = text.split(/\s+/).filter(Boolean);
  let afterXFlag = false;
  let mapped = tokens.map((token) => {
    let replaced = token.replace(/["']/g, "");
    let replaced_2 = replaced.replace(/^--?[\w-]+=/, "");
    let match = /(?:^|[=\s])--?X[= ]?([^\s=]+)=(.*)$/.exec(replaced);
    let xMatch = match ?? (afterXFlag ? /^()([^\s=-][^\s=]*)=(.*)$/.exec(replaced) : null);
    afterXFlag = /(?:^|=)--?X$/.test(replaced);
    if (xMatch === null)
      return {
        bare: replaced,
        contribution: replaced_2,
        goes:
          (/(?:^|[=\s])--?X\b/.test(replaced) && !/(?:^|=)--?X$/.test(replaced)) ||
          containsCredential(replaced_2),
      };
    let keyPart = xMatch.at(-2) ?? "";
    let lastSegment = keyPart.split("/").at(-1) ?? "";
    let valuePart = xMatch.at(-1) ?? "";
    let prefix = match === null ? "" : replaced.slice(0, match.index);
    return {
      bare: replaced,
      contribution: replaced_2,
      goes:
        isSecretProperty(lastSegment, valuePart) ||
        containsCredential(valuePart) ||
        containsCredential(keyPart) ||
        (prefix !== "" && containsCredential(prefix)),
    };
  });
  for (let j = 0; j < mapped.length; j++)
    for (let j_2 = 2; j_2 <= 4 && j + j_2 <= mapped.length; j_2++) {
      let sliced = mapped.slice(j, j + j_2);
      if (sliced.some((token) => token.goes) || sliced.slice(1).some((token) => token.bare.startsWith("-")))
        break;
      if (containsCredential(sliced.map((token) => token.contribution).join(" "))) {
        for (let token of sliced) token.goes = true;
        break;
      }
    }
  mapped.forEach((token, index) => {
    if (!/(?:^|=)--?X$/.test(token.bare)) return;
    let next = mapped[index + 1];
    let goes = next === undefined || next.goes || token.goes;
    token.goes = goes;
    if (next !== undefined) next.goes = goes;
  });
  let mapped_2 = tokens.map(() => -1);
  let openQuoteIndex = -1;
  let quoteChar = "";
  tokens.forEach((token, quoteIndex) => {
    if (openQuoteIndex === -1) {
      let firstChar = token[0];
      if ((firstChar === '"' || firstChar === "'") && !(token.length > 1 && token.endsWith(firstChar))) {
        openQuoteIndex = quoteIndex;
        quoteChar = firstChar;
        mapped_2[quoteIndex] = openQuoteIndex;
      }
      return;
    }
    mapped_2[quoteIndex] = openQuoteIndex;
    if (token.endsWith(quoteChar)) openQuoteIndex = -1;
  });
  if (openQuoteIndex !== -1)
    mapped.forEach((token, index) => {
      if (mapped_2[index] === openQuoteIndex) token.goes = true;
    });
  mapped.forEach((token, index) => {
    if (token.goes && mapped_2[index] !== -1)
      mapped.forEach((token, innerIndex) => {
        if (mapped_2[innerIndex] === mapped_2[index]) token.goes = true;
      });
  });
  if (mapped.every((token) => !token.goes)) return text;
  return tokens
    .filter(
      (token, index) => !mapped[index].goes && (mapped_2[index] !== -1 || SAFE_ARG_CHARS_REGEX.test(token)),
    )
    .join(" ");
}
//@ chunk-q8cqcff6.js:55845-57038 placement
/**
 * UNSAFE_ENV_PREFIXES：需要去除的危险环境变量前缀（同一声明共 8 个绑定）。
 */
var UNSAFE_ENV_PREFIXES_9; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var UNSAFE_ENV_PREFIXES;
var UNSAFE_ENV_PREFIXES_2;
var UNSAFE_ENV_PREFIXES_3;
var UNSAFE_ENV_PREFIXES_4;
var UNSAFE_ENV_PREFIXES_5;
var UNSAFE_ENV_PREFIXES_6;
var UNSAFE_ENV_PREFIXES_7;
var UNSAFE_ENV_PREFIXES_8;
deferInit("chunk-q8cqcff6.js:55845", () => {
  UNSAFE_ENV_PREFIXES_9 = [
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
  UNSAFE_ENV_PREFIXES = new Set([
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
  UNSAFE_ENV_PREFIXES_2 = "/usr/bin:/bin:/usr/sbin:/sbin";
  UNSAFE_ENV_PREFIXES_3 =
    "C:\\Windows\\System32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Windows\\System32\\WindowsPowerShell\\v1.0";
  UNSAFE_ENV_PREFIXES_4 = "C:\\Windows\\System32\\cmd.exe";
  UNSAFE_ENV_PREFIXES_5 =
    "C:\\Program Files\\WindowsPowerShell\\Modules;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules";
  UNSAFE_ENV_PREFIXES_6 = ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC";
  UNSAFE_ENV_PREFIXES_7 = "/var/empty/claude-code-policy-helper";
  UNSAFE_ENV_PREFIXES_8 = "C:\\Windows\\claude-code-policy-helper";
});
//@ chunk-q8cqcff6.js:57038-57123 placement
function isUnsafeHelperEnvVar(name) {
  let upper = name.toUpperCase();
  return UNSAFE_ENV_PREFIXES.has(upper) || UNSAFE_ENV_PREFIXES_9.some((prefix) => upper.startsWith(prefix));
}
//@ chunk-q8cqcff6.js:57123-57614 placement
/**
 * 构造 policyHelper 子进程环境：删除机密与危险变量、清洗凭证值，固定 PYTHONNOUSERSITE、GIT_CONFIG_NOSYSTEM，并按平台把 PATH、COMSPEC、PSModulePath、git 全局配置等设为安全值。
 */
function helperProcessEnv(env, platform) {
  let out = {
    ...env,
  };
  let secretNames = new Set(listSecretEnvNames(env).map((name) => name.toUpperCase()));
  for (let key of Object.keys(out))
    if (isUnsafeHelperEnvVar(key) || secretNames.has(key.toUpperCase())) delete out[key];
  Object.assign(out, sanitizeEnvCredentials(out).respelled);
  out.PYTHONNOUSERSITE = "1";
  out.GIT_CONFIG_NOSYSTEM = "1";
  if (platform === "win32") {
    out.GIT_CONFIG_GLOBAL = UNSAFE_ENV_PREFIXES_8;
    out.PATH = UNSAFE_ENV_PREFIXES_3;
    out.COMSPEC = UNSAFE_ENV_PREFIXES_4;
    out.PSModulePath = UNSAFE_ENV_PREFIXES_5;
    out.PATHEXT = UNSAFE_ENV_PREFIXES_6;
    out.SystemRoot = "C:\\Windows";
    out.windir = "C:\\Windows";
    out.SystemDrive = "C:";
  } else {
    out.GIT_CONFIG_GLOBAL = UNSAFE_ENV_PREFIXES_7;
    out.PATH = UNSAFE_ENV_PREFIXES_2;
    out.ZDOTDIR = UNSAFE_ENV_PREFIXES_7;
    out.XDG_CONFIG_HOME = UNSAFE_ENV_PREFIXES_7;
    out.PSModulePath = UNSAFE_ENV_PREFIXES_7;
  }
  return out;
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
