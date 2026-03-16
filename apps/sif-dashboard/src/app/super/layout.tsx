import { SuperShell } from "../../components/super-shell";

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return <SuperShell>{children}</SuperShell>;
}
