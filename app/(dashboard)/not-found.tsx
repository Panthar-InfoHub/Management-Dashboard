import { Button } from "@/components/ui/button";
import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center h-full">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">Not Found</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        The page or resource you're looking for doesn't exist or has been removed.
      </p>
      <Button variant="outline" asChild className="mt-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
