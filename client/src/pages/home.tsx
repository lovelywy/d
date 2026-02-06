
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
import { Calculator, TrendingUp, RefreshCcw, Plus, Trash2, RotateCcw, Trophy, History as HistoryIcon } from "lucide-react";
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
      setProfits({ min: 0, max: 0 });
      toast({ title: "รีเซ็ตข้อมูลเทิร์นโอเวอร์ทั้งหมดเรียบร้อย" });
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
      const usdtUsed = targetCreditPerSite / R[i];
      const depositedThb = usdtUsed * parseFloat(s.depositRate);
      const totalCreditWithBonus = depositedThb * (1 + parseFloat(s.bonusPercent) / 100);
      return {
        id: s.id,
        name: s.name,
        usdtUsed,
        depositedThb,
        totalCreditWithBonus,
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
        updates: { targetTurnover: res.totalTarget.toString(), currentTurnover: "0", remainingBalance: null }
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
      speak(`ครบเทิร์นเว็บ ${site.name} แล้วค่ะ! กรุณาป้อนยอดคงเหลือ`);
    }
  };

  const trackerSites = sites.filter(s => parseFloat(s.targetTurnover || "0") > 0);
  const allSitesCompleted = trackerSites.length > 0 && trackerSites.every(s => parseFloat(s.currentTurnover || "0") >= parseFloat(s.targetTurnover || "0"));
  const hasBalance = (s: Site) => s.remainingBalance !== null && s.remainingBalance !== undefined && s.remainingBalance !== "";
  const allBalancesEntered = allSitesCompleted && trackerSites.every(hasBalance);

  const confirmMissionComplete = async () => {
    const totalRemaining = trackerSites.reduce((sum, s) => sum + parseFloat(s.remainingBalance || "0"), 0);
    const finalProfit = totalRemaining - totalCapitalThb;

    await addHistoryMutation.mutateAsync({
      initialThb: totalCapitalThb.toString(),
      totalUsdt: totalUsdtInput,
      profit: finalProfit.toString(),
      details: {
        sites: trackerSites.map(s => ({ name: s.name, balance: s.remainingBalance, target: s.targetTurnover })),
        exchangeRate,
        timestamp: new Date().toISOString()
      }
    });

    if (finalProfit < 0) {
      speak(`ภารกิจเสร็จสิ้นค่ะ ขาดทุน ${Math.abs(Math.round(finalProfit))} บาท สู้ใหม่รอบหน้านะคะ`, { slow: true });
    } else if (finalProfit <= 5000) {
      speak(`เย้! ภารกิจสำเร็จค่ะ กำไร ${Math.round(finalProfit)} บาท ดีใจด้วยนะคะ!`);
    } else if (finalProfit <= 20000) {
      speak(`ว้าว! ภารกิจสำเร็จค่ะ กำไร ${Math.round(finalProfit)} บาท สุดยอดเลยค่ะ!`);
    } else {
      speak(`เฮ! เฮ! เฮ! ภารกิจสำเร็จค่ะ กำไร ${Math.round(finalProfit)} บาท มหาศาลเลยค่ะ!`);
    }

    toast({ title: "ภารกิจสำเร็จ!", description: `กำไรสุทธิ: ${Math.round(finalProfit).toLocaleString()} บาท` });

    await resetAllMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap justify-between items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-app-title">USDT Financial Mission</h1>
          <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sites"] })} data-testid="button-refresh">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </header>

        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calculator" data-testid="tab-calculator"><Calculator className="mr-2 h-4 w-4" /> Calculator</TabsTrigger>
            <TabsTrigger value="tracker" data-testid="tab-tracker"><TrendingUp className="mr-2 h-4 w-4" /> Tracker</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history"><HistoryIcon className="mr-2 h-4 w-4" /> History</TabsTrigger>
          </TabsList>

          {/* ===== CALCULATOR TAB ===== */}
          <TabsContent value="calculator" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>ทุนและอัตราแลกเปลี่ยน</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>จำนวน USDT ทั้งหมด</Label>
                  <Input data-testid="input-total-usdt" type="number" value={totalUsdtInput} onChange={e => setTotalUsdtInput(e.target.value)} />
                  <p className="text-xs text-muted-foreground">≈ {totalCapitalThb.toLocaleString()} THB (ทุนตั้งต้น)</p>
                </div>
                <div className="space-y-2">
                  <Label>อัตราแลก (THB/USDT)</Label>
                  <div className="flex gap-2">
                    <Input data-testid="input-exchange-rate" type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
                    <Button onClick={() => fetchRateMutation.mutate()} disabled={fetchRateMutation.isPending} data-testid="button-fetch-rate">Fetch</Button>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <Button className="flex-1" onClick={() => calculateSplit(true)} data-testid="button-calculate">คำนวณ</Button>
                  <Button variant="outline" onClick={() => { setCalcResults([]); setProfits({ min: 0, max: 0 }); }} data-testid="button-clear-calc">ล้าง</Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle>เลือกเว็บที่จะใช้</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild><Button size="sm" data-testid="button-manage-sites"><Plus className="mr-2 h-4 w-4" /> จัดการเว็บ</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>จัดการรายชื่อเว็บ</DialogTitle></DialogHeader>
                      <SiteForm onSubmit={data => createSiteMutation.mutate(data)} />
                      <div className="mt-4 border-t pt-4">
                        <Label className="mb-2 block">เว็บทั้งหมด</Label>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {sites.map(site => (
                            <div key={site.id} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm font-medium">{site.name}</span>
                              <Button variant="ghost" size="icon" onClick={() => deleteSiteMutation.mutate(site.id)} data-testid={`button-delete-site-${site.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sites.map(site => (
                    <div key={site.id} className="flex items-center space-x-3 p-3 border rounded-md hover-elevate cursor-pointer transition-colors" onClick={() => setSelectedSiteIds(prev => prev.includes(site.id) ? prev.filter(id => id !== site.id) : [...prev, site.id])} data-testid={`checkbox-site-${site.id}`}>
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
                <Card className="border-primary/20">
                  <CardHeader><CardTitle>ผลลัพธ์ (ยอดที่ต้องฝาก)</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {calcResults.map(res => (
                        <div key={res.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0" data-testid={`result-site-${res.id}`}>
                          <span className="font-medium">{res.name}</span>
                          <div className="flex gap-4">
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground">ยอดฝากเงินบาท</p>
                              <p className="font-bold text-primary" data-testid={`text-deposit-thb-${res.id}`}>{Math.round(res.depositedThb || 0).toLocaleString()} บาท</p>
                            </div>
                            <div className="text-right border-l pl-4">
                              <p className="text-[10px] text-muted-foreground">จำนวน USDT</p>
                              <p className="font-mono" data-testid={`text-usdt-used-${res.id}`}>{(res.usdtUsed || 0).toFixed(2)} USDT</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex flex-wrap justify-between gap-1 font-bold">
                        <span>กำไรขั้นต่ำคาดการณ์:</span>
                        <span className={profits.min >= 0 ? "text-green-600" : "text-red-600"} data-testid="text-profit-min">{Math.round(profits.min).toLocaleString()} บาท</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-1 font-bold">
                        <span>กำไรสูงสุดคาดการณ์:</span>
                        <span className="text-green-600" data-testid="text-profit-max">{Math.round(profits.max).toLocaleString()} บาท</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" onClick={saveTargets} data-testid="button-save-targets">บันทึกเป้าหมายไปที่ Tracker</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ===== TRACKER TAB ===== */}
          <TabsContent value="tracker" className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 className="text-xl font-bold">Turnover Tracker</h2>
              <Button variant="destructive" onClick={() => resetAllMutation.mutate()} data-testid="button-reset-tracker">
                <RotateCcw className="mr-2 h-4 w-4" /> รีเซ็ต
              </Button>
            </div>

            {trackerSites.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  ยังไม่มีเป้าหมาย กรุณาคำนวณและบันทึกจากหน้า Calculator ก่อน
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trackerSites.map(site => (
                <TrackerCard key={site.id} site={site} onUpdate={updateBet} onBalanceUpdate={(id, bal) => updateSiteMutation.mutate({ id, updates: { remainingBalance: bal } })} />
              ))}
            </div>

            {allSitesCompleted && (
              <Card className="border-green-500/50">
                <CardContent className="py-6 space-y-4">
                  <div className="text-center">
                    <Trophy className="h-10 w-10 mx-auto text-green-600 mb-2" />
                    <h3 className="text-lg font-bold">ครบเทิร์นทุกเว็บแล้ว!</h3>
                    <p className="text-sm text-muted-foreground">กรุณาป้อนยอดคงเหลือทุกเว็บแล้วกดยืนยัน</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    {trackerSites.map(s => (
                      <div key={s.id} className="flex flex-wrap justify-between gap-1">
                        <span>{s.name}:</span>
                        <span className={hasBalance(s) ? "font-bold text-green-600" : "text-muted-foreground"}>
                          {hasBalance(s) ? `${parseFloat(s.remainingBalance || "0").toLocaleString()} บาท` : "ยังไม่ได้ป้อน"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-between gap-1 font-bold border-t pt-2">
                    <span>รวมยอดคงเหลือ:</span>
                    <span>{trackerSites.reduce((sum, s) => sum + parseFloat(s.remainingBalance || "0"), 0).toLocaleString()} บาท</span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-1 text-sm">
                    <span>ทุนตั้งต้น:</span>
                    <span>{totalCapitalThb.toLocaleString()} บาท</span>
                  </div>
                  <Button
                    className="w-full min-h-14 text-lg font-bold"
                    disabled={!allBalancesEntered}
                    onClick={confirmMissionComplete}
                    data-testid="button-confirm-mission"
                  >
                    <Trophy className="mr-2 h-5 w-5" /> ยืนยันภารกิจสำเร็จ
                  </Button>
                  {!allBalancesEntered && (
                    <p className="text-xs text-center text-destructive">กรุณาป้อนยอดคงเหลือทุกเว็บก่อนกดยืนยัน</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== HISTORY TAB ===== */}
          <TabsContent value="history">
            <Card>
              <CardHeader><CardTitle>ประวัติรอบการเล่น</CardTitle></CardHeader>
              <CardContent>
                {historyList.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground" data-testid="text-no-history">ไม่มีประวัติการเล่น</p>
                ) : (
                  <div className="space-y-2">
                    {historyList.map(h => {
                      const profit = parseFloat(h.profit);
                      const capital = parseFloat(h.initialThb);
                      const isProfit = profit >= 0;
                      return (
                        <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-md" data-testid={`row-history-${h.id}`}>
                          <span className="text-sm text-muted-foreground" data-testid={`text-history-date-${h.id}`}>
                            {new Date(h.createdAt || '').toLocaleString('th-TH')}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm" data-testid={`text-history-capital-${h.id}`}>
                              ทุน {capital.toLocaleString()} บาท
                            </span>
                            <span className={`font-bold ${isProfit ? "text-green-600" : "text-red-600"}`} data-testid={`text-history-profit-${h.id}`}>
                              {isProfit ? "+" : ""}{profit.toLocaleString()} บาท
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
      <div className="space-y-2"><Label>ชื่อเว็บ</Label><Input data-testid="input-site-name" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label>อัตราแลก (THB/USDT)</Label><Input data-testid="input-site-rate" type="number" value={rate} onChange={e => setRate(e.target.value)} /></div>
      <div className="space-y-2"><Label>โบนัส %</Label><Input data-testid="input-site-bonus" type="number" value={bonus} onChange={e => setBonus(e.target.value)} /></div>
      <div className="space-y-2"><Label>เครดิตที่มีอยู่เดิม (บาท)</Label><Input data-testid="input-site-balance" type="number" value={balance} onChange={e => setBalance(e.target.value)} /></div>
      <Button className="w-full" onClick={() => { if (!name) return; onSubmit({ name, depositRate: rate, bonusPercent: bonus, existingBalance: balance }); setName(""); }} data-testid="button-add-site">เพิ่มรายชื่อเว็บ</Button>
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
    <Card className={isComplete ? "border-green-500/50" : ""} data-testid={`card-tracker-${site.id}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">{site.name}</CardTitle>
        {isComplete && <Trophy className="h-5 w-5 text-green-600" />}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap justify-between gap-1 text-xs"><span>ความคืบหน้า</span><span>{Math.round(current).toLocaleString()} / {Math.round(target).toLocaleString()} บาท</span></div>
          <Progress value={progress} />
          <p className="text-[10px] text-muted-foreground">เหลือ: {Math.max(0, Math.round(target - current)).toLocaleString()} บาท ({Math.round(progress)}%)</p>
        </div>
        {isComplete ? (
          <div className="space-y-2">
            <p className="text-sm font-bold text-green-600 text-center">ครบเทิร์นแล้ว!</p>
            <div className="space-y-1">
              <Label className="text-xs">ยอดเงินคงเหลือหลังเล่น (บาท)</Label>
              <Input data-testid={`input-remaining-${site.id}`} type="number" placeholder="ป้อนยอดเงินสุทธิ" value={site.remainingBalance || ""} onChange={e => onBalanceUpdate(site.id, e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input data-testid={`input-bet-${site.id}`} type="number" placeholder="ยอดเดิมพัน" value={bet} onChange={e => setBet(e.target.value)} />
            <Button onClick={() => { onUpdate(site, bet); setBet(""); }} data-testid={`button-update-bet-${site.id}`}>อัปเดต</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
