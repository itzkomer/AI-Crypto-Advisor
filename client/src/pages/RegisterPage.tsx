import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, KeyRound, Mail, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { CenteredShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { ApiError, errorMessage } from '@/lib/apiClient';

/** Mirrors the server's password policy so users get instant feedback. */
const RULES: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { label: 'One lowercase letter', test: (value) => /[a-z]/.test(value) },
  { label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'One number', test: (value) => /[0-9]/.test(value) },
];

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ruleResults = useMemo(
    () => RULES.map((rule) => ({ label: rule.label, passed: rule.test(password) })),
    [password],
  );
  const isPasswordValid = ruleResults.every((rule) => rule.passed);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!isPasswordValid) {
      setFieldErrors({ password: 'Password does not meet all requirements.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password);
      // New accounts always go straight to onboarding.
      navigate('/onboarding', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(error.details).map(([field, messages]) => [field, messages[0] ?? '']),
          ),
        );
      }
      setFormError(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CenteredShell>
      <div className="mb-7 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-100">Create your account</h1>
        <p className="mt-1 text-sm text-ink-400">
          Two minutes of setup, then a dashboard built around you.
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="panel space-y-4 p-6" noValidate>
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <Input
          label="Name"
          name="name"
          autoComplete="name"
          placeholder="Satoshi Nakamoto"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldErrors['name']}
          leftIcon={<UserRound className="h-4 w-4" />}
          required
        />

        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors['email']}
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />

        <div className="space-y-2">
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors['password']}
            leftIcon={<KeyRound className="h-4 w-4" />}
            required
          />

          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {ruleResults.map((rule) => (
              <li
                key={rule.label}
                className={`flex items-center gap-1.5 text-xs ${
                  rule.passed ? 'text-bull' : 'text-ink-500'
                }`}
              >
                {rule.passed ? (
                  <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                ) : (
                  <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                )}
                {rule.label}
              </li>
            ))}
          </ul>
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Create account
        </Button>

        <p className="text-center text-sm text-ink-400">
          Already registered?{' '}
          <Link to="/login" className="link font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </CenteredShell>
  );
};
