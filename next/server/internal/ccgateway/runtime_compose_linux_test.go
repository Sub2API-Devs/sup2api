//go:build linux

package ccgateway

import (
	"bytes"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"syscall"
	"testing"
)

// The compose scripts (CONTRACTS §76) run for real under sh, with docker,
// systemctl and sleep replaced by shell stubs on PATH that keep containers,
// images and networks as files and log every call. Linux only (the CI
// server job runs it); it fails, never skips, when a tool is missing.

const fakeDocker = `#!/bin/sh
F=$CCG_FAKE
echo "docker $*" >> "$F/calls"
san() { printf '%s' "$1" | tr '/:@' '___'; }
c() { echo "$F/containers/$1"; }
case "$1" in
image)
  shift 2
  fmt=
  if [ "$1" = --format ]; then fmt=$2; shift 2; fi
  d=$F/images/$(san "$1")
  [ -d "$d" ] || exit 1
  case "$fmt" in *guard-api*) cat "$d/guard-api" 2>/dev/null; echo ;; esac
  exit 0 ;;
pull)
  [ -e "$F/fail/pull" ] && exit 1
  mkdir -p "$F/images/$(san "$3")" ;;
inspect)
  shift 3
  fmt=
  if [ "$1" = --format ]; then fmt=$2; shift 2; fi
  d=$(c "$1")
  [ -d "$d" ] || exit 1
  case "$fmt" in *compose.project*) cat "$d/project"; echo ;; esac
  exit 0 ;;
rename) [ -d "$(c "$2")" ] && [ ! -e "$(c "$3")" ] || exit 1; mv "$(c "$2")" "$(c "$3")" ;;
stop) [ -d "$(c "$2")" ] || exit 1; rm -f "$(c "$2")/running" ;;
start) [ -d "$(c "$2")" ] || exit 1; : > "$(c "$2")/running" ;;
rm) rm -rf "$(c "$3")" ;;
run)
  name=$4
  eval img=\${$#}
  [ ! -e "$(c "$name")" ] || exit 1
  mkdir -p "$(c "$name")"; : > "$(c "$name")/running"; : > "$(c "$name")/project"; printf '%s' "$img" > "$(c "$name")/image" ;;
network)
  case "$2" in
  inspect) [ -f "$F/networks/$5" ] || exit 1; cat "$F/networks/$5" ;;
  create)
    [ -e "$F/fail/network-create" ] && exit 1
    eval name=\${$#}
    sub=; prev=
    for a in "$@"; do [ "$prev" = --subnet ] && sub=$a; prev=$a; done
    mkdir -p "$F/networks"; echo "$sub" > "$F/networks/$name" ;;
  *) exit 96 ;;
  esac ;;
compose)
  shift
  if [ "$1" = version ]; then [ -e "$F/fail/compose-version" ] && exit 1; echo 'Docker Compose version v2.40.0'; exit 0; fi
  [ "$1" = -p ] && [ "$3" = --project-directory ] && [ "$5" = -f ] && [ "$7" = --env-file ] || exit 99
  proj=$2; envf=$8; shift 8
  val() { sed -n "s/^$1=//p" "$envf" | tail -n 1; }
  case "$1" in
  config) [ -e "$F/fail/compose-config" ] && exit 1; [ -f "$envf" ] ;;
  up)
    shift
    while [ "${1#-}" != "$1" ]; do shift; done
    [ "$#" -gt 0 ] || exit 95
    for s in "$@"; do
      [ -e "$F/fail/up-$s" ] && exit 1
      d=$(c "ccg-$s")
      if [ -d "$d" ] && [ "$(cat "$d/project")" != "$proj" ]; then exit 1; fi
      case "$s" in guard) img=$(val CCG_GUARD_IMAGE) ;; controller) img=$(val CCG_CONTROLLER_IMAGE) ;; *) exit 94 ;; esac
      mkdir -p "$d"; echo "$proj" > "$d/project"; printf '%s' "$img" > "$d/image"; : > "$d/running"
      echo "$s $img" >> "$F/ups"
    done ;;
  exec) [ -e "$F/fail/guard-ready" ] && exit 1; [ -e "$(c ccg-guard)/running" ] ;;
  rm)
    d=$(c "ccg-$3")
    if [ -d "$d" ] && [ "$(cat "$d/project")" = "$proj" ]; then rm -rf "$d"; fi ;;
  *) exit 98 ;;
  esac ;;
*) exit 97 ;;
esac
`

