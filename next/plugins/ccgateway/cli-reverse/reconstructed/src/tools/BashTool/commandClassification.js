/**
 * tools/BashTool/commandClassification.ts
 *
 * 2.1.316 新增。Bash 命令分类（vcs、网络、测试…）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fym4r1th.js (22)
 * attribution: placement 22
 */
import { lit, fromEnum, fromEnumArr } from "../../services/analytics/safeMetadata.js";
import { SPLIT_MAX_LEN } from "../../utils/bash/commands.js";
import { getParserModule } from "../../utils/bash/bashParser.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fym4r1th.js:11663-37722 placement
/**
 * Bash 命令分类表：把命令名归到 vcs/network/包管理/测试等类别，并给出类别下的程序清单、子命令表、包装命令与测试范围规则；classifyBashCommand 用它生成遥测字段。
 */
var COMMAND_CLASSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROGRAM_NAMES_BY_CLASS;
var PROGRAM_CLASS_BY_NAME;
var keys;
var PROGRAM_ALIASES;
var SUBCOMMANDS_BY_PROGRAM;
var GH_SUBCOMMANDS;
var WRAPPER_VALUE_FLAGS;
var MAX_WRAPPER_DEPTH;
var PROGRAM_GLOBAL_VALUE_FLAGS;
var TEST_SCOPES;
var PROGRAM_CATEGORIES;
var CATEGORY_KIND_ALIASES;
var PROGRAMS_BY_CATEGORY;
var TEST_PROGRAMS_BY_SCOPE;
var PROGRAMS_BY_CATEGORY_ALIAS;
var PROGRAM_TO_CATEGORY;
var PROGRAM_TO_TEST_SCOPE;
var KNOWN_PROGRAM_NAMES;
var BARE_SCRIPT_CATEGORIES;
var NPM_LIKE_RULES;
var SCRIPT_RUNNER_RULES;
var PYTHON_PACKAGE_RULES;
var JVM_BUILD_RULES;
var OS_PACKAGE_RULES;
var COVERAGE_VALUE_FLAGS;
var TSC_RULES;
var BAZEL_RULES;
var PROGRAM_RULES;
var PYTHON_MODULE_KINDS;
var PYTHON_TEST_MODULES;
var TEST_SCOPE_ORDER;
var PYTHON_WRAPPER_PROGRAMS;
var PACKAGE_NAME_ALIASES;
var EXTENSION_CATEGORIES;
var WRAPPER_COMMAND_RULES;
var SHELL_PROGRAMS;
var FIND_EXEC_FLAGS;
var BACKGROUNDING_PROGRAMS;
var NOOP_FLAGS;
var SERVE_FLAGS;
var MAX_NESTING_DEPTH;
var MAX_PROGRAM_NAMES;
var MAX_SCRIPT_NESTING;
var SCRIPT_CHAR_BUDGET;
var PARSE_TIME_BUDGET_MS;
var TEST_SCOPE_OUTPUT_VALUES;
var FLAG_EFFECT_KEYS;
var WHOLE_SUITE_OPERANDS;
var FOLDER_OPERAND_NAMES;
var TEST_PATH_OR_NAME_RE;
var JEST_LIKE_FLAG_RULES;
var TEST_TOOL_RULES;
var NPM_TEST_RULES;
var NX_LIKE_TEST_RULES;
var PYTEST_FLAG_RULES;
var MAVEN_FLAG_RULES;
var BAZEL_FLAG_RULES;
var PHPUNIT_FLAG_RULES;
var NO_FLAG_RULES;
var TEST_COMMAND_RULES;
var HELP_FLAGS;
var ARG_FEEDING_PROGRAMS;
var ENV_ASSIGNMENT_RE;
var UNPARSED_COMMAND_INFO;
var CHAIN_OPERATORS;
var SUBSHELL_NODE_TYPES;
var HARMLESS_REDIRECT_RE;
deferInit("chunk-fym4r1th.js:11663", () => {
  COMMAND_CLASSES = [
    "vcs",
    "github_cli",
    "network",
    "lang_runtime",
    "package_manager",
    "build_test",
    "file_read",
    "file_search",
    "text_transform",
    "fs_mutation",
    "shell_builtin",
    "process_system",
    "container_infra",
    "document_media",
    "db_client",
    "claude_cli",
    "other",
    "unparsed",
  ];
  PROGRAM_NAMES_BY_CLASS = {
    vcs: ["git", "hg", "svn"],
    github_cli: ["gh"],
    network: ["curl", "wget", "ssh", "scp", "rsync", "ping", "nc", "dig", "nslookup"],
    lang_runtime: [
      "python",
      "node",
      "bun",
      "deno",
      "ruby",
      "perl",
      "php",
      "java",
      "Rscript",
      "swift",
      "tsx",
      "ts-node",
      "bash",
      "sh",
      "zsh",
      "pwsh",
    ],
    package_manager: [
      "npm",
      "npx",
      "bunx",
      "pip",
      "uv",
      "uvx",
      "poetry",
      "yarn",
      "pnpm",
      "cargo",
      "go",
      "gradle",
      "gradlew",
      "mvn",
      "nuget",
      "brew",
      "apt",
      "apt-get",
      "apk",
      "conda",
      "gem",
      "composer",
      "nix",
      "nix-shell",
      "nix-build",
      "nix-env",
    ],
    build_test: [
      "make",
      "cmake",
      "bazel",
      "tsc",
      "jest",
      "vitest",
      "pytest",
      "eslint",
      "prettier",
      "ruff",
      "mypy",
      "vite",
      "webpack",
      "nx",
      "turbo",
      "xcodebuild",
      "dotnet",
      "msbuild",
      "gcc",
      "clang",
      "rustc",
    ],
    file_read: [
      "cat",
      "head",
      "tail",
      "less",
      "more",
      "wc",
      "stat",
      "file",
      "strings",
      "od",
      "hexdump",
      "xxd",
      "base64",
      "sha256sum",
      "sha1sum",
      "md5sum",
      "shasum",
      "diff",
      "cmp",
      "comm",
      "readlink",
      "realpath",
      "basename",
      "dirname",
    ],
    file_search: [
      "ls",
      "find",
      "fd",
      "tree",
      "grep",
      "egrep",
      "fgrep",
      "rg",
      "ag",
      "which",
      "whereis",
      "locate",
      "du",
    ],
    text_transform: [
      "sed",
      "awk",
      "gawk",
      "jq",
      "yq",
      "cut",
      "tr",
      "sort",
      "uniq",
      "paste",
      "column",
      "fold",
      "fmt",
      "rev",
      "tac",
      "nl",
      "expand",
      "unexpand",
      "numfmt",
      "iconv",
      "xargs",
    ],
    fs_mutation: [
      "mkdir",
      "touch",
      "rm",
      "rmdir",
      "mv",
      "cp",
      "ln",
      "chmod",
      "chown",
      "chgrp",
      "tar",
      "zip",
      "unzip",
      "gzip",
      "gunzip",
      "tee",
      "install",
      "truncate",
      "patch",
    ],
    shell_builtin: [
      "echo",
      "printf",
      "cd",
      "pwd",
      "export",
      "source",
      "true",
      "false",
      "test",
      "sleep",
      "date",
      "env",
      "set",
      "unset",
      "read",
      "exit",
      "wait",
      "eval",
      "exec",
      "trap",
      "alias",
      "type",
      "seq",
      "yes",
      "printenv",
    ],
    process_system: [
      "ps",
      "pgrep",
      "pkill",
      "kill",
      "killall",
      "lsof",
      "netstat",
      "ss",
      "df",
      "free",
      "uname",
      "id",
      "whoami",
      "hostname",
      "uptime",
      "nproc",
      "top",
      "htop",
      "timeout",
      "nohup",
      "sudo",
      "time",
      "watch",
      "crontab",
      "systemctl",
      "ulimit",
    ],
    container_infra: [
      "docker",
      "docker-compose",
      "podman",
      "kubectl",
      "helm",
      "terraform",
      "aws",
      "gcloud",
      "gsutil",
      "az",
      "vercel",
      "flyctl",
      "heroku",
    ],
    document_media: [
      "libreoffice",
      "soffice",
      "pandoc",
      "ffmpeg",
      "ffprobe",
      "convert",
      "magick",
      "pdftotext",
      "qpdf",
    ],
    db_client: ["sqlite3", "psql", "mysql", "mongosh", "redis-cli", "duckdb"],
    claude_cli: ["claude"],
  };
  PROGRAM_CLASS_BY_NAME = Object.fromEntries(
    COMMAND_CLASSES.flatMap((commandClass) =>
      (Object.hasOwn(PROGRAM_NAMES_BY_CLASS, commandClass) ? PROGRAM_NAMES_BY_CLASS[commandClass] : []).map(
        (programName) => [
          programName,
          {
            argv0: programName,
            commandClass,
          },
        ],
      ),
    ),
  );
  keys = Object.keys(PROGRAM_CLASS_BY_NAME);
  PROGRAM_ALIASES = {
    python3: "python",
    python2: "python",
    pip3: "pip",
    nodejs: "node",
    gmake: "make",
    gsed: "sed",
    ggrep: "grep",
    ".": "source",
  };
  SUBCOMMANDS_BY_PROGRAM = {
    git: [
      "status",
      "diff",
      "log",
      "show",
      "add",
      "commit",
      "push",
      "pull",
      "fetch",
      "checkout",
      "switch",
      "branch",
      "merge",
      "rebase",
      "stash",
      "clone",
      "remote",
      "tag",
      "reset",
      "restore",
      "rev-parse",
      "config",
      "worktree",
      "cherry-pick",
      "blame",
      "grep",
      "ls-files",
      "apply",
      "am",
      "init",
      "mv",
      "rm",
      "describe",
      "submodule",
      "bisect",
      "revert",
      "clean",
      "ls-remote",
      "symbolic-ref",
      "merge-base",
      "cat-file",
      "format-patch",
    ],
    gh: [
      "pr",
      "issue",
      "repo",
      "run",
      "workflow",
      "release",
      "api",
      "auth",
      "search",
      "gist",
      "label",
      "secret",
      "variable",
      "codespace",
      "browse",
      "status",
      "extension",
      "cache",
    ],
    npm: [
      "install",
      "ci",
      "run",
      "test",
      "start",
      "build",
      "exec",
      "publish",
      "init",
      "ls",
      "list",
      "view",
      "outdated",
      "update",
      "uninstall",
      "link",
      "pack",
      "audit",
      "version",
    ],
    pnpm: ["install", "add", "run", "test", "exec", "dlx", "build", "update", "remove", "list"],
    yarn: ["install", "add", "run", "test", "build", "remove", "upgrade", "workspace", "workspaces", "dlx"],
    pip: ["install", "uninstall", "list", "show", "freeze", "download", "wheel", "check", "index"],
    uv: [
      "run",
      "pip",
      "sync",
      "lock",
      "add",
      "remove",
      "venv",
      "tool",
      "python",
      "init",
      "build",
      "publish",
      "tree",
    ],
    cargo: [
      "build",
      "test",
      "run",
      "check",
      "clippy",
      "fmt",
      "add",
      "install",
      "update",
      "doc",
      "bench",
      "clean",
      "publish",
      "tree",
      "metadata",
      "nextest",
    ],
    go: [
      "build",
      "test",
      "run",
      "mod",
      "get",
      "vet",
      "fmt",
      "install",
      "generate",
      "env",
      "list",
      "tool",
      "version",
      "work",
    ],
    docker: [
      "build",
      "run",
      "exec",
      "ps",
      "images",
      "pull",
      "push",
      "compose",
      "logs",
      "stop",
      "rm",
      "rmi",
      "inspect",
      "tag",
      "login",
      "system",
      "volume",
      "network",
      "cp",
      "start",
      "kill",
    ],
    kubectl: [
      "get",
      "describe",
      "apply",
      "delete",
      "logs",
      "exec",
      "port-forward",
      "rollout",
      "scale",
      "config",
      "create",
      "patch",
      "edit",
      "top",
      "cp",
      "wait",
      "annotate",
      "label",
      "explain",
      "api-resources",
      "version",
      "cluster-info",
      "auth",
      "debug",
      "events",
      "diff",
      "kustomize",
      "replace",
      "expose",
      "run",
      "set",
      "cordon",
      "drain",
      "taint",
      "uncordon",
      "attach",
      "proxy",
      "certificate",
      "completion",
      "plugin",
    ],
  };
  GH_SUBCOMMANDS = [
    "view",
    "list",
    "create",
    "edit",
    "comment",
    "checks",
    "status",
    "diff",
    "merge",
    "close",
    "reopen",
    "review",
    "checkout",
    "ready",
    "download",
    "upload",
    "watch",
    "rerun",
    "cancel",
    "delete",
    "clone",
    "fork",
    "sync",
    "login",
    "logout",
    "token",
    "set",
    "get",
  ];
  WRAPPER_VALUE_FLAGS = {
    sudo: ["-u", "-g", "-U", "-p", "-C", "-D", "-h", "-r", "-t"],
    doas: ["-u", "-C"],
    env: ["-u", "-C", "-S", "--unset", "--chdir"],
    time: ["-f", "-o", "--format", "--output"],
    nice: ["-n", "--adjustment"],
    nohup: [],
    timeout: ["-k", "-s", "--kill-after", "--signal"],
    command: [],
    builtin: [],
    noglob: [],
    xargs: [
      "-n",
      "-I",
      "-P",
      "-d",
      "-L",
      "-s",
      "-a",
      "-E",
      "--max-args",
      "--max-procs",
      "--delimiter",
      "--arg-file",
      "--replace",
    ],
    stdbuf: ["-i", "-o", "-e", "--input", "--output", "--error"],
    caffeinate: ["-w", "-t"],
  };
  MAX_WRAPPER_DEPTH = 4;
  PROGRAM_GLOBAL_VALUE_FLAGS = {
    git: ["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"],
    gh: ["-R", "--repo"],
    docker: ["-H", "--host", "--context", "-c", "--config", "-l", "--log-level"],
    kubectl: ["-n", "--namespace", "--context", "--kubeconfig", "--cluster", "-o"],
    npm: ["--prefix", "-w", "--workspace"],
    cargo: ["--manifest-path", "--config", "-Z"],
    go: ["-C"],
    uv: ["--directory", "--project", "--python"],
  };
  TEST_SCOPES = ["runs_tests", "builds", "lints", "installs_packages", "serves_or_watches"];
  PROGRAM_CATEGORIES = [
    "python",
    "node",
    "shell_script",
    "other_runtime",
    "compiled_lang",
    "os_packages",
    "browser",
    "office",
    "typeset",
    "pdf",
    "ocr",
    "image",
    "audio_video",
    "archive",
    "file_change",
    "wait",
    "shell_word",
    "vcs",
    "github_cli",
    "network",
    "file_read",
    "file_search",
    "text_transform",
    "process_system",
    "container_infra",
    "db_client",
    "claude_cli",
    "other",
    ...TEST_SCOPES,
    "starts_background_job",
    "python_inline",
    "incomplete",
    "unparsed",
  ];
  CATEGORY_KIND_ALIASES = {
    vcs: "vcs",
    github_cli: "github_cli",
    network: "network",
    file_read: "file_read",
    file_search: "file_search",
    text_transform: "text_transform",
    fs_mutation: "file_change",
    shell_builtin: "shell_word",
    process_system: "process_system",
    container_infra: "container_infra",
    db_client: "db_client",
    claude_cli: "claude_cli",
  };
  PROGRAMS_BY_CATEGORY = {
    python: [
      "python",
      "ipython",
      "pip",
      "pipx",
      "uv",
      "uvx",
      "poetry",
      "pipenv",
      "pdm",
      "hatch",
      "conda",
      "mamba",
      "micromamba",
      "virtualenv",
      "pytest",
      "py.test",
      "tox",
      "nox",
      "coverage",
      "ruff",
      "mypy",
      "pyright",
      "black",
      "flake8",
      "pylint",
      "isort",
      "pre-commit",
      "jupyter",
      "uvicorn",
      "gunicorn",
      "streamlit",
      "flask",
      "pyinstaller",
      "ty",
      "basedpyright",
      "dmypy",
      "behave",
      "django-admin",
      "fastapi",
      "maturin",
    ],
    node: [
      "node",
      "bun",
      "deno",
      "tsx",
      "ts-node",
      "npm",
      "npx",
      "bunx",
      "yarn",
      "pnpm",
      "corepack",
      "tsc",
      "jest",
      "vitest",
      "mocha",
      "cypress",
      "eslint",
      "prettier",
      "biome",
      "stylelint",
      "vite",
      "webpack",
      "esbuild",
      "rollup",
      "parcel",
      "swc",
      "babel",
      "tsup",
      "tailwindcss",
      "next",
      "ng",
      "nuxt",
      "astro",
      "remix",
      "gatsby",
      "expo",
      "svelte-kit",
      "react-scripts",
      "vue-cli-service",
      "storybook",
      "nx",
      "turbo",
      "nodemon",
      "pm2",
      "http-server",
      "serve",
      "tsgo",
      "vue-tsc",
      "svelte-check",
      "oxlint",
      "knip",
      "ava",
      "jasmine",
      "karma",
      "tap",
      "nyc",
      "c8",
      "rspack",
      "rsbuild",
      "tsdown",
    ],
    shell_script: ["bash", "sh", "zsh", "dash", "ksh", "fish", "pwsh", "shellcheck"],
    other_runtime: [
      "ruby",
      "perl",
      "php",
      "Rscript",
      "R",
      "julia",
      "gem",
      "bundle",
      "rake",
      "rails",
      "rspec",
      "rubocop",
      "composer",
      "phpunit",
      "pest",
      "phpstan",
      "php-cs-fixer",
      "elixir",
      "mix",
    ],
    compiled_lang: [
      "gcc",
      "g++",
      "cc",
      "c++",
      "clang",
      "clang++",
      "ld",
      "make",
      "cmake",
      "ctest",
      "ninja",
      "meson",
      "bazel",
      "clang-format",
      "clang-tidy",
      "rustc",
      "cargo",
      "rustup",
      "rustfmt",
      "go",
      "gofmt",
      "golangci-lint",
      "java",
      "javac",
      "kotlin",
      "kotlinc",
      "scala",
      "scalac",
      "sbt",
      "mvn",
      "mvnw",
      "gradle",
      "gradlew",
      "swift",
      "swiftc",
      "xcodebuild",
      "dotnet",
      "msbuild",
      "nuget",
      "configure",
      "just",
      "task",
      "conan",
      "bazelisk",
      "zig",
      "dart",
      "flutter",
      "protoc",
      "buf",
      "wasm-pack",
      "valgrind",
      "cppcheck",
      "gotestsum",
      "ginkgo",
      "staticcheck",
      "ktlint",
      "swiftlint",
    ],
    os_packages: [
      "apt",
      "apt-get",
      "apt-cache",
      "dpkg",
      "apk",
      "brew",
      "dnf",
      "yum",
      "pacman",
      "snap",
      "rpm",
      "nix",
      "nix-shell",
      "nix-build",
      "nix-env",
    ],
    browser: [
      "chromium",
      "chromium-browser",
      "chrome",
      "google-chrome",
      "google-chrome-stable",
      "chrome-headless-shell",
      "headless_shell",
      "msedge",
      "firefox",
      "chromedriver",
      "geckodriver",
      "playwright",
      "puppeteer",
      "lighthouse",
      "mmdc",
    ],
    office: [
      "soffice",
      "soffice.bin",
      "libreoffice",
      "lowriter",
      "localc",
      "loimpress",
      "unoconv",
      "unoconvert",
      "unoserver",
    ],
    typeset: [
      "pandoc",
      "quarto",
      "markitdown",
      "extract-text",
      "latex",
      "pdflatex",
      "xelatex",
      "lualatex",
      "latexmk",
      "tectonic",
      "bibtex",
      "biber",
      "typst",
      "weasyprint",
      "asciidoctor",
      "mkdocs",
      "sphinx-build",
      "hugo",
    ],
    pdf: [
      "pdftotext",
      "pdftoppm",
      "pdftocairo",
      "pdftohtml",
      "pdfimages",
      "pdfinfo",
      "pdffonts",
      "pdfunite",
      "pdfseparate",
      "pdfdetach",
      "pdftk",
      "pdfgrep",
      "pdfcrop",
      "pdf2ps",
      "ps2pdf",
      "qpdf",
      "mutool",
      "gs",
      "img2pdf",
      "wkhtmltopdf",
    ],
    ocr: ["tesseract", "ocrmypdf"],
    image: [
      "convert",
      "magick",
      "identify",
      "mogrify",
      "composite",
      "montage",
      "gm",
      "vips",
      "vipsthumbnail",
      "exiftool",
      "cwebp",
      "dwebp",
      "optipng",
      "pngquant",
      "jpegoptim",
      "gifsicle",
      "inkscape",
      "rsvg-convert",
      "dot",
      "wkhtmltoimage",
    ],
    audio_video: [
      "ffmpeg",
      "ffprobe",
      "ffplay",
      "avconv",
      "sox",
      "lame",
      "flac",
      "mediainfo",
      "mkvmerge",
      "MP4Box",
      "yt-dlp",
      "whisper",
    ],
    archive: [
      "tar",
      "zip",
      "unzip",
      "zipinfo",
      "gzip",
      "gunzip",
      "zcat",
      "pigz",
      "bzip2",
      "bunzip2",
      "xz",
      "unxz",
      "zstd",
      "unzstd",
      "lz4",
      "brotli",
      "7z",
      "7za",
      "7zr",
      "unrar",
      "unar",
      "cpio",
    ],
    wait: ["sleep", "wait"],
    shell_word: [
      ":",
      "command",
      "builtin",
      "pushd",
      "popd",
      "shopt",
      "let",
      "shift",
      "return",
      "break",
      "continue",
      "umask",
      "hash",
      "jobs",
      "fg",
      "bg",
      "disown",
    ],
  };
  TEST_PROGRAMS_BY_SCOPE = {
    runs_tests: [
      "pytest",
      "py.test",
      "tox",
      "nox",
      "coverage",
      "jest",
      "vitest",
      "mocha",
      "cypress",
      "ctest",
      "rspec",
      "phpunit",
      "ava",
      "jasmine",
      "karma",
      "tap",
      "nyc",
      "c8",
      "behave",
      "pest",
      "gotestsum",
      "ginkgo",
    ],
    builds: [
      "gcc",
      "g++",
      "cc",
      "c++",
      "clang",
      "clang++",
      "ld",
      "cmake",
      "ninja",
      "meson",
      "rustc",
      "javac",
      "kotlinc",
      "scalac",
      "swiftc",
      "xcodebuild",
      "msbuild",
      "tsc",
      "webpack",
      "esbuild",
      "rollup",
      "parcel",
      "swc",
      "babel",
      "tsup",
      "tailwindcss",
      "pyinstaller",
      "sphinx-build",
      "tsgo",
      "rspack",
      "tsdown",
      "maturin",
      "configure",
      "protoc",
    ],
    lints: [
      "ruff",
      "mypy",
      "pyright",
      "black",
      "flake8",
      "pylint",
      "isort",
      "pre-commit",
      "eslint",
      "prettier",
      "biome",
      "stylelint",
      "clang-format",
      "clang-tidy",
      "rustfmt",
      "gofmt",
      "golangci-lint",
      "rubocop",
      "shellcheck",
      "ty",
      "basedpyright",
      "dmypy",
      "vue-tsc",
      "svelte-check",
      "oxlint",
      "knip",
      "phpstan",
      "php-cs-fixer",
      "cppcheck",
      "staticcheck",
      "ktlint",
      "swiftlint",
    ],
    installs_packages: ["virtualenv", "rustup", "corepack"],
    serves_or_watches: ["vite", "nodemon", "pm2", "http-server", "serve", "uvicorn", "gunicorn", "streamlit"],
  };
  PROGRAMS_BY_CATEGORY_ALIAS = PROGRAMS_BY_CATEGORY;
  PROGRAM_TO_CATEGORY = new Map(
    PROGRAM_CATEGORIES.flatMap((category) =>
      (PROGRAMS_BY_CATEGORY_ALIAS[category] ?? []).map((programName) => [programName, category]),
    ),
  );
  PROGRAM_TO_TEST_SCOPE = new Map(
    TEST_SCOPES.flatMap((testScope) =>
      TEST_PROGRAMS_BY_SCOPE[testScope].map((programName) => [programName, testScope]),
    ),
  );
  KNOWN_PROGRAM_NAMES = new Map(
    [...Object.values(PROGRAM_NAMES_BY_CLASS), ...Object.values(PROGRAMS_BY_CATEGORY)].flatMap((names) =>
      names.map((programName) => [programName, programName]),
    ),
  );
  BARE_SCRIPT_CATEGORIES = {
    runs_tests: ["test", "tests", "e2e"],
    builds: ["build", "compile", "bundle"],
    lints: ["lint", "typecheck", "type-check", "format", "check"],
    serves_or_watches: ["dev", "develop", "start", "serve", "server", "watch", "preview", "storybook"],
  };
  NPM_LIKE_RULES = {
    verbs: {
      installs_packages: [
        "install",
        "i",
        "ci",
        "add",
        "update",
        "upgrade",
        "up",
        "remove",
        "rm",
        "uninstall",
        "link",
        "rebuild",
        "dedupe",
        "prune",
      ],
      runs_tests: ["t"],
    },
    scriptAfter: ["run", "run-script"],
    commandAfter: ["exec", "dlx", "x"],
    verbMayBeScript: true,
    valueFlags: ["--prefix", "-w", "--workspace", "workspace", "-C", "--cwd", "--dir", "--filter", "-F"],
  };
  SCRIPT_RUNNER_RULES = {
    scriptAfter: ["run"],
    verbMayBeScript: true,
    verbIsTarget: true,
  };
  PYTHON_PACKAGE_RULES = {
    verbs: {
      installs_packages: [
        "install",
        "add",
        "update",
        "upgrade",
        "lock",
        "sync",
        "remove",
        "uninstall",
        "create",
        "env",
        "venv",
        "pip",
        "tool",
        "python",
        "inject",
      ],
      builds: ["build"],
    },
    commandAfter: ["run"],
    valueFlags: [
      "-n",
      "--name",
      "-p",
      "--prefix",
      "--cwd",
      "--directory",
      "--project",
      "--python",
      "--with",
      "--with-requirements",
      "--extra",
      "--group",
      "--env-file",
    ],
  };
  JVM_BUILD_RULES = {
    anywhere: {
      runs_tests: ["test", "verify", "check", "integration-test"],
      builds: ["compile", "package", "install", "build", "assemble", "jar", "bootJar"],
    },
    valueFlags: ["-x", "--exclude-task"],
  };
  OS_PACKAGE_RULES = {
    verbs: {
      installs_packages: [
        "install",
        "reinstall",
        "add",
        "update",
        "upgrade",
        "dist-upgrade",
        "full-upgrade",
        "remove",
        "purge",
        "autoremove",
      ],
    },
  };
  COVERAGE_VALUE_FLAGS = [
    "-r",
    "--reporter",
    "-x",
    "--exclude",
    "-n",
    "--include",
    "--branches",
    "--functions",
    "--lines",
    "--statements",
  ];
  TSC_RULES = {
    anywhere: {
      lints: ["--noEmit"],
      serves_or_watches: ["-w"],
    },
  };
  BAZEL_RULES = {
    verbs: {
      runs_tests: ["test", "coverage"],
      builds: ["build"],
    },
  };
  PROGRAM_RULES = {
    npm: NPM_LIKE_RULES,
    pnpm: NPM_LIKE_RULES,
    bun: NPM_LIKE_RULES,
    yarn: {
      ...NPM_LIKE_RULES,
      bare: "installs_packages",
    },
    npx: {
      runsTheRest: true,
      valueFlags: ["-p", "--package", "-c", "--call"],
    },
    bunx: {
      runsTheRest: true,
    },
    nx: SCRIPT_RUNNER_RULES,
    turbo: SCRIPT_RUNNER_RULES,
    vite: SCRIPT_RUNNER_RULES,
    next: SCRIPT_RUNNER_RULES,
    ng: SCRIPT_RUNNER_RULES,
    nuxt: SCRIPT_RUNNER_RULES,
    astro: SCRIPT_RUNNER_RULES,
    remix: SCRIPT_RUNNER_RULES,
    gatsby: SCRIPT_RUNNER_RULES,
    expo: SCRIPT_RUNNER_RULES,
    "svelte-kit": SCRIPT_RUNNER_RULES,
    "react-scripts": SCRIPT_RUNNER_RULES,
    "vue-cli-service": SCRIPT_RUNNER_RULES,
    storybook: SCRIPT_RUNNER_RULES,
    mkdocs: SCRIPT_RUNNER_RULES,
    hugo: SCRIPT_RUNNER_RULES,
    rspack: SCRIPT_RUNNER_RULES,
    rsbuild: SCRIPT_RUNNER_RULES,
    nyc: {
      runsTheRest: true,
      ownVerbs: ["report", "check-coverage", "instrument", "merge"],
      valueFlags: [
        ...COVERAGE_VALUE_FLAGS,
        "-e",
        "--extension",
        "-t",
        "--temp-dir",
        "--cwd",
        "--nycrc-path",
        "--report-dir",
        "-i",
        "--require",
      ],
    },
    c8: {
      runsTheRest: true,
      ownVerbs: ["report", "check-coverage"],
      valueFlags: [
        ...COVERAGE_VALUE_FLAGS,
        "-o",
        "--reports-dir",
        "--temp-directory",
        "-c",
        "--config",
        "--src",
      ],
    },
    node: {
      anywhere: {
        runs_tests: ["--test"],
      },
    },
    tsx: {
      verbs: {
        serves_or_watches: ["watch"],
      },
    },
    deno: {
      verbs: {
        runs_tests: ["test", "bench"],
        lints: ["lint", "fmt", "check"],
        installs_packages: ["install", "add", "cache"],
        builds: ["compile", "bundle"],
        serves_or_watches: ["serve"],
      },
      scriptAfter: ["task"],
    },
    tsc: TSC_RULES,
    tsgo: TSC_RULES,
    webpack: {
      verbs: {
        serves_or_watches: ["serve", "watch"],
      },
      anywhere: {
        serves_or_watches: ["-w"],
      },
    },
    playwright: {
      verbs: {
        runs_tests: ["test"],
        installs_packages: ["install", "install-deps"],
      },
    },
    pip: {
      verbs: {
        installs_packages: ["install", "uninstall", "download", "wheel"],
      },
    },
    uv: PYTHON_PACKAGE_RULES,
    poetry: PYTHON_PACKAGE_RULES,
    pipenv: PYTHON_PACKAGE_RULES,
    pdm: PYTHON_PACKAGE_RULES,
    hatch: PYTHON_PACKAGE_RULES,
    pipx: PYTHON_PACKAGE_RULES,
    conda: PYTHON_PACKAGE_RULES,
    mamba: PYTHON_PACKAGE_RULES,
    micromamba: PYTHON_PACKAGE_RULES,
    uvx: {
      runsTheRest: true,
      valueFlags: ["--from", "--with", "--python", "-p"],
    },
    jupyter: {
      verbs: {
        serves_or_watches: ["notebook", "lab", "server"],
      },
    },
    flask: {
      verbs: {
        serves_or_watches: ["run"],
      },
    },
    fastapi: {
      verbs: {
        serves_or_watches: ["dev", "run"],
      },
    },
    "django-admin": {
      verbs: {
        runs_tests: ["test"],
        serves_or_watches: ["runserver"],
      },
    },
    cargo: {
      verbs: {
        runs_tests: ["test", "nextest", "bench"],
        builds: ["build", "doc", "rustc"],
        lints: ["check", "clippy", "fmt"],
        installs_packages: ["install", "add", "update", "fetch"],
        serves_or_watches: ["watch"],
      },
      valueFlags: ["--manifest-path", "--config", "-Z"],
    },
    go: {
      verbs: {
        runs_tests: ["test"],
        builds: ["build", "generate"],
        lints: ["vet", "fmt"],
        installs_packages: ["get", "install", "mod"],
      },
      valueFlags: ["-C"],
    },
    dotnet: {
      verbs: {
        runs_tests: ["test"],
        builds: ["build", "publish", "pack"],
        lints: ["format"],
        installs_packages: ["restore", "add"],
      },
    },
    bazel: BAZEL_RULES,
    bazelisk: BAZEL_RULES,
    make: {
      bare: "builds",
      verbs: {
        builds: ["all", "install"],
        runs_tests: ["check"],
      },
      verbMayBeScript: true,
      verbIsTarget: true,
      valueFlags: ["-C", "-f", "-j"],
    },
    just: {
      verbMayBeScript: true,
      verbIsTarget: true,
      valueFlags: ["-f", "--justfile", "-d", "--working-directory"],
    },
    task: {
      verbMayBeScript: true,
      verbIsTarget: true,
      valueFlags: ["-t", "--taskfile", "-d", "--dir"],
    },
    mvn: JVM_BUILD_RULES,
    mvnw: JVM_BUILD_RULES,
    gradle: JVM_BUILD_RULES,
    gradlew: JVM_BUILD_RULES,
    sbt: JVM_BUILD_RULES,
    swift: {
      verbs: {
        runs_tests: ["test"],
        builds: ["build"],
      },
    },
    zig: {
      verbs: {
        runs_tests: ["test"],
        lints: ["fmt"],
        builds: ["build-exe", "build-lib", "build-obj", "cc", "c++"],
      },
      scriptAfter: ["build"],
      anywhere: {
        builds: ["build"],
      },
    },
    dart: {
      verbs: {
        runs_tests: ["test"],
        builds: ["compile"],
        lints: ["analyze", "format", "fix"],
        installs_packages: ["pub"],
      },
    },
    flutter: {
      verbs: {
        runs_tests: ["test", "drive"],
        builds: ["build"],
        lints: ["analyze"],
        installs_packages: ["pub", "upgrade", "precache"],
        serves_or_watches: ["run"],
      },
    },
    conan: {
      verbs: {
        runs_tests: ["test"],
        builds: ["build", "create"],
        installs_packages: ["install", "download"],
      },
    },
    buf: {
      verbs: {
        builds: ["build", "generate"],
        lints: ["lint", "format", "breaking"],
      },
    },
    "wasm-pack": {
      verbs: {
        runs_tests: ["test"],
        builds: ["build", "pack"],
      },
    },
    valgrind: {
      runsTheRest: true,
    },
    apt: OS_PACKAGE_RULES,
    "apt-get": OS_PACKAGE_RULES,
    apk: OS_PACKAGE_RULES,
    brew: OS_PACKAGE_RULES,
    dnf: OS_PACKAGE_RULES,
    yum: OS_PACKAGE_RULES,
    snap: OS_PACKAGE_RULES,
    gem: {
      verbs: {
        installs_packages: ["install", "update"],
      },
    },
    composer: {
      verbs: {
        installs_packages: ["install", "update", "require"],
      },
    },
    bundle: {
      verbs: {
        installs_packages: ["install", "update", "add"],
      },
      commandAfter: ["exec"],
    },
    rake: {
      verbs: {
        runs_tests: ["spec"],
      },
      verbMayBeScript: true,
      verbIsTarget: true,
    },
    rails: {
      verbs: {
        runs_tests: ["test", "t"],
        serves_or_watches: ["server", "s"],
      },
    },
    mix: {
      verbs: {
        runs_tests: ["test"],
        builds: ["compile", "release"],
        lints: ["format", "credo", "dialyzer"],
        installs_packages: ["deps.get", "deps.update", "local.hex", "local.rebar"],
        serves_or_watches: ["phx.server"],
      },
    },
  };
  PYTHON_MODULE_KINDS = {
    unittest: "runs_tests",
    doctest: "runs_tests",
    venv: "installs_packages",
    ensurepip: "installs_packages",
    "http.server": "serves_or_watches",
    build: "builds",
    compileall: "builds",
    py_compile: "builds",
  };
  PYTHON_TEST_MODULES = ["unittest", "doctest"];
  TEST_SCOPE_ORDER = [
    ...KNOWN_PROGRAM_NAMES.keys(),
    ...PYTHON_TEST_MODULES,
    "other",
    "none",
    "incomplete",
    "unparsed",
  ];
  PYTHON_WRAPPER_PROGRAMS = ["markitdown", "weasyprint", "ocrmypdf", "whisper"];
  PACKAGE_NAME_ALIASES = {
    "@playwright/test": "playwright",
    "@puppeteer/browsers": "puppeteer",
    "@mermaid-js/mermaid-cli": "mmdc",
    "@angular/cli": "ng",
    "@biomejs/biome": "biome",
  };
  EXTENSION_CATEGORIES = {
    py: "python",
    js: "node",
    mjs: "node",
    cjs: "node",
    ts: "node",
    sh: "shell_script",
    bash: "shell_script",
    rb: "other_runtime",
    pl: "other_runtime",
    php: "other_runtime",
  };
  WRAPPER_COMMAND_RULES = {
    ...WRAPPER_VALUE_FLAGS,
    exec: ["-a"],
    coproc: [],
    setsid: [],
    unbuffer: [],
    ionice: ["-c", "-n", "--class", "--classdata"],
    taskset: ["-c", "--cpu-list"],
    strace: ["-o", "-e", "-p", "-s"],
    parallel: ["-j", "--jobs"],
    "xvfb-run": [
      "-n",
      "-s",
      "-e",
      "-f",
      "-p",
      "-w",
      "--server-num",
      "--server-args",
      "--error-file",
      "--auth-file",
      "--wait",
    ],
  };
  SHELL_PROGRAMS = ["bash", "sh", "zsh", "dash", "ksh"];
  FIND_EXEC_FLAGS = ["-exec", "-execdir", "-ok", "-okdir"];
  BACKGROUNDING_PROGRAMS = ["nohup", "setsid"];
  NOOP_FLAGS = ["--version", "--help", "-v", "-V", "-h", "-n", "-q"];
  SERVE_FLAGS = ["--watch", "--watchAll", "--reload"];
  MAX_NESTING_DEPTH = 6;
  MAX_PROGRAM_NAMES = 24;
  MAX_SCRIPT_NESTING = 2;
  SCRIPT_CHAR_BUDGET = 2000;
  PARSE_TIME_BUDGET_MS = 20;
  TEST_SCOPE_OUTPUT_VALUES = [
    "whole",
    "unknown",
    "narrowed_to_folders",
    "narrowed",
    "changed_or_failed_only",
    "runs_no_tests",
  ];
  FLAG_EFFECT_KEYS = [
    "runs_no_tests",
    "changed_or_failed_only",
    "narrowed",
    "narrowed_to_folders",
    "takes_expression",
    "takes_value",
    "says_nothing",
  ];
  WHOLE_SUITE_OPERANDS = ["", ".", "test", "tests", "spec", "specs", "__tests__"];
  FOLDER_OPERAND_NAMES = ["src", "lib", "app", "apps", "packages", "e2e", "integration", "unit"];
  TEST_PATH_OR_NAME_RE = /\.\w+$|:\w/;
  JEST_LIKE_FLAG_RULES = {
    runs_no_tests: ["--listTests", "--list", "--showConfig", "--clearCache"],
    changed_or_failed_only: [
      "--onlyChanged",
      "-o",
      "--changedSince",
      "--changed",
      "--lastCommit",
      "--changedFilesWithAncestor",
      "--findRelatedTests",
      "--onlyFailures",
      "-f",
      "--last-failed",
      "--only-changed",
      "--affected",
    ],
    narrowed: [
      "-t",
      "--testNamePattern",
      "--testPathPattern",
      "--testPathPatterns",
      "--runTestsByPath",
      "--testMatch",
      "--testRegex",
      "--testFile",
      "--include",
      "-g",
      "--grep",
      "--shard",
      "--only",
      "--test-name-pattern",
      "--test-only",
      "--test-shard",
    ],
    takes_value: [
      "--prefix",
      "-w",
      "--workspace",
      "-C",
      "--cwd",
      "--dir",
      "--filter",
      "-F",
      "--loglevel",
      "-c",
      "--config",
      "--project",
      "--projects",
      "--selectProjects",
      "--ignoreProjects",
      "--root",
      "--rootDir",
      "--roots",
      "--reporter",
      "--reporters",
      "--outputFile",
      "--output",
      "--coverageDirectory",
      "--coverageReporters",
      "--coverageProvider",
      "--collectCoverageFrom",
      "--coverage-reporter",
      "--coverage-dir",
      "--setupFiles",
      "--setupFilesAfterEnv",
      "--env",
      "--environment",
      "--testEnvironment",
      "--tsconfig",
      "-r",
      "--require",
      "--import",
      "--loader",
      "--preload",
      "--maxWorkers",
      "--workers",
      "-j",
      "--pool",
      "--mode",
      "--browser",
      "--trace",
      "--exclude",
      "--testPathIgnorePatterns",
      "--grep-invert",
      "--test-skip-pattern",
      "--test-reporter",
      "--test-reporter-destination",
    ],
    says_nothing: [
      "--coverage",
      "--collectCoverage",
      "--ci",
      "--silent",
      "--verbose",
      "--quiet",
      "--run",
      "--watch",
      "--watchAll",
      "--passWithNoTests",
      "--pass-with-no-tests",
      "--forceExit",
      "--detectOpenHandles",
      "--runInBand",
      "--fully-parallel",
      "--bail",
      "--headed",
      "--ui",
      "--debug",
      "--update",
      "--updateSnapshot",
      "--colors",
      "--expand",
      "--json",
      "--all",
      "--test",
      "--if-present",
      "--recursive",
      "--experimental-vm-modules",
      "--experimental-strip-types",
      "--experimental-test-coverage",
    ],
  };
  TEST_TOOL_RULES = {
    flags: JEST_LIKE_FLAG_RULES,
    operands: "name_tests",
    bareOperands: "folders_by_form",
    wholeOperands: WHOLE_SUITE_OPERANDS,
  };
  NPM_TEST_RULES = {
    ...TEST_TOOL_RULES,
    verbs: {
      runs_no_tests: ["list"],
      changed_or_failed_only: ["related"],
      says_nothing: ["run", "watch", "dev", "bench"],
    },
  };
  NX_LIKE_TEST_RULES = {
    flags: JEST_LIKE_FLAG_RULES,
    operands: "name_tests_after_dashes",
    bareOperands: "folders_by_form",
    wholeOperands: WHOLE_SUITE_OPERANDS,
  };
  PYTEST_FLAG_RULES = {
    flags: {
      runs_no_tests: [
        "--collect-only",
        "--co",
        "--fixtures",
        "--fixtures-per-test",
        "--markers",
        "--setup-plan",
        "--setup-only",
        "--cache-show",
      ],
      changed_or_failed_only: ["--lf", "--last-failed", "--testmon", "--picked"],
      takes_expression: ["-k", "-m"],
      takes_value: [
        "-c",
        "--rootdir",
        "--confcutdir",
        "--basetemp",
        "-p",
        "-o",
        "--override-ini",
        "-n",
        "--numprocesses",
        "--dist",
        "--cov",
        "--cov-report",
        "--cov-config",
        "--junitxml",
        "--junit-xml",
        "--html",
        "--ignore",
        "--ignore-glob",
        "--deselect",
        "--tb",
        "-W",
        "--pythonwarnings",
        "--log-file",
        "--log-level",
        "--log-cli-level",
        "--color",
        "--capture",
        "--show-capture",
        "--import-mode",
        "--asyncio-mode",
        "--ds",
        "--lfnf",
        "--last-failed-no-failures",
        "-r",
      ],
      says_nothing: [
        "--ff",
        "--failed-first",
        "--nf",
        "--new-first",
        "--sw",
        "--stepwise",
        "--verbose",
        "--quiet",
        "--exitfirst",
        "--disable-warnings",
        "--showlocals",
        "--full-trace",
        "--strict-markers",
        "--strict-config",
        "--cache-clear",
        "--cov-branch",
        "--cov-append",
        "--forked",
        "--pdb",
        "--runxfail",
        "--doctest-modules",
        "--create-db",
        "--reuse-db",
        "--nomigrations",
        "--self-contained-html",
      ],
    },
    operands: "name_tests",
    bareOperands: "folders",
    wholeOperands: WHOLE_SUITE_OPERANDS,
  };
  MAVEN_FLAG_RULES = {
    flags: {
      runs_no_tests: ["-DskipTests", "-Dmaven.test.skip", "--dry-run"],
      narrowed: ["-Dtest", "-Dit.test", "--tests"],
    },
  };
  BAZEL_FLAG_RULES = {
    flags: {
      narrowed: ["--test_filter", "--test_tag_filters", "--test_size_filters", "--test_lang_filters"],
      says_nothing: [
        "--keep_going",
        "--nocache_test_results",
        "--cache_test_results",
        "--verbose_failures",
        "--build_tests_only",
        "--test_keep_going",
        "--sandbox_debug",
        "--announce_rc",
        "--collect_code_coverage",
        "--check_tests_up_to_date",
        "--test_verbose_timeout_warnings",
      ],
    },
    wholeOperands: [
      "//...",
      "//...:all",
      "//...:*",
      "//...:all-targets",
      "...",
      "...:all",
      "...:*",
      "...:all-targets",
    ],
    wholeNeedsOperand: true,
    lessThanPackage: /:(?!all$|all-targets$)\w|^@?[\w.-]*\/\/(?![^:]*\.\.\.$)[^:]*$/,
  };
  PHPUNIT_FLAG_RULES = {
    flags: {
      runs_no_tests: ["--list-tests", "--list-suites", "--list-groups"],
      changed_or_failed_only: ["--dirty"],
      narrowed: ["--filter", "--group", "--testsuite", "--covers", "--uses"],
      takes_value: [
        "-c",
        "--configuration",
        "--bootstrap",
        "-d",
        "--exclude-group",
        "--coverage-html",
        "--coverage-clover",
        "--log-junit",
        "--order-by",
        "--cache-directory",
      ],
      says_nothing: [
        "--testdox",
        "--stop-on-failure",
        "--stop-on-error",
        "--debug",
        "--verbose",
        "--display-warnings",
        "--display-deprecations",
        "--parallel",
      ],
    },
    operands: "name_tests",
    bareOperands: "folders",
    wholeOperands: WHOLE_SUITE_OPERANDS,
  };
  NO_FLAG_RULES = {};
  TEST_COMMAND_RULES = {
    npm: NPM_TEST_RULES,
    pnpm: NPM_TEST_RULES,
    yarn: NPM_TEST_RULES,
    vitest: NPM_TEST_RULES,
    bun: TEST_TOOL_RULES,
    node: TEST_TOOL_RULES,
    jest: TEST_TOOL_RULES,
    playwright: TEST_TOOL_RULES,
    "react-scripts": TEST_TOOL_RULES,
    "vue-cli-service": TEST_TOOL_RULES,
    nx: NX_LIKE_TEST_RULES,
    turbo: NX_LIKE_TEST_RULES,
    ng: NX_LIKE_TEST_RULES,
    mocha: {
      flags: {
        runs_no_tests: ["--dry-run"],
        narrowed: ["-g", "--grep", "-f", "--fgrep", "--spec"],
        takes_value: [
          "-t",
          "--timeout",
          "-s",
          "--slow",
          "-R",
          "--reporter",
          "-u",
          "--ui",
          "-r",
          "--require",
          "--import",
          "--loader",
          "--config",
          "--extension",
          "--file",
          "--ignore",
          "--exclude",
          "-n",
          "--node-option",
          "-j",
          "--jobs",
        ],
        says_nothing: [
          "--recursive",
          "--exit",
          "--bail",
          "--parallel",
          "--watch",
          "--check-leaks",
          "--forbid-only",
          "--color",
        ],
      },
      operands: "name_tests",
      bareOperands: "folders",
      wholeOperands: WHOLE_SUITE_OPERANDS,
    },
    cypress: {
      verbs: {
        runs_no_tests: ["open", "install", "verify", "info", "cache", "version", "help"],
      },
      flags: {
        narrowed: ["-s", "--spec"],
      },
    },
    deno: {
      flags: {
        runs_no_tests: ["--no-run"],
        narrowed: ["--filter"],
        takes_value: ["-c", "--config", "--import-map", "--reporter", "--junit-path", "--ignore"],
        says_nothing: [
          "--allow-all",
          "--allow-read",
          "--allow-write",
          "--allow-net",
          "--allow-env",
          "--allow-run",
          "--parallel",
          "--fail-fast",
          "--quiet",
          "--watch",
          "--doc",
          "--coverage",
          "--shuffle",
          "--trace-leaks",
          "--permit-no-files",
        ],
      },
      operands: "name_tests",
      bareOperands: "folders",
      wholeOperands: WHOLE_SUITE_OPERANDS,
    },
    pytest: PYTEST_FLAG_RULES,
    "py.test": PYTEST_FLAG_RULES,
    uv: PYTEST_FLAG_RULES,
    poetry: PYTEST_FLAG_RULES,
    pipenv: PYTEST_FLAG_RULES,
    pdm: PYTEST_FLAG_RULES,
    hatch: PYTEST_FLAG_RULES,
    coverage: {
      verbs: {
        runs_no_tests: [
          "report",
          "html",
          "xml",
          "json",
          "lcov",
          "annotate",
          "combine",
          "erase",
          "debug",
          "help",
        ],
      },
    },
    unittest: {
      verbs: {
        says_nothing: ["discover"],
      },
      flags: {
        narrowed: ["-k"],
        takes_value: ["-p", "--pattern", "-t", "--top-level-directory"],
        says_nothing: [
          "--start-directory",
          "--verbose",
          "--quiet",
          "--failfast",
          "--buffer",
          "--catch",
          "--locals",
        ],
      },
      operands: "name_tests",
      bareOperands: "folders_by_form",
      wholeOperands: WHOLE_SUITE_OPERANDS,
    },
    doctest: {
      operands: "name_tests",
    },
    go: {
      flags: {
        runs_no_tests: ["-list", "--list", "-c"],
        narrowed: ["-run", "--run"],
        takes_value: ["-coverpkg"],
      },
      wholeOperands: ["..."],
      wholeNeedsOperand: true,
      lessThanPackage: /\.go$/,
    },
    cargo: {
      verbs: {
        runs_no_tests: ["list"],
        says_nothing: ["run"],
      },
      verbsOnlyAfter: "nextest",
      flags: {
        runs_no_tests: ["--no-run", "--list"],
        narrowed_to_folders: ["-p", "--package"],
        narrowed: [
          "--test",
          "--lib",
          "--doc",
          "--bin",
          "--bins",
          "--example",
          "--examples",
          "--bench",
          "--benches",
          "--ignored",
          "--partition",
        ],
        takes_expression: ["-E", "--filter-expr", "--filterset"],
        takes_value: [
          "--manifest-path",
          "--config",
          "-Z",
          "--features",
          "-F",
          "--target",
          "--target-dir",
          "--profile",
          "-P",
          "--cargo-profile",
          "--color",
          "--message-format",
          "--exclude",
          "--skip",
          "--format",
          "-j",
          "--jobs",
          "--test-threads",
          "--run-ignored",
          "--failure-output",
          "--success-output",
          "--status-level",
          "--final-status-level",
        ],
        says_nothing: [
          "--workspace",
          "--all",
          "--all-features",
          "--all-targets",
          "--release",
          "--tests",
          "--exact",
          "--nocapture",
          "--show-output",
          "--include-ignored",
          "--fail-fast",
          "--quiet",
          "--verbose",
          "--locked",
          "--offline",
          "--frozen",
        ],
      },
      operands: "name_tests",
    },
    mvn: MAVEN_FLAG_RULES,
    mvnw: MAVEN_FLAG_RULES,
    gradle: MAVEN_FLAG_RULES,
    gradlew: MAVEN_FLAG_RULES,
    sbt: MAVEN_FLAG_RULES,
    dotnet: {
      flags: {
        runs_no_tests: ["-t", "--list-tests"],
        narrowed: ["--filter"],
      },
    },
    bazel: BAZEL_FLAG_RULES,
    bazelisk: BAZEL_FLAG_RULES,
    make: NO_FLAG_RULES,
    rake: NO_FLAG_RULES,
    just: {
      operands: "go_to_recipe",
    },
    task: {
      operands: "go_to_recipe",
    },
    ctest: {
      flags: {
        runs_no_tests: ["-N", "--show-only"],
        changed_or_failed_only: ["--rerun-failed"],
        narrowed: ["-R", "--tests-regex", "-L", "--label-regex", "-I", "--tests-information"],
      },
    },
    swift: {
      verbs: {
        runs_no_tests: ["list"],
      },
      flags: {
        runs_no_tests: ["--list-tests", "-l"],
        narrowed: ["--filter"],
      },
    },
    rspec: {
      flags: {
        runs_no_tests: ["--dry-run"],
        changed_or_failed_only: ["--only-failures", "--next-failure", "-n"],
        narrowed: ["-e", "--example", "-E", "--example-matches", "-P", "--pattern"],
        takes_expression: ["-t", "--tag"],
        takes_value: [
          "-f",
          "--format",
          "-o",
          "--out",
          "-r",
          "--require",
          "-I",
          "-O",
          "--options",
          "--order",
          "--default-path",
          "--exclude-pattern",
        ],
        says_nothing: ["--fail-fast", "--color", "--backtrace", "--profile", "--warnings", "--bisect"],
      },
      operands: "name_tests",
      bareOperands: "folders",
      wholeOperands: WHOLE_SUITE_OPERANDS,
    },
    phpunit: PHPUNIT_FLAG_RULES,
    pest: PHPUNIT_FLAG_RULES,
  };
  HELP_FLAGS = ["--help", "-h", "--version"];
  ARG_FEEDING_PROGRAMS = ["xargs", "parallel"];
  ENV_ASSIGNMENT_RE = /^[A-Za-z_]\w*=/;
  UNPARSED_COMMAND_INFO = {
    bash_command_class: lit("unparsed"),
    bash_argv0: lit("other"),
    bash_last_argv0: lit("other"),
    bash_command_kinds: lit("unparsed"),
    bash_programs: lit("unparsed"),
    has_pipe: false,
    has_redirect: false,
    has_chain: false,
    has_subshell: false,
    has_heredoc: false,
    simple_command_count: 0,
  };
  CHAIN_OPERATORS = new Set([
    "&&",
    "||",
    ";",
    "&",
    `
`,
  ]);
  SUBSHELL_NODE_TYPES = new Set(["subshell", "command_substitution", "process_substitution"]);
  HARMLESS_REDIRECT_RE = /^\d*>&\d+$|^&?\d*>{1,2}\s*\/dev\/null$/;
});
//@ chunk-fym4r1th.js:37722-38121 placement
/**
 * 遍历语法树收集命令形状：各简单命令，以及是否有管道、重定向、heredoc、链式/后台、子 shell。
 */
