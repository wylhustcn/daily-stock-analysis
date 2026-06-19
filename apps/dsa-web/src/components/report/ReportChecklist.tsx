import type React from 'react';
import { useMemo } from 'react';
import type { ReportDetails as ReportDetailsType } from '../../types/analysis';
import { Card } from '../common';
import { DashboardPanelHeader } from '../dashboard';

interface ReportChecklistProps {
  details?: ReportDetailsType;
}

type CheckStatus = 'pass' | 'warn' | 'fail';

const STATUS_STYLES: Record<CheckStatus, string> = {
  pass: 'text-success',
  warn: 'text-warning',
  fail: 'text-danger',
};

const parseStatus = (item: string): CheckStatus => {
  if (item.startsWith('✅')) return 'pass';
  if (item.startsWith('⚠️')) return 'warn';
  if (item.startsWith('❌')) return 'fail';
  return 'pass';
};

export const ReportChecklist: React.FC<ReportChecklistProps> = ({ details }) => {
  const checklist = useMemo((): string[] => {
    const raw = details?.rawResult;
    if (!raw) return [];
    const dashboard = raw.dashboard as Record<string, unknown> | undefined;
    if (!dashboard) return [];
    const battle = dashboard.battlePlan as Record<string, unknown> | undefined;
    if (!battle) return [];
    const list = battle.actionChecklist;
    return Array.isArray(list) ? (list as string[]) : [];
  }, [details]);

  if (checklist.length === 0) return null;

  return (
    <Card variant="bordered" padding="md" className="home-panel-card">
      <DashboardPanelHeader
        eyebrow="风控检查"
        title="检查清单"
        className="mb-3"
      />
      <ul className="space-y-2">
        {checklist.map((item, idx) => {
          const status = parseStatus(item);
          return (
            <li key={idx} className={`text-sm leading-relaxed ${STATUS_STYLES[status]}`}>
              {item}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
