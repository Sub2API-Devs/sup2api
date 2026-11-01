package accounts

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/xrayconf"
)

// covers: A7 A8 S8 S21 S25 G2 G3 G4 G10 R7 Y1 Y2 (test_new_account_is_bound_to_the_shared_gateway)
func TestNewAccountIsBoundToTheSharedGateway(t *testing.T) {
	e := newEnv(t)
	p := e.mustApply("21", desired(rev))
	if p.Status != "ready" || p.Revision != rev {
		t.Fatalf("%+v", p)
	}
	st := e.state("21")
	if e.g.Inspect("ccg-shared-egress") == nil {
		t.Fatal("ensure created the gateway through compose")
	}
	if st.GatewayIP == "" || st.Status != store.StatusReady || st.Revision != rev {
		t.Fatalf("%+v", st)
	}
	if v, _ := st.EgressBackend.Get(); v != names.SharedBackend {
		t.Fatal("egress_backend is still written for a rollback to 0.1.117")
	}
	if resolv, _ := e.g.Resolv("21"); resolv != names.ResolvConf(st.GatewayIP) {
		t.Fatalf("resolv.conf points at the gateway: %q", resolv)
	}
	if e.g.Exists("ccg-21-egress") || e.g.Exists("ccg-21-uplink") {
		t.Fatal("no own egress")
	}
	eg, err := e.m.EgressStatus(bg, "21")
	if err != nil || !eg.Ready {
		t.Fatalf("%+v %v", eg, err)
	}
	fw, ok := e.g.Firewall("21")
	if !ok || fw.DefaultGateway != st.GatewayIP || !strings.Contains(fw.Rules, "table inet ccg_app") {
		t.Fatalf("%+v", fw)
	}
	for _, name := range []string{guardapi.FileBootJSON, guardapi.FileBootNFT, guardapi.FileDNSJSON, guardapi.FileActiveNFT} {
		if _, ok := e.g.GatewayFile(name); !ok {
			t.Fatal("gateway file", name)
		}
	}
	outs, ins, _ := e.g.Xray()
	if len(outs) != 1 || !strings.HasPrefix(outs[0], "proxy-") || len(ins) != 1 || ins[0] != "dns-20000" {
		t.Fatalf("%v %v", outs, ins)
	}
	if !strings.Contains(e.g.AppliedNFT(), `ip daddr `+proxyIP+` tcp dport 3128 accept`) {
		t.Fatal(e.g.AppliedNFT())
	}
	dns, _ := e.g.GatewayFile(guardapi.FileDNSJSON)
	if string(dns) != `{"`+st.AppIP+`": {"port": 20000}}` {
		t.Fatalf("dns.json %s", dns)
	}
	if !e.m.OnlineAt("21", rev) {
		t.Fatal("online")
	}
}

// covers: A1 A7 S10 G10 (test_failed_gateway_configuration_leaves_the_runtime_offline)
func TestFailedGatewayConfigurationLeavesTheRuntimeOffline(t *testing.T) {
	e := newEnv(t)
	e.g.Fail("POST /v1/gateway/exec", fakeguard.Fault{Status: 502, Code: "docker_error", Message: "no xray"})
	if _, err := e.apply("21", desired(rev)); err == nil {
		t.Fatal("configure failed")
	}
	if e.state("21").Status != store.StatusEgressError || e.m.OnlineAt("21", rev) {
		t.Fatal("egress_error and offline")
	}
	// The core's next configuration tries again.
	e.g.ClearFaults()
	if e.mustApply("21", desired(rev)).Status != "ready" {
		t.Fatal("ready")
	}
}

// covers: G15 Y1 Y2 G3 B1 (test_gateway_restart_is_recovered_in_the_background)
func TestGatewayRestartIsRecoveredInTheBackground(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.g.RestartGateway() // a new boot: the Xray process lost every outbound
	if e.status("21") != "pending" {
		t.Fatal("a restarted gateway takes the runtime offline")
	}
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	if e.status("21") != "ready" {
		t.Fatal("recovered")
	}
	if outs, ins, _ := e.g.Xray(); len(outs) != 1 || len(ins) != 1 {
		t.Fatalf("outbounds and inbounds loaded again: %v %v", outs, ins)
	}
}

