import type React from 'react';
import { Badge, Button } from '../common';
import type { StockBarItem as StockBarItemType } from '../../types/analysis';
import { getSentimentColor } from '../../types/analysis';
import { formatDateTime } from '../../utils/format';
import { truncateStockName, isStockNameTruncated } from '../../utils/stockName';

interface StockBarItemProps {
  item: StockBarItemType;
  isViewing: boolean;
  onClick: (recordId: number) => void;
  onDelete?: (stockCode: string) => void;
  isDeleting?: boolean;
  isMarketReview?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (stockCode: string) => void;
}

const getOperationBadgeLabel = (advice?: string) => {
  const normalized = advice?.trim();
  if (!normalized) return null;
  if (normalized.includes('减仓')) return '减仓';
  if (normalized.includes('卖')) return '卖出';
  if (normalized.includes('观望') || normalized.includes('等待')) return '观望';
  if (normalized.includes('买') || normalized.includes('布局')) return '买入';
  return normalized.split(/[，。；、\s]/)[0] || '建议';
};

export const StockBarItemComponent: React.FC<StockBarItemProps> = ({
  item,
  isViewing,
  onClick,
  onDelete,
  isDeleting = false,
  isMarketReview = false,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const sentimentColor = item.sentimentScore !== undefined ? getSentimentColor(item.sentimentScore) : null;
  const stockName = item.stockName || item.stockCode;
  const isTruncated = isStockNameTruncated(stockName);
  const operationLabel = getOperationBadgeLabel(item.operationAdvice);

  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className={`home-history-item w-full text-left p-2.5 group/item ${
        isViewing ? 'home-history-item-selected' : ''
      } ${isFavorite && !isMarketReview ? 'ring-1 ring-amber-400/20 bg-amber-400/5' : ''}`}
    >
      <div className={`flex items-center gap-2.5 relative z-10${isTruncated ? ' group-hover/item:z-20' : ''}`}>
        {isMarketReview ? (
          <div className="w-1 h-8 rounded-full flex-shrink-0 bg-amber-400" style={{ boxShadow: '0 0 10px rgba(251,191,36,0.4)' }} />
        ) : sentimentColor ? (
          <div
            className="w-1 h-8 rounded-full flex-shrink-0"
            style={{
              backgroundColor: isFavorite ? '#fbbf24' : sentimentColor,
              boxShadow: `0 0 10px ${isFavorite ? 'rgba(251,191,36,0.4)' : `${sentimentColor}40`}`,
            }}
          />
        ) : (
          <div className={`w-1 h-8 rounded-full flex-shrink-0 ${isFavorite ? 'bg-amber-400' : 'bg-subtle'}`} style={isFavorite ? { boxShadow: '0 0 10px rgba(251,191,36,0.4)' } : undefined} />
        )}
        {!isMarketReview && onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.stockCode);
            }}
            className={`flex-shrink-0 transition-opacity ${
              isFavorite
                ? 'text-amber-400 opacity-100'
                : 'text-muted-text opacity-0 group-hover/item:opacity-60 hover:!opacity-100'
            }`}
            aria-label={isFavorite ? `取消收藏 ${stockName}` : `收藏 ${stockName}`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm font-semibold text-foreground tracking-tight">
                <span className="group-hover/item:hidden">
                  {truncateStockName(stockName)}
                </span>
                <span className="hidden group-hover/item:inline">
                  {stockName}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isMarketReview ? (
                <Badge
                  variant="default"
                  size="sm"
                  className="shrink-0 shadow-none text-[10px] font-semibold leading-none"
                  style={{
                    color: '#f59e0b',
                    borderColor: 'rgba(245,158,11,0.3)',
                    backgroundColor: 'rgba(245,158,11,0.1)',
                  }}
                >
                  大盘
                </Badge>
              ) : operationLabel && sentimentColor ? (
                <Badge
                  variant="default"
                  size="sm"
                  className="home-history-sentiment-badge shrink-0 shadow-none text-[11px] font-semibold leading-none transition-opacity duration-200"
                  style={{
                    color: sentimentColor,
                    borderColor: `${sentimentColor}30`,
                    backgroundColor: `${sentimentColor}10`,
                  }}
                >
                  {operationLabel} {item.sentimentScore}
                </Badge>
              ) : null}
              {onDelete && !isMarketReview && (
                <Button
                  variant="ghost"
                  size="xsm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.stockCode);
                  }}
                  disabled={isDeleting}
                  className="opacity-0 group-hover/item:opacity-100 transition-opacity h-6 w-6 p-0 flex items-center justify-center"
                  aria-label={`删除 ${item.stockName || item.stockCode} 历史记录`}
                >
                  <svg className="h-3.5 w-3.5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-secondary-text font-mono">
              {item.stockCode}
            </span>
            {item.lastAnalysisTime && (
              <>
                <span className="w-1 h-1 rounded-full bg-subtle-hover" />
                <span className="text-[11px] text-muted-text">
                  {formatDateTime(item.lastAnalysisTime)}
                </span>
              </>
            )}
            {item.analysisCount > 1 && !isMarketReview && (
              <>
                <span className="w-1 h-1 rounded-full bg-subtle-hover" />
                <span className="text-[10px] text-muted-text">
                  {item.analysisCount}次
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
