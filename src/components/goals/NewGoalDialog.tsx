import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { StoreRow } from "@/contexts/StoreFilterContext";
import {
  fetchSalesmenForStore,
  upsertSalesmanTargets,
  upsertStoreTargets,
} from "@/lib/performance-data";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stores: StoreRow[]; // from StoreFilterContext allStores
};

export default function NewGoalDialog({ open, onOpenChange, stores }: Props) {
  const { toast } = useToast();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  // STORE TARGETS
  const [selectedStoreCodes, setSelectedStoreCodes] = useState<string[]>([]);
  const storeRows = useMemo(() => {
    const set = new Set(selectedStoreCodes);
    return stores.filter((s) => set.has(s.code));
  }, [stores, selectedStoreCodes]);

  const [storeTargets, setStoreTargets] = useState<Record<string, string>>({});

  // SALESMAN TARGETS
  const [salesStoreCode, setSalesStoreCode] = useState<string>("");
  const [salesmen, setSalesmen] = useState<
    { salesman_no: string; salesman_name: string }[]
  >([]);
  const [salesmanTargets, setSalesmanTargets] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    if (!open) return;

    // default select all stores on first open (nice UX)
    if (selectedStoreCodes.length === 0 && stores.length) {
      setSelectedStoreCodes(stores.map((s) => s.code));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    let alive = true;

    async function loadSalesmen() {
      if (!salesStoreCode) {
        setSalesmen([]);
        setSalesmanTargets({});
        return;
      }
      try {
        const list = await fetchSalesmenForStore(salesStoreCode);
        if (!alive) return;
        setSalesmen(list);
        setSalesmanTargets({});
      } catch (e: any) {
        if (!alive) return;
        toast({
          title: "Failed to load salesmen",
          description: e.message,
          variant: "destructive",
        });
      }
    }

    loadSalesmen();
    return () => {
      alive = false;
    };
  }, [salesStoreCode, toast]);

  function toggleStore(code: string) {
    setSelectedStoreCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  }

  async function saveStoreTargets() {
    try {
      const rows = selectedStoreCodes.map((store_code) => ({
        target_date: date,
        store_code,
        target_amount: Number(storeTargets[store_code] || 0),
      }));

      const res = await upsertStoreTargets(rows);

      toast({
        title: "Store targets saved ✅",
        description: `Saved ${res.count} store targets for ${date}`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  async function saveSalesmanTargets() {
    try {
      if (!salesStoreCode) {
        toast({ title: "Select a store first", variant: "destructive" });
        return;
      }

      const rows = salesmen.map((s) => ({
        target_date: date,
        store_code: salesStoreCode,
        salesman_no: s.salesman_no,
        target_amount: Number(salesmanTargets[s.salesman_no] || 0),
      }));

      const res = await upsertSalesmanTargets(rows);

      toast({
        title: "Salesman targets saved ✅",
        description: `Saved ${res.count} salesman targets for ${salesStoreCode} on ${date}`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ✅ Make dialog smaller + height-limited */}
      <DialogContent className="w-[92vw] max-w-2xl p-0 overflow-hidden">
        {/* ✅ Sticky header */}
        <div className="p-6 border-b bg-background sticky top-0 z-10">
          <DialogHeader>
            <DialogTitle>New Goal</DialogTitle>
          </DialogHeader>

          {/* Date */}
          <div className="flex items-center gap-3 mt-4">
            <div className="text-sm text-muted-foreground w-24">Target date</div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-52"
            />
          </div>

          <Tabs defaultValue="store" className="mt-4">
            <TabsList>
              <TabsTrigger value="store">Store Targets</TabsTrigger>
              <TabsTrigger value="salesman">Salesman Targets</TabsTrigger>
            </TabsList>

            {/* ✅ Scrollable body: max height based on viewport */}
            <div className="mt-4 max-h-[65vh] overflow-y-auto px-0 pr-2">
              {/* STORE TARGETS */}
              <TabsContent value="store" className="space-y-4 mt-0">
                <div className="text-sm text-muted-foreground">
                  Select stores and enter target amount (₹). Saving again will update (upsert).
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-auto border rounded-md p-3">
                  {stores.map((s) => (
                    <label key={s.code} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedStoreCodes.includes(s.code)}
                        onChange={() => toggleStore(s.code)}
                      />
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">({s.code})</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  {storeRows.map((s) => (
                    <div
                      key={s.code}
                      className="flex items-center justify-between border rounded-md p-3"
                    >
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.code}</div>
                      </div>

                      <div className="w-52">
                        <Input
                          inputMode="numeric"
                          placeholder="Target amount (₹)"
                          value={storeTargets[s.code] ?? ""}
                          onChange={(e) =>
                            setStoreTargets((p) => ({ ...p, [s.code]: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* SALESMAN TARGETS */}
              <TabsContent value="salesman" className="space-y-4 mt-0">
                <div className="text-sm text-muted-foreground">
                  Pick a store → we’ll load its salesmen list → enter daily targets (₹).
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground w-24">Store</div>
                  <select
                    className="h-10 border rounded-md px-3 text-sm w-72 bg-background"
                    value={salesStoreCode}
                    onChange={(e) => setSalesStoreCode(e.target.value)}
                  >
                    <option value="">Select store</option>
                    {stores.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  {!salesStoreCode ? (
                    <div className="text-sm text-muted-foreground">
                      Select a store to continue.
                    </div>
                  ) : salesmen.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No salesmen found for this store in sales data yet.
                    </div>
                  ) : (
                    salesmen.map((s) => (
                      <div
                        key={s.salesman_no}
                        className="flex items-center justify-between border rounded-md p-3"
                      >
                        <div>
                          <div className="font-medium">{s.salesman_name}</div>
                          <div className="text-xs text-muted-foreground">
                            #{s.salesman_no}
                          </div>
                        </div>

                        <div className="w-52">
                          <Input
                            inputMode="numeric"
                            placeholder="Target amount (₹)"
                            value={salesmanTargets[s.salesman_no] ?? ""}
                            onChange={(e) =>
                              setSalesmanTargets((p) => ({
                                ...p,
                                [s.salesman_no]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </div>

            {/* ✅ Sticky footer buttons */}
            <div className="border-t bg-background p-4 mt-4 flex justify-end gap-2 sticky bottom-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              {/* Show correct save button depending on tab */}
              <TabsContent value="store" className="m-0">
                <Button onClick={saveStoreTargets}>Save store targets</Button>
              </TabsContent>

              <TabsContent value="salesman" className="m-0">
                <Button onClick={saveSalesmanTargets} disabled={!salesStoreCode}>
                  Save salesman targets
                </Button>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}