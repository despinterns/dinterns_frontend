import {lazy,Suspense,useEffect,useState} from 'react';
import {BrowserRouter,Link,Navigate,Route,Routes,useLocation} from 'react-router-dom';
import {PublicLayout,DashboardLayout} from './components/Layout';
import {Loader,ToastRegion} from './components/ui';
import {pageTitle} from './seo';
import type {Section} from './pages/admin/Admin';
const Home=lazy(()=>import('./pages/public/Home'));
const Internships=lazy(()=>import('./pages/public/Internships'));
const Verify=lazy(()=>import('./pages/public/Verify'));
const SkillCertification=lazy(()=>import('./pages/public/SkillCertification'));
const ExaminationAttempt=lazy(()=>import('./pages/public/SkillCertification').then(module=>({default:module.ExaminationAttempt})));
const Auth=lazy(()=>import('./pages/auth/Auth'));
const Track=lazy(()=>import('./pages/student/Track'));
const Overview=lazy(()=>import('./pages/student/Student').then(module=>({default:module.Overview})));
const Joined=lazy(()=>import('./pages/student/Student').then(module=>({default:module.Joined})));
const Profile=lazy(()=>import('./pages/student/Student').then(module=>({default:module.Profile})));
const Contact=lazy(()=>import('./pages/public/Resources').then(module=>({default:module.Contact})));
const Documents=lazy(()=>import('./pages/public/Resources').then(module=>({default:module.Documents})));
const Policy=lazy(()=>import('./pages/public/Resources').then(module=>({default:module.Policy})));
const SendNotifications=lazy(()=>import('./components/Inbox').then(module=>({default:module.SendNotifications})));
const StudentSupport=lazy(()=>import('./components/Inbox').then(module=>({default:module.StudentSupport})));
const AdminOverview=lazy(()=>import('./pages/admin/Admin').then(module=>({default:module.AdminOverview})));
const AdminList=lazy(()=>import('./pages/admin/Admin').then(module=>({default:module.AdminList})));
const AdminSettings=lazy(()=>import('./pages/admin/Admin').then(module=>({default:module.AdminSettings})));
const AdminPromos=lazy(()=>import('./pages/admin/Promos'));
const AdminExaminations=lazy(()=>import('./pages/admin/Examinations'));
const SupportMails=lazy(()=>import('./pages/admin/SupportMails'));
const CoordinatorApplication=lazy(()=>import('./pages/Coordinators').then(module=>({default:module.CoordinatorApplication})));
const CoordinatorDashboard=lazy(()=>import('./pages/Coordinators').then(module=>({default:module.CoordinatorDashboard})));
const AdminCoordinators=lazy(()=>import('./pages/Coordinators').then(module=>({default:module.AdminCoordinators})));
const sections:Section[]=['applications','submissions','users','domains','reviews','support','payments','certificates'];
const policies=['terms','privacy','cookies','refunds','guidelines','about'] as const;
function ContactRedirect(){
  const {search,hash}=useLocation();
  return <Navigate to={'/contact'+search+hash} replace/>;
}
function RouteEffects(){
  const {pathname,hash}=useLocation();
  const [online,setOnline]=useState(navigator.onLine);
  useEffect(()=>{document.title=pageTitle(pathname);},[pathname]);
  useEffect(()=>{
    if(hash){const target=()=>document.getElementById(hash.slice(1))?.scrollIntoView();const timer=setTimeout(target,170);return()=>clearTimeout(timer);}
    window.scrollTo(0,0);
  },[pathname,hash]);
  useEffect(()=>{
    const update=()=>setOnline(navigator.onLine);
    window.addEventListener('online',update);window.addEventListener('offline',update);
    return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[]);
  return online?null:<div className="offline" role="status">You’re offline. Reconnect to load updates.</div>;
}
export default function App(){
  return <BrowserRouter><RouteEffects/><ToastRegion/><Suspense fallback={<Loader text="Loading page…"/>}><Routes>
    <Route element={<PublicLayout/>}>
      <Route index element={<Home/>}/><Route path="internships" element={<Internships/>}/><Route path="verify-certificate" element={<Verify/>}/>
      <Route path="skill-certification" element={<SkillCertification/>}/><Route path="skill-certification/attempts/:attemptId" element={<ExaminationAttempt/>}/>
      <Route path="college-coordinator" element={<CoordinatorApplication/>}/>
      <Route path="documents" element={<Documents/>}/><Route path="contact" element={<Contact/>}/><Route path="help" element={<ContactRedirect/>}/>
      {policies.map(policy=><Route key={policy} path={policy} element={<Policy policy={policy}/>}/>)}
      <Route path="login" element={<Auth key="login" mode="login"/>}/><Route path="signup" element={<Auth key="signup" mode="signup"/>}/><Route path="recover" element={<Auth key="recover" mode="recover"/>}/>
      <Route path="*" element={<div className="container content-page"><h1>Page not found</h1><Link className="btn primary" to="/">Return Home</Link></div>}/>
    </Route>
    <Route path="student" element={<DashboardLayout role="student"/>}>
      <Route index element={<Navigate to="overview" replace/>}/><Route path="overview" element={<Overview/>}/>
      <Route path="internships" element={<Joined/>}/><Route path="internships/:enrollmentId" element={<Track/>}/>
      <Route path="messages" element={<Navigate to="/student/overview" replace/>}/><Route path="support" element={<StudentSupport/>}/><Route path="profile" element={<Profile/>}/>
    </Route>
    <Route path="coordinator" element={<DashboardLayout role="coordinator"/>}>
      <Route index element={<Navigate to="overview" replace/>}/><Route path="overview" element={<CoordinatorDashboard/>}/>
    </Route>
    <Route path="admin" element={<DashboardLayout role="admin"/>}>
      <Route index element={<Navigate to="overview" replace/>}/><Route path="overview" element={<AdminOverview/>}/>
      <Route path="examinations" element={<AdminExaminations/>}/>
      <Route path="support-mails" element={<SupportMails/>}/>
      <Route path="promos" element={<AdminPromos/>}/>
      {sections.map(section=><Route key={section} path={section} element={<AdminList key={section} section={section}/>}/>)}
      <Route path="messages" element={<Navigate to="/admin/notifications" replace/>}/><Route path="notifications" element={<SendNotifications/>}/><Route path="settings" element={<AdminSettings/>}/><Route path="coordinators" element={<AdminCoordinators/>}/>
    </Route>
  </Routes></Suspense></BrowserRouter>;
}
