/**
 * utils/verbInflection.ts
 *
 * 2.1.316 新增：英文动词变形（进行时/过去式），用于状态文案。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sddr5zxg.js (11)
 * attribution: placement 11
 */

/**
 * 动词变形用的正则与词表：元音、辅音-元音-辅音结尾、不规则过去式、双写辅音的进行时、已是过去/完成形式的词。
 */
//@ chunk-sddr5zxg.js:191-2050 placement
var VOWEL_REGEX = /[aeiou]/i,
  CVC_ENDING_REGEX = /[^aeiou][aeiou][bcdfghjklmnpqrstvz]$/i,
  IRREGULAR_PAST = {
    begin: "began",
    bind: "bound",
    bring: "brought",
    build: "built",
    buy: "bought",
    catch: "caught",
    choose: "chose",
    come: "came",
    cut: "cut",
    debug: "debugged",
    dig: "dug",
    do: "did",
    draw: "drew",
    feed: "fed",
    feel: "felt",
    fight: "fought",
    find: "found",
    fly: "flew",
    forget: "forgot",
    freeze: "froze",
    get: "got",
    give: "gave",
    go: "went",
    have: "had",
    hide: "hid",
    hit: "hit",
    hold: "held",
    input: "input",
    keep: "kept",
    know: "knew",
    lead: "led",
    leave: "left",
    let: "let",
    lose: "lost",
    make: "made",
    mean: "meant",
    meet: "met",
    override: "overrode",
    overwrite: "overwrote",
    pay: "paid",
    put: "put",
    quit: "quit",
    read: "read",
    rebuild: "rebuilt",
    redo: "redid",
    rerun: "reran",
    reset: "reset",
    rewrite: "rewrote",
    run: "ran",
    see: "saw",
    seek: "sought",
    send: "sent",
    set: "set",
    show: "showed",
    shut: "shut",
    sit: "sat",
    sleep: "slept",
    spend: "spent",
    spin: "spun",
    split: "split",
    spread: "spread",
    stand: "stood",
    sweep: "swept",
    sync: "synced",
    take: "took",
    teach: "taught",
    tear: "tore",
    tell: "told",
    think: "thought",
    throw: "threw",
    understand: "understood",
    undo: "undid",
    unset: "unset",
    win: "won",
    unwrap: "unwrapped",
    unzip: "unzipped",
    write: "wrote",
  },
  DOUBLED_PROGRESSIVE = {
    begin: "beginning",
    commit: "committing",
    control: "controlling",
    debug: "debugging",
    emit: "emitting",
    equip: "equipping",
    forget: "forgetting",
    format: "formatting",
    input: "inputting",
    occur: "occurring",
    omit: "omitting",
    output: "outputting",
    permit: "permitting",
    prefer: "preferring",
    quit: "quitting",
    refer: "referring",
    rerun: "rerunning",
    reset: "resetting",
    screenshot: "screenshotting",
    snapshot: "snapshotting",
    submit: "submitting",
    sync: "syncing",
    transfer: "transferring",
    unset: "unsetting",
    unwrap: "unwrapping",
    unzip: "unzipping",
  },
  PAST_FORMS = new Set([
    ...Object.entries(IRREGULAR_PAST)
      .filter(([e, t]) => e !== t)
      .map(([, e]) => e),
    "been",
    "broken",
    "chosen",
    "done",
    "drawn",
    "driven",
    "eaten",
    "fallen",
    "forgotten",
    "given",
    "gone",
    "grown",
    "hidden",
    "known",
    "ridden",
    "risen",
    "seen",
    "shown",
    "spoken",
    "taken",
    "thrown",
    "torn",
    "worn",
    "written",
  ]);
