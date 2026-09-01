package response

import "time"

// OperationLogResponse 操作日志响应
type OperationLogResponse struct {
	ID                int64     `json:"id"`
	Timestamp         time.Time `json:"timestamp"`
	Operator          string    `json:"operator"`
	OperatorName      string    `json:"operator_name"`
	OperatorID        string    `json:"operator_id"`
	OperatorRole      string    `json:"operator_role"`
	IPAddress         string    `json:"ip_address"`
	Module            string    `json:"module"`
	ModuleName        string    `json:"module_name"`
	ActionCategory    string    `json:"action_category"`
	ActionDescription string    `json:"action_description"`
	OperationResult   string    `json:"operation_result"`
	BeforeData        *string   `json:"before_data,omitempty"`
	AfterData         *string   `json:"after_data,omitempty"`
	ChangeDetails     *string   `json:"change_details,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// OperationLogListResponse 操作日志列表响应
type OperationLogListResponse struct {
	Logs  []*OperationLogResponse `json:"logs"`
	Total int64                   `json:"total"`
}