const fakeSystemctl = `#!/bin/sh
echo "systemctl $*" >> "$CCG_FAKE/calls"
[ -e "$CCG_FAKE/bridge-active" ]
`

const fakeSleep = `#!/bin/sh
exit 0
`

type fakeHost struct {
	t                             *testing.T
	base                          string
	root, envf, dir, data, state  string
	fake                          string
	path                          string
	ctl, guard, app, egress, oldC string
}

func newFakeHost(t *testing.T) *fakeHost {
	t.Helper()
	for _, tool := range []string{"sh", "flock", "stat", "od", "sed", "grep", "tr", "head", "tail", "mv", "cp", "mkdir", "chmod", "rmdir"} {
		if _, err := exec.LookPath(tool); err != nil {
			t.Fatalf("the compose script test needs %s on PATH: %v", tool, err)
		}
	}
	base := t.TempDir()
	h := &fakeHost{t: t, base: base, root: base + "/runtime", envf: base + "/runtime.env", dir: base + "/ccgateway", data: base + "/controller",
		state: base + "/guard-state", fake: base + "/fake", ctl: placeholderImages.Controller, guard: placeholderImages.Guard,
		app: placeholderImages.App, egress: placeholderImages.Egress, oldC: "ccgateway-controller:0.1.118"}
	bin := base + "/bin"
	for _, d := range []string{bin, h.fake + "/containers", h.fake + "/images", h.fake + "/fail"} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	for name, body := range map[string]string{"docker": fakeDocker, "systemctl": fakeSystemctl, "sleep": fakeSleep} {
		if err := os.WriteFile(bin+"/"+name, []byte(body), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	h.path = bin + ":" + os.Getenv("PATH")
	for _, ref := range []string{h.app, h.egress, h.guard} {
		h.image(ref, "")
	}
	h.image(h.ctl, "1")
	h.image(h.oldC, "")
	return h
}

func san(ref string) string { return strings.NewReplacer("/", "_", ":", "_", "@", "_").Replace(ref) }

func (h *fakeHost) image(ref, guardAPI string) {
	d := h.fake + "/images/" + san(ref)
	h.must(os.MkdirAll(d, 0o755))
	if guardAPI != "" {
		h.write(d+"/guard-api", guardAPI)
	}
}

// container creates a fake container; project "" is one docker run started.
func (h *fakeHost) container(name, project, image string, running bool) {
	d := h.fake + "/containers/" + name
	h.must(os.MkdirAll(d, 0o755))
	h.write(d+"/project", project)
	h.write(d+"/image", image)
	if running {
		h.write(d+"/running", "")
	}
}

func (h *fakeHost) containerState(name string) (exists bool, project, image string, running bool) {
	d := h.fake + "/containers/" + name
	if _, err := os.Stat(d); err != nil {
		return false, "", "", false
	}
	p, _ := os.ReadFile(d + "/project")
	i, _ := os.ReadFile(d + "/image")
	_, err := os.Stat(d + "/running")
	return true, strings.TrimSpace(string(p)), string(i), err == nil
}

func (h *fakeHost) fail(key string) { h.write(h.fake+"/fail/"+key, "") }

func (h *fakeHost) must(err error) {
	h.t.Helper()
	if err != nil {
		h.t.Fatal(err)
	}
}

func (h *fakeHost) write(path, content string) {
	h.t.Helper()
	h.must(os.MkdirAll(filepath.Dir(path), 0o755))
	h.must(os.WriteFile(path, []byte(content), 0o600))
}

func (h *fakeHost) read(path string) string {
	h.t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		h.t.Fatalf("read %s: %v", path, err)
	}
	return string(b)
}

func exists(path string) bool { _, err := os.Lstat(path); return err == nil }

// render points the script's constant paths at the temporary host.
func (h *fakeHost) render(script string) string {
	h.t.Helper()
	out := strings.NewReplacer(
		"ROOT='"+runtimeRoot+"'\n", "ROOT='"+h.root+"'\n",
		"ENVF='"+runtimeEnvFile+"'\n", "ENVF='"+h.envf+"'\n",
		"DIR='"+composeDir+"'\n", "DIR='"+h.dir+"'\n",
		"DATA='"+controllerData+"'\n", "DATA='"+h.data+"'\n",
		"STATE='"+guardState+"'\n", "STATE='"+h.state+"'\n",
	).Replace(script)
	// Outside the compose template no production path may be left.
	outside := strings.Replace(out, composeTemplate, "", 1)
	for _, p := range []string{"/opt/", "/var/lib/ccgateway"} {
		if strings.Contains(outside, p) {
			h.t.Fatalf("script keeps a production path %s after rendering", p)
		}
	}
	return out
}

// run executes script like remotedocker.RunLocalScript (sh -c, stdin) and
// returns stdout and the last CCG_RESULT.
func (h *fakeHost) run(script, stdin string) (string, string) {
	h.t.Helper()
	cmd := exec.Command("sh", "-c", h.render(script))
	cmd.Env = []string{"PATH=" + h.path, "CCG_FAKE=" + h.fake, "HOME=" + h.base, "LC_ALL=C"}
	cmd.Stdin = strings.NewReader(stdin)
	var stdout, stderr bytes.Buffer
	cmd.Stdout, cmd.Stderr = &stdout, &stderr
	_ = cmd.Run()
	out := stdout.String()
	if strings.Count(out, "CCG_RESULT=") > 1 {
		h.t.Fatalf("more than one result:\n%s", out)
	}
	return out, scriptResult(out)
}

func (h *fakeHost) install(stdin string) (string, string) {
	script, err := installScript(placeholderImages, true)
	h.must(err)
	return h.run(script, stdin)
}

func (h *fakeHost) calls() string {
	b, _ := os.ReadFile(h.fake + "/calls")
	return string(b)
}

func (h *fakeHost) ups() []string {
	b, _ := os.ReadFile(h.fake + "/ups")
	return strings.Fields(strings.ReplaceAll(string(b), " ", "="))
}

// tree lists the files and directories below dir (symlinks as "name@").
func tree(t *testing.T, dir string) []string {
	t.Helper()
	var out []string
	_ = filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil || p == dir {
			return nil
		}
		rel, _ := filepath.Rel(dir, p)
		switch {
		case d.Type()&fs.ModeSymlink != 0:
			out = append(out, rel+"@")
		case d.IsDir():
			out = append(out, rel+"/")
		default:
			out = append(out, rel)
		}
		return nil
	})
	sort.Strings(out)
	return out
}

