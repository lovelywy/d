
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, TrendingUp, RefreshCcw, Plus, Trash2, Volume2 } from "lucide-react";
import type { Site, InsertSite } from "@shared/schema";

export default function App() {
  const { toast } = useToast();
  const [totalUsdtInput, setTotalUsdtInput] = useState<string>("300");
  const [exchangeRate, setExchangeRate] = useState<string>("35.5");
  const [calcResults, setCalcResults] = useState<any[]>([]);
  const [profits, setProfits] = useState({ min: 0, max: 0 });

  const totalCapitalThb = (parseFloat(totalUsdtInput) || 0) * (parseFloat(exchangeRate) || 0);

  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });

  const fetchRateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/rates/usdt-thb");
      return res.json();
    },
    onSuccess: (data) => setExchangeRate(data.price),
  });

  const createSiteMutation = useMutation({
    mutationFn: async (site: InsertSite) => {
      return apiRequest("POST", "/api/sites", site);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sites"] }),
  });

  const updateSiteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Site> }) => {
      return apiRequest("PUT", buildUrl("/api/sites/:id", { id }), updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sites"] }),
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", buildUrl("/api/sites/:id", { id }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sites"] }),
  });

  const calculateSplit = () => {
    const rawUsdt = parseFloat(totalUsdtInput);
    const rate = parseFloat(exchangeRate);
    if (isNaN(rawUsdt) || isNaN(rate) || sites.length === 0) return;

    // Deduct 1 USDT fee per site automatically
    const feeTotal = sites.length * 1;
    const netUsdt = rawUsdt - feeTotal;
    
    if (netUsdt <= 0) {
      toast({ title: "Insufficient USDT", description: "Not enough USDT to cover the 1 USDT fee per site.", variant: "destructive" });
      return;
    }
    
    // Site Credit = (USDT_Portion * Site_Deposit_Rate) * (1 + Bonus_Percent / 100)
    // Goal: Site Credit is equal for all sites.
    
    const R = sites.map(s => parseFloat(s.depositRate) * (1 + parseFloat(s.bonusPercent) / 100));
    const sumInvR = R.reduce((sum, r) => sum + (1 / r), 0);
    const targetCreditPerSite = netUsdt / sumInvR;

    const results = sites.map((s, i) => {
      const usdtUsed = targetCreditPerSite / R[i];
      return {
        id: s.id,
        name: s.name,
        usdtUsed,
        creditReceived: targetCreditPerSite,
        totalTarget: targetCreditPerSite + parseFloat(s.existingBalance || "0")
      };
    });

    setCalcResults(results);

    const totalCredits = targetCreditPerSite * sites.length;
    const A = totalCredits / 2;
    const B = A * 0.95;
    const Y = A + B;
    setProfits({
      min: Y - totalCapitalThb,
      max: totalCredits - totalCapitalThb
    });
  };

  const saveTargets = async () => {
    for (const res of calcResults) {
      await updateSiteMutation.mutateAsync({
        id: res.id,
        updates: { targetTurnover: res.totalTarget.toString(), currentTurnover: "0" }
      });
    }
    toast({ title: "Targets saved to Tracker" });
  };

  const speak = (text: string) => {
    // Stop any current speech before starting new one
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find a Thai voice if available
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang.includes('th'));
    
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }
    
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  // Ensure voices are loaded (Chrome needs this)
  useEffect(() => {
    window.speechSynthesis.getVoices();
    const handleVoicesChanged = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
  }, []);

  const updateBet = async (site: Site, betAmount: string) => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet)) return;

    const newCurrent = parseFloat(site.currentTurnover || "0") + bet;
    const target = parseFloat(site.targetTurnover || "0");
    const remaining = target - newCurrent;

    await updateSiteMutation.mutateAsync({
      id: site.id,
      updates: { currentTurnover: newCurrent.toString() }
    });

    if (remaining > 0) {
      speak(`เหลือเทิร์นเว็บ ${site.name} ${Math.round(remaining)} บาท`);
    } else {
      speak(`ครบเทิร์น ${site.name} แล้วจ้า!`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Financial Simulator</h1>
          <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sites"] })}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </header>

        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calculator"><Calculator className="mr-2 h-4 w-4" /> Calculator</TabsTrigger>
            <TabsTrigger value="tracker"><TrendingUp className="mr-2 h-4 w-4" /> Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Capital & Rate</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Total USDT</Label>
                  <Input type="number" value={totalUsdtInput} onChange={e => setTotalUsdtInput(e.target.value)} />
                  <p className="text-xs text-muted-foreground">≈ {totalCapitalThb.toLocaleString()} THB</p>
                </div>
                <div className="space-y-2">
                  <Label>USDT Rate (Binance TH)</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
                    <Button onClick={() => fetchRateMutation.mutate()} disabled={fetchRateMutation.isPending}>Fetch</Button>
                  </div>
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={calculateSplit} variant="primary">Calculate Split</Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Sites Configuration</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Site</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add New Site</DialogTitle></DialogHeader>
                      <SiteForm onSubmit={data => createSiteMutation.mutate(data)} />
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sites.map(site => (
                    <div key={site.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                      <div>
                        <p className="font-semibold">{site.name}</p>
                        <p className="text-sm text-muted-foreground">Rate: {site.depositRate} | Bonus: {site.bonusPercent}% | Bal: {site.existingBalance}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteSiteMutation.mutate(site.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {calcResults.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader><CardTitle>Results & Predictions</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {calcResults.map(res => (
                        <div key={res.id} className="flex justify-between text-sm">
                          <span>{res.name}: {res.usdtUsed.toFixed(2)} USDT</span>
                          <span className="font-mono">{Math.round(res.creditReceived)} THB</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between font-bold">
                        <span>Min Profit (Predicted):</span>
                        <span className={profits.min >= 0 ? "text-green-600" : "text-red-600"}>{Math.round(profits.min)} THB</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Max Profit (Predicted):</span>
                        <span className="text-green-600">{Math.round(profits.max)} THB</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" onClick={saveTargets}>Save Targets to Tracker</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tracker" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sites.map(site => (
                <TrackerCard key={site.id} site={site} onUpdate={updateBet} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SiteForm({ onSubmit }: { onSubmit: (data: InsertSite) => void }) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("36.5");
  const [bonus, setBonus] = useState("0");
  const [balance, setBalance] = useState("0");

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2"><Label>Site Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label>Deposit Rate (THB/USDT)</Label><Input type="number" value={rate} onChange={e => setRate(e.target.value)} /></div>
      <div className="space-y-2"><Label>Bonus %</Label><Input type="number" value={bonus} onChange={e => setBonus(e.target.value)} /></div>
      <div className="space-y-2"><Label>Existing Balance (THB)</Label><Input type="number" value={balance} onChange={e => setBalance(e.target.value)} /></div>
      <Button className="w-full" onClick={() => onSubmit({ name, depositRate: rate, bonusPercent: bonus, existingBalance: balance })}>Save Site</Button>
    </div>
  );
}

function TrackerCard({ site, onUpdate }: { site: Site, onUpdate: (site: Site, amount: string) => void }) {
  const [bet, setBet] = useState("");
  const current = parseFloat(site.currentTurnover || "0");
  const target = parseFloat(site.targetTurnover || "0");
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <Card className={progress >= 100 ? "border-green-500 bg-green-50/10" : ""}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{site.name}</CardTitle>
        <Volume2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-xs"><span>Progress</span><span>{Math.round(current)} / {Math.round(target)} THB</span></div>
          <Progress value={progress} />
        </div>
        <div className="flex gap-2">
          <Input type="number" placeholder="Bet amount" value={bet} onChange={e => setBet(e.target.value)} />
          <Button onClick={() => { onUpdate(site, bet); setBet(""); }}>Update</Button>
        </div>
      </CardContent>
    </Card>
  );
}
