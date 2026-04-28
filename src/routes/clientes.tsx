/// <reference types="react" />
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, MessageCircle, RefreshCcw, Search, CalendarClock } from "lucide-react";
import { toast } from "sonner";

// Importando a conexão real
import { supabase } from "@/lib/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/clientes")({
  component: ClientesPage,
});

// Tipagem para bater com o seu banco
type ClientStatus = "Ativo" | "Pendente" | "Atrasado";

type Client = {
  id: string | number;
  name: string;
  phone: string;
  plan: string;
  planValue: number;
  lastRenewal: string;
  nextDue: string;
  status: ClientStatus;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = new Date();
today.setHours(12, 0, 0, 0);

// Funções utilitárias
function daysUntilDue(date: string) {
  const due = new Date(`${date}T12:00:00`);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
}

function statusBadgeVariant(status: string) {
  if (status === "Ativo") return "success";
  if (status === "Pendente") return "warning";
  return "danger";
}

function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  // Estados para o Modal de Renovação
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [selectedClientToRenew, setSelectedClientToRenew] = useState<Client | null>(null);
  const [renewalPaymentDate, setRenewalPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  // Carregar dados reais
  async function loadClients() {
    const { data, error } = await supabase.from('clientes_mensalistas').select('*');
    if (error) {
      toast.error("Erro ao carregar banco de dados.");
    } else if (data) {
      const mapped = data.map((c: any) => {
        const days = daysUntilDue(c.data_vencimento);
        let status: ClientStatus = "Ativo";
        if (days < 0) status = "Atrasado";
        else if (days <= 3) status = "Pendente";

        return {
          id: c.id,
          name: c.nome,
          phone: c.telefone,
          plan: c.plano,
          planValue: Number(c.valor_mensalidade),
          // Vinculado à coluna ultima_renovacao
          lastRenewal: c.ultima_renovacao || c.created_at?.slice(0, 10),
          nextDue: c.data_vencimento,
          status: status
        };
      });
      setClients(mapped);
    }
  }

  useEffect(() => { loadClients(); }, []);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchesQuery = c.name.toLowerCase().includes(query.toLowerCase().trim());
      const matchesStatus = statusFilter === "todos" || c.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [clients, query, statusFilter]);

  // Função disparada ao confirmar no Modal atualizando as duas colunas
  async function handleConfirmRenewal() {
    if (!selectedClientToRenew) return;
    const novaDataVencimento = addDays(new Date(`${renewalPaymentDate}T12:00:00`), 30);

    const { error } = await supabase
      .from('clientes_mensalistas')
      .update({ 
        data_vencimento: novaDataVencimento,
        ultima_renovacao: renewalPaymentDate // Gravando a data do pagamento
      })
      .eq('id', selectedClientToRenew.id);

    if (!error) {
      toast.success("Renovação concluída!");
      setIsRenewOpen(false);
      loadClients();
    } else {
      toast.error("Erro ao renovar.");
    }
  }

  function sendReminder(client: Client) {
    const message = encodeURIComponent(
      `Olá, ${client.name}! Passando para lembrar que seu plano ${client.plan}, esta com vencimento em ${formatDate(client.nextDue)} Aproveite para renovar e garantir a sua vaga.`,
    );
    window.open(`https://wa.me/${client.phone}?text=${message}`, "_blank");
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 text-black">
      <Card className="overflow-hidden border-none shadow-premium bg-white">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between border-b">
          <CardTitle className="text-2xl font-bold">Clientes Ativos</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 w-full sm:w-64" placeholder="Buscar por nome" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          
          {/* VISÃO MOBILE - CARDS */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filtered.map((client) => (
              <div key={client.id} className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.plan} • <span className="font-bold text-slate-700">{currency.format(client.planValue)}</span></p>
                  </div>
                  <Badge variant={statusBadgeVariant(client.status)}>{client.status}</Badge>
                </div>
                <div className="grid grid-cols-2 text-xs text-muted-foreground">
                  <div><p className="font-semibold uppercase">Última Renovação</p><p>{formatDate(client.lastRenewal)}</p></div>
                  <div><p className="font-semibold uppercase text-slate-900">Vencimento</p><p className="font-bold text-slate-900">{formatDate(client.nextDue)}</p></div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="success" 
                    className="flex-1 h-12" 
                    onClick={() => { setSelectedClientToRenew(client); setIsRenewOpen(true); }}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" /> Renovar
                  </Button>
                  <Button variant="outline" className="flex-1 h-12 border-slate-200" onClick={() => sendReminder(client)}><MessageCircle className="mr-2 h-4 w-4 text-green-600" /> WhatsApp</Button>
                </div>
              </div>
            ))}
          </div>

          {/* VISÃO DESKTOP - TABELA */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="px-5">Nome do Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Última Renovação</TableHead>
                  <TableHead>Próximo Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-5">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id} className="hover:bg-slate-50 border-b">
                    <TableCell className="px-5 font-bold">{client.name}</TableCell>
                    <TableCell>
                      <div className="font-medium">{client.plan}</div>
                      <div className="text-xs text-muted-foreground font-bold">{currency.format(client.planValue)}</div>
                    </TableCell>
                    <TableCell>{formatDate(client.lastRenewal)}</TableCell>
                    <TableCell className="font-bold text-slate-900">{formatDate(client.nextDue)}</TableCell>
                    <TableCell><Badge variant={statusBadgeVariant(client.status)}>{client.status}</Badge></TableCell>
                    <TableCell className="pr-5 text-right space-x-2">
                        <Button 
                          variant="success" 
                          size="sm" 
                          onClick={() => { setSelectedClientToRenew(client); setIsRenewOpen(true); }}
                        >
                          <RefreshCcw className="mr-1 h-3 w-3" /> Renovar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => sendReminder(client)} className="border-slate-200"><MessageCircle className="mr-1 h-3 w-3 text-green-600" /> WhatsApp</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 && (
            <div className="grid place-items-center gap-3 px-6 py-14 text-center">
              <AlertTriangle className="size-8 text-muted-foreground" />
              <p className="font-medium text-black">Nenhum mensalista encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE RENOVAÇÃO */}
      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent className="bg-white text-black sm:max-w-md">
          <DialogHeader><DialogTitle>Confirmar Pagamento</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-3">
              <p className="text-sm">Registrando renovação para <strong>{selectedClientToRenew?.name}</strong>.</p>
              <div className="grid gap-2">
                <Label>Data do Recebimento</Label>
                <Input type="date" value={renewalPaymentDate} onChange={(e) => setRenewalPaymentDate(e.target.value)} className="border-slate-200" />
              </div>
              <p className="text-xs text-slate-500 font-medium">* O próximo vencimento será calculado 30 dias após esta data.</p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsRenewOpen(false)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleConfirmRenewal}>Confirmar Renovação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}