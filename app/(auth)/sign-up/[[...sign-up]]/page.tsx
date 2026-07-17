import { SignUp, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="w-full flex justify-center min-h-[400px] items-center">
      <ClerkLoading>
        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading...</p>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignUp appearance={{ elements: { rootBox: "mx-auto" } }} />
      </ClerkLoaded>
    </div>
  );
}
