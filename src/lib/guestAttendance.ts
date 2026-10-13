/**
 * SQL fragment shared by the member and customer lists.
 *
 * A guest is only counted after an actual check-in/attendance. Matching favours
 * a normalized Vietnamese phone number and falls back to an exact full-name
 * match for legacy registrations that did not capture a phone number.
 */
export function attendedEventCountSql(personNameSql: string, personPhoneSql: string) {
  return `
    COALESCE((
      SELECT COUNT(DISTINCT registration.event_id)::int
      FROM event_registrations registration
      WHERE (
        registration.checkin_at IS NOT NULL
        OR LOWER(BTRIM(COALESCE(registration.attendance_status, ''))) IN ('đã check-in', 'đã tham gia', 'tham dự')
      )
      AND (
        (
          LENGTH(REGEXP_REPLACE(COALESCE(registration.guest_phone, ''), '[^0-9]', '', 'g')) >= 9
          AND LENGTH(REGEXP_REPLACE(COALESCE(${personPhoneSql}, ''), '[^0-9]', '', 'g')) >= 9
          AND RIGHT(REGEXP_REPLACE(registration.guest_phone, '[^0-9]', '', 'g'), 9)
            = RIGHT(REGEXP_REPLACE(${personPhoneSql}, '[^0-9]', '', 'g'), 9)
        )
        OR (
          NULLIF(LOWER(BTRIM(COALESCE(registration.guest_name, ''))), '') IS NOT NULL
          AND NULLIF(LOWER(BTRIM(COALESCE(${personNameSql}, ''))), '') IS NOT NULL
          AND LOWER(BTRIM(registration.guest_name)) = LOWER(BTRIM(${personNameSql}))
        )
      )
    ), 0)`;
}
