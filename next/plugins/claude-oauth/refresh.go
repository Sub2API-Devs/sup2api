package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Credential refresh (CONTRACTS §48). Access tokens of both account types
// live 8 hours; manifest.json declares refresh on both, and the host renews
// them before they expire through BuildRefreshRequest / ParseRefreshResponse,
// through the account's proxy and under a cluster lock per account, so a
// rotated refresh token is used once and saved. The request follows sub2api
// backend/internal/repository/claude_oauth_service.go (RefreshToken) and the
// saved fields backend/internal/service/oauth_refresh_api.go
// (BuildClaudeAccountCredentials).

// refreshUserAgent is the user agent sub2api sends to the token endpoint.
const refreshUserAgent = "axios/1.13.6"

// BuildRefreshRequest describes POST TokenURL with the account's refresh
// token. An account without one cannot be renewed: FAILED_PRECONDITION, so
// the host stops asking until the account is re-authorised.
func (p *Plugin) BuildRefreshRequest(_ context.Context, req *pluginv1.BuildRefreshRequestRequest) (*pluginv1.BuildRefreshRequestResponse, error) {
	acc := req.GetAccount()
	if acc == nil {
		return nil, status.Error(codes.InvalidArgument, "missing account")
	}
	var creds credentials
	if err := json.Unmarshal([]byte(acc.GetCredentialsJson()), &creds); err != nil {
		return nil, status.Error(codes.InvalidArgument, "parse credentials: "+err.Error())
	}
	rt := strings.TrimSpace(creds.RefreshToken)
	if rt == "" {
		return nil, status.Error(codes.FailedPrecondition, "the account has no refresh_token; authorize it again")
	}
	body, _ := json.Marshal(map[string]string{"grant_type": "refresh_token", "refresh_token": rt, "client_id": ClientID})
	return &pluginv1.BuildRefreshRequestResponse{
		Method: "POST",
		Url:    TokenURL,
		Headers: map[string]string{
			"Accept":       "application/json, text/plain, */*",
			"Content-Type": "application/json",
			"User-Agent":   refreshUserAgent,
		},
		BodyJson: string(body),
	}, nil
}

// ParseRefreshResponse reads the token answer into the fields to save:
// access_token, expires_at (Unix seconds), and refresh_token / scope when
// the answer carries them (the refresh token rotates). invalid_grant, 401
// and 403 mean the refresh token is dead; everything else is transient.
func (p *Plugin) ParseRefreshResponse(_ context.Context, in *pluginv1.ParseRefreshResponseRequest) (*pluginv1.RefreshResult, error) {
	st := in.GetStatus()
	switch {
	case in.GetTransportError() != "":
		return refreshError(pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT, in.GetTransportError()), nil
	case st == 401 || st == 403 || (st == 400 && strings.Contains(string(in.GetBody()), "invalid_grant")):
		return refreshError(pluginv1.RefreshResult_ERROR_TYPE_AUTH_REJECTED,
			fmt.Sprintf("token endpoint refused the refresh token (status %d): %s", st, bodySnippet(in.GetBody()))), nil
	case st != 200:
		return refreshError(pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT,
			fmt.Sprintf("token endpoint status %d: %s", st, bodySnippet(in.GetBody()))), nil
	case in.GetTruncated():
		return refreshError(pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT, "token response too large"), nil
	}
	var tr tokenResponse
	if err := json.Unmarshal(in.GetBody(), &tr); err != nil {
		return refreshError(pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT, "unreadable token response: "+err.Error()), nil
	}
	if strings.TrimSpace(tr.AccessToken) == "" {
		return refreshError(pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT, "token response has no access_token"), nil
	}
	patch := map[string]any{"access_token": tr.AccessToken}
	if tr.ExpiresIn > 0 {
		patch["expires_at"] = time.Now().Unix() + tr.ExpiresIn
	}
	if tr.RefreshToken != "" {
		patch["refresh_token"] = tr.RefreshToken
	}
	if tr.Scope != "" {
		patch["scope"] = tr.Scope
	}
	b, _ := json.Marshal(patch)
	return &pluginv1.RefreshResult{CredentialsPatchJson: string(b)}, nil
}

func refreshError(t pluginv1.RefreshResult_ErrorType, msg string) *pluginv1.RefreshResult {
	return &pluginv1.RefreshResult{ErrorType: t, ErrorMessage: msg}
}
