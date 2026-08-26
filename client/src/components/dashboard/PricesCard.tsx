/** Section A - live coin prices for the user's tracked assets. */
import { CandlestickChart, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { FeedbackWidget } from './FeedbackWidget';
import { Sparkline } from './Sparkline';
import { Button } from '@/components/ui/Button';
import { PricesSkeleton } from '@/components/ui/Skeleton';
import { usePrices } from '@/hooks/useDashboard';
import { errorMessage } from '@/lib/apiClient';
import { formatCompactUsd, formatPercent, formatUsd } from '@/lib/format';
import type { CoinPrice } from '@/types/api';

const CoinRow = ({ coin }: { coin: CoinPrice }) => {
  const isPositive = coin.change24hPercent >= 0;
  const Trend = isPositive ? TrendingUp : TrendingDown;

  return (
    <li className="panel-inset flex items-center gap-3 p-3 transition-colors hover:border-white/10">
      {coin.image ? (
        <img
          src={coin.image}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          className="h-8 w-8 shrink-0 rounded-full"
        />
      ) : (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[10px] font-bold text-ink-300">
          {coin.symbol.slice(0, 3)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-100">{coin.symbol}</p>
        <p className="truncate text-xs text-ink-500">{coin.name}</p>
      </div>

      <Sparkline
        points={coin.sparkline}
        isPositive={isPositive}
        className="hidden shrink-0 sm:block"
      />

      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-semibold text-ink-100">{formatUsd(coin.priceUsd)}</p>
        <p
          className={`flex items-center justify-end gap-1 text-xs font-medium ${
            isPositive ? 'text-bull' : 'text-bear'
          }`}
        >
          <Trend className="h-3 w-3" aria-hidden="true" />
          {formatPercent(coin.change24hPercent)}
        </p>
      </div>
    </li>
  );
};

export const PricesCard = () => {
  const { data, isLoading, isFetching, error, refetch } = usePrices();

  const totalMarketCap = (data?.data.coins ?? []).reduce(
    (sum, coin) => sum + (coin.marketCapUsd ?? 0),
    0,
  );

  return (
    <SectionCard
      title="Coin Prices"
      subtitle={
        data ? `${data.data.coins.length} tracked assets · USD` : 'Your tracked assets, live'
      }
      icon={CandlestickChart}
      accent="brand"
      source={data?.source}
      notice={data?.notice}
      isLoading={isLoading}
      isRefreshing={isFetching && !isLoading}
      error={error}
      errorMessage={error ? errorMessage(error) : undefined}
      onRetry={() => void refetch()}
      skeleton={<PricesSkeleton />}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Refresh prices"
          title="Refresh prices"
          className="px-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      }
      footer={
        data ? (
          <FeedbackWidget
            sectionType="PRICES"
            itemIdentifier={data.itemIdentifier}
            context={{
              source: data.source,
              generatedAt: data.generatedAt,
              coins: data.data.coins.map((coin) => ({
                symbol: coin.symbol,
                priceUsd: coin.priceUsd,
                change24hPercent: coin.change24hPercent,
              })),
            }}
          />
        ) : null
      }
    >
      {data ? (
        <>
          <ul className="space-y-2">
            {data.data.coins.map((coin) => (
              <CoinRow key={coin.id} coin={coin} />
            ))}
          </ul>
          {totalMarketCap > 0 ? (
            <p className="pt-1 text-right text-xs text-ink-500">
              Combined market cap {formatCompactUsd(totalMarketCap)}
            </p>
          ) : null}
        </>
      ) : null}
    </SectionCard>
  );
};
