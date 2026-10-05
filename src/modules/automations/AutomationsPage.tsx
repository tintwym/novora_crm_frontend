import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DEAL_STAGES, Permission, type DealStage } from '@/shared';
import { usePermission } from '../../hooks/usePermission';
import {
  automationsApi,
  type AutomationAssignee,
  type AutomationRule,
  type AutomationTaskType,
} from './automationsApi';
import { ApiClientError } from '../../utils/api';
import { stageLabel } from '../../utils/labels';
import { Button, Card, EmptyState, ErrorAlert, Field, LoadingState, Modal, PageHeader } from '../../components/ui';
import { IconAutomation } from '../../components/icons/Icons';

type FormState = {
  name: string;
  triggerStage: DealStage | 'ANY';
  taskType: AutomationTaskType;
  taskSubject: string;
  taskNote: string;
  dueInDays: string;
  assignTo: AutomationAssignee;
};

const emptyForm: FormState = {
  name: '',
  triggerStage: 'PROPOSAL',
  taskType: 'TASK',
  taskSubject: '',
  taskNote: '',
  dueInDays: '1',
  assignTo: 'DEAL_OWNER',
};

const TASK_TYPE_LABEL: Record<AutomationTaskType, string> = {
  TASK: 'Task',
  CALL: 'Call',
  MEETING: 'Meeting',
  EMAIL: 'Email',
};

const ASSIGNEE_LABEL: Record<AutomationAssignee, string> = {
  DEAL_OWNER: 'the deal owner',
  ACTOR: 'whoever moved the deal',
};

const PLACEHOLDERS = '{deal}, {stage}, {contact}, {company}';

function preview(template: string, stage: DealStage | 'ANY') {
  return template
    .replaceAll('{deal}', 'Acme Logistics – CRM rollout')
    .replaceAll('{stage}', stage === 'ANY' ? 'Proposal' : stageLabel(stage))
    .replaceAll('{contact}', 'Olivia Martin')
    .replaceAll('{company}', 'Acme Logistics');
}

function dueText(days: number) {
  if (days === 0) return 'due the same day';
  return `due in ${days} ${days === 1 ? 'day' : 'days'}`;
}

export function AutomationsPage() {
  const canManage = usePermission(Permission.MANAGE_AUTOMATIONS);
  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Automations" />
        <Card>
          <EmptyState
            icon={IconAutomation}
            title="Managers only"
            message="Ask an admin or sales manager to set up automation rules."
          />
        </Card>
      </div>
    );
  }
  return <AutomationsManager />;
}

