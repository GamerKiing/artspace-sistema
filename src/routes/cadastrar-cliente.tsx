import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserPlus, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/cadastrar-cliente")({
  component: CadastrarClientePage,
});

function CadastrarClientePage() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !telefone) return toast.error("Preencha todos os campos!");

    setCarregando(true);
    const { error } = await supabase.from('clientes').insert([
      { nome: nome.trim(), telefone: telefone.replace(/\D/g, "") }
    ]);

    if (!error) {
      toast.success("Cliente cadastrado com sucesso!");
      setNome("");
      setTelefone("");
    } else {
      toast.error("Erro ao salvar cliente.");
    }
    setCarregando(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-black">
      <Card className="border-none shadow-premium bg-white">
        <CardHeader className="bg-panel text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-6" /> Novo Cadastro de Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSalvar} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input 
                id="nome" 
                placeholder="Ex: João Silva" 
                value={nome} 
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tel">WhatsApp (com DDD)</Label>
              <Input 
                id="tel" 
                placeholder="31999999999" 
                value={telefone} 
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700" disabled={carregando}>
              {carregando ? "Salvando..." : "Salvar Cliente"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}