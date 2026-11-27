import {useEffect,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Eye,EyeOff,LockKeyhole,ShieldCheck} from 'lucide-react';
import {get,request} from '../../api/client';
import {Button,Fault,Field,Status,toast} from '../../components/ui';
import type {Account} from '../../types';

const strong=z.string().min(12,'Use at least 12 characters').max(72).refine(value=>/[A-Z]/.test(value)&&/[a-z]/.test(value)&&/\d/.test(value)&&/[^a-zA-Z0-9]/.test(value)&&new TextEncoder().encode(value).length<=72,'Include uppercase, lowercase, a number and a symbol');
const login=z.object({identifier:z.string().trim().min(3).max(254),password:z.string().min(1).max(100),remember:z.boolean()});
const email=z.email().trim().toLowerCase();
const signup=z.object({fullName:z.string().trim().min(2).max(100),email,mobileNumber:z.string().trim().min(10).max(20),password:strong,confirmPassword:z.string(),accepted:z.boolean().refine(Boolean,'Accept both policies to register')}).refine(input=>input.password===input.confirmPassword,{path:['confirmPassword'],message:'Passwords must match'});
const recovery=z.object({email,code:z.string().trim().regex(/^\d{6}$/,'Enter the six-digit email code'),password:strong});
type Signup=z.infer<typeof signup>;
const hex=(buffer:ArrayBuffer)=>Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,'0')).join('');
async function signupProof(){
  const input=await get<{challenge:string;signature:string;prefix:string}>('/auth/challenge');
  const encoder=new TextEncoder();
  for(let offset=0;offset<10_000_000;offset+=96){
    const possible=await Promise.all(Array.from({length:96},async(_,index)=>{
      const proof=offset+index;
      const hash=await crypto.subtle.digest('SHA-256',encoder.encode(input.challenge+':'+proof));
      return hex(hash).startsWith(input.prefix)?proof:-1;
    }));
    const proof=possible.find(value=>value>=0);
    if(proof!==undefined)return {challenge:input.challenge,signature:input.signature,proof};
  }
  throw new Error('Signup verification timed out. Please try again.');
}

