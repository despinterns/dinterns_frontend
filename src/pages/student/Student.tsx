import {useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {Award,BriefcaseBusiness,ClipboardList,Clock,GraduationCap} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {useAccount,useAction,useData} from '../../api/client';
import {Badge,Button,Empty,Fault,Field,formData,Loader,PageHeading,Pagination,Status,value} from '../../components/ui';
import {day,durationLabel,type Page,type Row} from '../../types';
const stats=[
  ['applied','Total Internships Applied',ClipboardList],['pending','Applications Under Review',Clock],['active','Active Internships',BriefcaseBusiness],
  ['completed','Completed Internships',GraduationCap],['unlocked','Certificates Unlocked',Award],
] as const;
function Enrollments({rows}:{rows:Row[]}){
  return <div className="card-grid">{rows.map(row=>{
    const progress=row.completedAt?100:row.certificateStatus==='issued'?92:row.certificatePaymentStatus==='paid'?82:row.submissionStatus==='approved'?72:row.latestSubmissionId?58:row.taskDocumentAccessedAt?46:row.offerLetterAccessedAt?36:row.rulesAcceptedAt?25:row.approvedAt?18:8;
    return <article className="domain-card" key={row._id}>{row.imageUrl?<img className="domain-image student-img" src={row.imageUrl} alt="" loading="lazy"/>:<div className="domain-image domain-art student-img"><BriefcaseBusiness size={28}/></div>}
      <div className="domain-body"><Badge>{row.internshipStatus}</Badge><h2>{row.domainName}</h2><p>{row.studentInternshipId} · {durationLabel(row)}</p><p>{row.startDate?'Joining date '+day(row.startDate):'Applied '+day(row.applicationDate)}{row.endDate&&' · End date '+day(row.endDate)}</p>
      <progress max={100} value={progress} aria-label="Internship progress"/><Link className="btn secondary" to={'/student/internships/'+row._id}>Track Internship</Link></div></article>;
  })}</div>;
}
export function Overview(){
  const account=useAccount(),q=useData<{stats:Record<string,number>;recent:Row[]}>('/student/dashboard',true,25000);
  return <><PageHeading title={'Welcome, '+(account.data?.fullName.split(' ')[0]||'student')}>Track your applications, projects and certificates from your dashboard.</PageHeading>
    {q.isPending&&<Loader/>}{q.error&&<Fault error={q.error} retry={q.refetch}/>}
    {q.data&&<><div className="stat-grid">{stats.map(([key,label,Icon])=><article className="panel stat" key={key}><span className="icon-tile"><Icon size={19}/></span><strong>{q.data!.stats[key]??0}</strong><span>{label}</span></article>)}</div><div className="section-title section-row"><h2>Recent internship activity</h2><Link className="btn secondary" to="/student/internships">Joined Internships</Link></div>
    {q.data.recent.length?<Enrollments rows={q.data.recent}/>:<Empty title="Start your first internship"><Link className="btn primary" to="/internships">Explore Internships</Link></Empty>}</>}
  </>;
}
export function Joined(){
  const [page,setPage]=useState(1),q=useData<Page>('/student/enrollments?page='+page);
  return <><PageHeading title="Joined Internships">View and track every internship you’ve applied for.</PageHeading>{q.isPending&&<Loader/>}{q.error&&<Fault error={q.error} retry={q.refetch}/>}
    {q.data&&<>{q.data.total?<Enrollments rows={q.data.items}/>:<Empty title="No applications yet"><Link className="btn primary" to="/internships">Explore Internships</Link></Empty>}<Pagination page={q.data} change={setPage}/></>}</>;
}
export function Profile(){
  const q=useData<Row>('/student/profile'),profile=useAction(['/student/profile','account']),password=useAction(),client=useQueryClient(),navigate=useNavigate();
  return <><PageHeading title="Profile">Manage your account details and password.</PageHeading>{q.isPending&&<Loader/>}{q.error&&<Fault error={q.error} retry={q.refetch}/>}
  {q.data&&<div className="two-grid"><section className="panel form-panel"><h2>Account details</h2><form className="form-stack" onSubmit={event=>{
    const form=formData(event);profile.mutate({path:'/student/profile',method:'PATCH',body:{fullName:value(form,'name'),email:value(form,'email'),currentPassword:value(form,'currentPassword')}});
  }}><Field label="Full name"><input name="name" defaultValue={q.data.fullName} required maxLength={100}/></Field>
    <Field label={'Email address'+(q.data.emailVerified?'':' · Unverified')}><input type="email" name="email" defaultValue={q.data.email} required/></Field>
    {!q.data.emailVerified&&<p>To verify this address for email updates, complete <Link to="/recover">password reset by email</Link>.</p>}
    <Field label="Current password (required for email changes)"><input type="password" name="currentPassword" autoComplete="current-password"/></Field>
    <Field label={'Mobile number'+(q.data.mobileVerified?'':' · Unverified')}><input value={q.data.mobileNumber} readOnly/></Field>
    <p>Registered {day(q.data.createdAt)}</p>{profile.error&&<Fault error={profile.error}/>}
    {profile.isSuccess&&<Status>Profile saved.</Status>}<Button type="submit" busy={profile.isPending}>Save Profile</Button></form></section>
    <section className="panel form-panel"><h2>Change password</h2><form className="form-stack" onSubmit={event=>{
      const form=formData(event);password.mutate({path:'/auth/change-password',body:{currentPassword:value(form,'current'),password:value(form,'password')}},{onSuccess:async()=>{
        await client.cancelQueries();client.clear();client.setQueryData(['account'],null);navigate('/login');
      }});
    }}><Field label="Current password"><input required name="current" type="password" autoComplete="current-password"/></Field><Field label="New password"><input required minLength={12} maxLength={72} name="password" type="password" autoComplete="new-password"/></Field><p>Use 12 or more characters, including uppercase, lowercase, a number and a symbol.</p>{password.error&&<Fault error={password.error}/>}<Button type="submit" busy={password.isPending}>Change Password</Button></form>
    <hr/><h2>Internship history</h2><dl className="details">{stats.filter(([key])=>['applied','completed','unlocked'].includes(key)).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{q.data!.stats[key]}</dd></div>)}</dl>
    <ul>{q.data.ids.map((row:Row)=><li key={row._id}><Link to={'/student/internships/'+row._id}>{row.domainName} · {row.studentInternshipId}</Link></li>)}</ul></section></div>}
  </>;
}
