import type { TripRecord } from "./parser";

export type RankedItem = {
  key: string;
  label: string;
  count: number;
  share: number;
};

export type Corridor = RankedItem & {
  pickupLabel: string;
  dropoffLabel: string;
};

export type MobilityMetrics = {
  totalTrips: number;
  avgFare: number;
  avgTripTotal: number;
  avgDurationMinutes: number;
  avgDistanceMiles: number;
  revenuePerMile: number;
  pooledTripRate: number;
  sharedAuthorizedRate: number;
  sharedMatchRate: number;
  matchedShareOfAuthorized: number;
  topPickupAreas: RankedItem[];
  topDropoffAreas: RankedItem[];
  topCorridors: Corridor[];
  hourlyDemand: { hour: number; count: number; share: number }[];
  peakHour: { hour: number; count: number; share: number };
  recordsWithMissingArea: number;
};

export const communityAreaNames: Record<number, string> = {
  1: "Rogers Park",
  6: "Lake View",
  7: "Lincoln Park",
  8: "Near North Side",
  22: "Logan Square",
  24: "West Town",
  25: "Austin",
  28: "Near West Side",
  32: "Loop",
  33: "Near South Side",
  41: "Hyde Park",
  42: "Woodlawn",
  43: "South Shore",
  56: "Garfield Ridge",
  76: "O'Hare",
};

export const areaLabel = (area?: number) =>
  area ? communityAreaNames[area] ?? `Area ${area}` : "Outside or hidden";

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const rankByCount = (rows: TripRecord[], getter: (row: TripRecord) => number | undefined) => {
  const counts = new Map<string, { label: string; count: number }>();
  rows.forEach((row) => {
    const area = getter(row);
    const key = area ? String(area) : "hidden";
    const current = counts.get(key) ?? { label: areaLabel(area), count: 0 };
    current.count += 1;
    counts.set(key, current);
  });

  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      count: value.count,
      share: rows.length ? value.count / rows.length : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

const hourFrom = (timestamp: string) => {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.getHours() : 0;
};

export function analyzeTrips(rows: TripRecord[]): MobilityMetrics {
  const totalTrips = rows.length;
  const totalMiles = sum(rows.map((row) => row.tripMiles));
  const totalRevenue = sum(rows.map((row) => row.tripTotal));
  const authorizedCount = rows.filter((row) => row.sharedTripAuthorized).length;
  const matchedCount = rows.filter((row) => row.sharedTripMatch).length;
  const pooledCount = rows.filter((row) => row.tripsPooled > 1 || row.sharedTripMatch).length;

  const hourCounts = new Map<number, number>();
  rows.forEach((row) => {
    const hour = hourFrom(row.tripStartTimestamp);
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  });

  const hourlyDemand = Array.from({ length: 24 }, (_, hour) => {
    const count = hourCounts.get(hour) ?? 0;
    return { hour, count, share: totalTrips ? count / totalTrips : 0 };
  });

  const peakHour = hourlyDemand.reduce(
    (peak, item) => (item.count > peak.count ? item : peak),
    { hour: 0, count: 0, share: 0 },
  );

  const corridorCounts = new Map<string, { pickupLabel: string; dropoffLabel: string; count: number }>();
  rows.forEach((row) => {
    const pickupLabel = areaLabel(row.pickupCommunityArea);
    const dropoffLabel = areaLabel(row.dropoffCommunityArea);
    const key = `${pickupLabel} -> ${dropoffLabel}`;
    const current = corridorCounts.get(key) ?? { pickupLabel, dropoffLabel, count: 0 };
    current.count += 1;
    corridorCounts.set(key, current);
  });

  const topCorridors = [...corridorCounts.entries()]
    .map(([key, value]) => ({
      key,
      label: key,
      pickupLabel: value.pickupLabel,
      dropoffLabel: value.dropoffLabel,
      count: value.count,
      share: totalTrips ? value.count / totalTrips : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    totalTrips,
    avgFare: average(rows.map((row) => row.fare)),
    avgTripTotal: average(rows.map((row) => row.tripTotal)),
    avgDurationMinutes: average(rows.map((row) => row.tripSeconds / 60)),
    avgDistanceMiles: average(rows.map((row) => row.tripMiles)),
    revenuePerMile: totalMiles > 0 ? totalRevenue / totalMiles : 0,
    pooledTripRate: totalTrips ? pooledCount / totalTrips : 0,
    sharedAuthorizedRate: totalTrips ? authorizedCount / totalTrips : 0,
    sharedMatchRate: totalTrips ? matchedCount / totalTrips : 0,
    matchedShareOfAuthorized: authorizedCount ? matchedCount / authorizedCount : 0,
    topPickupAreas: rankByCount(rows, (row) => row.pickupCommunityArea),
    topDropoffAreas: rankByCount(rows, (row) => row.dropoffCommunityArea),
    topCorridors,
    hourlyDemand,
    peakHour,
    recordsWithMissingArea: rows.filter((row) => !row.pickupCommunityArea || !row.dropoffCommunityArea).length,
  };
}
