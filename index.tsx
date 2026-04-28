/// <reference types="react" />
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  MessageCircle,
  Plus,
  RefreshCcw,
  Scissors,
  Search,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/")({
  component: BarbershopMembersDashboard,
});

type ClientStatus = "Ativo" | "Pendente" | "Atrasado";

type Member = {
  id: string | number;
  name: string;
  phone: string;
  plan: string;
  planValue: number;
  lastRenewal: string;
  nextDue: string;
  status: ClientStatus;
};

type BaseClient = {
  id: string;
  nome: string;
  telefone: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = new Date();
today.setHours(12, 0, 0, 0);

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

function getDisplayStatus(nextDue: string): ClientStatus {
  const days = daysUntilDue(nextDue);
  if (days < 0) return "Atrasado";
  if (days <= 3) return "Pendente";
  return "Ativo";
}

function statusBadgeVariant(status: ClientStatus) {
  if (status === "Ativo") return "success";
  if (status === "Pendente") return "warning";
  return "danger";
}

function BarbershopMembersDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [baseClients, setBaseClients] = useState<BaseClient[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  
  const [openNewPlan, setOpenNewPlan] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  
  const [selectedMemberToRenew, setSelectedMemberToRenew] = useState<Member | null>(null);
  const [renewalPaymentDate, setRenewalPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [newPlanForm, setNewPlanForm] = useState({ 
    clientId: "", 
    planName: "", 
    planValue: "", 
    startDate: new Date().toISOString().slice(0, 10) 
  });

  async function loadData() {
    const { data: mData } = await supabase.from('clientes_mensalistas').select('*');
    if (mData) {
      setMembers(mData.map((c: any) => ({
        id: c.id,
        name: c.nome,
        phone: c.telefone,
        plan: c.plano,
        planValue: Number(c.valor_mensalidade),
        lastRenewal: c.ultima_renovacao || c.created_at?.slice(0, 10),
        nextDue: c.data_vencimento,
        status: getDisplayStatus(c.data_vencimento)
      })));
    }

    const { data: cData } = await supabase.from('clientes').select('*').order('nome');
    if (cData) setBaseClients(cData);
  }

  useEffect(() => { loadData(); }, []);

  const enrichedMembers = useMemo(
    () => members.map((m) => ({ ...m, dueIn: daysUntilDue(m.nextDue) })),
    [members],
  );

  const filteredMembers = enrichedMembers.filter((m) => {
    const matchesQuery = m.name.toLowerCase().includes(query.toLowerCase().trim());
    const matchesStatus = statusFilter === "todos" || m.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const alerts = enrichedMembers.filter((m) => m.dueIn <= 3).sort((a, b) => a.dueIn - b.dueIn);
  const mrr = members.reduce((sum, m) => sum + m.planValue, 0);

  async function handleConfirmRenewal() {
    if (!selectedMemberToRenew) return;
    const novaDataVencimento = addDays(new Date(`${renewalPaymentDate}T12:00:00`), 30);

    const { error } = await supabase
      .from('clientes_mensalistas')
      .update({ 
        data_vencimento: novaDataVencimento,
        ultima_renovacao: renewalPaymentDate 
      })
      .eq('id', selectedMemberToRenew.id);

    if (!error) {
      toast.success("Renovação concluída!");
      setIsRenewOpen(false);
      loadData();
    } else {
      toast.error("Erro ao renovar.");
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    const selected = baseClients.find(c => c.id === newPlanForm.clientId);
    if (!selected || !newPlanForm.planName || !newPlanForm.planValue || !newPlanForm.startDate) {
      return toast.error("Preencha todos os campos.");
    }

    const { error } = await supabase.from('clientes_mensalistas').insert([{
      nome: selected.nome,
      telefone: selected.telefone,
      plano: newPlanForm.planName,
      valor_mensalidade: Number(newPlanForm.planValue),
      data_vencimento: addDays(new Date(`${newPlanForm.startDate}T12:00:00`), 30),
      ultima_renovacao: newPlanForm.startDate 
    }]);

    if (!error) {
      setOpenNewPlan(false);
      setNewPlanForm({ clientId: "", planName: "", planValue: "", startDate: new Date().toISOString().slice(0, 10) });
      loadData();
      toast.success("Plano ativado!");
    }
  }

  return (
    <main className="min-h-screen bg-background fine-grain text-black pb-10">
      <section className="barber-sheen text-panel-foreground">
        <div className="mx-auto flex min-h-[34vh] max-w-7xl flex-col justify-between px-5 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-panel-foreground/20 bg-panel-foreground/10 px-3 py-1 text-sm text-panel-foreground/90 text-white">
                <Scissors className="size-4" /> Barbearia ArtSpace
              </div>
              <h1 className="text-4xl font-bold sm:text-6xl text-white">Mensalistas</h1>
            </div>
            <Dialog open={openNewPlan} onOpenChange={setOpenNewPlan}>
              <DialogTrigger asChild>
                <Button size="lg" className="animate-lift self-start bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg">
                  <Plus className="mr-2" /> Vincular Plano
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white text-black sm:max-w-xl border-none">
                <DialogHeader><DialogTitle className="text-xl">Ativar Nova Recorrência</DialogTitle></DialogHeader>
                <form onSubmit={handleAddMember} className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Selecione o Cliente</Label>
                    <Select onValueChange={(val) => setNewPlanForm({...newPlanForm, clientId: val})}>
                      <SelectTrigger className="bg-white border-slate-200"><SelectValue placeholder="Escolher cliente cadastrado..." /></SelectTrigger>
                      <SelectContent className="bg-white text-black">
                        {baseClients.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Nome do Plano</Label>
                    <Input placeholder="Ex: Cabelo + Barba Premium" value={newPlanForm.planName} onChange={e => setNewPlanForm({...newPlanForm, planName: e.target.value})} className="border-slate-200" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div><Label>Valor Mensal</Label><Input type="number" value={newPlanForm.planValue} onChange={e => setNewPlanForm({...newPlanForm, planValue: e.target.value})} className="border-slate-200" /></div>
                    <div><Label>Data do 1º Pagamento</Label><Input type="date" value={newPlanForm.startDate} onChange={e => setNewPlanForm({...newPlanForm, startDate: e.target.value})} className="border-slate-200" /></div>
                  </div>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-12">Ativar Plano</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-12 max-w-7xl px-5 pb-10 sm:px-8 lg:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard icon={UsersRound} label="Total Ativos" value={String(members.length)} detail="Clientes em dia" />
          <MetricCard icon={TrendingUp} label="Receita MRR" value={currency.format(mrr)} detail="Faturamento mensal" />
          <MetricCard icon={CalendarClock} label="Vencem Hoje" value={String(enrichedMembers.filter(m => m.dueIn === 0).length)} detail="Cobranças pendentes" />
        </div>

        {alerts.length > 0 && (
          <Card className="mt-6 border-amber-200 bg-amber-50 shadow-md animate-lift overflow-hidden">
            <CardHeader className="py-3 border-b border-amber-100 bg-amber-100/50">
              <CardTitle className="flex items-center gap-2 text-amber-800 text-lg">
                <BellRing className="size-5 animate-pulse text-amber-600" /> Vencimentos Próximos
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {alerts.map(m => (
                <div key={m.id} className={`bg-white p-3 rounded border flex justify-between items-center shadow-sm ${m.dueIn < 0 ? "border-red-200" : "border-amber-200"}`}>
                  <div className="truncate"><p className="font-bold text-slate-900">{m.name}</p><p className="text-xs text-slate-500">{m.plan}</p></div>
                  <Badge variant={m.dueIn < 0 ? "danger" : "warning"}>{m.dueIn < 0 ? "Atrasado" : m.dueIn === 0 ? "Hoje" : `${m.dueIn}d`}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="mt-6 shadow-xl border-none overflow-hidden bg-white">
          <CardHeader className="border-b flex flex-col md:flex-row justify-between items-center gap-4 py-6">
            <CardTitle className="text-2xl font-bold text-slate-800">Gestão de Planos</CardTitle>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9 border-slate-200" placeholder="Buscar..." value={query} onChange={e => setQuery(e.target.value)} /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-white border-slate-200 text-black"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="bg-white text-black"><SelectItem value="todos">Todos</SelectItem><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Atrasado">Atrasado</SelectItem></SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredMembers.map(m => (
                <div key={m.id} className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div><p className="font-bold text-lg text-slate-900">{m.name}</p><p className="text-sm text-slate-500">{m.plan} • <span className="font-bold text-slate-900">{currency.format(m.planValue)}</span></p></div>
                    <Badge variant={statusBadgeVariant(m.status)}>{m.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => { setSelectedMemberToRenew(m); setIsRenewOpen(true); }}><RefreshCcw className="size-4 mr-2" /> Renovar</Button>
                    <Button variant="outline" className="flex-1 h-12 border-slate-200" onClick={() => window.open(`https://wa.me/${m.phone}`)}><MessageCircle className="size-4 mr-2 text-green-600" /> Zap</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block">
              <Table>
                <TableHeader className="bg-slate-50"><TableRow><TableHead className="px-5">Nome</TableHead><TableHead>Plano</TableHead><TableHead>Última Renovação</TableHead><TableHead>Próximo Vencimento</TableHead><TableHead>Status</TableHead><TableHead className="text-right pr-5">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredMembers.map(m => (
                    <TableRow key={m.id} className="hover:bg-slate-50/50 border-b">
                      <TableCell className="px-5 font-bold text-slate-900">{m.name}</TableCell>
                      <TableCell><div>{m.plan}</div><div className="text-xs text-slate-500 font-bold">{currency.format(m.planValue)}</div></TableCell>
                      <TableCell className="text-slate-600">{formatDate(m.lastRenewal)}</TableCell>
                      <TableCell className="font-bold text-slate-900">{formatDate(m.nextDue)}</TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(m.status)}>{m.status}</Badge></TableCell>
                      <TableCell className="pr-5 text-right space-x-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => { setSelectedMemberToRenew(m); setIsRenewOpen(true); }}><RefreshCcw className="size-3 mr-1" /> Renovar</Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/${m.phone}`)} className="border-slate-200"><MessageCircle className="size-3 mr-1 text-green-600" /> WhatsApp</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent className="bg-white text-black sm:max-w-md border-none">
          <DialogHeader><DialogTitle className="text-xl">Confirmar Pagamento</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-3">
              <p className="text-sm">Registrando renovação para <strong>{selectedMemberToRenew?.name}</strong>.</p>
              <div className="grid gap-2">
                <Label>Data do Recebimento</Label>
                <Input type="date" value={renewalPaymentDate} onChange={(e) => setRenewalPaymentDate(e.target.value)} className="border-slate-200" />
              </div>
              <p className="text-xs text-slate-500 font-medium">* O próximo vencimento será calculado 30 dias após esta data de pagamento.</p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsRenewOpen(false)} className="border-slate-200">Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleConfirmRenewal}>Confirmar Renovação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: any) {
  return (
    <Card className="animate-lift border-none shadow-lg bg-white overflow-hidden">
      <CardContent className="flex items-center gap-4 p-6 text-black">
        <div className="p-3 rounded-xl bg-slate-900 text-white shadow-xl shadow-slate-200"><Icon className="size-6" /></div>
        <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</p><p className="text-2xl font-black text-slate-900">{value}</p><p className="text-xs text-slate-400 font-medium">{detail}</p></div>
      </CardContent>
    </Card>
  );
}