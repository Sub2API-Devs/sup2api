/**
 * utils/model/modelCatalog/maskedIds.ts
 *
 * 2.1.316 新增：写回遮盖 id 文件；读取 masked-ids.json（大小上限）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (21)
 * attribution: placement 19, layout 2
 */
import { join } from "path";
import { redactUrlsInText } from "../../redaction/urlRedaction.js";
import { isAnthropicHost } from "../../anthropicHosts.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../../../services/analytics/safeMetadata.js";
import { shortHash } from "../../shortHash.js";
import { getBetaByName } from "../../betas.js";
import { jsonStringify } from "../../slowOperations.js";
import { isDiskless } from "../../../bootstrap/state.js";
import { getFileReader } from "../../fileStore.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { objectSchema, literal, array, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../../markdownConfigLoader.js";
import { getProviderState } from "../providerCaches.js";
import { logForDebugging } from "../../debug.js";
import { addMaskedModelIds, isMaskFreeModelId, normalizeModelId } from "./catalogEntries.js";
import { isENOENT, getErrnoCode } from "../../errors.js";
import { safeParseJSON } from "../../json.js";
import { normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:769865-769919 placement
/**
 * 对文本中的 URL 先遮盖，再按主机是否 Anthropic 决定是否清洗。
 */
function hashOrRedactUrl(customApiBaseUrl) {
  let redacted = redactUrlsInText(customApiBaseUrl);
  return isAnthropicHost(redacted) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(redacted) : shortHash(redacted);
}
//@ chunk-exfmq47h.js:769919-769986 placement
/**
 * 工具名列表的哈希（自定义工具归为 custom）。
 */
function hashToolNames(betas) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    betas.map((beta) => (getBetaByName(beta) ? beta : "custom")).join(","),
  );
}
//@ chunk-exfmq47h.js:769986-770166 placement
/**
 * 把工具名转换为遥测安全形式（MCP、评测注册与动态工具归为类别）。
 */
function sanitizeToolNameForTelemetry(toolName) {
  if (toolName.startsWith("mcp__")) return lit("mcp");
  if (toolName.startsWith("eval_registered__")) return lit("eval_registered");
  if (toolName.includes("__")) return lit("dynamic_tool");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(toolName);
}
//@ chunk-exfmq47h.js:770166-770218 placement
/**
 * 键值对的哈希。
 */
