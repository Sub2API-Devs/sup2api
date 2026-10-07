package remotedocker

import "testing"

func TestAccountHTTPAddressIsRestricted(t *testing.T) {
	for _, target := range []string{"10.52.74.181:8787", "172.20.0.2:8787", "192.168.20.5:8787"} {
		if !accountHTTPAddress(target) {
			t.Fatal(target)
		}
	}
	for _, target := range []string{"127.0.0.1:8787", "169.254.169.254:8787", "8.8.8.8:8787", "10.52.74.181:22", "[fd00::2]:8787", "localhost:8787", "10.52.74.181:08787", "http://10.52.74.181:8787"} {
		if accountHTTPAddress(target) {
			t.Fatal(target)
		}
	}
}
