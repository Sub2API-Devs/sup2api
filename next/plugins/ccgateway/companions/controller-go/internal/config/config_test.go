package config

import (
	"strings"
	"testing"
)

func env(m map[string]string) func(string) (string, bool) {
	return func(k string) (string, bool) {
		v, ok := m[k]
		return v, ok
	}
}

func base() map[string]string {
	return map[string]string{
		"CCG_CONTROLLER_KEY": strings.Repeat("k", 32), "CCG_RUNTIME_ROOT": "/data",
		"CCG_APP_IMAGE": "ccgateway-app:1", "CCG_EGRESS_IMAGE": "ccgateway-egress:1",
		"CCG_GUARD_URL": "http://172.29.255.1:8790", "CCG_GUARD_TOKEN": strings.Repeat("ab", 32),
	}
}

// covers: E1 E2 E5 EV V27
func TestDefaults(t *testing.T) {
	c, err := FromEnv(env(base()), "")
	if err != nil {
		t.Fatal(err)
	}
	if c.Prefix != "ccg" || c.Port != 8787 || c.Bind != "127.0.0.1" || c.Name != "ccg-controller" || c.Version != "dev" ||
		c.AccountDiskBytes != 10<<30 || c.RequireDiskQuota || c.ProbeURL != DefaultProbeURL || c.ControllerImage != "" {
		t.Fatalf("%+v", c)
	}
	c, _ = FromEnv(env(base()), "abc123")
	if c.Version != "abc123" {
		t.Fatal("build version")
	}
	m := base()
	m["CCG_CONTROLLER_VERSION"], m["CCG_CONTROLLER_PORT"], m["CCG_CONTROLLER_BIND"] = "0.1.119", " +9000 ", "0.0.0.0"
	m["CCG_ACCOUNT_DISK_GIB"], m["CCG_ACCOUNT_DISK_QUOTA_REQUIRED"], m["CCG_RUNTIME_PREFIX"] = "1024", "1", "ccg-gt"
	m["CCG_XRAY_IMAGE"], m["CCG_CONTROLLER_IMAGE"] = "xray:1", "ctl:1"
	c, err = FromEnv(env(m), "abc")
	if err != nil {
		t.Fatal(err)
	}
	if c.Version != "0.1.119" || c.Port != 9000 || c.Bind != "0.0.0.0" || c.AccountDiskBytes != 1024<<30 || !c.RequireDiskQuota ||
		c.Prefix != "ccg-gt" || c.XrayImage != "xray:1" || c.ControllerImage != "ctl:1" {
		t.Fatalf("%+v", c)
	}
}

// covers: E5 V19 V20 V21 V22 V27
func TestRejections(t *testing.T) {
	bad := []map[string]string{
		{"CCG_CONTROLLER_KEY": strings.Repeat("k", 31)}, {"CCG_CONTROLLER_KEY": ""}, {"CCG_RUNTIME_ROOT": ""},
		{"CCG_APP_IMAGE": ""}, {"CCG_RUNTIME_PREFIX": "Bad"}, {"CCG_RUNTIME_PREFIX": ""},
		{"CCG_ACCOUNT_DISK_GIB": "0"}, {"CCG_ACCOUNT_DISK_GIB": "010"}, {"CCG_ACCOUNT_DISK_GIB": "1025"},
		{"CCG_ACCOUNT_DISK_GIB": "1.5"}, {"CCG_ACCOUNT_DISK_GIB": ""}, {"CCG_ACCOUNT_DISK_GIB": "10g"},
		{"CCG_ACCOUNT_DISK_QUOTA_REQUIRED": "2"}, {"CCG_ACCOUNT_DISK_QUOTA_REQUIRED": ""},
		{"CCG_CONTROLLER_NAME": "Ctl"}, {"CCG_CONTROLLER_PORT": "abc"}, {"CCG_CONTROLLER_PORT": "70000"},
		{"CCG_CONTROLLER_BIND": "localhost"}, {"CCG_GUARD_URL": ""}, {"CCG_GUARD_URL": "https://172.29.255.1:8790"},
		{"CCG_GUARD_URL": "http://guard:8790"}, {"CCG_GUARD_URL": "http://172.29.255.1"}, {"CCG_GUARD_URL": "http://172.29.255.1:8790/v1"},
		{"CCG_GUARD_URL": "http://u@172.29.255.1:8790"}, {"CCG_GUARD_URL": "http://[::1]:8790"},
		{"CCG_GUARD_TOKEN": "short"}, {"CCG_GUARD_TOKEN": strings.Repeat("AB", 32)},
	}
	for _, change := range bad {
		m := base()
		for k, v := range change {
			m[k] = v
		}
		if _, err := FromEnv(env(m), ""); err == nil || !IsConfigError(err) {
			t.Errorf("%v accepted (%v)", change, err)
		}
	}
	m := base()
	delete(m, "CCG_GUARD_TOKEN")
	if _, err := FromEnv(env(m), ""); err == nil {
		t.Error("missing token")
	}
	if u, err := CheckGuardURL("http://172.29.255.9:8790/"); err != nil || u != "http://172.29.255.9:8790" {
		t.Error("trailing slash")
	}
	if IsConfigError(nil) {
		t.Error("nil")
	}
}
