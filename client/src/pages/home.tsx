
import { useState, useEffect, useCallback, useRef } from "react";
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
import { Calculator, TrendingUp, RefreshCcw, Plus, Trash2, RotateCcw, Trophy, History as HistoryIcon, Pencil, Save, X } from "lucide-react";
import type { Site, InsertSite, History } from "@shared/schema";

export default function App() {
  const { toast } = useToast();
  const [totalUsdtInput, setTotalUsdtInput] = useState<string>("300");
  const [exchangeRate, setExchangeRate] = useState<string>("35.5");
  const [calcResults, setCalcResults] = useState<any[]>([]);
  const [profits, setProfits] = useState({ min: 0, max: 0 });
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("calculator");
  const [celebration, setCelebration] = useState<{ show: boolean; profit: number; isProfit: boolean } | null>(null);

  const totalCapitalThb = (parseFloat(totalUsdtInput) || 0) * (parseFloat(exchangeRate) || 0);

  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: historyList = [] } = useQuery<History[]>({ queryKey: ["/api/history"] });

  useEffect(() => {
    if (sites.length > 0 && selectedSiteIds.length === 0) {
      setSelectedSiteIds(sites.map(s => s.id));
    }
  }, [sites]);

  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const thai = voices.find(v => v.lang === 'th-TH') || voices.find(v => v.lang.startsWith('th'));
        if (thai) cachedVoiceRef.current = thai;
      };
      loadVoice();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoice);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoice);
    }
  }, []);

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

  const updateHistoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return apiRequest("PUT", buildUrl("/api/history/:id", { id }), updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/history"] }),
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", buildUrl("/api/history/:id", { id }));
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
    },
  });

  const speak = useCallback((text: string, options: { slow?: boolean } = {}) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (cachedVoiceRef.current) {
      utterance.voice = cachedVoiceRef.current;
    } else {
      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find(v => v.lang === 'th-TH') || voices.find(v => v.lang.startsWith('th'));
      if (thaiVoice) {
        utterance.voice = thaiVoice;
        cachedVoiceRef.current = thaiVoice;
      }
    }
    utterance.lang = 'th-TH';
    utterance.rate = options.slow ? 0.8 : 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
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

  const saveBalance = useCallback(async (id: number, bal: string) => {
    await updateSiteMutation.mutateAsync({ id, updates: { remainingBalance: bal } });
  }, [updateSiteMutation]);

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

    const isProfit = finalProfit >= 0;
    setCelebration({ show: true, profit: finalProfit, isProfit });

    let voiceText: string;
    if (!isProfit) {
      voiceText = `ภารกิจเสร็จสิ้นค่ะ ขาดทุน ${Math.abs(Math.round(finalProfit))} บาท สู้ใหม่รอบหน้านะคะ`;
    } else if (finalProfit <= 5000) {
      voiceText = `เย้! ภารกิจสำเร็จค่ะ กำไร ${Math.round(finalProfit)} บาท ดีใจด้วยนะคะ!`;
    } else if (finalProfit <= 20000) {
      voiceText = `ว้าว! ภารกิจสำเร็จค่ะ กำไร ${Math.round(finalProfit)} บาท สุดยอดเลยค่ะ!`;
    } else {
      voiceText = `เฮ! เฮ! เฮ! ภารกิจสำเร็จค่ะ กำไร ${Math.round(finalProfit)} บาท มหาศาลเลยค่ะ!`;
    }
    speak(voiceText);

    setTimeout(async () => {
      setCelebration(null);
      try {
        await resetAllMutation.mutateAsync();
      } catch (_) {}
      setActiveTab("history");
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {celebration?.show && (
        <CelebrationOverlay profit={celebration.profit} isProfit={celebration.isProfit} />
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap justify-between items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-app-title">USDT Financial Mission</h1>
          <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sites"] })} data-testid="button-refresh">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <TrackerCard key={site.id} site={site} onUpdate={updateBet} onBalanceSave={saveBalance} />
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
                  <div className="space-y-3">
                    {historyList.map(h => (
                      <HistoryRow
                        key={h.id}
                        entry={h}
                        onUpdate={(id, updates) => updateHistoryMutation.mutate({ id, updates })}
                        onDelete={(id) => {
                          if (confirm("ต้องการลบประวัตินี้?")) deleteHistoryMutation.mutate(id);
                        }}
                      />
                    ))}
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

function CelebrationOverlay({ profit, isProfit }: { profit: number; isProfit: boolean }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [scale, setScale] = useState(0.3);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    setOpacity(1);
    setScale(1);

    const target = Math.round(profit);
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    let current = 0;
    const increment = target / steps;

    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
        setAnimatedValue(target);
        clearInterval(timer);
      } else {
        setAnimatedValue(Math.round(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [profit]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: isProfit
          ? 'radial-gradient(circle, rgba(0,128,0,0.85) 0%, rgba(0,60,0,0.95) 100%)'
          : 'radial-gradient(circle, rgba(180,0,0,0.85) 0%, rgba(80,0,0,0.95) 100%)',
        opacity,
        transition: 'opacity 0.5s ease-out',
      }}
      data-testid="celebration-overlay"
    >
      <div
        className="text-center"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {isProfit && (
          <div className="text-6xl mb-4" style={{ animation: 'bounce 1s infinite' }}>
            <Trophy className="h-20 w-20 mx-auto text-yellow-300 drop-shadow-lg" />
          </div>
        )}
        <p className="text-white text-2xl font-bold mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          {isProfit ? "ภารกิจสำเร็จ!" : "ภารกิจเสร็จสิ้น"}
        </p>
        <p className="text-white text-lg mb-4" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          {isProfit ? "กำไร" : "ขาดทุน"}
        </p>
        <div
          className="font-black tabular-nums"
          style={{
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            color: isProfit ? '#FFD700' : '#FF6B6B',
            textShadow: isProfit
              ? '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.4), 0 4px 20px rgba(0,0,0,0.5)'
              : '0 0 30px rgba(255,100,100,0.8), 0 4px 20px rgba(0,0,0,0.5)',
            animation: isProfit ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
          }}
          data-testid="text-celebration-profit"
        >
          {isProfit ? "+" : ""}{animatedValue.toLocaleString()}
        </div>
        <p className="text-white text-3xl font-bold mt-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          บาท
        </p>

        {isProfit && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${Math.random() * 8 + 4}px`,
                  height: `${Math.random() * 8 + 4}px`,
                  background: ['#FFD700', '#FFA500', '#FF6347', '#00FF7F', '#87CEEB'][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `confetti-fall ${2 + Math.random() * 3}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        )}
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

function HistoryRow({ entry, onUpdate, onDelete }: { entry: History, onUpdate: (id: number, updates: any) => void, onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(entry.userName || "");
  const [editProfit, setEditProfit] = useState(entry.profit);

  const profit = parseFloat(entry.profit);
  const capital = parseFloat(entry.initialThb);
  const isProfit = profit >= 0;

  const handleSave = () => {
    onUpdate(entry.id, { userName: editName, profit: editProfit });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditName(entry.userName || "");
    setEditProfit(entry.profit);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 border rounded-md space-y-3" data-testid={`row-history-${entry.id}`}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">ชื่อผู้ใช้</Label>
            <Input data-testid={`input-history-name-${entry.id}`} value={editName} onChange={e => setEditName(e.target.value)} placeholder="ชื่อผู้ใช้" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">กำไร/ขาดทุน (บาท)</Label>
            <Input data-testid={`input-history-profit-${entry.id}`} type="number" value={editProfit} onChange={e => setEditProfit(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleCancel} data-testid={`button-cancel-edit-${entry.id}`}><X className="h-4 w-4 mr-1" /> ยกเลิก</Button>
          <Button size="sm" onClick={handleSave} data-testid={`button-save-history-${entry.id}`}><Save className="h-4 w-4 mr-1" /> บันทึก</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-md" data-testid={`row-history-${entry.id}`}>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted-foreground" data-testid={`text-history-date-${entry.id}`}>
          {new Date(entry.createdAt || '').toLocaleString('th-TH')}
        </span>
        {entry.userName && (
          <span className="text-xs font-medium" data-testid={`text-history-user-${entry.id}`}>{entry.userName}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm" data-testid={`text-history-capital-${entry.id}`}>
          ทุน {capital.toLocaleString()} บาท
        </span>
        <span className={`font-bold ${isProfit ? "text-green-600" : "text-red-600"}`} data-testid={`text-history-profit-${entry.id}`}>
          {isProfit ? "+" : ""}{profit.toLocaleString()} บาท
        </span>
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} data-testid={`button-edit-history-${entry.id}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)} data-testid={`button-delete-history-${entry.id}`}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function TrackerCard({ site, onUpdate, onBalanceSave }: { site: Site, onUpdate: (site: Site, amount: string) => void, onBalanceSave: (id: number, bal: string) => void }) {
  const [bet, setBet] = useState("");
  const [localBalance, setLocalBalance] = useState(site.remainingBalance || "");
  const current = parseFloat(site.currentTurnover || "0");
  const target = parseFloat(site.targetTurnover || "0");
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = current >= target;

  useEffect(() => {
    setLocalBalance(site.remainingBalance || "");
  }, [site.remainingBalance]);

  const handleBalanceBlur = () => {
    if (localBalance !== (site.remainingBalance || "")) {
      onBalanceSave(site.id, localBalance);
    }
  };

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
              <Input
                data-testid={`input-remaining-${site.id}`}
                type="number"
                placeholder="ป้อนยอดเงินสุทธิ"
                value={localBalance}
                onChange={e => setLocalBalance(e.target.value)}
                onBlur={handleBalanceBlur}
                onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
              />
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
