
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calculator, TrendingUp, RefreshCcw, Plus, Trash2, Volume2, RotateCcw, Trophy, History as HistoryIcon } from "lucide-react";
import type { Site, InsertSite, History } from "@shared/schema";

export default function App() {
  const { toast } = useToast();
  const [totalUsdtInput, setTotalUsdtInput] = useState<string>("300");
  const [exchangeRate, setExchangeRate] = useState<string>("35.5");
  const [calcResults, setCalcResults] = useState<any[]>([]);
  const [profits, setProfits] = useState({ min: 0, max: 0 });
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);

  const totalCapitalThb = (parseFloat(totalUsdtInput) || 0) * (parseFloat(exchangeRate) || 0);

  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: historyList = [] } = useQuery<History[]>({ queryKey: ["/api/history"] });

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

  const addHistoryMutation = useMutation({
    mutationFn: async (entry: any) => {
      return apiRequest("POST", "/api/history", entry);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/history"] }),
  });

  const resetAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/sites/reset-turnover", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      setCalcResults([]);
      toast({ title: "ล้างข้อมูลทั้งหมดเรียบร้อย" });
    },
  });

  const speak = (text: string, options: { slow?: boolean } = {}) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang.includes('th'));
    if (thaiVoice) utterance.voice = thaiVoice;
    utterance.lang = 'th-TH';
    utterance.rate = options.slow ? 0.8 : 1.0;
    window.speechSynthesis.speak(utterance);
  };

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
      const depositedThb = (targetCreditPerSite / R[i]) * parseFloat(s.depositRate);
      const totalCreditWithBonus = depositedThb * (1 + parseFloat(s.bonusPercent) / 100);
      return {
        id: s.id,
        name: s.name,
        depositedThb, // actual amount user must input/deposit
        totalCreditWithBonus, // total_credits per site
        totalTarget: totalCreditWithBonus + parseFloat(s.existingBalance || "0")
      };
    });

    setCalcResults(results);

    const totalCredits = results.reduce((sum, res) => sum + res.totalCreditWithBonus, 0);
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

  const saveTargets = async () => {
    for (const res of calcResults) {
      await updateSiteMutation.mutateAsync({
        id: res.id,
        updates: { targetTurnover: res.totalTarget.toString(), currentTurnover: "0", remainingBalance: "0" }
      });
    }
    toast({ title: "บันทึกเป้าหมายไปที่หน้า Tracker แล้ว" });
  };

  const updateBet = async (site: Site, betAmount: string) => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet)) return;

    const newCurrent = parseFloat(site.currentTurnover || "0") + bet;
    const target = parseFloat(site.targetTurnover || "0");
    const remaining = Math.max(0, target - newCurrent);

    await updateSiteMutation.mutateAsync({
      id: site.id,
      updates: { currentTurnover: newCurrent.toString() }
    });

    if (remaining > 0) {
      speak(`เหลือเทิร์นเว็บ ${site.name} ${Math.round(remaining)} บาท`);
    } else {
      speak(`ภารกิจสำเร็จเว็บ ${site.name}! เย้!!`);
    }
  };

  const confirmMissionComplete = async () => {
    const completedSites = sites.filter(s => parseFloat(s.targetTurnover || "0") > 0 && parseFloat(s.currentTurnover || "0") >= parseFloat(s.targetTurnover || "0"));
    const totalRemaining = completedSites.reduce((sum, s) => sum + parseFloat(s.remainingBalance || "0"), 0);
    const finalProfit = totalRemaining - totalCapitalThb;

    // Save to history
    await addHistoryMutation.mutateAsync({
      initialThb: totalCapitalThb.toString(),
      totalUsdt: totalUsdtInput,
      profit: finalProfit.toString(),
      details: {
        sites: completedSites.map(s => ({ name: s.name, balance: s.remainingBalance })),
        timestamp: new Date().toISOString()
      }
    });

    // Announce
    if (finalProfit < 0) {
      speak("อุ๊ย... ขาดทุนนะคะ... สู้ใหม่รอบหน้าดีกว่า", { slow: true });
    } else if (finalProfit <= 5000) {
      speak("กำไรนิดหน่อย แต่ก็ดีใจจ้าาา เยี่ยมเลย!");
    } else if (finalProfit <= 20000) {
      speak("ว้าวว! กำไรดีมากเลยนะคะ เย้!!! สุดยอด!");
    } else {
      // High profit hype
      speak("โคตรเกินนนน!!! กำไรมหาศาลเลยยยยย เย้ยยยยยยย!!!! ฉ่ำสุดๆ ไปเลยยยย สุดในจักรวาลดดดด!!!");
      setTimeout(() => speak("เฮ!!! เฮ!!! เฮ!!!"), 5000);
    }

    toast({ title: "ภารกิจสำเร็จ!", description: `กำไรสุทธิ: ${finalProfit.toLocaleString()} บาท` });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">USDT Financial Mission</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sites"] })}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={() => resetAllMutation.mutate()}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calculator"><Calculator className="mr-2 h-4 w-4" /> Calculator</TabsTrigger>
            <TabsTrigger value="tracker"><TrendingUp className="mr-2 h-4 w-4" /> Tracker</TabsTrigger>
            <TabsTrigger value="history"><HistoryIcon className="mr-2 h-4 w-4" /> History</TabsTrigger>
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
                  <Label>Rate (USDT/THB)</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
                    <Button onClick={() => fetchRateMutation.mutate()} disabled={fetchRateMutation.isPending}>Fetch</Button>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <Button className="flex-1" onClick={() => calculateSplit(true)} variant="primary">คำนวณ</Button>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => resetAllMutation.mutate()}>รีเซ็ต</Button>
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
                <CardContent className="space-y-2">
                  {sites.map(site => (
                    <div key={site.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => setSelectedSiteIds(prev => prev.includes(site.id) ? prev.filter(id => id !== site.id) : [...prev, site.id])}>
                      <Checkbox checked={selectedSiteIds.includes(site.id)} />
                      <div className="flex-1">
                        <p className="font-semibold">{site.name}</p>
                        <p className="text-xs text-muted-foreground">Rate: {site.depositRate} | Bonus: {site.bonusPercent}%</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {calcResults.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader><CardTitle>ผลลัพธ์ (ยอดที่ต้องโอน)</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {calcResults.map(res => (
                        <div key={res.id} className="flex justify-between text-sm">
                          <span>{res.name} (ยอดโอน):</span>
                          <span className="font-bold text-primary">{Math.round(res.depositedThb).toLocaleString()} บาท</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between font-bold">
                        <span>กำไรขั้นต่ำคาดการณ์:</span>
                        <span className={profits.min >= 0 ? "text-green-600" : "text-red-600"}>{Math.round(profits.min).toLocaleString()} บาท</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>กำไรสูงสุดคาดการณ์:</span>
                        <span className="text-green-600">{Math.round(profits.max).toLocaleString()} บาท</span>
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
                <TrackerCard key={site.id} site={site} onUpdate={updateBet} onBalanceUpdate={(id, bal) => updateSiteMutation.mutate({ id, updates: { remainingBalance: bal } })} />
              ))}
            </div>
            {sites.some(s => parseFloat(s.targetTurnover || "0") > 0 && parseFloat(s.currentTurnover || "0") >= parseFloat(s.targetTurnover || "0")) && (
              <Button className="w-full h-16 text-xl font-bold" onClick={confirmMissionComplete} variant="success">
                <Trophy className="mr-2 h-6 w-6" /> ยืนยันภารกิจสำเร็จ
              </Button>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader><CardTitle>ประวัติรอบการเล่น</CardTitle></CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {historyList.map((h, i) => (
                    <AccordionItem key={h.id} value={`item-${i}`}>
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                          <span>{new Date(h.createdAt || '').toLocaleString()}</span>
                          <span className={parseFloat(h.profit) >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {parseFloat(h.profit).toLocaleString()} บาท
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>ทุนตั้งต้น: {parseFloat(h.initialThb).toLocaleString()} บาท ({h.totalUsdt} USDT)</p>
                          <div className="grid grid-cols-2 gap-2">
                            {(h.details as any).sites?.map((s: any, j: number) => (
                              <div key={j} className="flex justify-between">
                                <span>{s.name}:</span>
                                <span>{parseFloat(s.balance).toLocaleString()} บาท</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {historyList.length === 0 && <p className="text-center py-8 text-muted-foreground">ไม่มีประวัติการเล่น</p>}
              </CardContent>
            </Card>
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
      <Button className="w-full" onClick={() => { if (!name) return; onSubmit({ name, depositRate: rate, bonusPercent: bonus, existingBalance: balance }); setName(""); }}>เพิ่มรายชื่อเว็บ</Button>
    </div>
  );
}

function TrackerCard({ site, onUpdate, onBalanceUpdate }: { site: Site, onUpdate: (site: Site, amount: string) => void, onBalanceUpdate: (id: number, bal: string) => void }) {
  const [bet, setBet] = useState("");
  const current = parseFloat(site.currentTurnover || "0");
  const target = parseFloat(site.targetTurnover || "0");
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = current >= target;

  return (
    <Card className={isComplete ? "border-green-500 bg-green-50/10" : ""}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{site.name}</CardTitle>
        {isComplete && <Trophy className="h-5 w-5 text-green-600" />}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-xs"><span>ความคืบหน้า</span><span>{Math.round(current)} / {Math.round(target)} บาท</span></div>
          <Progress value={progress} />
          <p className="text-[10px] text-muted-foreground">เหลือ: {Math.max(0, Math.round(target - current))} บาท</p>
        </div>
        {isComplete ? (
          <div className="space-y-2">
            <p className="text-sm font-bold text-green-600 text-center">ครบเทิร์นแล้ว!</p>
            <div className="space-y-1">
              <Label className="text-xs">ยอดเงินคงเหลือหลังเล่น</Label>
              <Input type="number" placeholder="ยอดเงินสุทธิ" value={site.remainingBalance || ""} onChange={e => onBalanceUpdate(site.id, e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input type="number" placeholder="ยอดเดิมพัน" value={bet} onChange={e => setBet(e.target.value)} />
            <Button onClick={() => { onUpdate(site, bet); setBet(""); }}>อัปเดต</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
