"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { petsKeys } from "./query-keys";
import { addPet, deletePet, listPetsNewestFirst } from "./storage";
import { toast } from "sonner";

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

export function useDeletePetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePet,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: petsKeys.all });
      toast.success("Pet deleted successfully.");
    },
    onError: () => {
      toast.error("Failed to delete pet.");
    },
  });
}