function hashEntries(entries) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(jsonStringify(Object.fromEntries(entries)));
}
//@ chunk-exfmq47h.js:770218-775484 layout
var KNOWN_FILE_EXTENSIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:770218", () => {
  KNOWN_FILE_EXTENSIONS = new Set([
    "3ds",
    "3gp",
    "3mf",
    "7z",
    "a",
    "aac",
    "abap",
    "abc",
    "ac",
    "ac3",
    "accdb",
    "ada",
    "adb",
    "adoc",
    "ads",
    "afdesign",
    "afphoto",
    "afpub",
    "agda",
    "ai",
    "aiff",
    "alac",
    "am",
    "amf",
    "ape",
    "apex",
    "apk",
    "app",
    "ar",
    "arb",
    "arrow",
    "arw",
    "asc",
    "asciidoc",
    "asf",
    "asm",
    "asp",
    "aspx",
    "asset",
    "astro",
    "atom",
    "avi",
    "avif",
    "avro",
    "avsc",
    "awk",
    "azw",
    "azw3",
    "babelrc",
    "bak",
    "bam",
    "bash",
    "bat",
    "bazel",
    "bcf",
    "bed",
    "bib",
    "bicep",
    "bigwig",
    "bin",
    "bit",
    "blend",
    "bmp",
    "brd",
    "brep",
    "bsp",
    "bw",
    "bz2",
    "bzl",
    "c",
    "c4d",
    "cab",
    "cabal",
    "cae",
    "cairo",
    "capnp",
    "cas",
    "catpart",
    "catproduct",
    "cbl",
    "cbm",
    "cbr",
    "cbz",
    "cc",
    "ccp4",
    "cdr",
    "cdx",
    "cel",
    "cer",
    "cfc",
    "cfg",
    "cfm",
    "cgns",
    "checkpoint",
    "cif",
    "cjs",
    "ckpt",
    "cl",
    "class",
    "clj",
    "cljc",
    "cljs",
    "cls",
    "cmake",
    "cmd",
    "cob",
    "coffee",
    "conf",
    "config",
    "contcar",
    "coq",
    "core",
    "coreml",
    "cpio",
    "cpp",
    "cppm",
    "cpy",
    "cql",
    "cr",
    "cr2",
    "cram",
    "crash",
    "crt",
    "cs",
    "cshtml",
    "csproj",
    "csr",
    "css",
    "csv",
    "cts",
    "cu",
    "cube",
    "cue",
    "cuh",
    "cxx",
    "cypher",
    "czi",
    "d",
    "dae",
    "dart",
    "dat",
    "data",
    "db",
    "dbf",
    "dbml",
    "dcd",
    "dcm",
    "ddl",
    "deb",
    "der",
    "dfu",
    "dgn",
    "dhall",
    "dicom",
    "diff",
    "djvu",
    "dll",
    "dmg",
    "dng",
    "doc",
    "dockerfile",
    "docm",
    "docx",
    "dot",
    "dotm",
    "dotx",
    "drawio",
    "drl",
    "dta",
    "dtd",
    "dts",
    "duckdb",
    "dump",
    "dwg",
    "dxf",
    "dylib",
    "ear",
    "editorconfig",
    "edn",
    "eex",
    "ejs",
    "el",
    "elf",
    "elm",
    "emf",
    "eml",
    "engine",
    "entitlements",
    "env",
    "eot",
    "eps",
    "epub",
    "erb",
    "erl",
    "err",
    "eslintrc",
    "evtx",
    "ex",
    "example",
    "exe",
    "exo",
    "exr",
    "exs",
    "f",
    "f03",
    "f90",
    "f95",
    "fa",
    "fasta",
    "fastq",
    "fb2",
    "fbs",
    "fbx",
    "fcs",
    "feather",
    "feature",
    "fig",
    "fish",
    "fits",
    "fla",
    "flac",
    "flatbuffers",
    "flv",
    "fmu",
    "fna",
    "foam",
    "fon",
    "for",
    "fq",
    "frag",
    "fs",
    "fsi",
    "fsproj",
    "fsx",
    "ftl",
    "gaussian",
    "gb",
    "gbk",
    "gbr",
    "gd",
    "gemspec",
    "genbank",
    "geojson",
    "geotiff",
    "gerber",
    "gff",
    "gff3",
    "ggml",
    "gguf",
    "gif",
    "gjf",
    "glb",
    "gleam",
    "glsl",
    "gltf",
    "glyphs",
    "gml",
    "gn",
    "gni",
    "go",
    "godot",
    "gotmpl",
    "gpg",
    "gpkg",
    "gpx",
    "gql",
    "gradle",
    "graphql",
    "gro",
    "groovy",
    "gtf",
    "gv",
    "gyp",
    "gypi",
    "gz",
    "h",
    "h5",
    "hack",
    "haml",
    "hbs",
    "hcl",
    "hdf",
    "hdf5",
    "hdr",
    "heex",
    "heic",
    "heif",
    "hex",
    "hh",
    "hl7",
    "hlsl",
    "hocon",
    "hpp",
    "hql",
    "hrl",
    "hs",
    "htm",
    "html",
    "http",
    "hx",
    "hxx",
    "ico",
    "ics",
    "idat",
    "idr",
    "idx",
    "ifc",
    "iges",
    "igs",
    "ihex",
    "img",
    "in",
    "inchi",
    "indd",
    "ini",
    "inl",
    "ino",
    "inp",
    "ipa",
    "ipp",
    "ipynb",
    "iso",
    "ixx",
    "j2",
    "jade",
    "jar",
    "java",
    "jed",
    "jinja",
    "jinja2",
    "jks",
    "jl",
    "jmd",
    "joblib",
    "jpeg",
    "jpg",
    "js",
    "json",
    "json5",
    "jsonc",
    "jsonl",
    "jsonld",
    "jsonnet",
    "jsp",
    "jsx",
    "jt",
    "kdl",
    "keras",
    "key",
    "kicad_pcb",
    "kml",
    "kmz",
    "kra",
    "kt",
    "kts",
    "las",
    "latex",
    "laz",
    "lean",
    "less",
    "lgb",
    "lhs",
    "lib",
    "libsonnet",
    "lif",
    "liquid",
    "lisp",
    "livemd",
    "local",
    "lock",
    "lockb",
    "log",
    "lsp",
    "lua",
    "luau",
    "lz",
    "lz4",
    "lzma",
    "m",
    "m2ts",
    "m4",
    "m4a",
    "m4v",
    "ma",
    "maf",
    "make",
    "makefile",
    "man",
    "map",
    "mar",
    "markdown",
    "mat",
    "max",
    "mb",
    "mbox",
    "mbtiles",
    "mcs",
    "md",
    "mdb",
    "mdc",
    "mdl",
    "mdx",
    "meson",
    "metal",
    "mid",
    "midi",
    "mjs",
    "mk",
    "mkv",
    "ml",
    "mli",
    "mlmodel",
    "mm",
    "mmcif",
    "mmd",
    "mo",
    "mobi",
    "mod",
    "mojo",
    "mol",
    "mol2",
    "mov",
    "move",
    "mp3",
    "mp4",
    "mpeg",
    "mpg",
    "mrc",
    "msg",
    "msh",
    "msi",
    "mts",
    "mustache",
    "nb",
    "nc",
    "nd2",
    "ndjson",
    "nef",
    "newick",
    "nii",
    "nim",
    "ninja",
    "nix",
    "njk",
    "node",
    "nomad",
    "npy",
    "npz",
    "nt",
    "numbers",
    "nupkg",
    "nuspec",
    "nwd",
    "nwk",
    "o",
    "obj",
    "odb",
    "odp",
    "ods",
    "odt",
    "ogg",
    "ogv",
    "onnx",
    "opus",
    "orc",
    "orf",
    "org",
    "orig",
    "osm",
    "otf",
    "out",
    "ova",
    "ovf",
    "owl",
    "oxps",
    "p12",
    "pages",
    "pak",
    "parquet",
    "pas",
    "patch",
    "pb",
    "pbf",
    "pbxproj",
    "pcss",
    "pdb",
    "pdf",
    "pef",
    "pem",
    "pfx",
    "php",
    "phtml",
    "phy",
    "pickle",
    "pkl",
    "pl",
    "plantuml",
    "plist",
    "ply",
    "pm",
    "pmml",
    "png",
    "po",
    "pod",
    "podspec",
    "poscar",
    "pot",
    "potm",
    "potx",
    "pp",
    "ppk",
    "ppsm",
    "ppsx",
    "ppt",
    "pptm",
    "pptx",
    "prefab",
    "prettierrc",
    "prisma",
    "prj",
    "pro",
    "procreate",
    "properties",
    "props",
    "proto",
    "prt",
    "ps",
    "ps1",
    "psd",
    "psd1",
    "psm1",
    "pt",
    "pth",
    "pub",
    "pug",
    "puml",
    "purs",
    "pxd",
    "pxi",
    "py",
    "pyc",
    "pyd",
    "pyi",
    "pyo",
    "pyw",
    "pyx",
    "qcow",
    "qcow2",
    "qmd",
    "qml",
    "qrc",
    "r",
    "rake",
    "raku",
    "rar",
    "raw",
    "razor",
    "rb",
    "rda",
    "rdata",
    "rdf",
    "rdoc",
    "rds",
    "re",
    "rego",
    "rej",
    "res",
    "resx",
    "rfa",
    "rkt",
    "rlib",
    "rmd",
    "ron",
    "rpm",
    "rq",
    "rs",
    "rss",
    "rst",
    "rtf",
    "ru",
    "rvt",
    "rw2",
    "rxn",
    "s",
    "safetensors",
    "sam",
    "sample",
    "sas",
    "sas7bdat",
    "sass",
    "sat",
    "sav",
    "sbt",
    "sc",
    "scala",
    "sch",
    "scm",
    "scss",
    "sdf",
    "sed",
    "service",
    "sfd",
    "sh",
    "shader",
    "shp",
    "shx",
    "sig",
    "sketch",
    "skp",
    "sldasm",
    "slddrw",
    "sldprt",
    "slim",
    "sln",
    "slx",
    "smi",
    "smiles",
    "sml",
    "snap",
    "so",
    "sol",
    "sparql",
    "spec",
    "sql",
    "sqlite",
    "sqlite3",
    "sr2",
    "srec",
    "srt",
    "ssh",
    "star",
    "step",
    "stl",
    "storyboard",
    "stp",
    "strings",
    "sty",
    "styl",
    "sum",
    "sv",
    "svelte",
    "svg",
    "svh",
    "swf",
    "swift",
    "swp",
    "t",
    "tar",
    "targets",
    "tbz2",
    "tcl",
    "teal",
    "templ",
    "template",
    "tex",
    "text",
    "textile",
    "tf",
    "tflite",
    "tfrecord",
    "tfstate",
    "tfvars",
    "tgz",
    "thrift",
    "thy",
    "tif",
    "tiff",
    "tmp",
    "tmpl",
    "toml",
    "topojson",
    "tpl",
    "tpp",
    "trace",
    "tres",
    "trt",
    "ts",
    "tscn",
    "tsv",
    "tsx",
    "ttf",
    "ttl",
    "twig",
    "txt",
    "typ",
    "uasset",
    "uf2",
    "ufo",
    "ui",
    "umap",
    "unity",
    "unitypackage",
    "usd",
    "usda",
    "usdc",
    "usdz",
    "v",
    "vagrant",
    "vb",
    "vbproj",
    "vbs",
    "vcf",
    "vcxproj",
    "vdi",
    "vert",
    "vhd",
    "vhdl",
    "vhdx",
    "vim",
    "vmdk",
    "vob",
    "vpk",
    "vrml",
    "vsdx",
    "vtk",
    "vtt",
    "vtu",
    "vue",
    "vy",
    "wad",
    "war",
    "wasm",
    "wat",
    "wav",
    "webm",
    "webmanifest",
    "webp",
    "wgsl",
    "whl",
    "wig",
    "wiki",
    "wl",
    "wls",
    "wma",
    "wmf",
    "wmv",
    "woff",
    "woff2",
    "wolfram",
    "work",
    "wpd",
    "wps",
    "wrl",
    "wsdl",
    "x3d",
    "x_b",
    "x_t",
    "xaml",
    "xcconfig",
    "xcf",
    "xcstrings",
    "xd",
    "xgb",
    "xhtml",
    "xib",
    "xls",
    "xlsb",
    "xlsm",
    "xlsx",
    "xltm",
    "xltx",
    "xml",
    "xps",
    "xpt",
    "xsd",
    "xsl",
    "xslt",
    "xtc",
    "xyz",
    "xz",
    "yaml",
    "yml",
    "z",
    "zig",
    "zip",
    "zsh",
    "zst",
  ]);
});
//@ chunk-exfmq47h.js:775513-775622 placement
function rejectDiskless(code) {
  return () =>
    Promise.reject(
      Object.assign(Error("this session keeps nothing on disk"), {
        code,
      }),
    );
}
//@ chunk-exfmq47h.js:775622-775724 placement
var DISKLESS_MASK_STORE; // deferred: uses rejectDiskless of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:775622", () => {
  DISKLESS_MASK_STORE = {
    readRange: rejectDiskless("ENOENT"),
    delete: rejectDiskless("ENOENT"),
    mkdir: rejectDiskless("EDISKLESS"),
    atomicWrite: rejectDiskless("EDISKLESS"),
  };
});
//@ chunk-exfmq47h.js:775724-775757 placement
/**
 * 遮盖 id 文件使用的存储后端。
 */
