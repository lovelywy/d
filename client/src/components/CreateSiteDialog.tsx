import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSite } from "@/hooks/use-sites";
import { Loader2, Plus } from "lucide-react";

export function CreateSiteDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    depositRate: "",
    bonusPercent: ""
  });
  
  const createSite = useCreateSite();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSite.mutateAsync({
      name: formData.name,
      depositRate: formData.depositRate,
      bonusPercent: formData.bonusPercent,
      targetTurnover: "0",
      currentTurnover: "0",
      allocationPercent: "0",
      isActive: true
    });
    setOpen(false);
    setFormData({ name: "", depositRate: "", bonusPercent: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Add New Site
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary">Add Gambling Site</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">Site Name</Label>
            <Input
              id="name"
              placeholder="e.g. Sbobet888"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="rounded-lg border-border/50 bg-secondary/30 focus:bg-white transition-all"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate" className="text-sm font-medium text-muted-foreground">Deposit Rate</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                placeholder="35.5"
                value={formData.depositRate}
                onChange={(e) => setFormData(prev => ({ ...prev, depositRate: e.target.value }))}
                className="rounded-lg border-border/50 bg-secondary/30 focus:bg-white transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus" className="text-sm font-medium text-muted-foreground">Bonus %</Label>
              <Input
                id="bonus"
                type="number"
                step="0.1"
                placeholder="10"
                value={formData.bonusPercent}
                onChange={(e) => setFormData(prev => ({ ...prev, bonusPercent: e.target.value }))}
                className="rounded-lg border-border/50 bg-secondary/30 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button 
              type="submit" 
              disabled={createSite.isPending}
              className="rounded-lg w-full bg-gradient-to-r from-primary to-primary/80 hover:to-primary"
            >
              {createSite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Site"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
