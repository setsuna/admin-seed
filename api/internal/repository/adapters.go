package repository

import (
	"admin-seed/internal/dto/request"
	"admin-seed/internal/model"
	"context"
)

// UserRepository 旧接口的兼容性适配器
type UserRepository interface {
	Create(user *model.User) error
	GetByID(id string) (*model.User, error)
	GetByUsername(username string) (*model.User, error)
	Update(user *model.User) error
	UpdatePassword(id string, hashedPassword string) error
	UpdateLastLogin(id string) error
	Delete(id string) error
	List(filters *request.UserFilters) ([]*model.User, int64, error)
	GetByDepartment(departmentID string) ([]*model.User, error)
	UpdateSecurityLevel(id, newLevel, updatedBy, updatedByName, reason string) error
}

// DictRepository 旧接口的兼容性适配器
type DictRepository interface {
	CreateDict(dict *model.DataDict) error
	GetDictByID(id string) (*model.DataDict, error)
	GetDictByCode(code string) (*model.DataDict, error)
	UpdateDict(dict *model.DataDict) error
	DeleteDict(id string) error
	ListDicts(filters *request.DictFilters) ([]*model.DataDict, int64, error)

	CreateDictItem(item *model.DictItem) error
	GetDictItemByID(id string) (*model.DictItem, error)
	GetDictItemsByCode(dictCode string) ([]*model.DictItem, error)
	UpdateDictItem(item *model.DictItem) error
	DeleteDictItem(id string) error
	UpdateDictItemCount(dictCode string) error
}

// DepartmentRepository 旧接口的兼容性适配器
type DepartmentRepository interface {
	Create(dept *model.Department) error
	GetByID(id string) (*model.Department, error)
	Update(dept *model.Department) error
	Delete(id string) error
}

// userRepositoryAdapter 用户Repository适配器
type userRepositoryAdapter struct {
	repo UserRepositoryInterface
}

// NewUserRepositoryAdapter 创建用户Repository适配器
func NewUserRepositoryAdapter(repo UserRepositoryInterface) UserRepository {
	return &userRepositoryAdapter{repo: repo}
}

func (a *userRepositoryAdapter) Create(user *model.User) error {
	return a.repo.Create(context.Background(), user)
}

func (a *userRepositoryAdapter) GetByID(id string) (*model.User, error) {
	return a.repo.GetByID(context.Background(), id)
}

func (a *userRepositoryAdapter) GetByUsername(username string) (*model.User, error) {
	return a.repo.GetByUsername(context.Background(), username)
}

func (a *userRepositoryAdapter) Update(user *model.User) error {
	return a.repo.Update(context.Background(), user)
}

func (a *userRepositoryAdapter) UpdatePassword(id string, hashedPassword string) error {
	return a.repo.UpdatePassword(context.Background(), id, hashedPassword)
}

func (a *userRepositoryAdapter) UpdateLastLogin(id string) error {
	return a.repo.UpdateLastLogin(context.Background(), id)
}

func (a *userRepositoryAdapter) Delete(id string) error {
	return a.repo.Delete(context.Background(), id)
}

func (a *userRepositoryAdapter) List(filters *request.UserFilters) ([]*model.User, int64, error) {
	return a.repo.ListWithFilters(context.Background(), filters)
}

func (a *userRepositoryAdapter) GetByDepartment(departmentID string) ([]*model.User, error) {
	return a.repo.GetByDepartment(context.Background(), departmentID)
}

func (a *userRepositoryAdapter) UpdateSecurityLevel(id, newLevel, updatedBy, updatedByName, reason string) error {
	return a.repo.UpdateSecurityLevel(context.Background(), id, newLevel, updatedBy, updatedByName, reason)
}

// dictRepositoryAdapter 字典Repository适配器
type dictRepositoryAdapter struct {
	repo DictRepositoryInterface
}

// NewDictRepositoryAdapter 创建字典Repository适配器
func NewDictRepositoryAdapter(repo DictRepositoryInterface) DictRepository {
	return &dictRepositoryAdapter{repo: repo}
}

func (a *dictRepositoryAdapter) CreateDict(dict *model.DataDict) error {
	return a.repo.Create(context.Background(), dict)
}

func (a *dictRepositoryAdapter) GetDictByID(id string) (*model.DataDict, error) {
	return a.repo.GetByID(context.Background(), id)
}

func (a *dictRepositoryAdapter) GetDictByCode(code string) (*model.DataDict, error) {
	return a.repo.GetDictByCode(context.Background(), code)
}

func (a *dictRepositoryAdapter) UpdateDict(dict *model.DataDict) error {
	return a.repo.Update(context.Background(), dict)
}

func (a *dictRepositoryAdapter) DeleteDict(id string) error {
	return a.repo.Delete(context.Background(), id)
}

func (a *dictRepositoryAdapter) ListDicts(filters *request.DictFilters) ([]*model.DataDict, int64, error) {
	return a.repo.ListDictsWithFilters(context.Background(), filters)
}

func (a *dictRepositoryAdapter) CreateDictItem(item *model.DictItem) error {
	return a.repo.CreateDictItem(context.Background(), item)
}

func (a *dictRepositoryAdapter) GetDictItemByID(id string) (*model.DictItem, error) {
	return a.repo.GetDictItemByID(context.Background(), id)
}

func (a *dictRepositoryAdapter) GetDictItemsByCode(dictCode string) ([]*model.DictItem, error) {
	return a.repo.GetDictItemsByCode(context.Background(), dictCode)
}

func (a *dictRepositoryAdapter) UpdateDictItem(item *model.DictItem) error {
	return a.repo.UpdateDictItem(context.Background(), item)
}

func (a *dictRepositoryAdapter) DeleteDictItem(id string) error {
	return a.repo.DeleteDictItem(context.Background(), id)
}

func (a *dictRepositoryAdapter) UpdateDictItemCount(dictCode string) error {
	return a.repo.UpdateDictItemCount(context.Background(), dictCode)
}

// departmentRepositoryAdapter 部门Repository适配器
type departmentRepositoryAdapter struct {
	repo DepartmentRepositoryInterface
}

// NewDepartmentRepositoryAdapter 创建部门Repository适配器
func NewDepartmentRepositoryAdapter(repo DepartmentRepositoryInterface) DepartmentRepository {
	return &departmentRepositoryAdapter{repo: repo}
}

func (a *departmentRepositoryAdapter) Create(dept *model.Department) error {
	return a.repo.Create(context.Background(), dept)
}

func (a *departmentRepositoryAdapter) GetByID(id string) (*model.Department, error) {
	return a.repo.GetByID(context.Background(), id)
}

func (a *departmentRepositoryAdapter) Update(dept *model.Department) error {
	return a.repo.Update(context.Background(), dept)
}

func (a *departmentRepositoryAdapter) Delete(id string) error {
	return a.repo.Delete(context.Background(), id)
}
