import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PeopleForm } from "@/features/people/components/ui/people-form";
import { PeopleList } from "@/features/people/components/ui/people-list";

export default function PeoplePage() {
  return (
    <main className="mx-auto max-w-xl p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">People</h1>
          <p className="text-sm text-muted-foreground">
            Manage people in the local database.
          </p>
        </div>
        <Link href="/" className="underline text-sm shrink-0">
          <ArrowLeft className="inline-block mr-1" size={14} />
          <span>Back to homepage</span>
        </Link>
      </header>

      <PeopleForm />
      <PeopleList />
    </main>
  );
}
