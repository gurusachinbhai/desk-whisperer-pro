import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Vite/bundler environments
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Colored pins via divIcon (CSS-only, no extra assets)
const makePin = (color: string, label?: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      border:2px solid white;display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:white;font-weight:800;font-size:11px;">${label ?? ""}</span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 26],
  });

type Pt = { lat: number; lng: number; accuracyM?: number; label?: string };

type Props = {
  signIn?: Pt | null;
  signOut?: Pt | null;
  office?: Pt | null;
  height?: number;
  className?: string;
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 16, { animate: false });
    } else {
      map.fitBounds(points, { padding: [30, 30], maxZoom: 17 });
    }
  }, [map, points]);
  return null;
}

export default function AttendanceMap({
  signIn,
  signOut,
  office,
  height = 240,
  className,
}: Props) {
  const pts: [number, number][] = [];
  if (office) pts.push([office.lat, office.lng]);
  if (signIn) pts.push([signIn.lat, signIn.lng]);
  if (signOut) pts.push([signOut.lat, signOut.lng]);

  if (!pts.length) {
    return (
      <div
        className={`grid place-items-center rounded-2xl border border-dashed border-border bg-background/60 text-xs text-muted-foreground ${className ?? ""}`}
        style={{ height }}
      >
        No location captured yet
      </div>
    );
  }

  const center = pts[0];

  return (
    <div className={`overflow-hidden rounded-2xl border border-border ${className ?? ""}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {office && (
          <>
            <Marker position={[office.lat, office.lng]} icon={makePin("#2563eb", "O")}>
              <Popup>Office location</Popup>
            </Marker>
            <Circle
              center={[office.lat, office.lng]}
              radius={100}
              pathOptions={{ color: "#2563eb", fillOpacity: 0.08 }}
            />
          </>
        )}

        {signIn && (
          <>
            <Marker position={[signIn.lat, signIn.lng]} icon={makePin("#16a34a", "IN")}>
              <Popup>
                Sign-in
                <br />
                {signIn.lat.toFixed(5)}, {signIn.lng.toFixed(5)}
                {signIn.accuracyM != null && <><br />Accuracy ±{Math.round(signIn.accuracyM)}m</>}
              </Popup>
            </Marker>
            {signIn.accuracyM != null && (
              <Circle
                center={[signIn.lat, signIn.lng]}
                radius={signIn.accuracyM}
                pathOptions={{ color: "#16a34a", fillOpacity: 0.1 }}
              />
            )}
            {office && (
              <Polyline
                positions={[[office.lat, office.lng], [signIn.lat, signIn.lng]]}
                pathOptions={{ color: "#16a34a", dashArray: "6 6" }}
              />
            )}
          </>
        )}

        {signOut && (
          <>
            <Marker position={[signOut.lat, signOut.lng]} icon={makePin("#dc2626", "OUT")}>
              <Popup>
                Sign-out
                <br />
                {signOut.lat.toFixed(5)}, {signOut.lng.toFixed(5)}
                {signOut.accuracyM != null && <><br />Accuracy ±{Math.round(signOut.accuracyM)}m</>}
              </Popup>
            </Marker>
            {office && (
              <Polyline
                positions={[[office.lat, office.lng], [signOut.lat, signOut.lng]]}
                pathOptions={{ color: "#dc2626", dashArray: "6 6" }}
              />
            )}
          </>
        )}

        <FitBounds points={pts} />
      </MapContainer>
    </div>
  );
}
