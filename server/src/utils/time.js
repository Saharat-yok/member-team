// offset ของ timeZone ณ เวลา date มีหน่วยเป็น ms เช่น Asia/Bangkok = +7 ชม.
function tzOffset(date, timeZone) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    }).formatToParts(date).map(({ type, value }) => [type, Number(value)]),
  );
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// เวลา 00:00 ของวันนี้ (+addDays) ตาม timeZone ที่ให้มา คืนค่าเป็น Date ในหน่วย UTC
export function startOfDay(date, timeZone, addDays = 0) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone }).format(date); // "2025-07-01"
  const midnight = new Date(`${ymd}T00:00:00Z`);
  midnight.setUTCDate(midnight.getUTCDate() + addDays);
  return new Date(midnight.getTime() - tzOffset(midnight, timeZone));
}
