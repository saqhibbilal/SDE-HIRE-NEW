import { SignupForm } from "./components/signup-form"
import { BackButton } from "./components/back-button"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-4">
        <BackButton />
      </div>
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="mx-auto w-full max-w-md space-y-6 px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-sm text-muted-foreground mt-2">Enter your information to get started</p>
          </div>
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