function maskStorage() {
  return isDiskless() ? DISKLESS_MASK_STORE : getFileReader();
}
//@ chunk-exfmq47h.js:775757-775930 placement
var MASKED_IDS_JSON_2; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MASKED_IDS_JSON;
var MAX_MASKED_TOOL_NAMES;
var MASK_RETRY_DELAY_MS;
var MASKED_ID_RE;
var MASKED_IDS_VERSION;
var MAX_MASKED_IDS_FILE_BYTES;
var MASKED_IDS_UNPARSEABLE_JSON;
var MAX_UNPARSEABLE_WRITES;
var maskedIdsSchema;
deferInit("chunk-exfmq47h.js:775757", () => {
  MASKED_IDS_JSON_2 = "masked-ids.json";
  MASKED_IDS_JSON = 512;
  MAX_MASKED_TOOL_NAMES = 64;
  MASK_RETRY_DELAY_MS = 5000;
  MASKED_ID_RE = /^[a-z0-9._:@/[\]-]{1,200}$/;
  MASKED_IDS_VERSION = 1;
  MAX_MASKED_IDS_FILE_BYTES = 131072;
  MASKED_IDS_UNPARSEABLE_JSON = "masked-ids.unparseable.json";
  MAX_UNPARSEABLE_WRITES = 3;
  maskedIdsSchema = DoctorLazy(() =>
    objectSchema({
      version: literal(MASKED_IDS_VERSION),
      ids: array(unknown()),
    }),
  );
});
//@ chunk-exfmq47h.js:775930-775984 placement
/**
 * 模型目录缓存目录。
 */
