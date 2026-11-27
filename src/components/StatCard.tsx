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

// Literal class names so Tailwind generates them; a background derived by string
// replacement turned the default 'text-primary' into a solid 'bg-primary' and hid the icon.
const ICON_BACKGROUNDS: Record<string, string> = {
  'text-primary': 'bg-primary/10',
  'text-green-600': 'bg-green-100',
  'text-yellow-600': 'bg-yellow-100',
  'text-amber-600': 'bg-amber-100',
  'text-orange-600': 'bg-orange-100',
  'text-red-600': 'bg-red-100',
  'text-blue-600': 'bg-blue-100',
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className, iconColor = 'text-primary' }: StatCardProps) {
  const iconBackground = ICON_BACKGROUNDS[iconColor] ?? 'bg-muted'
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
          <div className={cn("p-3 rounded-full", iconBackground)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
