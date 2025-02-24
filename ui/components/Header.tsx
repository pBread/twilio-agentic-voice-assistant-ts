import Link from "next/link";
import { useRouter } from "next/router";

export function Header() {
  const router = useRouter();

  const callSid = router.query.callSid as string | undefined;

  return (
    <header>
      <Link href="/">
        <img className="header-logo" alt="logo" src={"/logo.png"} />
      </Link>

      <div>{callSid}</div>
    </header>
  );
}
