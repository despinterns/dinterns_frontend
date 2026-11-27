import {useState,type ReactNode} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ChartNoAxesColumnIncreasing,Eye,Plus,Search} from 'lucide-react';
import {openPdf,useAction,useData} from '../../api/client';
import {MessageComposer,supportCategories,TicketView,ticketStatuses} from '../../components/Inbox';
import {Badge,Button,Empty,Fault,Field,formData,Loader,Modal,PageHeading,Pagination,Status,useDebounced,value} from '../../components/ui';
import {day,rupees,type Domain,type Page,type Row} from '../../types';

type Column=[string,(row:Row)=>ReactNode];
const badge=(key:string)=>(row:Row)=><Badge>{row[key]??'—'}</Badge>;
const dateColumn=(key:string)=>(row:Row)=>day(row[key]);
const sections={
  applications:{title:'Review Internship Applications',path:'/applications',description:'Review student profiles and decide which applications advance.',status:['pending','approved','rejected'],columns:[
    ['Student',r=>r.applicationDetails.fullName],['Internship ID',r=>r.studentInternshipId],['Mobile',r=>r.applicationDetails.mobileNumber],['Email',r=>r.applicationDetails.email],['College',r=>r.applicationDetails.college],['Course',r=>r.applicationDetails.course],['Year',r=>r.applicationDetails.courseYear],['Domain',r=>r.domainName],['Applied',dateColumn('applicationDate')],['Status',badge('applicationStatus')],
  ]},
  submissions:{title:'Task Submission Applications',path:'/submissions',description:'Evaluate submitted projects, record feedback and request revisions.',status:['pending','approved','revision','rejected'],columns:[
    ['Student',r=>r.enrollment?.applicationDetails.fullName],['Certificate name',r=>r.certificateName],['Internship ID',r=>r.enrollment?.studentInternshipId],['Domain',r=>r.enrollment?.domainName],['Tasks',r=>r.taskLinks.length],['Submitted',dateColumn('submittedAt')],['Status',badge('status')],
  ]},
  users:{title:'Users & Management',path:'/users',description:'View account and internship histories, suspend or restore student access.',status:['active','suspended'],columns:[
    ['Name',r=>r.fullName],['Email',r=>r.email],['Mobile',r=>r.mobileNumber],['Role',r=><Badge>{r.role}</Badge>],['Registered',dateColumn('createdAt')],['Applications',r=>r.stats.applied],['Completed',r=>r.stats.completed],['Status',badge('accountStatus')],
  ]},
  domains:{title:'Manage Internship Domains',path:'/domains',description:'Configure domains and upload versioned internship tasks.',status:['active','inactive','archived'],columns:[
    ['Domain',r=>r.domainName],['Code',r=>r.domainCode],['Category',r=>r.category],['Duration',()=> '1 month'],['Tasks',r=>r.totalTasks],['Minimum',r=>r.minimumRequiredTasks],['Version',r=>r.version],['Status',badge('status')],
  ]},
  reviews:{title:'Reviews',path:'/reviews',description:'Moderate student reviews while keeping certificate access independent.',status:['pending','approved','hidden','removed'],columns:[
    ['Student',r=>r.displayName],['Domain',r=>r.domainName],['Rating',r=>r.rating+' / 5'],['Review',r=><span className="table-excerpt">{r.text}</span>],['Submitted',dateColumn('createdAt')],['Consent',r=>r.consent?'Yes':'No'],['Moderation',badge('moderation')],
  ]},
  support:{title:'Help & Support Requests',path:'/support/tickets',description:'Reply to students and manage request status and priority.',status:ticketStatuses,columns:[
    ['Ticket',r=>r.ticketId],['Student',r=>r.studentName],['Subject',r=>r.subject],['Category',r=>r.category],['Priority',r=>r.priority],['Created',dateColumn('createdAt')],['Status',badge('status')],
  ]},
  payments:{title:'Payments',path:'/payments',description:'Review verified transactions and reconcile certificates with the payment gateway.',status:['created','pending','paid','failed','cancelled','refunded'],columns:[
    ['Student',r=>r.candidateName],['Internship ID',r=>r.studentInternshipId],['Domain',r=>r.domainName],['Order ID',r=>r.gatewayOrderId],['Payment ID',r=>r.gatewayPaymentId],['Amount',r=>rupees(r.amountInPaise)],['Verified',dateColumn('verifiedAt')],['Payment status',badge('status')],['Certificate',r=>r.enrollment?.certificateStatus??'—'],
  ]},
  certificates:{title:'Certificates',path:'/certificates',description:'Inspect, revoke and reissue completion certificates.',status:['issued','revoked'],columns:[
    ['Candidate',r=>r.candidateName],['Certificate ID',r=>r.certificateId],['Domain',r=>r.domainName],['Issued',dateColumn('issueDate')],['Payment',r=>r.enrollment?.certificatePaymentStatus??'See Payments'],['Status',badge('status')],
  ]},
} satisfies Record<string,{title:string;path:string;description:string;status:string[];columns:Column[]}>;
export type Section=keyof typeof sections;
const iso=(date?:string)=>date?.slice(0,10)||'';
function Details({entries}:{entries:[string,ReactNode][]}){
  return <dl className="details">{entries.map(([label,val])=><div key={label}><dt>{label}</dt><dd>{val??'—'}</dd></div>)}</dl>;
}
export function AdminOverview(){
  const [testMode,setTestMode]=useState(false);
  const paymentMode=testMode?'test':'live';
  const q=useData<{stats:{label:string;value:number}[];charts:Record<string,{_id:string;value:number}[]>}>('/admin/dashboard?paymentMode='+paymentMode,true,30000);
  return <><PageHeading title="Admin Overview">Monitor programme activity, payments and support requests.</PageHeading>
    <div className="actions inbox-actions">
      <Field label="Payment reporting mode"><select value={paymentMode} onChange={event=>setTestMode(event.target.value==='test')}>
        <option value="live">Live payments</option><option value="test">Test payments</option>
      </select></Field>
    </div>
    {q.isPending&&<Loader/>}{q.error&&<Fault error={q.error} retry={q.refetch}/>}
    {q.data&&<><div className="stat-grid">{q.data.stats.map(({label,value})=><article className="panel stat" key={label}><span className="icon-tile"><ChartNoAxesColumnIncreasing size={19}/></span><strong>{label==='Certificate revenue'?rupees(Math.round(value*100)):Number(value).toLocaleString('en-IN',{maximumFractionDigits:1})}</strong><span>{testMode&&label==='Certificate revenue'?'Test payment value':label}</span></article>)}</div>
      <div className="two-grid chart-grid">{Object.entries(q.data.charts).map(([title,items])=><section className="panel chart" key={title}><h2>{testMode&&title==='Monthly revenue (₹)'?'Monthly test payments (₹)':title}</h2>{items.length?<div className="chart-series">{items.map(item=><div className="bar-row" key={item._id}><span>{item._id}</span><div className="bar-track"><div className="bar-fill" style={{width:(100*item.value/Math.max(1,...items.map(row=>row.value)))+'%'}}/></div><strong>{item.value.toLocaleString('en-IN')}</strong></div>)}</div>:<p>No records yet.</p>}</section>)}</div>
    </>}
  </>;
}
export function AdminList({section}:{section:Section}){
  const config=sections[section];
  const [params,setParams]=useSearchParams(),[page,setPage]=useState(1),[search,setSearch]=useState(''),[status,setStatus]=useState(''),[sort,setSort]=useState('newest'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[domain,setDomain]=useState(''),[category,setCategory]=useState('');
  const q=useDebounced(search),record=params.get('record'),creating=params.get('new')==='1';
  const args=new URLSearchParams({page:String(page),q,status,sort});
  for(const [name,val] of Object.entries({from,to,domain,category}))if(val)args.set(name,val);
  const list=useData<Page>('/admin'+config.path+'?'+args);
  const activeDomains=useData<Domain[]>('/admin/domain-options',section==='applications'||section==='submissions');
  function update(setter:(value:string)=>void,val:string){setter(val);setPage(1);}
  const close=()=>setParams({});
  return <><PageHeading title={config.title}>{config.description}</PageHeading>
    {section==='domains'&&<div className="actions inbox-actions"><Button onClick={()=>setParams({new:'1'})}><Plus size={18}/>Create Domain</Button></div>}
    <div className="panel admin-list">
      <div className="filter-bar"><label className="search-field"><Search size={19}/><input type="search" aria-label="Search records" placeholder="Search records…" value={search} onChange={event=>update(setSearch,event.target.value)}/></label>
        <select aria-label="Status" value={status} onChange={event=>update(setStatus,event.target.value)}><option value="">All statuses</option>{config.status.map(item=><option key={item}>{item}</option>)}</select>
        {(section==='applications'||section==='submissions')&&<select aria-label="Domain" value={domain} onChange={event=>update(setDomain,event.target.value)}><option value="">All domains</option>{activeDomains.data?.map(item=><option key={item._id} value={item._id}>{item.domainName}</option>)}</select>}
        {section==='support'&&<select aria-label="Category" value={category} onChange={event=>update(setCategory,event.target.value)}><option value="">All categories</option>{supportCategories.map(item=><option key={item}>{item}</option>)}</select>}
        {['applications','payments','certificates'].includes(section)&&<div className="date-filters"><label>From <input type="date" value={from} max={to||undefined} onChange={event=>update(setFrom,event.target.value)}/></label><label>To <input type="date" value={to} min={from||undefined} onChange={event=>update(setTo,event.target.value)}/></label></div>}
        <select aria-label="Sort" value={sort} onChange={event=>update(setSort,event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
        <Button variant="ghost" onClick={()=>{setSearch('');setStatus('');setSort('newest');setFrom('');setTo('');setDomain('');setCategory('');setPage(1);}}>Clear Filters</Button>
      </div>
      {list.isPending&&<Loader/>}{list.error&&<Fault error={list.error} retry={list.refetch}/>}
      {list.data?.total===0&&<Empty title="No matching records"/>}
      {Boolean(list.data?.items.length)&&<div className="table-scroll" tabIndex={0} aria-label={config.title+' table'}><table><thead><tr>{config.columns.map(([label])=><th key={label}>{label}</th>)}<th>Actions</th></tr></thead><tbody>
        {list.data!.items.map(row=><tr key={row._id}>{config.columns.map(([label,render])=><td key={label}>{render(row)??'—'}</td>)}<td><Button variant="ghost" onClick={()=>setParams({record:row._id})}>View Details</Button></td></tr>)}
      </tbody></table></div>}
      {list.data&&<Pagination page={list.data} change={setPage}/>}
    </div>
    {section==='domains'&&(record||creating)&&<DomainForm key={record??'new'} id={record??undefined} close={close}/>}
    {section==='support'&&record&&<TicketView key={record} id={record} admin close={close}/>}
    {section==='reviews'&&record&&<ReviewDetail row={list.data?.items.find(item=>item._id===record)} close={close}/>}
    {!['domains','support','reviews'].includes(section)&&record&&<RecordDetail key={record} section={section as 'applications'|'submissions'|'users'|'payments'|'certificates'} id={record} close={close}/>}
  </>;
}

function DomainForm({id,close}:{id?:string;close:()=>void}){
  const path='/admin/domains'+(id?'/'+id:'');
  const q=useData<Row>(path,Boolean(id)),action=useAction(['/admin/domains','/admin/dashboard','/internships']);
  const [preview,setPreview]=useState(''),[progress,setProgress]=useState<number|null>(null),[fileError,setFileError]=useState(''),[domainAction,setDomainAction]=useState<'archive'|'delete'|null>(null);
  const row=q.data;
  return <Modal title={id?(row?.domainName??'Internship Domain'):'Create Domain'} close={close}>
    {id&&q.isPending&&<Loader/>}{q.error&&<Fault error={q.error} retry={q.refetch}/>}
    {(!id||row)&&<form className="form-stack" onSubmit={event=>{
      const data=formData(event);
      action.reset();
      const task=data.get('tasks');
      const image=data.get('image');
      if(task instanceof File&&task.size>0&&(!/\.pdf$/i.test(task.name)||task.size>10*1024*1024)){
        setFileError('Choose a .pdf task document that is 10 MB or smaller.');
        return;
      }
      if(image instanceof File&&image.size>5*1024*1024){
        setFileError('Choose a domain image that is 5 MB or smaller.');
        return;
      }
      setFileError('');
      for(const name of ['image','tasks']){const file=data.get(name);if(file instanceof File&&!file.size)data.delete(name);}
      setProgress(0);action.mutate({path,method:id?'PATCH':'POST',body:data,progress:setProgress},{onSuccess:close,onSettled:()=>setProgress(null)});
    }}>
      <div className="form-grid">
        <Field label="Domain Name"><input name="domainName" required minLength={2} maxLength={100} defaultValue={row?.domainName}/></Field>
        <Field label="Domain Code"><input name="domainCode" required pattern="[A-Z0-9]{2,8}" title="2–8 uppercase letters or numbers" defaultValue={row?.domainCode}/></Field>
        <Field label="Category"><input name="category" required minLength={2} maxLength={80} defaultValue={row?.category}/></Field>
        <Field label="Internship Duration"><input value="1 month" readOnly/></Field>
        <Field label="Total Tasks"><input name="totalTasks" type="number" min={2} max={20} required defaultValue={row?.totalTasks??4}/></Field>
        <Field label="Minimum Required Tasks"><input name="minimumRequiredTasks" type="number" min={2} max={20} required defaultValue={row?.minimumRequiredTasks??2}/></Field>
      </div><Field label="Description"><textarea name="description" minLength={10} maxLength={2500} required defaultValue={row?.description}/></Field>
      <Field label={id?'Replace Domain Image':'Domain Image'}><input name="image" type="file" accept="image/png,image/jpeg,image/webp" required={!id} onChange={e=>{
        if(preview)URL.revokeObjectURL(preview);const file=e.target.files?.[0];setPreview(file?URL.createObjectURL(file):'');
      }}/></Field>
      {(preview||row?.imageUrl)&&<img className="upload-preview" src={preview||row?.imageUrl} alt="Domain image preview"/>}
      <Field label={id?'Replace Task PDF':'Task PDF'}><input name="tasks" type="file" accept=".pdf,application/pdf" required={!id} onChange={event=>{
        const file=event.target.files?.[0];
        if(file&&(!/\.pdf$/i.test(file.name)||file.size>10*1024*1024)){
          event.currentTarget.value='';
          setFileError('Choose a .pdf task document that is 10 MB or smaller.');
        }else setFileError('');
      }}/><small>PDF only, up to 10 MB.</small></Field>
      <Field label="Status"><select name="status" defaultValue={row?.status??'inactive'}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></Field>
      {fileError&&<div className="fault" role="alert">{fileError}</div>}
      {progress!=null&&<div><progress max={100} value={progress} aria-label="Upload progress"/><p>{progress===100?'Processing uploaded files…':progress+'% uploaded'}</p></div>}
      {action.error&&<Fault error={action.error}/>}<div className="actions"><Button type="submit" busy={action.isPending}>{id?'Save Domain':'Create Domain'}</Button>{id&&row?.status!=='archived'&&<Button type="button" variant="danger" onClick={()=>setDomainAction('archive')}>Archive Domain</Button>}{id&&row?.status==='archived'&&<Button type="button" variant="danger" onClick={()=>setDomainAction('delete')}>Delete Unused Domain</Button>}</div>
      {domainAction&&<div className="info">{domainAction==='archive'?'Archive this domain and close it to new applicants?':'Permanently delete this domain? This is only available for domains without enrollments.'} <Button type="button" variant="danger" busy={action.isPending} onClick={()=>action.mutate({path:path+(domainAction==='delete'?'?permanent=1':''),method:'DELETE'},{onSuccess:close})}>{domainAction==='delete'?'Confirm Delete':'Confirm Archive'}</Button><Button type="button" variant="ghost" onClick={()=>setDomainAction(null)}>Cancel</Button></div>}
      {Boolean(row?.versions?.length)&&<details><summary>Configuration history</summary><ul>{row?.versions.map((version:Row)=><li key={version._id}>Version {version.version} · {day(version.createdAt)} · {version.totalTasks} tasks · {version.durationMonths===1?'1 month':version.durationWeeks+' weeks'}</li>)}</ul></details>}
    </form>}
  </Modal>;
}
function ReviewDetail({row,close}:{row?:Row;close:()=>void}){
  const action=useAction(['/admin/reviews','/reviews/public']);
  return <Modal title="Review Details" close={close}>{!row?<Empty title="Review unavailable on this page"/>:<>
    <Details entries={[[ 'Student',row.displayName],['Domain',row.domainName],['Rating',row.rating+' / 5'],['Written review',row.text],['Experience',row.experience],['Suggestions',row.suggestions||'—'],['Publication consent',row.consent?'Yes':'No'],['Status',<Badge>{row.moderation}</Badge>]]}/>
    <div className="actions">{(['approved','hidden','removed'] as const).map((moderation,index)=><Button key={moderation} variant={index===0?'primary':index===1?'secondary':'danger'} disabled={action.isPending||row.moderation===moderation||(index===0&&!row.consent)} onClick={()=>action.mutate({path:'/admin/reviews/'+row._id+'/moderation',method:'PATCH',body:{moderation}})}>{['Approve for Publication','Hide Review','Remove Review'][index]}</Button>)}</div>
    {action.error&&<Fault error={action.error}/>}
    {row.enrollment&&<Link to={'/admin/applications?record='+row.enrollment._id}>View Related Internship</Link>}
  </>}</Modal>;
}
function PerformanceField(){
  return <Field label="Certificate performance"><select name="performance" required defaultValue="">
    <option value="" disabled>Select performance</option><option value="Good">Good</option><option value="Excellent">Excellent</option>
  </select></Field>;
}
type DetailSection='applications'|'submissions'|'users'|'payments'|'certificates';
function RecordDetail({section,id,close}:{section:DetailSection;id:string;close:()=>void}){
  const path='/admin'+sections[section].path+'/'+id;
  const q=useData<Row>(path),action=useAction(['/admin'+sections[section].path,'/admin/dashboard']);
  const [mode,setMode]=useState(''),[decision,setDecision]=useState(''),[error,setError]=useState<unknown>(null),[pdfBusy,setPdfBusy]=useState(false);
  const row=q.data;
  function doAction(sub:string,body?:unknown,method='POST'){action.mutate({path:path+sub,method,body},{onSuccess:()=>setMode('')});}
  function change(value:string){action.reset();setMode(value);}
  const title={applications:'Application Details',submissions:'Submission Details',users:'Account Details',payments:'Transaction Details',certificates:'Certificate Details'}[section];
  let content:ReactNode=null;
  if(row&&section==='applications'){
    const app=row.applicationDetails;
    content=<><Details entries={[[ 'Student',app.fullName],['Internship ID',row.studentInternshipId],['Email',app.email],['Mobile number',app.mobileNumber],['Gender',app.gender],['College',app.college],['Course',app.course],['Year',app.courseYear],['Domain',row.domainName],['Application status',<Badge>{row.applicationStatus}</Badge>],['Progress',row.internshipStatus],['Start date',day(row.startDate)],['End date',day(row.endDate)],['Rejection reason',row.decisionReason]]}/>
      <div className="actions">{row.applicationStatus==='pending'&&<><Button onClick={()=>change('approve')}>Approve</Button><Button variant="danger" onClick={()=>change('reject')}>Reject</Button><Button variant="secondary" onClick={()=>change('clarification')}>Request Clarification</Button></>}
      {['Rules Acceptance Pending','Internship In Progress','Revision Required'].includes(row.internshipStatus)&&<Button variant="secondary" onClick={()=>change('linkedin-alternative')}>Approve LinkedIn Alternative</Button>}
      {row.internshipStatus==='Review Pending'&&<Button variant="secondary" onClick={()=>change('review-assistance')}>Support-Assisted Certificate Access</Button>}
      <Button variant="secondary" onClick={()=>change('message')}>Send Notification</Button></div>
      {mode==='approve'&&<div className="info">The internship runs for one month from the student’s application date.<Button busy={action.isPending} onClick={()=>doAction('/approve',{})}>Confirm Approval</Button></div>}
      {['reject','linkedin-alternative','review-assistance'].includes(mode)&&<form className="form-stack" onSubmit={event=>{const form=formData(event);doAction('/'+mode,mode==='linkedin-alternative'?{instructions:value(form,'reason')}:{reason:value(form,'reason'),...(mode==='reject'?{reapply:form.has('reapply')}:{})});}}>
      <Field label={mode==='linkedin-alternative'?'Alternative submission instructions':'Reason'}><textarea name="reason" required minLength={mode==='reject'?3:5} maxLength={mode==='reject'?2000:1000}/></Field>
      {mode==='reject'&&<label className="checkbox"><input type="checkbox" name="reapply"/>Allow the student to reapply</label>}<Button type="submit" busy={action.isPending}>Confirm</Button></form>}
    </>;
  }
  if(row&&section==='submissions'){
    const enrollment=row.enrollment;
    content=<><Details entries={[[ 'Student',enrollment?.applicationDetails.fullName],['Certificate name',row.certificateName],['Internship ID',enrollment?.studentInternshipId],['Domain',enrollment?.domainName],['Start date',day(enrollment?.startDate)],['End date',day(enrollment?.endDate)],['Status',<Badge>{row.status}</Badge>],['Feedback',row.feedback],['Certificate performance',row.performance],['Offer letter link',row.linkedinPostLink?<a href={row.linkedinPostLink} target="_blank" rel="noopener noreferrer">Open Offer Letter Link</a>:row.linkedinAlternative]]}/>
    <form className="form-stack" onSubmit={event=>{
      const form=formData(event);doAction('/review',{decision:value(form,'decision'),performance:value(form,'performance')||undefined,feedback:value(form,'feedback'),tasks:row.taskLinks.map((_:unknown,index:number)=>value(form,'task'+index))});
    }}>
    {row.taskLinks.map((url:string,index:number)=><div className="form-grid task-evaluation" key={url}><a href={url} target="_blank" rel="noopener noreferrer">Open Task {index+1} Project</a>
      {row.status==='pending'?<Field label={'Task '+(index+1)+' evaluation'}><select name={'task'+index} required defaultValue=""><option value="" disabled>Select evaluation</option>{['Accepted','Rejected','Needs Improvement'].map(option=><option key={option}>{option}</option>)}</select></Field>:<span>{row.evaluation?.tasks[index]}</span>}</div>)}
    {row.status==='pending'&&<><Field label="Overall feedback"><textarea name="feedback" minLength={3} maxLength={2000} required/></Field><Field label="Decision"><select name="decision" required value={decision} onChange={event=>setDecision(event.target.value)}><option value="" disabled>Select a decision</option><option value="approved">Approve Submission</option><option value="rejected">Reject Submission</option><option value="revision">Request Changes</option></select></Field>{decision==='approved'&&<PerformanceField/>}<Button type="submit" busy={action.isPending}>Save Evaluation</Button></>}
    </form>
    {row.status==='approved'&&!['Good','Excellent'].includes(row.performance)&&<form className="form-stack" onSubmit={event=>{
      const form=formData(event);doAction('/performance',{performance:value(form,'performance')},'PATCH');
    }}><PerformanceField/><Button type="submit" busy={action.isPending}>Save Performance</Button></form>}
    <div className="actions"><Button variant="secondary" onClick={()=>change('message')}>Send Notification</Button></div>
    <details><summary>Submission history</summary><ul>{row.history?.map((item:Row)=><li key={item._id}>Version {item.submissionVersion} · {day(item.createdAt)} · {item.status}{item.feedback?' · '+item.feedback:''}</li>)}</ul></details></>;
  }
  if(row&&section==='users')content=<><Details entries={[[ 'Full name',row.fullName],['Email',row.email],['Mobile',row.mobileNumber],['Role',row.role],['Registered',day(row.createdAt)],['Status',<Badge>{row.accountStatus}</Badge>]]}/>
    {row.role!=='admin'&&<div className="actions"><Button variant={row.accountStatus==='active'?'danger':'primary'} onClick={()=>change('account')}>{row.accountStatus==='active'?'Suspend Account':'Restore Account'}</Button><Button variant="secondary" onClick={()=>change('message')}>Send Notification</Button></div>}
    {mode==='account'&&<div className="info">Confirm switching this account to {row.accountStatus==='active'?'suspended':'active'}.<Button variant="danger" busy={action.isPending} onClick={()=>doAction('/status',{accountStatus:row.accountStatus==='active'?'suspended':'active'},'PATCH')}>Confirm</Button></div>}
    <details><summary>Recent internship history</summary><ul>{row.applications.map((item:Row)=><li key={item._id}><Link to={'/admin/applications?record='+item._id}>{item.domainName} · {item.studentInternshipId}</Link></li>)}</ul></details>
    <details><summary>Recent certificate history</summary><ul>{row.issued.map((item:Row)=><li key={item._id}><Link to={'/admin/certificates?record='+item._id}>{item.certificateId} · {item.status}</Link></li>)}</ul></details>
    <details><summary>Recent payment history</summary><ul>{row.transactions.map((item:Row)=><li key={item._id}><Link to={'/admin/payments?record='+item._id}>{item.studentInternshipId} · {rupees(item.amountInPaise)} · {item.status}</Link></li>)}</ul></details></>;
  if(row&&section==='payments')content=<><Details entries={[[ 'Student',row.candidateName],['Internship ID',row.studentInternshipId],['Internship',row.domainName],['Order ID',row.gatewayOrderId],['Payment ID',row.gatewayPaymentId],['Amount',rupees(row.amountInPaise)],['Paid date',day(row.verifiedAt)],['Refund date',day(row.refundedAt)],['Refunded amount',row.refundAmount==null?'—':rupees(row.refundAmount)],['Status',<Badge>{row.status}</Badge>]]}/>
    <Button busy={action.isPending} onClick={()=>doAction('/reconcile')}>Reconcile Payment</Button>{action.isSuccess&&<Status>Payment checked against the gateway.</Status>}</>;
  if(row&&section==='certificates')content=<><Details entries={[[ 'Candidate',row.candidateName],['Certificate ID',row.certificateId],['Domain',row.domainName],['Performance',row.performance||'Not rated'],['Status',<Badge>{row.status}</Badge>],['Issue date',day(row.issueDate)],['Version',row.documentVersion],['Revocation reason',row.revocationReason]]}/>
    <div className="actions">{row.status==='issued'&&<><Button variant="secondary" busy={pdfBusy} onClick={async()=>{setPdfBusy(true);setError(null);try{await openPdf(path+'/pdf','DInterns-Certificate.pdf',true);}catch(failure){setError(failure);}finally{setPdfBusy(false);}}}><Eye size={17}/>Preview Certificate</Button><Button variant="danger" onClick={()=>change('revoke')}>Revoke Certificate</Button></>}<Button onClick={()=>change('reissue')}>Correct &amp; Reissue</Button></div>
    {mode==='revoke'&&<form className="form-stack" onSubmit={event=>{const form=formData(event);doAction('/revoke',{reason:value(form,'reason')});}}><Field label="Revocation reason"><textarea name="reason" required minLength={3} maxLength={2000}/></Field><Button type="submit" variant="danger" busy={action.isPending}>Confirm Revocation</Button></form>}
    {mode==='reissue'&&<form className="form-stack" onSubmit={event=>{const form=formData(event);doAction('/reissue',{candidateName:value(form,'candidateName'),startDate:value(form,'startDate')||undefined,endDate:value(form,'endDate')||undefined,reason:value(form,'reason')});}}><Field label="Candidate name"><input name="candidateName" required defaultValue={row.candidateName}/></Field>{!row.datesFixed&&<div className="form-grid"><Field label="Start Date"><input name="startDate" type="date" required defaultValue={iso(row.startDate)}/></Field><Field label="End Date"><input name="endDate" type="date" required defaultValue={iso(row.endDate)}/></Field></div>}<Field label="Correction reason"><textarea name="reason" required minLength={3} maxLength={2000}/></Field><Button type="submit" busy={action.isPending}>Reissue Certificate</Button></form>}
    <details><summary>Certificate history</summary><ul>{row.history?.map((item:Row)=><li key={item._id}>Version {item.documentVersion} · {item.candidateName} · {day(item.issueDate)} · {item.status}{item.correctionReason?' · '+item.correctionReason:''}</li>)}</ul></details></>;
  if(row&&(mode==='message'||mode==='clarification'))return <MessageComposer userId={row.userId??row._id} enrollmentId={section==='applications'?row._id:row.enrollmentId} clarification={mode==='clarification'} close={()=>setMode('')}/>;
  return <Modal title={title} close={close}>{q.isPending&&<Loader/>}{q.error&&<Fault error={q.error} retry={q.refetch}/>}<div className="form-stack">{content}{action.error&&<Fault error={action.error}/>}{error!=null&&<Fault error={error}/>}</div></Modal>;
}
export function AdminSettings(){
  const query=useData<Row>('/admin/settings'),action=useAction(['/admin/settings','/settings/public','/reviews/public','/coordinator']);
  return <><PageHeading title="Settings">Manage public review visibility, referral rewards and document settings.</PageHeading>
    {query.isPending&&<Loader/>}{query.error&&<Fault error={query.error} retry={query.refetch}/>}
    {query.data&&<section className="panel form-panel settings-panel"><form className="form-stack" onSubmit={event=>{const data=formData(event);action.mutate({path:'/admin/settings',method:'PATCH',body:{signatory:value(data,'signatory'),reviewTime:value(data,'reviewTime'),showPublicReviews:data.has('showPublicReviews'),referralRewardPaise:Math.round(Number(value(data,'referralReward'))*100)}});}}>
      <Field label="Authorized Signatory Designation"><input name="signatory" required minLength={3} maxLength={100} defaultValue={query.data.signatory??'Internship Programme Coordinator'}/></Field>
      <Field label="Application Review Timing (optional)"><input name="reviewTime" maxLength={150} defaultValue={query.data.reviewTime??''}/></Field>
      <Field label="Coordinator reward per qualifying referral (₹)"><input name="referralReward" type="number" min="0" max="1000000" step="0.01" required defaultValue={(query.data.referralRewardPaise??1000)/100}/></Field>
      <label className="checkbox"><input type="checkbox" name="showPublicReviews" defaultChecked={query.data.showPublicReviews!==false}/>Show Public Reviews</label>
      {action.error&&<Fault error={action.error}/>}{action.isSuccess&&<Status>Settings saved.</Status>}<Button type="submit" busy={action.isPending}>Save Settings</Button></form></section>}
  </>;
}
