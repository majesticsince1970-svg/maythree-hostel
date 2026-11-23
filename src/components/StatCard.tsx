import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  className?: string
  iconColor?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className, iconColor = 'text-primary' }: StatCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className={cn(
                "text-xs mt-1",
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-full bg-primary/10", iconColor.replace('text-', 'bg-').replace(/\d+$/, '100'))}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
