export const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en", { maximumFractionDigits }).format(value);

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export const formatPercent = (value: number, maximumFractionDigits = 1) =>
  `${new Intl.NumberFormat("en", { maximumFractionDigits }).format(value * 100)}%`;

export const formatDuration = (minutes: number) =>
  `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(minutes)} min`;
