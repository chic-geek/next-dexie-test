"use client";

import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { peopleKeys } from "./query-keys";
import { addPerson, deletePerson, listPeopleNewestFirst } from "./storage";

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
