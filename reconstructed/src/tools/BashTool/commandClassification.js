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

/**
 * Bash 命令分类表：按命令名/子命令把 shell 命令归入 vcs、github_cli、network、包管理、测试等类别，用于遥测与权限提示。
 */
//@ chunk-fym4r1th.js:11663-37722 placement
var COMMAND_CLASSES = [
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
  ],
  ae = {
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
  },
  fromEntries = Object.fromEntries(
    COMMAND_CLASSES.flatMap((e) =>
      (Object.hasOwn(ae, e) ? ae[e] : []).map((n) => [n, { argv0: n, commandClass: e }]),
    ),
  ),
  keys = Object.keys(fromEntries),
  ve = {
    python3: "python",
    python2: "python",
    pip3: "pip",
    nodejs: "node",
    gmake: "make",
    gsed: "sed",
    ggrep: "grep",
    ".": "source",
  },
  we = {
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
  },
  ft = [
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
  ],
  Fe = {
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
  },
  ht = 4,
  gt = {
    git: ["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"],
    gh: ["-R", "--repo"],
    docker: ["-H", "--host", "--context", "-c", "--config", "-l", "--log-level"],
    kubectl: ["-n", "--namespace", "--context", "--kubeconfig", "--cluster", "-o"],
    npm: ["--prefix", "-w", "--workspace"],
    cargo: ["--manifest-path", "--config", "-Z"],
    go: ["-C"],
    uv: ["--directory", "--project", "--python"],
  },
  ue = ["runs_tests", "builds", "lints", "installs_packages", "serves_or_watches"],
  Kbn = [
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
    ...ue,
    "starts_background_job",
    "python_inline",
    "incomplete",
    "unparsed",
  ],
  _t = {
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
  },
  je = {
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
  },
  bt = {
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
  },
  yt = je,
  kt = new Map(Kbn.flatMap((e) => (yt[e] ?? []).map((s) => [s, e]))),
  vt = new Map(ue.flatMap((e) => bt[e].map((s) => [s, e]))),
  We = new Map([...Object.values(ae), ...Object.values(je)].flatMap((e) => e.map((s) => [s, s]))),
  wt = {
    runs_tests: ["test", "tests", "e2e"],
    builds: ["build", "compile", "bundle"],
    lints: ["lint", "typecheck", "type-check", "format", "check"],
    serves_or_watches: ["dev", "develop", "start", "serve", "server", "watch", "preview", "storybook"],
  },
  X = {
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
    verbMayBeScript: !0,
    valueFlags: ["--prefix", "-w", "--workspace", "workspace", "-C", "--cwd", "--dir", "--filter", "-F"],
  },
  C = { scriptAfter: ["run"], verbMayBeScript: !0, verbIsTarget: !0 },
  D = {
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
  },
  K = {
    anywhere: {
      runs_tests: ["test", "verify", "check", "integration-test"],
      builds: ["compile", "package", "install", "build", "assemble", "jar", "bootJar"],
    },
    valueFlags: ["-x", "--exclude-task"],
  },
  W = {
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
  },
  Se = [
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
  ],
  xe = { anywhere: { lints: ["--noEmit"], serves_or_watches: ["-w"] } },
  Te = { verbs: { runs_tests: ["test", "coverage"], builds: ["build"] } },
  Ae = {
    npm: X,
    pnpm: X,
    bun: X,
    yarn: { ...X, bare: "installs_packages" },
    npx: { runsTheRest: !0, valueFlags: ["-p", "--package", "-c", "--call"] },
    bunx: { runsTheRest: !0 },
    nx: C,
    turbo: C,
    vite: C,
    next: C,
    ng: C,
    nuxt: C,
    astro: C,
    remix: C,
    gatsby: C,
    expo: C,
    "svelte-kit": C,
    "react-scripts": C,
    "vue-cli-service": C,
    storybook: C,
    mkdocs: C,
    hugo: C,
    rspack: C,
    rsbuild: C,
    nyc: {
      runsTheRest: !0,
      ownVerbs: ["report", "check-coverage", "instrument", "merge"],
      valueFlags: [
        ...Se,
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
      runsTheRest: !0,
      ownVerbs: ["report", "check-coverage"],
      valueFlags: [...Se, "-o", "--reports-dir", "--temp-directory", "-c", "--config", "--src"],
    },
    node: { anywhere: { runs_tests: ["--test"] } },
    tsx: { verbs: { serves_or_watches: ["watch"] } },
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
    tsc: xe,
    tsgo: xe,
    webpack: { verbs: { serves_or_watches: ["serve", "watch"] }, anywhere: { serves_or_watches: ["-w"] } },
    playwright: { verbs: { runs_tests: ["test"], installs_packages: ["install", "install-deps"] } },
    pip: { verbs: { installs_packages: ["install", "uninstall", "download", "wheel"] } },
    uv: D,
    poetry: D,
    pipenv: D,
    pdm: D,
    hatch: D,
    pipx: D,
    conda: D,
    mamba: D,
    micromamba: D,
    uvx: { runsTheRest: !0, valueFlags: ["--from", "--with", "--python", "-p"] },
    jupyter: { verbs: { serves_or_watches: ["notebook", "lab", "server"] } },
    flask: { verbs: { serves_or_watches: ["run"] } },
    fastapi: { verbs: { serves_or_watches: ["dev", "run"] } },
    "django-admin": { verbs: { runs_tests: ["test"], serves_or_watches: ["runserver"] } },
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
    bazel: Te,
    bazelisk: Te,
    make: {
      bare: "builds",
      verbs: { builds: ["all", "install"], runs_tests: ["check"] },
      verbMayBeScript: !0,
      verbIsTarget: !0,
      valueFlags: ["-C", "-f", "-j"],
    },
    just: {
      verbMayBeScript: !0,
      verbIsTarget: !0,
      valueFlags: ["-f", "--justfile", "-d", "--working-directory"],
    },
    task: { verbMayBeScript: !0, verbIsTarget: !0, valueFlags: ["-t", "--taskfile", "-d", "--dir"] },
    mvn: K,
    mvnw: K,
    gradle: K,
    gradlew: K,
    sbt: K,
    swift: { verbs: { runs_tests: ["test"], builds: ["build"] } },
    zig: {
      verbs: {
        runs_tests: ["test"],
        lints: ["fmt"],
        builds: ["build-exe", "build-lib", "build-obj", "cc", "c++"],
      },
      scriptAfter: ["build"],
      anywhere: { builds: ["build"] },
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
    buf: { verbs: { builds: ["build", "generate"], lints: ["lint", "format", "breaking"] } },
    "wasm-pack": { verbs: { runs_tests: ["test"], builds: ["build", "pack"] } },
    valgrind: { runsTheRest: !0 },
    apt: W,
    "apt-get": W,
    apk: W,
    brew: W,
    dnf: W,
    yum: W,
    snap: W,
    gem: { verbs: { installs_packages: ["install", "update"] } },
    composer: { verbs: { installs_packages: ["install", "update", "require"] } },
    bundle: { verbs: { installs_packages: ["install", "update", "add"] }, commandAfter: ["exec"] },
    rake: { verbs: { runs_tests: ["spec"] }, verbMayBeScript: !0, verbIsTarget: !0 },
    rails: { verbs: { runs_tests: ["test", "t"], serves_or_watches: ["server", "s"] } },
    mix: {
      verbs: {
        runs_tests: ["test"],
        builds: ["compile", "release"],
        lints: ["format", "credo", "dialyzer"],
        installs_packages: ["deps.get", "deps.update", "local.hex", "local.rebar"],
        serves_or_watches: ["phx.server"],
      },
    },
  },
  Ee = {
    unittest: "runs_tests",
    doctest: "runs_tests",
    venv: "installs_packages",
    ensurepip: "installs_packages",
    "http.server": "serves_or_watches",
    build: "builds",
    compileall: "builds",
    py_compile: "builds",
  },
  Ue = ["unittest", "doctest"],
  Ls = [...We.keys(), ...Ue, "other", "none", "incomplete", "unparsed"],
  St = ["markitdown", "weasyprint", "ocrmypdf", "whisper"],
  Re = {
    "@playwright/test": "playwright",
    "@puppeteer/browsers": "puppeteer",
    "@mermaid-js/mermaid-cli": "mmdc",
    "@angular/cli": "ng",
    "@biomejs/biome": "biome",
  },
  Oe = {
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
  },
  xt = {
    ...Fe,
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
  },
  Tt = ["bash", "sh", "zsh", "dash", "ksh"],
  At = ["-exec", "-execdir", "-ok", "-okdir"],
  Et = ["nohup", "setsid"],
  Rt = ["--version", "--help", "-v", "-V", "-h", "-n", "-q"],
  Ot = ["--watch", "--watchAll", "--reload"],
  Ct = 6,
  Pt = 24,
  Mt = 2,
  Bt = 2000,
  It = 20,
  Lt = ["whole", "unknown", "narrowed_to_folders", "narrowed", "changed_or_failed_only", "runs_no_tests"],
  Dt = [
    "runs_no_tests",
    "changed_or_failed_only",
    "narrowed",
    "narrowed_to_folders",
    "takes_expression",
    "takes_value",
    "says_nothing",
  ],
  F = ["", ".", "test", "tests", "spec", "specs", "__tests__"],
  Nt = ["src", "lib", "app", "apps", "packages", "e2e", "integration", "unit"],
  Ft = /\.\w+$|:\w/,
  ze = {
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
  },
  z = { flags: ze, operands: "name_tests", bareOperands: "folders_by_form", wholeOperands: F },
  Z = {
    ...z,
    verbs: {
      runs_no_tests: ["list"],
      changed_or_failed_only: ["related"],
      says_nothing: ["run", "watch", "dev", "bench"],
    },
  },
  re = { flags: ze, operands: "name_tests_after_dashes", bareOperands: "folders_by_form", wholeOperands: F },
  U = {
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
    wholeOperands: F,
  },
  G = {
    flags: {
      runs_no_tests: ["-DskipTests", "-Dmaven.test.skip", "--dry-run"],
      narrowed: ["-Dtest", "-Dit.test", "--tests"],
    },
  },
  Ce = {
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
    wholeNeedsOperand: !0,
    lessThanPackage: /:(?!all$|all-targets$)\w|^@?[\w.-]*\/\/(?![^:]*\.\.\.$)[^:]*$/,
  },
  Pe = {
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
    wholeOperands: F,
  },
  Me = {},
  Be = {
    npm: Z,
    pnpm: Z,
    yarn: Z,
    vitest: Z,
    bun: z,
    node: z,
    jest: z,
    playwright: z,
    "react-scripts": z,
    "vue-cli-service": z,
    nx: re,
    turbo: re,
    ng: re,
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
      wholeOperands: F,
    },
    cypress: {
      verbs: { runs_no_tests: ["open", "install", "verify", "info", "cache", "version", "help"] },
      flags: { narrowed: ["-s", "--spec"] },
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
      wholeOperands: F,
    },
    pytest: U,
    "py.test": U,
    uv: U,
    poetry: U,
    pipenv: U,
    pdm: U,
    hatch: U,
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
      verbs: { says_nothing: ["discover"] },
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
      wholeOperands: F,
    },
    doctest: { operands: "name_tests" },
    go: {
      flags: {
        runs_no_tests: ["-list", "--list", "-c"],
        narrowed: ["-run", "--run"],
        takes_value: ["-coverpkg"],
      },
      wholeOperands: ["..."],
      wholeNeedsOperand: !0,
      lessThanPackage: /\.go$/,
    },
    cargo: {
      verbs: { runs_no_tests: ["list"], says_nothing: ["run"] },
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
    mvn: G,
    mvnw: G,
    gradle: G,
    gradlew: G,
    sbt: G,
    dotnet: { flags: { runs_no_tests: ["-t", "--list-tests"], narrowed: ["--filter"] } },
    bazel: Ce,
    bazelisk: Ce,
    make: Me,
    rake: Me,
    just: { operands: "go_to_recipe" },
    task: { operands: "go_to_recipe" },
    ctest: {
      flags: {
        runs_no_tests: ["-N", "--show-only"],
        changed_or_failed_only: ["--rerun-failed"],
        narrowed: ["-R", "--tests-regex", "-L", "--label-regex", "-I", "--tests-information"],
      },
    },
    swift: {
      verbs: { runs_no_tests: ["list"] },
      flags: { runs_no_tests: ["--list-tests", "-l"], narrowed: ["--filter"] },
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
      wholeOperands: F,
    },
    phpunit: Pe,
    pest: Pe,
  },
  jt = ["--help", "-h", "--version"],
  Wt = ["xargs", "parallel"],
  Q = /^[A-Za-z_]\w*=/,
  Ut = {
    bash_command_class: lit("unparsed"),
    bash_argv0: lit("other"),
    bash_last_argv0: lit("other"),
    bash_command_kinds: lit("unparsed"),
    bash_programs: lit("unparsed"),
    has_pipe: !1,
    has_redirect: !1,
    has_chain: !1,
    has_subshell: !1,
    has_heredoc: !1,
    simple_command_count: 0,
  },
  zt = new Set([
    "&&",
    "||",
    ";",
    "&",
    `
`,
  ]),
  $t = new Set(["subshell", "command_substitution", "process_substitution"]),
  Ht = /^\d*>&\d+$|^&?\d*>{1,2}\s*\/dev\/null$/;
/**
 * 遍历语法树收集命令形状：各简单命令，以及是否有管道、重定向、heredoc、链式/后台、子 shell。
 */
//@ chunk-fym4r1th.js:37722-38121 placement
function collectCommandShape(e, s) {
  switch (e.type) {
    case "command":
      s.commands.push(e);
      break;
    case "pipeline":
      s.has_pipe = !0;
      break;
    case "file_redirect":
      if (!Ht.test(e.text.trim())) s.has_redirect = !0;
      break;
    case "heredoc_redirect":
    case "herestring_redirect":
      s.has_heredoc = !0;
      break;
    default:
      if (zt.has(e.type)) ((s.has_chain = !0), (s.has_background_job ||= e.type === "&"));
      else if ($t.has(e.type)) s.has_subshell = !0;
  }
  for (let n of e.children) collectCommandShape(n, s);
}
//@ chunk-fym4r1th.js:38121-38188 placement
function ee(e) {
  let index = e.lastIndexOf("/");
  return index >= 0 ? e.slice(index + 1) : e;
}
//@ chunk-fym4r1th.js:38188-38325 placement
function normalizeProgramName(e) {
  let s = ee(e);
  return (
    (Object.hasOwn(ve, s) ? ve[s] : void 0) ??
    (/^python[0-9.]+$/.test(s) ? "python" : /^pip[0-9.]+$/.test(s) ? "pip" : s)
  );
}
//@ chunk-fym4r1th.js:38325-38413 placement
function le(e) {
  if (e === void 0) return;
  let s = normalizeProgramName(e);
  return Object.hasOwn(fromEntries, s) ? fromEntries[s] : void 0;
}
//@ chunk-fym4r1th.js:38413-38532 placement
function stripLeadingWrappers(e) {
  let filtered = e.trim().split(/\s+/).filter(Boolean);
  while (filtered.length > 0 && Q.test(filtered[0])) filtered = filtered.slice(1);
  return skipWrapperCommands(filtered, Fe);
}
/**
 * 跳过 argv 开头的包装命令（timeout、nice 等）及其选项与参数（有次数上限），返回实际执行的命令部分。
 */
//@ chunk-fym4r1th.js:38532-38937 placement
function skipWrapperCommands(e, s) {
  let n = e;
  for (let a = 0; a < ht; a++) {
    let r = n[0] === void 0 ? void 0 : ee(n[0]),
      d = r !== void 0 && Object.hasOwn(s, r) ? s[r] : void 0;
    if (d === void 0 || n.length < 2) break;
    let f = 1;
    while (f < n.length) {
      let m = n[f];
      if (m === "--") {
        f++;
        break;
      }
      if (d.includes(m)) f += 2;
      else if (m.startsWith("-") || Q.test(m)) f++;
      else if ((r === "timeout" || r === "nice") && /^[0-9.]+[smhd]?$/.test(m)) f++;
      else break;
    }
    if (f >= n.length) break;
    n = n.slice(f);
  }
  return n;
}
//@ chunk-fym4r1th.js:38937-39102 placement
function nextOperand(e, s, n) {
  let a = s;
  while (a < e.length) {
    let r = e[a];
    if (n.includes(r)) a += 2;
    else if (r.startsWith("-")) a++;
    else return { token: r, index: a };
  }
  return { token: void 0, index: a };
}
/**
 * 对已知程序取子命令分类（gh 还取第二级子命令），不在列表中的记为 other。
 */
//@ chunk-fym4r1th.js:39102-39404 placement
function classifySubcommand(e, s) {
  if (e === void 0 || !Object.hasOwn(we, e)) return {};
  let n = we[e],
    a = gt[e] ?? [],
    r = nextOperand(s, 1, a),
    found = n.find((m) => m === r.token),
    f = { bash_subcommand: found !== void 0 ? fromEnum(found) : lit("other") };
  if (e === "gh" && found !== void 0) {
    let m = nextOperand(s, r.index + 1, a),
      found = ft.find((g) => g === m.token);
    f.bash_subcommand2 = found !== void 0 ? fromEnum(found) : lit("other");
  }
  return f;
}
//@ chunk-fym4r1th.js:39404-39553 placement
function normalizePackageName(e) {
  let index = e.indexOf("@", e.lastIndexOf("/") + 2),
    n = index < 0 ? e : e.slice(0, index);
  if (!n.startsWith("@")) return normalizeProgramName(n);
  return Object.hasOwn(Re, n) ? Re[n] : "";
}
//@ chunk-fym4r1th.js:39553-39655 placement
function nextNonAssignmentOperand(e, s, n) {
  let a = nextOperand(e, s, n);
  while (a.token !== void 0 && Q.test(a.token)) a = nextOperand(e, a.index + 1, n);
  return a;
}
//@ chunk-fym4r1th.js:39655-39710 placement
function ce(e, s) {
  return e && ue.find((n) => e[n]?.some(s));
}
//@ chunk-fym4r1th.js:39710-39830 placement
function matchKnownScriptPrefix(e) {
  return e === void 0
    ? void 0
    : ce(wt, (s) => e.startsWith(s) && (e.length === s.length || ":-_".includes(e[s.length])));
}
//@ chunk-fym4r1th.js:39830-39889 placement
function De(e, s) {
  return e && Dt.find((n) => e[n]?.includes(s));
}
//@ chunk-fym4r1th.js:39889-41456 placement
function classifyTestCommand(e, s, n, a) {
  let r = Object.hasOwn(Be, e) ? Be[e] : void 0,
    d = !1,
    f = !1,
    m = !1,
    h = r === void 0 || a,
    g = !1,
    k = !1,
    P = r?.verbsOnlyAfter === void 0 || r.verbsOnlyAfter === s[n - 1],
    x = !1,
    j = !1;
  for (let R = n; R < s.length; R++) {
    let S = s[R],
      B = j;
    if (((j = !1), /^\d+$/.test(S))) continue;
    let O;
    if (S.length > 1 && S.startsWith("-")) {
      let index = S.indexOf("="),
        I = index < 0 ? S : S.slice(0, index),
        te = index < 0 ? s[R + 1] : S.slice(index + 1);
      if (((O = jt.includes(I) ? "runs_no_tests" : De(r?.flags, I)), index >= 0 && te === "false"))
        O = "says_nothing";
      else if (O === "takes_expression") O = /^['"]?(not |~|!)/.test(te ?? "") ? "takes_value" : "narrowed";
      if (O !== void 0 && O !== "says_nothing" && index < 0 && !te?.startsWith("-")) R++;
      ((x ||= S === "--"), (j = O === void 0 && index < 0 && /^--(?!no-)[^-]/.test(S)));
    } else ((O = P ? De(r?.verbs, S) : void 0), (P = !1));
    if (O === "runs_no_tests") return "runs_no_tests";
    if (
      ((d ||= O === "changed_or_failed_only"),
      (f ||= O === "narrowed"),
      (m ||= O === "narrowed_to_folders"),
      O !== void 0 || S.startsWith("-"))
    )
      continue;
    let replaced = S.replace(/^\.\//, "").replace(/\/$/, "");
    if (r?.wholeOperands?.includes(replaced)) g = !0;
    else if (Q.test(S)) h ||= !s[R - 1].startsWith("-");
    else if (/^[$`]|\*|^\{\}$/.test(S) || r?.operands === "go_to_recipe") h = !0;
    else if (r?.operands === "name_tests" || (r?.operands === "name_tests_after_dashes" && x)) {
      let w = B || a || (r.wholeOperands?.includes(ee(replaced)) ?? !1),
        I =
          !Ft.test(S) &&
          (r.bareOperands === "folders" ||
            (r.bareOperands === "folders_by_form" && (S.includes("/") || Nt.includes(replaced))));
      ((h ||= w), (m ||= !w && I), (f ||= !w && !I));
    } else if (r?.lessThanPackage?.test(replaced)) k ||= !B;
  }
  if (d) return "changed_or_failed_only";
  if (f) return "narrowed";
  if (m) return "narrowed_to_folders";
  if (h) return "unknown";
  if (!r?.wholeNeedsOperand || g) return "whole";
  return k ? "narrowed" : "narrowed_to_folders";
}
/**
 * 对解析出的每条命令去掉赋值与重定向、解开引号后进行分类，并记录是否启动后台任务。
 */
//@ chunk-fym4r1th.js:41456-41852 placement
function classifyParsedCommands(e, s) {
  if (e.has_background_job) s.kinds.add("starts_background_job");
  for (let command of e.commands) {
    let a = [];
    for (let { type: r, text: text } of command.children) {
      if (r === "variable_assignment" || r.endsWith("_redirect")) continue;
      let f = text.length >= 2 && text.at(-1) === text[0] ? text[0] : "";
      a.push(
        f === "'"
          ? text.slice(1, -1)
          : f === '"'
            ? text.slice(1, -1).replace(/\\(["\\$`])/g, "$1")
            : text.startsWith("\\")
              ? text.slice(1)
              : text,
      );
    }
    ((s.fedMoreWords = !1), classifyShellCommand(a, s, 0));
  }
}
//@ chunk-fym4r1th.js:41852-42142 placement
function classifyScriptText(e, s) {
  s.scriptTextDeadline ??= performance.now() + It;
  let max = Math.max(0, s.scriptTextDeadline - performance.now());
  s.scriptTextCharsLeft -= e.length;
  let a = s.scriptTextDepth < Mt && s.scriptTextCharsLeft >= 0 ? parseCommandShape(e, max) : null;
  if (!a) {
    s.gaveUp = !0;
    return;
  }
  (s.scriptTextDepth++, classifyParsedCommands(a, s), s.scriptTextDepth--);
}
//@ chunk-fym4r1th.js:42142-42424 placement
function classifyShellInvocation(e, s) {
  for (let n = 1; n < e.length; n++) {
    let a = e[n];
    if (/^-[A-Za-z]+$/.test(a) && a.includes("c")) {
      let r = e[n + 1] === "--" ? e[n + 2] : e[n + 1];
      if (r) {
        classifyScriptText(r, s);
        return;
      }
      break;
    }
    if (/^[-+][A-Za-z]*[oO]$|^--(rcfile|init-file)$/.test(a)) n++;
    else if (!a.startsWith("-")) break;
  }
  s.kinds.add("shell_script");
}
/**
 * 分类 python 调用：-m 模块按已知模块表归类（含测试框架），-c 为内联代码，其他递归分类；--version/-h 不计。
 */
