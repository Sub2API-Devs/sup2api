package errs

import (
	"errors"
	"fmt"
	"strings"
	"testing"
)

// covers: H9 H10
func TestAnswerTable(t *testing.T) {
	rows := []struct {
		kind   Kind
		status int
		code   string
	}{
		{BadRequest, 400, "invalid_request"}, {InvalidImage, 400, "invalid_image"}, {RuntimeNotFound, 404, "not_found"},
		{NotDraft, 405, "method_not_allowed"}, {InvalidCLIProfile, 409, "cli_profile_unavailable"},
		{UnsupportedContainer, 409, "unsupported_container"}, {UpgradeInProgress, 409, "upgrade_in_progress"},
		{ResourceInUse, 409, "resource_in_use"}, {OwnershipMismatch, 409, "resource_in_use"},
		{ImagePullFailed, 503, "image_pull_failed"}, {DiskQuotaUnavailable, 503, "disk_quota_unavailable"},
		{ContainerChanged, 503, "container_changed"}, {RuntimeBusy, 503, "runtime_unavailable"},
	}
	for _, r := range rows {
		status, code, known := Answer(New(r.kind, "x"), All)
		if status != r.status || code != r.code || !known {
			t.Errorf("%v: %d %s %v", r.kind, status, code, known)
		}
	}
	for _, code := range []string{CodeEgressNotReady, CodeProxyCheckFailed} {
		if s, c, k := Answer(Activation(code, "m"), All); s != 503 || c != code || !k {
			t.Errorf("activation %s: %d %s %v", code, s, c, k)
		}
	}
	if s, c, k := Answer(errors.New("plain"), All); s != 503 || c != "runtime_unavailable" || k {
		t.Error("an unnamed error is 503 runtime_unavailable, not known")
	}
	if s, c, k := Answer(nil, All); s != 503 || c != "runtime_unavailable" || k {
		t.Error("nil")
	}
}

// covers: H10 (the named subsets decide: InvalidImage on PUT config is 503,
// OwnershipMismatch is 409 only on DELETE)
func TestEndpointSubsets(t *testing.T) {
	cases := []struct {
		set    Set
		kind   Kind
		status int
	}{
		{Request, InvalidImage, 503}, {Request, OwnershipMismatch, 503}, {Delete, OwnershipMismatch, 409},
		{Request, ResourceInUse, 409}, {Request, ActivationFailed, 503}, {Request, NotDraft, 405},
		{Management, InvalidImage, 400}, {Management, UpgradeInProgress, 409}, {Management, NotDraft, 503},
		{Worker, RuntimeNotFound, 404}, {Worker, ContainerChanged, 503}, {Worker, UnsupportedContainer, 409},
		{Worker, InvalidCLIProfile, 503}, {Tunnel, BadRequest, 400}, {Tunnel, ResourceInUse, 503},
		{Tunnel, RuntimeBusy, 503},
	}
	for _, c := range cases {
		status, _, known := Answer(New(c.kind, ""), c.set)
		if status != c.status {
			t.Errorf("%v in set %b: %d, want %d", c.kind, c.set, status, c.status)
		}
		if known != c.set.Has(c.kind) {
			t.Errorf("%v known=%v", c.kind, known)
		}
	}
}

// covers: H11
func TestWrappingAndText(t *testing.T) {
	cause := errors.New("guard said no")
	e := Wrap(ImagePullFailed, "image pull failed", cause)
	wrapped := fmt.Errorf("context: %w", e)
	if s, c, _ := Answer(wrapped, Request); s != 503 || c != "image_pull_failed" {
		t.Fatal("a wrapped named error is still named")
	}
	if !errors.Is(wrapped, cause) || !Is(wrapped, ImagePullFailed) || KindOf(cause) != 0 || Is(cause, 0) {
		t.Fatal("unwrap")
	}
	if got := FailureText(wrapped); got != "ImagePullFailed: context: image pull failed" {
		t.Fatal(got)
	}
	long := strings.Repeat("é", 400)
	if got := FailureText(errors.New(long)); got != "error: "+strings.Repeat("é", 300) {
		t.Fatalf("truncation by characters: %d", len(got))
	}
	if FailureText(nil) != "" || New(BadRequest, "").Error() != "BadRequest" || Wrap(BadRequest, "", cause).Error() != cause.Error() {
		t.Fatal("texts")
	}
	if Kind(99).String() != "Kind(99)" {
		t.Fatal(Kind(99).String())
	}
}

// covers: D3 R3 (resource names sorted; ownership names the resource)
func TestInUseAndMismatch(t *testing.T) {
	e := InUse([]string{"b", "a"})
	if e.Kind != ResourceInUse || strings.Join(e.Names, ",") != "a,b" || e.Error() != "runtime resources in use by a, b" {
		t.Fatal(e)
	}
	m := Mismatch("ccg-21-net")
	if m.Kind != OwnershipMismatch || m.Names[0] != "ccg-21-net" || !strings.Contains(m.Error(), "ownership mismatch") {
		t.Fatal(m)
	}
}
