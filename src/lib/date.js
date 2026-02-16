const DAY_MS = 24 * 60 * 60 * 1000;

function toDayKey(input) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }
  return date.toISOString().slice(0, 10);
}

function dayDiff(fromDayKey, toDayKeyValue) {
  const from = new Date(`${fromDayKey}T00:00:00.000Z`);
  const to = new Date(`${toDayKeyValue}T00:00:00.000Z`);
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

module.exports = {
  toDayKey,
  dayDiff
};
