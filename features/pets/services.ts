"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { petsKeys } from "./query-keys";
import { addPet, deletePet, listPetsNewestFirst, updatePet } from "./storage";
import { toast } from "sonner";
import { NewPet } from "./types";

export function usePetsQuery() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: petsKeys.all,
    queryFn: () => listPetsNewestFirst(userId!),
    enabled: !!userId,
  });
}

export function useAddPetMutation() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: (input: NewPet) => addPet(input, session!.user.id),
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

export function useUpdatePetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<NewPet>;
      name?: string;
    }) => updatePet(id, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: petsKeys.all });
      toast.success(`Updated ${variables.name}'s details.`);
    },
    onError: (_, variables) => {
      toast.error(`Failed to update ${variables?.name}'s details.`);
    },
  });
}
