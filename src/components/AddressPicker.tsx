import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Home } from 'lucide-react';
import { municipalities, buildAddress, getCoords } from '../data/locations';

interface AddressPickerProps {
  value: string;
  onChange: (address: string) => void;
  required?: boolean;
  label?: string;
}

export default function AddressPicker({
  value,
  onChange,
  required,
  label = 'Delivery Address',
}: AddressPickerProps) {
  const municipality = municipalities[0]; // Only Hinunangan

  const [barangay,    setBarangay]    = useState('');
  const [houseStreet, setHouseStreet] = useState('');
  const [showMap,     setShowMap]     = useState(false);
  const [coords,      setCoords]      = useState<{ lat: number; lng: number } | null>(null);

  // Build and emit full address whenever fields change
  useEffect(() => {
    if (barangay && houseStreet.trim()) {
      const full = buildAddress(municipality.name, barangay, houseStreet.trim());
      onChange(full);
      const c = getCoords(municipality.name, barangay);
      setCoords(c);
      setShowMap(true);
    } else {
      setShowMap(false);
      setCoords(null);
    }
  }, [barangay, houseStreet]);

  // Pre-fill from existing value (e.g. when editing profile)
  useEffect(() => {
    if (value && !barangay) {
      const match = value.match(/^(.+?),\s*Brgy\.\s*(.+?),\s*Hinunangan/);
      if (match) {
        setHouseStreet(match[1].trim());
        setBarangay(match[2].trim());
      }
    }
  }, []);

  const mapUrl = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.018}%2C${coords.lat - 0.013}%2C${coords.lng + 0.018}%2C${coords.lat + 0.013}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`
    : '';

  const openInMaps = () => {
    if (coords) {
      window.open(
        `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=15/${coords.lat}/${coords.lng}`,
        '_blank'
      );
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Municipality — fixed, shown as badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
        <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <div>
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Municipality</p>
          <p className="text-sm font-semibold text-blue-700">Hinunangan, Southern Leyte</p>
        </div>
      </div>

      {/* Barangay dropdown */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium">Select Barangay <span className="text-red-400">*</span></p>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={barangay}
            onChange={e => setBarangay(e.target.value)}
            className="w-full pl-9 pr-9 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
            required={required}
          >
            <option value="">-- Choose your barangay --</option>
            {municipality.barangays
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(b => (
                <option key={b.name} value={b.name}>
                  Brgy. {b.name}
                </option>
              ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* House / Street / Purok */}
      {barangay && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium">
            House No. / Street / Purok <span className="text-red-400">*</span>
          </p>
          <div className="relative">
            <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={houseStreet}
              onChange={e => setHouseStreet(e.target.value)}
              placeholder="e.g. 123 Rizal St., Purok 2"
              className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required={required}
            />
          </div>
        </div>
      )}

      {/* Full address preview */}
      {barangay && houseStreet.trim() && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-xs text-green-600 font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Full Delivery Address
          </p>
          <p className="text-sm text-green-800 font-medium">
            {houseStreet.trim()}, Brgy. {barangay}, Hinunangan, Southern Leyte
          </p>
        </div>
      )}

      {/* OpenStreetMap pin */}
      {showMap && coords && (
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          {/* Map header */}
          <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-gray-700">
                📍 Brgy. {barangay}, Hinunangan
              </span>
            </div>
            <button
              type="button"
              onClick={openInMaps}
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
            >
              Open full map ↗
            </button>
          </div>

          {/* Embedded map */}
          <iframe
            src={mapUrl}
            width="100%"
            height="240"
            className="block border-0"
            title={`Map of Brgy. ${barangay}, Hinunangan`}
            loading="lazy"
          />

          {/* Map footer */}
          <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              🌐 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
            <span className="text-xs text-gray-400">Southern Leyte, Philippines</span>
          </div>
        </div>
      )}
    </div>
  );
}
