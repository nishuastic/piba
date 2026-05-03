// App-wide constants

export const ORGANIZERS = ['Nischay', 'Vijay', 'Kelvin', 'Jon'];

export const PAYMENT_METHODS = ['Meetup', ...ORGANIZERS];

export const VENUES = ['Racing Club', 'UCPA Rosa Parks'];

export const CURRENCY = '€';

export const formatCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return `0.00 ${CURRENCY}`;
  return `${num.toFixed(2)} ${CURRENCY}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
};