func sameTree(t *testing.T, what string, got, want []string) {
	t.Helper()
	sort.Strings(want)
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("%s:\n--- got\n%s\n--- want\n%s", what, strings.Join(got, "\n"), strings.Join(want, "\n"))
	}
}

const testEnvFile = "CCG_RUNTIME_ROOT=/opt/ccgateway-runtime\nCCG_CONTROLLER_KEY=k\n"

// pythonHost is a host of 0.1.118: a controller docker run started, the
// runtime root of §76.5 (2.6) with every kind of entry, and the guard of
// stage S1 with its own .env.
func pythonHost(t *testing.T) *fakeHost {
	h := newFakeHost(t)
	h.container("ccg-controller", "", h.oldC, true)
	h.container("ccg-guard", "ccgateway", h.guard, true)
	for p, c := range map[string]string{
		".lock": "", "runtime.json": `{"app":"a"}`, "uploads/u1.part": "x", "backups/7.json": "{}",
		"21/state.json": "s21", "21/egress-desired.json": "e21", "21/worker-backups/20261101-abc/worker": "w",
		"21/cli-backups/2.1.310/cli": "c", "21/worker-backups-before-0.1.114/old": "o", "21/resolv.conf": "nameserver 1.1.1.1\n",
		"21/app.nft": "table", "21/weird.bin": "?", "21/.hidden": "h",
		"d0123456789abcdef/state.json": "sd", "d0123456789abcdef/resolv.conf": "r",
		"shared-egress/state.json": "creds", "shared-egress/boot.json": "{}", "shared-egress/boot.nft": "b", "shared-egress/dns.json": "{}",
		"shared-egress/active.nft": "a", "shared-egress/operation.json": "{}", "shared-egress/x.tmp": "t",
		"controller-before-0.1.115/state.json": "old", "0notakey/f": "n", "stray.txt": "s",
	} {
		h.write(h.root+"/"+p, c)
	}
	h.must(os.Symlink(h.root+"/21", h.root+"/22"))
	h.write(h.dir+"/.env", "CCG_GUARD_IMAGE=ccgateway-guard:s1\nCCG_CONTROLLER_IMAGE=placeholder-controller:0\nCCG_GATEWAY_IMAGE=ccgateway-egress:live\nCCG_GUARD_TOKEN="+strings.Repeat("ab", 32)+"\nCCG_CONTROL_DNS=1\n")
	return h
}