//@ chunk-fym4r1th.js:42424-43010 placement
function classifyPythonInvocation(e, s, n) {
  for (let a = 1; a < e.length && e[a] !== "-"; a++) {
    let r = e[a];
    if (!r.startsWith("-") || /^--(version|help)/.test(r)) return;
    let d = r.startsWith("--") ? -1 : r.search(/[Vh?cmWX]/),
      f = r[d],
      sliced = r.slice(d + 1);
    if (f === "V" || f === "h" || f === "?") return;
    if (f === "c") break;
    if (f === "m") {
      let h = sliced ? [sliced, ...e.slice(a + 1)] : e.slice(a + 1),
        g = h[0] ?? "";
      if (Object.hasOwn(Ee, g)) {
        s.kinds.add(Ee[g]);
        let found = Ue.find((P) => P === g);
        if (found !== void 0)
          (s.programs.add(found), s.testScopes.add(classifyTestCommand(found, h, 1, s.fedMoreWords)));
      } else if (St.includes(g)) classifyShellCommand(h, s, n + 1);
      else classifyShellCommand(h, s, n + 1, "python");
      return;
    }
    if ((f === "W" || f === "X") && !sliced) a++;
  }
  s.kinds.add("python_inline");
}
//@ chunk-fym4r1th.js:43010-44872 placement
function classifyShellCommand(e, s, n, a, r) {
  if (n > Ct) s.gaveUp = !0;
  if (s.gaveUp) return;
  let { kinds: kinds, programs: programs } = s;
  if (e[0] === "command" && /^-[vV]$/.test(e[1] ?? "")) {
    (kinds.add("shell_word"), programs.add("command"));
    return;
  }
  let m = skipWrapperCommands(e, xt);
  if (m[0] === void 0) return;
  let h = normalizePackageName(m[0]),
    g = kt.get(h);
  if (a !== void 0 && g !== a && g !== "browser") return;
  if (!r) programs.add(We.get(h) ?? "other");
  let mapped = e.slice(0, e.length - m.length).map(ee);
  if (h === "disown" || mapped.some((y) => Et.includes(y))) kinds.add("starts_background_job");
  if (((s.fedMoreWords ||= mapped.some((y) => Wt.includes(y))), Tt.includes(h))) {
    classifyShellInvocation(m, s);
    return;
  }
  let P = h === "eval" ? m.slice(1).join(" ").trim() : "";
  if (P) {
    classifyScriptText(P, s);
    return;
  }
  if (h === "find") {
    for (let y = 1; y < m.length; y++)
      if (At.includes(m[y])) {
        let w = y + 1;
        while (w < m.length && m[w] !== ";" && m[w] !== "+") w++;
        (classifyShellCommand(m.slice(y + 1, w), s, n + 1), (y = w));
      }
  }
  if (g === void 0) {
    let y = le(h)?.commandClass,
      index = h.lastIndexOf("."),
      I = index > 0 ? h.slice(index + 1) : "";
    kinds.add((y && _t[y]) ?? (Object.hasOwn(Oe, I) ? Oe[I] : "other"));
    return;
  }
  if ((kinds.add(g), h === "python")) classifyPythonInvocation(m, s, n);
  else if (h === "coverage" && m[1] === "run") classifyPythonInvocation(m.slice(1), s, n);
  let x = Object.hasOwn(Ae, h) ? Ae[h] : {},
    j = x.valueFlags ?? [],
    R = nextNonAssignmentOperand(m, 1, j),
    S = nextNonAssignmentOperand(m, R.index + 1, j);
  if (R.token !== void 0 && x.ownVerbs?.includes(R.token)) return;
  let B = ce(x.verbs, (y) => y === R.token),
    O = R.index + 1;
  if (x.runsTheRest) classifyShellCommand(m.slice(R.index), s, n + 1);
  else if (R.token === void 0) {
    if (!Rt.some((y) => m.includes(y, 1))) B = x.bare;
  } else if (x.scriptAfter?.includes(R.token)) ((B = matchKnownScriptPrefix(S.token)), (O = S.index + 1));
  else if (x.commandAfter?.includes(R.token)) {
    if (((B = matchKnownScriptPrefix(S.token)), (O = S.index + 1), B === void 0)) {
      classifyShellCommand(m.slice(S.index), s, n + 1);
      return;
    }
  } else if (B === void 0 && x.verbMayBeScript) {
    if (((B = matchKnownScriptPrefix(R.token)), B === void 0))
      classifyShellCommand(m.slice(R.index), s, n + 1, g, x.verbIsTarget);
  }
  if (B === void 0)
    ((B = ce(x.anywhere, (y) => m.some((w, I) => I > 0 && w === y && !j.includes(m[I - 1]))) ?? vt.get(h)),
      (O = 1));
  if (B !== void 0) kinds.add(B);
  if (B === "runs_tests" && !x.runsTheRest && !(h === "coverage" && m[1] === "run"))
    s.testScopes.add(classifyTestCommand(h, m, O, s.fedMoreWords));
  if (Ot.some((y) => m.includes(y, 1))) kinds.add("serves_or_watches");
}
//@ chunk-fym4r1th.js:44872-45117 placement
function parseCommandShape(e, s) {
  if (!e || e.length > SPLIT_MAX_LEN) return null;
  let n;
  try {
    n = getParserModule()?.parse(e, s) ?? null;
  } catch {
    n = null;
  }
  if (!n) return null;
  let a = {
    commands: [],
    has_background_job: !1,
    has_pipe: !1,
    has_redirect: !1,
    has_chain: !1,
    has_subshell: !1,
    has_heredoc: !1,
  };
  return (collectCommandShape(n, a), a);
}
//@ chunk-fym4r1th.js:45117-46066 placement
function classifyBashCommand(e) {
  let s = parseCommandShape(e);
  if (!s) return Ut;
  let n = stripLeadingWrappers(s.commands[0]?.text ?? ""),
    a = le(n[0]),
    r = le(stripLeadingWrappers(s.commands.at(-1)?.text ?? "")[0]),
    d = {
      kinds: new Set(),
      programs: new Set(),
      testScopes: new Set(),
      fedMoreWords: !1,
      scriptTextDepth: 0,
      scriptTextCharsLeft: Bt,
      scriptTextDeadline: void 0,
      gaveUp: !1,
    };
  if ((classifyParsedCommands(s, d), d.kinds.size === 0)) d.kinds.add("shell_word");
  return {
    bash_command_class: a !== void 0 ? fromEnum(a.commandClass) : lit("other"),
    bash_argv0: a !== void 0 ? fromEnum(a.argv0) : lit("other"),
    bash_last_argv0: r !== void 0 ? fromEnum(r.argv0) : lit("other"),
    ...classifySubcommand(a?.argv0, n),
    bash_command_kinds: d.gaveUp ? lit("incomplete") : fromEnumArr([...d.kinds]),
    bash_programs:
      d.gaveUp || d.programs.size > Pt
        ? lit("incomplete")
        : d.programs.size === 0
          ? lit("none")
          : fromEnumArr([...d.programs]),
    ...(!d.gaveUp &&
      d.kinds.has("runs_tests") && {
        bash_test_scope: fromEnum(Lt.find((f) => d.testScopes.has(f)) ?? "unknown"),
      }),
    has_pipe: s.has_pipe,
    has_redirect: s.has_redirect,
    has_chain: s.has_chain,
    has_subshell: s.has_subshell,
    has_heredoc: s.has_heredoc,
    simple_command_count: s.commands.length,
  };
}

export { classifyBashCommand, Kbn };
