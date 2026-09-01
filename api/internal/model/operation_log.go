package model

import "time"

// OperationLog 操作日志模型
type OperationLog struct {
	ID                int64     `json:"id" db:"id"`
	RequestID         string    `json:"request_id" db:"request_id"`
	Timestamp         time.Time `json:"timestamp" db:"timestamp"`
	Operator          string    `json:"operator" db:"operator"`
	OperatorID        string    `json:"operator_id" db:"operator_id"`
	OperatorName      string    `json:"operator_name" db:"operator_name"`
	OperatorRole      string    `json:"operator_role" db:"operator_role"`
	IPAddress         string    `json:"ip_address" db:"ip_address"`
	Module            string    `json:"module" db:"module"`
	ActionCategory    string    `json:"action_category" db:"action_category"`
	ActionDescription string    `json:"action_description" db:"action_description"`
	OperationResult   string    `json:"operation_result" db:"operation_result"`
	BeforeData        *string   `json:"before_data,omitempty" db:"before_data"`
	AfterData         *string   `json:"after_data,omitempty" db:"after_data"`
	ChangeDetails     *string   `json:"change_details,omitempty" db:"change_details"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
}
