import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PetsForm } from "@/features/pets/components/ui/pets-form";
import { PetsList } from "@/features/pets/components/ui/pets-list";

export default function PetsPage() {
  return (
    <main className="mx-auto max-w-xl p-6 space-y-8">
      <header className="flex items-top justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Pets</h1>
          <p className="text-sm text-muted-foreground">
            Second feature/table using the same Dexie + TanStack Query patterns.
          </p>
        </div>
        <Link href="/" className="underline text-sm shrink-0 pt-1">
          <ArrowLeft className="inline-block mr-1" size={14} />
          <span>Back to homepage</span>
        </Link>
      </header>

      <PetsForm />
      <PetsList />
    </main>
  );
}