function collectCommandShape(node, shape) {
  switch (node.type) {
    case "command":
      shape.commands.push(node);
      break;
    case "pipeline":
      shape.has_pipe = true;
      break;
    case "file_redirect":
      if (!HARMLESS_REDIRECT_RE.test(node.text.trim())) shape.has_redirect = true;
      break;
    case "heredoc_redirect":
    case "herestring_redirect":
      shape.has_heredoc = true;
      break;
    default:
      if (CHAIN_OPERATORS.has(node.type)) {
        shape.has_chain = true;
        shape.has_background_job ||= node.type === "&";
      } else if (SUBSHELL_NODE_TYPES.has(node.type)) shape.has_subshell = true;
  }
  for (let child of node.children) collectCommandShape(child, shape);
}
//@ chunk-fym4r1th.js:38121-38188 placement
/**
 * 取程序名的最后一段（去掉目录部分）。
 */
function baseNameOfProgram(program) {
  let index = program.lastIndexOf("/");
  return index >= 0 ? program.slice(index + 1) : program;
}
//@ chunk-fym4r1th.js:38188-38325 placement
function normalizeProgramName(program) {
  let baseName = baseNameOfProgram(program);
  return (
    (Object.hasOwn(PROGRAM_ALIASES, baseName) ? PROGRAM_ALIASES[baseName] : undefined) ??
    (/^python[0-9.]+$/.test(baseName) ? "python" : /^pip[0-9.]+$/.test(baseName) ? "pip" : baseName)
  );
}
//@ chunk-fym4r1th.js:38325-38413 placement
/**
 * 按规范化后的程序名查出类别与 argv0 记录。
 */