function modelCatalogCacheDir() {
  return join(getClaudeConfigDir(), "cache", "model-catalog");
}
//@ chunk-exfmq47h.js:775984-776018 placement
function maskedIdsPath() {
  return join(modelCatalogCacheDir(), MASKED_IDS_JSON_2);
}
//@ chunk-exfmq47h.js:776018-776051 placement
function maskedIdsUnparseablePath() {
  return join(modelCatalogCacheDir(), MASKED_IDS_UNPARSEABLE_JSON);
}
//@ chunk-exfmq47h.js:776051-776159 placement
/**
 * 判断遮盖 id 的加载是否已完成或暂不需要（无盘、已加载或在重试冷却中）。
 */
function isMaskHydrationSettled(now = Date.now()) {
  let providerState = getProviderState();
  return (
    isDiskless() || providerState.servedCatalogMaskHydrated || now < providerState.servedCatalogMaskRetryAt
  );
}
//@ chunk-exfmq47h.js:776159-776232 layout
function isMaskIdListKnown() {
  return isDiskless() || getProviderState().servedCatalogPersistedMaskedIds !== undefined;
}
//@ chunk-exfmq47h.js:776232-776731 placement
/**
 * 加载持久化的遮盖 id。
 */
function hydrateMaskedIds() {
  let providerState = getProviderState();
  if (isDiskless() && !providerState.servedCatalogMaskHydrated) {
    providerState.servedCatalogPersistedMaskedIds = [];
    providerState.servedCatalogMaskHydrated = true;
  }
  if (providerState.servedCatalogMaskHydrated || Date.now() < providerState.servedCatalogMaskRetryAt)
    return Promise.resolve();
  providerState.servedCatalogMaskHydration ??= hydrateMaskedIds_2()
    .catch((error) => {
      logForDebugging(
        `[servedCatalog] mask hydration failed: ${error instanceof Error ? error.name : "unknown"}`,
        {
          level: "error",
        },
      );
      getProviderState().servedCatalogMaskHydrated = true;
    })
    .finally(() => {
      getProviderState().servedCatalogMaskHydration = undefined;
    });
  return providerState.servedCatalogMaskHydration;
}
//@ chunk-exfmq47h.js:776731-776932 placement
async function hydrateMaskedIds_2() {
  let providerState = getProviderState();
  let maskedIdsFile = await readMaskedIdsFile();
  if (maskedIdsFile.status === "unreadable") {
    providerState.servedCatalogMaskRetryAt = Date.now() + MASK_RETRY_DELAY_MS;
    return;
  }
  addMaskedModelIds(maskedIdsFile.ids);
  providerState.servedCatalogPersistedMaskedIds = maskedIdsFile.ids;
  providerState.servedCatalogMaskHydrated = true;
}
//@ chunk-exfmq47h.js:776932-777574 placement
/**
 * 读取 masked-ids.json（大小上限）。
 */
