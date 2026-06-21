declare module 'country-reverse-geocoding' {
  export interface CountryResult {
    code: string;
    name: string;
  }

  export interface CountryReverseGeocoder {
    get_country(lat: number, lng: number): CountryResult | null;
  }

  export function country_reverse_geocoding(): CountryReverseGeocoder;
}
