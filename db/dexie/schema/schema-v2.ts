export const schemaV2 = {
  people: "++id, createdAt",
  pets: "++id, createdAt, ownerPersonId",
} as const;
