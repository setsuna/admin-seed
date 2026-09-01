import { useQuery } from '@tanstack/react-query'
import { Users, Building2, Shield, ScrollText, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { dashboardApi } from '@/services/api/dashboard.api'

/**
 * 仪表板（种子版）
 *
 * 只展示系统管理域的基础指标。业务项目请替换本页，
 * 并同步修改 services/api/dashboard.api.ts 与后端 dashboard service。
 */

interface StatCardProps {
  label: string
  value: number | string
  hint?: string
  icon: React.ReactNode
}

function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getDashboard(),
  })

  const d = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">仪表板</h1>
        <p className="mt-1 text-sm text-muted-foreground">系统概览</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="用户总数"
          value={isLoading ? '—' : (d?.user.total ?? 0)}
          hint={`活跃 ${d?.user.active ?? 0} 人`}
          icon={<Users size={18} />}
        />
        <StatCard
          label="部门总数"
          value={isLoading ? '—' : (d?.department.total ?? 0)}
          icon={<Building2 size={18} />}
        />
        <StatCard
          label="角色总数"
          value={isLoading ? '—' : (d?.role.total ?? 0)}
          icon={<Shield size={18} />}
        />
        <StatCard
          label="今日操作日志"
          value={isLoading ? '—' : (d?.log.today ?? 0)}
          hint={`累计 ${d?.log.total ?? 0} 条`}
          icon={<ScrollText size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-2 font-medium">用户概况</h2>
          <div className="divide-y">
            <Row icon={<Users size={16} />} label="总用户数" value={d?.user.total ?? 0} />
            <Row icon={<CheckCircle2 size={16} />} label="活跃用户" value={d?.user.active ?? 0} />
            <Row icon={<XCircle size={16} />} label="非活跃用户" value={d?.user.inactive ?? 0} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 font-medium">操作日志</h2>
          <div className="divide-y">
            <Row icon={<ScrollText size={16} />} label="累计日志" value={d?.log.total ?? 0} />
            <Row icon={<ScrollText size={16} />} label="今日新增" value={d?.log.today ?? 0} />
            <Row icon={<AlertTriangle size={16} />} label="近 7 天失败操作" value={d?.log.failed7d ?? 0} />
          </div>
        </Card>
      </div>
    </div>
  )
}
