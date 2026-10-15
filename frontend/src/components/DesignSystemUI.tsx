import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Radio,
  Users,
  AlertOctagon,
  FileCheck
} from 'lucide-react';

export type StatusSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatusType = 'NEW' | 'ACKNOWLEDGED' | 'UNDER_INVESTIGATION' | 'TEAM_ASSIGNED' | 'RESPONDING' | 'RESOLVED' | 'FALSE_ALARM';

interface SeverityBadgeProps {
  severity: StatusSeverity | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  showIcon = true,
  size = 'md',
  className = ''
}) => {
  const sev = (severity || 'LOW').toUpperCase();

  let styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let IconComponent = CheckCircle2;
  let label = 'Low Risk';

  if (sev === 'MEDIUM') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
    IconComponent = AlertTriangle;
    label = 'Medium Risk';
  } else if (sev === 'HIGH') {
    styles = 'bg-orange-50 text-orange-800 border-orange-200';
    IconComponent = ShieldAlert;
    label = 'High Risk';
  } else if (sev === 'CRITICAL') {
    styles = 'bg-red-50 text-red-800 border-red-200 animate-pulse';
    IconComponent = AlertOctagon;
    label = 'Critical SOS';
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border tracking-wide uppercase font-mono ${styles} ${sizeClasses} ${className}`}
    >
      {showIcon && <IconComponent className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />}
      <span>{label}</span>
    </span>
  );
};

interface StatusBadgeProps {
  status: IncidentStatusType | string;
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  className = ''
}) => {
  const st = (status || 'NEW').toUpperCase();

  let styles = 'bg-red-700 text-white border-transparent font-bold';
  let IconComp = AlertOctagon;
  let label = 'NEW INCIDENT';

  switch (st) {
    case 'NEW':
      styles = 'bg-[#B91C1C] text-white border-transparent font-bold';
      IconComp = AlertOctagon;
      label = 'NEW';
      break;
    case 'ACKNOWLEDGED':
      styles = 'bg-amber-50 text-amber-800 border-amber-300';
      IconComp = Clock;
      label = 'ACKNOWLEDGED';
      break;
    case 'UNDER_INVESTIGATION':
      styles = 'bg-sky-50 text-sky-800 border-sky-300';
      IconComp = Info;
      label = 'INVESTIGATING';
      break;
    case 'TEAM_ASSIGNED':
      styles = 'bg-blue-50 text-blue-800 border-blue-300';
      IconComp = Users;
      label = 'ASSIGNED';
      break;
    case 'RESPONDING':
      styles = 'bg-teal-50 text-teal-800 border-teal-300';
      IconComp = Radio;
      label = 'EN ROUTE';
      break;
    case 'RESOLVED':
      styles = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      IconComp = CheckCircle2;
      label = 'RESOLVED';
      break;
    case 'FALSE_ALARM':
      styles = 'bg-slate-100 text-slate-700 border-slate-300';
      IconComp = FileCheck;
      label = 'FALSE ALARM';
      break;
    default:
      styles = 'bg-slate-100 text-slate-700 border-slate-300';
      IconComp = Info;
      label = st;
  }

  return (
    <span
      className={`inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border gap-1.5 ${styles} ${className}`}
    >
      {showIcon && <IconComp className="w-3 h-3 shrink-0" />}
      <span>{label}</span>
    </span>
  );
};

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: 'blue' | 'green' | 'amber' | 'red' | 'navy';
  badge?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  accentColor = 'blue',
  badge,
  onClick
}) => {
  const accentClasses = {
    blue: 'border-l-[#2563EB] text-[#2563EB] bg-blue-50/50',
    green: 'border-l-[#15803D] text-[#15803D] bg-emerald-50/50',
    amber: 'border-l-[#B45309] text-[#B45309] bg-amber-50/50',
    red: 'border-l-[#B91C1C] text-[#B91C1C] bg-red-50/50',
    navy: 'border-l-[#101B2D] text-[#101B2D] bg-slate-100/50'
  }[accentColor];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-[#DCE3EC] p-3.5 shadow-sm border-l-4 ${accentClasses.split(' ')[0]} ${
        onClick ? 'cursor-pointer hover:border-slate-400 transition-all' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[#667085] truncate">
          {label}
        </span>
        <div className={`p-1.5 rounded-lg ${accentClasses.split(' ')[2]} ${accentClasses.split(' ')[1]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold font-mono tracking-tight text-[#1D2939]">
          {value}
        </span>
        {badge && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-[#1D2939] border border-[#DCE3EC]">
            {badge}
          </span>
        )}
      </div>
      {subtext && (
        <p className="mt-1 text-[12px] text-[#667085] truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};
