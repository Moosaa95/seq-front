/**
 * Extracts a human-readable message from a DRF / RTK Query error.
 *
 * Handles:
 *   { detail: "..." }              — standard DRF permission / auth errors
 *   { message: "..." }             — custom backend messages
 *   { email: ["already exists"] }  — field-level validation errors
 *   { non_field_errors: ["..."] }  — non-field DRF errors
 *   plain string bodies            — rare but possible
 */
export function parseApiError(err: unknown, fallback = 'Something went wrong'): string {
  const data = (err as any)?.data ?? (err as any)?.error?.data;
  if (!data) return fallback;

  if (typeof data === 'string') return data;

  // Priority 1: explicit detail / message keys
  if (data.detail) return String(data.detail);
  if (data.message) return String(data.message);

  // Priority 2: non_field_errors array
  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
    return data.non_field_errors.join(' ');
  }

  // Priority 3: field-level errors  { email: ["msg1", "msg2"], name: ["msg"] }
  const fieldMessages = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([field, msgs]) => {
      const list = Array.isArray(msgs) ? msgs : [String(msgs)];
      // Capitalise the field name nicely: "email" → "Email"
      const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `${label}: ${list.join(', ')}`;
    });

  if (fieldMessages.length) return fieldMessages.join('\n');

  return fallback;
}
