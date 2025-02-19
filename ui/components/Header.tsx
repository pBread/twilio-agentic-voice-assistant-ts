import Link from "next/link";

export function Header() {
  return (
    <header>
      <Link href="/">
        <img className="header-logo" alt="logo" src={"/logo.png"} />
      </Link>
    </header>
  );
}
