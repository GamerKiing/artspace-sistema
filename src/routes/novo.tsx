/// <reference types="react" />
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { UserPlus, Users, Search, Phone, ArrowLeft, Pencil, Save, X } from "lucide-react";

import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/novo")({
  component: CadastroClientesBasePage,
});

type BaseClient = {
  id: string;
  nome: string;
  telefone: string;
};

function CadastroClientesBasePage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<BaseClient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Estados para Cadastro
  const [form, setForm] = useState({ name: "", phone: "" });

  // Estados para Edição
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<BaseClient | null>(null);

  async function loadBaseClients() {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true });
    if (data) setClients(data);
  }

  useEffect(() => { loadBaseClients(); }, []);

  // SALVAR NOVO
  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error("Preencha nome e telefone.");

    setLoading(true);
    const { error } = await supabase.from('clientes').insert([{
      nome: form.name.trim(),
      telefone: form.phone.replace(/\D/g, "")
    }]);

    if (!error) {
      toast.success("Cliente cadastrado!");
      setForm({ name: "", phone: "" });
      loadBaseClients();
    }
    setLoading(false);
  }

  // ATUALIZAR EXISTENTE
  async function handleUpdateClient() {
    if (!editingClient) return;

    setLoading(true);
    const { error } = await supabase
      .from('clientes')
      .update({
        nome: editingClient.nome.trim(),
        telefone: editingClient.telefone.replace(/\D/g, "")
      })
      .eq('id', editingClient.id);

    if (!error) {
      toast.success("Cadastro atualizado!");
      setIsEditOpen(false);
      loadBaseClients();
    } else {
      toast.error("Erro ao atualizar.");
    }
    setLoading(false);
  }

  const filteredClients = clients.filter(c => 
    c.nome.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 text-black">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="mr-2 size-4" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold">Gestão de Clientes</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        
        {/* FORMULÁRIO DE CADASTRO */}
        <Card className="border-none shadow-premium h-fit bg-white">
          <CardHeader className="bg-panel text-white rounded-t-lg py-4">
            <CardTitle className="flex items-center gap-2 text-lg text-white font-bold">
              <UserPlus className="size-5" /> Novo Cadastro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleAddClient} className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-11" disabled={loading}>
                Salvar Cliente
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* LISTAGEM COM OPÇÃO DE EDITAR */}
        <Card className="border-none shadow-premium bg-white">
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-slate-600" /> Clientes
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar..." value={query} onChange={e => setQuery(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-slate-50 border-b">
                    <TableCell className="font-bold">{client.nome}</TableCell>
                    <TableCell className="text-slate-600">{client.telefone}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-200"
                        onClick={() => {
                          setEditingClient(client);
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil className="size-3 mr-1" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader>
            <DialogTitle>Editar Cadastro</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome do Cliente</Label>
                <Input 
                  value={editingClient.nome} 
                  onChange={e => setEditingClient({...editingClient, nome: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp</Label>
                <Input 
                  value={editingClient.telefone} 
                  onChange={e => setEditingClient({...editingClient, telefone: e.target.value})} 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button className="bg-slate-900 text-white" onClick={handleUpdateClient} disabled={loading}>
              <Save className="size-4 mr-2" /> Gravar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}