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
