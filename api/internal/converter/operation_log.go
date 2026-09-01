package converter

import (
	"admin-seed/internal/audit"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
)

type OperationLogConverter struct{}

func NewOperationLogConverter() *OperationLogConverter {
	return &OperationLogConverter{}
}

// ModelToResponse 将操作日志模型转换为响应
func (c *OperationLogConverter) ModelToResponse(log *model.OperationLog) *response.OperationLogResponse {
	if log == nil {
		return nil
	}

	return &response.OperationLogResponse{
		ID:                log.ID,
		Timestamp:         log.Timestamp,
		Operator:          log.Operator,
		OperatorName:      log.OperatorName,
		OperatorID:        log.OperatorID,
		OperatorRole:      log.OperatorRole,
		IPAddress:         log.IPAddress,
		Module:            log.Module,
		ModuleName:        audit.ModuleName(log.Module),
		ActionCategory:    log.ActionCategory,
		ActionDescription: log.ActionDescription,
		OperationResult:   log.OperationResult,
		BeforeData:        log.BeforeData,
		AfterData:         log.AfterData,
		ChangeDetails:     log.ChangeDetails,
		CreatedAt:         log.CreatedAt,
		UpdatedAt:         log.UpdatedAt,
	}
}

// ModelsToResponses 批量转换
func (c *OperationLogConverter) ModelsToResponses(logs []*model.OperationLog) []*response.OperationLogResponse {
	responses := make([]*response.OperationLogResponse, 0, len(logs))
	for _, log := range logs {
		responses = append(responses, c.ModelToResponse(log))
	}
	return responses
}
