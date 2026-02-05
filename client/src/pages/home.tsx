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
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, TrendingUp, RefreshCcw, Plus, Trash2, Volume2, RotateCcw } from "lucide-react";
import type { Site, InsertSite } from "@shared/schema";

export default function App() {
  const { toast } = useToast();
  const [totalUsdtInput, setTotalUsdtInput] = useState<string>("300");
  const [exchangeRate, setExchangeRate] = useState<string>("35.5");
  const [calcResults, setCalcResults] = useState<any[]>([]);
  const [profits, setProfits] = useState({ min: 0, max: 0 });
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);

  const totalCapitalThb = (parseFloat(totalUsdtInput) || 0) * (parseFloat(exchangeRate) || 0);

  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });

  useEffect(() => {
    if (sites.length > 0 && selectedSiteIds.length === 0) {
      setSelectedSiteIds(sites.map(s => s.id));
    }
  }, [sites]);

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

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang.includes('th'));
    if (thaiVoice) utterance.voice = thaiVoice;
    utterance.lang = 'th-TH';
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    window.speechSynthesis.getVoices();
    const handleVoicesChanged = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
  }, []);

  const calculateSplit = (withVoice = false) => {
    const rawUsdt = parseFloat(totalUsdtInput);
    const rate = parseFloat(exchangeRate);
    const selectedSites = sites.filter(s => selectedSiteIds.includes(s.id));
    
    if (isNaN(rawUsdt) || isNaN(rate) || selectedSites.length === 0) return;

    const feeTotal = selectedSites.length * 1;
    const netUsdt = rawUsdt - feeTotal;
    
    if (netUsdt <= 0) {
      toast({ title: "USDT ไม่เพียงพอ", description: "ยอด USDT ไม่พอสำหรับค่าธรรมเนียมเว็บละ 1 USDT", variant: "destructive" });
      return;
    }
    
    const R = selectedSites.map(s => parseFloat(s.depositRate) * (1 + parseFloat(s.bonusPercent) / 100));
    const sumInvR = R.reduce((sum, r) => sum + (1 / r), 0);
    const targetCreditPerSite = netUsdt / sumInvR;

    const results = selectedSites.map((s, i) => {
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

    const totalCredits = targetCreditPerSite * selectedSites.length;
    const A = totalCredits / 2;
    const B = A * 0.95;
    const Y = A + B;
    const minProfitValue = Y - totalCapitalThb;
    const maxProfitValue = totalCredits - totalCapitalThb;
    
    setProfits({ min: minProfitValue, max: maxProfitValue });

    if (withVoice) {
      speak(`คำนวณเรียบร้อยแล้วค่ะ กำไรขั้นต่ำประมาณ ${Math.round(minProfitValue)} บาท และกำไรสูงสุดประมาณ ${Math.round(maxProfitValue)} บาท`);
    }
  };

  const resetCalculation = () => {
    setCalcResults([]);
    setProfits({ min: 0, max: 0 });
    toast({ title: "รีเซ็ตการคำนวณเรียบร้อย" });
  };

  const saveTargets = async () => {
    for (const res of calcResults) {
      await updateSiteMutation.mutateAsync({
        id: res.id,
        updates: { targetTurnover: res.totalTarget.toString(), currentTurnover: "0" }
      });
    }
    toast({ title: "บันทึกเป้าหมายไปที่หน้า Tracker แล้ว" });
  };

  const toggleSiteSelection = (id: number) => {
    setSelectedSiteIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

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
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div className="flex items-end gap-2">
                  <Button className="flex-1" onClick={() => calculateSplit(true)} variant="primary">คำนวณ (มีเสียง)</Button>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" className="flex-1" onClick={resetCalculation}><RotateCcw className="mr-2 h-4 w-4" /> รีเซ็ต</Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>เลือกเว็บที่จะใช้</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> จัดการเว็บ</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>จัดการรายชื่อเว็บ</DialogTitle></DialogHeader>
                      <SiteForm onSubmit={data => createSiteMutation.mutate(data)} />
                      <div className="mt-4 border-t pt-4">
                        <Label className="mb-2 block">เว็บทั้งหมด</Label>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {sites.map(site => (
                            <div key={site.id} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm font-medium">{site.name}</span>
                              <Button variant="ghost" size="icon" onClick={() => deleteSiteMutation.mutate(site.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {sites.map(site => (
                      <div key={site.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => toggleSiteSelection(site.id)}>
                        <Checkbox checked={selectedSiteIds.includes(site.id)} onCheckedChange={() => toggleSiteSelection(site.id)} />
                        <div className="flex-1">
                          <p className="font-semibold">{site.name}</p>
                          <p className="text-xs text-muted-foreground">Rate: {site.depositRate} | Bonus: {site.bonusPercent}% | Bal: {site.existingBalance}</p>
                        </div>
                      </div>
                    ))}
                    {sites.length === 0 && <p className="text-center text-muted-foreground py-4">ยังไม่มีรายชื่อเว็บ</p>}
                  </div>
                </CardContent>
              </Card>

              {calcResults.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader><CardTitle>ผลลัพธ์การคำนวณ</CardTitle></CardHeader>
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
                        <span>กำไรขั้นต่ำคาดการณ์:</span>
                        <span className={profits.min >= 0 ? "text-green-600" : "text-red-600"}>{Math.round(profits.min)} THB</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>กำไรสูงสุดคาดการณ์:</span>
                        <span className="text-green-600">{Math.round(profits.max)} THB</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" onClick={saveTargets}>บันทึกเป้าหมายไปที่ Tracker</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tracker" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sites.filter(s => parseFloat(s.targetTurnover || "0") > 0).map(site => (
                <TrackerCard key={site.id} site={site} onUpdate={updateBet} />
              ))}
              {sites.filter(s => parseFloat(s.targetTurnover || "0") > 0).length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  ยังไม่มีเป้าหมายในขณะนี้ กรุณาคำนวณและบันทึกข้อมูลจากหน้า Calculator
                </div>
              )}
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
      <div className="space-y-2"><Label>ชื่อเว็บ</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label>อัตราแลก (THB/USDT)</Label><Input type="number" value={rate} onChange={e => setRate(e.target.value)} /></div>
      <div className="space-y-2"><Label>โบนัส %</Label><Input type="number" value={bonus} onChange={e => setBonus(e.target.value)} /></div>
      <div className="space-y-2"><Label>เครดิตที่มีอยู่เดิม (บาท)</Label><Input type="number" value={balance} onChange={e => setBalance(e.target.value)} /></div>
      <Button className="w-full" onClick={() => {
        if (!name) return;
        onSubmit({ name, depositRate: rate, bonusPercent: bonus, existingBalance: balance });
        setName("");
      }}>เพิ่มรายชื่อเว็บ</Button>
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
          <div className="flex justify-between text-xs"><span>ความคืบหน้า</span><span>{Math.round(current)} / {Math.round(target)} บาท</span></div>
          <Progress value={progress} />
        </div>
        <div className="flex gap-2">
          <Input type="number" placeholder="ยอดเดิมพัน" value={bet} onChange={e => setBet(e.target.value)} />
          <Button onClick={() => { onUpdate(site, bet); setBet(""); }}>อัปเดต</Button>
        </div>
      </CardContent>
    </Card>
  );
}
