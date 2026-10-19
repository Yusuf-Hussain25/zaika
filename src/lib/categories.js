import { CookingPot, CupSoda, Flame, IceCreamCone, LayoutGrid, Popcorn, Sandwich, Soup, Wheat } from "lucide-react";
import { CATEGORIES } from "../../shared/menu";

const ICONS = {
    biryani: CookingPot,
    "north-indian": Soup,
    "south-indian": Wheat,
    "street-food": Popcorn,
    rolls: Sandwich,
    chinese: Flame,
    desserts: IceCreamCone,
    drinks: CupSoda,
};

export const categoryIcon = (id) => ICONS[id] ?? LayoutGrid;

export const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ ...c, icon: categoryIcon(c.id) }));