//@ chunk-sddr5zxg.js:2050-2104 placement
function C(e) {
  return (e.match(/[aeiou]/gi) ?? []).length;
}
//@ chunk-sddr5zxg.js:2104-2368 placement
function toProgressive(e) {
  let lower = e.toLowerCase();
  if (Object.hasOwn(DOUBLED_PROGRESSIVE, lower)) return DOUBLED_PROGRESSIVE[lower];
  if (/ie$/i.test(e)) return e.slice(0, -2) + "ying";
  if (/[^eoy]e$/i.test(e)) return e.slice(0, -1) + "ing";
  if (CVC_ENDING_REGEX.test(e) && C(e) === 1) return e + e.slice(-1) + "ing";
  if (/c$/i.test(e)) return e + "king";
  return e + "ing";
}
//@ chunk-sddr5zxg.js:2368-2666 placement
function toPastTense(e) {
  let lower = e.toLowerCase();
  if (Object.hasOwn(IRREGULAR_PAST, lower)) return IRREGULAR_PAST[lower];
  if (/e$/i.test(e)) return e + "d";
  if (/[^aeiou]y$/i.test(e)) return e.slice(0, -1) + "ied";
  if (CVC_ENDING_REGEX.test(e) && C(e) === 1) return e + e.slice(-1) + "ed";
  if (/c$/i.test(e)) return e + "ked";
  if (Object.hasOwn(DOUBLED_PROGRESSIVE, lower)) return DOUBLED_PROGRESSIVE[lower].slice(0, -3) + "ed";
  return e + "ed";
}
//@ chunk-sddr5zxg.js:2666-2744 placement = capitalize (1)
function capitalize(e, t) {
  return /^[A-Z]/.test(e) ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
/**
 * 判断单词像不像动词原形（字母、长度、不是全大写、不是 -ing/-ed/-s 形式或已知过去式）。
 */
//@ chunk-sddr5zxg.js:2744-3123 placement
function looksLikeBaseVerb(e) {
  if (e.length < 2 || e.length > 16) return !1;
  if (!/^[A-Za-z]+$/.test(e)) return !1;
  if (e === e.toUpperCase()) return !1;
  let lower = e.toLowerCase();
  if (PAST_FORMS.has(lower)) return !1;
  if (Object.hasOwn(IRREGULAR_PAST, lower)) return !0;
  if (/ing$/i.test(e) && e.length > 4) return !1;
  if (/ed$/i.test(e) && !/eed$/i.test(e) && e.length > 3) return !1;
  if (/s$/i.test(e) && !/(ss|us)$/i.test(e) && e.length > 3) return !1;
  return VOWEL_REGEX.test(e) || /y/i.test(e);
}
/**
 * 动词串联变形用的词表与正则：不参与串联的动词、可串联的常见动词、"and/then/逗号 + 动词"的匹配与后面接系动词时不变形的判断。
 */
//@ chunk-sddr5zxg.js:3123-5321 placement
var NO_CHAIN_VERBS = new Set([
    "output",
    "input",
    "lead",
    "feed",
    "spread",
    "set",
    "cut",
    "split",
    "hit",
    "let",
    "put",
    "quit",
    "shut",
    "read",
    "go",
    "make",
    "dig",
    "tear",
    "win",
    "fly",
    "spin",
    "control",
    "permit",
    "have",
    "hold",
    "keep",
    "mean",
    "feel",
    "do",
    "see",
    "know",
    "think",
    "understand",
  ]),
  CHAINABLE_VERBS = new Set([
    ...Object.keys(IRREGULAR_PAST).filter((e) => !NO_CHAIN_VERBS.has(e)),
    ...Object.keys(DOUBLED_PROGRESSIVE).filter((e) => !NO_CHAIN_VERBS.has(e)),
    "add",
    "analyze",
    "append",
    "apply",
    "archive",
    "assert",
    "attempt",
    "autofix",
    "await",
    "benchmark",
    "bisect",
    "call",
    "capture",
    "check",
    "clone",
    "collect",
    "compare",
    "compile",
    "compute",
    "confirm",
    "connect",
    "convert",
    "copy",
    "count",
    "create",
    "curl",
    "decode",
    "delete",
    "deploy",
    "detect",
    "discard",
    "dismiss",
    "display",
    "download",
    "dump",
    "edit",
    "emit",
    "enable",
    "encode",
    "ensure",
    "enumerate",
    "evaluate",
    "execute",
    "expand",
    "expect",
    "export",
    "extract",
    "fetch",
    "fill",
    "filter",
    "fix",
    "flush",
    "focus",
    "follow",
    "generate",
    "grep",
    "identify",
    "ignore",
    "import",
    "include",
    "inject",
    "insert",
    "inspect",
    "install",
    "invoke",
    "kill",
    "launch",
    "lint",
    "list",
    "load",
    "locate",
    "loop",
    "measure",
    "merge",
    "monitor",
    "move",
    "navigate",
    "normalize",
    "parse",
    "patch",
    "pick",
    "ping",
    "pipe",
    "poll",
    "post",
    "prepare",
    "preview",
    "print",
    "probe",
    "profile",
    "prune",
    "publish",
    "pull",
    "push",
    "queue",
    "rebase",
    "recheck",
    "record",
    "recover",
    "redirect",
    "reduce",
    "refresh",
    "regenerate",
    "reinstall",
    "relaunch",
    "reload",
    "remove",
    "rename",
    "render",
    "reopen",
    "repeat",
    "replay",
    "reply",
    "report",
    "request",
    "resolve",
    "restart",
    "restore",
    "retry",
    "revert",
    "save",
    "scan",
    "screenshot",
    "scroll",
    "search",
    "select",
    "serialize",
    "serve",
    "settle",
    "skip",
    "snapshot",
    "sort",
    "spawn",
    "squash",
    "stage",
    "start",
    "stash",
    "stop",
    "strip",
    "summarize",
    "switch",
    "sync",
    "tail",
    "tally",
    "test",
    "toggle",
    "touch",
    "trace",
    "track",
    "trigger",
    "trim",
    "truncate",
    "try",
    "typecheck",
    "unblock",
    "uninstall",
    "unlink",
    "unmount",
    "unpack",
    "update",
    "upgrade",
    "upload",
    "validate",
    "verify",
    "visit",
    "wait",
    "walk",
    "warn",
    "wipe",
  ]),
  VERB_CHAIN_REGEX =
    /(?:(?<![\w-])((?:(?:[Aa]nd|[Tt]hen)\s+)+)|(,\s+(?:(?:and|then)\s+)*))([a-z]{2,16})(?=$|[\s,;!?]|\.(?:\s|$))/g,
  NOT_IMPERATIVE_FOLLOW_REGEX =
    /^(?:\s+\w+){0,2}\s+(?:is|are|was|were|has|have|do|does|did|will|would|should|can|could|passes|passed|fails|failed|exists|works|worked|succeeds|succeeded|stays|remains|looks|runs|ran|not|if|when|unless|whether)(?:n['\u2019]t)?\b/;
//@ chunk-sddr5zxg.js:5321-5427 placement
function inflectChainedVerbs(e, t) {
  return e.replace(VERB_CHAIN_REGEX, (n, u, i, r, s) =>
    CHAINABLE_VERBS.has(r) && !NOT_IMPERATIVE_FOLLOW_REGEX.test(e.slice(s + n.length))
      ? (u ?? i ?? "") + t(r)
      : n,
  );
}
//@ chunk-sddr5zxg.js:5427-5488 placement
var L = /^(re|un|de|pre|co|sub|over|out|mis|auto|post)-(.+)$/i;
/**
 * 把以祈使动词开头的状态文案变形为进行时与完成时（含 re-/un- 等连字符前缀、以 and/then/逗号串联的后续动词），返回 running/done/infinitive 三种形式；首词不像基础动词时返回 undefined。
 */
//@ chunk-sddr5zxg.js:5488-6028 placement
function inflectStatusText(text) {
  let trimmed = text.trimStart(),
    leading = text.slice(0, text.length - trimmed.length),
    match = /^(\S+)([\s\S]*)$/.exec(trimmed);
  if (!match) return;
  let verb = match[1],
    rest = match[2] ?? "",
    prefixed = L.exec(verb);
  if (prefixed && prefixed[2] !== void 0 && looksLikeBaseVerb(prefixed[2])) {
    let p = prefixed[1],
      c = prefixed[2],
      lower = (p + c).toLowerCase(),
      lower_2 = c.toLowerCase();
    if (PAST_FORMS.has(lower) || PAST_FORMS.has(lower_2)) return;
    let m = (k, j) => p + "-" + capitalize(c, Object.hasOwn(k, lower) ? k[lower].slice(p.length) : j(c));
    return {
      running: leading + m(DOUBLED_PROGRESSIVE, toProgressive) + inflectChainedVerbs(rest, toProgressive),
      done: leading + m(IRREGULAR_PAST, toPastTense) + inflectChainedVerbs(rest, toPastTense),
      infinitive: leading + verb.toLowerCase() + rest,
    };
  }
  if (!looksLikeBaseVerb(verb)) return;
  return {
    running: leading + capitalize(verb, toProgressive(verb)) + inflectChainedVerbs(rest, toProgressive),
    done: leading + capitalize(verb, toPastTense(verb)) + inflectChainedVerbs(rest, toPastTense),
    infinitive: leading + verb.charAt(0).toLowerCase() + verb.slice(1) + rest,
  };
}
/**
 * 仅当首词是已知动词时，把状态文案变形为进行时与完成时。
 */
//@ chunk-sddr5zxg.js:6028-6206 placement
function inflectKnownVerbText(e) {
  let t = /^\s*(\S+)/.exec(e)?.[1];
  if (t === void 0) return;
  let lower = (L.exec(t)?.[2] ?? t).toLowerCase();
  return CHAINABLE_VERBS.has(lower) ||
    Object.hasOwn(IRREGULAR_PAST, lower) ||
    Object.hasOwn(DOUBLED_PROGRESSIVE, lower)
    ? inflectStatusText(e)
    : void 0;
}

export { inflectStatusText, inflectKnownVerbText };
