package ccgateway

import "testing"

func TestNativeProbeURLIsClosedToManagedAccounts(t *testing.T) {
	for _, kind := range []string{"managed", "apikey"} {
		if !IsManaged("ccgateway", kind, VirtualTestURL) {
			t.Fatal(kind)
		}
	}
	for _, url := range []string{VirtualTestURL + "?x=y", VirtualTestURL + "/", VirtualTestURL + "#x", "https://ccgateway.internal/admin/auth/logout"} {
		if IsManaged("ccgateway", "managed", url) {
			t.Fatal(url)
		}
	}
	if IsManaged("other", "managed", VirtualTestURL) || IsManaged("ccgateway", "other", VirtualTestURL) {
		t.Fatal("identity scope widened")
	}
}
