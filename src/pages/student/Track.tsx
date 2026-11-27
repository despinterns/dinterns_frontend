import {useState,type ReactNode} from 'react';
import {Link,useParams} from 'react-router-dom';
import {flushSync} from 'react-dom';
import {useQueryClient} from '@tanstack/react-query';
import {BadgeCheck,Check,Clock3,Download,Eye,LockKeyhole,Copy} from 'lucide-react';
import {internshipDocumentNames,openPdf,request,siteUrl,useAction,useData} from '../../api/client';
import {Badge,Button,Fault,Field,formData,Loader,Modal,PageHeading,Status,toast,value} from '../../components/ui';
import {day,durationLabel,rupees,type Row,type SiteSettings} from '../../types';
import {rules} from '../public/Resources';
import {openCheckout,type CheckoutOrder} from '../../api/checkout';

function Step({title,state,children}:{title:string;state:'done'|'current'|'locked';children?:ReactNode}){
  return <li className={'timeline-step '+state}><span className="step-symbol">{state==='done'?<Check size={17}/>:state==='current'?<Clock3 size={17}/>:<LockKeyhole size={15}/>}</span><div><h3>{title}</h3>{children}</div></li>;
}
function shiftCalendarMonth(value:string,offset:1|-1){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';
  const date=new Date(value+'T00:00:00Z');
  const dayOfMonth=date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth()+offset+1,0);
  date.setUTCDate(Math.min(dayOfMonth,date.getUTCDate()));
  const year=date.getUTCFullYear();
  return year>=1&&year<=9999?date.toISOString().slice(0,10):'';
}
function CertificateDateFields({from,to,readOnly}:{from:string;to:string;readOnly:boolean}){
  const [dates,setDates]=useState(()=>({from,to:readOnly||shiftCalendarMonth(to,-1)===from?to:shiftCalendarMonth(from,1)}));
  return <div className="form-grid">
    <Field label="From date"><input type="date" name="startDate" required readOnly={readOnly} value={dates.from}
      onChange={event=>{const from=event.currentTarget.value;setDates({from,to:shiftCalendarMonth(from,1)});}}/></Field>
    <Field label="To date"><input type="date" name="endDate" required readOnly={readOnly} value={dates.to}
      onChange={event=>{const to=event.currentTarget.value;setDates({from:shiftCalendarMonth(to,-1),to});}}/></Field>
  </div>;
}
export default function Track(){
  const {enrollmentId}=useParams();
  const base='/student/enrollments/'+enrollmentId;
  const query=useData<Row>(base,true,query=>query.state.data?.internshipStatus==='Submission Under Review'?5000:20000),settings=useData<SiteSettings>('/settings/public');
  const cache=useQueryClient();
  const action=useAction([base,'/student/dashboard','/student/enrollments?','/notifications']);
  const [modal,setModal]=useState<'rules'|'submit'|'review'|'certificateEdit'|null>(null),[taskName,setTaskName]=useState(''),[submissionError,setSubmissionError]=useState('');
  const [busy,setBusy]=useState(''),[error,setError]=useState<unknown>(null),[status,setStatus]=useState('');
  const row=query.data;
  const datePayment=useData<Row|null>('/payments/date-edit/'+enrollmentId,modal==='certificateEdit'&&row?.certificate?.status==='issued',5000);
  const pendingDateEdit=datePayment.data&&!['paid','refunded'].includes(datePayment.data.status)?datePayment.data:null;
  const [certificateEditError,setCertificateEditError]=useState<unknown>(null);
  const [dateEditing,setDateEditing]=useState(false);
  function refresh(){
    void cache.invalidateQueries({predicate:({queryKey})=>String(queryKey[0]).startsWith('/student')||queryKey[0]==='/payments/date-edit/'+enrollmentId});
  }
  function saved(){
    toast(modal==='rules'?'Guidelines accepted.':modal==='submit'?'Projects submitted for review.':'Review submitted.');
    setModal(null);refresh();
  }
  function show(kind:'rules'|'submit'|'review'){action.reset();setSubmissionError('');setModal(kind);setTaskName(row?.history?.[0]?.certificateName||row?.applicationDetails.fullName||'');}
  async function perform(name:string,operation:()=>Promise<void>){
    setBusy(name);setError(null);setStatus('');
    try{await operation();}catch(failure){setError(failure);}finally{setBusy('');refresh();}
  }
  function document(type:keyof typeof internshipDocumentNames,preview=false){
    return perform(type+(preview?'preview':''),()=>openPdf(base+'/'+type,internshipDocumentNames[type],preview));
  }
  function pay(){
    if(!row)return;
    void perform('payment',async()=>{
      const order=await request<CheckoutOrder&{_id:string;status:string}>('/payments/create-order','POST',{enrollmentId:row._id});
      if(order.status==='pending'&&row.payment?.status==='pending')setStatus('Checking existing payment order.');
      await checkout(order,false);
    });
  }
  async function checkout(order:CheckoutOrder&{_id:string},dateEdit:boolean){
    await openCheckout(order,dateEdit?'Certificate date correction':'Completion certificate unlocking',async payment=>{
      const result=await request<Row>(dateEdit?'/payments/date-edit/verify':'/payments/verify','POST',{paymentId:order._id,...payment});
      if(dateEdit)dateEditStatus(result);
      else setStatus(result.status==='paid'?'Payment verified. You can now submit your review.':'Payment is pending verification.');
    },()=>setStatus('Checkout closed. Check the payment status if you completed payment in the gateway.'),
    ()=>setStatus('Payment failed. You can retry in checkout or check the existing order.'));
  }
  function dateEditStatus(result:Row){
    if(result.status==='paid')setStatus('Dates updated. Your new certificate is ready to download.');
    else if(result.status==='needs_review')setStatus('Payment received. Contact support to resolve the certificate update.');
    else setStatus('Date edit payment status: '+result.status+'.');
  }
  async function payForDateEdit(startDate:string,endDate:string){
    setCertificateEditError(null);setDateEditing(true);
    try{
      const order=await request<CheckoutOrder&{_id:string;status:string}>('/payments/date-edit/order','POST',{enrollmentId,startDate,endDate});
      flushSync(()=>setModal(null));
      if(['paid','needs_review'].includes(order.status))dateEditStatus(order);
      else await perform('datePayment',()=>checkout(order,true));
    }catch(failure){setCertificateEditError(failure);}
    finally{setDateEditing(false);refresh();}
  }
  if(query.isPending)return <Loader/>;
  if(query.error)return <Fault error={query.error} retry={query.refetch}/>;
  if(!row)return null;
  const approved=Boolean(row.approvedAt),offered=Boolean(row.offerLetterAccessedAt),tasks=Boolean(row.taskDocumentAccessedAt);
  const submission:Row|undefined=row.history?.[0];
  const paid=row.certificatePaymentStatus==='paid',cert=row.certificate?.status==='issued';
  const canSubmit=['Internship In Progress','Revision Required'].includes(row.internshipStatus);
  const canPay=row.internshipStatus==='Certificate Unlock Pending';
  const idLink=new URL('/verify-certificate',siteUrl);idLink.searchParams.set('id',row.studentInternshipId);
  return <div className="track-page">
    <Link to="/student/internships">Joined Internships</Link>
    <PageHeading title={row.domainName}>{row.studentInternshipId} · {durationLabel(row)}</PageHeading>
    <div className="track-summary panel"><Badge>{row.internshipStatus}</Badge><span>Joining date {day(row.startDate||row.applicationDate)}</span>{row.endDate&&<span>Internship end date {day(row.endDate)}</span>}</div>
    {error!=null&&<Fault error={error}/>}
    {status&&<Status>{status}</Status>}
    <section className="panel timeline-panel"><h2>Internship progress</h2><ol className="timeline">
      <Step title="Application Submitted" state="done"><p>{day(row.applicationDate)} · {row.studentInternshipId}</p></Step>
      <Step title={row.applicationStatus==='rejected'?'Application Rejected':'Application Review'} state={row.applicationStatus==='pending'?'current':'done'}>{row.applicationStatus==='pending'?<p>Your application is being reviewed by the DInterns team.</p>:row.applicationStatus==='rejected'?<><p>{row.decisionReason}</p>{!row.active&&<Link className="btn secondary" to={'/internships?apply='+row.domainId}>Reapply</Link>}</>:<p>Application review completed.</p>}</Step>
      <Step title="Application Approved" state={approved?'done':'locked'}>{approved&&<p>Approved on {day(row.approvedAt)}.</p>}</Step>
      <Step title="Accept Internship Rules" state={row.rulesAcceptedAt?'done':approved?'current':'locked'}>{approved&&(row.rulesAcceptedAt?<p>Accepted {day(row.rulesAcceptedAt)} · Version {row.rulesVersion}</p>:<Button onClick={()=>show('rules')}>Accept Internship Rules</Button>)}</Step>
      <Step title="Download Offer Letter" state={offered?'done':row.rulesAcceptedAt?'current':'locked'}>{row.rulesAcceptedAt&&<div className="actions"><Button variant="secondary" disabled={Boolean(busy)} busy={busy==='offer-letter'} onClick={()=>document('offer-letter')}><Download size={17}/>Download Offer Letter</Button><Button variant="ghost" disabled={Boolean(busy)} busy={busy==='offer-letterpreview'} onClick={()=>document('offer-letter',true)}><Eye size={17}/>View PDF</Button></div>}</Step>
      <Step title="Download Internship Tasks" state={tasks?'done':offered?'current':'locked'}>{offered&&<><p>{row.totalTasks} available · {row.minimumRequiredTasks} required · Document version {row.taskVersion}</p><Button variant="secondary" disabled={Boolean(busy)} busy={busy==='tasks'} onClick={()=>document('tasks')}><Download size={17}/>Download Internship Tasks</Button></>}</Step>
      <Step title="Submit Completed Tasks" state={submission&&!canSubmit?'done':tasks&&canSubmit?'current':'locked'}>{tasks&&canSubmit&&<Button onClick={()=>show('submit')}>{submission?'Resubmit Tasks':'Submit Tasks'}</Button>}</Step>
      <Step title="Task Submission Review" state={submission?(submission.status==='pending'?'current':'done'):'locked'}>
        {submission&&<><Badge>{submission.status}</Badge><p>{submission.status==='pending'?'Your internship projects are being evaluated by the DInterns team.':submission.feedback}</p>
          <details><summary>Submission history</summary><ul>{row.history.map((item:Row)=><li key={item._id}>Version {item.submissionVersion} · {day(item.submittedAt)} · {item.status}{item.feedback?' · '+item.feedback:''}</li>)}</ul></details></>}
      </Step>
      <Step title="Certificate Unlocking Payment" state={paid?'done':canPay?'current':'locked'}>
        {(canPay||paid||row.certificatePaymentStatus==='refunded')&&<><p>{paid?'Verified payment: '+rupees(row.payment?.amountInPaise??9900):row.certificatePaymentStatus==='refunded'?'The certificate payment was refunded.':'Congratulations! Your internship projects have been successfully approved.'}</p>
        {canPay&&<><p>Certificate Unlocking Fee: {rupees(settings.data?.fee??9900)}</p>
          {settings.isPending&&<Loader text="Checking payment availability…"/>}{settings.error&&<Fault error={settings.error} retry={settings.refetch}/>}
          {settings.data&&!settings.data.paymentsConfigured&&<div className="info">Certificate payments are unavailable until the payment gateway is configured.</div>}
          {settings.data?.paymentsConfigured&&<div className="actions"><Button disabled={Boolean(busy)} busy={busy==='payment'} onClick={pay}>Unlock Certificate — {rupees(settings.data.fee)}</Button>{row.payment?._id&&<Button variant="secondary" disabled={Boolean(busy)} busy={busy==='check'} onClick={()=>perform('check',async()=>{
            const result=await request<Row>('/payments/'+row.payment._id+'/reconcile');
            setStatus(result.status==='paid'?'Payment verified.':('Payment status: '+result.status+'.'));
          })}>Check Payment Status</Button>}</div>}</>}</>}
      </Step>
      <Step title="Student Review" state={row.reviewSubmitted||row.reviewAssistance?'done':paid?'current':'locked'}>
        {row.internshipStatus==='Review Pending'&&<><p>Tell us about your experience. Every rating is eligible, and publication is optional.</p><div className="actions"><Button onClick={()=>show('review')}>Submit Review</Button><Link className="btn secondary" to={'/student/support?new=1&enrollment='+row._id}>Get Review Assistance</Link></div></>}
        {row.reviewSubmitted&&<p>Review submitted.</p>}{row.reviewAssistance&&<p>Support-assisted document access approved.</p>}
      </Step>
      <Step title="Completion Certificate" state={cert?'done':row.certificate?.status==='revoked'?'current':'locked'}>
        {cert&&<div className="actions"><Button disabled={Boolean(busy)} busy={busy==='certificate'} onClick={()=>document('certificate')}><Download size={17}/>Download Certificate</Button><Button variant="secondary" disabled={Boolean(busy)} busy={busy==='certificatepreview'} onClick={()=>document('certificate',true)}><Eye size={17}/>View Certificate</Button>
          <Button variant="secondary" disabled={Boolean(busy)} onClick={()=>{action.reset();setCertificateEditError(null);setModal('certificateEdit');}}>Edit Certificate</Button>
          <Button variant="ghost" onClick={()=>perform('copy',async()=>{await navigator.clipboard.writeText(row.studentInternshipId);setStatus('Verification ID copied.');})}><Copy size={16}/>Copy Verification ID</Button>
          <Button variant="ghost" onClick={()=>perform('copy',async()=>{await navigator.clipboard.writeText(idLink.toString());setStatus('Verification link copied.');})}>Copy Verification Link</Button></div>}
        {row.certificate?.status==='revoked'&&<p>Your certificate has been revoked. Contact support for assistance.</p>}
      </Step>
      <Step title="Letter of Recommendation" state={cert?'done':'locked'}>
        {cert&&<div className="actions">
          <Button variant="secondary" disabled={Boolean(busy)} busy={busy==='recommendation-letter'} onClick={()=>document('recommendation-letter')}><Download size={17}/>Download Letter of Recommendation</Button>
          <Button variant="ghost" disabled={Boolean(busy)} busy={busy==='recommendation-letterpreview'} onClick={()=>document('recommendation-letter',true)}><Eye size={17}/>View Letter</Button>
        </div>}
      </Step>
      <Step title="Internship Completed" state={row.completedAt?'done':cert?'current':'locked'}>{row.completedAt&&<p>Congratulations! You have successfully completed your DInterns internship.</p>}</Step>
    </ol></section>
    {modal==='rules'&&<Modal title="DInterns Internship Guidelines" close={()=>setModal(null)}><ol className="rules">{rules.map(rule=><li key={rule}>{rule}</li>)}</ol><p>Keep private contact details and sensitive information out of your posts. <Link to={'/student/support?new=1&enrollment='+row._id}>Ask support for an alternative</Link>.</p>
      {settings.isPending&&<Loader text="Loading guidelines version…"/>}{settings.error&&<Fault error={settings.error} retry={settings.refetch}/>}
      <form className="form-stack" onSubmit={event=>{formData(event);action.mutate({path:base+'/accept-rules',body:{accepted:true,version:settings.data?.rulesVersion}},{onSuccess:saved});}}><label className="checkbox"><input type="checkbox" required/>I have read, understood and agree to all the internship guidelines.</label>{action.error&&<Fault error={action.error}/>}<Button type="submit" disabled={!settings.data} busy={action.isPending}>Submit &amp; Accept</Button></form></Modal>}
    {modal==='submit'&&<Modal title="Submit Your Internship Projects" close={()=>setModal(null)}><form className="form-stack" onSubmit={event=>{
      const form=formData(event),linkedin=value(form,'linkedin').trim();
      const taskLinks=Array.from({length:row.totalTasks},(_,index)=>value(form,'task'+index).trim()).filter(Boolean);
      if(taskLinks.length<row.minimumRequiredTasks){
        setSubmissionError('Enter at least '+row.minimumRequiredTasks+' distinct project links.');
        return;
      }
      function validWebLink(value:string){
        try{
          const url=new URL(value);
          return /^https?:\/\//i.test(value)&&url.hostname&&!url.username&&!url.password;
        }catch{return false;}
      }
      const invalidTask=taskLinks.findIndex(link=>!validWebLink(link));
      if(invalidTask>=0){
        setSubmissionError('Task link '+(invalidTask+1)+' must be a valid HTTP or HTTPS link.');
        return;
      }
      if(linkedin&&!validWebLink(linkedin)){
        setSubmissionError('The offer-letter link must be a valid HTTP or HTTPS link.');
        return;
      }
      setSubmissionError('');
      action.mutate({path:base+'/submissions',body:{certificateName:taskName,taskLinks,linkedinPostLink:linkedin||undefined,confirmed:true}},{onSuccess:saved});
    }}><div className="form-grid"><Field label="Student Internship ID"><input readOnly value={row.studentInternshipId}/></Field><Field label="Internship Domain"><input readOnly value={row.domainName}/></Field></div>
      <Field label="Name on Certificate"><input required minLength={2} maxLength={100} value={taskName} onChange={event=>setTaskName(event.target.value)}/></Field>
      <div className="info"><BadgeCheck size={19}/>Certificate name preview: <strong>{taskName}</strong></div><p>Submit at least {row.minimumRequiredTasks} distinct project links. GitHub Pages, repositories, and other web links are accepted.</p>
      {Array.from({length:row.totalTasks},(_,index)=><Field key={index} label={'Task '+(index+1)+' Project Link'}><input name={'task'+index} type="url" placeholder="https://example.com/my-project" maxLength={2048} defaultValue={submission?.taskLinks[index]}/></Field>)}
      {row.linkedinAlternative&&<div className="info">Approved alternative: {row.linkedinAlternative}</div>}
      <Field label="Offer Letter Link"><input name="linkedin" type="url" placeholder="https://lnkd.in/… or another web link" maxLength={2048} required={!row.linkedinAlternative} defaultValue={submission?.linkedinPostLink}/></Field>
      <label className="checkbox"><input type="checkbox" required/>I confirm that the submitted projects are my own work and the information provided is correct.</label>
      {submissionError&&<div className="fault" role="alert">{submissionError}</div>}{action.error&&<Fault error={action.error}/>}<Button type="submit" busy={action.isPending}>Submit for Review</Button></form></Modal>}
    {modal==='certificateEdit'&&cert&&<Modal title="Edit Certificate" close={()=>setModal(null)}>
      <form className="form-stack" onSubmit={event=>{
        const form=formData(event);
        action.mutate({path:base+'/certificate/name',method:'PATCH',body:{candidateName:value(form,'candidateName')}},{onSuccess:()=>{
          setModal(null);refresh();toast('Name updated. Your new certificate is ready to download.');
        }});
      }}>
        <Field label="Certificate name"><input name="candidateName" defaultValue={row.certificate.candidateName} required minLength={2} maxLength={100}/></Field>
        {action.error&&<Fault error={action.error}/>}
        <Button type="submit" busy={action.isPending} disabled={dateEditing}>Save name for free</Button>
      </form>
      <form className="form-stack" key={pendingDateEdit?._id??row.certificate.documentVersion} onSubmit={event=>{
        const form=formData(event);
        void payForDateEdit(pendingDateEdit?.startDate?.slice(0,10)||value(form,'startDate'),pendingDateEdit?.endDate?.slice(0,10)||value(form,'endDate'));
      }}>
        <p>Choose either date and the other will adjust automatically to keep the range one calendar month.</p>
        <CertificateDateFields from={(pendingDateEdit?.startDate??row.certificate.startDate)?.slice(0,10)??''}
          to={(pendingDateEdit?.endDate??row.certificate.endDate)?.slice(0,10)??''} readOnly={Boolean(pendingDateEdit)}/>
        {datePayment.error&&<Fault error={datePayment.error} retry={datePayment.refetch}/>}
        {certificateEditError!=null&&<Fault error={certificateEditError}/>}
        {pendingDateEdit?.status==='needs_review'?<Link to="/student/support">Contact support about your date correction</Link>:<div className="actions">
          <Button type="submit" busy={dateEditing} disabled={action.isPending||datePayment.isPending||Boolean(datePayment.error)||!settings.data?.paymentsConfigured}>{pendingDateEdit?'Resume ₹19 payment':'Pay ₹19 to update dates'}</Button>
          {pendingDateEdit?.orderId&&<Button type="button" variant="secondary" disabled={dateEditing} onClick={async()=>{
            setDateEditing(true);setCertificateEditError(null);
            try{
              const result=await request<Row>('/payments/date-edit/'+pendingDateEdit._id+'/reconcile');
              if(['paid','needs_review'].includes(result.status)){setModal(null);dateEditStatus(result);}
              else toast('Payment status: '+result.status);
            }catch(failure){setCertificateEditError(failure);}
            finally{setDateEditing(false);refresh();}
          }}>Check payment status</Button>}
        </div>}
        {settings.data&&!settings.data.paymentsConfigured&&<p className="info">Razorpay is unavailable. Try again later.</p>}
      </form>
    </Modal>}
    {modal==='review'&&<Modal title="Review Your Internship" close={()=>setModal(null)}><form className="form-stack" onSubmit={event=>{
      const form=formData(event);action.mutate({path:base+'/review',body:{rating:Number(value(form,'rating')),text:value(form,'text'),experience:value(form,'experience'),suggestions:value(form,'suggestions'),consent:form.has('consent')}},{onSuccess:saved});
    }}><Field label="Star rating"><select name="rating" required defaultValue=""><option value="" disabled>Select a rating</option>{[1,2,3,4,5].map(star=><option key={star} value={star}>{star} {star===1?'star':'stars'}</option>)}</select></Field>
      <Field label="Written review"><textarea name="text" minLength={5} maxLength={2000} required/></Field><Field label="Internship experience"><textarea name="experience" minLength={3} maxLength={2000} required/></Field><Field label="Suggestions (optional)"><textarea name="suggestions" maxLength={2000}/></Field>
      <label className="checkbox"><input name="consent" type="checkbox"/>I agree to public display of my name, rating and written review.</label>
      {action.error&&<Fault error={action.error}/>}<Button type="submit" busy={action.isPending}>Submit Review</Button></form></Modal>}
  </div>;
}
