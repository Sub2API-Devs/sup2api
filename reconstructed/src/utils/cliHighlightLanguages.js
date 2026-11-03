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
import { require_abnf } from "../../vendor/highlight.js/lib/languages/abnf.js";
import { require_accesslog } from "../../vendor/highlight.js/lib/languages/accesslog.js";
import { require_actionscript } from "../../vendor/highlight.js/lib/languages/actionscript.js";
import { require_ada } from "../../vendor/highlight.js/lib/languages/ada.js";
import { require_angelscript } from "../../vendor/highlight.js/lib/languages/angelscript.js";
import { require_apache } from "../../vendor/highlight.js/lib/languages/apache.js";
import { require_applescript } from "../../vendor/highlight.js/lib/languages/applescript.js";
import { require_arcade } from "../../vendor/highlight.js/lib/languages/arcade.js";
import { require_arduino } from "../../vendor/highlight.js/lib/languages/arduino.js";
import { require_armasm } from "../../vendor/highlight.js/lib/languages/armasm.js";
import { require_asciidoc } from "../../vendor/highlight.js/lib/languages/asciidoc.js";
import { require_aspectj } from "../../vendor/highlight.js/lib/languages/aspectj.js";
import { require_autohotkey } from "../../vendor/highlight.js/lib/languages/autohotkey.js";
import { require_autoit } from "../../vendor/highlight.js/lib/languages/autoit.js";
import { require_avrasm } from "../../vendor/highlight.js/lib/languages/avrasm.js";
import { require_awk } from "../../vendor/highlight.js/lib/languages/awk.js";
import { require_axapta } from "../../vendor/highlight.js/lib/languages/axapta.js";
import { require_bash } from "../../vendor/highlight.js/lib/languages/bash.js";
import { require_basic } from "../../vendor/highlight.js/lib/languages/basic.js";
import { require_bnf } from "../../vendor/highlight.js/lib/languages/bnf.js";
import { require_brainfuck } from "../../vendor/highlight.js/lib/languages/brainfuck.js";
import { require_c } from "../../vendor/highlight.js/lib/languages/c.js";
import { require_cal } from "../../vendor/highlight.js/lib/languages/cal.js";
import { require_capnproto } from "../../vendor/highlight.js/lib/languages/capnproto.js";
import { require_ceylon } from "../../vendor/highlight.js/lib/languages/ceylon.js";
import { require_clean } from "../../vendor/highlight.js/lib/languages/clean.js";
import { require_clojure } from "../../vendor/highlight.js/lib/languages/clojure.js";
import { require_clojure_repl } from "../../vendor/highlight.js/lib/languages/clojure-repl.js";
import { require_cmake } from "../../vendor/highlight.js/lib/languages/cmake.js";
import { require_coffeescript } from "../../vendor/highlight.js/lib/languages/coffeescript.js";
import { require_coq } from "../../vendor/highlight.js/lib/languages/coq.js";
import { require_cos } from "../../vendor/highlight.js/lib/languages/cos.js";
import { require_cpp } from "../../vendor/highlight.js/lib/languages/cpp.js";
import { require_crmsh } from "../../vendor/highlight.js/lib/languages/crmsh.js";
import { require_crystal } from "../../vendor/highlight.js/lib/languages/crystal.js";
import { require_csharp } from "../../vendor/highlight.js/lib/languages/csharp.js";
import { require_csp } from "../../vendor/highlight.js/lib/languages/csp.js";
import { require_css } from "../../vendor/highlight.js/lib/languages/css.js";
import { require_d } from "../../vendor/highlight.js/lib/languages/d.js";
import { require_dart } from "../../vendor/highlight.js/lib/languages/dart.js";
import { require_delphi } from "../../vendor/highlight.js/lib/languages/delphi.js";
import { require_diff } from "../../vendor/highlight.js/lib/languages/diff.js";
import { require_django } from "../../vendor/highlight.js/lib/languages/django.js";
import { require_dns } from "../../vendor/highlight.js/lib/languages/dns.js";
import { require_dockerfile } from "../../vendor/highlight.js/lib/languages/dockerfile.js";
import { require_dos } from "../../vendor/highlight.js/lib/languages/dos.js";
import { require_dsconfig } from "../../vendor/highlight.js/lib/languages/dsconfig.js";
import { require_dts } from "../../vendor/highlight.js/lib/languages/dts.js";
import { require_dust } from "../../vendor/highlight.js/lib/languages/dust.js";
import { require_ebnf } from "../../vendor/highlight.js/lib/languages/ebnf.js";
import { require_elixir } from "../../vendor/highlight.js/lib/languages/elixir.js";
import { require_elm } from "../../vendor/highlight.js/lib/languages/elm.js";
import { require_erb } from "../../vendor/highlight.js/lib/languages/erb.js";
import { require_erlang } from "../../vendor/highlight.js/lib/languages/erlang.js";
import { require_erlang_repl } from "../../vendor/highlight.js/lib/languages/erlang-repl.js";
import { require_excel } from "../../vendor/highlight.js/lib/languages/excel.js";
import { require_fix } from "../../vendor/highlight.js/lib/languages/fix.js";
import { require_flix, require_flix_2 } from "../../vendor/highlight.js/lib/languages/flix.js";
import { require_fortran } from "../../vendor/highlight.js/lib/languages/fortran.js";
import { require_fsharp } from "../../vendor/highlight.js/lib/languages/fsharp.js";
import { require_gams } from "../../vendor/highlight.js/lib/languages/gams.js";
import { require_gauss } from "../../vendor/highlight.js/lib/languages/gauss.js";
import { require_gcode } from "../../vendor/highlight.js/lib/languages/gcode.js";
import { require_gherkin } from "../../vendor/highlight.js/lib/languages/gherkin.js";
import { require_go } from "../../vendor/highlight.js/lib/languages/go.js";
import { require_golo } from "../../vendor/highlight.js/lib/languages/golo.js";
import { require_gradle } from "../../vendor/highlight.js/lib/languages/gradle.js";
import { require_graphql } from "../../vendor/highlight.js/lib/languages/graphql.js";
import { require_groovy } from "../../vendor/highlight.js/lib/languages/groovy.js";
import { require_haml } from "../../vendor/highlight.js/lib/languages/haml.js";
import { require_handlebars } from "../../vendor/highlight.js/lib/languages/handlebars.js";
import { require_haskell } from "../../vendor/highlight.js/lib/languages/haskell.js";
import { require_haxe } from "../../vendor/highlight.js/lib/languages/haxe.js";
import { require_hsp } from "../../vendor/highlight.js/lib/languages/hsp.js";
import { require_http } from "../../vendor/highlight.js/lib/languages/http.js";
import { require_hy } from "../../vendor/highlight.js/lib/languages/hy.js";
import { require_inform7 } from "../../vendor/highlight.js/lib/languages/inform7.js";
import { require_ini } from "../../vendor/highlight.js/lib/languages/ini.js";
import { require_irpf90 } from "../../vendor/highlight.js/lib/languages/irpf90.js";
import { require_java } from "../../vendor/highlight.js/lib/languages/java.js";
import { require_javascript } from "../../vendor/highlight.js/lib/languages/javascript.js";
import { require_jboss_cli } from "../../vendor/highlight.js/lib/languages/jboss-cli.js";
import {
  require_json,
  require_json_2,
  require_json_3,
} from "../../vendor/highlight.js/lib/languages/json.js";
import { require_julia } from "../../vendor/highlight.js/lib/languages/julia.js";
import { require_julia_repl } from "../../vendor/highlight.js/lib/languages/julia-repl.js";
import { require_kotlin } from "../../vendor/highlight.js/lib/languages/kotlin.js";
import { require_lasso } from "../../vendor/highlight.js/lib/languages/lasso.js";
import { require_latex } from "../../vendor/highlight.js/lib/languages/latex.js";
import { require_ldif } from "../../vendor/highlight.js/lib/languages/ldif.js";
import { require_leaf } from "../../vendor/highlight.js/lib/languages/leaf.js";
import { require_less } from "../../vendor/highlight.js/lib/languages/less.js";
import { require_lisp } from "../../vendor/highlight.js/lib/languages/lisp.js";
import { require_livecodeserver } from "../../vendor/highlight.js/lib/languages/livecodeserver.js";
import { require_livescript } from "../../vendor/highlight.js/lib/languages/livescript.js";
import { require_llvm } from "../../vendor/highlight.js/lib/languages/llvm.js";
import { require_lsl } from "../../vendor/highlight.js/lib/languages/lsl.js";
import { require_lua } from "../../vendor/highlight.js/lib/languages/lua.js";
import { require_makefile } from "../../vendor/highlight.js/lib/languages/makefile.js";
import { require_markdown } from "../../vendor/highlight.js/lib/languages/markdown.js";
import { require_matlab } from "../../vendor/highlight.js/lib/languages/matlab.js";
import { require_mercury } from "../../vendor/highlight.js/lib/languages/mercury.js";
import { require_mipsasm } from "../../vendor/highlight.js/lib/languages/mipsasm.js";
import { require_mizar } from "../../vendor/highlight.js/lib/languages/mizar.js";
import { require_mojolicious } from "../../vendor/highlight.js/lib/languages/mojolicious.js";
import { require_monkey } from "../../vendor/highlight.js/lib/languages/monkey.js";
import { require_moonscript } from "../../vendor/highlight.js/lib/languages/moonscript.js";
import { require_n1ql } from "../../vendor/highlight.js/lib/languages/n1ql.js";
import { require_nestedtext } from "../../vendor/highlight.js/lib/languages/nestedtext.js";
import { require_nginx } from "../../vendor/highlight.js/lib/languages/nginx.js";
import { require_nim } from "../../vendor/highlight.js/lib/languages/nim.js";
import { require_nix } from "../../vendor/highlight.js/lib/languages/nix.js";
import { require_node_repl } from "../../vendor/highlight.js/lib/languages/node-repl.js";
import { require_nsis } from "../../vendor/highlight.js/lib/languages/nsis.js";
import { require_objectivec } from "../../vendor/highlight.js/lib/languages/objectivec.js";
import { require_ocaml } from "../../vendor/highlight.js/lib/languages/ocaml.js";
import { require_openscad } from "../../vendor/highlight.js/lib/languages/openscad.js";
import { require_oxygene } from "../../vendor/highlight.js/lib/languages/oxygene.js";
import { require_parser3 } from "../../vendor/highlight.js/lib/languages/parser3.js";
import { require_perl } from "../../vendor/highlight.js/lib/languages/perl.js";
import { require_pf } from "../../vendor/highlight.js/lib/languages/pf.js";
import { require_pgsql } from "../../vendor/highlight.js/lib/languages/pgsql.js";
import { require_php } from "../../vendor/highlight.js/lib/languages/php.js";
import { require_php_template } from "../../vendor/highlight.js/lib/languages/php-template.js";
import { require_plaintext } from "../../vendor/highlight.js/lib/languages/plaintext.js";
import { require_pony } from "../../vendor/highlight.js/lib/languages/pony.js";
import { require_powershell } from "../../vendor/highlight.js/lib/languages/powershell.js";
import { require_processing } from "../../vendor/highlight.js/lib/languages/processing.js";
import { require_profile } from "../../vendor/highlight.js/lib/languages/profile.js";
import { require_prolog } from "../../vendor/highlight.js/lib/languages/prolog.js";
import { require_properties } from "../../vendor/highlight.js/lib/languages/properties.js";
import { require_protobuf } from "../../vendor/highlight.js/lib/languages/protobuf.js";
import { require_puppet } from "../../vendor/highlight.js/lib/languages/puppet.js";
import { require_purebasic } from "../../vendor/highlight.js/lib/languages/purebasic.js";
import { require_python } from "../../vendor/highlight.js/lib/languages/python.js";
import { require_python_repl } from "../../vendor/highlight.js/lib/languages/python-repl.js";
import { require_q } from "../../vendor/highlight.js/lib/languages/q.js";
import { require_qml } from "../../vendor/highlight.js/lib/languages/qml.js";
import { require_r } from "../../vendor/highlight.js/lib/languages/r.js";
import { require_reasonml } from "../../vendor/highlight.js/lib/languages/reasonml.js";
import { require_rib } from "../../vendor/highlight.js/lib/languages/rib.js";
import { require_roboconf } from "../../vendor/highlight.js/lib/languages/roboconf.js";
import { require_routeros } from "../../vendor/highlight.js/lib/languages/routeros.js";
import { require_rsl } from "../../vendor/highlight.js/lib/languages/rsl.js";
import { require_ruby } from "../../vendor/highlight.js/lib/languages/ruby.js";
import { require_rust } from "../../vendor/highlight.js/lib/languages/rust.js";
import { require_sas } from "../../vendor/highlight.js/lib/languages/sas.js";
import { require_scala } from "../../vendor/highlight.js/lib/languages/scala.js";
import { require_scheme } from "../../vendor/highlight.js/lib/languages/scheme.js";
import { require_scilab } from "../../vendor/highlight.js/lib/languages/scilab.js";
import { require_scss } from "../../vendor/highlight.js/lib/languages/scss.js";
import { require_shell } from "../../vendor/highlight.js/lib/languages/shell.js";
import { require_smali } from "../../vendor/highlight.js/lib/languages/smali.js";
import { require_smalltalk } from "../../vendor/highlight.js/lib/languages/smalltalk.js";
import { require_sml } from "../../vendor/highlight.js/lib/languages/sml.js";
import { require_sql } from "../../vendor/highlight.js/lib/languages/sql.js";
import { require_stan } from "../../vendor/highlight.js/lib/languages/stan.js";
import { require_stata } from "../../vendor/highlight.js/lib/languages/stata.js";
import { require_step21 } from "../../vendor/highlight.js/lib/languages/step21.js";
import { require_stylus } from "../../vendor/highlight.js/lib/languages/stylus.js";
import { require_subunit } from "../../vendor/highlight.js/lib/languages/subunit.js";
import { require_swift } from "../../vendor/highlight.js/lib/languages/swift.js";
import { require_taggerscript } from "../../vendor/highlight.js/lib/languages/taggerscript.js";
import { require_tap } from "../../vendor/highlight.js/lib/languages/tap.js";
import { require_tcl } from "../../vendor/highlight.js/lib/languages/tcl.js";
import { require_thrift } from "../../vendor/highlight.js/lib/languages/thrift.js";
import { require_tp } from "../../vendor/highlight.js/lib/languages/tp.js";
import { require_twig } from "../../vendor/highlight.js/lib/languages/twig.js";
import { require_typescript } from "../../vendor/highlight.js/lib/languages/typescript.js";
import { require_vala } from "../../vendor/highlight.js/lib/languages/vala.js";
import { require_vbnet } from "../../vendor/highlight.js/lib/languages/vbnet.js";
import { require_vbscript } from "../../vendor/highlight.js/lib/languages/vbscript.js";
import { require_vbscript_html } from "../../vendor/highlight.js/lib/languages/vbscript-html.js";
import { require_verilog } from "../../vendor/highlight.js/lib/languages/verilog.js";
import { require_vhdl } from "../../vendor/highlight.js/lib/languages/vhdl.js";
import { require_vim } from "../../vendor/highlight.js/lib/languages/vim.js";
import { require_wasm } from "../../vendor/highlight.js/lib/languages/wasm.js";
import { require_wren } from "../../vendor/highlight.js/lib/languages/wren.js";
import { require_x86asm } from "../../vendor/highlight.js/lib/languages/x86asm.js";
import { require_xl } from "../../vendor/highlight.js/lib/languages/xl.js";
import { require_xml } from "../../vendor/highlight.js/lib/languages/xml.js";
import { require_xquery } from "../../vendor/highlight.js/lib/languages/xquery.js";
import { require_yaml } from "../../vendor/highlight.js/lib/languages/yaml.js";
import { require_zephir } from "../../vendor/highlight.js/lib/languages/zephir.js";
import { require_core } from "../../vendor/highlight.js/lib/core.js";
import { canonicalLanguageName, pluginHighlightLanguages } from "./highlight/pluginLanguages.js";
import { HIGHLIGHT_LANGUAGE_ALIASES } from "./cliHighlight.js";

