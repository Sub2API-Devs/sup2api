package main

import (
	"encoding/json"
	"os"
	"testing"
)

func TestManifestValid(t *testing.T) {
	data, err := os.ReadFile("manifest.json")
	if err != nil {
		t.Fatalf("read manifest.json: %v", err)
	}

	var manifest map[string]interface{}
	if err := json.Unmarshal(data, &manifest); err != nil {
		t.Fatalf("parse manifest.json: %v", err)
	}

	if manifest["key"] != "codex_oauth" {
		t.Errorf("manifest key = %v, want codex_oauth", manifest["key"])
	}

	accountTypes, ok := manifest["accountTypes"].([]interface{})
	if !ok || len(accountTypes) == 0 {
		t.Fatal("manifest missing accountTypes")
	}

	accountType := accountTypes[0].(map[string]interface{})
	if accountType["id"] != "codex_oauth" {
		t.Errorf("account type id = %v, want codex_oauth", accountType["id"])
	}

	platforms, ok := accountType["platforms"].([]interface{})
	if !ok || len(platforms) == 0 {
		t.Fatal("account type missing platforms")
	}

	platform := platforms[0].(map[string]interface{})
	if platform["platform"] != "openai" {
		t.Errorf("platform = %v, want openai", platform["platform"])
	}

	endpoints, ok := platform["endpoints"].([]interface{})
	if !ok || len(endpoints) == 0 {
		t.Fatal("platform missing endpoints")
	}
	if endpoints[0] != "responses" {
		t.Errorf("endpoint = %v, want responses", endpoints[0])
	}
}

func TestFormSchemaValid(t *testing.T) {
	data, err := os.ReadFile("forms/oauth.schema.json")
	if err != nil {
		t.Fatalf("read oauth.schema.json: %v", err)
	}

	var schema map[string]interface{}
	if err := json.Unmarshal(data, &schema); err != nil {
		t.Fatalf("parse oauth.schema.json: %v", err)
	}

	required, ok := schema["required"].([]interface{})
	if !ok {
		t.Fatal("schema missing required field")
	}

	hasAccessToken := false
	for _, field := range required {
		if field == "access_token" {
			hasAccessToken = true
			break
		}
	}
	if !hasAccessToken {
		t.Error("schema should require access_token")
	}

	properties, ok := schema["properties"].(map[string]interface{})
	if !ok {
		t.Fatal("schema missing properties")
	}

	checkFields := []string{"access_token", "refresh_token", "id_token", "expires_at", "organization_id"}
	for _, field := range checkFields {
		if _, ok := properties[field]; !ok {
			t.Errorf("schema missing property: %s", field)
		}
	}
}
