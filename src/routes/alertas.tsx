/// <reference types="react" />
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, MessageCircle, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

// Conexão real com o seu banco
import { supabase } from "@/lib/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/alertas")({
  component: AlertasPage,
});

// Tipagem para os dados do banco
type Client = {
  id: string | number;
  name: string;
  phone: string;
  plan: string;
  planValue: number;
  nextDue: string;
  dueIn: number;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = new Date();
today.setHours(12, 0, 0, 0);

// Funções de cálculo
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

function AlertasPage() {
  const [alerts, setAlerts] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para o Modal de Renovação
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [selectedClientToRenew, setSelectedClientToRenew] = useState<Client | null>(null);
  const [renewalPaymentDate, setRenewalPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  async function loadAlerts() {
    setLoading(true);
    const { data, error } = await supabase.from('clientes_mensalistas').select('*');
    
    if (error) {
      toast.error("Erro ao carregar alertas.");
    } else if (data) {
      const filtered = data
        .map((c: any) => ({
          id: c.id,
          name: c.nome,
          phone: c.telefone,
          plan: c.plano,
          planValue: Number(c.valor_mensalidade),
          nextDue: c.data_vencimento,
          dueIn: daysUntilDue(c.data_vencimento)
        }))
        .filter((c: any) => c.dueIn <= 3)
        .sort((a: any, b: any) => a.dueIn - b.dueIn);

      setAlerts(filtered);
    }
    setLoading(false);
  }

  useEffect(() => { loadAlerts(); }, []);

  // Função para confirmar a renovação com a data escolhida
  async function handleConfirmRenewal() {
    if (!selectedClientToRenew) return;
    const novaDataVencimento = addDays(new Date(`${renewalPaymentDate}T12:00:00`), 30);

    const { error } = await supabase
      .from('clientes_mensalistas')
      .update({ data_vencimento: novaDataVencimento })
      .eq('id', selectedClientToRenew.id);

    if (!error) {
      toast.success("Renovação concluída!");
      setIsRenewOpen(false);
      loadAlerts();
    } else {
      toast.error("Erro ao renovar.");
    }
  }

  function sendReminder(client: Client) {
    const message = encodeURIComponent(
      `Olá, ${client.name}! Passando para lembrar da renovação do seu plano ${client.plan}, com vencimento em ${formatDate(client.nextDue)}.`
    );
    window.open(`https://wa.me/${client.phone}?text=${message}`, "_blank");
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 text-black">
      <Card className="overflow-hidden border-none shadow-premium bg-white">
        <CardHeader className="bg-panel text-panel-foreground py-4">
          <CardTitle className="flex items-center gap-2 text-xl text-white">
            <BellRing className="size-5 text-accent animate-pulse" /> Alertas de Vencimento
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="col-span-full text-center py-10">Carregando alertas...</p>
          ) : alerts.length === 0 ? (
            <div className="col-span-full grid place-items-center gap-2 py-10 text-center">
              <p className="font-medium">Nenhum alerta no momento 🎉</p>
              <p className="text-sm text-muted-foreground">
                Todos os mensalistas estão em dia. <Link to="/clientes" className="underline font-bold text-slate-900">Ver lista completa</Link>
              </p>
            </div>
          ) : (
            alerts.map((client) => (
              <div key={client.id} className={`rounded-lg border p-4 shadow-sm flex flex-col justify-between ${
                client.dueIn < 0 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-900 truncate">{client.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {client.plan} · <span className="font-bold">{currency.format(client.planValue)}</span>
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">Vence em {formatDate(client.nextDue)}</p>
                  </div>
                  <Badge variant={client.dueIn < 0 ? "danger" : "warning"}>
                    {client.dueIn < 0 ? `${Math.abs(client.dueIn)}d atraso` : client.dueIn === 0 ? "Hoje" : `${client.dueIn}d`}
                  </Badge>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="success" 
                    size="sm" 
                    className="flex-1 font-bold" 
                    onClick={() => { setSelectedClientToRenew(client); setIsRenewOpen(true); }}
                  >
                    <RefreshCcw className="size-3 mr-1" /> Renovar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 border-slate-200 bg-white" onClick={() => sendReminder(client)}>
                    <MessageCircle className="size-3 mr-1 text-green-600" /> WhatsApp
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* MODAL DE RENOVAÇÃO PADRONIZADO */}
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