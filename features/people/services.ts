"use client";

import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { peopleKeys } from "./query-keys";
import {
  addPerson,
  deletePerson,
  listPeopleNewestFirst,
  updatePerson,
} from "./storage";
import { NewPerson } from "./types";

export function usePeopleQuery() {
  return useQuery({
    queryKey: peopleKeys.all,
    queryFn: listPeopleNewestFirst,
  });
}

export function useAddPersonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addPerson,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: peopleKeys.all });
      toast.success("Person added successfully.");
    },
    onError: () => {
      toast.error("Failed to add person.");
    },
  });
}

export function useDeletePersonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePerson,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: peopleKeys.all });
      toast.success("Person deleted successfully.");
    },
    onError: () => {
      toast.error("Failed to delete person.");
    },
  });
}

export function useUpdatePersonMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<NewPerson>;
      fullname?: string;
    }) => updatePerson(id, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: peopleKeys.all });
      toast.success(`Updated ${variables.fullname}'s details.`);
    },
    onError: (_, variables) => {
      toast.error(`Failed to update ${variables?.fullname}'s details.`);
    },
  });
}
