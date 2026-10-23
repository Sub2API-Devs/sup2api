package engine

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

const buildClientEnvironment = "# Environment\nYou have been invoked in the following environment: \n" +
	" - Primary working directory: D:\\项目\n - Is a git repository: true\n" +
	" - Additional working directories:\n   - D:\\second\n - Platform: win32\n" +
	" - Shell: PowerShell\n - OS Version: Windows fixture\n - Future fact: keep\n"

func TestBuildRejectsReservedReferencesAndUnsafeNumbers(t *testing.T) {
	for _, raw := range []string{
		`{"model":"m","messages":[{"role":"user","content":[{"type":"ccgateway_attachment","id":"x"}]}]}`,
		`{"model":"m","messages":[{"role":"user","content":null}]}`,
		`{"model":"m","messages":[{"role":"user","content":"x"}],"max_tokens":9007199254740993}`,
	} {
		if _, err := messagesBuildComponents([]byte(raw), &features.CLIPolicy{ContractVersion: 2}, ""); err == nil {
			t.Fatal("accepted", raw)
		}
	}
}
