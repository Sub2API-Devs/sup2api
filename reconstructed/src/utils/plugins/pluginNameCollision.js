/**
 * utils/plugins/pluginNameCollision.ts
 *
 * 2.1.316 新增：插件名冲突
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { quotedPrintable, printableLabel, printableName } from "../printableName.js";
import { describeNameCollision } from "./crossMarketplaceInstall.js";
import { marketplaceSuffix } from "./pluginIdentifier.js";
import { getOriginalCwdOrNull } from "../../bootstrap/state.js";
import { count, uniq } from "../collections.js";
import { runCommandHint } from "../worktreeResumeHint.js";

/**
 * 查找名字冲突的插件（忽略大小写，@ 与 . 视为 -）。
 */
//@ chunk-e6aww6q8.js:4432956-4436041 placement
function findPluginNameCollision(e) {
  let { refused: refused, askedFor: askedFor, surface: surface, rootKept: rootKept = !1 } = e,
    y = e.sharedWith === "installed" ? e.holders : [],
    S = e.sharedWith === "installed" ? y : [{ id: e.twin, shares: e.shares }],
    w = (At) => `"${quotedPrintable(At, 200)}"`,
    mapped = S.map((At) => describeNameCollision(At.id, refused, At.shares)),
    any = mapped.some((At) => At.capitals),
    q = mapped.some((At) => At.punctuation) ? '"." and "-"' : "",
    Z = `because ${S.length > 1 ? "their" : "the two"} ids ${mapped.some((At) => At.atSign) ? `are the same once "@" and "." are written as "-"${any ? " and capitals are ignored" : ""}` : any || q !== "" ? `differ only in ${any ? `capitals${q === "" ? "" : ", "}` : ""}${q}` : "give one folder name"}`,
    Se = S.every((At) => At.shares === "folder")
      ? "its folder"
      : S.every((At) => At.shares === "data")
        ? "its saved data"
        : "its folder or its saved data",
    ke = refused !== askedFor && (rootKept || y.some((At) => At.id === askedFor)),
    we = ke
      ? `${w(refused)} was not installed: ${w(askedFor)} needs it, but it`
      : refused === askedFor
        ? `${w(refused)} was not installed: it`
        : `${w(askedFor)} was not installed: it needs ${w(refused)}, which`,
    Ee = ke ? ` ${w(askedFor)} will not load without it.` : "";
  if (e.sharedWith === "same-install" || y.some((At) => At.id === askedFor)) {
    let At = e.sharedWith === "same-install" ? e.twin : askedFor,
      It =
        marketplaceSuffix(At) === marketplaceSuffix(refused)
          ? "Only the marketplace's maintainer can fix this, by renaming one of them."
          : "Only a maintainer of one of the two marketplaces can fix this, by renaming one of them.";
    return `${we} would share ${Se} with ${w(At)}${At === askedFor ? "" : ", which the same install brings along"}, ${Z}.${Ee} ${It}`;
  }
  let flattened = y.flatMap((At) => At.installations.map((installation) => ({ id: At.id, ...installation }))),
    Ie = (At) => At.scope === "project" || At.scope === "local",
    Me = flattened.some(Ie) ? getOriginalCwdOrNull() : null,
    We = (At) => Ie(At) && (At.projectPath === void 0 || At.projectPath !== Me),
    ze = count(flattened, (At) => At.scope === "managed"),
    lt = y.length > 1 ? "are" : "is",
    Je =
      ze > 0 && ze === flattened.length
        ? "which your organization installed"
        : ze > 0
          ? `which ${lt} installed, also by your organization`
          : flattened.length > 0 && flattened.every(We)
            ? `which ${lt} installed in ${uniq(flattened.map((At) => At.projectPath)).length > 1 ? "other projects" : "another project"}`
            : `which ${lt} installed`,
    format = new Intl.ListFormat("en", { type: "conjunction" }).format(y.map((At) => w(At.id))),
    pt = `${we} would share ${Se} with ${format}, ${Je}, ${Z}.${Ee}${y.length > 1 ? "" : " Only one of the two can be installed."}`;
  if (ze > 0 || flattened.length === 0)
    return surface === "notice" && ze > 0
      ? `Ask your administrator: ${pt}`
      : `${pt}${ze > 0 ? " Ask your administrator." : ""}`;
  let Et = uniq(
      flattened.map((At) => {
        let It = `uninstall ${w(At.id)}`;
        if (We(At) && At.projectPath === void 0) return `${It} in the project it is installed for`;
        let Yt =
            surface === "cli"
              ? runCommandHint("plugin uninstall", At.id, {
                  extra: At.scope === "user" ? void 0 : `--scope ${At.scope}`,
                  fallback: It,
                })
              : `${It}${At.scope === "user" || We(At) ? "" : ` at ${At.scope} scope`}${surface === "notice" && !We(At) ? " in /plugin" : ""}`,
          qt = We(At) ? printableLabel(printableName(At.projectPath ?? "", 200)) : "";
        return We(At) ? `${Yt} in ${qt === "" ? "that project" : qt}` : Yt;
      }),
    ),
    yt = refused === askedFor ? `${w(refused)} instead` : ke ? `${w(refused)} as well` : w(askedFor),
    gt =
      surface === "cli"
        ? "Uninstalling a plugin also deletes its saved data."
        : `${surface === "ui" ? "When it asks" : "If /plugin asks"}, let it delete the plugin's saved data: the new plugin would otherwise start with it.`;
  return surface === "notice"
    ? `First ${Et.join("; ")}, to install ${yt}. ${gt} ${pt}`
    : `${pt} To install ${yt}, first ${Et.length > 1 ? `do each of these: ${Et.join("; ")}` : Et[0]}. ${gt}`;
}

export { findPluginNameCollision };
