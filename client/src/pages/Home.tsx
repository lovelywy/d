import { useState } from "react";
import { useSites, useRates, useUpdateSite, useResetTurnover } from "@/hooks/use-sites";
import { CreateSiteDialog } from "@/components/CreateSiteDialog";
import { SiteCard } from "@/components/SiteCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCcw, TrendingUp, DollarSign, Wallet, ArrowRight, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { data: sites, isLoading: sitesLoading } = useSites();
  const { refetch: fetchRate, isFetching: rateLoading } = useRates();
  const updateSite = useUpdateSite();
  const resetTurnover = useResetTurnover();
  const { toast } = useToast();

  // State
  const [totalThb, setTotalThb] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<string>("");
  const [calculationResult, setCalculationResult] = useState<{
    siteId: number;
    usdtAllocated: number;
    thbCredit: number;
  }[] | null>(null);

  const handleFetchRate = async () => {
    const { data } = await fetchRate();
    if (data?.price) {
      setExchangeRate(parseFloat(data.price).toFixed(2));
      toast({ title: "Rate Updated", description: `Latest USDT/THB: ${parseFloat(data.price).toFixed(2)}` });
    }
  };

  const handleCalculate = () => {
    if (!sites || sites.length === 0) {
      toast({ variant: "destructive", title: "No Sites", description: "Please add gambling sites first." });
      return;
    }
    if (!totalThb || !exchangeRate) {
      toast({ variant: "destructive", title: "Missing Input", description: "Please enter capital and exchange rate." });
      return;
    }

    const totalUsdt = Number(totalThb) / Number(exchangeRate);
    const splitUsdt = totalUsdt / sites.length; // Simple equal split for now

    const results = sites.map(site => {
      const siteRate = Number(site.depositRate);
      const bonus = Number(site.bonusPercent);
      const thbCredit = (splitUsdt * siteRate) * (1 + bonus / 100);
      
      return {
        siteId: site.id,
        usdtAllocated: splitUsdt,
        thbCredit
      };
    });

    setCalculationResult(results);
    toast({ title: "Calculated!", description: "Check the breakdown below." });
  };

  const handleSaveTargets = async () => {
    if (!calculationResult) return;
    
    // Update target turnover for each site based on calculated credit
    const promises = calculationResult.map(res => 
      updateSite.mutateAsync({
        id: res.siteId,
        targetTurnover: String(Math.floor(res.thbCredit)) // Usually turnover is 1x credit
      })
    );
    
    await Promise.all(promises);
    toast({ title: "Targets Saved", description: "Turnover targets updated in Tracker." });
  };

  // Derived Stats
  const totalCredits = calculationResult?.reduce((acc, curr) => acc + curr.thbCredit, 0) || 0;
  // Formula: A = Total/2. B = A * 0.95. Y = A + B. Profit = Y - Initial.
  const halfCredits = totalCredits / 2;
  const projectedReturn = halfCredits + (halfCredits * 0.95);
  const minProfit = projectedReturn - Number(totalThb || 0);
  const maxProfit = totalCredits - Number(totalThb || 0);

  if (sitesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <header className="bg-primary text-primary-foreground pt-12 pb-24 px-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-2 opacity-90">
            <TrendingUp className="w-6 h-6" />
            <span className="font-display font-medium tracking-wide">ARBITRAGE SIMULATOR</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 leading-tight">
            Financial Analytics & <br/>Turnover Tracking
          </h1>
          <p className="text-primary-foreground/80 max-w-xl text-lg">
            Calculate optimal splits, track gambling bonuses, and monitor turnover requirements in real-time.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        <Tabs defaultValue="calculator" className="space-y-8">
          <div className="flex justify-between items-center bg-background/50 backdrop-blur-sm p-1 rounded-xl w-full md:w-fit mb-6 shadow-sm border border-border/50">
            <TabsList className="bg-secondary/50 p-1 h-auto rounded-lg">
              <TabsTrigger value="calculator" className="px-6 py-2.5 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all">
                Calculator
              </TabsTrigger>
              <TabsTrigger value="tracker" className="px-6 py-2.5 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all">
                Turnover Tracker
              </TabsTrigger>
            </TabsList>
          </div>

          <AnimatePresence mode="wait">
            <TabsContent value="calculator" className="space-y-8 animate-in">
              {/* Input Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 shadow-lg border-primary/10">
                  <CardHeader>
                    <CardTitle>Capital & Rate</CardTitle>
                    <CardDescription>Enter your initial investment parameters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Total THB Capital
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 50000"
                        value={totalThb}
                        onChange={(e) => setTotalThb(e.target.value)}
                        className="text-lg font-mono"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> USDT/THB Rate
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="34.50"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(e.target.value)}
                          className="text-lg font-mono"
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={handleFetchRate}
                          disabled={rateLoading}
                          className="shrink-0 aspect-square hover:bg-secondary hover:text-primary transition-colors"
                        >
                          {rateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button 
                      onClick={handleCalculate} 
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-primary/25 h-12 text-base font-semibold"
                    >
                      Calculate Split
                    </Button>
                  </CardContent>
                </Card>

                {/* Stats Preview */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="bg-gradient-to-br from-white to-secondary/30 border-none shadow-md">
                    <CardContent className="p-6 flex flex-col justify-between h-full">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Estimated Min Profit</p>
                        <h3 className={`text-3xl font-display font-bold ${minProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {minProfit ? minProfit.toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : "—"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2 opacity-80">Assuming 50/50 outcome with commission loss</p>
                      </div>
                      <div className="mt-4 p-2 bg-white/50 rounded-lg text-xs font-mono text-muted-foreground border border-black/5">
                        Formula: Capital - ((Credits/2) + (Credits/2 * 0.95))
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-white to-secondary/30 border-none shadow-md">
                    <CardContent className="p-6 flex flex-col justify-between h-full">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Theoretical Max Profit</p>
                        <h3 className="text-3xl font-display font-bold text-accent">
                          {maxProfit ? maxProfit.toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : "—"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2 opacity-80">Assuming 100% win rate (highly unlikely)</p>
                      </div>
                      <div className="mt-4 flex items-center justify-end">
                        {calculationResult && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleSaveTargets}
                            className="text-xs gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary"
                          >
                            Save Targets <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator className="bg-border/60" />

              {/* Sites List */}
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-display font-bold">Sites & Allocation</h2>
                    <p className="text-muted-foreground">Manage your portfolio and see the split breakdown</p>
                  </div>
                  <CreateSiteDialog />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sites?.map((site) => (
                    <motion.div 
                      key={site.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <SiteCard 
                        site={site} 
                        mode="calculator" 
                        calculatedData={calculationResult?.find(r => r.siteId === site.id)}
                      />
                    </motion.div>
                  ))}
                  
                  {(!sites || sites.length === 0) && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-xl bg-secondary/10">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Wallet className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium">No sites added yet</h3>
                      <p className="text-muted-foreground max-w-sm mt-1 mb-4">Add gambling sites to start calculating your arbitrage opportunities.</p>
                      <CreateSiteDialog />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tracker" className="space-y-8 animate-in">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-display font-bold">Turnover Tracker</h2>
                  <p className="text-muted-foreground">Monitor progress and get voice alerts</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => resetTurnover.mutate()}
                  disabled={resetTurnover.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sites?.map((site) => (
                  <motion.div 
                    key={site.id}
                    layout
                  >
                    <SiteCard site={site} mode="tracker" />
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </main>
    </div>
  );
}
