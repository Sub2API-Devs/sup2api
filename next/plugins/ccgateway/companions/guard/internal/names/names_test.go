package names

import "testing"

// covers: 03§2.3 names round trip; prefixes ccg and ccg-gt never mistaken
func TestRoundTrip(t *testing.T) {
	n := Names{Prefix: "ccg"}
	for _, aid := range []string{"21", "999999999999999999", "d0123456789abcdef"} {
		for _, role := range []string{"app", "egress", "app-old", "egress-1.2"} {
			got, r, ok := n.ParseContainer(n.Container(aid, role))
			if !ok || got != aid || r != role {
				t.Fatalf("container %s/%s: %q %q %v", aid, role, got, r, ok)
			}
		}
		if got, role, ok := n.ParseNetwork(n.Net(aid)); !ok || got != aid || role != "net" {
			t.Fatalf("net %s", aid)
		}
		if got, role, ok := n.ParseNetwork(n.LegacyUplink(aid)); !ok || got != aid || role != "uplink" {
			t.Fatalf("uplink %s", aid)
		}
		if got, ok := n.ParseVolume(n.Volume(aid)); !ok || got != aid {
			t.Fatalf("volume %s", aid)
		}
	}
	if aid, role, ok := n.ParseNetwork(n.GatewayUplink()); !ok || aid != UplinkKey || role != "xray-uplink" {
		t.Fatal("gateway uplink")
	}
	if _, _, ok := n.ParseNetwork("ccg-21-xray-uplink"); ok {
		t.Fatal("xray-uplink only for the uplink key")
	}
	if got, _, ok := n.ParseContainer("/ccg-21-app"); !ok || got != "21" {
		t.Fatal("leading slash")
	}
}

// covers: 03§2.3 isolated prefix ccg-gt is not a production resource
func TestPrefixesDoNotOverlap(t *testing.T) {
	prod, gt := Names{Prefix: "ccg"}, Names{Prefix: "ccg-gt"}
	name := gt.App("d00000000000a0001")
	if _, _, ok := prod.ParseContainer(name); ok {
		t.Fatalf("production parsed %s", name)
	}
	if aid, _, ok := gt.ParseContainer(name); !ok || aid != "d00000000000a0001" {
		t.Fatal("isolated prefix")
	}
	if _, _, ok := gt.ParseContainer(prod.App("21")); ok {
		t.Fatal("isolated parsed production")
	}
	if _, ok := prod.ParseVolume(gt.Volume("21")); ok {
		t.Fatal("volume")
	}
}

// covers: 03§11.3 aid 0, 01, 19 digits, d + 15 hex
func TestKeyBoundaries(t *testing.T) {
	good := []string{"1", "21", "123456789012345678", "d0000000000000000", "dffffffffffffffff"}
	bad := []string{"", "0", "01", "1234567890123456789", "d000000000000000", "d00000000000000000", "D0000000000000000",
		"dg000000000000000", "-1", "21 ", "２１"}
	for _, k := range good {
		if !ValidKey(k) {
			t.Errorf("%q rejected", k)
		}
	}
	for _, k := range bad {
		if ValidKey(k) {
			t.Errorf("%q accepted", k)
		}
	}
}

// covers: 03§3.5.8 suffix rule; R15 oneshot names
func TestRolesAndOneshot(t *testing.T) {
	n := Names{Prefix: "ccg"}
	for _, s := range []string{"app", "egress", "app-x", "egress-a_b.c"} {
		if !ContainerRole.MatchString(s) {
			t.Errorf("%s", s)
		}
	}
	for _, s := range []string{"", "data", "app-", "net", "app/x", "../app", "controller"} {
		if ContainerRole.MatchString(s) {
			t.Errorf("%s accepted", s)
		}
	}
	o := n.Oneshot()
	if !n.IsOneshot(o) || !n.IsOneshot("/"+o) || n.IsOneshot("ccg-oneshot-xyz") || (Names{Prefix: "ccg-gt"}).IsOneshot(o) {
		t.Fatalf("oneshot %s", o)
	}
	if n.Oneshot() == o {
		t.Fatal("oneshot names must be random")
	}
}
