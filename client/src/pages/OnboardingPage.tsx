/**
 * Interactive onboarding questionnaire (3 steps).
 *
 * Doubles as the "edit preferences" screen: when a profile already exists the
 * answers are prefilled and the copy switches to update mode.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Rocket, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { CenteredShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingOptions, useProfile, useSaveProfile } from '@/hooks/useDashboard';
import { errorMessage } from '@/lib/apiClient';
import type { AssetSymbol, ContentType, InvestorArchetype } from '@/types/api';

const STEPS = [
  { title: 'Which assets do you follow?', hint: 'Pick at least one. Your prices and news follow this.' },
  { title: 'How would you describe yourself?', hint: 'This sets the tone of your AI insight.' },
  { title: 'What content do you want?', hint: 'Pick everything that applies.' },
] as const;

interface ChoiceCardProps {
  label: string;
  description?: string | undefined;
  isSelected: boolean;
  onToggle: () => void;
  badge?: string | undefined;
}

const ChoiceCard = ({ label, description, isSelected, onToggle, badge }: ChoiceCardProps) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={isSelected}
    className={clsx(
      'group relative flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150',
      isSelected
        ? 'border-brand-400/60 bg-brand-500/10 shadow-glow'
        : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]',
    )}
  >
    <span
      className={clsx(
        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
        isSelected ? 'border-brand-400 bg-brand-500 text-surface-950' : 'border-white/20',
      )}
      aria-hidden="true"
    >
      {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </span>

    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="text-sm font-medium text-ink-100">{label}</span>
        {badge ? (
          <span className="font-mono text-[10px] font-semibold text-ink-500">{badge}</span>
        ) : null}
      </span>
      {description ? (
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{description}</span>
      ) : null}
    </span>
  </button>
);

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const { markOnboardingComplete } = useAuth();
  const { data: options, isLoading: isLoadingOptions, error: optionsError } = useOnboardingOptions();
  const { data: existingProfile, isLoading: isLoadingProfile } = useProfile();
  const saveProfile = useSaveProfile();

  const [step, setStep] = useState(0);
  const [assets, setAssets] = useState<AssetSymbol[]>([]);
  const [archetype, setArchetype] = useState<InvestorArchetype | null>(null);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [goal, setGoal] = useState('');

  const isEditing = Boolean(existingProfile?.completedAt);

  // Prefill once the existing profile arrives (edit mode).
  useEffect(() => {
    if (!existingProfile) return;
    setAssets(existingProfile.assets);
    setArchetype(existingProfile.archetype);
    setContentTypes(existingProfile.contentTypes);
    setGoal(existingProfile.goal ?? '');
  }, [existingProfile]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const canAdvance = useMemo(() => {
    if (step === 0) return assets.length > 0;
    if (step === 1) return archetype !== null;
    return contentTypes.length > 0;
  }, [step, assets, archetype, contentTypes]);

  const isLastStep = step === STEPS.length - 1;

  const handleSubmit = async (): Promise<void> => {
    if (!archetype) return;
    try {
      await saveProfile.mutateAsync({
        assets,
        archetype,
        contentTypes,
        goal: goal.trim() ? goal.trim() : null,
      });
      markOnboardingComplete();
      navigate('/dashboard', { replace: true });
    } catch {
      // Surfaced from saveProfile.error below.
    }
  };

  if (isLoadingOptions || isLoadingProfile) {
    return (
      <CenteredShell>
        <div className="panel space-y-4 p-6">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2 pt-2">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </CenteredShell>
    );
  }

  if (optionsError || !options) {
    return (
      <CenteredShell>
        <Alert tone="error">
          {optionsError
            ? errorMessage(optionsError)
            : 'Could not load the onboarding questions. Is the API running?'}
        </Alert>
      </CenteredShell>
    );
  }

  const currentStep = STEPS[step] ?? STEPS[0];

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-500/15 ring-1 ring-accent-500/30">
          <Sparkles className="h-5 w-5 text-accent-400" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-100">
            {isEditing ? 'Update your preferences' : "Let's personalize your dashboard"}
          </h1>
          <p className="text-sm text-ink-500">Step {step + 1} of {STEPS.length}</p>
        </div>
      </div>

      {/* Progress */}
      <div
        className="mb-6 flex gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
      >
        {STEPS.map((stepMeta, index) => (
          <span
            key={stepMeta.title}
            className={clsx(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              index <= step ? 'bg-brand-500' : 'bg-white/10',
            )}
          />
        ))}
      </div>

      <div className="panel animate-fade-in-up p-6">
        <h2 className="text-lg font-semibold text-ink-100">{currentStep.title}</h2>
        <p className="mt-1 text-sm text-ink-500">{currentStep.hint}</p>

        {saveProfile.isError ? (
          <Alert tone="error" className="mt-4">
            {errorMessage(saveProfile.error)}
          </Alert>
        ) : null}

        <div className="mt-5 space-y-2.5">
          {step === 0
            ? options.assets.map((option) => (
                <ChoiceCard
                  key={option.value}
                  label={option.label}
                  badge={option.symbol}
                  isSelected={assets.includes(option.value)}
                  onToggle={() => setAssets((current) => toggle(current, option.value))}
                />
              ))
            : null}

          {step === 1
            ? options.archetypes.map((option) => (
                <ChoiceCard
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  isSelected={archetype === option.value}
                  onToggle={() => setArchetype(option.value)}
                />
              ))
            : null}

          {step === 2 ? (
            <>
              {options.contentTypes.map((option) => (
                <ChoiceCard
                  key={option.value}
                  label={option.label}
                  isSelected={contentTypes.includes(option.value)}
                  onToggle={() => setContentTypes((current) => toggle(current, option.value))}
                />
              ))}

              <div className="pt-3">
                <label
                  htmlFor="onboarding-goal"
                  className="block text-sm font-medium text-ink-300"
                >
                  Anything you're aiming for? <span className="text-ink-500">(optional)</span>
                </label>
                <textarea
                  id="onboarding-goal"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  maxLength={280}
                  rows={3}
                  placeholder="e.g. Build a long-term core position without watching charts all day."
                  className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-surface-850/80 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                />
                <p className="mt-1 text-right text-xs text-ink-500">{goal.length}/280</p>
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
          <Button
            variant="ghost"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || saveProfile.isPending}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>

          {isLastStep ? (
            <Button
              onClick={() => void handleSubmit()}
              disabled={!canAdvance}
              isLoading={saveProfile.isPending}
              leftIcon={<Rocket className="h-4 w-4" />}
            >
              {isEditing ? 'Save preferences' : 'Build my dashboard'}
            </Button>
          ) : (
            <Button
              onClick={() => setStep((current) => current + 1)}
              disabled={!canAdvance}
              leftIcon={<ArrowRight className="h-4 w-4" />}
            >
              Continue
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <p className="mt-4 text-center text-sm">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="link"
          >
            Back to dashboard
          </button>
        </p>
      ) : null}
    </div>
  );
};
