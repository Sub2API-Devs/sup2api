package main

import (
	"context"
	"encoding/json"
	"fmt"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// BuildBalanceRequest 构造查询账号余额的请求（复用 OAuth 用量接口）
func (p *Plugin) BuildBalanceRequest(ctx context.Context, req *pluginv1.BuildBalanceRequestRequest) (*pluginv1.BuildBalanceRequestResponse, error) {
	account := req.GetAccount()
	if account == nil {
		return nil, fmt.Errorf("missing account")
	}

	var creds credentials
	if err := json.Unmarshal([]byte(account.GetCredentialsJson()), &creds); err != nil {
		return nil, fmt.Errorf("parse credentials: %w", err)
	}

	// 复用用量接口（同 quota.go）
	return &pluginv1.BuildBalanceRequestResponse{
		Method: "GET",
		Url:    "https://platform.claude.com/v1/organization/usage",
		Headers: map[string]string{
			"authorization":     "Bearer " + creds.AccessToken,
			"anthropic-version": AnthropicAPIVersion,
		},
	}, nil
}

// ParseBalanceResponse 解析上游余额响应
func (p *Plugin) ParseBalanceResponse(ctx context.Context, req *pluginv1.ParseBalanceResponseRequest) (*pluginv1.ParseBalanceResponseResponse, error) {
	status := req.GetStatus()
	body := req.GetBody()
	transportError := req.GetTransportError()

	// 传输错误
	if transportError != "" {
		return &pluginv1.ParseBalanceResponseResponse{
			Result: &pluginv1.BalanceResult{
				ErrorType:    pluginv1.BalanceResult_ERROR_TYPE_TRANSIENT,
				ErrorMessage: transportError,
			},
		}, nil
	}

	// 401/403: 凭证失效
	if status == 401 || status == 403 {
		return &pluginv1.ParseBalanceResponseResponse{
			Result: &pluginv1.BalanceResult{
				ErrorType:    pluginv1.BalanceResult_ERROR_TYPE_AUTH_REJECTED,
				ErrorMessage: fmt.Sprintf("upstream %d", status),
			},
		}, nil
	}

	// 非 200
	if status != 200 {
		return &pluginv1.ParseBalanceResponseResponse{
			Result: &pluginv1.BalanceResult{
				ErrorType:    pluginv1.BalanceResult_ERROR_TYPE_TRANSIENT,
				ErrorMessage: fmt.Sprintf("upstream %d", status),
			},
		}, nil
	}

	// 解析 JSON（与 quota.go 相同的结构）
	var resp struct {
		AccountBalance *struct {
			Amount   float64 `json:"amount"`
			Currency string  `json:"currency"`
		} `json:"account_balance"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return &pluginv1.ParseBalanceResponseResponse{
			Result: &pluginv1.BalanceResult{
				ErrorType:    pluginv1.BalanceResult_ERROR_TYPE_TRANSIENT,
				ErrorMessage: "failed to parse JSON",
			},
		}, nil
	}

	// 检查是否有 account_balance 字段
	if resp.AccountBalance == nil {
		return &pluginv1.ParseBalanceResponseResponse{
			Result: &pluginv1.BalanceResult{
				ErrorType:    pluginv1.BalanceResult_ERROR_TYPE_TRANSIENT,
				ErrorMessage: "no account_balance in response",
			},
		}, nil
	}

	// 转换为 micros（1.00 USD = 1000000 micros）
	amountMicros := int64(resp.AccountBalance.Amount * 1_000_000)

	return &pluginv1.ParseBalanceResponseResponse{
		Result: &pluginv1.BalanceResult{
			AmountMicros: amountMicros,
			Currency:     resp.AccountBalance.Currency,
		},
	}, nil
}
