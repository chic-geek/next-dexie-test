import { PeopleForm } from "@/features/people/components/ui/people-form";
import { PeopleList } from "@/features/people/components/ui/people-list";

export default function PeoplePage() {
  return (
    <main className="mx-auto max-w-xl p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">People</h1>
        <p className="text-sm text-muted-foreground">
          Manage people in the local database.
        </p>
      </header>

      <PeopleForm />
      <PeopleList />
    </main>
  );
}
