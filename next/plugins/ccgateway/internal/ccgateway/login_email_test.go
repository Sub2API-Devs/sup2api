package ccgateway

import (
	"context"
	"encoding/json"
	"os"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// A managed account keeps the login email the core observed in its read-only
// extension account_email (CONTRACTS §59): set from the facts on create and
// update, left alone when the email is unknown, never for an API-key account;
// and a stored one never upsets the container environment the admin chose.
func TestLoginEmailExtension(t *testing.T) {
	p := New()
	lifecycle := func(phase, kind, facts, settings string, auto *bool) *pluginv1.AccountLifecycleResponse {
		t.Helper()
		out, err := p.OnAccountLifecycle(context.Background(), &pluginv1.AccountLifecycleRequest{Phase: phase, ResourceFactsJson: facts,
			Account: &pluginv1.Account{Type: kind, SettingsJson: settings, Properties: &pluginv1.AccountProperties{Models: DefaultModels, AutoModels: auto}}})
		if err != nil {
			t.Fatal(err)
		}
		if len(out.GetErrors()) > 0 {
			t.Fatalf("%s %s: %v", phase, settings, out.GetErrors())
		}
		return out
	}
	manual := false
	for _, phase := range []string{"before_create", "before_update"} {
		for _, auto := range []*bool{nil, &manual} {
			out := lifecycle(phase, AccountTypeManaged, `{"subscription_type":"pro","account_email":"ops@example.invalid"}`, `{"locale":"en-US","account_email":"old@example.invalid"}`, auto)
			if got := out.GetAccountPatch().GetExtensionsJson(); got != `{"account_email":"ops@example.invalid"}` {
				t.Errorf("%s auto=%v: extensions %q", phase, auto, got)
			}
			if out := lifecycle(phase, AccountTypeManaged, `{"subscription_type":"pro"}`, `{}`, auto); out.GetAccountPatch().GetExtensionsJson() != "" {
				t.Errorf("%s: an unknown email changed the extension", phase)
			}
			if out := lifecycle(phase, AccountTypeAPIKey, `{"account_email":"ops@example.invalid"}`, `{}`, auto); out.GetAccountPatch().GetExtensionsJson() != "" {
				t.Errorf("%s: an API-key account got a login email", phase)
			}
		}
	}
	// Every phase reads the admin's environment without the plugin's own key.
	for _, phase := range []string{"validate", "created", "updated", "check"} {
		out := lifecycle(phase, AccountTypeManaged, "", `{"locale":"en-US","account_email":"ops@example.invalid"}`, nil)
		var settings map[string]string
		_ = json.Unmarshal([]byte(out.GetSettingsJson()), &settings)
		if settings["locale"] != "en-US" || settings[accountEmailExtension] != "" {
			t.Errorf("%s: settings %v", phase, settings)
		}
	}
}

// The manifest declares the extension read-only on the managed type only,
// so the admin cannot set it and the core accepts the plugin's value.
func TestManifestDeclaresLoginEmailReadOnly(t *testing.T) {
	raw, err := os.ReadFile("../../manifest.json")
	if err != nil {
		t.Fatal(err)
	}
	var manifest struct {
		AccountTypes []struct {
			ID               string `json:"id"`
			ExtensionsSchema struct {
				Properties map[string]struct {
					ReadOnly bool `json:"readOnly"`
				} `json:"properties"`
			} `json:"extensionsSchema"`
		} `json:"accountTypes"`
	}
	if err := json.Unmarshal(raw, &manifest); err != nil {
		t.Fatal(err)
	}
	for _, at := range manifest.AccountTypes {
		property, ok := at.ExtensionsSchema.Properties[accountEmailExtension]
		if (at.ID == AccountTypeManaged) != (ok && property.ReadOnly) {
			t.Errorf("%s: account_email declared=%v readOnly=%v", at.ID, ok, property.ReadOnly)
		}
	}
}

// The 0.1.96 incident: a managed account whose settings hold the plugin's
// account_email was refused on every model and test request ("Invalid
// CCGateway account credentials"), because the runtime environment check saw
// the extension as an unknown environment setting. The extension is never an
// environment setting; an unknown key of the admin's still is.
func TestLoginEmailNeverBlocksRequests(t *testing.T) {
	settings := `{"locale":"en-US","timezone":"America/Los_Angeles","account_email":"ops@example.invalid"}`
	if err := validateAccount(&pluginv1.Account{Type: AccountTypeManaged, CredentialsJson: "{}", SettingsJson: settings}); err != nil {
		t.Fatalf("a recorded login email refused the account: %v", err)
	}
	out, err := New().ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: AccountTypeManaged, CredentialsJson: "{}", SettingsJson: settings})
	if err != nil || len(out.GetErrors()) > 0 || out.GetNormalizedSettingsJson() != `{"locale":"en-US","timezone":"America/Los_Angeles"}` {
		t.Fatalf("validate credentials: %v %v %s", err, out.GetErrors(), out.GetNormalizedSettingsJson())
	}
	if err := validateAccount(&pluginv1.Account{Type: AccountTypeManaged, CredentialsJson: "{}", SettingsJson: `{"region":"jp"}`}); err == nil {
		t.Fatal("an unknown environment setting was accepted")
	}
}
