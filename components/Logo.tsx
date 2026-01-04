import { cn } from '@/lib/utils'

interface LogoProps {
  width?: number
  height?: number
  className?: string
}

export default function Logo({ width = 32, height = 32, className = "" }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src="/logo.png"
        alt="RIPREEL Logo"
        width={width}
        height={height}
        className="flex-shrink-0"
      />
      <span className="hidden sm:block text-2xl font-bold text-primary">RIPREEL</span>
    </div>
  )
}
