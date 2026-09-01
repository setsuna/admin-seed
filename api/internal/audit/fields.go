package audit

// fields.go — 审计日志字段的中文显示名、脱敏规则与忽略规则。
//
// 变更描述形如「密级 从 内部 改为 秘密」，其中：
//   - “密级”     来自 fieldDisplayNames
//   - “内部/秘密” 来自 valueDisplayNames（枚举值翻译）

// fieldDisplayNames 字段名（json tag）→ 中文显示名。
// 未登记的字段回退为原始 json tag，不会丢失变更记录。
var fieldDisplayNames = map[string]string{
	// 通用
	"name":        "名称",
	"code":        "编码",
	"description": "描述",
	"status":      "状态",
	"remark":      "备注",
	"sort":        "排序",
	"order_num":   "排序",
	"type":        "类型",

	// 用户
	"username":        "用户名",
	"email":           "邮箱",
	"phone":           "手机号",
	"role":            "角色",
	"roles":           "角色",
	"avatar":          "头像",
	"department":      "所属部门",
	"department_name": "部门名称",
	"position":        "职位",
	"security_level":  "密级",
	"allowed_ips":     "允许登录IP",
	"ukey_id":         "UKey编号",
	"is_hide":         "是否隐藏",
	"last_login_at":   "最后登录时间",
	"last_login_ip":   "最后登录IP",
	"permissions":     "权限",

	// 部门
	"parent_id":      "上级部门",
	"manager_id":     "负责人",
	"manager_name":   "负责人姓名",
	"level":          "层级",
	"employee_count": "人员数量",
	"address":        "地址",

	// 会议
	"title":            "标题",
	"start_time":       "开始时间",
	"end_time":         "结束时间",
	"location":         "会议地点",
	"category":         "会议分类",
	"is_draft":         "是否草稿",
	"max_participants": "人数上限",
	"expiry_type":      "过期方式",
	"expiry_date":      "过期时间",
	"sign_in_type":     "签到方式",
	"organizer":        "组织者",
	"organizer_name":   "组织者姓名",
	"host":             "主持人",
	"host_name":        "主持人姓名",

	// 议程
	"duration":                "时长",
	"presenter":               "汇报人",
	"visibility_mode":         "材料可见范围",
	"visible_participant_ids": "可见人员",

	// 参会人
	"user_id":   "用户",
	"user_name": "用户名",
	"joined_at": "加入时间",
	"left_at":   "离开时间",

	// 投票
	"vote_type":      "投票类型",
	"options":        "投票选项",
	"is_anonymous":   "是否匿名",
	"allow_multiple": "是否多选",
	"whitelist":      "投票白名单",

	// 字典
	"dict_code":  "字典编码",
	"dict_name":  "字典名称",
	"dict_type":  "字典类型",
	"item_count": "字典项数量",
	"value":      "值",

	// 角色
	"is_built_in": "是否内置",

	// 设备
	"serial_number": "序列号",
	"room_id":       "所属会议室",
	"ip":            "IP地址",
	"mac":           "MAC地址",
	"auth_code":     "授权码",
	"bind_id":       "绑定标识",

	// 安全策略（高频项）
	"system_security_level":         "系统密级",
	"allow_security_downgrade":      "允许密级降级",
	"password_min_length":           "密码最小长度",
	"password_change_interval_days": "密码更换周期(天)",
	"password_max_fail_attempts":    "最大失败次数",
	"password_lockout_duration":     "锁定时长(分钟)",
	"session_timeout_minutes":       "会话超时(分钟)",
	"idle_lock_timeout_minutes":     "空闲锁定(分钟)",
	"max_concurrent_sessions":       "最大并发会话",
	"ip_whitelist_enabled":          "启用IP白名单",
	"ip_whitelist":                  "IP白名单",
	"audit_log_retention_days":      "审计日志保留(天)",
	"server_file_retention_days":    "服务端文件保留(天)",
	"client_file_expiration_hours":  "客户端文件有效期(小时)",
	"file_upload_max_size":          "文件上传大小上限(MB)",
	"allowed_file_types":            "允许的文件类型",
}

