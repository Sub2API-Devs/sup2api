/**
 * screens/repl/commandDialogLoaders.ts
 *
 * 2.1.316 新增。命令对话框懒加载。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */

//@ chunk-18hwfzwa.js:37274-40586 placement
/**
 * 斜杠命令到懒加载 chunk 的映射表，命令对话框打开时按需 import。
 */
var COMMAND_DIALOG_LOADERS = {
  "add-dir": () => import("./chunk-x4gf1bcz.js"),
  advisor: () => import("./chunk-tx2s9zpa.js"),
  artifacts: () => import("./chunk-qr2y97px.js"),
  "auto-mode-setup": () => import("./chunk-m8444q1d.js"),
  autocompact: () => import("./chunk-qqj12s77.js"),
  "autofix-pr": () => import("./chunk-4pdevvfa.js"),
  btw: () => import("./chunk-583vs41k.js"),
  bug: () => import("./chunk-myrezy36.js"),
  cd: () => import("./chunk-fh3th4b7.js"),
  chrome: () => import("./chunk-1ztfztfw.js"),
  "cloud-plugins": () => import("./chunk-n30mmv2p.js"),
  config: () => import("./chunk-ak1qv1dp.js"),
  context: () => import("./chunk-10q8r8ck.js"),
  copy: () => import("./chunk-0knprqgt.js"),
  "design-login": () => import("./chunk-zkzpd9ky.js"),
  desktop: () => import("./chunk-ds2d8kad.js"),
  diff: () => import("./chunk-19av2vh6.js"),
  effort: () => import("./chunk-3rwvzn82.js"),
  exit: () => import("./chunk-xs5f70ym.js"),
  export: () => import("./chunk-am3vy82s.js"),
  "extra-usage": () => import("./chunk-139kcwcq.js"),
  fast: () => import("./chunk-sfatdaes.js"),
  feedback: () => import("./chunk-dnxbqwmv.js"),
  fork: () => import("./chunk-d62reftv.js"),
  goal: () => import("./chunk-hgfnw8bk.js"),
  help: () => import("./chunk-yxcx2jtr.js"),
  hooks: () => import("./chunk-bajxb7bf.js"),
  ide: () => import("./chunk-5bdzenzx.js"),
  import: () => import("./chunk-cdgppz20.js"),
  "install-github-app": () => import("./chunk-4v9zy7gn.js"),
  "limit-reset": () => import("./chunk-q8p98373.js"),
  login: () => import("./chunk-whwtfsqf.js"),
  logout: () => import("./chunk-tndsj50r.js"),
  loops: () => import("./chunk-wtfk012h.js"),
  mcp: () => import("./chunk-cpqpnzp4.js"),
  memory: () => import("./chunk-c55mbvfz.js"),
  mobile: () => import("./chunk-7mtn3rbz.js"),
  model: () => import("./chunk-mvhmq2z8.js"),
  "output-style": () => import("./chunk-q8cyy466.js"),
  passes: () => import("./chunk-aa3cndeh.js"),
  permissions: () => import("./chunk-p2qwpk2k.js"),
  plan: () => import("./chunk-ve85yyeb.js"),
  plugin: () => import("./chunk-qey4tpm4.js"),
  powerup: () => import("./chunk-fxpvgzqn.js"),
  "privacy-settings": () => import("./chunk-p3x5wbde.js"),
  "pro-trial-expired": () => import("./chunk-fnmk6x3n.js"),
  "rate-limit-options": () => import("./chunk-dg94x42s.js"),
  "release-notes": () => import("./chunk-8k62p17d.js"),
  "remote-control": () => import("./chunk-k7ve8htw.js"),
  "remote-env": () => import("./chunk-zj31az9x.js"),
  resume: () => import("./chunk-74n7apcd.js"),
  sandbox: () => import("./chunk-55w3ydvj.js"),
  "scroll-speed": () => import("./chunk-myhtjy4v.js"),
  session: () => import("./chunk-3rb87ry3.js"),
  "setup-bedrock": () => import("./chunk-vt5kkj4e.js"),
  "setup-vertex": () => import("./chunk-8nayjra0.js"),
  "skill-doctor": () => import("./chunk-ej3ckp70.js"),
  skills: () => import("./chunk-00qhwn8e.js"),
  status: () => import("./chunk-gwbvvmmk.js"),
  tasks: () => import("./chunk-pw933apk.js"),
  teleport: () => import("./chunk-c2tx3syd.js"),
  "terminal-setup": () => import("./chunk-y6vqt8tm.js"),
  theme: () => import("./chunk-3s4dbk22.js"),
  tui: () => import("./chunk-wdq8e3yt.js"),
  ultrareview: () => import("./chunk-0eepcc6r.js"),
  upgrade: () => import("./chunk-txp87wj5.js"),
  usage: () => import("./chunk-b8fqh6y9.js"),
  "usage-credits": () => import("./chunk-2gtphf4m.js"),
  vim: () => import("./chunk-q8cyy466.js"),
  "web-setup": () => import("./chunk-ajkmgejw.js"),
  wellbeing: () => import("./chunk-a7sxm3q7.js"),
  ...false,
  ...{},
  ...{},
  ...{},
  ...{
    background: () => import("./chunk-7c7hjd56.js"),
    daemon: () => import("./chunk-b7gstm5r.js"),
    stop: () => import("./chunk-t85zxbmt.js"),
  },
  ...{},
  workflows: () => import("./chunk-wnym76ss.js"),
  ...{},
};
//@ chunk-18hwfzwa.js:40586-40620 placement
var COMMAND_DIALOG_NAMES = new Set(Object.keys(COMMAND_DIALOG_LOADERS));
export { COMMAND_DIALOG_LOADERS };
