/**
 * utils/cliHighlightLanguages.ts
 *
 * 2.1.316 新增：CLI 语法高亮语言表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-egr0twnb.js (5)
 * attribution: placement 5
 */
import { je } from "../../vendor/highlight.js/lib/languages/abnf.js";
import { tt } from "../../vendor/highlight.js/lib/languages/accesslog.js";
import { at } from "../../vendor/highlight.js/lib/languages/actionscript.js";
import { it } from "../../vendor/highlight.js/lib/languages/ada.js";
import { ot } from "../../vendor/highlight.js/lib/languages/angelscript.js";
import { lt } from "../../vendor/highlight.js/lib/languages/apache.js";
import { pt } from "../../vendor/highlight.js/lib/languages/applescript.js";
import { _t } from "../../vendor/highlight.js/lib/languages/arcade.js";
import { Et } from "../../vendor/highlight.js/lib/languages/arduino.js";
import { bt } from "../../vendor/highlight.js/lib/languages/armasm.js";
import { Tt } from "../../vendor/highlight.js/lib/languages/asciidoc.js";
import { St } from "../../vendor/highlight.js/lib/languages/aspectj.js";
import { Rt } from "../../vendor/highlight.js/lib/languages/autohotkey.js";
import { vt } from "../../vendor/highlight.js/lib/languages/autoit.js";
import { Ct } from "../../vendor/highlight.js/lib/languages/avrasm.js";
import { ht } from "../../vendor/highlight.js/lib/languages/awk.js";
import { Dt } from "../../vendor/highlight.js/lib/languages/axapta.js";
import { wt } from "../../vendor/highlight.js/lib/languages/bash.js";
import { kt } from "../../vendor/highlight.js/lib/languages/basic.js";
import { Ut } from "../../vendor/highlight.js/lib/languages/bnf.js";
import { Gt } from "../../vendor/highlight.js/lib/languages/brainfuck.js";
import { qt } from "../../vendor/highlight.js/lib/languages/c.js";
import { $t } from "../../vendor/highlight.js/lib/languages/cal.js";
import { Kt } from "../../vendor/highlight.js/lib/languages/capnproto.js";
import { Wt } from "../../vendor/highlight.js/lib/languages/ceylon.js";
import { Xt } from "../../vendor/highlight.js/lib/languages/clean.js";
import { Qt } from "../../vendor/highlight.js/lib/languages/clojure.js";
import { jt } from "../../vendor/highlight.js/lib/languages/clojure-repl.js";
import { tn } from "../../vendor/highlight.js/lib/languages/cmake.js";
import { an } from "../../vendor/highlight.js/lib/languages/coffeescript.js";
import { sn } from "../../vendor/highlight.js/lib/languages/coq.js";
import { cn } from "../../vendor/highlight.js/lib/languages/cos.js";
import { dn } from "../../vendor/highlight.js/lib/languages/cpp.js";
import { mn } from "../../vendor/highlight.js/lib/languages/crmsh.js";
import { un } from "../../vendor/highlight.js/lib/languages/crystal.js";
import { gn } from "../../vendor/highlight.js/lib/languages/csharp.js";
import { fn } from "../../vendor/highlight.js/lib/languages/csp.js";
import { Nn } from "../../vendor/highlight.js/lib/languages/css.js";
import { An } from "../../vendor/highlight.js/lib/languages/d.js";
import { On } from "../../vendor/highlight.js/lib/languages/dart.js";
import { In } from "../../vendor/highlight.js/lib/languages/delphi.js";
import { yn } from "../../vendor/highlight.js/lib/languages/diff.js";
import { Mn } from "../../vendor/highlight.js/lib/languages/django.js";
import { Ln } from "../../vendor/highlight.js/lib/languages/dns.js";
import { xn } from "../../vendor/highlight.js/lib/languages/dockerfile.js";
import { Pn } from "../../vendor/highlight.js/lib/languages/dos.js";
import { Bn } from "../../vendor/highlight.js/lib/languages/dsconfig.js";
import { Fn } from "../../vendor/highlight.js/lib/languages/dts.js";
import { Hn } from "../../vendor/highlight.js/lib/languages/dust.js";
import { zn } from "../../vendor/highlight.js/lib/languages/ebnf.js";
import { Vn } from "../../vendor/highlight.js/lib/languages/elixir.js";
import { Yn } from "../../vendor/highlight.js/lib/languages/elm.js";
import { Zn } from "../../vendor/highlight.js/lib/languages/erb.js";
import { Jn } from "../../vendor/highlight.js/lib/languages/erlang.js";
import { ea } from "../../vendor/highlight.js/lib/languages/erlang-repl.js";
import { na } from "../../vendor/highlight.js/lib/languages/excel.js";
import { ra } from "../../vendor/highlight.js/lib/languages/fix.js";
import { sa, Sa } from "../../vendor/highlight.js/lib/languages/flix.js";
import { ca } from "../../vendor/highlight.js/lib/languages/fortran.js";
import { pa } from "../../vendor/highlight.js/lib/languages/fsharp.js";
import { _a } from "../../vendor/highlight.js/lib/languages/gams.js";
import { Ea } from "../../vendor/highlight.js/lib/languages/gauss.js";
import { ba } from "../../vendor/highlight.js/lib/languages/gcode.js";
import { Ta } from "../../vendor/highlight.js/lib/languages/gherkin.js";
import { Ra } from "../../vendor/highlight.js/lib/languages/go.js";
import { va } from "../../vendor/highlight.js/lib/languages/golo.js";
import { Ca } from "../../vendor/highlight.js/lib/languages/gradle.js";
import { ha } from "../../vendor/highlight.js/lib/languages/graphql.js";
import { Da } from "../../vendor/highlight.js/lib/languages/groovy.js";
import { wa } from "../../vendor/highlight.js/lib/languages/haml.js";
import { ka } from "../../vendor/highlight.js/lib/languages/handlebars.js";
import { Ua } from "../../vendor/highlight.js/lib/languages/haskell.js";
import { Ga } from "../../vendor/highlight.js/lib/languages/haxe.js";
import { qa } from "../../vendor/highlight.js/lib/languages/hsp.js";
import { $a } from "../../vendor/highlight.js/lib/languages/http.js";
import { Ka } from "../../vendor/highlight.js/lib/languages/hy.js";
import { Wa } from "../../vendor/highlight.js/lib/languages/inform7.js";
import { Xa } from "../../vendor/highlight.js/lib/languages/ini.js";
import { Qa } from "../../vendor/highlight.js/lib/languages/irpf90.js";
import { tr } from "../../vendor/highlight.js/lib/languages/java.js";
import { sr } from "../../vendor/highlight.js/lib/languages/javascript.js";
import { cr } from "../../vendor/highlight.js/lib/languages/jboss-cli.js";
import { dr, Yr, Ms } from "../../vendor/highlight.js/lib/languages/json.js";
import { mr } from "../../vendor/highlight.js/lib/languages/julia.js";
import { ur } from "../../vendor/highlight.js/lib/languages/julia-repl.js";
import { gr } from "../../vendor/highlight.js/lib/languages/kotlin.js";
import { fr } from "../../vendor/highlight.js/lib/languages/lasso.js";
import { Nr } from "../../vendor/highlight.js/lib/languages/latex.js";
import { Ar } from "../../vendor/highlight.js/lib/languages/ldif.js";
import { Or } from "../../vendor/highlight.js/lib/languages/leaf.js";
import { yr } from "../../vendor/highlight.js/lib/languages/less.js";
import { Mr } from "../../vendor/highlight.js/lib/languages/lisp.js";
import { Lr } from "../../vendor/highlight.js/lib/languages/livecodeserver.js";
import { xr } from "../../vendor/highlight.js/lib/languages/livescript.js";
import { Pr } from "../../vendor/highlight.js/lib/languages/llvm.js";
import { Br } from "../../vendor/highlight.js/lib/languages/lsl.js";
import { Fr } from "../../vendor/highlight.js/lib/languages/lua.js";
import { Hr } from "../../vendor/highlight.js/lib/languages/makefile.js";
import { zr } from "../../vendor/highlight.js/lib/languages/markdown.js";
import { Vr } from "../../vendor/highlight.js/lib/languages/matlab.js";
import { Zr } from "../../vendor/highlight.js/lib/languages/mercury.js";
import { Jr } from "../../vendor/highlight.js/lib/languages/mipsasm.js";
import { ei } from "../../vendor/highlight.js/lib/languages/mizar.js";
import { ni } from "../../vendor/highlight.js/lib/languages/mojolicious.js";
import { ri } from "../../vendor/highlight.js/lib/languages/monkey.js";
import { si } from "../../vendor/highlight.js/lib/languages/moonscript.js";
import { ci } from "../../vendor/highlight.js/lib/languages/n1ql.js";
import { di } from "../../vendor/highlight.js/lib/languages/nestedtext.js";
import { mi } from "../../vendor/highlight.js/lib/languages/nginx.js";
import { ui } from "../../vendor/highlight.js/lib/languages/nim.js";
import { gi } from "../../vendor/highlight.js/lib/languages/nix.js";
import { fi } from "../../vendor/highlight.js/lib/languages/node-repl.js";
import { Ni } from "../../vendor/highlight.js/lib/languages/nsis.js";
import { Ai } from "../../vendor/highlight.js/lib/languages/objectivec.js";
import { Oi } from "../../vendor/highlight.js/lib/languages/ocaml.js";
import { Ii } from "../../vendor/highlight.js/lib/languages/openscad.js";
import { yi } from "../../vendor/highlight.js/lib/languages/oxygene.js";
import { Mi } from "../../vendor/highlight.js/lib/languages/parser3.js";
import { Li } from "../../vendor/highlight.js/lib/languages/perl.js";
import { xi } from "../../vendor/highlight.js/lib/languages/pf.js";
import { Pi } from "../../vendor/highlight.js/lib/languages/pgsql.js";
import { Bi } from "../../vendor/highlight.js/lib/languages/php.js";
import { Fi } from "../../vendor/highlight.js/lib/languages/php-template.js";
import { Hi } from "../../vendor/highlight.js/lib/languages/plaintext.js";
import { zi } from "../../vendor/highlight.js/lib/languages/pony.js";
import { Vi } from "../../vendor/highlight.js/lib/languages/powershell.js";
import { Yi } from "../../vendor/highlight.js/lib/languages/processing.js";
import { Zi } from "../../vendor/highlight.js/lib/languages/profile.js";
import { Ji } from "../../vendor/highlight.js/lib/languages/prolog.js";
import { es } from "../../vendor/highlight.js/lib/languages/properties.js";
import { ns } from "../../vendor/highlight.js/lib/languages/protobuf.js";
import { rs } from "../../vendor/highlight.js/lib/languages/puppet.js";
import { ss } from "../../vendor/highlight.js/lib/languages/purebasic.js";
import { cs } from "../../vendor/highlight.js/lib/languages/python.js";
import { ds } from "../../vendor/highlight.js/lib/languages/python-repl.js";
import { ms } from "../../vendor/highlight.js/lib/languages/q.js";
import { us } from "../../vendor/highlight.js/lib/languages/qml.js";
import { gs } from "../../vendor/highlight.js/lib/languages/r.js";
import { fs } from "../../vendor/highlight.js/lib/languages/reasonml.js";
import { Ns } from "../../vendor/highlight.js/lib/languages/rib.js";
import { As } from "../../vendor/highlight.js/lib/languages/roboconf.js";
import { Os } from "../../vendor/highlight.js/lib/languages/routeros.js";
import { Is } from "../../vendor/highlight.js/lib/languages/rsl.js";
import { ys } from "../../vendor/highlight.js/lib/languages/ruby.js";
import { Ls } from "../../vendor/highlight.js/lib/languages/rust.js";
import { xs } from "../../vendor/highlight.js/lib/languages/sas.js";
import { Ps } from "../../vendor/highlight.js/lib/languages/scala.js";
import { Bs } from "../../vendor/highlight.js/lib/languages/scheme.js";
import { Fs } from "../../vendor/highlight.js/lib/languages/scilab.js";
import { Hs } from "../../vendor/highlight.js/lib/languages/scss.js";
import { zs } from "../../vendor/highlight.js/lib/languages/shell.js";
import { Vs } from "../../vendor/highlight.js/lib/languages/smali.js";
import { Ys } from "../../vendor/highlight.js/lib/languages/smalltalk.js";
import { Zs } from "../../vendor/highlight.js/lib/languages/sml.js";
import { Js } from "../../vendor/highlight.js/lib/languages/sql.js";
import { eo } from "../../vendor/highlight.js/lib/languages/stan.js";
import { no } from "../../vendor/highlight.js/lib/languages/stata.js";
import { ro } from "../../vendor/highlight.js/lib/languages/step21.js";
import { so } from "../../vendor/highlight.js/lib/languages/stylus.js";
import { co } from "../../vendor/highlight.js/lib/languages/subunit.js";
import { fo } from "../../vendor/highlight.js/lib/languages/swift.js";
import { No } from "../../vendor/highlight.js/lib/languages/taggerscript.js";
import { Ao } from "../../vendor/highlight.js/lib/languages/tap.js";
import { Oo } from "../../vendor/highlight.js/lib/languages/tcl.js";
import { Io } from "../../vendor/highlight.js/lib/languages/thrift.js";
import { yo } from "../../vendor/highlight.js/lib/languages/tp.js";
import { Mo } from "../../vendor/highlight.js/lib/languages/twig.js";
import { Go } from "../../vendor/highlight.js/lib/languages/typescript.js";
import { qo } from "../../vendor/highlight.js/lib/languages/vala.js";
import { $o } from "../../vendor/highlight.js/lib/languages/vbnet.js";
import { Ko } from "../../vendor/highlight.js/lib/languages/vbscript.js";
import { Wo } from "../../vendor/highlight.js/lib/languages/vbscript-html.js";
import { Xo } from "../../vendor/highlight.js/lib/languages/verilog.js";
import { Qo } from "../../vendor/highlight.js/lib/languages/vhdl.js";
import { jo } from "../../vendor/highlight.js/lib/languages/vim.js";
import { tc } from "../../vendor/highlight.js/lib/languages/wasm.js";
import { ac } from "../../vendor/highlight.js/lib/languages/wren.js";
import { ic } from "../../vendor/highlight.js/lib/languages/x86asm.js";
import { oc } from "../../vendor/highlight.js/lib/languages/xl.js";
import { lc } from "../../vendor/highlight.js/lib/languages/xml.js";
import { pc } from "../../vendor/highlight.js/lib/languages/xquery.js";
import { _c } from "../../vendor/highlight.js/lib/languages/yaml.js";
import { Ec } from "../../vendor/highlight.js/lib/languages/zephir.js";
import { Gc } from "../../vendor/highlight.js/lib/core.js";
import { canonicalLanguageName, BRe } from "./highlight/pluginLanguages.js";
import { kki } from "./cliHighlight.js";

