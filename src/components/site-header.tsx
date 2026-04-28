import { Link } from "@tanstack/react-router";
import { BellRing, LayoutDashboard, Plus, Scissors, UsersRound } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/clientes", label: "Clientes", icon: UsersRound, exact: false },
  { to: "/alertas", label: "Alertas", icon: BellRing, exact: false },
  { to: "/novo", label: "Cadastro", icon: Plus, exact: false },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-border/70 bg-panel text-panel-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-md bg-accent text-accent-foreground shadow-glow">
            <Scissors className="size-4" />
          </span>
          Mensalistas
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-panel-foreground/75 transition-colors hover:bg-panel-foreground/10 hover:text-panel-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