// covers: BL1 G12 G15 A4 (test_blocked_runtime_releases_its_binding)
func TestBlockedRuntimeReleasesItsBinding(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	out, err := e.apply("21", pyjson.Ordered{kv("revision", rev), kv("proxy", nil)})
	if err != nil || string(pyjson.MustMarshal(out)) != `{"account_id": "21", "status": "blocked", "revision": ""}` {
		t.Fatalf("%v %v", out, err)
	}
	b, _ := e.m.SharedBinding("21")
	if pyjson.Truthy(field(b, "active")) || e.g.ContainerStatus("ccg-21-app") != "exited" {
		t.Fatal("binding inactive, app stopped")
	}
	firewalls := e.g.Count("PUT /v1/accounts/{aid}/firewall")
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	if e.g.Count("PUT /v1/accounts/{aid}/firewall") != firewalls || e.state("21").Status != store.StatusBlocked {
		t.Fatal("a blocked runtime is never resurrected")
	}
	// BUG-21 kept: status says pending, the list says blocked.
	if e.status("21") != "pending" {
		t.Fatal("status of a blocked runtime")
	}
	list, _ := e.m.Runtimes(bg)
	if len(list.Runtimes) != 1 || list.Runtimes[0].Status != "blocked" {
		t.Fatalf("%+v", list)
	}
}

// covers: E3 G17 02-§7.1 02-§7.2 (adapted test_gateway_image_is_the_egress_image_unless_pinned)
func TestGatewayIsEnsuredNeverRecreatedForAnImage(t *testing.T) {
	e := newEnv(t)
	gwID := e.g.AddGateway(guardapi.ManagedByCompose)
	e.g.AddImage("ccgateway-egress:new", fakeguard.ImageSpec{Labels: map[string]string{names.LabelSharedSchema: "1"}})
	e.g.SetGatewayImage("ccgateway-egress:new")
	e.mustApply("21", desired(rev))
	gw, _ := guardapi.ParseContainer(e.g.Inspect("ccg-shared-egress"))
	if gw.ID != gwID || gw.ConfigImage != "ccgateway-egress:test" {
		t.Fatal("a running gateway is never recreated")
	}
	if e.g.Count("POST /v1/gateway/recreate") != 0 {
		t.Fatal("no background recreate")
	}
	if _, ok := e.g.GatewayFile(guardapi.FileBootJSON); ok {
		t.Fatal("boot files are written only for a missing gateway")
	}
}

func ownEgressLeftovers(t *testing.T, e *env, aid string) {
	t.Helper()
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-" + aid + "-egress", Image: "ccgateway-egress:test",
		Labels: map[string]string{names.LabelAccount: aid}, Status: "exited"})
	subnet := map[string]string{"21": "10.99.0.0/24", "22": "10.99.1.0/24", "7": "10.99.2.0/24"}[aid]
	e.g.AddNetwork("ccg-"+aid+"-uplink", subnet, false, map[string]string{names.LabelAccount: aid})
	d := filepath.Join(e.dir, aid)
	os.WriteFile(filepath.Join(d, "sing-box.json"), []byte("{}"), 0o600)
	os.WriteFile(filepath.Join(d, "firewall.nft"), []byte("table inet x {}\n"), 0o600)
	st := e.state(aid)
	st.Extra.Set("uplink_ip", "10.99.0.2")
	st.Extra.Set("legacy_gateway_ip", "10.1.0.2")
	st.Extra.Set("egress_migration", pyjson.Ordered{kv("target", "shared_xray"), kv("phase", "failed")})
	e.save(aid, st)
}

// covers: G16 PV13 S21 S23 (test_recovery_drops_own_egress_leftovers_once)
func TestRecoveryDropsOwnEgressLeftoversOnce(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.mustApply("22", desired(rev))
	if _, err := e.apply("22", pyjson.Ordered{kv("revision", rev), kv("proxy", nil)}); err != nil {
		t.Fatal(err) // blocked ones are cleaned too
	}
	for _, aid := range []string{"21", "22"} {
		ownEgressLeftovers(t, e, aid)
	}
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	for _, aid := range []string{"21", "22"} {
		if e.g.Exists("ccg-"+aid+"-egress") || e.g.Exists("ccg-"+aid+"-uplink") {
			t.Fatal("leftovers of", aid)
		}
		for _, f := range []string{"sing-box.json", "firewall.nft"} {
			if _, err := os.Stat(filepath.Join(e.dir, aid, f)); err == nil {
				t.Fatal(f)
			}
		}
		st := e.state(aid)
		for _, k := range store.LegacyOwnEgressFields {
			if st.Has(k) {
				t.Fatal(k)
			}
		}
		if v, _ := st.EgressBackend.Get(); v != names.SharedBackend {
			t.Fatal("egress_backend stays for a rollback")
		}
	}
	if !e.g.Exists("ccg-d0000000000000000-xray-uplink") || !e.g.Exists("ccg-shared-egress") {
		t.Fatal("the shared gateway and its uplink stay")
	}
	if e.status("21") != "ready" {
		t.Fatal("ready")
	}
	deletes := e.g.Count("DELETE /v1/accounts/{aid}/containers/{suffix}")
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	if e.g.Count("DELETE /v1/accounts/{aid}/containers/{suffix}") != deletes {
		t.Fatal("once per process")
	}
}

