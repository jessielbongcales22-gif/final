export interface Barangay {
  name: string;
  lat: number;
  lng: number;
}

export interface Municipality {
  name: string;
  lat: number;
  lng: number;
  barangays: Barangay[];
}

export const municipalities: Municipality[] = [
  {
    name: 'Hinunangan',
    lat: 10.4015,
    lng: 125.2052,
    barangays: [
      { name: 'Ambacon',        lat: 10.4020, lng: 125.1980 },
      { name: 'Bangcas A',      lat: 10.4060, lng: 125.2010 },
      { name: 'Bangcas B',      lat: 10.4080, lng: 125.2000 },
      { name: 'Biasong',        lat: 10.3900, lng: 125.2300 },
      { name: 'Bugho',          lat: 10.3750, lng: 125.2100 },
      { name: 'Calayugan',      lat: 10.4010, lng: 125.2020 },
      { name: 'Canipaan',       lat: 10.4120, lng: 125.2030 },
      { name: 'Catublian',      lat: 10.3960, lng: 125.1860 },
      { name: 'Calag-itan',     lat: 10.4300, lng: 125.1950 },
      { name: 'Libas',          lat: 10.3780, lng: 125.1900 },
      { name: 'Manalog',        lat: 10.3920, lng: 125.2000 },
      { name: 'Matin-ao',       lat: 10.4280, lng: 125.1870 },
      { name: 'Nueva Esperanza',lat: 10.3870, lng: 125.1790 },
      { name: 'Otama',          lat: 10.3800, lng: 125.2060 },
      { name: 'Palongpong',     lat: 10.4150, lng: 125.1880 },
      { name: 'Panalaron',      lat: 10.3960, lng: 125.2080 },
      { name: 'Patong',         lat: 10.3840, lng: 125.1960 },
      { name: 'Poblacion',      lat: 10.4015, lng: 125.2052 },
      { name: 'Pondol',         lat: 10.4350, lng: 125.1990 },
      { name: 'Salvacion',      lat: 10.3860, lng: 125.2120 },
      { name: 'Santo Nino I',   lat: 10.3820, lng: 125.2020 },
      { name: 'Talisay',        lat: 10.4100, lng: 125.2020 },
      { name: 'Tahusan',        lat: 10.3940, lng: 125.2180 },
      { name: 'Tawog',          lat: 10.4220, lng: 125.1970 },
      { name: 'Toptop',         lat: 10.3980, lng: 125.2040 },
      { name: 'Union',          lat: 10.3970, lng: 125.2010 },
    ],
  },
];

export function buildAddress(
  municipality: string,
  barangay: string,
  houseStreet: string
): string {
  return `${houseStreet}, Brgy. ${barangay}, ${municipality}, Southern Leyte`;
}

export function getCoords(
  municipality: string,
  barangay: string
): { lat: number; lng: number } | null {
  const mun = municipalities.find(m => m.name === municipality);
  if (!mun) return null;
  const brgy = mun.barangays.find(b => b.name === barangay);
  return brgy ?? { lat: mun.lat, lng: mun.lng };
}
