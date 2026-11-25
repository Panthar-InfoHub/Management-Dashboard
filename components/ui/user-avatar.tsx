import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarColor, initialsOf, photoUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export type AvatarPerson = {
  id?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

export function displayName(p: AvatarPerson): string {
  return (p.name ?? [p.firstName, p.lastName].filter(Boolean).join(" ")).trim();
}

/** A person's photo, or their initials on their own color. */
export function UserAvatar({
  user,
  className,
  textClassName,
  title,
}: {
  user: AvatarPerson;
  className?: string;
  /** Text size for the initials, e.g. "text-[8px]". */
  textClassName?: string;
  title?: string;
}) {
  const name = displayName(user);
  const src = photoUrl(user.avatarUrl);
  return (
    <Avatar className={className} title={title ?? (name || undefined)}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className={cn("font-medium", avatarColor(name || user.id || ""), textClassName ?? "text-xs")}>
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
