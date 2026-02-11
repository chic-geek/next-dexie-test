"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { peopleKeys } from "./query-keys";
import { addPerson, listPeopleNewestFirst } from "./storage";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: peopleKeys.all }),
  });
}
