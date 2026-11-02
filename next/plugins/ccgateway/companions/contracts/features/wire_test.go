package features

import (
	"encoding/json"
	"testing"
)

// The wire policy is read leniently (an older core's extra keys are ignored)
// and validated strictly for what it does carry.
func TestParseWorkerPolicy(t *testing.T) {
	p, err := ParseWorkerPolicy([]byte(`{"schema_version":1,"relay_mode":"build","cli_version":"2.1.304","build_billing_sources":{"cc_version":"worker"},"build_billing_entrypoint":"cli","build_attachment_sources":{"os_version":"erase"},"build_injection":{"system_prompt":true,"tools":{"Bash":true,"Read":false}},` +
		`"request_identity_sources":{"user_id":"worker"},"build_identity_lines":{"cli":"none"},"thinking_disabled_compat":"omit","betas":[],"unknown_field":"reject"}`))
	if err != nil {
		t.Fatal(err)
	}
	if p.RelayMode != "build" || p.CLIVersion != "2.1.304" || p.BuildBillingEntrypoint != "cli" || p.BuildBillingSources["cc_version"] != "worker" || p.BuildAttachmentSources["os_version"] != "erase" {
		t.Fatalf("unexpected policy %+v", p)
	}
	cli, _ := json.Marshal(p.CLI())
	if string(cli) != `{"contract_version":2,"build_attachment_sources":{"os_version":"erase"},"build_billing_sources":{"cc_version":"worker"},"build_billing_entrypoint":"cli","build_injection":{"system_prompt":true,"tools":{"Bash":true}}}` {
		t.Fatalf("unexpected CLI policy %s", cli)
	}
	// A value without a mode or version (the CLI run by hand) means the Worker's own.
	if _, err := ParseWorkerPolicy([]byte(`{"build_billing_entrypoint":"cli"}`)); err != nil {
		t.Fatal(err)
	}
	for _, bad := range []string{
		`[]`, `{"schema_version":2}`, `{"schema_version":null}`, `{"relay_mode":"native"}`, `{"cli_version":"2.1"}`,
		`{"build_billing_sources":{"cc_version":"erase"}}`, `{"build_billing_entrypoint":"claude-desktop-3p"}`,
		`{"build_attachment_sources":{"shell":"maybe"}}`, `{"build_injection":{"tools":{"NoSuchTool":true}}}`,
	} {
		if _, err := ParseWorkerPolicy([]byte(bad)); err == nil {
			t.Errorf("accepted %s", bad)
		}
	}
	if _, err := ParseWorkerPolicy([]byte(`{"relay_mode":"build","pad":"` + string(make([]byte, MaxPolicyHeaderBytes)) + `"}`)); err == nil {
		t.Error("accepted an oversized header")
	}
}

// first_party_shape (2026-11-03): absent is on, an explicit value is read as
// given, and it never reaches the CLI envelope through CLI().
func TestWorkerPolicyFirstPartyShape(t *testing.T) {
	for raw, want := range map[string]bool{
		`{"schema_version":1,"relay_mode":"build"}`:                            true,
		`{"schema_version":1,"relay_mode":"build","first_party_shape":true}`:   true,
		`{"schema_version":1,"relay_mode":"build","first_party_shape":false}`:  false,
		`{"schema_version":1,"relay_mode":"direct","first_party_shape":false}`: false,
	} {
		p, err := ParseWorkerPolicy([]byte(raw))
		if err != nil {
			t.Fatalf("%s: %v", raw, err)
		}
		if p.FirstPartyShapeEnabled() != want {
			t.Errorf("%s: enabled %v, want %v", raw, p.FirstPartyShapeEnabled(), want)
		}
		cli, _ := json.Marshal(p.CLI())
		if string(cli) != `{"contract_version":2}` {
			t.Errorf("%s: CLI policy %s", raw, cli)
		}
	}
	off := false
	out, _ := json.Marshal(WorkerPolicy{SchemaVersion: PolicySchemaVersion, RelayMode: "build", FirstPartyShape: &off})
	if string(out) != `{"schema_version":1,"relay_mode":"build","first_party_shape":false}` {
		t.Fatalf("explicit false must stay on the wire: %s", out)
	}
	if out, _ = json.Marshal(WorkerPolicy{SchemaVersion: PolicySchemaVersion, RelayMode: "build"}); string(out) != `{"schema_version":1,"relay_mode":"build"}` {
		t.Fatalf("unset must be omitted: %s", out)
	}
	if _, err := ParseWorkerPolicy([]byte(`{"first_party_shape":"yes"}`)); err == nil {
		t.Error("accepted a non-boolean first_party_shape")
	}
}
