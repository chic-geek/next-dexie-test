import Link from "next/link";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { PetsEditForm } from "@/features/pets/components/ui/pets-edit-form";

interface EditPetPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPetPage({ params }: EditPetPageProps) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-xl p-6 space-y-8">
      <header className="flex items-top justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-1.5">
            <FilePenLine size={24} />
            <span>Edit pet</span>
          </h1>
        </div>
        <Link href="/pets" className="underline text-sm shrink-0 pt-1">
          <ArrowLeft className="inline-block mr-1" size={14} />
          <span>Back to pets</span>
        </Link>
      </header>

      <PetsEditForm petId={Number(id)} />
    </main>
  );
}