export default function AuthPage({mode}:{mode:'login'|'signup'|'recover'}){
  const [params]=useSearchParams(),[error,setError]=useState<unknown>(null),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false);
  const [registration,setRegistration]=useState<Signup|null>(null),[code,setCode]=useState('');
  const [resetEmail,setResetEmail]=useState(''),[sentEmail,setSentEmail]=useState('');
  const [resendIn,setResendIn]=useState(0);
  const navigate=useNavigate(),query=useQueryClient();
  const loginForm=useForm<z.infer<typeof login>>({resolver:zodResolver(login),defaultValues:{remember:false}});
  const signupForm=useForm<Signup>({resolver:zodResolver(signup),defaultValues:{accepted:false}});
  const recoveryForm=useForm<z.infer<typeof recovery>>({resolver:zodResolver(recovery)});
  useEffect(()=>{
    if(!resendIn)return;
    const timer=window.setTimeout(()=>setResendIn(resendIn-1),1000);
    return ()=>window.clearTimeout(timer);
  },[resendIn]);
  const next=params.get('next')??'';
  const safeNext=/^\/(internships|student|coordinator|college-coordinator|admin|documents|help|contact|skill-certification)(?:[/?#]|$)/.test(next)&&!next.includes('\\')?next:'';
  const referral=params.get('ref');
  const continuation=new URLSearchParams();
  if(safeNext)continuation.set('next',safeNext);
  if(referral)continuation.set('ref',referral);
  const nextParam=continuation.size?'?'+continuation:'';
  const pass=(field:ReturnType<typeof loginForm.register>|ReturnType<typeof signupForm.register>|ReturnType<typeof recoveryForm.register>)=><div className="password-field"><input {...field} type={visible?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'}/><button type="button" className="icon-btn" onClick={()=>setVisible(!visible)} aria-label={visible?'Hide password':'Show password'}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>;
  async function signIn(account:Account){
    await query.cancelQueries();query.clear();query.setQueryData(['account'],account);
    navigate(safeNext||'/'+account.role,{replace:true});
  }
  async function submit(work:()=>Promise<void>){
    setBusy(true);setError(null);
    try{await work();}catch(failure){setError(failure);}finally{setBusy(false);}
  }
  async function sendRegistration(input:Signup){
    const verification=await signupProof();
    await request('/auth/signup/otp','POST',{email:input.email,...verification});
    setCode('');setRegistration(input);setResendIn(60);
  }
  async function sendReset(){
    const address=email.parse(resetEmail.trim());
    await request('/auth/password-reset/otp','POST',{email:address});
    recoveryForm.reset({email:address,code:'',password:''});setSentEmail(address);setResendIn(60);
  }
  const title=mode==='login'?'Welcome back':mode==='signup'?(registration?'Verify your email':'Create your account'):'Reset your password';
  return <div className="auth-bg"><section className="panel auth-card">
    <span className="icon-tile"><LockKeyhole size={24}/></span><h1>{title}</h1>
    {mode==='login'&&<><p>Sign in to your DInterns account.</p><form className="form-stack" onSubmit={loginForm.handleSubmit(input=>submit(async()=>{
      await signIn(await request<Account>('/auth/login','POST',input));
    }))}>
      <Field label="Email or mobile number" error={loginForm.formState.errors.identifier?.message}><input autoComplete="username" {...loginForm.register('identifier')}/></Field>
      <Field label="Password" error={loginForm.formState.errors.password?.message}>{pass(loginForm.register('password'))}</Field>
      <div className="auth-options"><label className="checkbox"><input type="checkbox" {...loginForm.register('remember')}/>Remember me</label><Link to={'/recover'+nextParam}>Forgot password?</Link></div>
      <Button type="submit" busy={busy}>Login</Button><p className="auth-switch">New to DInterns? <Link to={'/signup'+nextParam}>Sign Up</Link></p>
    </form></>}
    {mode==='signup'&&(registration?<form className="form-stack" onSubmit={event=>{
      event.preventDefault();
      void submit(async()=>signIn(await request<Account>('/auth/signup','POST',{...registration,code,referral:referral||undefined})));
    }}>
      <Status>We sent a six-digit code to {registration.email}.</Status>
      <Field label="Email verification code"><input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event=>setCode(event.target.value)}/></Field>
      <Button type="submit" busy={busy}>Verify Email &amp; Create Account</Button>
      <div className="actions">
        <Button type="button" variant="secondary" disabled={busy||resendIn>0} onClick={()=>void submit(()=>sendRegistration(registration))}>{resendIn?'Resend in '+resendIn+'s':'Resend Code'}</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={()=>{setRegistration(null);setError(null);}}>Edit Details</Button>
      </div>
    </form>:<>
      <p>Use an email address you can access to verify your account.</p>
      {referral&&<p className="info">You’re signing up through a college coordinator’s invitation.</p>}
      <form className="form-stack" onSubmit={signupForm.handleSubmit(input=>submit(()=>sendRegistration(input)))}>
        <Field label="Full name" error={signupForm.formState.errors.fullName?.message}><input autoComplete="name" {...signupForm.register('fullName')}/></Field>
        <Field label="Email address" error={signupForm.formState.errors.email?.message}><input type="email" autoComplete="email" {...signupForm.register('email')}/></Field>
        <Field label="Mobile number" error={signupForm.formState.errors.mobileNumber?.message}><input type="tel" autoComplete="tel" {...signupForm.register('mobileNumber')}/></Field>
        <Field label="Password" error={signupForm.formState.errors.password?.message}>{pass(signupForm.register('password'))}</Field>
        <Field label="Confirm password" error={signupForm.formState.errors.confirmPassword?.message}><input type={visible?'text':'password'} autoComplete="new-password" {...signupForm.register('confirmPassword')}/></Field>
        <label className="checkbox"><input type="checkbox" {...signupForm.register('accepted')}/><span>I have read and agree to the <Link to="/terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</Link> and <Link to="/privacy" target="_blank" rel="noreferrer">Privacy Policy</Link>.</span></label>
        {signupForm.formState.errors.accepted&&<small className="field-error">{signupForm.formState.errors.accepted.message}</small>}
        <Button type="submit" busy={busy}>Send Verification Code</Button><p className="auth-switch">Already registered? <Link to={'/login'+nextParam}>Login</Link></p>
      </form>
    </>)}
    {mode==='recover'&&(sentEmail?<form className="form-stack" onSubmit={recoveryForm.handleSubmit(input=>submit(async()=>{
      await request('/auth/password-reset','POST',input);
      await query.cancelQueries();query.clear();query.setQueryData(['account'],null);
      toast('Password updated. Sign in with your new password.');
      navigate('/login'+nextParam,{replace:true});
    }))}>
      <Status>If an account matches {sentEmail}, a six-digit code will arrive shortly.</Status>
      <Field label="Email reset code" error={recoveryForm.formState.errors.code?.message}><input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...recoveryForm.register('code')}/></Field>
      <Field label="New password" error={recoveryForm.formState.errors.password?.message}>{pass(recoveryForm.register('password'))}</Field>
      <Button type="submit" busy={busy}>Reset Password</Button>
      <div className="actions">
        <Button type="button" variant="secondary" disabled={busy||resendIn>0} onClick={()=>void submit(sendReset)}>{resendIn?'Resend in '+resendIn+'s':'Resend Code'}</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={()=>{setSentEmail('');setError(null);}}>Change Email</Button>
      </div>
    </form>:<form className="form-stack" onSubmit={event=>{event.preventDefault();void submit(sendReset);}}>
      <p>Enter the email address associated with your account.</p>
      <Field label="Email address"><input type="email" autoComplete="email" required value={resetEmail} onChange={event=>setResetEmail(event.target.value)}/></Field>
      <Button type="submit" busy={busy}>Send Reset Code</Button>
      <p className="auth-switch"><Link to={'/login'+nextParam}>Return to login</Link></p>
    </form>)}
    {error!=null&&<Fault error={error}/>}
    <div className="auth-foot"><ShieldCheck size={16}/>Keep your password and email codes private.</div>
  </section></div>;
}