function lookupProgramCategory(program) {
  if (program === undefined) return;
  let normalizedName = normalizeProgramName(program);
  return Object.hasOwn(PROGRAM_CLASS_BY_NAME, normalizedName)
    ? PROGRAM_CLASS_BY_NAME[normalizedName]
    : undefined;
}
//@ chunk-fym4r1th.js:38413-38532 placement
function stripLeadingWrappers(command) {
  let argv = command.trim().split(/\s+/).filter(Boolean);
  while (argv.length > 0 && ENV_ASSIGNMENT_RE.test(argv[0])) argv = argv.slice(1);
  return skipWrapperCommands(argv, WRAPPER_VALUE_FLAGS);
}
//@ chunk-fym4r1th.js:38532-38937 placement
/**
 * 跳过 argv 开头的包装命令（timeout、nice 等）及其选项与参数（有次数上限），返回实际执行的命令部分。
 */
function skipWrapperCommands(argv, valueFlagsByProgram) {
  let remaining = argv;
  for (let j = 0; j < MAX_WRAPPER_DEPTH; j++) {
    let programName = remaining[0] === undefined ? undefined : baseNameOfProgram(remaining[0]);
    let valueFlags =
      programName !== undefined && Object.hasOwn(valueFlagsByProgram, programName)
        ? valueFlagsByProgram[programName]
        : undefined;
    if (valueFlags === undefined || remaining.length < 2) break;
    let nextIdx = 1;
    while (nextIdx < remaining.length) {
      let arg = remaining[nextIdx];
      if (arg === "--") {
        nextIdx++;
        break;
      }
      if (valueFlags.includes(arg)) nextIdx += 2;
      else if (arg.startsWith("-") || ENV_ASSIGNMENT_RE.test(arg)) nextIdx++;
      else if ((programName === "timeout" || programName === "nice") && /^[0-9.]+[smhd]?$/.test(arg))
        nextIdx++;
      else break;
    }
    if (nextIdx >= remaining.length) break;
    remaining = remaining.slice(nextIdx);
  }
  return remaining;
}
//@ chunk-fym4r1th.js:38937-39102 placement
function nextOperand(argv, from, valueFlags) {
  let idx = from;
  while (idx < argv.length) {
    let arg = argv[idx];
    if (valueFlags.includes(arg)) idx += 2;
    else if (arg.startsWith("-")) idx++;
    else
      return {
        token: arg,
        index: idx,
      };
  }
  return {
    token: undefined,
    index: idx,
  };
}
//@ chunk-fym4r1th.js:39102-39404 placement
/**
 * 对已知程序取子命令分类（gh 还取第二级子命令），不在列表中的记为 other。
 */
