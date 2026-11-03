/**
 * utils/sensitiveEnvVars.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (4)
 * attribution: placement 4
 */

//@ chunk-q8cqcff6.js:32807-32859 placement
var CONNECTION_STRING_NAME_REGEX = /CONN(ECT(ION)?)?_?STR(ING)?S?(?=$|[_0-9])/i;
/**
 * 变量名是否像连接串（CONN_STR、CONNECTION_STRING 等，含驼峰形式）。
 */
//@ chunk-q8cqcff6.js:32859-32909 placement
function isConnectionStringName(e) {
  return CONNECTION_STRING_NAME_REGEX.test(e) || CONNECTION_STRING_NAME_REGEX.test(camelToSnakeEnvName(e));
}
/**
 * 拆驼峰前需归一的混合大小写词（OAuth、NextAuth）。
 */
//@ chunk-q8cqcff6.js:32909-32937 placement
var MIXED_CASE_AUTH_WORDS = ["OAuth", "NextAuth"];
//@ chunk-q8cqcff6.js:32937-33103 placement = normalize (1)
function camelToSnakeEnvName(name) {
  return MIXED_CASE_AUTH_WORDS.reduce((n, r) => n.replaceAll(r, r[0] + r.slice(1).toLowerCase()), name)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2");
}

export { CONNECTION_STRING_NAME_REGEX, camelToSnakeEnvName, isConnectionStringName, MIXED_CASE_AUTH_WORDS };
