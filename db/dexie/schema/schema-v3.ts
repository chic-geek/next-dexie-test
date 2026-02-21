export const schemaV3 = {
  people: "id, userId, createdAt, pendingSync",
  pets: "id, userId, createdAt, ownerPersonId, pendingSync",
} as const;
