import type { MobilityMetrics } from "./analytics";
import { formatCurrency, formatDuration, formatNumber, formatPercent } from "./format";

export type DecisionBrief = {
  takeaways: string[];
  action: string;
  risk: string;
  mode: "rules" | "ai";
};

const hourLabel = (hour: number) => {
  const date = new Date(2024, 0, 1, hour);
  return date.toLocaleTimeString("en", { hour: "numeric", hour12: true });
};

export function buildDecisionBrief(metrics: MobilityMetrics): DecisionBrief {
  const topPickup = metrics.topPickupAreas[0];
  const topDropoff = metrics.topDropoffAreas[0];
  const topCorridor = metrics.topCorridors[0];
  const matchGap = metrics.sharedAuthorizedRate - metrics.sharedMatchRate;

  const takeaways = [
    `${topPickup?.label ?? "The top pickup area"} drives ${formatPercent(topPickup?.share ?? 0)} of sampled demand, with the ${hourLabel(metrics.peakHour.hour)} window contributing ${formatPercent(metrics.peakHour.share)} of trips.`,
    `Trips average ${formatDuration(metrics.avgDurationMinutes)} over ${formatNumber(metrics.avgDistanceMiles, 1)} miles, producing ${formatCurrency(metrics.revenuePerMile)} per mile and ${formatCurrency(metrics.avgTripTotal)} per completed trip.`,
    `Shared rides show ${formatPercent(metrics.sharedAuthorizedRate)} authorization and ${formatPercent(metrics.matchedShareOfAuthorized)} match-through among authorized trips, leaving a ${formatPercent(Math.max(matchGap, 0))} total-demand conversion gap.`,
  ];

  let action = `Rebalance driver supply toward ${topPickup?.label ?? "the leading pickup area"} before the ${hourLabel(metrics.peakHour.hour)} peak, then monitor ${topDropoff?.label ?? "top dropoff"} completion times and rider wait pressure.`;

  if (metrics.sharedAuthorizedRate >= 0.15 && metrics.matchedShareOfAuthorized < 0.6) {
    action = `Improve pooled-ride matching on the ${topCorridor?.pickupLabel ?? "top pickup"} to ${topCorridor?.dropoffLabel ?? "top dropoff"} corridor with tighter batching windows and a small rider incentive during the ${hourLabel(metrics.peakHour.hour)} peak.`;
  } else if (metrics.revenuePerMile < 4 && metrics.avgDurationMinutes > 18) {
    action = `Review pricing and driver positioning on longer trips: current sample economics are below ${formatCurrency(4)} per mile while trip duration is above ${formatDuration(18)}.`;
  } else if ((topPickup?.share ?? 0) > 0.3) {
    action = `Create a short peak-supply playbook for ${topPickup?.label}: pre-position drivers, keep pickup ETAs visible, and protect nearby coverage from being drained.`;
  }

  const risk =
    metrics.recordsWithMissingArea > metrics.totalTrips * 0.1
      ? `${formatPercent(metrics.recordsWithMissingArea / metrics.totalTrips)} of rows have hidden or missing pickup/dropoff areas, so area-level actions should be validated with a larger export.`
      : `The sample is directionally useful for the prototype; validate against a larger city or market export before acting operationally.`;

  return { takeaways, action, risk, mode: "rules" };
}
