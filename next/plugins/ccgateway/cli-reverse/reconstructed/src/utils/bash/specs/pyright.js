/**
 * utils/bash/specs/pyright.ts
 *
 * pyright 命令的内置 Fig spec（选项表）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/pyright.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-e6aww6q8.js:3037573-3039519 fingerprint = default (1)
/**
 * pyright 的命令规格（选项及哪些带参数），供命令前缀提取使用。
 */
var pyrightSpec = {
  name: "pyright",
  description: "Type checker for Python",
  options: [
    {
      name: ["--help", "-h"],
      description: "Show help message",
    },
    {
      name: "--version",
      description: "Print pyright version and exit",
    },
    {
      name: ["--watch", "-w"],
      description: "Continue to run and watch for changes",
    },
    {
      name: ["--project", "-p"],
      description: "Use the configuration file at this location",
      args: {
        name: "FILE OR DIRECTORY",
      },
    },
    {
      name: "-",
      description: "Read file or directory list from stdin",
    },
    {
      name: "--createstub",
      description: "Create type stub file(s) for import",
      args: {
        name: "IMPORT",
      },
    },
    {
      name: ["--typeshedpath", "-t"],
      description: "Use typeshed type stubs at this location",
      args: {
        name: "DIRECTORY",
      },
    },
    {
      name: "--verifytypes",
      description: "Verify completeness of types in py.typed package",
      args: {
        name: "IMPORT",
      },
    },
    {
      name: "--ignoreexternal",
      description: "Ignore external imports for --verifytypes",
    },
    {
      name: "--pythonpath",
      description: "Path to the Python interpreter",
      args: {
        name: "FILE",
      },
    },
    {
      name: "--pythonplatform",
      description: "Analyze for platform",
      args: {
        name: "PLATFORM",
      },
    },
    {
      name: "--pythonversion",
      description: "Analyze for Python version",
      args: {
        name: "VERSION",
      },
    },
    {
      name: ["--venvpath", "-v"],
      description: "Directory that contains virtual environments",
      args: {
        name: "DIRECTORY",
      },
    },
    {
      name: "--outputjson",
      description: "Output results in JSON format",
    },
    {
      name: "--verbose",
      description: "Emit verbose diagnostics",
    },
    {
      name: "--stats",
      description: "Print detailed performance stats",
    },
    {
      name: "--dependencies",
      description: "Emit import dependency information",
    },
    {
      name: "--level",
      description: "Minimum diagnostic level",
      args: {
        name: "LEVEL",
      },
    },
    {
      name: "--skipunannotated",
      description: "Skip type analysis of unannotated functions",
    },
    {
      name: "--warnings",
      description: "Use exit code of 1 if warnings are reported",
    },
    {
      name: "--threads",
      description: "Use up to N threads to parallelize type checking",
      args: {
        name: "N",
        isOptional: true,
      },
    },
  ],
  args: {
    name: "files",
    description: "Specify files or directories to analyze (overrides config file)",
    isVariadic: true,
    isOptional: true,
  },
};
export { pyrightSpec };