async function readMaskedIdsFile() {
  let raw;
  try {
    raw = await maskStorage().readRange(maskedIdsPath(), 0, MAX_MASKED_IDS_FILE_BYTES + 1);
  } catch (error) {
    if (isENOENT(error))
      return {
        status: "ok",
        ids: [],
      };
    logForDebugging(`[servedCatalog] mask file read failed: ${getErrnoCode(error) ?? "unknown"}`);
    return {
      status: "unreadable",
    };
  }
  if (raw.length > MAX_MASKED_IDS_FILE_BYTES) {
    logForDebugging("[servedCatalog] mask file oversized; not in this format");
    return {
      status: "foreign",
      ids: [],
      bytes: undefined,
    };
  }
  let parsedJson = safeParseJSON(raw.toString("utf8"), false);
  let parsed = maskedIdsSchema().safeParse(parsedJson);
  if (parsed.success)
    return {
      status: "ok",
      ids: sanitizeMaskedIds(parsed.data.ids),
    };
  let fallbackIds =
    parsedJson !== null &&
    typeof parsedJson === "object" &&
    !Array.isArray(parsedJson) &&
    Array.isArray(parsedJson.ids)
      ? sanitizeMaskedIds(parsedJson.ids)
      : [];
  logForDebugging(`[servedCatalog] mask file not in this format; keeping ${fallbackIds.length} ids it names`);
  return {
    status: "foreign",
    ids: fallbackIds,
    bytes: raw,
  };
}
//@ chunk-exfmq47h.js:777574-777828 placement
function sanitizeMaskedIds(ids) {
  let sliced = normalizeCaseForComparison_2(
    ids.filter((id) => typeof id === "string" && MASKED_ID_RE.test(id) && !isMaskFreeModelId(id)),
  ).slice(0, MASKED_IDS_JSON);
  if (sliced.length < ids.length)
    logForDebugging(
      `[servedCatalog] mask file: ${ids.length - sliced.length} entries are not ids (or repeat one, or name a family this build ships), dropped`,
    );
  return sliced;
}
//@ chunk-exfmq47h.js:777828-778344 placement
/**
 * 增加遮盖 id 并持久化。
 */
