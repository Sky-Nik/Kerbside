import { Login } from "./Login";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return <Login initialError={typeof error === "string" ? error : null} />;
}
