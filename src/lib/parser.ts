import Papa from "papaparse";

export type TripRecord = {
  tripStartTimestamp: string;
  tripEndTimestamp?: string;
  tripSeconds: number;
  tripMiles: number;
  pickupCommunityArea?: number;
  dropoffCommunityArea?: number;
  fare: number;
  tip: number;
  additionalCharges: number;
  tripTotal: number;
  sharedTripAuthorized: boolean;
  sharedTripMatch: boolean;
  tripsPooled: number;
};

export type ParseResult = {
  rows: TripRecord[];
  errors: string[];
};

const requiredColumns = [
  "trip_start_timestamp",
  "trip_seconds",
  "trip_miles",
  "fare",
  "trip_total",
];

type RawRow = Record<string, string | undefined>;

const numberFrom = (value: string | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const booleanFrom = (value: string | undefined) => {
  if (!value) return false;
  return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
};

const optionalNumberFrom = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function parseTripsFromCsv(csvText: string): ParseResult {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const fields = parsed.meta.fields ?? [];
  const missingColumns = requiredColumns.filter((column) => !fields.includes(column));

  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [`Missing required columns: ${missingColumns.join(", ")}`],
    };
  }

  const rowErrors: string[] = parsed.errors
    .slice(0, 3)
    .map((error) => `CSV row ${error.row ?? "?"}: ${error.message}`);

  const rows = parsed.data
    .map((row) => ({
      tripStartTimestamp: row.trip_start_timestamp?.trim() ?? "",
      tripEndTimestamp: row.trip_end_timestamp?.trim(),
      tripSeconds: numberFrom(row.trip_seconds),
      tripMiles: numberFrom(row.trip_miles),
      pickupCommunityArea: optionalNumberFrom(row.pickup_community_area),
      dropoffCommunityArea: optionalNumberFrom(row.dropoff_community_area),
      fare: numberFrom(row.fare),
      tip: numberFrom(row.tip),
      additionalCharges: numberFrom(row.additional_charges),
      tripTotal: numberFrom(row.trip_total),
      sharedTripAuthorized: booleanFrom(row.shared_trip_authorized),
      sharedTripMatch: booleanFrom(row.shared_trip_match),
      tripsPooled: numberFrom(row.trips_pooled, 1),
    }))
    .filter(
      (row) =>
        row.tripStartTimestamp &&
        row.tripSeconds >= 0 &&
        row.tripMiles >= 0 &&
        row.fare >= 0 &&
        row.tripTotal >= 0,
    );

  if (rows.length === 0) {
    rowErrors.push("No usable trip rows were found in the CSV.");
  }

  return { rows, errors: rowErrors };
}