var adoptedData = []string{
	".adopted", ".lock", "runtime.json", "uploads/", "uploads/u1.part", "backups/", "backups/7.json", "shared-egress-state.json",
	"21/", "21/state.json", "21/egress-desired.json", "21/worker-backups/", "21/worker-backups/20261101-abc/", "21/worker-backups/20261101-abc/worker",
	"21/cli-backups/", "21/cli-backups/2.1.310/", "21/cli-backups/2.1.310/cli", "21/worker-backups-before-0.1.114/", "21/worker-backups-before-0.1.114/old",
	"21/weird.bin", "21/.hidden", "d0123456789abcdef/", "d0123456789abcdef/state.json",
}

var keptRoot = []string{
	"21/", "21/resolv.conf", "21/app.nft", "22@", "d0123456789abcdef/", "d0123456789abcdef/resolv.conf",
	"shared-egress/", "shared-egress/boot.json", "shared-egress/boot.nft", "shared-egress/dns.json", "shared-egress/active.nft",
	"shared-egress/operation.json", "shared-egress/x.tmp", "controller-before-0.1.115/", "controller-before-0.1.115/state.json",
	"0notakey/", "0notakey/f", "stray.txt",
}

// covers: §76 compose install, transition, rollback, finish (04 §2.10 nine scenarios)
func TestComposeScriptsBehaviour(t *testing.T) {
	t.Run("1 new host", func(t *testing.T) {
		h := newFakeHost(t)
		out, res := h.install(testEnvFile)
		if res != "started" {
			t.Fatalf("result %q:\n%s\n%s", res, out, h.calls())
		}
		if h.read(h.envf) != testEnvFile || h.read(h.dir+"/compose.yml") != composeTemplate {
			t.Fatal("environment file or compose.yml not written verbatim")
		}
		env := h.read(h.dir + "/.env")
		if !regexp.MustCompile(`^CCG_GUARD_IMAGE=placeholder-guard:0\nCCG_CONTROLLER_IMAGE=placeholder-controller:0\nCCG_GATEWAY_IMAGE=placeholder-egress:0\nCCG_GUARD_TOKEN=[0-9a-f]{64}\n$`).MatchString(env) {
			t.Fatalf(".env:\n%s", env)
		}
		for _, p := range []string{h.dir + "/.env", h.dir + "/compose.yml", h.envf} {
			if st, _ := os.Stat(p); st.Mode().Perm() != 0o600 {
				t.Fatalf("%s mode %v", p, st.Mode())
			}
		}
		for _, p := range []string{h.dir, h.data, h.root, h.state} {
			if st, _ := os.Stat(p); st.Mode().Perm() != 0o700 {
				t.Fatalf("%s mode %v", p, st.Mode())
			}
		}
		if exists(h.dir+"/.env.prev") || exists(h.dir+"/.transition") || h.read(h.data+"/.adopted") != "" {
			t.Fatal("marks of a new host")
		}
		if h.read(h.fake+"/networks/ccg-control") != "172.29.255.0/29\n" {
			t.Fatal("control network")
		}
		if strings.Join(h.ups(), ",") != "guard=placeholder-guard:0,controller=placeholder-controller:0" {
			t.Fatalf("ups: %v", h.ups())
		}
		calls := h.calls()
		order := []string{"docker compose version", "systemctl is-active --quiet ccgateway-bridge-guard", "docker network create",
			" config -q", " up -d --no-deps guard", " exec -T guard ccgateway-guard ready", " up -d --no-deps controller"}
		at := 0
		for _, c := range order {
			i := strings.Index(calls[at:], c)
			if i < 0 {
				t.Fatalf("%q missing or out of order:\n%s", c, calls)
			}
			at += i
		}
		if strings.Contains(calls, " down") || strings.Contains(calls, "docker run") || regexp.MustCompile(`(?m) up -d( --no-deps)?$`).MatchString(calls) {
			t.Fatalf("down, docker run or an up without a service:\n%s", calls)
		}
		// Reinstalling keeps the token.
		token := env[strings.Index(env, "CCG_GUARD_TOKEN="):]
		if _, res = h.install(testEnvFile); res != "started" || !strings.Contains(h.read(h.dir+"/.env"), token) {
			t.Fatalf("reinstall: %s %s", res, h.read(h.dir+"/.env"))
		}
	})

	t.Run("2 transition, 7 finish", func(t *testing.T) {
		h := pythonHost(t)
		s1 := h.read(h.dir + "/.env")
		out, res := h.install(testEnvFile)
		if res != "started" {
			t.Fatalf("result %q:\n%s\n%s", res, out, h.calls())
		}
		sameTree(t, "data", tree(t, h.data), adoptedData)
		sameTree(t, "runtime root", tree(t, h.root), keptRoot)
		adopted := h.read(h.data + "/.adopted")
		for _, l := range []string{"mv .lock", "mv shared-egress/state.json", "mv 21/worker-backups", "mv 21/.hidden", "mv d0123456789abcdef/state.json",
			"keep shared-egress/x.tmp", "keep controller-before-0.1.115", "keep 0notakey", "keep 22", "keep stray.txt"} {
			if !strings.Contains(adopted, l+"\n") {
				t.Errorf(".adopted lacks %q:\n%s", l, adopted)
			}
		}
		if strings.Contains(adopted, "resolv.conf") || strings.Contains(adopted, "app.nft") || strings.Contains(adopted, "boot.json") {
			t.Fatalf("mount sources listed:\n%s", adopted)
		}
		if ok, p, img, running := h.containerState("ccg-controller"); !ok || p != "ccgateway" || img != h.ctl || !running {
			t.Fatalf("controller: %v %q %q %v", ok, p, img, running)
		}
		if ok, p, img, running := h.containerState("ccg-controller-prev"); !ok || p != "" || img != h.oldC || running {
			t.Fatalf("previous controller: %v %q %q %v", ok, p, img, running)
		}
		if !exists(h.dir+"/.transition") || h.read(h.dir+"/.env.prev") != s1 {
			t.Fatal("transition marks")
		}
		env := h.read(h.dir + "/.env")
		if env != "CCG_CONTROL_DNS=1\nCCG_GUARD_IMAGE=placeholder-guard:0\nCCG_CONTROLLER_IMAGE=placeholder-controller:0\nCCG_GATEWAY_IMAGE=ccgateway-egress:live\nCCG_GUARD_TOKEN="+strings.Repeat("ab", 32)+"\n" {
			t.Fatalf(".env keeps the token, the gateway and other variables:\n%s", env)
		}
		// 7: finish drops the previous controller and the marks, keeps the data.
		if _, res = h.run(finishScript, ""); res != "done" {
			t.Fatalf("finish: %s", res)
		}
		if ok, _, _, _ := h.containerState("ccg-controller-prev"); ok || exists(h.dir+"/.env.prev") || exists(h.dir+"/.transition") {
			t.Fatal("finish left the previous controller or a mark")
		}
		sameTree(t, "data after finish", tree(t, h.data), adoptedData)
		// From now on the old image is refused (8).
		h.must(os.Remove(h.data + "/.adopted"))
		if _, res = h.run(mustScript(t, RuntimeImages{App: h.app, Egress: h.egress, Controller: h.oldC, Guard: h.guard}), testEnvFile); res != "legacy_blocked" {
			t.Fatalf("old image on a compose host: %s", res)
		}
	})

	t.Run("4 up controller fails: inline rollback", func(t *testing.T) {
		h := pythonHost(t)
		before, s1 := tree(t, h.root), h.read(h.dir+"/.env")
		h.fail("up-controller")
		out, res := h.install(testEnvFile)
		if res != "controller_unhealthy" || scriptRollback(out) != "restored" {
			t.Fatalf("%s:\n%s", res, out)
		}
		sameTree(t, "runtime root", tree(t, h.root), before)
		if tree(t, h.data) != nil || exists(h.dir+"/.transition") || exists(h.dir+"/.env.prev") || h.read(h.dir+"/.env") != s1 {
			t.Fatalf("not restored: data %v", tree(t, h.data))
		}
		if ok, p, img, running := h.containerState("ccg-controller"); !ok || p != "" || img != h.oldC || !running {
			t.Fatalf("old controller: %v %q %q %v", ok, p, img, running)
		}
		if ups := h.ups(); ups[len(ups)-1] != "guard=ccgateway-guard:s1" {
			t.Fatalf("guard not restored: %v", ups)
		}
	})

	t.Run("5 transition, unhealthy: rollback", func(t *testing.T) {
		h := pythonHost(t)
		before, s1 := tree(t, h.root), h.read(h.dir+"/.env")
		if _, res := h.install(testEnvFile); res != "started" {
			t.Fatalf("install: %s", res)
		}
		// The Go controller made a new account meanwhile.
		h.write(h.data+"/55/state.json", "s55")
		h.write(h.root+"/55/resolv.conf", "r")
		out, res := h.run(rollbackScript, "")
		if res != "restored" {
			t.Fatalf("rollback %s:\n%s", res, out)
		}
		sameTree(t, "runtime root", tree(t, h.root), append(before, "55/", "55/state.json", "55/resolv.conf"))
		if h.read(h.root+"/shared-egress/state.json") != "creds" || h.read(h.root+"/21/state.json") != "s21" {
			t.Fatal("contents changed")
		}
		if tree(t, h.data) != nil || exists(h.dir+"/.transition") || h.read(h.dir+"/.env") != s1 {
			t.Fatalf("not released: %v", tree(t, h.data))
		}
		if ok, p, img, running := h.containerState("ccg-controller"); !ok || p != "" || img != h.oldC || !running {
			t.Fatalf("old controller: %v %q %q %v", ok, p, img, running)
		}
		if ok, _, _, _ := h.containerState("ccg-controller-prev"); ok {
			t.Fatal("previous controller left")
		}
		// Released: the old image installs again by docker run.
		if _, res = h.run(mustScript(t, RuntimeImages{App: h.app, Egress: h.egress, Controller: h.oldC, Guard: h.guard}), testEnvFile); res != "started" || !strings.Contains(h.calls(), "docker run -d --name ccg-controller") {
			t.Fatalf("docker run after release: %s", res)
		}
	})

	t.Run("3 compose host reinstall, 6 rollback to .env.prev", func(t *testing.T) {
		h := newFakeHost(t)
		h.container("ccg-guard", "ccgateway", "ccgateway-guard:old", true)
		h.container("ccg-controller", "ccgateway", "ccgateway-controller:old", true)
		old := "# comment\nOTHER=x\nCCG_CONTROL_DNS=0\nCCG_GUARD_IMAGE=ccgateway-guard:old\nCCG_CONTROLLER_IMAGE=ccgateway-controller:old\nCCG_GATEWAY_IMAGE=gw:live\nCCG_GUARD_TOKEN=" + strings.Repeat("cd", 32) + "\n"
		h.write(h.dir+"/.env", old)
		h.write(h.data+"/.adopted", "")
		h.write(h.data+"/21/state.json", "s")
		h.write(h.fake+"/networks/ccg-control", "172.29.255.0/29\n")
		if out, res := h.install(testEnvFile); res != "started" {
			t.Fatalf("%s:\n%s", res, out)
		}
		if env := h.read(h.dir + "/.env"); env != "CCG_CONTROL_DNS=0\nCCG_GUARD_IMAGE=placeholder-guard:0\nCCG_CONTROLLER_IMAGE=placeholder-controller:0\nCCG_GATEWAY_IMAGE=gw:live\nCCG_GUARD_TOKEN="+strings.Repeat("cd", 32)+"\n" {
			t.Fatalf(".env:\n%s", env)
		}
		if h.read(h.dir+"/.env.prev") != old || exists(h.dir+"/.transition") || strings.Contains(h.calls(), "network create") {
			t.Fatal("reinstall marks")
		}
		sameTree(t, "data", tree(t, h.data), []string{".adopted", "21/", "21/state.json"})
		if out, res := h.run(rollbackScript, ""); res != "restored" {
			t.Fatalf("rollback %s:\n%s", res, out)
		}
		if h.read(h.dir+"/.env") != old || exists(h.dir+"/.env.prev") {
			t.Fatal(".env not restored")
		}
		if _, _, img, running := h.containerState("ccg-controller"); img != "ccgateway-controller:old" || !running {
			t.Fatalf("controller image after rollback: %q", img)
		}
		if ups := h.ups(); strings.Join(ups[len(ups)-2:], ",") != "guard=ccgateway-guard:old,controller=ccgateway-controller:old" {
			t.Fatalf("ups: %v", ups)
		}
		// A first compose install that never became healthy: removed.
		h2 := newFakeHost(t)
		if _, res := h2.install(testEnvFile); res != "started" {
			t.Fatal(res)
		}
		if _, res := h2.run(rollbackScript, ""); res != "removed" {
			t.Fatalf("rollback of a new host: %s", res)
		}
		if ok, _, _, _ := h2.containerState("ccg-controller"); ok {
			t.Fatal("controller left")
		}
	})

	t.Run("8 legacy_blocked", func(t *testing.T) {
		old := RuntimeImages{App: "placeholder-app:0", Egress: "placeholder-egress:0", Controller: "ccgateway-controller:0.1.118", Guard: "placeholder-guard:0"}
		h := newFakeHost(t)
		h.container("ccg-controller", "ccgateway", h.ctl, true)
		if _, res := h.run(mustScript(t, old), testEnvFile); res != "legacy_blocked" || exists(h.envf) || strings.Contains(h.calls(), "docker run") || strings.Contains(h.calls(), "rename") {
			t.Fatalf("compose controller: %s\n%s", res, h.calls())
		}
		h = newFakeHost(t)
		h.write(h.data+"/.adopted", "")
		if _, res := h.run(mustScript(t, old), testEnvFile); res != "legacy_blocked" || exists(h.envf) {
			t.Fatalf(".adopted: %s", res)
		}
		// A docker run host is not blocked, and takes the 0.1.226 path.
		h = newFakeHost(t)
		h.container("ccg-controller", "", "ccgateway-controller:0.1.117", true)
		if _, res := h.run(mustScript(t, old), testEnvFile); res != "started" || exists(h.dir+"/compose.yml") {
			t.Fatalf("docker run host: %s", res)
		}
		if ok, p, img, _ := h.containerState("ccg-controller"); !ok || p != "" || img != old.Controller {
			t.Fatalf("docker run controller: %q %q", p, img)
		}
		if _, res := h.run(rollbackScript, ""); res != "restored" {
			t.Fatalf("0.1.226 rollback: %s", res)
		}
		if _, _, img, running := h.containerState("ccg-controller"); img != "ccgateway-controller:0.1.117" || !running {
			t.Fatalf("restored controller: %q", img)
		}
	})

	t.Run("9 interrupted transition: only prev left, adopt half done", func(t *testing.T) {
		h := pythonHost(t)
		h.must(os.Rename(h.fake+"/containers/ccg-controller", h.fake+"/containers/ccg-controller-prev"))
		h.must(os.Remove(h.fake + "/containers/ccg-controller-prev/running"))
		h.write(h.dir+"/.transition", "")
		h.must(os.MkdirAll(h.data, 0o700))
		h.must(os.Rename(h.root+"/.lock", h.data+"/.lock"))
		h.write(h.data+"/.adopting", "mv .lock\n")
		if out, res := h.install(testEnvFile); res != "started" {
			t.Fatalf("%s:\n%s\n%s", res, out, h.calls())
		}
		sameTree(t, "data", tree(t, h.data), adoptedData)
		if !strings.HasPrefix(h.read(h.data+"/.adopted"), "mv .lock\n") {
			t.Fatal("journal of the first attempt lost")
		}
		if ok, p, _, running := h.containerState("ccg-controller-prev"); !ok || p != "" || running {
			t.Fatal("previous controller")
		}
		// And it can still be released completely.
		if _, res := h.run(rollbackScript, ""); res != "restored" || tree(t, h.data) != nil || !exists(h.root+"/.lock") {
			t.Fatalf("release after an interrupted adopt: %s %v", res, tree(t, h.data))
		}
	})

	t.Run("adopt conflict restores the old controller", func(t *testing.T) {
		h := pythonHost(t)
		before := tree(t, h.root)
		h.write(h.data+"/runtime.json", "stale")
		out, res := h.install(testEnvFile)
		if res != "adopt_failed" || scriptRollback(out) != "restored" {
			t.Fatalf("%s:\n%s", res, out)
		}
		sameTree(t, "runtime root", tree(t, h.root), before)
		sameTree(t, "data", tree(t, h.data), []string{"runtime.json"})
		if ok, p, _, running := h.containerState("ccg-controller"); !ok || p != "" || !running {
			t.Fatal("old controller not restarted")
		}
	})

	t.Run("refusals", func(t *testing.T) {
		h := newFakeHost(t)
		h.fail("compose-version")
		if _, res := h.install(testEnvFile); res != "compose_unavailable" || exists(h.envf) || exists(h.dir) {
			t.Fatalf("compose_unavailable: %s", res)
		}
		h = newFakeHost(t)
		h.write(h.fake+"/bridge-active", "")
		if _, res := h.install(testEnvFile); res != "bridge_guard_active" || exists(h.envf) {
			t.Fatalf("bridge_guard_active: %s", res)
		}
		h = newFakeHost(t)
		h.write(h.fake+"/networks/ccg-control", "10.0.0.0/24\n")
		h.write(h.dir+"/.env", "CCG_GUARD_TOKEN="+strings.Repeat("ef", 32)+"\n")
		if _, res := h.install(testEnvFile); res != "control_network_conflict" || h.read(h.dir+"/.env") != "CCG_GUARD_TOKEN="+strings.Repeat("ef", 32)+"\n" || exists(h.dir+"/.env.prev") {
			t.Fatalf("control_network_conflict: %s", res)
		}
		h = pythonHost(t)
		s1 := h.read(h.dir + "/.env")
		h.fail("guard-ready")
		if _, res := h.install(testEnvFile); res != "guard_unavailable" || h.read(h.dir+"/.env") != s1 || exists(h.dir+"/.env.prev") {
			t.Fatalf("guard_unavailable: %s", res)
		}
		if ok, p, _, running := h.containerState("ccg-controller"); !ok || p != "" || !running || exists(h.data+"/.adopted") {
			t.Fatal("the old controller was touched before the guard was ready")
		}
		h = newFakeHost(t)
		h.fail("up-guard")
		if _, res := h.install(testEnvFile); res != "guard_unavailable" {
			t.Fatalf("guard up: %s", res)
		}
		h = newFakeHost(t)
		h.fail("pull")
		h.must(os.RemoveAll(h.fake + "/images/" + san(h.guard)))
		if _, res := h.install(testEnvFile); res != "image_pull_failed" {
			t.Fatalf("guard pull: %s", res)
		}
	})
}