function addMaskedIds(maskedIdSet) {
  let toPersist = normalizeCaseForComparison_2(
    [...maskedIdSet].map(normalizeModelId).filter((id) => id.length > 0 && !isMaskFreeModelId(id)),
  );
  if (toPersist.length === 0) return Promise.resolve();
  addMaskedModelIds(toPersist);
  if (isDiskless()) return Promise.resolve();
  let sliced = toPersist.filter((id) => MASKED_ID_RE.test(id)).slice(0, MAX_MASKED_TOOL_NAMES);
  if (sliced.length < toPersist.length)
    logForDebugging(
      `[servedCatalog] ${toPersist.length - sliced.length} confidential ids masked this session but not persisted (outside the id charset or over the per-entry cap)`,
    );
  if (sliced.length === 0) return Promise.resolve();
  let providerState = getProviderState();
  let pending = (providerState.servedCatalogMaskWrite ?? Promise.resolve()).then(() =>
    persistMaskedIds(sliced),
  );
  providerState.servedCatalogMaskWrite = pending;
  return pending;
}
//@ chunk-exfmq47h.js:778344-779215 placement
/**
 * 写回遮盖 id 文件。
 */
async function persistMaskedIds(ids) {
  try {
    await hydrateMaskedIds();
    let providerState = getProviderState();
    let servedCatalogPersistedMaskedIds = providerState.servedCatalogPersistedMaskedIds;
    if (servedCatalogPersistedMaskedIds === undefined) {
      logForDebugging("[servedCatalog] mask file unreadable; not rewriting it this session");
      return;
    }
    if (ids.every((id) => servedCatalogPersistedMaskedIds.includes(id))) return;
    let previousIds = servedCatalogPersistedMaskedIds;
    let storage = maskStorage();
    for (let j = 0; j < MAX_UNPARSEABLE_WRITES; j++) {
      let maskedIdsFile = await readMaskedIdsFile();
      if (maskedIdsFile.status === "unreadable") {
        logForDebugging("[servedCatalog] mask file unreadable at write time; not rewriting it");
        return;
      }
      addMaskedModelIds(maskedIdsFile.ids);
      if (maskedIdsFile.status === "foreign") await preserveUnparsableMaskFile(maskedIdsFile.bytes);
      let sliced = normalizeCaseForComparison_2([...ids, ...maskedIdsFile.ids, ...previousIds]).slice(
        0,
        MASKED_IDS_JSON,
      );
      await storage.mkdir(modelCatalogCacheDir());
      await storage.atomicWrite(
        maskedIdsPath(),
        jsonStringify({
          version: MASKED_IDS_VERSION,
          ids: sliced,
        }),
        384,
      );
      let maskedIdsFile_2 = await readMaskedIdsFile();
      if (maskedIdsFile_2.status !== "ok") {
        providerState.servedCatalogPersistedMaskedIds = sliced;
        return;
      }
      addMaskedModelIds(maskedIdsFile_2.ids);
      providerState.servedCatalogPersistedMaskedIds = maskedIdsFile_2.ids;
      if (sliced.every((id) => maskedIdsFile_2.ids.includes(id))) return;
      previousIds = maskedIdsFile_2.ids;
      logForDebugging("[servedCatalog] mask file changed under the write; merging again");
    }
  } catch (error) {
    logForDebugging(`[servedCatalog] mask file write failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
//@ chunk-exfmq47h.js:779215-779538 placement
/**
 * 保存无法解析的遮盖文件副本。
 */
async function preserveUnparsableMaskFile(bytes) {
  if (bytes === undefined) {
    logForDebugging("[servedCatalog] oversized mask file replaced without a copy");
    return;
  }
  try {
    await maskStorage().atomicWrite(maskedIdsUnparseablePath(), bytes.toString("utf8"), 384);
    logForDebugging(
      `[servedCatalog] mask file not in this format; copied to ${MASKED_IDS_UNPARSEABLE_JSON} and replaced`,
    );
  } catch (error) {
    logForDebugging(`[servedCatalog] mask file quarantine failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
export {
  KNOWN_FILE_EXTENSIONS,
  hashToolNames,
  hydrateMaskedIds,
  sanitizeToolNameForTelemetry,
  modelCatalogCacheDir,
  MASKED_IDS_JSON_2,
  maskStorage,
  isMaskIdListKnown,
  hashEntries,
  hashOrRedactUrl,
  addMaskedIds,
  isMaskHydrationSettled,
};
