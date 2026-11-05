function toTime(value) {
  return Date.parse(value.length === 10 ? `${value}T00:00:00.000Z` : value);
}

export function effectiveEvidenceAt(versions, at) {
  const point = toTime(at);
  return versions
    .filter((item) => toTime(item.validFrom) <= point && (!item.validUntil || toTime(item.validUntil) >= point))
    .sort((a, b) => b.version - a.version || toTime(b.createdAt) - toTime(a.createdAt))[0] ?? null;
}

export function coverageSegments(versions, rangeStart, rangeEnd) {
  const start = toTime(rangeStart);
  const end = toTime(rangeEnd);
  if (end < start) return [];
  const boundaries = new Set([start, end + 86_400_000]);
  for (const item of versions) {
    const from = Math.max(start, toTime(item.validFrom));
    const until = Math.min(end, item.validUntil ? toTime(item.validUntil) : end);
    if (from <= until) {
      boundaries.add(from);
      boundaries.add(until + 86_400_000);
    }
  }
  const points = [...boundaries].sort((a, b) => a - b);
  return points.slice(0, -1).map((from, index) => {
    const until = points[index + 1] - 86_400_000;
    const evidence = effectiveEvidenceAt(versions, new Date(from).toISOString());
    return { from: new Date(from).toISOString().slice(0, 10), until: new Date(until).toISOString().slice(0, 10), status: evidence ? "covered" : "gap", version: evidence?.version ?? null };
  });
}

export function reminderDates(validUntil) {
  const end = toTime(validUntil);
  return [30, 7].map((daysBefore) => ({ daysBefore, at: new Date(end - daysBefore * 86_400_000).toISOString().slice(0, 10) }));
}

export function supplierReminderMessage({ supplier, evidenceName, validUntil, language = "zh" }) {
  const messages = {
    zh: `${supplier}，您好：证据“${evidenceName}”将于 ${validUntil} 到期。请发送更新版本，以保持证据覆盖连续。谢谢。`,
    en: `Hello ${supplier}, the evidence “${evidenceName}” expires on ${validUntil}. Please send the renewed version so we can preserve continuous coverage. Thank you.`,
    it: `Gentile ${supplier}, la prova “${evidenceName}” scade il ${validUntil}. La preghiamo di inviare la versione rinnovata per mantenere la continuità della copertura probatoria. Grazie.`,
  };
  if (!messages[language]) throw new RangeError(`Unsupported reminder language: ${language}`);
  return messages[language];
}
