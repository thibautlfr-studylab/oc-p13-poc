import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json() as { error: string };
        setError(data.error || 'Identifiants invalides');
        return;
      }

      const data = await res.json() as { token: string; role: string; email: string };
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('email', data.email);
      navigate('/chat');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Your Car Your Way</h1>
        <p style={styles.subtitle}>Support Chat — PoC</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="email@exemple.com"
            />
          </label>
          <label style={styles.label}>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="••••••••"
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={styles.hint}>
          <strong>Comptes de test :</strong>
          <p style={{ margin: '4px 0' }}>client@ycyw.com / password123</p>
          <p style={{ margin: '4px 0' }}>agent@ycyw.com / password123</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
    fontFamily: 'sans-serif',
  },
  card: {
    background: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    width: '100%',
    maxWidth: '380px',
  },
  title: { margin: '0 0 4px', fontSize: '1.4rem', color: '#1a1a2e' },
  subtitle: { margin: '0 0 1.5rem', color: '#666', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', fontWeight: 600 },
  input: { padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
  button: {
    padding: '10px',
    background: '#e63946',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
  error: { color: '#e63946', margin: 0, fontSize: '0.85rem' },
  hint: { marginTop: '1.5rem', padding: '12px', background: '#f9f9f9', borderRadius: '4px', fontSize: '0.8rem', color: '#555' },
};
