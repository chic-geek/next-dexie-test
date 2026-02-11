import { PeopleForm } from "@/features/people/components/ui/people-form";
import { PeopleList } from "@/features/people/components/ui/people-list";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl p-6 space-y-8">
      <h1 className="text-2xl font-bold">
        Next, Dexie &amp; TanStack Query example
      </h1>
      <PeopleForm />
      <PeopleList />
    </main>
  );
}
