import type { Equipment } from "../types";

function eq(
  partial: Omit<Equipment, "domain" | "tags"> & { tags?: string[] },
): Equipment {
  return {
    domain: "chemistry",
    tags: partial.tags ?? [partial.category, partial.subcategory],
    ...partial,
  };
}

export const EQUIPMENT: Equipment[] = [
  eq({
    id: "beaker",
    name: "Beaker",
    category: "equipment",
    subcategory: "glassware",
    icon: "🥼",
    capacity: 6,
    function: "container",
  }),
  eq({
    id: "tin",
    name: "Perfume Tin",
    category: "equipment",
    subcategory: "solid",
    icon: "🫙",
    capacity: 4,
    function: "container",
    tags: ["equipment", "solid", "perfume", "balm"],
  }),
  eq({
    id: "test-tube",
    name: "Test Tube",
    category: "equipment",
    subcategory: "glassware",
    icon: "🧪",
    capacity: 2,
    function: "container",
  }),
  eq({
    id: "flask",
    name: "Erlenmeyer Flask",
    category: "equipment",
    subcategory: "glassware",
    icon: "⚗️",
    capacity: 6,
    function: "container",
  }),
  eq({
    id: "bunsen",
    name: "Bunsen Burner",
    category: "equipment",
    subcategory: "heat",
    icon: "🔥",
    capacity: 0,
    function: "heat-source",
  }),
  eq({
    id: "ice-bath",
    name: "Ice Bath",
    category: "equipment",
    subcategory: "cool",
    icon: "🧊",
    capacity: 0,
    function: "cold-source",
  }),
  eq({
    id: "graduated-cylinder",
    name: "Graduated Cylinder",
    category: "equipment",
    subcategory: "measuring",
    icon: "📏",
    capacity: 2,
    function: "measuring",
  }),
  eq({
    id: "stirring-rod",
    name: "Stirring Rod",
    category: "equipment",
    subcategory: "tool",
    icon: "🥢",
    capacity: 0,
    function: "stirring",
  }),
];

export const EQUIPMENT_BY_ID: Record<string, Equipment> = Object.fromEntries(
  EQUIPMENT.map((e) => [e.id, e]),
);
