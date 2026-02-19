import Link from "next/link";
import { ArrowLeft, UsersRound } from "lucide-react";

import { PeopleList } from "@/features/people/components/ui/people-list";
import { PeopleCreateForm } from "@/features/people/components/ui/people-create-form";

export default function PeoplePage() {
  return (
    <main className="mx-auto max-w-xl p-6 space-y-8">
      <header className="flex items-top justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-1.5">
            <UsersRound size={24} />
            <span>People</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage people in the local database.
          </p>
        </div>
        <Link href="/" className="underline text-sm shrink-0 pt-1">
          <ArrowLeft className="inline-block mr-1" size={14} />
          <span>Back to homepage</span>
        </Link>
      </header>

      <PeopleCreateForm />
      <PeopleList />
    </main>
  );
}
