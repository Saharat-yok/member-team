import { useState } from 'react';
import { useAuthMutation } from '../hooks/useAuth.js';
import { loginSchema, parseForm, registerSchema } from '../lib/schemas.js';
import { Button, Field } from '../components/ui.jsx';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [errors, setErrors] = useState({});
  const auth = useAuthMutation(mode);
  const isLogin = mode === 'login';

  const onSubmit = (e) => {
    e.preventDefault();
    const { data, errors } = parseForm(isLogin ? loginSchema : registerSchema, e.currentTarget);
    setErrors(errors ?? {});
    if (data) auth.mutate(data, { onError: (err) => setErrors(err.fieldErrors ?? {}) });
    // ถ้าสำเร็จ ['me'] จะมีค่า แล้ว Gate จะพาไปหน้า "/" เอง
  };

  const toggle = () => {
    setMode(isLogin ? 'register' : 'login');
    setErrors({});
    auth.reset();
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">{isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h1>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {!isLogin && <Field label="ชื่อ" name="name" autoComplete="name" error={errors.name} />}
        <Field label="อีเมล" name="email" type="email" autoComplete="email" autoCapitalize="none"
          error={errors.email} />
        <Field label="รหัสผ่าน" name="password" type="password" error={errors.password}
          autoComplete={isLogin ? 'current-password' : 'new-password'} />
        {auth.isError && !Object.keys(auth.error.fieldErrors ?? {}).length && (
          <p role="alert" className="text-sm text-red-600">{auth.error.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={auth.isPending}>
          {auth.isPending ? 'กำลังดำเนินการ…' : isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
        </Button>
      </form>
      <Button type="button" variant="ghost" onClick={toggle}>
        {isLogin ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
      </Button>
    </main>
  );
}