// TestComposeLockPortable: the compose lock works with BusyBox flock, which
// has no -w (Alpine hosts; found in the S0 dind drill, 2026-11-01), and gives
// up with compose_locked while another holder (the guard) keeps the lock.
func TestComposeLockPortable(t *testing.T) {
	real, err := exec.LookPath("flock")
	if err != nil {
		t.Fatalf("needs flock: %v", err)
	}
	h := newFakeHost(t)
	busybox := `#!/bin/sh
for a in "$@"; do case "$a" in -w*|--wait*|--timeout*) echo 'flock: unrecognized option: w' >&2; exit 1 ;; esac; done
exec ` + real + ` "$@"
`
	h.must(os.WriteFile(h.base+"/bin/flock", []byte(busybox), 0o755))
	if out, res := h.install(testEnvFile); res != "started" {
		t.Fatalf("install with a flock without -w: %q\n%s\n%s", res, out, h.calls())
	}
	f, err := os.OpenFile(h.dir+"/.compose.lock", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	h.must(err)
	defer f.Close()
	h.must(syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB))
	before := h.read(h.dir + "/.env")
	if out, res := h.install(testEnvFile); res != "compose_locked" || h.read(h.dir+"/.env") != before {
		t.Fatalf("lock held elsewhere: %q\n%s", res, out)
	}
	if out, res := h.run(rollbackScript, ""); res != "restore_failed" {
		t.Fatalf("rollback while the lock is held: %q\n%s", res, out)
	}
	h.must(syscall.Flock(int(f.Fd()), syscall.LOCK_UN))
	if out, res := h.install(testEnvFile); res != "started" {
		t.Fatalf("after the holder released the lock: %q\n%s", res, out)
	}
}

func mustScript(t *testing.T, img RuntimeImages) string {
	t.Helper()
	s, err := installScript(img, true)
	if err != nil {
		t.Fatal(err)
	}
	return s
}
