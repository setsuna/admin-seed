package service

import (
	"context"
	"encoding/json"
	"admin-seed/internal/converter"
	"admin-seed/internal/dto/request"
	"admin-seed/internal/dto/response"
	"admin-seed/internal/model"
	"admin-seed/internal/repository"
	"time"
)

// OperationLogService 操作日志服务
type OperationLogService struct {
	logRepo   repository.OperationLogRepositoryInterface
	converter *converter.OperationLogConverter
}

// NewOperationLogService 创建操作日志服务
func NewOperationLogService(repoMgr repository.RepositoryManager) *OperationLogService {
	return &OperationLogService{
		logRepo:   repoMgr.OperationLog(),
		converter: converter.NewOperationLogConverter(),
	}
}

// RecordLog 记录操作日志
func (s *OperationLogService) RecordLog(ctx context.Context, log *model.OperationLog) error {
	if log.Timestamp.IsZero() {
		log.Timestamp = time.Now()
	}
	if log.OperationResult == "" {
		log.OperationResult = model.OperationSuccess
	}

	return s.logRepo.Create(ctx, log)
}

// RecordOperation 记录操作（简化版）
func (s *OperationLogService) RecordOperation(
	ctx context.Context,
	operator, operatorID, operatorRole, ipAddress string,
	module, actionCategory, actionDescription string,
	result string,
	beforeData, afterData interface{},
	changeDetails string,
) error {
	log := &model.OperationLog{
		Timestamp:         time.Now(),
		Operator:          operator,
		OperatorID:        operatorID,
		OperatorRole:      operatorRole,
		IPAddress:         ipAddress,
		Module:            module,
		ActionCategory:    actionCategory,
		ActionDescription: actionDescription,
		OperationResult:   result,
	}

	// 序列化变更数据
	if beforeData != nil {
		if data, err := json.Marshal(beforeData); err == nil {
			str := string(data)
			log.BeforeData = &str
		}
	}
	if afterData != nil {
		if data, err := json.Marshal(afterData); err == nil {
			str := string(data)
			log.AfterData = &str
		}
	}
	if changeDetails != "" {
		log.ChangeDetails = &changeDetails
	}

	return s.logRepo.Create(ctx, log)
}

// ListLogs 查询操作日志列表
func (s *OperationLogService) ListLogs(filters *request.OperationLogFilters) (*response.OperationLogListResponse, error) {
	logs, total, err := s.logRepo.List(context.Background(), filters)
	if err != nil {
		return nil, err
	}

	return &response.OperationLogListResponse{
		Logs:  s.converter.ModelsToResponses(logs),
		Total: total,
	}, nil
}

// GetThreeAdminLogs 查询三员操作日志
func (s *OperationLogService) GetThreeAdminLogs(filters *request.OperationLogFilters) (*response.OperationLogListResponse, error) {
	logs, total, err := s.logRepo.GetThreeAdminLogs(context.Background(), filters)
	if err != nil {
		return nil, err
	}

	return &response.OperationLogListResponse{
		Logs:  s.converter.ModelsToResponses(logs),
		Total: total,
	}, nil
}
