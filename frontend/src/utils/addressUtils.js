/**
 * Resolves the primary/default delivery address from a user's addresses array.
 *
 * Rules:
 * 1. If empty or no saved addresses: returns null (City and Pincode remain blank).
 * 2. If exactly one saved address: returns that address.
 * 3. If multiple saved addresses: returns the address explicitly marked as `isDefault === true`.
 *    If none is marked default, returns null (does not choose arbitrarily by index).
 */
export function resolvePrimaryAddress(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) return null;
  if (addresses.length === 1) return addresses[0];
  const explicitDefault = addresses.find((a) => a.isDefault);
  return explicitDefault || null;
}