//@ chunk-egr0twnb.js:586332-589295 placement
var HIGHLIGHT_LANGUAGE_LOADERS = {
  abnf: () => je(),
  accesslog: () => tt(),
  actionscript: () => at(),
  ada: () => it(),
  angelscript: () => ot(),
  apache: () => lt(),
  applescript: () => pt(),
  arcade: () => _t(),
  arduino: () => Et(),
  armasm: () => bt(),
  asciidoc: () => Tt(),
  aspectj: () => St(),
  autohotkey: () => Rt(),
  autoit: () => vt(),
  avrasm: () => Ct(),
  awk: () => ht(),
  axapta: () => Dt(),
  bash: () => wt(),
  basic: () => kt(),
  bnf: () => Ut(),
  brainfuck: () => Gt(),
  c: () => qt(),
  cal: () => $t(),
  capnproto: () => Kt(),
  ceylon: () => Wt(),
  clean: () => Xt(),
  clojure: () => Qt(),
  "clojure-repl": () => jt(),
  cmake: () => tn(),
  coffeescript: () => an(),
  coq: () => sn(),
  cos: () => cn(),
  cpp: () => dn(),
  crmsh: () => mn(),
  crystal: () => un(),
  csharp: () => gn(),
  csp: () => fn(),
  css: () => Nn(),
  d: () => An(),
  dart: () => On(),
  delphi: () => In(),
  diff: () => yn(),
  django: () => Mn(),
  dns: () => Ln(),
  dockerfile: () => xn(),
  dos: () => Pn(),
  dsconfig: () => Bn(),
  dts: () => Fn(),
  dust: () => Hn(),
  ebnf: () => zn(),
  elixir: () => Vn(),
  elm: () => Yn(),
  erb: () => Zn(),
  erlang: () => Jn(),
  "erlang-repl": () => ea(),
  excel: () => na(),
  fix: () => ra(),
  flix: () => sa(),
  fortran: () => ca(),
  fsharp: () => pa(),
  gams: () => _a(),
  gauss: () => Ea(),
  gcode: () => ba(),
  gherkin: () => Ta(),
  glsl: () => Sa(),
  go: () => Ra(),
  golo: () => va(),
  gradle: () => Ca(),
  graphql: () => ha(),
  groovy: () => Da(),
  haml: () => wa(),
  handlebars: () => ka(),
  haskell: () => Ua(),
  haxe: () => Ga(),
  hsp: () => qa(),
  http: () => $a(),
  hy: () => Ka(),
  inform7: () => Wa(),
  ini: () => Xa(),
  irpf90: () => Qa(),
  java: () => tr(),
  javascript: () => sr(),
  "jboss-cli": () => cr(),
  json: () => dr(),
  julia: () => mr(),
  "julia-repl": () => ur(),
  kotlin: () => gr(),
  lasso: () => fr(),
  latex: () => Nr(),
  ldif: () => Ar(),
  leaf: () => Or(),
  less: () => yr(),
  lisp: () => Mr(),
  livecodeserver: () => Lr(),
  livescript: () => xr(),
  llvm: () => Pr(),
  lsl: () => Br(),
  lua: () => Fr(),
  makefile: () => Hr(),
  markdown: () => zr(),
  matlab: () => Vr(),
  mel: () => Yr(),
  mercury: () => Zr(),
  mipsasm: () => Jr(),
  mizar: () => ei(),
  mojolicious: () => ni(),
  monkey: () => ri(),
  moonscript: () => si(),
  n1ql: () => ci(),
  nestedtext: () => di(),
  nginx: () => mi(),
  nim: () => ui(),
  nix: () => gi(),
  "node-repl": () => fi(),
  nsis: () => Ni(),
  objectivec: () => Ai(),
  ocaml: () => Oi(),
  openscad: () => Ii(),
  oxygene: () => yi(),
  parser3: () => Mi(),
  perl: () => Li(),
  pf: () => xi(),
  pgsql: () => Pi(),
  php: () => Bi(),
  "php-template": () => Fi(),
  plaintext: () => Hi(),
  pony: () => zi(),
  powershell: () => Vi(),
  processing: () => Yi(),
  profile: () => Zi(),
  prolog: () => Ji(),
  properties: () => es(),
  protobuf: () => ns(),
  puppet: () => rs(),
  purebasic: () => ss(),
  python: () => cs(),
  "python-repl": () => ds(),
  q: () => ms(),
  qml: () => us(),
  r: () => gs(),
  reasonml: () => fs(),
  rib: () => Ns(),
  roboconf: () => As(),
  routeros: () => Os(),
  rsl: () => Is(),
  ruby: () => ys(),
  ruleslanguage: () => Ms(),
  rust: () => Ls(),
  sas: () => xs(),
  scala: () => Ps(),
  scheme: () => Bs(),
  scilab: () => Fs(),
  scss: () => Hs(),
  shell: () => zs(),
  smali: () => Vs(),
  smalltalk: () => Ys(),
  sml: () => Zs(),
  sql: () => Js(),
  stan: () => eo(),
  stata: () => no(),
  step21: () => ro(),
  stylus: () => so(),
  subunit: () => co(),
  swift: () => fo(),
  taggerscript: () => No(),
  tap: () => Ao(),
  tcl: () => Oo(),
  thrift: () => Io(),
  tp: () => yo(),
  twig: () => Mo(),
  typescript: () => Go(),
  vala: () => qo(),
  vbnet: () => $o(),
  vbscript: () => Ko(),
  "vbscript-html": () => Wo(),
  verilog: () => Xo(),
  vhdl: () => Qo(),
  vim: () => jo(),
  wasm: () => tc(),
  wren: () => ac(),
  x86asm: () => ic(),
  xl: () => oc(),
  xml: () => lc(),
  xquery: () => pc(),
  yaml: () => _c(),
  zephir: () => Ec(),
};
/**
 * 高亮库加载器（核心、语言 id 解析、语言加载器、子语言依赖）。
 */
//@ chunk-egr0twnb.js:589295-589415 placement
var HIGHLIGHT_LOADER = {
  loadCore() {
    let e = Gc();
    return "default" in e && e.default ? e.default : e;
  },
  resolveId: canonicalLanguageName,
  loaders: HIGHLIGHT_LANGUAGE_LOADERS,
  subLanguageDeps: kki,
};
//@ chunk-egr0twnb.js:589415-589450 placement
function tUn() {
  return BRe.core(HIGHLIGHT_LOADER);
}
//@ chunk-egr0twnb.js:589450-589509 placement
function WPs(e, t) {
  return BRe.highlightUnderMessage(HIGHLIGHT_LOADER, e, t);
}
//@ chunk-egr0twnb.js:589509-589557 placement
function Sce(e) {
  return BRe.ensureLanguage(e, HIGHLIGHT_LOADER);
}

export { Sce, WPs, tUn };
