
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, RefreshCcw, Plus, Minus, Trash2, RotateCcw, Trophy, History as HistoryIcon, Pencil, Save, X, Settings, Check, BookmarkPlus, FolderOpen } from "lucide-react";
import type { Site, InsertSite, History } from "@shared/schema";

export default function App() {
  const { toast } = useToast();
  const [totalUsdtInput, setTotalUsdtInput] = useState<string>(() => {
    try { return localStorage.getItem("last-usdt") || "300"; } catch { return "300"; }
  });
  const [exchangeRate, setExchangeRate] = useState<string>(() => {
    try { return localStorage.getItem("last-rate") || "35.5"; } catch { return "35.5"; }
  });
  const [calcResults, setCalcResults] = useState<any[]>([]);
  const [profits, setProfits] = useState({ min: 0, max: 0 });
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>(() => {
    try { const s = localStorage.getItem("last-sites"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState("calculator");
  const [celebration, setCelebration] = useState<{ show: boolean; profit: number; isProfit: boolean } | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<{ name: string; siteIds: number[] }[]>([]);
  const [configName, setConfigName] = useState("");
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  const totalCapitalThb = (parseFloat(totalUsdtInput) || 0) * (parseFloat(exchangeRate) || 0);

  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ["/api/sites"] });
  const { data: historyList = [] } = useQuery<History[]>({ queryKey: ["/api/history"] });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("site-configs");
      if (stored) setSavedConfigs(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem("last-usdt", totalUsdtInput); } catch {} }, [totalUsdtInput]);
  useEffect(() => { try { localStorage.setItem("last-rate", exchangeRate); } catch {} }, [exchangeRate]);
  useEffect(() => { try { localStorage.setItem("last-sites", JSON.stringify(selectedSiteIds)); } catch {} }, [selectedSiteIds]);

  useEffect(() => {
    if (sites.length > 0 && selectedSiteIds.length > 0) {
      const valid = selectedSiteIds.filter(id => sites.some(s => s.id === id));
      if (valid.length !== selectedSiteIds.length) setSelectedSiteIds(valid);
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
      const numSites = selectedSites.length;
      speak(`วาวาคิดให้นะ ฝาก ${numSites} เว็บ ด้านล่างนี้เลย กำไรอย่างน้อยต้องได้ ${Math.round(minProfitValue)} บาท สูงสุดอาจจะได้ถึง ${Math.round(maxProfitValue)} บาท เลยนะคะ`);
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
    <div className="min-h-screen bg-background subtle-grid p-4 md:p-8">
      {celebration?.show && (
        <CelebrationOverlay profit={celebration.profit} isProfit={celebration.isProfit} />
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between items-center gap-2 py-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight gold-text" data-testid="text-app-title">Dollcara Mission by Vava</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5" data-testid="text-copyright">ลิขสิทธิ์ โดย นิวัฒน์ รักสนิท</p>
          </div>
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
                  <CardTitle>รายชื่อเว็บสำหรับใช้ทำกำไร</CardTitle>
                  <div className="flex gap-2">
                    <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
                      <DialogTrigger asChild><Button size="sm" variant="outline" data-testid="button-manage-sites"><Settings className="mr-2 h-4 w-4" /> จัดการเว็บ</Button></DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>จัดการรายชื่อเว็บ</DialogTitle></DialogHeader>
                        <SiteManager
                          sites={sites}
                          onAdd={data => createSiteMutation.mutate(data)}
                          onUpdate={(id, updates) => updateSiteMutation.mutate({ id, updates })}
                          onDelete={id => {
                            deleteSiteMutation.mutate(id);
                            setSelectedSiteIds(prev => prev.filter(sid => sid !== id));
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedSiteIds.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">กดปุ่ม + เพื่อเพิ่มเว็บ</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSiteIds.map((siteId, rowIndex) => {
                        const usedIds = selectedSiteIds.filter((_, i) => i !== rowIndex);
                        const availableSites = sites.filter(s => !usedIds.includes(s.id));
                        const currentSite = sites.find(s => s.id === siteId);
                        return (
                          <div key={rowIndex} className="flex items-center gap-2" data-testid={`row-site-${rowIndex}`}>
                            <span className="text-sm font-bold text-muted-foreground w-6 text-center shrink-0">{rowIndex + 1}.</span>
                            <div className="flex-1">
                              <Select
                                value={String(siteId)}
                                onValueChange={val => {
                                  setSelectedSiteIds(prev => {
                                    const next = [...prev];
                                    next[rowIndex] = parseInt(val);
                                    return next;
                                  });
                                }}
                              >
                                <SelectTrigger data-testid={`select-site-${rowIndex}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableSites.map(site => (
                                    <SelectItem key={site.id} value={String(site.id)} data-testid={`option-site-${rowIndex}-${site.id}`}>
                                      {site.name} <span className="text-muted-foreground ml-1">(Rate: {site.depositRate} | Bonus: {site.bonusPercent}%)</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {currentSite && (
                              <span className="text-xs text-muted-foreground hidden sm:block shrink-0">R:{currentSite.depositRate}</span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedSiteIds(prev => prev.filter((_, i) => i !== rowIndex))}
                              data-testid={`button-remove-row-${rowIndex}`}
                            >
                              <Minus className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      {selectedSiteIds.length} / 5 เว็บ
                      {selectedSiteIds.length >= 5 && <span className="text-primary ml-1">(เต็มแล้ว)</span>}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedSiteIds.length >= 5 || sites.filter(s => !selectedSiteIds.includes(s.id)).length === 0}
                      onClick={() => {
                        const available = sites.filter(s => !selectedSiteIds.includes(s.id));
                        if (available.length > 0) {
                          setSelectedSiteIds(prev => [...prev, available[0].id]);
                        }
                      }}
                      data-testid="button-add-row"
                    >
                      <Plus className="mr-1 h-4 w-4" /> เพิ่มเว็บ
                    </Button>
                  </div>

                  {savedConfigs.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><FolderOpen className="h-3 w-3" /> โหลดค่าที่บันทึกไว้</p>
                      <div className="flex flex-wrap gap-1">
                        {savedConfigs.map((cfg, i) => (
                          <div key={i} className="flex items-center gap-0.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const validIds = cfg.siteIds.filter(id => sites.some(s => s.id === id)).slice(0, 5);
                                setSelectedSiteIds(validIds);
                                toast({ title: `โหลด "${cfg.name}" แล้ว` });
                              }}
                              data-testid={`button-load-config-${i}`}
                            >
                              {cfg.name}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                const next = savedConfigs.filter((_, j) => j !== i);
                                setSavedConfigs(next);
                                localStorage.setItem("site-configs", JSON.stringify(next));
                                toast({ title: `ลบ "${cfg.name}" แล้ว` });
                              }}
                              data-testid={`button-delete-config-${i}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="ชื่อค่าเว็บ เช่น 'ชุดA'"
                      value={configName}
                      onChange={e => setConfigName(e.target.value)}
                      className="flex-1"
                      data-testid="input-config-name"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!configName.trim() || selectedSiteIds.length === 0}
                      onClick={() => {
                        const newConfig = { name: configName.trim(), siteIds: [...selectedSiteIds] };
                        const next = [...savedConfigs, newConfig];
                        setSavedConfigs(next);
                        localStorage.setItem("site-configs", JSON.stringify(next));
                        setConfigName("");
                        toast({ title: `บันทึก "${newConfig.name}" แล้ว (${selectedSiteIds.length} เว็บ)` });
                      }}
                      data-testid="button-save-config"
                    >
                      <BookmarkPlus className="mr-1 h-4 w-4" /> บันทึก
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {calcResults.length > 0 && (
                <Card className="border-primary/20 gold-glow">
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
                        <span className={profits.min >= 0 ? "text-emerald-400" : "text-red-400"} data-testid="text-profit-min">{Math.round(profits.min).toLocaleString()} บาท</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-1 font-bold">
                        <span>กำไรสูงสุดคาดการณ์:</span>
                        <span className="text-emerald-400" data-testid="text-profit-max">{Math.round(profits.max).toLocaleString()} บาท</span>
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

        <footer className="text-center py-6 space-y-1 border-t border-border/30 mt-8">
          <p className="text-xs text-muted-foreground" data-testid="text-credit-creative">Creative by Studio Billy Here is Melody</p>
          <p className="text-xs text-muted-foreground" data-testid="text-credit-director">Director and Producer Published by Niwat Raksanit</p>
        </footer>
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
          ? 'radial-gradient(ellipse at center, rgba(38,90,55,0.9) 0%, rgba(10,14,20,0.98) 70%)'
          : 'radial-gradient(ellipse at center, rgba(120,20,20,0.9) 0%, rgba(10,14,20,0.98) 70%)',
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
            <Trophy className="h-20 w-20 mx-auto text-amber-400 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.6))' }} />
          </div>
        )}
        <p className="text-white/90 text-2xl font-bold mb-2 tracking-wide" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.7)' }}>
          {isProfit ? "MISSION COMPLETE" : "MISSION ENDED"}
        </p>
        <p className="text-white/60 text-sm uppercase tracking-[0.3em] mb-6">
          {isProfit ? "profit secured" : "loss recorded"}
        </p>
        <div
          className="font-black tabular-nums"
          style={{
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            color: isProfit ? '#F59E0B' : '#EF4444',
            textShadow: isProfit
              ? '0 0 40px rgba(245,158,11,0.6), 0 0 80px rgba(245,158,11,0.2), 0 4px 30px rgba(0,0,0,0.8)'
              : '0 0 40px rgba(239,68,68,0.6), 0 4px 30px rgba(0,0,0,0.8)',
            animation: isProfit ? 'pulse-glow 2s ease-in-out infinite' : 'none',
          }}
          data-testid="text-celebration-profit"
        >
          {isProfit ? "+" : ""}{animatedValue.toLocaleString()}
        </div>
        <p className="text-white/80 text-2xl font-bold mt-2 tracking-wider" style={{ textShadow: '0 2px 15px rgba(0,0,0,0.7)' }}>
          THB
        </p>

        {isProfit && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${Math.random() * 6 + 2}px`,
                  height: `${Math.random() * 6 + 2}px`,
                  background: ['#F59E0B', '#D97706', '#FBBF24', '#10B981', '#6EE7B7'][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `confetti-fall ${2 + Math.random() * 3}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SiteManager({ sites, onAdd, onUpdate, onDelete }: {
  sites: Site[];
  onAdd: (data: InsertSite) => void;
  onUpdate: (id: number, updates: Partial<InsertSite>) => void;
  onDelete: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("36.5");
  const [bonus, setBonus] = useState("0");
  const [balance, setBalance] = useState("0");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editBonus, setEditBonus] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const { toast } = useToast();

  const startEdit = (site: Site) => {
    setEditingId(site.id);
    setEditName(site.name);
    setEditRate(site.depositRate);
    setEditBonus(site.bonusPercent);
    setEditBalance(site.existingBalance || "0");
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    onUpdate(editingId, { name: editName.trim(), depositRate: editRate, bonusPercent: editBonus, existingBalance: editBalance });
    setEditingId(null);
    toast({ title: "บันทึกแล้ว" });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 p-3 border rounded-md bg-card">
        <p className="text-sm font-medium flex items-center gap-1"><Plus className="h-4 w-4" /> เพิ่มเว็บใหม่</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 space-y-1"><Label className="text-xs">ชื่อเว็บ</Label><Input data-testid="input-site-name" value={name} onChange={e => setName(e.target.value)} placeholder="เช่น Fun88" /></div>
          <div className="space-y-1"><Label className="text-xs">อัตราแลก</Label><Input data-testid="input-site-rate" type="number" value={rate} onChange={e => setRate(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">โบนัส %</Label><Input data-testid="input-site-bonus" type="number" value={bonus} onChange={e => setBonus(e.target.value)} /></div>
          <div className="col-span-2 space-y-1"><Label className="text-xs">เครดิตที่มีอยู่เดิม (บาท)</Label><Input data-testid="input-site-balance" type="number" value={balance} onChange={e => setBalance(e.target.value)} /></div>
        </div>
        <Button className="w-full" onClick={() => { if (!name.trim()) return; onAdd({ name: name.trim(), depositRate: rate, bonusPercent: bonus, existingBalance: balance }); setName(""); toast({ title: "เพิ่มเว็บแล้ว" }); }} data-testid="button-add-site"><Plus className="mr-1 h-4 w-4" /> เพิ่มเว็บ</Button>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-3">เว็บทั้งหมด ({sites.length})</p>
        {sites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีเว็บ</p>
        ) : (
          <div className="space-y-2">
            {sites.map(site => (
              <div key={site.id} className="border rounded-md p-3" data-testid={`manage-site-${site.id}`}>
                {editingId === site.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2 space-y-1"><Label className="text-xs">ชื่อเว็บ</Label><Input data-testid={`edit-name-${site.id}`} value={editName} onChange={e => setEditName(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">อัตราแลก</Label><Input data-testid={`edit-rate-${site.id}`} type="number" value={editRate} onChange={e => setEditRate(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">โบนัส %</Label><Input data-testid={`edit-bonus-${site.id}`} type="number" value={editBonus} onChange={e => setEditBonus(e.target.value)} /></div>
                      <div className="col-span-2 space-y-1"><Label className="text-xs">เครดิตเดิม</Label><Input data-testid={`edit-balance-${site.id}`} type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)} /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} data-testid={`button-cancel-edit-site-${site.id}`}><X className="h-4 w-4 mr-1" /> ยกเลิก</Button>
                      <Button size="sm" onClick={saveEdit} data-testid={`button-save-site-${site.id}`}><Check className="h-4 w-4 mr-1" /> บันทึก</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{site.name}</p>
                      <p className="text-xs text-muted-foreground">Rate: {site.depositRate} | Bonus: {site.bonusPercent}% | เครดิตเดิม: {site.existingBalance || "0"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(site)} data-testid={`button-edit-site-${site.id}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm(`ลบ "${site.name}"?`)) onDelete(site.id); }} data-testid={`button-delete-site-${site.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
        <span className={`font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`} data-testid={`text-history-profit-${entry.id}`}>
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
    <Card className={isComplete ? "border-emerald-500/30 gold-glow" : ""} data-testid={`card-tracker-${site.id}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">{site.name}</CardTitle>
        {isComplete && <Trophy className="h-5 w-5 text-amber-400" />}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap justify-between gap-1 text-xs"><span>ความคืบหน้า</span><span>{Math.round(current).toLocaleString()} / {Math.round(target).toLocaleString()} บาท</span></div>
          <Progress value={progress} />
          <p className="text-[10px] text-muted-foreground">เหลือ: {Math.max(0, Math.round(target - current)).toLocaleString()} บาท ({Math.round(progress)}%)</p>
        </div>
        {isComplete ? (
          <div className="space-y-2">
            <p className="text-sm font-bold text-emerald-400 text-center">ครบเทิร์นแล้ว!</p>
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
