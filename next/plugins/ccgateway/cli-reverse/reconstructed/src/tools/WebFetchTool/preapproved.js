/**
 * tools/WebFetchTool/preapproved.ts
 *
 * WebFetch 预批准文档站列表与主机/路径前缀派生表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/WebFetchTool/preapproved.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2165704-2167829 fingerprint (2.1.88 match: PREAPPROVED_HOSTS, 0.912)
/**
 * 预批准文档站列表（Claude/Anthropic 官方站、主流语言与框架文档等约 100 项），派生 HOSTNAME_ONLY / PATH_PREFIXES；oar 为需要额外路径限制的主机。
 */
var PREAPPROVED_HOSTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HOSTNAME_ONLY;
var PATH_PREFIXES;
var GITHUB_COM_ANTHROPICS;
var PATH_RESTRICTED_HOSTS;
deferInit("chunk-e6aww6q8.js:2165704", () => {
  PREAPPROVED_HOSTS = new Set([
    "platform.claude.com",
    "code.claude.com",
    "claude.dev",
    "www.claude.dev",
    "claude.com/docs",
    "modelcontextprotocol.io",
    "github.com/anthropics",
    "github.com/anthropic-experimental",
    "raw.githubusercontent.com/anthropics",
    "raw.githubusercontent.com/anthropic-experimental",
    "agentskills.io",
    "docs.python.org",
    "en.cppreference.com",
    "docs.oracle.com",
    "learn.microsoft.com",
    "developer.mozilla.org",
    "go.dev/doc",
    "go.dev/ref",
    "www.php.net",
    "docs.swift.org",
    "kotlinlang.org",
    "ruby-doc.org",
    "doc.rust-lang.org",
    "www.typescriptlang.org",
    "react.dev",
    "angular.io",
    "vuejs.org",
    "nextjs.org",
    "expressjs.com",
    "nodejs.org",
    "bun.sh",
    "jquery.com",
    "getbootstrap.com",
    "tailwindcss.com",
    "d3js.org",
    "threejs.org",
    "redux.js.org",
    "webpack.js.org",
    "jestjs.io",
    "reactrouter.com",
    "docs.djangoproject.com",
    "flask.palletsprojects.com",
    "fastapi.tiangolo.com",
    "pandas.pydata.org",
    "numpy.org",
    "www.tensorflow.org",
    "pytorch.org",
    "scikit-learn.org",
    "matplotlib.org",
    "requests.readthedocs.io",
    "jupyter.org",
    "laravel.com",
    "symfony.com",
    "wordpress.org/documentation",
    "docs.spring.io",
    "hibernate.org",
    "tomcat.apache.org",
    "gradle.org",
    "maven.apache.org",
    "asp.net",
    "dotnet.microsoft.com",
    "blazor.net",
    "reactnative.dev",
    "docs.flutter.dev",
    "developer.apple.com",
    "developer.android.com",
    "keras.io",
    "spark.apache.org",
    "huggingface.co/docs",
    "www.kaggle.com/docs",
    "www.mongodb.com",
    "redis.io",
    "www.postgresql.org",
    "dev.mysql.com",
    "www.sqlite.org",
    "graphql.org",
    "prisma.io",
    "docs.getdbt.com",
    "docs.aws.amazon.com",
    "cloud.google.com",
    "learn.microsoft.com",
    "kubernetes.io",
    "www.docker.com",
    "www.terraform.io",
    "www.ansible.com",
    "vercel.com/docs",
    "docs.stripe.com",
    "docs.netlify.com",
    "devcenter.heroku.com",
    "dev.wix.com/docs",
    "cypress.io",
    "selenium.dev",
    "docs.unity.com",
    "docs.unrealengine.com",
    "git-scm.com",
    "nginx.org",
    "httpd.apache.org",
  ]);
  ({ HOSTNAME_ONLY, PATH_PREFIXES } = (() => {
    let hosts = new Set();
    let paths = new Map();
    for (let entry of PREAPPROVED_HOSTS) {
      let slash = entry.indexOf("/");
      if (slash === -1) hosts.add(entry);
      else {
        let host = entry.slice(0, slash);
        let path = entry.slice(slash);
        let prefixes = paths.get(host);
        if (prefixes) prefixes.push(path);
        else paths.set(host, [path]);
      }
    }
    return {
      HOSTNAME_ONLY: hosts,
      PATH_PREFIXES: paths,
    };
  })());
  GITHUB_COM_ANTHROPICS = "github.com/anthropics";
  PATH_RESTRICTED_HOSTS = new Set([GITHUB_HOST, "raw.githubusercontent.com"]);
});
export { HOSTNAME_ONLY, PATH_PREFIXES, PATH_RESTRICTED_HOSTS, GITHUB_COM_ANTHROPICS };
