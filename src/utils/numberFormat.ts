import {
  DEFAULT_CURRENCY,
  DEFAULT_CURRENCY_FRACTION_DIGITS,
  DEFAULT_LOCALE,
} from "../constants";

export interface CurrencyFormatOptions {
  /** BCP-47 tag. Default `"en-IN"`. */
  locale?: string;
  /** ISO 4217 code. Default `"INR"`. */
  currency?: string;
  /** Default 2. */
  maximumFractionDigits?: number;
}

const formatters = new Map<string, Intl.NumberFormat | null>();

/** A tag Intl would reject becomes the default locale rather than an exception mid-render. */
function usableLocale(locale: string): string {
  try {
    Intl.getCanonicalLocales(locale);
    return locale;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** One cached `Intl.NumberFormat` per locale/currency/precision — a table builds one per row otherwise. */
function currencyFormatter(
  locale: string,
  currency: string,
  maximumFractionDigits: number
): Intl.NumberFormat | null {
  const key = `${locale}|${currency}|${maximumFractionDigits}`;
  if (!formatters.has(key)) {
    try {
      formatters.set(
        key,
        new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits })
      );
    } catch {
      formatters.set(key, null); // a code Intl doesn't know — remembered so it isn't retried per row
    }
  }
  return formatters.get(key) ?? null;
}

/**
 * Formats an amount as currency. A currency code Intl rejects (malformed data in a row, say) is
 * shown as the code in front of a plain number — a wrong-looking cell, not a crashed table.
 */
export function formatCurrency(value: number, options: CurrencyFormatOptions = {}): string {
  const locale = usableLocale(options.locale || DEFAULT_LOCALE);
  const currency = options.currency || DEFAULT_CURRENCY;
  const maximumFractionDigits = options.maximumFractionDigits ?? DEFAULT_CURRENCY_FRACTION_DIGITS;

  const formatter = currencyFormatter(locale, currency, maximumFractionDigits);
  if (formatter) return formatter.format(value);

  return `${currency} ${new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)}`;
}
