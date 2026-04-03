import {
  Smile, PencilLine, CalendarX, GraduationCap, Users, TrendingUp,
  ArrowUpRight, Coins, Baby, Heart, Landmark, UserCheck, MapPin, Clock,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  smile: Smile,
  "pencil-line": PencilLine,
  "calendar-x": CalendarX,
  "graduation-cap": GraduationCap,
  users: Users,
  "trending-up": TrendingUp,
  "arrow-up-right": ArrowUpRight,
  coins: Coins,
  baby: Baby,
  heart: Heart,
  landmark: Landmark,
  "user-check": UserCheck,
  "map-pin": MapPin,
  clock: Clock,
};

export default function MetricIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}
