import { Scissors, Sparkles, Gem, Flower2, Palette, UserRound, type LucideIcon } from "lucide-react";
import type { ServiceCategory } from "@/lib/types";

export const CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  hair: Scissors,
  skin: Sparkles,
  nails: Gem,
  body_spa: Flower2,
  makeup: Palette,
  grooming: UserRound,
};
