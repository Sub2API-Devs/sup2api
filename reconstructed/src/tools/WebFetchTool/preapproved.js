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

/**
 * 预批准文档站列表（Claude/Anthropic 官方站、主流语言与框架文档等约 100 项），派生 HOSTNAME_ONLY / PATH_PREFIXES；oar 为需要额外路径限制的主机。
 */
//@ chunk-e6aww6q8.js:2165704-2167829 fingerprint = PREAPPROVED_HOSTS (0.912)
var PREAPPROVED_HOSTS = new Set([
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
  ]),
  { HOSTNAME_ONLY: HOSTNAME_ONLY, PATH_PREFIXES: PATH_PREFIXES } = (() => {
    let e = new Set(),
      n = new Map();
    for (let r of PREAPPROVED_HOSTS) {
      let index = r.indexOf("/");
      if (index === -1) e.add(r);
      else {
        let sliced = r.slice(0, index),
          sliced_2 = r.slice(index),
          S = n.get(sliced);
        if (S) S.push(sliced_2);
        else n.set(sliced, [sliced_2]);
      }
    }
    return { HOSTNAME_ONLY: e, PATH_PREFIXES: n };
  })(),
  GITHUB_COM_ANTHROPICS = "github.com/anthropics",
  PATH_RESTRICTED_HOSTS = new Set([GITHUB_HOST, "raw.githubusercontent.com"]);

export { HOSTNAME_ONLY, PATH_PREFIXES, PATH_RESTRICTED_HOSTS, GITHUB_COM_ANTHROPICS };
