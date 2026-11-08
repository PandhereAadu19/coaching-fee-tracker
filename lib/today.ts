export function getToday(): Date {
  const demo = process.env.DEMO_TODAY?.trim();
  if (demo) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(demo);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      return new Date(year, month - 1, day);
    }
  }
  return new Date();
}
