"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { petsKeys } from "./query-keys";
import { addPet, listPetsNewestFirst } from "./storage";

export function usePetsQuery() {
  return useQuery({
    queryKey: petsKeys.all,
    queryFn: listPetsNewestFirst,
  });
}

export function useAddPetMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: addPet,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: petsKeys.all });
    },
  });
}
