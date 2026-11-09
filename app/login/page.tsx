import { redirect } from "next/navigation";
import LoginForm from "../components/LoginForm";
import { getCurrentUser } from "../../lib/guards";
export const instant = false;

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "ACCOUNTS") redirect("/dashboard");
  if (user?.role === "PARENT" && user.consentAt) redirect("/home");

  return (
    <LoginForm
      startAtConsent={user?.role === "PARENT" && !user.consentAt}
      demoOtp={process.env.MOCK_OTP ?? "123456"}
    />
  );
}