package platform

import (
	"admin-seed/internal/common"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/middleware"
	"admin-seed/internal/service"

	"github.com/gin-gonic/gin"
)

const (
	// 日志周期选项
	LogRetentionMonths6  = 6
	LogRetentionMonths9  = 9
	LogRetentionMonths12 = 12
)

// PolicyHandler 策略配置处理器
type PolicyHandler struct {
	policyService *service.PolicyService
}

// NewPolicyHandler 创建策略配置处理器
func NewPolicyHandler(policyService *service.PolicyService) *PolicyHandler {
	return &PolicyHandler{
		policyService: policyService,
	}
}

// GetPolicy 获取当前策略配置
func (h *PolicyHandler) GetPolicy(c *gin.Context) {
	policy, err := h.policyService.GetPolicy(c.Request.Context())
	if err != nil {
		panic(err)
	}

	common.Success(c, policy)
}

// UpdatePolicy 更新策略配置
func (h *PolicyHandler) UpdatePolicy(c *gin.Context) {
	var req request.UpdatePolicyRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	policy, err := h.policyService.UpdatePolicy(c.Request.Context(), &req)
	if err != nil {
		panic(err)
	}

	common.Success(c, policy)
}

// ValidatePolicy 验证策略配置
func (h *PolicyHandler) ValidatePolicy(c *gin.Context) {
	var req request.UpdatePolicyRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	err := h.policyService.ValidatePolicy(c.Request.Context(), &req)
	if err != nil {
		panic(err)
	}

	common.Success(c, gin.H{"valid": true})
}

// ExportPolicy 导出策略配置
func (h *PolicyHandler) ExportPolicy(c *gin.Context) {
	data, err := h.policyService.ExportPolicy(c.Request.Context())
	if err != nil {
		panic(err)
	}

	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", "attachment; filename=policy-config.json")
	c.Data(200, "application/json", data)
}

// GetDefaultPolicy 获取默认策略配置
func (h *PolicyHandler) GetDefaultPolicy(c *gin.Context) {
	policy, err := h.policyService.GetDefaultPolicy(c.Request.Context())
	if err != nil {
		panic(err)
	}

	common.Success(c, policy)
}

// CheckAlerts 检查告警
func (h *PolicyHandler) CheckAlerts(c *gin.Context) {
	result, err := h.policyService.CheckAlerts(c.Request.Context())
	if err != nil {
		panic(err)
	}

	common.Success(c, result)
}

// GetAuditLogStats 获取审计日志统计信息
func (h *PolicyHandler) GetAuditLogStats(c *gin.Context) {
	result, err := h.policyService.GetAuditLogStats(c.Request.Context())
	if err != nil {
		panic(err)
	}

	common.Success(c, result)
}

// PurgeAuditLogs 覆盖审计日志
func (h *PolicyHandler) PurgeAuditLogs(c *gin.Context) {
	var req request.PurgeAuditLogsRequest
	if err := middleware.GetValidatedDataAs(c, &req); err != nil {
		common.ErrorWithCode(c, common.ERROR_INVALID_PARAMS, "参数获取失败")
		return
	}

	result, err := h.policyService.PurgeAuditLogs(c.Request.Context(), req.Months)
	if err != nil {
		panic(err)
	}

	common.Success(c, result)
}
