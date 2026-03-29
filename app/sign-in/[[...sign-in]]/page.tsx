import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <SignIn />
    </div>
  );
}
