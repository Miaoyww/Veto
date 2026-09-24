import { cn } from "@/lib/utils"

export function UserAvatar({
  name,
  avatar,
  className,
}: {
  name: string
  avatar?: string
  className?: string
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?"

  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary select-none",
        className
      )}
      aria-hidden="true"
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  )
}