// covers: G16 (test_failed_cleanup_is_retried_and_keeps_the_account_online)
func TestFailedCleanupIsRetriedAndKeepsTheAccountOnline(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.g.Fail("DELETE /v1/accounts/{aid}/containers/{suffix}", fakeguard.Fault{Status: 502, Code: "docker_error", Message: "docker busy"})
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	if e.status("21") != "ready" || !strings.Contains(e.logs.String(), "own egress cleanup key=21") {
		t.Fatal("failure only logged")
	}
	before := e.g.Count("DELETE /v1/accounts/{aid}/containers/{suffix}")
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	if e.g.Count("DELETE /v1/accounts/{aid}/containers/{suffix}") != before+1 {
		t.Fatal("retried on the next pass")
	}
}

// covers: G15 G4 S8 S25 RB9 02-§7.3 (the gateway recreated by compose: complete recovery)
func TestGatewayRecreatedByComposeIsFullyRecovered(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.mustApply("22", desired(rev))
	e.g.OnExec("app:23", []string{"node", "-e"}, fakeguard.ExecReply(1, ""))
	if _, err := e.apply("23", desired(rev)); err == nil {
		t.Fatal("probe failure")
	}
	if e.state("23").Status != store.StatusEgressError {
		t.Fatal("23 is not ready")
	}
	old := map[string]string{"21": e.state("21").GatewayIP, "22": e.state("22").GatewayIP}
	oldGW, _ := guardapi.ParseContainer(e.g.Inspect("ccg-shared-egress"))
	e.g.RecreateGatewayNow()
	for _, aid := range []string{"21", "22"} {
		if e.status(aid) != "pending" {
			t.Fatal("a new gateway takes every runtime offline")
		}
	}
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	gw, _ := guardapi.ParseContainer(e.g.Inspect("ccg-shared-egress"))
	if gw.ID == oldGW.ID {
		t.Fatal("recreated")
	}
	for _, aid := range []string{"21", "22"} {
		st := e.state(aid)
		if e.status(aid) != "ready" || gw.IP("ccg-"+aid+"-net") != st.GatewayIP || st.GatewayIP == old[aid] {
			t.Fatalf("%s: %s %s %s", aid, e.status(aid), gw.IP("ccg-"+aid+"-net"), st.GatewayIP)
		}
		if resolv, _ := e.g.Resolv(aid); resolv != names.ResolvConf(st.GatewayIP) {
			t.Fatal("resolv.conf rewritten")
		}
		if fw, _ := e.g.Firewall(aid); fw.DefaultGateway != st.GatewayIP || fw.AppID != e.appID(aid) {
			t.Fatal("firewall and default route via the new address")
		}
	}
	if outs, ins, _ := e.g.Xray(); len(outs) != 1 || len(ins) != 3 {
		t.Fatalf("every outbound and every binding's inbound loaded again: %v %v", outs, ins)
	}
	n := 0
	for _, c := range e.g.CallsTo("PUT /v1/accounts/{aid}/firewall") {
		if c.AID == "23" {
			n++
		}
	}
	if e.state("23").Status != store.StatusEgressError || n != 1 {
		t.Fatal("a runtime that is not ready is left to the core")
	}
}

// covers: 02-§7.4 02-§4.4 B1 (GatewayRecreated takes every runtime offline and kicks a recover pass)
func TestGatewayRecreatedKicksARecoverPass(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.m.recoverEvery = time.Hour
	e.m.recheckEvery = time.Hour
	ctx, cancel := context.WithCancel(bg)
	defer cancel()
	e.m.RunBackground(ctx)
	if err := e.m.WithSharedOp(bg, func(ctx context.Context) error {
		_, err := e.g.Client().RecreateGateway(ctx, "ccgateway-egress:test")
		return err
	}); err != nil {
		t.Fatal(err)
	}
	e.m.GatewayRecreated()
	if e.m.OnlineAt("21", rev) {
		t.Fatal("offline at once")
	}
	deadline := time.Now().Add(10 * time.Second)
	for !e.m.OnlineAt("21", rev) {
		if time.Now().After(deadline) {
			t.Fatal("recovered by the kicked pass")
		}
		time.Sleep(10 * time.Millisecond)
	}
	if e.status("21") != "ready" {
		t.Fatal("ready")
	}
}

