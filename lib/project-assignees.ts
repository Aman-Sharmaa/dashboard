import mongoose from "mongoose";

/**
 * Normalize request body assignedMemberIds to a strict array of ObjectIds.
 * Only the IDs explicitly sent by the client are included; never default to "all" members.
 */
export function normalizeAssignedMemberIds(payload: unknown): mongoose.Types.ObjectId[] {
  const raw = Array.isArray(payload) ? payload : [];
  return raw
    .map((id: unknown) => (typeof id === "string" ? id : String(id)))
    .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
    .map((id: string) => new mongoose.Types.ObjectId(id));
}
