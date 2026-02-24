import moment from 'moment-timezone';

const TZ = "Asia/Kolkata";

export function getClassStatus(classDate, startTime, endTime) {
  const now = moment().tz(TZ);

  const dateStr = moment(classDate).tz(TZ).format('YYYY-MM-DD');
  const classStart = moment.tz(`${dateStr} ${startTime}`, 'YYYY-MM-DD HH:mm', TZ);
  const classEnd   = moment.tz(`${dateStr} ${endTime}`,   'YYYY-MM-DD HH:mm', TZ);

  if (now.isBetween(classStart, classEnd, null, '[]')) {
    return 'Live';
  } else if (now.isBefore(classStart)) {
    return 'Upcoming';
  } else {
    return 'Ended';
  }
}

export function isDuringClass(classDate, startTime, endTime) {
  const now = moment().tz(TZ);

  const dateStr = moment(classDate).tz(TZ).format('YYYY-MM-DD');

  const classStart = moment.tz(`${dateStr} ${startTime}`, 'YYYY-MM-DD HH:mm', TZ);
  const classEnd   = moment.tz(`${dateStr} ${endTime}`,   'YYYY-MM-DD HH:mm', TZ);

  return now.isBetween(classStart, classEnd, null, '[]');
}