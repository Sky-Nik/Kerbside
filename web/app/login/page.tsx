import { Login } from "./Login";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, mode } = await searchParams;
  return <Login initialError={typeof error === "string" ? error : null} initialMode={mode === "up" ? "up" : "in"} />;
}