function AutomationsManager() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<AutomationRule | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AutomationRule | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRules(await automationsApi.list());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load automations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openForm(rule: AutomationRule | 'new') {
    setEditing(rule);
    setFormError(null);
    setForm(
      rule === 'new'
        ? emptyForm
        : {
            name: rule.name,
            triggerStage: rule.triggerStage ?? 'ANY',
            taskType: rule.taskType,
            taskSubject: rule.taskSubject,
            taskNote: rule.taskNote ?? '',
            dueInDays: String(rule.dueInDays),
            assignTo: rule.assignTo,
          },
    );
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const days = Number(form.dueInDays);
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      setFormError('Due in days must be a whole number between 0 and 365.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      triggerStage: form.triggerStage,
      taskType: form.taskType,
      taskSubject: form.taskSubject.trim(),
      taskNote: form.taskNote.trim() || null,
      dueInDays: days,
      assignTo: form.assignTo,
    };
    try {
      if (editing === 'new') {
        await automationsApi.create(payload);
        setNotice(`Created “${payload.name}”. It runs the next time a deal matches.`);
      } else {
        await automationsApi.update(editing.id, payload);
        setNotice(`Saved “${payload.name}”.`);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(rule: AutomationRule) {
    setBusyId(rule.id);
    try {
      await automationsApi.update(rule.id, { isActive: !rule.isActive });
      setNotice(rule.isActive ? `Paused “${rule.name}”.` : `Turned on “${rule.name}”.`);
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await automationsApi.remove(deleting.id);
      setNotice(`Deleted “${deleting.name}”. Tasks it already created are kept.`);
      setError(null);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed');
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  }

  const newButton = <Button onClick={() => openForm('new')}>New rule</Button>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Create follow-up tasks automatically when a deal reaches a stage"
        actions={newButton}
      />

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200"
        >
          {notice}
        </div>
      )}
      {error && <ErrorAlert message={error} />}

      {loading ? (
        <Card>
          <LoadingState rows={3} />
        </Card>
      ) : rules.length === 0 ? (
        <Card>
          <EmptyState
            icon={IconAutomation}
            title="No automations yet"
            message="For example: when a deal moves to Proposal, create a call to follow up three days later."
            action={newButton}
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {rules.map((rule) => (
            <li key={rule.id}>
              <Card className={`p-5 ${rule.isActive ? '' : 'opacity-70'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                        {rule.name}
                      </h2>
                      {rule.isActive ? (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                          On
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      When a deal {rule.triggerStage ? 'moves to ' : 'changes to any stage'}
                      {rule.triggerStage && (
                        <span className="font-medium text-slate-900 dark:text-white">
                          {stageLabel(rule.triggerStage)}
                        </span>
                      )}
                      , create a {TASK_TYPE_LABEL[rule.taskType].toLowerCase()}{' '}
                      <span className="font-medium text-slate-900 dark:text-white">“{rule.taskSubject}”</span>{' '}
                      {dueText(rule.dueInDays)}, assigned to {ASSIGNEE_LABEL[rule.assignTo]}.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {rule.runCount === 0
                        ? 'Hasn’t run yet'
                        : `Ran ${rule.runCount} ${rule.runCount === 1 ? 'time' : 'times'}, last on ${new Date(
                            rule.lastRunAt ?? rule.updatedAt,
                          ).toLocaleDateString()}`}
                      {rule.openTasks > 0 &&
                        ` · ${rule.openTasks} open ${rule.openTasks === 1 ? 'task' : 'tasks'}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      disabled={busyId === rule.id}
                      onClick={() => void toggle(rule)}
                    >
                      {rule.isActive ? 'Pause' : 'Turn on'}
                    </Button>
                    <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => openForm(rule)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs text-red-600 dark:text-red-400"
                      onClick={() => setDeleting(rule)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-500">
        Rules run when a deal is created in, or moved into, the chosen stage. A rule won’t add a second task to a
        deal while the first one it created is still open.
      </p>

      <Modal
        open={editing !== null}
        onClose={() => {
          if (!saving) setEditing(null);
        }}
        title={editing === 'new' ? 'New automation' : 'Edit automation'}
        description="Choose the stage that starts the rule and the follow-up task it creates."
      >
        <form onSubmit={onSave} className="space-y-1">
          <Field label="Rule name" htmlFor="rule-name">
            <Field.Input
              id="rule-name"
              required
              maxLength={120}
              placeholder="e.g. Proposal follow-up"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="When a deal moves to" htmlFor="rule-stage">
              <Field.Select
                id="rule-stage"
                value={form.triggerStage}
                onChange={(e) => setField('triggerStage', e.target.value as FormState['triggerStage'])}
              >
                <option value="ANY">Any stage</option>
                {DEAL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
              </Field.Select>
            </Field>
            <Field label="Create a" htmlFor="rule-type">
              <Field.Select
                id="rule-type"
                value={form.taskType}
                onChange={(e) => setField('taskType', e.target.value as AutomationTaskType)}
              >
                {(Object.keys(TASK_TYPE_LABEL) as AutomationTaskType[]).map((t) => (
                  <option key={t} value={t}>
                    {TASK_TYPE_LABEL[t]}
                  </option>
                ))}
              </Field.Select>
            </Field>
          </div>
          <Field label="Task title" htmlFor="rule-subject" hint={`You can use ${PLACEHOLDERS}`}>
            <Field.Input
              id="rule-subject"
              required
              maxLength={200}
              placeholder="Follow up on the proposal for {deal}"
              value={form.taskSubject}
              onChange={(e) => setField('taskSubject', e.target.value)}
            />
          </Field>
          {form.taskSubject.includes('{') && (
            <p className="-mt-1 pb-2 text-xs text-slate-500">
              Example: <span className="text-slate-700 dark:text-slate-200">{preview(form.taskSubject, form.triggerStage)}</span>
            </p>
          )}
          <Field label="Note" htmlFor="rule-note" hint="Optional. Placeholders work here too.">
            <Field.Textarea
              id="rule-note"
              rows={2}
              maxLength={2000}
              value={form.taskNote}
              onChange={(e) => setField('taskNote', e.target.value)}
            />
          </Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Due in (days)" htmlFor="rule-days" hint="0 means the same day">
              <Field.Input
                id="rule-days"
                type="number"
                min={0}
                max={365}
                step={1}
                required
                value={form.dueInDays}
                onChange={(e) => setField('dueInDays', e.target.value)}
              />
            </Field>
            <Field label="Assign to" htmlFor="rule-assign">
              <Field.Select
                id="rule-assign"
                value={form.assignTo}
                onChange={(e) => setField('assignTo', e.target.value as AutomationAssignee)}
              >
                <option value="DEAL_OWNER">Deal owner</option>
                <option value="ACTOR">Whoever moved the deal</option>
              </Field.Select>
            </Field>
          </div>
          {formError && <ErrorAlert message={formError} />}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={saving} onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save rule'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => {
          if (!saving) setDeleting(null);
        }}
        title={`Delete “${deleting?.name ?? 'rule'}”?`}
        description="The rule stops running. Tasks it already created stay on their deals. To stop it temporarily, pause it instead."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={saving} onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={saving} onClick={() => void onDelete()}>
            {saving ? 'Deleting…' : 'Delete rule'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
