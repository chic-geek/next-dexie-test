import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PawPrint, UsersRound } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Dexie demo</h1>
        <p className="text-sm text-muted-foreground">
          Local database demo using Dexie and TanStack Query in a Next.js app.
        </p>
      </header>

      <div className="grid gap-4">
        <Link href="/people">
          <Card className="hover:bg-muted transition-colors cursor-pointer">
            <CardContent>
              <h2 className="font-medium flex items-center gap-1">
                <UsersRound size={20} />
                <span>People</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Create and manage people.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pets">
          <Card className="hover:bg-muted transition-colors cursor-pointer">
            <CardContent>
              <h2 className="font-medium flex items-center gap-1">
                <PawPrint size={20} />
                <span>Pets</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Create pets and associate them with people.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
