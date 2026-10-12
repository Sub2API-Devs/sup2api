package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEnvironmentFieldSelection(t *testing.T) {
	for _, platform := range []string{"win32", "linux"} {
		env := "# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /fixture/client\n - Is a git repository: false\n - Platform: " + platform + "\n - Shell: fixture-shell\n - OS Version: fixture-os\n"
		for _, base := range []string{"client", "gateway", "both"} {
			for _, cwd := range []string{"client", "gateway"} {
				for _, plat := range []string{"client", "gateway"} {
					t.Run(platform+"/"+base+"/cwd-"+cwd+"/platform-"+plat, func(t *testing.T) {
						p := defaultRequestPolicy()
						p.AttachmentSource = base
						p.EnvironmentFields = map[string]string{"workingDirectory": cwd, "platform": plat}
						text := "BUSINESS_BEFORE\n" + env + "\nBUSINESS_AFTER"
						v := basic()
						v["system"] = text
						data, err := json.Marshal(v)
						require.NoError(t, err)
						r, err := parsePolicyRequest(data, policyHeaders(p))
						require.NoError(t, err)
						assert.Equal(t, []string{text}, r.System, "native preserves the complete client environment")
						assert.Empty(t, r.EnvironmentFields)
						assert.Empty(t, r.ClientEnvironmentFields, "no legacy recognition/rewrite pass")
						assert.Empty(t, r.AdditionalDirectories, "prompt text grants no CLI directory permissions")
					})
				}
			}
		}
	}
}

// Native keeps both primary and additional client directory text. It must not
// reinterpret that text as --add-dir permissions for the gateway process.
func TestAdditionalDirectoriesFollowWorkingDirectory(t *testing.T) {
	env := "# Environment\nYou have been invoked in the following environment: \n - Primary working directory: D:\\client\n - Is a git repository: true\n - Additional working directories:\n  - D:\\client-docs\n  - D:\\client-other\n - Platform: win32\n - Shell: PowerShell\n"
	for _, cwd := range []string{"client", "gateway"} {
		t.Run(cwd, func(t *testing.T) {
			p := defaultRequestPolicy()
			p.AttachmentSource = "gateway"
			p.EnvironmentFields = map[string]string{"workingDirectory": cwd}
			v := basic()
			v["system"] = env
			v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": env}}
			data, err := json.Marshal(v)
			require.NoError(t, err)
			r, err := parsePolicyRequest(data, policyHeaders(p))
			require.NoError(t, err)
			assert.Equal(t, []string{env}, r.System)
			require.Len(t, r.Messages, 2)
			assert.Equal(t, []string{env}, systemTexts(r.Messages[1]))
			assert.Empty(t, r.AdditionalDirectories)
			assert.NotContains(t, cliArgs(r, &Prepared{}, "plugin"), "--add-dir")
		})
	}
}

func TestEnvironmentEnvelopeFieldOverride(t *testing.T) {
	p := defaultRequestPolicy()
	p.AttachmentSource = "gateway"
	p.EnvironmentFields = map[string]string{"workingDirectory": "client", "platform": "gateway"}
	for _, text := range []string{
		"<ccgateway-attachment type=\"environment\">\n# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /client\n - Platform: linux\n</ccgateway-attachment>",
		"Use cwd /client and platform linux",
		"# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /client\n - Platform: darwin\n",
	} {
		v := basic()
		v["system"] = text
		data, err := json.Marshal(v)
		require.NoError(t, err)
		r, err := parsePolicyRequest(data, policyHeaders(p))
		require.NoError(t, err)
		assert.Equal(t, []string{text}, r.System, "envelopes and ambiguous text must both remain intact")
	}
	for _, fields := range []map[string]string{{"shell": "client"}, {"platform": "both"}, {"workingDirectory": "invalid"}} {
		assert.Error(t, validateAttachmentPolicy(RequestPolicy{EnvironmentFields: fields}), "invalid field policy accepted: %v", fields)
	}
}
