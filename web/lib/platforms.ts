// Platforms Kerbside supports. Tiles use each platform's brand colour with its name
// (not the official logo artwork, which is trademarked).
export type WorkType = "rideshare" | "delivery";
export type PlatformName = "Uber" | "DiDi" | "Uber Eats" | "DoorDash" | "HungryPanda";

export const PLATFORM_INFO: Record<PlatformName, { type: WorkType; bg: string; fg: string; mark: string; blurb: string }> = {
  Uber: { type: "rideshare", bg: "#000000", fg: "#FFFFFF", mark: "Uber", blurb: "UberX, Comfort, XL" },
  DiDi: { type: "rideshare", bg: "#FC9153", fg: "#FFFFFF", mark: "DiDi", blurb: "DiDi Express" },
  "Uber Eats": { type: "delivery", bg: "#06C167", fg: "#000000", mark: "Eats", blurb: "Food and grocery delivery" },
  DoorDash: { type: "delivery", bg: "#FF3008", fg: "#FFFFFF", mark: "DD", blurb: "Dasher deliveries" },
  HungryPanda: { type: "delivery", bg: "#FFD100", fg: "#1A1A1A", mark: "HP", blurb: "Asian food delivery" },
};
export const ALL_PLATFORMS = Object.keys(PLATFORM_INFO) as PlatformName[];
export const platformsFor = (types: WorkType[]) => ALL_PLATFORMS.filter((p) => types.includes(PLATFORM_INFO[p].type));

/** What the first income line is called in each app (stored as "Net fare" for every platform). */
export const netLabel = (p: string) => (PLATFORM_INFO[p as PlatformName]?.type === "delivery" ? "Net earnings" : "Net fare");
