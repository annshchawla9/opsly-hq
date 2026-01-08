import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStoreLeaderboard } from '@/lib/mock-data';

export function StoreLeaderboard() {
  const leaderboard = getStoreLeaderboard();

  return (
    <div className="dashboard-widget p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-warning" />
        <h3 className="font-semibold text-lg">Today's Store Leaderboard</h3>
      </div>

      <div className="space-y-3">
        {leaderboard.map((store, index) => {
          const isAboveTarget = store.percentage >= 100;
          const isTopThree = index < 3;

          return (
            <div
              key={store.store_id}
              className={cn(
                'flex items-center gap-4 p-3 rounded-lg transition-colors',
                isTopThree ? 'bg-muted/50' : 'hover:bg-muted/30'
              )}
            >
              {/* Rank */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  index === 0 && 'bg-warning/20 text-warning',
                  index === 1 && 'bg-muted text-muted-foreground',
                  index === 2 && 'bg-amber-600/20 text-amber-600',
                  index > 2 && 'bg-muted/50 text-muted-foreground'
                )}
              >
                {index + 1}
              </div>

              {/* Store Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{store.store_name}</p>
                <p className="text-xs text-muted-foreground">{store.store_code}</p>
              </div>

              {/* Performance */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">
                    ${store.actual.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    of ${store.target.toLocaleString()}
                  </p>
                </div>
                
                {/* Percentage badge */}
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                    isAboveTarget
                      ? 'bg-success/10 text-success'
                      : store.percentage >= 80
                      ? 'bg-warning/10 text-warning'
                      : 'bg-destructive/10 text-destructive'
                  )}
                >
                  {isAboveTarget ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {store.percentage}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
