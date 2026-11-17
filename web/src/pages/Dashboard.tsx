import { useQuery } from '@tanstack/react-query'
import { Users, Building2, Shield, ScrollText, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { dashboardApi } from '@/services/api/dashboard.api'

/**
 * 仪表板（种子版）
 *
 * 只展示系统管理域的基础指标。业务项目请替换本页，
 * 并同步修改 services/api/dashboard.api.ts 与后端 dashboard service。
 *
 * 版式照搬 shadcn/ui 的 dashboard-01（SectionCards）：
 * 标题 + 右上角图标 → 大数字 → 底部一行说明。
 */

interface StatCardProps {
  label: string
  value: number | string
  hint?: string
  icon: React.ReactNode
}

function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className="@container/card bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction className="text-muted-foreground">{icon}</CardAction>
      </CardHeader>
      <CardFooter className="text-sm text-muted-foreground">{hint ?? ' '}</CardFooter>
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
    <div className="space-y-section">
      <div className="grid grid-cols-1 gap-section sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="用户总数"
          value={isLoading ? '—' : (d?.user.total ?? 0)}
          hint={`活跃 ${d?.user.active ?? 0} 人`}
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="部门总数"
          value={isLoading ? '—' : (d?.department.total ?? 0)}
          hint="含所有层级"
          icon={<Building2 className="size-4" />}
        />
        <StatCard
          label="角色总数"
          value={isLoading ? '—' : (d?.role.total ?? 0)}
          hint="含内置角色"
          icon={<Shield className="size-4" />}
        />
        <StatCard
          label="今日操作日志"
          value={isLoading ? '—' : (d?.log.today ?? 0)}
          hint={`累计 ${d?.log.total ?? 0} 条`}
          icon={<ScrollText className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-section lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>用户概况</CardTitle>
            <CardDescription>按账号状态统计</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <Row icon={<Users className="size-4" />} label="总用户数" value={d?.user.total ?? 0} />
            <Row icon={<CheckCircle2 className="size-4" />} label="活跃用户" value={d?.user.active ?? 0} />
            <Row icon={<XCircle className="size-4" />} label="非活跃用户" value={d?.user.inactive ?? 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>操作日志</CardTitle>
            <CardDescription>审计中间件自动记录的写操作</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <Row icon={<ScrollText className="size-4" />} label="累计日志" value={d?.log.total ?? 0} />
            <Row icon={<ScrollText className="size-4" />} label="今日新增" value={d?.log.today ?? 0} />
            <Row icon={<AlertTriangle className="size-4" />} label="近 7 天失败操作" value={d?.log.failed7d ?? 0} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
