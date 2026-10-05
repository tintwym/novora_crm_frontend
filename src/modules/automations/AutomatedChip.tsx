import { IconAutomation } from '../../components/icons/Icons';

export function AutomatedChip() {
  return (
    <span
      title="Created by an automation rule"
      className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
    >
      <IconAutomation size={11} />
      Automated
    </span>
  );
}