function classifySubcommand(argv0, argv) {
  if (argv0 === undefined || !Object.hasOwn(SUBCOMMANDS_BY_PROGRAM, argv0)) return {};
  let subcommands = SUBCOMMANDS_BY_PROGRAM[argv0];
  let valueFlags = PROGRAM_GLOBAL_VALUE_FLAGS[argv0] ?? [];
  let operand = nextOperand(argv, 1, valueFlags);
  let found = subcommands.find((name) => name === operand.token);
  let fields = {
    bash_subcommand: found !== undefined ? fromEnum(found) : lit("other"),
  };
  if (argv0 === "gh" && found !== undefined) {
    let secondOperand = nextOperand(argv, operand.index + 1, valueFlags);
    let found = GH_SUBCOMMANDS.find((name) => name === secondOperand.token);
    fields.bash_subcommand2 = found !== undefined ? fromEnum(found) : lit("other");
  }
  return fields;
}
//@ chunk-fym4r1th.js:39404-39553 placement
function normalizePackageName(spec) {
  let index = spec.indexOf("@", spec.lastIndexOf("/") + 2);
  let packageName = index < 0 ? spec : spec.slice(0, index);
  if (!packageName.startsWith("@")) return normalizeProgramName(packageName);
  return Object.hasOwn(PACKAGE_NAME_ALIASES, packageName) ? PACKAGE_NAME_ALIASES[packageName] : "";
}
//@ chunk-fym4r1th.js:39553-39655 placement
function nextNonAssignmentOperand(argv, from, valueFlags) {
  let operand = nextOperand(argv, from, valueFlags);
  while (operand.token !== undefined && ENV_ASSIGNMENT_RE.test(operand.token))
    operand = nextOperand(argv, operand.index + 1, valueFlags);
  return operand;
}
//@ chunk-fym4r1th.js:39655-39710 placement
/**
 * 在测试范围表里找第一个满足谓词的范围名。
 */
