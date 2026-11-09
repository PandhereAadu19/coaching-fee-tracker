export function toRupees(paise: number): number {
    return paise / 100;
  }
  
  export function formatINR(paise: number): string {
    const whole = paise % 100 === 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(paise / 100);
  }
  
  /** Split a GST-inclusive total into base and GST. All values in paise. */
  export function splitGstInclusive(totalPaise: number, ratePercent: number) {
    const base = Math.round(totalPaise / (1 + ratePercent / 100));
    const gst = totalPaise - base;
    return { base, gst, total: totalPaise };
  }