package engine

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestEnvironmentFieldSelection(t *testing.T) {
	for _, platform := range []string{"win32", "linux"} {
		env := "# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /fixture/client\n - Is a git repository: false\n - Platform: " + platform + "\n - Shell: fixture-shell\n - OS Version: fixture-os\n"
		for _, base := range []string{"client", "gateway", "both"} {
			for _, cwd := range []string{"client", "gateway"} {
				for _, plat := range []string{"client", "gateway"} {
					p := defaultRequestPolicy()
					p.AttachmentSource = base
					p.EnvironmentFields = map[string]string{"workingDirectory": cwd, "platform": plat}
					encoded, _ := json.Marshal(p)
					h := http.Header{}
					h.Set(policyHeader, string(encoded))
					v := basic()
					v["system"] = "BUSINESS_BEFORE\n" + env + "\nBUSINESS_AFTER"
					data, _ := json.Marshal(v)
					r, err := parsePolicyRequest(data, h)
					if err != nil {
						t.Fatal(err)
					}
					text := strings.Join(r.System, "\n")
					if strings.Contains(text, "Primary working directory:") != (cwd == "client") || strings.Contains(text, " - Platform:") != (plat == "client") {
						t.Fatalf("base=%s fields=%v: %s", base, p.EnvironmentFields, text)
					}
					if !strings.Contains(text, "BUSINESS_BEFORE") || !strings.Contains(text, "BUSINESS_AFTER") {
						t.Fatal("business system removed")
					}
					if !r.ClientEnvironmentFields["workingDirectory"] || !r.ClientEnvironmentFields["platform"] {
						t.Fatal("missing recognition")
					}
				}
			}
		}
	}
	r := &Request{AttachmentSource: "gateway", EnvironmentFields: map[string]string{"platform": "gateway"}}
	for _, text := range []string{"Use cwd /client and platform linux", "# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /client\n - Platform: darwin\n"} {
		if r.filterClientEnvironment(text) != text {
			t.Fatal("ambiguous/unverified format changed")
		}
	}
}

// Claude Code 2.1.292 with --add-dir lists the extra directories as nested
// bullets; they are client directories and follow the workingDirectory field.
func TestAdditionalDirectoriesFollowWorkingDirectory(t *testing.T) {
	env := "# Environment\nYou have been invoked in the following environment: \n - Primary working directory: D:\\client\n - Is a git repository: true\n - Additional working directories:\n  - D:\\client-docs\n  - D:\\client-other\n - Platform: win32\n - Shell: PowerShell\n"
	for _, cwd := range []string{"client", "gateway"} {
		r := &Request{AttachmentSource: "gateway", EnvironmentFields: map[string]string{"workingDirectory": cwd}}
		text := r.filterClientEnvironment(env)
		for _, want := range []string{"Primary working directory: D:\\client", " - Additional working directories:", "  - D:\\client-docs", "  - D:\\client-other"} {
			if strings.Contains(text, want) != (cwd == "client") {
				t.Fatalf("workingDirectory=%s: %q in %q", cwd, want, text)
			}
		}
		if strings.Contains(text, "Platform:") || strings.Contains(text, "Shell:") || strings.Contains(text, "git repository") {
			t.Fatalf("gateway fields kept: %q", text)
		}
	}
	r := &Request{AttachmentSource: "client", EnvironmentFields: map[string]string{"workingDirectory": "gateway"}}
	text := r.filterClientEnvironment(env)
	if strings.Contains(text, "client-docs") || !strings.Contains(text, "Platform: win32") || !strings.Contains(text, "Shell: PowerShell") {
		t.Fatalf("client source with gateway directories: %q", text)
	}
}

func TestEnvironmentEnvelopeFieldOverride(t *testing.T) {
	r := &Request{AttachmentSource: "gateway", EnvironmentFields: map[string]string{"workingDirectory": "client", "platform": "gateway"}, System: []string{
		"<ccgateway-attachment type=\"environment\">\n# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /client\n - Platform: linux\n</ccgateway-attachment>",
	}}
	r.filterClientAttachments()
	if len(r.System) != 1 || !strings.Contains(r.System[0], "/client") || strings.Contains(r.System[0], "Platform:") {
		t.Fatalf("field override lost inside explicit envelope: %v", r.System)
	}
	for _, fields := range []map[string]string{{"shell": "client"}, {"platform": "both"}, {"workingDirectory": "invalid"}} {
		if validateAttachmentPolicy(RequestPolicy{EnvironmentFields: fields}) == nil {
			t.Fatal("invalid field policy accepted", fields)
		}
	}
}