function findScopeForPredicate(record, predicate) {
  return record && TEST_SCOPES.find((scope) => record[scope]?.some(predicate));
}
//@ chunk-fym4r1th.js:39710-39830 placement
function matchKnownScriptPrefix(token) {
  return token === undefined
    ? undefined
    : findScopeForPredicate(
        BARE_SCRIPT_CATEGORIES,
        (prefix) =>
          token.startsWith(prefix) &&
          (token.length === prefix.length || ":-_".includes(token[prefix.length])),
      );
}
//@ chunk-fym4r1th.js:39830-39889 placement
/**
 * 在选项效果表里找该选项对应的效果名。
 */
function findFlagEffect(record, effect) {
  return record && FLAG_EFFECT_KEYS.find((key) => record[key]?.includes(effect));
}
//@ chunk-fym4r1th.js:39889-41456 placement
function classifyTestCommand(program, argv, startIdx, fedMoreWords) {
  let rule = Object.hasOwn(TEST_COMMAND_RULES, program) ? TEST_COMMAND_RULES[program] : undefined;
  let isChangedOrFailedOnly = false;
  let isNarrowed = false;
  let isNarrowedToFolders = false;
  let isUnknown = rule === undefined || fedMoreWords;
  let hasWholeOperand = false;
  let isLessThanPackage = false;
  let verbsAllowed = rule?.verbsOnlyAfter === undefined || rule.verbsOnlyAfter === argv[startIdx - 1];
  let sawDashes = false;
  let previousWasOption = false;
  for (let idx = startIdx; idx < argv.length; idx++) {
    let arg = argv[idx];
    let previousOption = previousWasOption;
    previousWasOption = false;
    if (/^\d+$/.test(arg)) continue;
    let effect;
    if (arg.length > 1 && arg.startsWith("-")) {
      let index = arg.indexOf("=");
      let flagName = index < 0 ? arg : arg.slice(0, index);
      let flagValue = index < 0 ? argv[idx + 1] : arg.slice(index + 1);
      effect = HELP_FLAGS.includes(flagName) ? "runs_no_tests" : findFlagEffect(rule?.flags, flagName);
      if (index >= 0 && flagValue === "false") effect = "says_nothing";
      else if (effect === "takes_expression")
        effect = /^['"]?(not |~|!)/.test(flagValue ?? "") ? "takes_value" : "narrowed";
      if (effect !== undefined && effect !== "says_nothing" && index < 0 && !flagValue?.startsWith("-"))
        idx++;
      sawDashes ||= arg === "--";
      previousWasOption = effect === undefined && index < 0 && /^--(?!no-)[^-]/.test(arg);
    } else {
      effect = verbsAllowed ? findFlagEffect(rule?.verbs, arg) : undefined;
      verbsAllowed = false;
    }
    if (effect === "runs_no_tests") return "runs_no_tests";
    isChangedOrFailedOnly ||= effect === "changed_or_failed_only";
    isNarrowed ||= effect === "narrowed";
    isNarrowedToFolders ||= effect === "narrowed_to_folders";
    if (effect !== undefined || arg.startsWith("-")) continue;
    let program = arg.replace(/^\.\//, "").replace(/\/$/, "");
    if (rule?.wholeOperands?.includes(program)) hasWholeOperand = true;
    else if (ENV_ASSIGNMENT_RE.test(arg)) isUnknown ||= !argv[idx - 1].startsWith("-");
    else if (/^[$`]|\*|^\{\}$/.test(arg) || rule?.operands === "go_to_recipe") isUnknown = true;
    else if (rule?.operands === "name_tests" || (rule?.operands === "name_tests_after_dashes" && sawDashes)) {
      let isNamedName =
        previousOption || fedMoreWords || (rule.wholeOperands?.includes(baseNameOfProgram(program)) ?? false);
      let isFolderName =
        !TEST_PATH_OR_NAME_RE.test(arg) &&
        (rule.bareOperands === "folders" ||
          (rule.bareOperands === "folders_by_form" &&
            (arg.includes("/") || FOLDER_OPERAND_NAMES.includes(program))));
      isUnknown ||= isNamedName;
      isNarrowedToFolders ||= !isNamedName && isFolderName;
      isNarrowed ||= !isNamedName && !isFolderName;
    } else if (rule?.lessThanPackage?.test(program)) isLessThanPackage ||= !previousOption;
  }
  if (isChangedOrFailedOnly) return "changed_or_failed_only";
  if (isNarrowed) return "narrowed";
  if (isNarrowedToFolders) return "narrowed_to_folders";
  if (isUnknown) return "unknown";
  if (!rule?.wholeNeedsOperand || hasWholeOperand) return "whole";
  return isLessThanPackage ? "narrowed" : "narrowed_to_folders";
}
//@ chunk-fym4r1th.js:41456-41852 placement
/**
 * 对解析出的每条命令去掉赋值与重定向、解开引号后进行分类，并记录是否启动后台任务。
 */
function classifyParsedCommands(shape, result) {
  if (shape.has_background_job) result.kinds.add("starts_background_job");
  for (let command of shape.commands) {
    let words = [];
    for (let { type, text } of command.children) {
      if (type === "variable_assignment" || type.endsWith("_redirect")) continue;
      let quoteChar = text.length >= 2 && text.at(-1) === text[0] ? text[0] : "";
      words.push(
        quoteChar === "'"
          ? text.slice(1, -1)
          : quoteChar === '"'
            ? text.slice(1, -1).replace(/\\(["\\$`])/g, "$1")
            : text.startsWith("\\")
              ? text.slice(1)
              : text,
      );
    }
    result.fedMoreWords = false;
    classifyShellCommand(words, result, 0);
  }
}
//@ chunk-fym4r1th.js:41852-42142 placement
function classifyScriptText(text, state) {
  state.scriptTextDeadline ??= performance.now() + PARSE_TIME_BUDGET_MS;
  let max = Math.max(0, state.scriptTextDeadline - performance.now());
  state.scriptTextCharsLeft -= text.length;
  let shape =
    state.scriptTextDepth < MAX_SCRIPT_NESTING && state.scriptTextCharsLeft >= 0
      ? parseCommandShape(text, max)
      : null;
  if (!shape) {
    state.gaveUp = true;
    return;
  }
  state.scriptTextDepth++;
  classifyParsedCommands(shape, state);
  state.scriptTextDepth--;
}
//@ chunk-fym4r1th.js:42142-42424 placement
function classifyShellInvocation(argv, state) {
  for (let j = 1; j < argv.length; j++) {
    let arg = argv[j];
    if (/^-[A-Za-z]+$/.test(arg) && arg.includes("c")) {
      let scriptText = argv[j + 1] === "--" ? argv[j + 2] : argv[j + 1];
      if (scriptText) {
        classifyScriptText(scriptText, state);
        return;
      }
      break;
    }
    if (/^[-+][A-Za-z]*[oO]$|^--(rcfile|init-file)$/.test(arg)) j++;
    else if (!arg.startsWith("-")) break;
  }
  state.kinds.add("shell_script");
}
//@ chunk-fym4r1th.js:42424-43010 placement
/**
 * 分类 python 调用：-m 模块按已知模块表归类（含测试框架），-c 为内联代码，其他递归分类；--version/-h 不计。
 */
