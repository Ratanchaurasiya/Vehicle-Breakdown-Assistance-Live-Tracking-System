import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerHtml = {
  customer: '<div class="map-pin map-pin-customer">C</div>',
  mechanic: '<div class="map-pin map-pin-mechanic">M</div>',
  garage: '<div class="map-pin map-pin-garage">G</div>'
};

const createIcon = (type) => L.divIcon({
  className: 'map-pin-wrap',
  html: markerHtml[type],
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export default function MapComponent({ customerLoc, mechanicLoc, garageLoc, isSOS = false, onCustomerLocChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({ customer: null, mechanic: null, garage: null });
  const routeRef = useRef(null);
  const geofenceRef = useRef(null);
  const onCustomerLocChangeRef = useRef(onCustomerLocChange);

  useEffect(() => {
    onCustomerLocChangeRef.current = onCustomerLocChange;
  }, [onCustomerLocChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = customerLoc || mechanicLoc || garageLoc || [12.9716, 77.5946];
    const map = L.map(containerRef.current, {
      center,
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    map.on('click', (event) => {
      if (onCustomerLocChangeRef.current) {
        onCustomerLocChangeRef.current([event.latlng.lat, event.latlng.lng]);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = { customer: null, mechanic: null, garage: null };
      routeRef.current = null;
      geofenceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const upsertMarker = (key, loc, label, draggable = false) => {
      if (markersRef.current[key]) {
        markersRef.current[key].remove();
        markersRef.current[key] = null;
      }

      if (!loc || Number.isNaN(loc[0]) || Number.isNaN(loc[1])) return null;

      const marker = L.marker(loc, {
        icon: createIcon(key),
        title: label,
        draggable
      }).addTo(map);

      if (draggable) {
        marker.on('dragend', (event) => {
          const next = event.target.getLatLng();
          if (onCustomerLocChangeRef.current) {
            onCustomerLocChangeRef.current([next.lat, next.lng]);
          }
        });
      }

      marker.bindTooltip(label, { direction: 'top', offset: [0, -18] });
      markersRef.current[key] = marker;
      return marker;
    };

    upsertMarker('garage', garageLoc, 'Selected garage');
    upsertMarker('mechanic', mechanicLoc, 'Assigned mechanic');
    upsertMarker('customer', customerLoc, isSOS ? 'Emergency location' : 'Customer location', Boolean(onCustomerLocChange));

    if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }

    if (geofenceRef.current) {
      geofenceRef.current.remove();
      geofenceRef.current = null;
    }

    if (customerLoc && !Number.isNaN(customerLoc[0]) && !Number.isNaN(customerLoc[1])) {
      geofenceRef.current = L.circle(customerLoc, {
        radius: 100,
        color: isSOS ? '#f43f5e' : '#6366f1',
        weight: 1,
        fillColor: isSOS ? '#f43f5e' : '#6366f1',
        fillOpacity: 0.14
      }).addTo(map);
    }

    const routeStart = mechanicLoc || garageLoc;
    if (routeStart && customerLoc) {
      routeRef.current = L.polyline([routeStart, customerLoc], {
        color: '#6366f1',
        weight: 3,
        opacity: 0.8,
        dashArray: '8 8'
      }).addTo(map);
    }

    const bounds = L.latLngBounds([]);
    [customerLoc, mechanicLoc, garageLoc].forEach((loc) => {
      if (loc && !Number.isNaN(loc[0]) && !Number.isNaN(loc[1])) {
        bounds.extend(loc);
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    }
  }, [customerLoc, mechanicLoc, garageLoc, isSOS, onCustomerLocChange]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
      <div className="map-status-pill">
        <span className="status-dot active"></span>
        Live interactive map
      </div>
    </div>
  );
}
