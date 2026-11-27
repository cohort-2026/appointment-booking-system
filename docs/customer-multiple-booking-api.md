# Customer multiple-slot booking

`POST /api/customer/appointments` continues to accept the existing single-booking request with a timezone-qualified `startsAt` string and returns `{ success: true, appointment: ... }`.

For multiple slots, provide the same `providerId`, `serviceId`, optional `staffId` and `customerNotes`, but supply an array of starts and a mode:

```json
{
  "providerId": "business:business-id",
  "serviceId": "service-id",
  "staffId": "staff-id",
  "startsAt": ["2030-01-07T07:00:00Z", "2030-01-07T07:45:00Z"],
  "mode": "combined"
}
```

The array must contain 1 to 12 unique, timezone-qualified starts. Separate appointments may span multiple Johannesburg calendar dates; combined appointments must be on the same date. Each start must currently be available for the same provider, service and staff member. Starts may be unordered; results are returned in chronological order.

- `separate` creates one appointment per selected start.
- `combined` requires consecutive starts spaced by the service duration plus its effective cleanup buffer. It creates one appointment spanning the first start through the last service end, including intermediate cleanup periods, with the normal final cleanup buffer. Its price is the sum of the selected slot prices, or null when the service price is null.

Customers may have at most three active appointments per Johannesburg calendar day across all providers, including appointments already booked. A combined appointment counts as one; cancelled or otherwise inactive appointments do not count. The same limit applies when rescheduling.

The response is `{ success: true, appointments: [...] }`, even when the array contains one start or the mode is combined. Each entry has the same fields as the existing `appointment` response. Invalid selections return 400; daily limits, unavailable slots, customer overlaps, and serialization conflicts return 409. A combined price that exceeds the database limit returns 422. All appointments are created in one serializable transaction or none are created. Notifications are sent only after commit.