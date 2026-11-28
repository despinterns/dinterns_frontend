import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {Link,NavLink,Outlet,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {ChevronDown,Menu,X,MapPin,Globe,LogOut,LayoutDashboard,BriefcaseBusiness,ShieldCheck,Bell,LifeBuoy,UserRound,GraduationCap,ClipboardList,FolderKanban,UsersRound,Star,CreditCard,Award,Settings,Mail,TicketPercent} from 'lucide-react';
import {AnimatePresence,motion,useReducedMotion} from 'framer-motion';
import {useQueryClient} from '@tanstack/react-query';
import {request,siteUrl,useAccount} from '../api/client';
import {initials} from '../types';
import {Brand,Fault,Loader} from './ui';
import {Notifications} from './Notifications';

const internshipLinks=[['Apply Internship','/internships'],['Verify Certificate','/verify-certificate'],['Internship Documents','/documents']];
const legalLinks=[['Terms & Conditions','/terms'],['Privacy Policy','/privacy']];
function Drop({label,ariaLabel,children}:{label:ReactNode;ariaLabel?:string;children:ReactNode}){
  const [mode,setMode]=useState<'hover'|'click'|null>(null);
  const closeTimer=useRef<number>(undefined);
  const trigger=useRef<HTMLButtonElement>(null);
  const location=useLocation(),reduced=useReducedMotion(),menuId=useId();
  const open=mode!==null;
  useEffect(()=>{
    setMode(null);
    return ()=>window.clearTimeout(closeTimer.current);
  },[location]);
  useEffect(()=>{
    if(!open)return;
    const closeOnEscape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape')return;
      if(trigger.current?.parentElement?.contains(document.activeElement)){
        event.preventDefault();
        trigger.current.focus();
      }
      setMode(null);
    };
    document.addEventListener('keydown',closeOnEscape);
    return ()=>document.removeEventListener('keydown',closeOnEscape);
  },[open]);
  return <div className="nav-drop"
    onPointerEnter={event=>{
      if(event.pointerType!=='mouse')return;
      window.clearTimeout(closeTimer.current);
      setMode(current=>current??'hover');
    }}
    onPointerLeave={event=>{
      if(event.pointerType!=='mouse')return;
      const root=event.currentTarget;
      closeTimer.current=window.setTimeout(()=>{
        const focused=document.activeElement;
        if(focused!==trigger.current&&root.contains(focused))return;
        setMode(current=>current==='hover'?null:current);
      },180);
    }}
    onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setMode(null);}}>
    <button ref={trigger} type="button" className="nav-trigger" aria-label={ariaLabel} aria-expanded={open} aria-controls={open?menuId:undefined} onClick={()=>setMode(current=>current==='click'?null:'click')}>{label}<ChevronDown size={15}/></button>
    <AnimatePresence>{open&&<motion.div id={menuId} className="dropdown" initial={reduced?false:{opacity:0,y:-5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}}>{children}</motion.div>}</AnimatePresence>
  </div>;
}
function NavItems(){return <><NavLink to="/" end>Home</NavLink><Drop label="Internships">{internshipLinks.map(([title,link])=><NavLink key={link} to={link}>{title}</NavLink>)}</Drop><NavLink to="/skill-certification">Skill Certification</NavLink><NavLink to="/contact">Contact Us</NavLink><Drop label="More"><NavLink to="/college-coordinator">Become a College Coordinator</NavLink>{legalLinks.map(([title,link])=><NavLink key={link} to={link}>{title}</NavLink>)}</Drop></>;}
const dashboardLabel={student:'Student Dashboard',coordinator:'Coordinator Dashboard',admin:'Admin Dashboard'};
function useLogout(){
  const client=useQueryClient(),navigate=useNavigate();
  const [error,setError]=useState<unknown>(null);
  const [busy,setBusy]=useState(false);
  return {error,busy,logout:async()=>{
    setBusy(true);setError(null);
    try{await request('/auth/logout');await client.cancelQueries();client.clear();client.setQueryData(['account'],null);navigate('/');}
    catch(failure){setError(failure);}finally{setBusy(false);}
  }};
}
export function PublicLayout(){
  const account=useAccount(),location=useLocation(),reduced=useReducedMotion();
  const [expanded,setExpanded]=useState(false);
  const [docked,setDocked]=useState(()=>window.scrollY>8);
  const {error,busy,logout}=useLogout();
  useEffect(()=>{
    const syncNavbar=()=>setDocked(window.scrollY>8);
    window.addEventListener('scroll',syncNavbar,{passive:true});
    syncNavbar();
    return ()=>window.removeEventListener('scroll',syncNavbar);
  },[]);
  useEffect(()=>{setExpanded(false);},[location]);
  const user=account.data;
  const [params]=useSearchParams();
  const next=params.get('next'),ref=params.get('ref');
  const authParams=new URLSearchParams();
  if(next)authParams.set('next',next);
  if(ref)authParams.set('ref',ref);
  const authSuffix=['/login','/signup','/recover'].includes(location.pathname)&&authParams.size?'?'+authParams:'';
  return <>
    <a href="#main" className="skip">Skip to content</a>
    <div className="nav-wrap" data-docked={docked}><motion.header className="public-nav" initial={reduced?false:{opacity:0,y:-8}} animate={{opacity:1,y:0}}>
      <Brand/>
      <nav className="desktop-nav" aria-label="Main navigation"><NavItems/></nav>
      <div className="nav-actions">
        {user?<><Link className="btn primary nav-dashboard" to={'/'+user.role}>{dashboardLabel[user.role]}</Link><Notifications/><Drop ariaLabel="Profile" label={<span className="avatar" aria-hidden>{initials(user.fullName)}</span>}><Link to={'/'+user.role}>{dashboardLabel[user.role]}</Link><button disabled={busy} onClick={logout}>Logout</button></Drop></>
          :<><Link className="login-link" to={'/login'+authSuffix}>Login</Link><Link className="btn primary signup-link" to={'/signup'+authSuffix}>Sign Up</Link></>}
        <button className="icon-btn mobile-trigger" aria-label={expanded?'Close navigation':'Open navigation'} aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?<X size={23}/>:<Menu size={23}/>}</button>
      </div>
      <AnimatePresence>{expanded&&<motion.nav aria-label="Mobile navigation" className="mobile-nav" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><NavItems/>{user?<Link to={'/'+user.role}>Dashboard</Link>:<div className="actions"><Link className="btn secondary" to={'/login'+authSuffix}>Login</Link><Link className="btn primary" to={'/signup'+authSuffix}>Sign Up</Link></div>}</motion.nav>}</AnimatePresence>
    </motion.header>{error!=null&&<Fault error={error}/>}</div>
    <main id="main"><Outlet/></main><Footer/>
  </>;
}
const footerGroups=[
  ['Explore',[['Home','/'],['Available Internships','/internships'],['Apply Internship','/internships'],['Verify Certificate','/verify-certificate'],['Internship Documents','/documents']]],
  ['Company',[['About DInterns','/about'],['Contact Us','/contact'],...legalLinks]],
  ['Resources',[['Internship Guidelines','/guidelines'],['Frequently Asked Questions','/contact#faq'],['Student Dashboard','/student'],['Certificate Verification','/verify-certificate'],['Payment & Refund Policy','/refunds']]],
] as const;
function Footer(){return <footer className="footer">
  <div className="container footer-grid"><div><Brand light/><p>Empowering students through accessible virtual internships, practical projects and skill development.</p></div>
  {footerGroups.map(([group,links])=><div key={group}><h3>{group}</h3>{links.map(([title,to])=><Link key={title} to={to}>{title}</Link>)}</div>)}
  <div><h3>Contact Us</h3><span><MapPin size={16}/>Delhi, India</span><a href={siteUrl}><Globe size={16}/>{new URL(siteUrl).hostname}</a></div></div>
  <div className="container footer-bottom"><span>© {new Date().getFullYear()} DInterns. All rights reserved.</span><div><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms &amp; Conditions</Link><Link to="/cookies">Cookies Policy</Link></div></div>
</footer>;}
const studentNav=[['Overview','overview',LayoutDashboard],['Joined Internships','internships',BriefcaseBusiness],['Skill Certification','/skill-certification',Award],['Verify Certificate','/verify-certificate',ShieldCheck],['Help & Support','support',LifeBuoy],['Profile','profile',UserRound]] as const;
const adminNav=[['Overview','overview',LayoutDashboard],['Internship Applications','applications',ClipboardList],['Task Submissions','submissions',FolderKanban],['Users & Management','users',UsersRound],['Internship Domains','domains',BriefcaseBusiness],['Manage Examinations','examinations',ClipboardList],['Reviews','reviews',Star],['Support Requests','support',LifeBuoy],['Support Mails','support-mails',Mail],['Send Mail','send-mail',Mail],['Send Notifications','notifications',Bell],['Payments','payments',CreditCard],['Promo Codes','promos',TicketPercent],['Certificates','certificates',Award],['College Coordinators','coordinators',GraduationCap],['Settings','settings',Settings]] as const;
const coordinatorNav=[['Overview','overview',LayoutDashboard],['Student Dashboard','/student',GraduationCap],['Help & Support','/student/support',LifeBuoy]] as const;
export function DashboardLayout({role}:{role:'student'|'coordinator'|'admin'}){
  const account=useAccount(),location=useLocation(),navigate=useNavigate();
  const [drawer,setDrawer]=useState(false);
  const {error,busy,logout}=useLogout();
  const user=account.data;
  useEffect(()=>{setDrawer(false);},[location]);
  useEffect(()=>{if(account.isSuccess&&!user)navigate('/login?next='+encodeURIComponent(location.pathname+location.search),{replace:true});},[account.isSuccess,user,location,navigate]);
  if(account.error)return <div className="container content-page"><Fault error={account.error} retry={account.refetch}/></div>;
  if(account.isPending||!user)return <Loader/>;
  if(user.role!==role&&!(role==='student'&&user.role==='coordinator'))return <div className="container content-page"><h1>Access restricted</h1><Link className="btn primary" to={'/'+user.role}>Go to your dashboard</Link></div>;
  const nav=role==='admin'?adminNav:role==='coordinator'?coordinatorNav:user.role==='coordinator'?[...studentNav,['Coordinator Dashboard','/coordinator',GraduationCap] as const]:studentNav;
  return <div className="dashboard">
    <a href="#dashboard-main" className="skip">Skip to dashboard content</a>
    {drawer&&<button type="button" className="drawer-scrim" aria-label="Close sidebar" onClick={()=>setDrawer(false)}/>}
    <aside className={'sidebar '+(drawer?'shown':'')}><Brand light/><div className="sidebar-label">{role==='admin'?'Administration':dashboardLabel[role]}</div><nav aria-label={role+' navigation'}>
      {nav.map(([label,path,Icon])=><NavLink key={path} to={path.startsWith('/')?path:'/'+role+'/'+path}><Icon size={18}/>{label}</NavLink>)}
    </nav><button className="sidebar-logout" onClick={logout} disabled={busy}><LogOut size={18}/>Logout</button></aside>
    <div className="dashboard-main"><header className="dash-top"><div><button className="icon-btn mobile-trigger" onClick={()=>setDrawer(!drawer)} aria-label="Toggle sidebar"><Menu size={22}/></button><Link to="/">DInterns home</Link></div><div><Notifications/><span className="avatar">{initials(user.fullName)}</span><strong className="dash-name">{user.fullName}</strong></div></header>
    <main id="dashboard-main" className="dash-content">{error!=null&&<Fault error={error}/>}<Outlet/></main></div>
  </div>;
}
