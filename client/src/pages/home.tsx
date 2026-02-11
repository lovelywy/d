
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { Calculator, TrendingUp, RefreshCcw, Plus, Minus, Trash2, RotateCcw, Trophy, History as HistoryIcon, Pencil, Save, X, Settings, Check, BookmarkPlus, FolderOpen, Home as HomeIcon } from "lucide-react";
import type { Site, InsertSite, History } from "@shared/schema";
import jun88Logo from "@assets/1770526630864_1770526755572.jpg";
import dk7Logo from "@assets/logo20220909053526986_1770746907226.png";
import jdbaaLogo from "@assets/Screenshot_20260208_151738_1770538716395.jpg";
import ubet89Logo from "@assets/AnyConv.com__Ubet89_แนวนอน_1770746850193.webp";
import mvp999Logo from "@assets/MVP999-6-1_1770746907268.webp";
import sbfLogo from "@assets/Picture.3_(8)_1770746907279.webp";
import huc99Logo from "@assets/Picture.3_(6)_1770746907246.webp";
import henghengLogo from "@assets/images_(21)_1770538479358.jpeg";
import pay69Logo from "@assets/Picture.3_(7)_1770746907235.webp";
import h25Logo from "@assets/202601020247582246723_1770742305009.webp";
import logo239Logo from "@assets/logo20250509140551519_1770746907215.png";
import logo2066Logo from "@assets/202510120357159802355_(1)_1770746907189.png";
import z16Logo from "@assets/202512010252497383049_(1)_1770746907204.gif";
import ysl99Logo from "@assets/logo_(2)_1770746907176.png";
import kc9Logo from "@assets/logo20250513054304358_(1)_1770746907160.png";
import y568Logo from "@assets/202511210902588998035_1770746907290.gif";
import m98Logo from "@assets/l20220608030750449_1770746907302.png";
import dollcaraLogo from "@assets/1770782231327_1770782391291.gif";
import footerBanner from "@assets/1770786318358_1770786389453.gif";

const SITE_LOGOS: Record<string, string> = {
  "jun88": jun88Logo,
  "dk7": dk7Logo,
  "jdbaa": jdbaaLogo,
  "ubet89": ubet89Logo,
  "mvp999": mvp999Logo,
  "sbf": sbfLogo,
  "huc99": huc99Logo,
  "เฮงเฮง": henghengLogo,
  "hengheng": henghengLogo,
  "pay69": pay69Logo,
  "h25": h25Logo,
  "239": logo239Logo,
  "2066": logo2066Logo,
  "z16": z16Logo,
  "ysl99": ysl99Logo,
  "kc9": kc9Logo,
  "y568": y568Logo,
  "m98": m98Logo,
};

