import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


function SetViewToBounds({ bounds }) {
  const map = useMap();
  
  React.useEffect(() => {
    if (bounds && bounds.length > 0) {
      const leafletBounds = L.latLngBounds(bounds);
      
      map.fitBounds(leafletBounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  return null;
}

export function LeafletMap({ markers }) {
  const boundsArray = markers.map(marker => marker.position);
  const polylinePositions = [
    markers[0].position,
    markers[1].position
  ];

  return (
    <MapContainer 
      center={[0, 0]} 
      zoom={1}
      scrollWheelZoom={false} 
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polyline positions={polylinePositions} color="red" weight={3} dashArray="10, 10" />
      
      {markers.map((marker, index) => (
        <Marker key={index} position={marker.position}>
          <Popup>
            {marker.label}
          </Popup>
        </Marker>
      ))}
      
      <SetViewToBounds bounds={boundsArray} />
      
    </MapContainer>
  );
}