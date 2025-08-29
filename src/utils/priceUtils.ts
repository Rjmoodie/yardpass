// Price utility functions for consistent formatting

/**
 * Convert cents to dollars
 */
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};

/**
 * Convert dollars to cents
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

/**
 * Format price for display
 */
export const formatPrice = (priceCents: number, currency: string = 'USD'): string => {
  if (!priceCents || isNaN(priceCents)) {
    return 'Free';
  }
  
  const dollars = centsToDollars(priceCents);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(dollars);
};

/**
 * Format price range for display
 */
export const formatPriceRange = (minCents: number, maxCents: number, currency: string = 'USD'): string => {
  if (!minCents || !maxCents || isNaN(minCents) || isNaN(maxCents)) {
    return 'Free';
  }
  
  if (minCents === maxCents) {
    return formatPrice(minCents, currency);
  }
  
  const minDollars = centsToDollars(minCents);
  const maxDollars = centsToDollars(maxCents);
  
  return `${formatPrice(minCents, currency)} - ${formatPrice(maxCents, currency)}`;
};

/**
 * Validate price data
 */
export const isValidPrice = (priceCents: number): boolean => {
  return priceCents !== null && priceCents !== undefined && !isNaN(priceCents) && priceCents >= 0;
};