// covers: G14 G9 S33 (collect reclaims unused outbounds only while the gateway is idle)
func TestCollectReclaimsOnlyWhenTheGatewayIsIdle(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.mustApply("21", desired(revB, kv("proxy", proxyObj("198.51.100.8"))))
	if outs, _, _ := e.g.Xray(); len(outs) != 2 {
		t.Fatalf("the old outbound stays until collected: %v", outs)
	}
	e.g.SetEstablished("ESTAB 0 0 10.0.0.4:15001 10.0.0.3:40000\n")
	if err := e.m.shared.collect(bg); err != nil {
		t.Fatal(err)
	}
	if outs, _, _ := e.g.Xray(); len(outs) != 2 {
		t.Fatal("busy gateway: nothing reclaimed")
	}
	e.g.SetEstablished("")
	if err := e.m.shared.collect(bg); err != nil {
		t.Fatal(err)
	}
	outs, _, _ := e.g.Xray()
	b, _ := e.m.SharedBinding("21")
	if len(outs) != 1 || outs[0] != field(b, "tag") || e.m.shared.data.Nodes.Len() != 1 {
		t.Fatalf("%v", outs)
	}
	if e.status("21") != "ready" {
		t.Fatal("collect keeps the runtime ready")
	}
}

// covers: G14 B1 BUG-16(fixed) (no gateway: collect is silent)
func TestCollectWithoutAGatewayIsSilent(t *testing.T) {
	e := newEnv(t)
	if err := e.m.shared.collect(bg); err != nil {
		t.Fatal(err)
	}
	e.m.sharedPass(bg)
	if strings.Contains(e.logs.String(), "shared egress pass failed") {
		t.Fatal(e.logs.String())
	}
}

// covers: G8 G6 G7 (sync deactivates the binding of a stopped container, keeps the others)
func TestSyncDeactivatesBindingsOfChangedContainers(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.mustApply("22", desired(rev))
	e.g.StopContainer("ccg-22-app")
	e.mustApply("21", desired(revB))
	b, _ := e.m.SharedBinding("22")
	if pyjson.Truthy(field(b, "active")) {
		t.Fatal("22 deactivated")
	}
	_, _, rules := e.g.Xray()
	text := string(pyjson.MustMarshal(rules))
	if !strings.Contains(text, `"app-21"`) || strings.Contains(text, `"app-22"`) || !strings.HasSuffix(text, `"outboundTag": "block"}]}}`) {
		t.Fatal(text)
	}
	if !strings.Contains(e.g.AppliedNFT(), "chain forward { type filter hook forward priority filter; policy drop; }") {
		t.Fatal("nft table replaced")
	}
}

// covers: G10 S31 S32 (port reuse, one node per proxy identity, the 256 outbound limit)
func TestConfigurePortsAndRetainedOutboundLimit(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	e.mustApply("21", desired(revB, kv("proxy", proxyObj("198.51.100.8"))))
	e.mustApply("22", desired(rev))
	b21, _ := e.m.SharedBinding("21")
	b22, _ := e.m.SharedBinding("22")
	if !pyjson.Equal(field(b21, "port"), 20000) || !pyjson.Equal(field(b22, "port"), 20001) {
		t.Fatalf("%v %v", b21, b22)
	}
	if string(pyjson.MustMarshal(pyjson.Ordered(b21).Keys())) !=
		`["ip", "gateway", "network_id", "container_id", "interface", "port", "tag", "revision", "active"]` {
		t.Fatal("binding key order")
	}
	if e.m.shared.data.Nodes.Len() != 2 {
		t.Fatal("22 reuses 21's first outbound")
	}
	for i := 0; e.m.shared.data.Nodes.Len() < 256; i++ {
		n, _ := nodeOf(t, e, "203.0.113."+itoa(i%250+1), int64(1000+i))
		e.m.shared.data.Nodes.Set(n.Tag(), n)
	}
	_, err := e.apply("23", desired(rev, kv("proxy", proxyObj("192.0.2.1"))))
	if err == nil || !strings.Contains(err.Error(), "retained outbound limit") {
		t.Fatal(err)
	}
	// An outbound already retained is still allowed.
	e.mustApply("24", desired(rev))
}