// valueDisplayNames 枚举值 → 中文。按 "字段名:值" 精确匹配，
// 未命中时再按裸值匹配（如 status 的 enabled/disabled 跨多个资源通用）。
var valueDisplayNames = map[string]string{
	// 密级
	"security_level:internal":            "内部",
	"security_level:confidential":        "秘密",
	"security_level:secret":              "机密",
	"system_security_level:confidential": "秘密",
	"system_security_level:secret":       "机密",

	// 用户状态
	"status:active":    "正常",
	"status:inactive":  "停用",
	"status:suspended": "暂停",
	"status:enabled":   "启用",
	"status:disabled":  "禁用",
	"status:locked":    "锁定",

	// 会议状态
	"status:preparation":   "准备中",
	"status:distributable": "可下发",
	"status:ready":         "已下发",
	"status:editable":      "可编辑",
	"status:in_progress":   "进行中",
	"status:closed":        "已关闭",

	// 议程/投票状态
	"status:pending":   "待开始",
	"status:completed": "已完成",
	"status:draft":     "草稿",
	"status:published": "已发布",
	"status:ended":     "已结束",

	// 参会人状态
	"status:invited":  "已邀请",
	"status:accepted": "已接受",
	"status:declined": "已拒绝",

	// 会议类型
	"type:standard": "标准会议",
	"type:tablet":   "平板会议",

	// 材料可见范围
	"visibility_mode:all":        "全部参会人可见",
	"visibility_mode:restricted": "指定人员可见",

	// 投票类型
	"vote_type:single":   "单选",
	"vote_type:multiple": "多选",

	// 角色
	"role:admin":          "管理员",
	"role:user":           "普通用户",
	"role:system_admin":   "系统管理员",
	"role:security_admin": "安全管理员",
	"role:audit_admin":    "审计员",

	// 过期方式
	"expiry_type:none":   "永不过期",
	"expiry_type:date":   "指定日期",
	"expiry_type:manual": "手动关闭",

	// 签到方式
	"sign_in_type:none":     "无需签到",
	"sign_in_type:password": "密码签到",
	"sign_in_type:manual":   "手动签到",
}

// sensitiveFields 敏感字段：值不写入 before_data / after_data / change_details。
// 按用户选择，本期只过滤密码类。
var sensitiveFields = map[string]bool{
	"password":         true,
	"password_hash":    true,
	"passwordHash":     true,
	"old_password":     true,
	"new_password":     true,
	"confirm_password": true,
	"pattern_password": true,
}

// ignoredFields 不参与变更对比的字段（噪音字段，每次更新必变或无意义）。
var ignoredFields = map[string]bool{
	"id":         true,
	"created_at": true,
	"updated_at": true,
	"deleted_at": true,
	"createdAt":  true,
	"updatedAt":  true,
	"deletedAt":  true,
}

// IsSensitiveField 判断字段是否敏感（需脱敏）。
func IsSensitiveField(name string) bool {
	return sensitiveFields[name]
}

// isIgnoredField 判断字段是否不参与对比。
func isIgnoredField(name string) bool {
	return ignoredFields[name]
}

// displayFieldName 返回字段的中文名，未登记则返回原名。
// 先按原名查，未命中再按 snake_case 归一化后查
// （兼容 PolicyResponse 等 camelCase json tag 的资源）。
func displayFieldName(name string) string {
	if zh, ok := fieldDisplayNames[name]; ok {
		return zh
	}
	if snake := camelToSnake(name); snake != name {
		if zh, ok := fieldDisplayNames[snake]; ok {
			return zh
		}
	}
	return name
}

// camelToSnake 将 camelCase / PascalCase 字段名转为 snake_case。
// 正确处理连续大写缩写词：
//   systemSecurityLevel  -> system_security_level
//   IPWhitelist          -> ip_whitelist
//   allowSecurityDowngrade -> allow_security_downgrade
// 规则：在“小写/数字 → 大写”与“连续大写 → 大写+小写”两类边界插下划线，再全部转小写。
func camelToSnake(s string) string {
	if s == "" {
		return s
	}
	runes := []rune(s)
	n := len(runes)
	var b []rune
	for i, r := range runes {
		if isUpper(r) {
			// 边界1：前一个是小写或数字（aB -> a_B）
			// 边界2：连续大写的末尾，下一个是小写（ABc -> A_Bc）
			if i > 0 {
				prev := runes[i-1]
				if !isUpper(prev) {
					b = append(b, '_')
				} else if i+1 < n && isLower(runes[i+1]) {
					b = append(b, '_')
				}
			}
			b = append(b, toLower(r))
		} else {
			b = append(b, r)
		}
	}
	return string(b)
}

func isUpper(r rune) bool { return r >= 'A' && r <= 'Z' }
func isLower(r rune) bool { return r >= 'a' && r <= 'z' }
func toLower(r rune) rune { return r + ('a' - 'A') }