function classifyPythonInvocation(argv, state, depth) {
  for (let j = 1; j < argv.length && argv[j] !== "-"; j++) {
    let arg = argv[j];
    if (!arg.startsWith("-") || /^--(version|help)/.test(arg)) return;
    let flagIdx = arg.startsWith("--") ? -1 : arg.search(/[Vh?cmWX]/);
    let flag = arg[flagIdx];
    let sliced = arg.slice(flagIdx + 1);
    if (flag === "V" || flag === "h" || flag === "?") return;
    if (flag === "c") break;
    if (flag === "m") {
      let rest = sliced ? [sliced, ...argv.slice(j + 1)] : argv.slice(j + 1);
      let moduleName = rest[0] ?? "";
      if (Object.hasOwn(PYTHON_MODULE_KINDS, moduleName)) {
        state.kinds.add(PYTHON_MODULE_KINDS[moduleName]);
        let program = PYTHON_TEST_MODULES.find((name) => name === moduleName);
        if (program !== undefined) {
          state.programs.add(program);
          state.testScopes.add(classifyTestCommand(program, rest, 1, state.fedMoreWords));
        }
      } else if (PYTHON_WRAPPER_PROGRAMS.includes(moduleName)) classifyShellCommand(rest, state, depth + 1);
      else classifyShellCommand(rest, state, depth + 1, "python");
      return;
    }
    if ((flag === "W" || flag === "X") && !sliced) j++;
  }
  state.kinds.add("python_inline");
}
//@ chunk-fym4r1th.js:43010-44872 placement
function classifyShellCommand(argv, state, depth, expectedCategory, verbIsTarget) {
  if (depth > MAX_NESTING_DEPTH) state.gaveUp = true;
  if (state.gaveUp) return;
  let { kinds, programs } = state;
  if (argv[0] === "command" && /^-[vV]$/.test(argv[1] ?? "")) {
    kinds.add("shell_word");
    programs.add("command");
    return;
  }
  let rest = skipWrapperCommands(argv, WRAPPER_COMMAND_RULES);
  if (rest[0] === undefined) return;
  let program = normalizePackageName(rest[0]);
  let category = PROGRAM_TO_CATEGORY.get(program);
  if (expectedCategory !== undefined && category !== expectedCategory && category !== "browser") return;
  if (!verbIsTarget) programs.add(KNOWN_PROGRAM_NAMES.get(program) ?? "other");
  let mapped = argv.slice(0, argv.length - rest.length).map(baseNameOfProgram);
  if (program === "disown" || mapped.some((word) => BACKGROUNDING_PROGRAMS.includes(word)))
    kinds.add("starts_background_job");
  state.fedMoreWords ||= mapped.some((word) => ARG_FEEDING_PROGRAMS.includes(word));
  if (SHELL_PROGRAMS.includes(program)) {
    classifyShellInvocation(rest, state);
    return;
  }
  let evalText = program === "eval" ? rest.slice(1).join(" ").trim() : "";
  if (evalText) {
    classifyScriptText(evalText, state);
    return;
  }
  if (program === "find") {
    for (let idx = 1; idx < rest.length; idx++)
      if (FIND_EXEC_FLAGS.includes(rest[idx])) {
        let execEnd = idx + 1;
        while (execEnd < rest.length && rest[execEnd] !== ";" && rest[execEnd] !== "+") execEnd++;
        classifyShellCommand(rest.slice(idx + 1, execEnd), state, depth + 1);
        idx = execEnd;
      }
  }
  if (category === undefined) {
    let commandClass = lookupProgramCategory(program)?.commandClass;
    let index = program.lastIndexOf(".");
    let extension = index > 0 ? program.slice(index + 1) : "";
    kinds.add(
      (commandClass && CATEGORY_KIND_ALIASES[commandClass]) ??
        (Object.hasOwn(EXTENSION_CATEGORIES, extension) ? EXTENSION_CATEGORIES[extension] : "other"),
    );
    return;
  }
  kinds.add(category);
  if (program === "python") classifyPythonInvocation(rest, state, depth);
  else if (program === "coverage" && rest[1] === "run") classifyPythonInvocation(rest.slice(1), state, depth);
  let rules = Object.hasOwn(PROGRAM_RULES, program) ? PROGRAM_RULES[program] : {};
  let valueFlags = rules.valueFlags ?? [];
  let firstOperand = nextNonAssignmentOperand(rest, 1, valueFlags);
  let secondOperand = nextNonAssignmentOperand(rest, firstOperand.index + 1, valueFlags);
  if (firstOperand.token !== undefined && rules.ownVerbs?.includes(firstOperand.token)) return;
  let scopeForPredicate = findScopeForPredicate(rules.verbs, (verb) => verb === firstOperand.token);
  let testStartIdx = firstOperand.index + 1;
  if (rules.runsTheRest) classifyShellCommand(rest.slice(firstOperand.index), state, depth + 1);
  else if (firstOperand.token === undefined) {
    if (!NOOP_FLAGS.some((flag) => rest.includes(flag, 1))) scopeForPredicate = rules.bare;
  } else if (rules.scriptAfter?.includes(firstOperand.token)) {
    scopeForPredicate = matchKnownScriptPrefix(secondOperand.token);
    testStartIdx = secondOperand.index + 1;
  } else if (rules.commandAfter?.includes(firstOperand.token)) {
    scopeForPredicate = matchKnownScriptPrefix(secondOperand.token);
    testStartIdx = secondOperand.index + 1;
    if (scopeForPredicate === undefined) {
      classifyShellCommand(rest.slice(secondOperand.index), state, depth + 1);
      return;
    }
  } else if (scopeForPredicate === undefined && rules.verbMayBeScript) {
    scopeForPredicate = matchKnownScriptPrefix(firstOperand.token);
    if (scopeForPredicate === undefined)
      classifyShellCommand(rest.slice(firstOperand.index), state, depth + 1, category, rules.verbIsTarget);
  }
  if (scopeForPredicate === undefined) {
    scopeForPredicate =
      findScopeForPredicate(rules.anywhere, (word) =>
        rest.some((arg, idx) => idx > 0 && arg === word && !valueFlags.includes(rest[idx - 1])),
      ) ?? PROGRAM_TO_TEST_SCOPE.get(program);
    testStartIdx = 1;
  }
  if (scopeForPredicate !== undefined) kinds.add(scopeForPredicate);
  if (
    scopeForPredicate === "runs_tests" &&
    !rules.runsTheRest &&
    !(program === "coverage" && rest[1] === "run")
  )
    state.testScopes.add(classifyTestCommand(program, rest, testStartIdx, state.fedMoreWords));
  if (SERVE_FLAGS.some((flag) => rest.includes(flag, 1))) kinds.add("serves_or_watches");
}
//@ chunk-fym4r1th.js:44872-45117 placement
function parseCommandShape(text, timeoutMs) {
  if (!text || text.length > SPLIT_MAX_LEN) return null;
  let tree;
  try {
    tree = getParserModule()?.parse(text, timeoutMs) ?? null;
  } catch {
    tree = null;
  }
  if (!tree) return null;
  let shape = {
    commands: [],
    has_background_job: false,
    has_pipe: false,
    has_redirect: false,
    has_chain: false,
    has_subshell: false,
    has_heredoc: false,
  };
  collectCommandShape(tree, shape);
  return shape;
}
//@ chunk-fym4r1th.js:45117-46066 placement
function classifyBashCommand(command) {
  let shape = parseCommandShape(command);
  if (!shape) return UNPARSED_COMMAND_INFO;
  let firstWords = stripLeadingWrappers(shape.commands[0]?.text ?? "");
  let programCategory = lookupProgramCategory(firstWords[0]);
  let programCategory_2 = lookupProgramCategory(stripLeadingWrappers(shape.commands.at(-1)?.text ?? "")[0]);
  let state = {
    kinds: new Set(),
    programs: new Set(),
    testScopes: new Set(),
    fedMoreWords: false,
    scriptTextDepth: 0,
    scriptTextCharsLeft: SCRIPT_CHAR_BUDGET,
    scriptTextDeadline: undefined,
    gaveUp: false,
  };
  classifyParsedCommands(shape, state);
  if (state.kinds.size === 0) state.kinds.add("shell_word");
  return {
    bash_command_class: programCategory !== undefined ? fromEnum(programCategory.commandClass) : lit("other"),
    bash_argv0: programCategory !== undefined ? fromEnum(programCategory.argv0) : lit("other"),
    bash_last_argv0: programCategory_2 !== undefined ? fromEnum(programCategory_2.argv0) : lit("other"),
    ...classifySubcommand(programCategory?.argv0, firstWords),
    bash_command_kinds: state.gaveUp ? lit("incomplete") : fromEnumArr([...state.kinds]),
    bash_programs:
      state.gaveUp || state.programs.size > MAX_PROGRAM_NAMES
        ? lit("incomplete")
        : state.programs.size === 0
          ? lit("none")
          : fromEnumArr([...state.programs]),
    ...(!state.gaveUp &&
      state.kinds.has("runs_tests") && {
        bash_test_scope: fromEnum(
          TEST_SCOPE_OUTPUT_VALUES.find((scope) => state.testScopes.has(scope)) ?? "unknown",
        ),
      }),
    has_pipe: shape.has_pipe,
    has_redirect: shape.has_redirect,
    has_chain: shape.has_chain,
    has_subshell: shape.has_subshell,
    has_heredoc: shape.has_heredoc,
    simple_command_count: shape.commands.length,
  };
}
export { classifyBashCommand, PROGRAM_CATEGORIES };
