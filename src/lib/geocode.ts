interface GeocodeResult {
  formatted_address: string;
  types: string[];
}

interface GeocodeResponse {
  status: string;
  results: GeocodeResult[];
}

const PREFERRED_TYPES = ['point_of_interest', 'establishment', 'premise'];

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as GeocodeResponse;
    if (data.status !== 'OK' || data.results.length === 0) return null;

    const preferred = data.results.find((r) =>
      r.types.some((t) => PREFERRED_TYPES.includes(t))
    );
    return (preferred ?? data.results[0]).formatted_address || null;
  } catch {
    return null;
  }
}
