package ccgateway

import (
	"context"
	"flag"
	"os"
	"reflect"
	"regexp"
	"sort"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

// Compose installation (CONTRACTS §76): the docker run path is the 0.1.226
// text, the template follows the guard's permission rules, the golden
// scripts are what the core runs.

var updateGolden = flag.Bool("update", false, "rewrite testdata/compose-*.golden.sh")

var placeholderImages = RuntimeImages{App: "placeholder-app:0", Egress: "placeholder-egress:0", Controller: "placeholder-controller:0", Guard: "placeholder-guard:0"}

func readTestdata(t *testing.T, name string) string {
	t.Helper()
	b, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

// legacyBranch rebuilds the script the docker run path executes: the lines
// before the branch without the new variable assignments and label reads,
// then the branch body without the legacy_blocked check.
func legacyBranch(t *testing.T, script string) string {
	t.Helper()
	lines := strings.SplitAfter(script, "\n")
	var out []string
	i := 0
	for ; i < len(lines); i++ {
		l := lines[i]
		if l == "if [ \"$API\" != 1 ]; then\n" {
			break
		}
		switch {
		case strings.HasPrefix(l, "GUARD='"), strings.HasPrefix(l, "DIR='"), strings.HasPrefix(l, "DATA='"), strings.HasPrefix(l, "STATE='"):
			// New constants: assignments only.
			if strings.ContainsAny(strings.TrimSuffix(strings.SplitN(l, "=", 2)[1], "\n"), "$`;|&") {
				t.Fatalf("new line is more than an assignment: %q", l)
			}
		case strings.HasPrefix(l, "API=$(docker image inspect --format "), strings.HasPrefix(l, "OWNER=$(docker inspect --type container --format "):
			// Read-only label lookups.
			if !strings.HasSuffix(l, " 2>/dev/null)\n") {
				t.Fatalf("label lookup changed: %q", l)
			}
		default:
			out = append(out, l)
		}
	}
	if i+2 >= len(lines) {
		t.Fatal("no docker run branch")
	}
	if blocked := lines[i+1]; blocked != "if [ \"$OWNER\" = ccgateway ] || [ -e \"$DATA/.adopted\" ] || [ -e \"$DATA/.adopting\" ]; then echo CCG_RESULT=legacy_blocked; exit 1; fi\n" {
		t.Fatalf("legacy_blocked line: %q", blocked)
	}
	for i += 2; i < len(lines); i++ {
		if lines[i] == "exit 0\n" && i+1 < len(lines) && lines[i+1] == "fi\n" {
			return strings.Join(out, "")
		}
		out = append(out, lines[i])
	}
	t.Fatal("docker run branch does not end with exit 0 / fi")
	return ""
}

// covers: §76.2 the docker run path is 0.1.226 byte for byte
func TestInstallScriptLegacyBranchUnchanged(t *testing.T) {
	for _, tc := range []struct {
		optional bool
		golden   string
	}{{false, "install-legacy-0.1.226.sh"}, {true, "install-legacy-0.1.226-optional.sh"}} {
		script, err := installScript(placeholderImages, tc.optional)
		if err != nil {
			t.Fatal(err)
		}
		if got, want := legacyBranch(t, script), readTestdata(t, tc.golden); got != want {
			t.Fatalf("docker run path differs from 0.1.226 (%s):\n--- got\n%s\n--- want\n%s", tc.golden, got, want)
		}
	}
	// rollbackScript: the compose branch exits, then the 0.1.226 text.
	want := readTestdata(t, "rollback-legacy-0.1.226.sh")
	head, ok := strings.CutSuffix(rollbackScript, want)
	if !ok || !strings.HasSuffix(head, "  exit 0\nfi\n") {
		t.Fatalf("rollback script does not end with the 0.1.226 rollback:\n%s", rollbackScript)
	}
	if strings.Contains(head, "docker rm -f ccg-controller ") || strings.Contains(head, "docker run") {
		t.Fatal("the compose branch of the rollback touches the docker run controller")
	}
}

// composeService is the subset of a compose service the policy checks.
type composeService struct {
	Image       string            `yaml:"image"`
	NetworkMode string            `yaml:"network_mode"`
	Pid         string            `yaml:"pid"`
	Privileged  bool              `yaml:"privileged"`
	CapDrop     []string          `yaml:"cap_drop"`
	CapAdd      []string          `yaml:"cap_add"`
	SecurityOpt []string          `yaml:"security_opt"`
	ReadOnly    bool              `yaml:"read_only"`
	Ports       []string          `yaml:"ports"`
	Profiles    []string          `yaml:"profiles"`
	Environment map[string]string `yaml:"environment"`
	Volumes     []struct {
		Type     string `yaml:"type"`
		Source   string `yaml:"source"`
		Target   string `yaml:"target"`
		ReadOnly bool   `yaml:"read_only"`
		Bind     struct {
			CreateHostPath *bool `yaml:"create_host_path"`
		} `yaml:"bind"`
	} `yaml:"volumes"`
	Healthcheck struct {
		Test []string `yaml:"test"`
	} `yaml:"healthcheck"`
	Networks yaml.Node `yaml:"networks"`
}

// covers: §76.3 compose template policy; 05 §3 L0 rule for the controller service
func TestComposeTemplatePolicy(t *testing.T) {
	var doc struct {
		Name     string                    `yaml:"name"`
		Services map[string]composeService `yaml:"services"`
		Networks map[string]struct {
			External bool   `yaml:"external"`
			Name     string `yaml:"name"`
		} `yaml:"networks"`
	}
	if err := yaml.Unmarshal([]byte(composeTemplate), &doc); err != nil {
		t.Fatal(err)
	}
	if doc.Name != "ccgateway" {
		t.Fatalf("project name %q", doc.Name)
	}
	names := []string{}
	for n := range doc.Services {
		names = append(names, n)
	}
	sort.Strings(names)
	if strings.Join(names, ",") != "controller,egress,guard" {
		t.Fatalf("services: %v", names)
	}

	ctl := doc.Services["controller"]
	if ctl.NetworkMode != "" || ctl.Pid != "" || ctl.Privileged || len(ctl.CapAdd) != 0 {
		t.Fatalf("controller: network_mode %q pid %q privileged %v cap_add %v", ctl.NetworkMode, ctl.Pid, ctl.Privileged, ctl.CapAdd)
	}
	if strings.Join(ctl.CapDrop, ",") != "ALL" || !ctl.ReadOnly || strings.Join(ctl.SecurityOpt, ",") != "no-new-privileges:true" {
		t.Fatalf("controller hardening: %v %v %v", ctl.CapDrop, ctl.ReadOnly, ctl.SecurityOpt)
	}
	if len(ctl.Volumes) != 1 || ctl.Volumes[0].Target != "/data" || ctl.Volumes[0].Source != "${CCG_CONTROLLER_DATA:-/opt/ccgateway-controller}" {
		t.Fatalf("controller volumes: %+v", ctl.Volumes)
	}
	if len(ctl.Ports) != 1 || !strings.HasPrefix(ctl.Ports[0], "127.0.0.1:") {
		t.Fatalf("controller ports: %v", ctl.Ports)
	}
	for k, v := range map[string]string{"CCG_RUNTIME_ROOT": "/data", "CCG_CONTROLLER_BIND": "0.0.0.0", "CCG_CONTROLLER_IMAGE": "${CCG_CONTROLLER_IMAGE:?}",
		"CCG_GUARD_URL": "http://${CCG_GUARD_ADDR:-172.29.255.1}:8790", "CCG_GUARD_TOKEN": "${CCG_GUARD_TOKEN:?}"} {
		if ctl.Environment[k] != v {
			t.Errorf("controller environment %s = %q, want %q", k, ctl.Environment[k], v)
		}
	}
	if strings.Join(ctl.Healthcheck.Test, " ") != "CMD /ccg-controller healthcheck" {
		t.Fatalf("controller healthcheck: %v", ctl.Healthcheck.Test)
	}
	// The controller service block itself (05 §3 L0): no Docker access.
	block := serviceBlock(t, "controller")
	for _, bad := range []string{"docker.sock", "network_mode", "privileged", "cap_add", "pid:"} {
		if strings.Contains(block, bad) {
			t.Fatalf("controller service contains %q", bad)
		}
	}

	g := doc.Services["guard"]
	if g.NetworkMode != "host" || g.Pid != "host" || g.Privileged || strings.Join(g.CapDrop, ",") != "ALL" || !g.ReadOnly {
		t.Fatalf("guard: %+v", g)
	}
	// U3: exactly NET_ADMIN, SYS_ADMIN, SYS_PTRACE added back.
	if caps := append([]string(nil), g.CapAdd...); func() string { sort.Strings(caps); return strings.Join(caps, ",") }() != "NET_ADMIN,SYS_ADMIN,SYS_PTRACE" {
		t.Fatalf("guard capabilities: %v", g.CapAdd)
	}
	if strings.Join(g.SecurityOpt, ",") != "no-new-privileges:true" {
		t.Fatalf("guard security_opt: %v", g.SecurityOpt)
	}
	targets := []string{}
	for _, v := range g.Volumes {
		resolved := v.Target == "/run/systemd/resolve"
		if v.Type != "bind" || v.Bind.CreateHostPath == nil || *v.Bind.CreateHostPath != resolved || resolved && !v.ReadOnly {
			t.Fatalf("guard mount %+v: only the read-only resolved directory may be created on the host", v)
		}
		targets = append(targets, v.Target)
		if v.Target == "${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env}" && !v.ReadOnly {
			t.Fatal("the controller environment file is writable for the guard")
		}
	}
	// D6: no /run/xtables.lock; no controller data directory (adopt is the core's).
	if strings.Join(targets, ",") != "/var/run/docker.sock,${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime},${CCG_PROJECT_DIR:-/opt/ccgateway},${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env},/var/lib/ccgateway-guard,/run/systemd/resolve" {
		t.Fatalf("guard mounts: %v", targets)
	}
	if strings.Contains(composeTemplate, "xtables") || strings.Contains(serviceBlock(t, "guard"), "ccgateway-controller") {
		t.Fatal("guard mounts xtables.lock or the controller data")
	}
	if strings.Join(g.Healthcheck.Test, " ") != "CMD /usr/local/bin/ccgateway-guard ready" {
		t.Fatalf("guard healthcheck: %v", g.Healthcheck.Test)
	}
	if g.Environment["CCG_GUARD_TOKEN"] != "${CCG_GUARD_TOKEN:?}" || g.Environment["CCG_GUARD_CONTROL_DNS"] != "${CCG_CONTROL_DNS:-1}" {
		t.Fatalf("guard environment: %v", g.Environment)
	}

	// docker.sock appears in the guard only.
	if n := strings.Count(composeTemplate, "docker.sock"); n != 2 || !strings.Contains(serviceBlock(t, "guard"), "docker.sock") {
		t.Fatalf("docker.sock outside the guard (%d)", n)
	}
	if e := doc.Services["egress"]; strings.Join(e.Profiles, ",") != "egress" || e.NetworkMode != "" || e.Privileged {
		t.Fatalf("egress: %+v", e)
	}
	for name, n := range doc.Networks {
		if !n.External {
			t.Fatalf("network %s is not external", name)
		}
	}

	// Every interpolated variable is known, and its default is production.
	defaults := map[string]string{
		"CCG_PREFIX": "ccg", "CCG_GUARD_ADDR": "172.29.255.1", "CCG_CONTROLLER_IP": "172.29.255.2", "CCG_CONTROL_NETWORK": "ccg-control",
		"CCG_CONTROL_BRIDGE": "ccg-control0", "CCG_CONTROL_SUBNET": "172.29.255.0/29", "CCG_CONTROL_DNS": "1", "CCG_CHAIN_PREFIX": "CCG",
		"CCG_PROJECT": "ccgateway", "CCG_PROJECT_DIR": composeDir, "CCG_RUNTIME_HOST_ROOT": runtimeRoot, "CCG_RUNTIME_ENV": runtimeEnvFile,
		"CCG_GUARD_STATE": guardState, "CCG_CONTROLLER_PUBLISH": "8787", "CCG_CONTROLLER_DATA": controllerData,
	}
	required := map[string]bool{"CCG_GUARD_IMAGE": true, "CCG_GUARD_TOKEN": true, "CCG_CONTROLLER_IMAGE": true, "CCG_GATEWAY_IMAGE": true}
	seen := map[string]bool{}
	for _, m := range regexp.MustCompile(`\$\{([^}]*)\}`).FindAllStringSubmatch(composeTemplate, -1) {
		v := m[1]
		if name, ok := strings.CutSuffix(v, ":?"); ok {
			if !required[name] {
				t.Errorf("unexpected required variable %s", name)
			}
			seen[name] = true
			continue
		}
		name, def, ok := strings.Cut(v, ":-")
		if !ok {
			t.Errorf("variable without a default: ${%s}", v)
			continue
		}
		if want, known := defaults[name]; !known || def != want {
			t.Errorf("${%s}: default %q, want %q (known %v)", name, def, want, known)
		}
		seen[name] = true
	}
	for name := range required {
		if !seen[name] {
			t.Errorf("required variable %s not used", name)
		}
	}
	// The install script creates the control network the template names.
	script, _ := installScript(placeholderImages, false)
	if !strings.Contains(script, "--subnet 172.29.255.0/29 --gateway 172.29.255.1") || !strings.Contains(script, "bridge.name=ccg-control0") {
		t.Fatal("install script and template disagree on the control network")
	}
}

// serviceBlock is the template text of one service (up to the next one).
func serviceBlock(t *testing.T, name string) string {
	t.Helper()
	_, rest, ok := strings.Cut(composeTemplate, "\n  "+name+":\n")
	if !ok {
		t.Fatalf("no service %s", name)
	}
	if i := regexp.MustCompile(`\n(  [a-z]+:\n|[a-z]+:)`).FindStringIndex(rest); i != nil {
		rest = rest[:i[0]]
	}
	return rest
}

// covers: §76.4 golden scripts (S4 runs them after replacing the placeholders)
func TestComposeGoldenScripts(t *testing.T) {
	install, err := installScript(placeholderImages, true)
	if err != nil {
		t.Fatal(err)
	}
	for name, text := range map[string]string{
		"compose-install.golden.sh":  install,
		"compose-rollback.golden.sh": rollbackScript,
		"compose-finish.golden.sh":   finishScript,
	} {
		path := "testdata/" + name
		if *updateGolden {
			if err := os.WriteFile(path, []byte(text), 0o644); err != nil {
				t.Fatal(err)
			}
			continue
		}
		if got := readTestdata(t, name); got != text {
			t.Errorf("%s is out of date: go test -run TestComposeGoldenScripts -update", path)
		}
	}
	for _, ref := range []string{placeholderImages.App, placeholderImages.Egress, placeholderImages.Controller, placeholderImages.Guard} {
		if !validImage(ref) {
			t.Fatalf("placeholder %s is not a valid reference", ref)
		}
	}
}

// covers: D8 controller_adopt_required (§76.6)
func TestControllerAdoptRequired(t *testing.T) {
	labelled := func(m map[string]any) {
		m["images"].(map[string]any)["controller"].(map[string]any)["labels"] = map[string]string{guardAPILabel: "1"}
	}
	t.Run("bundled push refuses the controller only", func(t *testing.T) {
		f, panel, _ := newBundlePanel(t)
		makeBundle(t, "0.1.16", labelled).use(f.s)
		code, out := f.request(f.user("admin@x"), "POST", "/system/ccgateway/runtime/bundled", "")
		results := string(mustJSON(data(out)["results"]))
		want := `[{"reason":"controller_adopt_required","ref":"` + testBundleRefs["controller"] + `","role":"controller","status":"failed"},`
		if code != 200 || !strings.HasPrefix(results, want) || !strings.Contains(results, `"role":"app","status":"loaded"`) {
			t.Fatalf("bundled: %d %s", code, results)
		}
		panel.mu.Lock()
		_, sent := panel.received[testBundleRefs["controller"]]
		panel.mu.Unlock()
		if sent || strings.Contains(panel.seen(), "POST /runtime/controller") {
			t.Fatalf("the controller image was sent or switched: %s", panel.seen())
		}
	})
	t.Run("one-click upgrade refuses before any change", func(t *testing.T) {
		f, panel, _ := newBundlePanel(t)
		makeBundle(t, "0.1.16", labelled).use(f.s)
		code, out := f.request(f.user("admin@x"), "POST", "/system/ccgateway/runtime/install", "")
		if code != 409 || reason(out) != "controller_adopt_required" {
			t.Fatalf("one-click: %d %v", code, out)
		}
		if calls := panel.seen(); calls != "GET /health" {
			t.Fatalf("calls: %s", calls)
		}
	})
	t.Run("an adopted controller upgrades", func(t *testing.T) {
		f, panel, _ := newBundlePanel(t)
		makeBundle(t, "0.1.16", labelled).use(f.s)
		panel.mu.Lock()
		panel.health.Features = append(panel.health.Features, guardAPIFeature)
		panel.mu.Unlock()
		code, out := f.request(f.user("admin@x"), "POST", "/system/ccgateway/runtime/bundled", `{"roles":["controller"]}`)
		if results := string(mustJSON(data(out)["results"])); code != 200 || !strings.Contains(results, `"role":"controller","status":"loaded"`) {
			t.Fatalf("bundled: %d %s", code, results)
		}
	})
	t.Run("an unlabelled bundle is not refused", func(t *testing.T) {
		f, _, _ := newBundlePanel(t)
		code, out := f.request(f.user("admin@x"), "POST", "/system/ccgateway/runtime/bundled", `{"roles":["controller"]}`)
		if results := string(mustJSON(data(out)["results"])); code != 200 || !strings.Contains(results, `"role":"controller","status":"loaded"`) {
			t.Fatalf("bundled: %d %s", code, results)
		}
	})
	t.Run("an uploaded guard-only controller is not applied", func(t *testing.T) {
		f, panel := newPanelFixture(t)
		makeBundle(t, "0.1.16", labelled).use(f.s)
		panel.mu.Lock()
		panel.upgrade = true
		panel.load = `{"sha256":"` + strings.Repeat("c", 64) + `","images":[{"id":"sha256:` + strings.Repeat("f", 64) + `","tags":["` + testBundleRefs["controller"] + `"]}]}`
		panel.mu.Unlock()
		before, _ := f.s.Load(context.Background())
		code, out := f.request(f.user("admin@x"), "POST", "/system/ccgateway/runtime/uploads/"+testUploadID+"/load", `{"role":"controller","apply":true}`)
		if code != 409 || reason(out) != "controller_adopt_required" {
			t.Fatalf("apply: %d %v", code, out)
		}
		if calls, _ := panel.seen(); strings.Contains(strings.Join(calls, ","), "POST /runtime/controller") {
			t.Fatalf("self-upgrade requested: %v", calls)
		}
		if after, _ := f.s.Load(context.Background()); !reflect.DeepEqual(after.Images, before.Images) {
			t.Fatalf("configuration changed: %+v", after.Images)
		}
	})
	// The pinned image: refused only once it is declared a Go controller.
	if guardControllerImage(nil, ControllerImage) != ControllerImageGuardAPI || guardControllerImage(nil, "ccgateway-controller:x") {
		t.Fatal("pinned controller label")
	}
}
