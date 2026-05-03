import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        addToast('Password reset email sent! Check your inbox.', 'success');
        setIsForgot(false);
      } else if (isSignUp) {
        await signUp(email, password);
        addToast('Account created! Check your email to confirm.', 'success');
      } else {
        await signIn(email, password);
        addToast('Welcome back!', 'success');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🏸</div>
          <div className="login-logo-text">Shuttle Club</div>
          <div className="login-subtitle">Badminton Club Manager</div>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          {!isForgot && (
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={6}
              />
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isForgot ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          {!isSignUp && !isForgot && (
            <a
              href="#"
              className="text-sm text-muted"
              style={{ textAlign: 'center' }}
              onClick={(e) => { e.preventDefault(); setIsForgot(true); setError(''); }}
            >
              Forgot password?
            </a>
          )}
        </form>

        <p className="text-sm text-muted mt-md" style={{ textAlign: 'center' }}>
          {isForgot ? (
            <a href="#" onClick={(e) => { e.preventDefault(); setIsForgot(false); setError(''); }}>
              Back to Sign In
            </a>
          ) : (
            <>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
