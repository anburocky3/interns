import PresentationGenerator from "@/components/PresentationGenerator";
import getCachedUsers from "@/lib/getUsers";

export default async function PresentationPage() {
  const interns = await getCachedUsers();

  return (
    <div className="p-6">
      <PresentationGenerator interns={interns} />
    </div>
  );
}
