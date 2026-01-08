import { Store, ChevronDown, X } from "lucide-react";
import { useStoreFilter } from "@/contexts/StoreFilterContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function StoreFilterBar() {
  const {
    selectedStoreIds,
    filterMode,
    allStores,
    selectAllStores,
    clearSelection,
    toggleStore,
    loadingStores,
  } = useStoreFilter();

  const getFilterLabel = () => {
    if (loadingStores) return "Loading stores...";
    if (filterMode === "all") return "All Stores";
    if (selectedStoreIds.length === 0) return "All Stores";
    if (selectedStoreIds.length === 1) {
      const store = allStores.find((s) => s.id === selectedStoreIds[0]);
      return store?.name || "Selected Store";
    }
    return `${selectedStoreIds.length} Stores Selected`;
  };

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="h-4 w-4" />
        <span>Store Filter:</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 min-w-[180px] justify-between"
            disabled={loadingStores}
          >
            <span className="truncate">{getFilterLabel()}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Select Stores</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllStores}
                className="h-6 text-xs px-2"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-6 text-xs px-2"
              >
                Clear
              </Button>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <div className="max-h-64 overflow-y-auto">
            {allStores.map((store) => (
              <DropdownMenuCheckboxItem
                key={store.id}
                checked={filterMode === "all" || selectedStoreIds.includes(store.id)}
                onCheckedChange={() => toggleStore(store.id)}
                className="cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{store.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {store.code} • {store.region ?? "—"}
                  </span>
                </div>
              </DropdownMenuCheckboxItem>
            ))}

            {!loadingStores && allStores.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No stores assigned to this user.
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {filterMode === "selected" && selectedStoreIds.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedStoreIds.slice(0, 3).map((id) => {
            const store = allStores.find((s) => s.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1 pl-2 pr-1">
                {store?.code ?? "—"}
                <button
                  onClick={() => toggleStore(id)}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}

          {selectedStoreIds.length > 3 && (
            <Badge variant="outline" className="text-muted-foreground">
              +{selectedStoreIds.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}