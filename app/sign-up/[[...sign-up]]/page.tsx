import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <SignUp />
    </div>
  );
}