//@ chunk-egr0twnb.js:586332-589295 placement
var HIGHLIGHT_LANGUAGE_LOADERS = {
  abnf: () => require_abnf(),
  accesslog: () => require_accesslog(),
  actionscript: () => require_actionscript(),
  ada: () => require_ada(),
  angelscript: () => require_angelscript(),
  apache: () => require_apache(),
  applescript: () => require_applescript(),
  arcade: () => require_arcade(),
  arduino: () => require_arduino(),
  armasm: () => require_armasm(),
  asciidoc: () => require_asciidoc(),
  aspectj: () => require_aspectj(),
  autohotkey: () => require_autohotkey(),
  autoit: () => require_autoit(),
  avrasm: () => require_avrasm(),
  awk: () => require_awk(),
  axapta: () => require_axapta(),
  bash: () => require_bash(),
  basic: () => require_basic(),
  bnf: () => require_bnf(),
  brainfuck: () => require_brainfuck(),
  c: () => require_c(),
  cal: () => require_cal(),
  capnproto: () => require_capnproto(),
  ceylon: () => require_ceylon(),
  clean: () => require_clean(),
  clojure: () => require_clojure(),
  "clojure-repl": () => require_clojure_repl(),
  cmake: () => require_cmake(),
  coffeescript: () => require_coffeescript(),
  coq: () => require_coq(),
  cos: () => require_cos(),
  cpp: () => require_cpp(),
  crmsh: () => require_crmsh(),
  crystal: () => require_crystal(),
  csharp: () => require_csharp(),
  csp: () => require_csp(),
  css: () => require_css(),
  d: () => require_d(),
  dart: () => require_dart(),
  delphi: () => require_delphi(),
  diff: () => require_diff(),
  django: () => require_django(),
  dns: () => require_dns(),
  dockerfile: () => require_dockerfile(),
  dos: () => require_dos(),
  dsconfig: () => require_dsconfig(),
  dts: () => require_dts(),
  dust: () => require_dust(),
  ebnf: () => require_ebnf(),
  elixir: () => require_elixir(),
  elm: () => require_elm(),
  erb: () => require_erb(),
  erlang: () => require_erlang(),
  "erlang-repl": () => require_erlang_repl(),
  excel: () => require_excel(),
  fix: () => require_fix(),
  flix: () => require_flix(),
  fortran: () => require_fortran(),
  fsharp: () => require_fsharp(),
  gams: () => require_gams(),
  gauss: () => require_gauss(),
  gcode: () => require_gcode(),
  gherkin: () => require_gherkin(),
  glsl: () => require_flix_2(),
  go: () => require_go(),
  golo: () => require_golo(),
  gradle: () => require_gradle(),
  graphql: () => require_graphql(),
  groovy: () => require_groovy(),
  haml: () => require_haml(),
  handlebars: () => require_handlebars(),
  haskell: () => require_haskell(),
  haxe: () => require_haxe(),
  hsp: () => require_hsp(),
  http: () => require_http(),
  hy: () => require_hy(),
  inform7: () => require_inform7(),
  ini: () => require_ini(),
  irpf90: () => require_irpf90(),
  java: () => require_java(),
  javascript: () => require_javascript(),
  "jboss-cli": () => require_jboss_cli(),
  json: () => require_json(),
  julia: () => require_julia(),
  "julia-repl": () => require_julia_repl(),
  kotlin: () => require_kotlin(),
  lasso: () => require_lasso(),
  latex: () => require_latex(),
  ldif: () => require_ldif(),
  leaf: () => require_leaf(),
  less: () => require_less(),
  lisp: () => require_lisp(),
  livecodeserver: () => require_livecodeserver(),
  livescript: () => require_livescript(),
  llvm: () => require_llvm(),
  lsl: () => require_lsl(),
  lua: () => require_lua(),
  makefile: () => require_makefile(),
  markdown: () => require_markdown(),
  matlab: () => require_matlab(),
  mel: () => require_json_2(),
  mercury: () => require_mercury(),
  mipsasm: () => require_mipsasm(),
  mizar: () => require_mizar(),
  mojolicious: () => require_mojolicious(),
  monkey: () => require_monkey(),
  moonscript: () => require_moonscript(),
  n1ql: () => require_n1ql(),
  nestedtext: () => require_nestedtext(),
  nginx: () => require_nginx(),
  nim: () => require_nim(),
  nix: () => require_nix(),
  "node-repl": () => require_node_repl(),
  nsis: () => require_nsis(),
  objectivec: () => require_objectivec(),
  ocaml: () => require_ocaml(),
  openscad: () => require_openscad(),
  oxygene: () => require_oxygene(),
  parser3: () => require_parser3(),
  perl: () => require_perl(),
  pf: () => require_pf(),
  pgsql: () => require_pgsql(),
  php: () => require_php(),
  "php-template": () => require_php_template(),
  plaintext: () => require_plaintext(),
  pony: () => require_pony(),
  powershell: () => require_powershell(),
  processing: () => require_processing(),
  profile: () => require_profile(),
  prolog: () => require_prolog(),
  properties: () => require_properties(),
  protobuf: () => require_protobuf(),
  puppet: () => require_puppet(),
  purebasic: () => require_purebasic(),
  python: () => require_python(),
  "python-repl": () => require_python_repl(),
  q: () => require_q(),
  qml: () => require_qml(),
  r: () => require_r(),
  reasonml: () => require_reasonml(),
  rib: () => require_rib(),
  roboconf: () => require_roboconf(),
  routeros: () => require_routeros(),
  rsl: () => require_rsl(),
  ruby: () => require_ruby(),
  ruleslanguage: () => require_json_3(),
  rust: () => require_rust(),
  sas: () => require_sas(),
  scala: () => require_scala(),
  scheme: () => require_scheme(),
  scilab: () => require_scilab(),
  scss: () => require_scss(),
  shell: () => require_shell(),
  smali: () => require_smali(),
  smalltalk: () => require_smalltalk(),
  sml: () => require_sml(),
  sql: () => require_sql(),
  stan: () => require_stan(),
  stata: () => require_stata(),
  step21: () => require_step21(),
  stylus: () => require_stylus(),
  subunit: () => require_subunit(),
  swift: () => require_swift(),
  taggerscript: () => require_taggerscript(),
  tap: () => require_tap(),
  tcl: () => require_tcl(),
  thrift: () => require_thrift(),
  tp: () => require_tp(),
  twig: () => require_twig(),
  typescript: () => require_typescript(),
  vala: () => require_vala(),
  vbnet: () => require_vbnet(),
  vbscript: () => require_vbscript(),
  "vbscript-html": () => require_vbscript_html(),
  verilog: () => require_verilog(),
  vhdl: () => require_vhdl(),
  vim: () => require_vim(),
  wasm: () => require_wasm(),
  wren: () => require_wren(),
  x86asm: () => require_x86asm(),
  xl: () => require_xl(),
  xml: () => require_xml(),
  xquery: () => require_xquery(),
  yaml: () => require_yaml(),
  zephir: () => require_zephir(),
};
//@ chunk-egr0twnb.js:589295-589415 placement
/**
 * 高亮库加载器（核心、语言 id 解析、语言加载器、子语言依赖）。
 */
var HIGHLIGHT_LOADER = {
  loadCore() {
    let e = require_core();
    return "default" in e && e.default ? e.default : e;
  },
  resolveId: canonicalLanguageName,
  loaders: HIGHLIGHT_LANGUAGE_LOADERS,
  subLanguageDeps: HIGHLIGHT_LANGUAGE_ALIASES,
};
//@ chunk-egr0twnb.js:589415-589450 placement
/**
 * 用共享加载器做基础高亮。
 */
function highlightCore() {
  return pluginHighlightLanguages.core(HIGHLIGHT_LOADER);
}
//@ chunk-egr0twnb.js:589450-589509 placement
/**
 * 以消息样式作为背景做高亮。
 */
function highlightUnderMessage(work, t) {
  return pluginHighlightLanguages.highlightUnderMessage(HIGHLIGHT_LOADER, work, t);
}
//@ chunk-egr0twnb.js:589509-589557 placement
/**
 * 按需加载（并确认）高亮语言。
 */
function ensureHighlightLanguage(e) {
  return pluginHighlightLanguages.ensureLanguage(e, HIGHLIGHT_LOADER);
}
export { ensureHighlightLanguage, highlightUnderMessage, highlightCore };
