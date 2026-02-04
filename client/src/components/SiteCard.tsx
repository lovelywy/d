import { useState } from "react";
import { Site } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateSite, useDeleteSite } from "@/hooks/use-sites";
import { Trash2, Edit2, Save, X, Calculator, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SiteCardProps {
  site: Site;
  mode: "calculator" | "tracker";
  calculatedData?: {
    usdtAllocated: number;
    thbCredit: number;
  };
}

export function SiteCard({ site, mode, calculatedData }: SiteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: site.name,
    depositRate: String(site.depositRate),
    bonusPercent: String(site.bonusPercent)
  });
  const [betAmount, setBetAmount] = useState("");
  
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();

  const handleUpdate = async () => {
    await updateSite.mutateAsync({
      id: site.id,
      ...editForm
    });
    setIsEditing(false);
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH'; // Thai language
    // Fallback to English if Thai not supported by browser
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const handleBetUpdate = async () => {
    if (!betAmount || isNaN(Number(betAmount))) return;
    
    const newCurrent = Number(site.currentTurnover) + Number(betAmount);
    await updateSite.mutateAsync({
      id: site.id,
      currentTurnover: String(newCurrent)
    });
    
    setBetAmount("");
    
    // Calculate remaining and speak
    const target = Number(site.targetTurnover);
    const remaining = Math.max(0, target - newCurrent);
    
    if (remaining <= 0) {
      speak(`ครบเทิร์น ${site.name} แล้วจ้า!`);
    } else {
      speak(`เหลือเทิร์นเว็บ ${site.name}: ${Math.ceil(remaining)} บาท`);
    }
  };

  const current = Number(site.currentTurnover);
  const target = Number(site.targetTurnover) || 1; // prevent div by zero
  const progress = Math.min(100, (current / target) * 100);

  if (mode === "calculator") {
    return (
      <Card className="group relative overflow-hidden border-border/60 hover:border-primary/30 transition-all duration-300">
        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          {isEditing ? (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleUpdate}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteSite.mutate(site.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <CardHeader className="pb-2">
          {isEditing ? (
            <Input 
              value={editForm.name} 
              onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
              className="font-display font-bold text-lg h-9"
            />
          ) : (
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calculator className="w-5 h-5 text-primary/60" />
              {site.name}
            </CardTitle>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</p>
              {isEditing ? (
                <Input 
                  type="number"
                  value={editForm.depositRate} 
                  onChange={(e) => setEditForm(prev => ({...prev, depositRate: e.target.value}))}
                  className="h-8 mt-1"
                />
              ) : (
                <p className="text-2xl font-display font-semibold text-foreground">{site.depositRate}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bonus</p>
              {isEditing ? (
                <Input 
                  type="number"
                  value={editForm.bonusPercent} 
                  onChange={(e) => setEditForm(prev => ({...prev, bonusPercent: e.target.value}))}
                  className="h-8 mt-1"
                />
              ) : (
                <p className="text-2xl font-display font-semibold text-accent">{site.bonusPercent}%</p>
              )}
            </div>
          </div>

          {calculatedData && (
            <div className="mt-4 pt-4 border-t border-border/50 bg-secondary/20 -mx-6 px-6 pb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">USDT Alloc.</span>
                <span className="font-mono font-medium">{calculatedData.usdtAllocated.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-primary">THB Credit</span>
                <span className="font-mono font-bold text-lg text-primary">{calculatedData.thbCredit.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Tracker Mode
  return (
    <Card className={`border-l-4 ${progress >= 100 ? 'border-l-primary bg-primary/5' : 'border-l-accent'}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl">{site.name}</CardTitle>
        <div className="flex items-center gap-2">
          {progress >= 100 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground animate-in fade-in">
              Complete
            </span>
          )}
          <Target className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1.5 text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono font-medium">
                {Number(site.currentTurnover).toLocaleString()} / {Number(site.targetTurnover).toLocaleString()}
              </span>
            </div>
            <Progress value={progress} className="h-3 bg-secondary" indicatorClassName={progress >= 100 ? "bg-primary" : "bg-accent"} />
          </div>

          <div className="flex gap-2 items-end pt-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Add Bet Amount</label>
              <Input
                type="number"
                placeholder="Amount..."
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="bg-background"
                onKeyDown={(e) => e.key === 'Enter' && handleBetUpdate()}
              />
            </div>
            <Button 
              onClick={handleBetUpdate}
              disabled={updateSite.isPending || !betAmount}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              Update
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
