const normalize = (plate) =>
  String(plate || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export function findVehicleByPlate(vehicles, typedPlate) {
  const target = normalize(typedPlate);
  if (!target) return null;
  return vehicles.find((v) => normalize(v.plate) === target) || null;
}
