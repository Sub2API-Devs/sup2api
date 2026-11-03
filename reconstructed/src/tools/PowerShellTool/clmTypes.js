/**
 * tools/PowerShellTool/clmTypes.ts
 *
 * PowerShell 受限语言模式允许的 .NET 类型白名单与判断函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/clmTypes.ts
 * pieces: chunk-v0yfsee9.js (3)
 * attribution: fingerprint 1, file-local 1, callgraph-witnessed 1
 */

//@ chunk-v0yfsee9.js:58675-61506 fingerprint = CLM_ALLOWED_TYPES (1)
/**
 * PowerShell 受限语言模式（CLM）允许的 .NET 类型白名单；normalizeTypeName 去掉数组/泛型后缀并小写，isClmAllowedType 判断类型是否允许（供 powershellSecurity 检查类型字面量）。
 */
var CLM_ALLOWED_TYPES = new Set(
  [
    "alias",
    "allowemptycollection",
    "allowemptystring",
    "allownull",
    "argumentcompleter",
    "argumentcompletions",
    "array",
    "bigint",
    "bool",
    "byte",
    "char",
    "cimclass",
    "cimconverter",
    "ciminstance",
    "cimtype",
    "cmdletbinding",
    "cultureinfo",
    "datetime",
    "decimal",
    "double",
    "dsclocalconfigurationmanager",
    "dscproperty",
    "dscresource",
    "experimentaction",
    "experimental",
    "experimentalfeature",
    "float",
    "guid",
    "hashtable",
    "int",
    "int16",
    "int32",
    "int64",
    "ipaddress",
    "ipendpoint",
    "long",
    "mailaddress",
    "norunspaceaffinity",
    "nullstring",
    "objectsecurity",
    "ordered",
    "outputtype",
    "parameter",
    "physicaladdress",
    "pscredential",
    "pscustomobject",
    "psdefaultvalue",
    "pslistmodifier",
    "psobject",
    "psprimitivedictionary",
    "pstypenameattribute",
    "ref",
    "regex",
    "sbyte",
    "securestring",
    "semver",
    "short",
    "single",
    "string",
    "supportswildcards",
    "switch",
    "timespan",
    "uint",
    "uint16",
    "uint32",
    "uint64",
    "ulong",
    "uri",
    "ushort",
    "validatecount",
    "validatedrive",
    "validatelength",
    "validatenotnull",
    "validatenotnullorempty",
    "validatenotnullorwhitespace",
    "validatepattern",
    "validaterange",
    "validatescript",
    "validateset",
    "validatetrusteddata",
    "validateuserdrive",
    "version",
    "void",
    "wildcardpattern",
    "x500distinguishedname",
    "x509certificate",
    "xml",
    "system.array",
    "system.boolean",
    "system.byte",
    "system.char",
    "system.datetime",
    "system.decimal",
    "system.double",
    "system.guid",
    "system.int16",
    "system.int32",
    "system.int64",
    "system.numerics.biginteger",
    "system.sbyte",
    "system.single",
    "system.string",
    "system.timespan",
    "system.uint16",
    "system.uint32",
    "system.uint64",
    "system.uri",
    "system.version",
    "system.void",
    "system.collections.hashtable",
    "system.text.regularexpressions.regex",
    "system.globalization.cultureinfo",
    "system.net.ipaddress",
    "system.net.ipendpoint",
    "system.net.mail.mailaddress",
    "system.net.networkinformation.physicaladdress",
    "system.security.securestring",
    "system.security.cryptography.x509certificates.x509certificate",
    "system.security.cryptography.x509certificates.x500distinguishedname",
    "system.xml.xmldocument",
    "system.management.automation.pscredential",
    "system.management.automation.pscustomobject",
    "system.management.automation.pslistmodifier",
    "system.management.automation.psobject",
    "system.management.automation.psprimitivedictionary",
    "system.management.automation.psreference",
    "system.management.automation.semanticversion",
    "system.management.automation.switchparameter",
    "system.management.automation.wildcardpattern",
    "system.management.automation.language.nullstring",
    "microsoft.management.infrastructure.cimclass",
    "microsoft.management.infrastructure.cimconverter",
    "microsoft.management.infrastructure.ciminstance",
    "microsoft.management.infrastructure.cimtype",
    "system.collections.specialized.ordereddictionary",
    "system.security.accesscontrol.objectsecurity",
    "object",
    "system.object",
    "microsoft.powershell.commands.modulespecification",
  ].map((t) => t.toLowerCase()),
);
//@ chunk-v0yfsee9.js:61506-61593 file-local
function normalizeTypeName(name) {
  return name
    .toLowerCase()
    .replace(/\[\]$/, "")
    .replace(/\[.*\]$/, "")
    .trim();
}
//@ chunk-v0yfsee9.js:61593-61629 callgraph-witnessed = isClmAllowedType (0)
/**
 * .NET 类型名是否在 PowerShell 受限语言模式（CLM）允许列表里。
 */
function isClmAllowedType(typeName) {
  return CLM_ALLOWED_TYPES.has(normalizeTypeName(typeName));
}
export { isClmAllowedType };