function getSiteLogo(name: string): string | null {
  const key = name.toLowerCase().replace(/\s+/g, "");
  for (const [k, v] of Object.entries(SITE_LOGOS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

function SiteLogo({ name, className = "h-6 w-auto" }: { name: string; className?: string }) {
  const logo = getSiteLogo(name);
  if (!logo) return null;
  return <img src={logo} alt={name} className={`${className} rounded-sm object-contain`} />;
}

export default function App() {
  const { toast } = useToast();
  const [totalUsdtInput, setTotalUsdtInput] = useState<string>(() => {
    try { return localStorage.getItem("last-usdt") || "300"; } catch { return "300"; }
  });
  const [exchangeRate, setExchangeRate] = useState<string>(() => {
    try { return localStorage.getItem("last-rate") || "35.5"; } catch { return "35.5"; }
  });
  const [calcResults, setCalcResults] = useState<any[]>([]);
  const [profits, setProfits] = useState({ min: 0, max: 0, minPct: 0, maxPct: 0 });
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>(() => {
    try { const s = localStorage.getItem("last-sites"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState("calculator");
  const [celebration, setCelebration] = useState<{ show: boolean; profit: number; isProfit: boolean; profitPct: number; capitalThb: number; siteWithdrawals: { name: string; amount: number }[] } | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [savedConfigs, setSavedConfigs] = useState<{ name: string; siteIds: number[] }[]>([]);
  const [configName, setConfigName] = useState("");
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [calcAnimation, setCalcAnimation] = useState<{ show: boolean; sites: string[]; results: any[] | null; profits: { min: number; max: number; minPct: number; maxPct: number } | null; numSites: number } | null>(null);

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
      setProfits({ min: 0, max: 0, minPct: 0, maxPct: 0 });
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

    const totalCredits = results.reduce((sum, res) => sum + res.totalCreditWithBonus, 0);
    const A = totalCredits / 2;
    const B = A * 0.95;
    const Y = A + B;
    const minProfitValue = Y - totalCapitalThb;
    const maxProfitValue = totalCredits - totalCapitalThb;
    const minPct = totalCapitalThb > 0 ? (minProfitValue / totalCapitalThb) * 100 : 0;
    const maxPct = totalCapitalThb > 0 ? (maxProfitValue / totalCapitalThb) * 100 : 0;

    if (withVoice) {
      setCalcAnimation({
        show: true,
        sites: selectedSites.map(s => s.name),
        results,
        profits: { min: minProfitValue, max: maxProfitValue, minPct, maxPct },
        numSites: selectedSites.length,
      });

      setCalcResults(results);
      setProfits({ min: minProfitValue, max: maxProfitValue, minPct, maxPct });
    } else {
      setCalcResults(results);
      setProfits({ min: minProfitValue, max: maxProfitValue, minPct, maxPct });
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
    const profitPct = totalCapitalThb > 0 ? (finalProfit / totalCapitalThb) * 100 : 0;

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
    const siteWithdrawals = trackerSites.map(s => ({ name: s.name, amount: parseFloat(s.remainingBalance || "0") }));
    setCelebration({ show: true, profit: finalProfit, isProfit, profitPct, capitalThb: totalCapitalThb, siteWithdrawals });
    setSignatureName("");
  };

  const handleCelebrationDismiss = async () => {
    setCelebration(null);
    try {
      await resetAllMutation.mutateAsync();
    } catch (_) {}
    setActiveTab("history");
  };

  return (
    <div className="min-h-screen bg-background subtle-grid p-4 md:p-8">
      {celebration?.show && (
        <CelebrationOverlay
          profit={celebration.profit}
          isProfit={celebration.isProfit}
          profitPct={celebration.profitPct}
          capitalThb={celebration.capitalThb}
          siteWithdrawals={celebration.siteWithdrawals}
          signatureName={signatureName}
          setSignatureName={setSignatureName}
          onDismiss={handleCelebrationDismiss}
        />
      )}
      {calcAnimation?.show && (
        <CalcAnimationOverlay
          siteNames={calcAnimation.sites}
          results={calcAnimation.results}
          profits={calcAnimation.profits}
          onVideoEnd={() => {
            if (calcAnimation?.profits) {
              const avgPct = ((calcAnimation.profits.minPct + calcAnimation.profits.maxPct) / 2).toFixed(1);
              speak(`วาวาคิดให้นะ ฝาก ${calcAnimation.numSites} เว็บ ด้านล่างนี้เลย กำไรขั้นต่ำ ${Math.round(calcAnimation.profits.min)} บาท สูงสุด ${Math.round(calcAnimation.profits.max)} บาท เฉลี่ยประมาณ ${avgPct} เปอร์เซ็นต์ เลยนะคะ`);
            }
          }}
          onDismiss={async () => {
            setCalcAnimation(null);
            if (calcResults.length > 0) {
              for (const res of calcResults) {
                await updateSiteMutation.mutateAsync({
                  id: res.id,
                  updates: { targetTurnover: res.totalTarget.toString(), currentTurnover: "0", remainingBalance: null }
                });
              }
              setActiveTab("tracker");
              setTimeout(() => {
                speak("มาทำเทิร์นให้ครบกันเลยค่ะ");
              }, 500);
            }
          }}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <header className="relative py-1" data-testid="img-logo">
          <img src={dollcaraLogo} alt="Dollcara Mission by Vava" className="w-full h-auto object-contain" />
          <div className="absolute top-1 right-1">
            <Button variant="outline" size="icon" className="flex-shrink-0" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sites"] })} data-testid="button-refresh">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
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
                  <Button variant="outline" onClick={() => { setCalcResults([]); setProfits({ min: 0, max: 0, minPct: 0, maxPct: 0 }); }} data-testid="button-clear-calc">ล้าง</Button>
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
                                      <span className="flex items-center gap-2">
                                        <SiteLogo name={site.name} className="h-5 w-auto max-w-[60px]" />
                                        <span>{site.name}</span>
                                        <span className="text-muted-foreground text-[10px]">(R:{site.depositRate} B:{site.bonusPercent}%)</span>
                                      </span>
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
                          <span className="font-medium flex items-center gap-2"><SiteLogo name={res.name} className="h-6 w-auto max-w-[70px]" />{res.name}</span>
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
                        <span className={profits.min >= 0 ? "text-emerald-400" : "text-red-400"} data-testid="text-profit-min">{profits.minPct.toFixed(1)}% ({Math.round(profits.min).toLocaleString()} บาท)</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-1 font-bold">
                        <span>กำไรสูงสุดคาดการณ์:</span>
                        <span className="text-emerald-400" data-testid="text-profit-max">{profits.maxPct.toFixed(1)}% ({Math.round(profits.max).toLocaleString()} บาท)</span>
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
                      <div key={s.id} className="flex flex-wrap justify-between items-center gap-1">
                        <span className="flex items-center gap-1.5"><SiteLogo name={s.name} className="h-4 w-auto max-w-[50px]" />{s.name}:</span>
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

        <footer className="mt-4" data-testid="footer-banner">
          <img src={footerBanner} alt="Dollcara Footer" className="w-full h-auto object-contain" />
        </footer>
      </div>

      {activeTab !== "calculator" && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-[100] rounded-full shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            color: '#000',
            width: '48px',
            height: '48px',
          }}
          onClick={() => {
            setActiveTab("calculator");
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          data-testid="button-float-home"
        >
          <HomeIcon className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}

function CalcAnimationOverlay({ siteNames, results, profits, onVideoEnd, onDismiss }: {
  siteNames: string[];
  results: any[] | null;
  profits: { min: number; max: number; minPct: number; maxPct: number } | null;
  onVideoEnd: () => void;
  onDismiss: () => void;
}) {
  const [stage, setStage] = useState<'video' | 'animation'>('video');
  const [phase, setPhase] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const [rollingNumbers, setRollingNumbers] = useState<number[]>([]);
  const [revealedSites, setRevealedSites] = useState<number>(0);
  const [canDismiss, setCanDismiss] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setOpacity(1);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setStage('animation');
    onVideoEnd();

    rollRef.current = setInterval(() => {
      setRollingNumbers(Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)));
    }, 50);

    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => {
      setPhase(3);
      if (rollRef.current) clearInterval(rollRef.current);
    }, 2400);
    const t4 = setTimeout(() => setCanDismiss(true), 3200);

    const siteTimers: ReturnType<typeof setTimeout>[] = [];
    siteNames.forEach((_, i) => {
      siteTimers.push(setTimeout(() => setRevealedSites(i + 1), 1400 + i * 250));
    });

    timersRef.current = [t1, t2, t3, t4, ...siteTimers];
  }, [siteNames, onVideoEnd]);

  useEffect(() => {
    return () => {
      if (rollRef.current) clearInterval(rollRef.current);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (!canDismiss || dismissing) return;
    setDismissing(true);
    setOpacity(0);
    setTimeout(() => onDismiss(), 500);
  }, [canDismiss, dismissing, onDismiss]);

  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
  }));

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center overflow-y-auto"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(20,15,5,0.95) 0%, rgba(5,5,10,0.99) 80%)',
        opacity,
        transition: 'opacity 0.5s ease-in-out',
        cursor: canDismiss ? 'pointer' : 'default',
      }}
      onClick={handleDismiss}
      data-testid="calc-animation-overlay"
    >
      {stage === 'animation' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <video
            src="/calc-bg.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.08, filter: 'sepia(1) hue-rotate(10deg) saturate(2) brightness(0.8)' }}
          />
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.x}%`,
                top: `${p.y}%`,
                background: 'radial-gradient(circle, #F59E0B, #D97706)',
                boxShadow: '0 0 6px rgba(245,158,11,0.5)',
                animation: `calc-particle ${p.duration}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {stage === 'animation' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: phase >= 1
            ? 'conic-gradient(from 0deg, transparent, rgba(245,158,11,0.05), transparent, rgba(245,158,11,0.08), transparent)'
            : 'none',
          animation: phase >= 1 ? 'calc-spin 3s linear infinite' : 'none',
        }} />
      )}

      {stage === 'video' && (
        <div className="text-center relative z-10 px-4 w-full max-w-lg">
          <video
            ref={videoRef}
            src="/calc-animation.mp4"
            autoPlay
            playsInline
            onEnded={handleVideoEnd}
            className="w-full rounded-lg"
            style={{
              boxShadow: '0 0 40px rgba(245,158,11,0.2)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
            data-testid="calc-video"
          />
        </div>
      )}

      {stage === 'animation' && (
        <div className="text-center relative z-10 px-4 py-5 max-w-lg w-full" style={{ animation: 'calc-fade-in 0.5s ease-out' }}>
          <div
            className="mb-3 transition-all duration-500"
            style={{
              transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(20px)',
              opacity: phase >= 1 ? 1 : 0,
            }}
          >
            <Calculator
              className="h-12 w-12 mx-auto mb-2"
              style={{
                color: '#F59E0B',
                filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.6))',
                animation: phase >= 1 && phase < 3 ? 'calc-pulse 0.6s ease-in-out infinite' : 'none',
              }}
            />
            <p className="text-amber-400/90 text-lg font-bold tracking-[0.15em]"
              style={{ textShadow: '0 0 20px rgba(245,158,11,0.4)' }}>
              {phase < 3 ? 'คำนวณยอดฝากแต่ละเว็บ' : 'คำนวณเสร็จสิ้น'}
            </p>
          </div>

          {phase >= 1 && phase < 3 && (
            <div className="flex justify-center gap-1.5 mb-4" style={{ animation: 'calc-fade-in 0.3s ease-out' }}>
              {rollingNumbers.map((n, i) => (
                <span
                  key={i}
                  className="inline-block w-8 h-10 leading-10 text-center font-mono text-lg font-bold rounded"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    color: '#FBBF24',
                    textShadow: '0 0 10px rgba(251,191,36,0.5)',
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
          )}

          {phase >= 2 && (
            <div className="space-y-2 mb-4" style={{ animation: 'calc-fade-in 0.4s ease-out' }}>
              {siteNames.slice(0, revealedSites).map((name, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md"
                  style={{
                    animation: 'calc-slide-in 0.3s ease-out',
                    color: 'rgba(255,255,255,0.85)',
                    background: 'rgba(245,158,11,0.05)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                    <SiteLogo name={name} className="h-5 w-5" />
                    <span className="font-semibold truncate max-w-[80px]">{name}</span>
                  </div>
                  {results && results[i] && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-emerald-400 font-bold text-sm">
                        {results[i].usdtUsed.toFixed(1)} USDT
                      </span>
                      <span className="text-amber-400 font-bold text-sm">
                        {Math.round(results[i].depositedThb).toLocaleString()} THB
                      </span>
                      <Check className="h-4 w-4 text-emerald-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {phase >= 3 && profits && (
            <div style={{ animation: 'calc-scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <div className="rounded-lg px-6 py-3 inline-block"
                style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  boxShadow: '0 0 40px rgba(245,158,11,0.1)',
                }}>
                <p className="text-amber-400/70 text-xs tracking-[0.15em] mb-1">กำไรคาดการณ์ที่จะได้</p>
                <p className="font-black text-2xl md:text-3xl text-amber-400"
                  style={{ textShadow: '0 0 30px rgba(245,158,11,0.5)' }}>
                  {profits.minPct.toFixed(1)}% - {profits.maxPct.toFixed(1)}%
                </p>
                <p className="text-amber-400/80 text-xs mt-0.5">({Math.round(profits.min).toLocaleString()} - {Math.round(profits.max).toLocaleString()} THB)</p>
              </div>
            </div>
          )}

          {canDismiss && (
            <p className="text-white/50 text-xs mt-4 tracking-wider"
              style={{ animation: 'calc-dot-bounce 2s ease-in-out infinite' }}>
              แตะหน้าจอเพื่อดำเนินการต่อ
            </p>
          )}

          {!canDismiss && phase >= 1 && (
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: phase < 3 ? '#F59E0B' : '#10B981',
                    animation: `calc-dot-bounce 1s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                    boxShadow: `0 0 8px ${phase < 3 ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)'}`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CelebrationOverlay({ profit, isProfit, profitPct, capitalThb, siteWithdrawals, signatureName, setSignatureName, onDismiss }: {
  profit: number;
  isProfit: boolean;
  profitPct: number;
  capitalThb: number;
  siteWithdrawals: { name: string; amount: number }[];
  signatureName: string;
  setSignatureName: (v: string) => void;
  onDismiss: () => void;
}) {
  const safeProfitVal = isNaN(profit) ? 0 : Math.round(profit);
  const safeCapital = isNaN(capitalThb) ? 0 : Math.round(capitalThb);
  const safeSiteWithdrawals = useMemo(() => siteWithdrawals.map(sw => ({ name: sw.name, amount: isNaN(sw.amount) ? 0 : sw.amount })), [siteWithdrawals]);
  const totalWithdrawal = Math.round(safeSiteWithdrawals.reduce((s, w) => s + w.amount, 0));

  const [stage, setStage] = useState<'playing' | 'chill' | 'sign' | 'done'>('playing');
  const [canTap, setCanTap] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasTriggeredRef = useRef(false);
  const bgAudioRef = useRef<{ pause: () => void } | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const coinParticles = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i,
    width: 4 + Math.random() * 8,
    left: Math.random() * 100,
    topOffset: 10 + Math.random() * 20,
    isGold: Math.random() > 0.5,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 2,
    opacity: 0.6 + Math.random() * 0.4,
  })), []);

  const speakLocal = useCallback((text: string): SpeechSynthesisUtterance => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "th-TH";
    u.rate = 0.9;
    const voices = synth.getVoices();
    const thVoice = voices.find(v => v.lang.startsWith("th"));
    if (thVoice) u.voice = thVoice;
    synth.speak(u);
    return u;
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      timersRef.current.forEach(clearTimeout);
      if (bgAudioRef.current) { bgAudioRef.current.pause(); bgAudioRef.current = null; }
    };
  }, []);

  const startChillAudio = useCallback(() => {
    try {
      const ctx = new AudioContext();
      let stopped = false;

      const createLoop = () => {
        if (stopped) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.015, ctx.currentTime + 10);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 10);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(420, ctx.currentTime);
        gain2.gain.setValueAtTime(0.02, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.008, ctx.currentTime + 10);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 10);

        osc.onended = () => { if (!stopped) createLoop(); };
      };
      createLoop();

      bgAudioRef.current = { pause: () => { stopped = true; try { ctx.close(); } catch(_){} } };
    } catch (_) {}
  }, []);

  const handleVideoFirstLoop = useCallback(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.loop = true;
      videoRef.current.play().catch(() => {});
    }

    let voiceText: string;
    const pctText = `${Math.abs(profitPct).toFixed(1)} เปอร์เซ็นต์`;
    if (!isProfit) {
      voiceText = `ภารกิจเสร็จสิ้นค่ะ ทุนตั้งต้น ${safeCapital} บาท ถอนได้ ${totalWithdrawal} บาท ขาดทุน ${Math.abs(safeProfitVal)} บาท คิดเป็น ${pctText} สู้ใหม่รอบหน้านะคะ`;
    } else if (safeProfitVal <= 5000) {
      voiceText = `เย้! ภารกิจสำเร็จค่ะ ทุนตั้งต้น ${safeCapital} บาท ถอนได้ ${totalWithdrawal} บาท กำไร ${safeProfitVal} บาท คิดเป็น ${pctText} ดีใจด้วยนะคะ!`;
    } else if (safeProfitVal <= 20000) {
      voiceText = `ว้าว! ภารกิจสำเร็จค่ะ ทุนตั้งต้น ${safeCapital} บาท ถอนได้ ${totalWithdrawal} บาท กำไร ${safeProfitVal} บาท คิดเป็น ${pctText} สุดยอดเลยค่ะ!`;
    } else {
      voiceText = `เฮ! เฮ! เฮ! ภารกิจสำเร็จค่ะ ทุนตั้งต้น ${safeCapital} บาท ถอนได้ ${totalWithdrawal} บาท กำไร ${safeProfitVal} บาท คิดเป็น ${pctText} มหาศาลเลยค่ะ!`;
    }

    const utterance = speakLocal(voiceText);
    utterance.onend = () => {
      setStage('chill');
      setCanTap(true);
      startChillAudio();
    };
  }, [isProfit, safeProfitVal, safeCapital, totalWithdrawal, profitPct, speakLocal, startChillAudio]);

  const handleTapScreen = useCallback(() => {
    if (!canTap || stage !== 'chill') return;
    if (bgAudioRef.current) { bgAudioRef.current.pause(); bgAudioRef.current = null; }
    setStage('sign');
  }, [canTap, stage]);

  const handleSign = useCallback(() => {
    if (!signatureName.trim()) return;
    setStage('done');
    speakLocal("เฮ้! สุดยอดเลยค่ะ!");
    const t = setTimeout(() => onDismiss(), 2500);
    timersRef.current.push(t);
  }, [signatureName, speakLocal, onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[9999]"
      onClick={stage === 'chill' ? handleTapScreen : undefined}
      style={{ cursor: stage === 'chill' ? 'pointer' : 'default' }}
      data-testid="celebration-overlay"
    >
      <video
        ref={videoRef}
        src="/celebration.mp4"
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        onEnded={() => {
          if (!hasTriggeredRef.current) {
            handleVideoFirstLoop();
          }
        }}
        style={{ opacity: 0.7, filter: 'brightness(0.45) saturate(1.3)' }}
      />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {coinParticles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: `${p.width}px`,
              height: `${p.width}px`,
              left: `${p.left}%`,
              top: `-${p.topOffset}px`,
              background: `radial-gradient(circle, ${p.isGold ? '#F59E0B' : '#FBBF24'} 0%, transparent 70%)`,
              animation: `coin-fall ${p.duration}s linear ${p.delay}s infinite`,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.6) 100%)' }}>
        {stage !== 'sign' && stage !== 'done' && (
          <div className="text-center" style={{ animation: 'calc-scale-in 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}>
            {isProfit && (
              <div className="mb-4" style={{ animation: 'bounce 1s infinite' }}>
                <Trophy className="h-14 w-14 mx-auto text-amber-400" style={{ filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.7))' }} />
              </div>
            )}
            <p className="text-white/90 text-lg font-bold tracking-wide mb-1" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
              {isProfit ? "MISSION COMPLETE" : "MISSION ENDED"}
            </p>

            <div className="mt-4 rounded-xl px-6 py-5 mx-auto" style={{
              background: 'rgba(0,0,0,0.55)',
              border: `1px solid ${isProfit ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
              boxShadow: isProfit ? '0 0 80px rgba(245,158,11,0.15)' : '0 0 80px rgba(239,68,68,0.15)',
              backdropFilter: 'blur(12px)',
              minWidth: '280px',
              maxWidth: '90vw',
            }}>
              <div className="flex items-center justify-between gap-4 mb-2 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-white/40 text-xs">ทุนตั้งต้น</span>
                <span className="text-white/80 text-base font-bold tabular-nums" data-testid="text-capital">
                  {safeCapital.toLocaleString()} <span className="text-[10px] text-white/40">THB</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 mb-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-white/40 text-xs">ยอดถอนรวม</span>
                <span className="text-white/80 text-base font-bold tabular-nums" data-testid="text-total-withdraw">
                  {totalWithdrawal.toLocaleString()} <span className="text-[10px] text-white/40">THB</span>
                </span>
              </div>

              <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] text-center mb-1">
                {isProfit ? "กำไรสุทธิ" : "ขาดทุน"}
              </p>
              <div
                className="font-black tabular-nums text-center"
                style={{
                  fontSize: 'clamp(2.5rem, 10vw, 5rem)',
                  color: isProfit ? '#F59E0B' : '#EF4444',
                  textShadow: isProfit
                    ? '0 0 40px rgba(245,158,11,0.6), 0 0 80px rgba(245,158,11,0.3)'
                    : '0 0 40px rgba(239,68,68,0.6)',
                  lineHeight: 1.1,
                  animation: isProfit ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                }}
                data-testid="text-celebration-profit"
              >
                {isProfit ? "+" : ""}{safeProfitVal.toLocaleString()}
              </div>
              <p className="text-white/70 text-sm font-bold tracking-wider text-center">THB</p>
              <div className="mt-2 text-center">
                <span className="inline-block px-4 py-1 rounded-full text-sm font-bold" style={{
                  background: isProfit ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${isProfit ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  color: isProfit ? '#FBBF24' : '#F87171',
                }}>
                  {isProfit ? "+" : ""}{profitPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {canTap && stage === 'chill' && (
              <p className="text-white/40 text-xs mt-6 tracking-wider" style={{ animation: 'calc-dot-bounce 2s ease-in-out infinite' }}>
                แตะหน้าจอเพื่อดำเนินการต่อ
              </p>
            )}

            {stage === 'playing' && (
              <p className="text-white/20 text-xs mt-6 tracking-wider" style={{ animation: 'calc-dot-bounce 2s ease-in-out infinite' }}>
                กำลังประกาศผล...
              </p>
            )}
          </div>
        )}

        {stage === 'sign' && (
          <div className="text-center w-80 max-w-[90vw]" style={{ animation: 'calc-scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <p className="text-white/90 text-lg font-bold mb-4" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
              บันทึกภารกิจ
            </p>
            <div className="rounded-lg px-5 py-4 mb-4" style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(245,158,11,0.2)',
              backdropFilter: 'blur(10px)',
            }}>
              <div className="text-center mb-3">
                <span className="text-amber-400 text-2xl font-black tabular-nums">{isProfit ? "+" : ""}{safeProfitVal.toLocaleString()}</span>
                <span className="text-white/50 text-sm ml-1">THB</span>
                <span className="ml-2 text-sm font-bold" style={{ color: isProfit ? '#FBBF24' : '#F87171' }}>
                  ({isProfit ? "+" : ""}{profitPct.toFixed(1)}%)
                </span>
              </div>
              <div className="space-y-1 text-xs">
                {safeSiteWithdrawals.map((sw, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-amber-400/60 truncate" style={{ maxWidth: '120px' }}>{sw.name}</span>
                    <span className="text-white/60 tabular-nums">{sw.amount.toLocaleString()} THB</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-amber-400/80 text-xs tracking-wider mb-2">ลงชื่อเพื่อจบภารกิจ</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="พิมพ์ชื่อของคุณ..."
                className="flex-1 bg-black/50 border border-amber-400/30 rounded-md px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-400/60"
                data-testid="input-signature"
              />
              <button
                onClick={handleSign}
                disabled={!signatureName.trim()}
                className="px-4 py-2 rounded-md text-sm font-bold disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#000' }}
                data-testid="button-sign-mission"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="text-center" style={{ animation: 'calc-scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <p className="text-amber-400 text-xl font-bold tracking-wider">
              ลงชื่อโดย: {signatureName}
            </p>
            <p className="text-white/40 text-xs mt-2">กำลังบันทึกและรีเซ็ต...</p>
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
        <CardTitle className="text-lg flex items-center gap-2">
          <SiteLogo name={site.name} className="h-8 w-auto max-w-[80px]" />
          {site.name}
        </CardTitle>
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
