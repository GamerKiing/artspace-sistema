import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type ClientStatus = "Ativo" | "Pendente" | "Atrasado";

export type Client = {
  id: number;
  name: string;
  phone: string;
  plan: string;
  planValue: number;
  lastRenewal: string;
  nextDue: string;
  status: ClientStatus;
};

export type EnrichedClient = Client & {
  displayStatus: ClientStatus;
  dueIn: number;
};

export const TODAY = new Date("2026-04-23T12:00:00");

const initialClients: Client[] = [
  { id: 1, name: "Rafael Moraes", phone: "5511998327711", plan: "Cabelo + Barba", planValue: 189, lastRenewal: "2026-03-26", nextDue: "2026-04-25", status: "Pendente" },
  { id: 2, name: "Gustavo Lima", phone: "5511987449210", plan: "Só Cabelo", planValue: 129, lastRenewal: "2026-04-03", nextDue: "2026-05-03", status: "Ativo" },
  { id: 3, name: "Bruno Teixeira", phone: "5511973321184", plan: "Cabelo + Barba Premium", planValue: 249, lastRenewal: "2026-03-18", nextDue: "2026-04-17", status: "Atrasado" },
  { id: 4, name: "Marcos Oliveira", phone: "5511960145588", plan: "Barba Ilimitada", planValue: 109, lastRenewal: "2026-04-12", nextDue: "2026-05-12", status: "Ativo" },
  { id: 5, name: "Diego Santos", phone: "5511958830192", plan: "Só Cabelo", planValue: 129, lastRenewal: "2026-03-24", nextDue: "2026-04-23", status: "Pendente" },
  { id: 6, name: "Henrique Costa", phone: "5511945523321", plan: "Cabelo + Barba", planValue: 189, lastRenewal: "2026-04-01", nextDue: "2026-05-01", status: "Ativo" },
];

export const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function daysUntilDue(date: string) {
  const due = new Date(`${date}T12:00:00`);
  return Math.ceil((due.getTime() - TODAY.getTime()) / 86_400_000);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
}

export function getDisplayStatus(client: Client): ClientStatus {
  const days = daysUntilDue(client.nextDue);
  if (days < 0) return "Atrasado";
  if (days <= 3) return "Pendente";
  return client.status === "Atrasado" ? "Pendente" : client.status;
}

export function statusBadgeVariant(status: ClientStatus) {
  if (status === "Ativo") return "success" as const;
  if (status === "Pendente") return "warning" as const;
  return "danger" as const;
}

type ClientsContextValue = {
  clients: Client[];
  enrichedClients: EnrichedClient[];
  mrr: number;
  dueToday: number;
  alerts: EnrichedClient[];
  confirmRenewal: (id: number) => void;
  addClient: (input: Omit<Client, "id" | "nextDue" | "status" | "plan"> & { plan?: string }) => Client;
};

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(initialClients);

  const value = useMemo<ClientsContextValue>(() => {
    const enrichedClients: EnrichedClient[] = clients.map((c) => ({
      ...c,
      displayStatus: getDisplayStatus(c),
      dueIn: daysUntilDue(c.nextDue),
    }));
    const alerts = enrichedClients.filter((c) => c.dueIn < 3).sort((a, b) => a.dueIn - b.dueIn);
    const mrr = clients.reduce((sum, c) => sum + c.planValue, 0);
    const dueToday = enrichedClients.filter((c) => c.dueIn === 0).length;

    return {
      clients,
      enrichedClients,
      mrr,
      dueToday,
      alerts,
      confirmRenewal: (id) =>
        setClients((current) =>
          current.map((c) =>
            c.id === id
              ? { ...c, lastRenewal: TODAY.toISOString().slice(0, 10), nextDue: addDays(TODAY, 30), status: "Ativo" }
              : c,
          ),
        ),
      addClient: (input) => {
        const next: Client = {
          id: Date.now(),
          name: input.name,
          phone: input.phone,
          plan: input.plan ?? (input.planValue >= 180 ? "Cabelo + Barba" : "Só Cabelo"),
          planValue: input.planValue,
          lastRenewal: input.lastRenewal,
          nextDue: addDays(new Date(`${input.lastRenewal}T12:00:00`), 30),
          status: "Ativo",
        };
        setClients((current) => [next, ...current]);
        return next;
      },
    };
  }, [clients]);

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClients deve ser usado dentro de ClientsProvider");
  return ctx;
}
