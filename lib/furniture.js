/**
 * Future catalog contract only. This module contains no sample or fabricated inventory.
 *
 * @typedef {Object} FurnitureDimensions
 * @property {number|null} width
 * @property {number|null} depth
 * @property {number|null} height
 * @property {"mm"|"cm"|"m"} unit
 *
 * @typedef {Object} FurniturePrice
 * @property {number} amount
 * @property {string} currency
 *
 * @typedef {Object} FurnitureRecord
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string|null} productImageUrl
 * @property {string|null} model3dRef
 * @property {FurnitureDimensions} dimensions
 * @property {string[]} materials
 * @property {string[]} colorOptions
 * @property {FurniturePrice|null} price
 * @property {string[]} placementHints
 */

/** The catalog integration must provide real records before the UI can show products. */
export const FURNITURE_RECORD_FIELDS = Object.freeze([
  "id",
  "name",
  "category",
  "productImageUrl",
  "model3dRef",
  "dimensions",
  "materials",
  "colorOptions",
  "price",
  "placementHints"
]);

export function isFurnitureRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (FURNITURE_RECORD_FIELDS.some((field) => !(field in value))) return false;
  if (["id", "name", "category"].some((field) => typeof value[field] !== "string" || !value[field].trim())) return false;
  if (value.productImageUrl !== null && typeof value.productImageUrl !== "string") return false;
  if (value.model3dRef !== null && typeof value.model3dRef !== "string") return false;
  const dimensions = value.dimensions;
  if (!dimensions || !["mm", "cm", "m"].includes(dimensions.unit)) return false;
  if (["width", "depth", "height"].some((key) => dimensions[key] !== null && (!Number.isFinite(dimensions[key]) || dimensions[key] <= 0))) return false;
  if (!Array.isArray(value.materials) || !value.materials.every((item) => typeof item === "string")) return false;
  if (!Array.isArray(value.colorOptions) || !value.colorOptions.every((item) => typeof item === "string")) return false;
  if (!Array.isArray(value.placementHints) || !value.placementHints.every((item) => typeof item === "string")) return false;
  if (value.price !== null && (!value.price || !Number.isFinite(value.price.amount) || value.price.amount < 0 || typeof value.price.currency !== "string")) return false;
  return true;
}
