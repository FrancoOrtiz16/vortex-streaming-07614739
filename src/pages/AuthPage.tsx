import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type AuthMode = 'login' | 'register';

const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info('Conecta Lovable Cloud para habilitar la autenticación.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Ambient */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full bg-neon/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-60 h-60 rounded-full bg-gold/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-2xl p-8 relative z-10"
      >
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver
        </Link>

        <h1 className="font-display font-bold text-2xl mb-1">
          {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === 'login'
            ? 'Ingresa tus credenciales para acceder.'
            : 'Regístrate para empezar a comprar.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                key="name"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary text-sm border border-border focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary text-sm border border-border focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary text-sm border border-border focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl gradient-neon text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {mode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-6">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="neon-text hover:underline font-medium"
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia Sesión'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
