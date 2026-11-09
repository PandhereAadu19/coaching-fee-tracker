/** Today's calendar date as UTC midnight, so it matches how all other dates are stored. */
export function getToday(): Date {
  const env = process.env.DEMO_TODAY;
  if (env && /^\d{4}-\d{2}-\d{2}$/.test(env)) {
    return new Date(`${env}T00:00:00.000Z`);
  }
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}