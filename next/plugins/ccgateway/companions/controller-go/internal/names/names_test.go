package names

import (
	"testing"
	"time"

	"ccgateway/controller/internal/errs"
)

// covers: V1 V2 V3 V4 V11 V19 V20 V25 V26
func TestPatterns(t *testing.T) {
	keys := map[string]bool{"1": true, "21": true, "123456789012345678": true, "1234567890123456789": false,
		"0": false, "01": false, "d0123456789abcdef": true, "d0123456789ABCDEF": false, "d0123": false,
		"21\n": false, "../21": false, "": false, "21 ": false, "d0123456789abcdef0": false}
	for k, want := range keys {
		if Key.MatchString(k) != want || (CheckKey(k) == nil) != want {
			t.Errorf("key %q: %v", k, !want)
		}
	}
	if !errs.Is(CheckKey("x"), errs.BadRequest) {
		t.Error("CheckKey is BadRequest")
	}
	if !IsDraft("d0123456789abcdef") || IsDraft("21") {
		t.Error("IsDraft")
	}
	images := map[string]bool{"ccgateway-app:0.1.118": true, "ghcr.io/sub2api-devs/ccgateway-guard@sha256:" + hex64: true,
		"sha256:" + hex64: true, "App:1": false, "app:": false, "app:1 ": false, "-app": false, "": false,
		"a/b/c:tag-1.0_x": true, "sha256:abc": true /* a reference called sha256 with tag abc */}
	for ref, want := range images {
		if ValidImage(ref) != want {
			t.Errorf("ValidImage(%q) = %v", ref, !want)
		}
	}
	if !Revision.MatchString(hex64) || Revision.MatchString(hex64[:63]) || !Version.MatchString("2.1.312") ||
		Version.MatchString("2.1") || !Lease.MatchString(hex64[:48]) || !Patch.MatchString("ccgateway-abc-1") ||
		Patch.MatchString("ccgateway-ABC") || !UploadID.MatchString("abcdefghijklmnopqrstuv") ||
		!WorkerBackupName.MatchString("20261101T000000Z-0123456789ab") || !ControllerName.MatchString("ccg-controller") ||
		!Prefix.MatchString("ccg-gt") || Prefix.MatchString("Ccg") {
		t.Error("patterns")
	}
}

const hex64 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

// covers: D2 O1 X1
func TestNamesAndContainerOf(t *testing.T) {
	if Name("ccg", "21", "app") != "ccg-21-app" || SharedGateway("ccg") != "ccg-shared-egress" || OneshotPrefix("p") != "p-oneshot-" {
		t.Fatal("names")
	}
	cases := map[string]bool{"ccg-21-app": true, "ccg-21-egress": true, "ccg-21-app-rollback-v1.2_x": true,
		"ccg-210-app": false, "ccg-21-net": false, "other-21-app": false, "ccg-21-app-": false, "ccg-21-appx": false}
	for name, want := range cases {
		if ContainerOf("ccg", "21", name) != want {
			t.Errorf("ContainerOf(%q) = %v", name, !want)
		}
	}
}

// covers: V9 PV8
func TestCheckBusinessImage(t *testing.T) {
	if err := CheckBusinessImage([]string{"PATH=/bin", "NODE_VERSION=22", "HTTP_PROXYX=1"}); err != nil {
		t.Fatal(err)
	}
	for _, bad := range []string{"HTTP_PROXY=x", "no_proxy=", "ANTHROPIC_API_KEY=k", "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR=3", "all_proxy"} {
		if !errs.Is(CheckBusinessImage([]string{bad}), errs.InvalidImage) {
			t.Errorf("%s accepted", bad)
		}
	}
}

// covers: S11 S25
func TestTextHelpers(t *testing.T) {
	if got := RFC3339(time.Date(2026, 11, 1, 8, 9, 10, 999, time.FixedZone("x", 3600))); got != "2026-11-01T07:09:10Z" {
		t.Fatal(got)
	}
	if ResolvConf("10.0.0.3") != "nameserver 10.0.0.3\noptions timeout:2 attempts:2\n" {
		t.Fatal("resolv")
	}
}
