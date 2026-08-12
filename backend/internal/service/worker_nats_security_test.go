package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	jwt "github.com/nats-io/jwt/v2"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/nats-io/nkeys"
	"github.com/stretchr/testify/require"
)

func TestWorkerNATSIssuerIssuesLeastPrivilegeCredentials(t *testing.T) {
	operatorPair, err := nkeys.CreateOperator()
	require.NoError(t, err)
	defer operatorPair.Wipe()
	operatorID, err := operatorPair.PublicKey()
	require.NoError(t, err)

	accountPair, err := nkeys.CreateAccount()
	require.NoError(t, err)
	defer accountPair.Wipe()
	accountID, err := accountPair.PublicKey()
	require.NoError(t, err)
	accountSeed, err := accountPair.Seed()
	require.NoError(t, err)

	dir := t.TempDir()
	profilePath := filepath.Join(dir, "issuer-profile.json")
	profile, err := json.Marshal(nscIssuerProfile{
		Operator: &nscProfileDetails{Name: "Sup2API", Key: operatorID},
		Account:  &nscProfileDetails{Name: "Workers", Key: accountID, Seed: string(accountSeed)},
	})
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(profilePath, profile, 0o600))
	credentialsPath := filepath.Join(dir, "control.creds")
	controlPair, err := nkeys.CreateUser()
	require.NoError(t, err)
	defer controlPair.Wipe()
	controlID, err := controlPair.PublicKey()
	require.NoError(t, err)
	controlClaims := jwt.NewUserClaims(controlID)
	controlToken, err := controlClaims.Encode(accountPair)
	require.NoError(t, err)
	controlSeed, err := controlPair.Seed()
	require.NoError(t, err)
	controlCredentials, err := jwt.FormatUserConfig(controlToken, controlSeed)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(credentialsPath, controlCredentials, 0o600))

	issuer, err := NewWorkerNATSIssuer(&config.Config{UsageQueue: config.UsageQueueConfig{
		Enabled: true, URL: "nats://nats:4222", WorkerURL: "tls://nats.example.com:443",
		Subject: "sup2api.usage.settlements.v1", CredentialsFile: credentialsPath,
		IssuerProfileFile: profilePath,
	}})
	require.NoError(t, err)

	formatted, userID, err := issuer.Issue("worker-a", "sup2api.usage.settlements.v1", 30)
	require.NoError(t, err)
	require.True(t, nkeys.IsValidPublicUserKey(userID))

	token, err := nkeys.ParseDecoratedJWT([]byte(formatted))
	require.NoError(t, err)
	claims, err := jwt.DecodeUserClaims(token)
	require.NoError(t, err)
	require.Equal(t, userID, claims.Subject)
	require.Equal(t, accountID, claims.Issuer)
	require.Equal(t, "worker:worker-a", claims.Name)
	require.Equal(t, jwt.StringList{"sup2api.usage.settlements.v1"}, claims.Permissions.Pub.Allow)
	require.Equal(t, jwt.StringList{"_INBOX.>"}, claims.Permissions.Sub.Allow)
	require.Positive(t, claims.Expires)

	userPair, err := nkeys.ParseDecoratedUserNKey([]byte(formatted))
	require.NoError(t, err)
	defer userPair.Wipe()
	parsedUserID, err := userPair.PublicKey()
	require.NoError(t, err)
	require.Equal(t, userID, parsedUserID)
}

func TestWorkerNATSIssuerNATSIntegration(t *testing.T) {
	url := os.Getenv("NATS_TEST_URL")
	controlCredentials := os.Getenv("NATS_TEST_CONTROL_CREDS")
	issuerProfile := os.Getenv("NATS_TEST_ISSUER_PROFILE")
	if url == "" || controlCredentials == "" || issuerProfile == "" {
		t.Skip("NATS_TEST_URL, NATS_TEST_CONTROL_CREDS, and NATS_TEST_ISSUER_PROFILE are not configured")
	}
	const subject = "sup2api.usage.settlements.v1"
	issuer, err := NewWorkerNATSIssuer(&config.Config{UsageQueue: config.UsageQueueConfig{
		Enabled: true, URL: url, WorkerURL: "tls://nats.example.com:443", Subject: subject,
		CredentialsFile: controlCredentials, IssuerProfileFile: issuerProfile,
	}})
	require.NoError(t, err)

	control, err := nats.Connect(url, nats.UserCredentials(controlCredentials))
	require.NoError(t, err)
	defer control.Close()
	js, err := jetstream.New(control)
	require.NoError(t, err)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	streamName := fmt.Sprintf("TEST_ISSUER_%d", time.Now().UnixNano())
	_, err = js.CreateStream(ctx, jetstream.StreamConfig{Name: streamName, Subjects: []string{subject}, Storage: jetstream.FileStorage, MaxBytes: 1 << 20})
	require.NoError(t, err)
	t.Cleanup(func() { _ = js.DeleteStream(context.Background(), streamName) })

	credentials, _, err := issuer.Issue("integration-worker", subject, 1)
	require.NoError(t, err)
	worker, err := nats.Connect(url, nats.UserCredentialBytes([]byte(credentials)))
	require.NoError(t, err)
	defer worker.Close()
	workerJS, err := jetstream.New(worker)
	require.NoError(t, err)
	_, err = workerJS.Publish(ctx, subject, []byte("jwt-authenticated"))
	require.NoError(t, err)
}

func TestValidateWorkerNATSURLRequiresTLSOrWSS(t *testing.T) {
	for _, valid := range []string{"tls://nats.example.com:443", "wss://nats.example.com/ws"} {
		_, err := validateWorkerNATSURL(valid)
		require.NoError(t, err)
	}
	for _, invalid := range []string{"nats://nats:4222", "tls://user:pass@nats.example.com:443", "https://nats.example.com"} {
		_, err := validateWorkerNATSURL(invalid)
		require.Error(t, err)
	}
}
