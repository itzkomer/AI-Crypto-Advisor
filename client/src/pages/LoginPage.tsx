import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, LineChart, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { CenteredShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { ApiError, errorMessage } from '@/lib/apiClient';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      navigate(user.hasCompletedOnboarding ? '/dashboard' : '/onboarding', { replace: true });
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
      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
          <LineChart className="h-6 w-6 text-brand-400" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-100">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-400">
            Sign in to your personalized crypto dashboard.
          </p>
        </div>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="panel space-y-4 p-6" noValidate>
        {formError ? <Alert tone="error">{formError}</Alert> : null}

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

        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors['password']}
          leftIcon={<KeyRound className="h-4 w-4" />}
          required
        />

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Sign in
        </Button>

        <p className="text-center text-sm text-ink-400">
          No account yet?{' '}
          <Link to="/register" className="link font-medium">
            Create one
          </Link>
        </p>
      </form>

      <p className="mt-4 text-center text-xs text-ink-500">
        Demo account: <span className="font-mono text-ink-400">demo@moveo.dev</span> /{' '}
        <span className="font-mono text-ink-400">Demo1234!</span>
      </p>
    </CenteredShell>
  );
};
