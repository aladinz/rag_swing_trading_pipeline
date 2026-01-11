// Ticker validation regex
export const TICKER_REGEX = /^[A-Z]{1,5}$|^[A-Z]{1,5}\.[A-Z]{0,2}$/;

// Validate ticker format
export function validateTicker(ticker: string): { valid: boolean; error?: string } {
  const trimmed = ticker.trim().toUpperCase();
  if (!trimmed) return { valid: true };
  if (trimmed.length > 7) {
    return { valid: false, error: "Ticker too long (max 7 characters)" };
  }
  if (!TICKER_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "Invalid ticker format. Use 1-5 letters or with suffix (e.g., TSLA, BRK.A)",
    };
  }
  return { valid: true };
}

// Format number as currency
export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Format number as percentage
export function formatPercentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

// Convert to title case
export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
