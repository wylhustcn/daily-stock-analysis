# -*- coding: utf-8 -*-
"""
Pure-Python chip distribution (筹码分布) calculator.

Ported from the JavaScript algorithm used by AkShare's ``stock_cyq_em``,
which in turn mirrors the client-side calculation on the EastMoney
quote page.  By reimplementing the algorithm in Python we remove the
dependency on ``py_mini_racer`` **and** on the EastMoney K-line API
(which is blocked by anti-scraping measures).

The only input required is standard OHLCV + turnover-rate K-line data,
which can come from any data source (Sina, Tencent, Tushare, …).
"""

import logging
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence

logger = logging.getLogger(__name__)

FACTOR = 150
LOOKBACK = 120


@dataclass
class _KBar:
    open: float
    close: float
    high: float
    low: float
    turnover_rate: float  # ratio, e.g. 0.025 = 2.5 %
    date: str = ""


def _parse_kline(rows: Sequence[Dict], lookback: int = LOOKBACK) -> List[_KBar]:
    bars: List[_KBar] = []
    for row in rows:
        try:
            o = float(row["open"])
            c = float(row["close"])
            h = float(row["high"])
            lo = float(row["low"])
            tr = float(row.get("turnover_rate") or row.get("turnover") or 0)
        except (KeyError, TypeError, ValueError):
            continue
        if h <= 0 or lo <= 0:
            continue
        bars.append(_KBar(open=o, close=c, high=h, low=lo,
                          turnover_rate=min(tr, 1.0),
                          date=str(row.get("date", ""))))
    if lookback and len(bars) > lookback:
        bars = bars[-lookback:]
    return bars


def compute_chip_distribution(
    kline_data: Sequence[Dict],
    current_price: float,
    stock_code: str,
    lookback: int = LOOKBACK,
):
    """Compute chip distribution from K-line data.

    Args:
        kline_data: list of dicts with keys ``open, close, high, low,
            turnover_rate`` (ratio, not percentage) and optionally ``date``.
            Must be sorted chronologically (oldest first).
        current_price: latest close or real-time price.
        stock_code: used only for the returned object's ``code`` field.
        lookback: how many recent bars to use (default 120).

    Returns:
        A ``ChipDistribution`` (from ``realtime_types``) or *None* on failure.
    """
    from .realtime_types import ChipDistribution

    bars = _parse_kline(kline_data, lookback)
    if len(bars) < 10:
        logger.warning("[筹码计算] K 线数据不足 (%d bars)，跳过", len(bars))
        return None

    max_price = max(b.high for b in bars)
    min_price = min(b.low for b in bars)
    if max_price <= min_price:
        return None

    accuracy = max(0.01, (max_price - min_price) / (FACTOR - 1))

    y_range = [min_price + accuracy * i for i in range(FACTOR)]
    x_data = [0.0] * FACTOR

    for bar in bars:
        avg = (bar.open + bar.close + bar.high + bar.low) / 4.0
        tr = bar.turnover_rate

        h_idx = int((bar.high - min_price) / accuracy)
        l_idx = math.ceil((bar.low - min_price) / accuracy)
        h_idx = min(h_idx, FACTOR - 1)
        l_idx = max(l_idx, 0)

        if bar.high == bar.low:
            g_x = FACTOR - 1
        else:
            g_x = 2.0 / (bar.high - bar.low)
        g_y = int((avg - min_price) / accuracy)
        g_y = max(0, min(g_y, FACTOR - 1))

        for n in range(FACTOR):
            x_data[n] *= (1.0 - tr)

        if bar.high == bar.low:
            x_data[g_y] += g_x * tr / 2.0
        else:
            for j in range(l_idx, h_idx + 1):
                cur_price = min_price + accuracy * j
                if cur_price <= avg:
                    denom = avg - bar.low
                    if abs(denom) < 1e-8:
                        x_data[j] += g_x * tr
                    else:
                        x_data[j] += (cur_price - bar.low) / denom * g_x * tr
                else:
                    denom = bar.high - avg
                    if abs(denom) < 1e-8:
                        x_data[j] += g_x * tr
                    else:
                        x_data[j] += (bar.high - cur_price) / denom * g_x * tr

    total_chips = sum(x_data)
    if total_chips <= 0:
        return None

    # --- profit ratio ---
    below = sum(x_data[i] for i in range(FACTOR) if y_range[i] <= current_price)
    profit_ratio = below / total_chips

    # --- helper: price at cumulative chip threshold ---
    def _cost_at_chip(chip_target: float) -> float:
        s = 0.0
        for i in range(FACTOR):
            if s + x_data[i] > chip_target:
                return y_range[i]
            s += x_data[i]
        return y_range[-1]

    avg_cost = _cost_at_chip(total_chips * 0.5)

    # --- 90 % chips ---
    c90_low = _cost_at_chip(total_chips * 0.05)
    c90_high = _cost_at_chip(total_chips * 0.95)
    denom90 = c90_low + c90_high
    conc_90 = (c90_high - c90_low) / denom90 if denom90 else 0.0

    # --- 70 % chips ---
    c70_low = _cost_at_chip(total_chips * 0.15)
    c70_high = _cost_at_chip(total_chips * 0.85)
    denom70 = c70_low + c70_high
    conc_70 = (c70_high - c70_low) / denom70 if denom70 else 0.0

    latest_date = bars[-1].date if bars else ""

    chip = ChipDistribution(
        code=stock_code,
        date=latest_date,
        source="calculated",
        profit_ratio=round(profit_ratio, 4),
        avg_cost=round(avg_cost, 2),
        cost_90_low=round(c90_low, 2),
        cost_90_high=round(c90_high, 2),
        concentration_90=round(conc_90, 4),
        cost_70_low=round(c70_low, 2),
        cost_70_high=round(c70_high, 2),
        concentration_70=round(conc_70, 4),
    )
    logger.info(
        "[筹码计算] %s 日期=%s: 获利比例=%.1f%%, 平均成本=%.2f, "
        "90%%集中度=%.2f%%, 70%%集中度=%.2f%%",
        stock_code, latest_date,
        chip.profit_ratio * 100, chip.avg_cost,
        chip.concentration_90 * 100, chip.concentration_70 * 100,
    )
    return chip
