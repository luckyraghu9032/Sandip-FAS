function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeDivision(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function formatDateParts(year, month, day) {
  const safeYear = String(year).padStart(4, '0');
  const safeMonth = String(month).padStart(2, '0');
  const safeDay = String(day).padStart(2, '0');
  return `${safeYear}-${safeMonth}-${safeDay}`;
}

function fromExcelSerial(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial)) {
    return '';
  }

  const excelEpoch = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpoch + Math.round(serial) * 86400000);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return formatDateParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}

function normalizeDateOfBirth(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const fromSerial = fromExcelSerial(raw);
    return fromSerial || raw;
  }

  const dayFirstMatch = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const month = Number(dayFirstMatch[2]);
    const year = Number(dayFirstMatch[3].length === 2 ? `20${dayFirstMatch[3]}` : dayFirstMatch[3]);
    return formatDateParts(year, month, day);
  }

  const yearFirstMatch = raw.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (yearFirstMatch) {
    return formatDateParts(yearFirstMatch[1], yearFirstMatch[2], yearFirstMatch[3]);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateParts(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth() + 1,
      parsed.getUTCDate()
    );
  }

  return raw;
}

function sanitizeRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input).reduce((accumulator, [key, value]) => {
    const cleanKey = String(key || '').trim();
    if (!cleanKey) {
      return accumulator;
    }

    if (value === null || value === undefined) {
      accumulator[cleanKey] = '';
      return accumulator;
    }

    if (typeof value === 'object') {
      accumulator[cleanKey] = JSON.stringify(value);
      return accumulator;
    }

    accumulator[cleanKey] = String(value).trim();
    return accumulator;
  }, {});
}

function mergeProfileData(baseRecord, additions) {
  const profileData = sanitizeRecord(baseRecord);

  Object.entries(additions || {}).forEach(([key, value]) => {
    const cleanKey = String(key || '').trim();
    if (!cleanKey) {
      return;
    }

    profileData[cleanKey] = value === null || value === undefined ? '' : String(value).trim();
  });

  return profileData;
}

module.exports = {
  mergeProfileData,
  normalizeDateOfBirth,
  normalizeDivision,
  normalizeEmail,
  normalizeRole,
  normalizeText,
  sanitizeRecord,
};
