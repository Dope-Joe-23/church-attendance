export const LIST_BATCH_SIZE = 8;

const getTimestamp = (value) => {
  const timestamp = Date.parse(value || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const sortByMostRecent = (items, dateField = 'created_at') => (
  [...items].sort((left, right) => (
    getTimestamp(right[dateField]) - getTimestamp(left[dateField]) ||
    getTimestamp(right.created_at) - getTimestamp(left.created_at)
  ))
);
