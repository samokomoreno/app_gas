export interface VehicleProfile {
  brand: string;
  model: string;
  type: string;
  year: string;
  color: string;
  imageBase64: string | null; // Kept for backward compatibility or fallback
  images: string[]; // Array of images for 360 view
  baselineMoney: number;
  baselineKm: number;
  baselineLiters: number; // Stored for record keeping, even if not used in the money formula
}

export interface SetupFormData {
  brand: string;
  model: string;
  type: string;
  year: string;
  color: string;
  baselineMoney: string;
  baselineKm: string;
  baselineLiters: string;
}