// covers: G1 G2 N2 (the uplink comes from the triggering account's policy, through gateway ensure)
func TestEnsureAllocatesTheUplinkFromTheAccountPolicy(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev, kv("network", obj(t, `{"pool": "10.80.0.0/16", "allocation": "sequential"}`))))
	s, err := e.g.Client().Subnets(bg)
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]string{}
	for _, n := range s.Networks {
		got[n.Name] = n.Subnets[0]
	}
	if got["ccg-21-net"] != "10.80.0.0/24" || got["ccg-d0000000000000000-xray-uplink"] != "10.80.1.0/24" {
		t.Fatalf("%v", got)
	}
	calls := e.g.CallsTo("POST /v1/gateway/ensure")
	if len(calls) != 2 || !strings.Contains(string(calls[1].Body), `"policy_label":"{\"allocation\": \"sequential\", \"pool\": \"10.80.0.0/16\"}"`) {
		t.Fatalf("%s", calls[len(calls)-1].Body)
	}
}

// covers: G12 (remove never creates or starts the gateway)
func TestRemoveNeverStartsAStoppedGateway(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	ensures := e.g.Count("POST /v1/gateway/ensure")
	e.g.StopContainer("ccg-shared-egress")
	if _, err := e.apply("21", pyjson.Ordered{kv("revision", rev), kv("proxy", nil)}); err != nil {
		t.Fatal(err)
	}
	if e.g.ContainerStatus("ccg-shared-egress") != "exited" || e.g.Count("POST /v1/gateway/ensure") != ensures {
		t.Fatal("the stopped gateway stays stopped")
	}
}

// covers: G3 B3 (Xray API readiness: 40 x 0.25 s)
func TestXrayAPIReadinessIsWaitedFor(t *testing.T) {
	e := newEnv(t)
	e.g.AddGateway(guardapi.ManagedByCompose)
	e.g.SetXrayReadyAfter(3)
	e.mustApply("21", desired(rev))
	pauses := 0
	for _, d := range e.clock.Sleeps() {
		if d == xrayPause {
			pauses++
		}
	}
	if pauses != 3 {
		t.Fatalf("%v", e.clock.Sleeps())
	}
	e.g.RestartGateway()
	e.g.SetXrayReadyAfter(100)
	if _, err := e.apply("21", desired(revB)); err == nil || !strings.Contains(err.Error(), "Xray unavailable") {
		t.Fatal(err)
	}
}

// covers: A8 B3 (egress_not_ready after 30 x 0.2 s; proxy_check_failed)
func TestActivationFailures(t *testing.T) {
	e := newEnv(t)
	e.g.AddGateway(guardapi.ManagedByCompose)
	e.g.SetGatewayListening(false)
	_, err := e.apply("21", desired(rev))
	if code := activationCode(err); code != "egress_not_ready" {
		t.Fatal(err)
	}
	waits := 0
	for _, d := range e.clock.Sleeps() {
		if d == activationPause {
			waits++
		}
	}
	if waits != activationTries {
		t.Fatal(waits)
	}
	e.g.SetGatewayListening(true)
	e.g.OnExec("app:21", []string{"node", "-e"}, fakeguard.ExecReply(1, ""))
	if code := activationCode(e.applyErr("21", desired(rev))); code != "proxy_check_failed" {
		t.Fatal(code)
	}
	if e.state("21").Status != store.StatusEgressError {
		t.Fatal("egress_error")
	}
}

func (e *env) applyErr(aid string, d pyjson.Ordered) error {
	_, err := e.apply(aid, d)
	return err
}

func activationCode(err error) string {
	if err == nil {
		return ""
	}
	_, code, _ := errs.Answer(err, errs.Request)
	return code
}

func itoa(i int) string { return strconv.Itoa(i) }

// nodeOf is a pinned outbound node for host:port (no lookup: an address literal).
func nodeOf(t *testing.T, e *env, host string, port int64) (*store.Node, error) {
	t.Helper()
	p := proxyObj(host)
	p.Set("port", port)
	n, err := xrayconf.Node(bg, e.resolver, p, e.m.shared.data.Salt)
	if err != nil {
		t.Fatal(err)
	}
	return n, nil
}
