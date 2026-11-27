import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {MessageSquare,Send} from 'lucide-react';
import {useAccount,useAction,useData} from '../api/client';
import {Badge,Button,Empty,Fault,Field,formData,Loader,Modal,PageHeading,Pagination,useDebounced,value} from './ui';
import {day,type Page,type Row} from '../types';
export const supportCategories=['Account & Login','Internship Application','Offer Letter','Task Download','Task Submission','Submission Review','Certificate','Payment','Profile Correction','Technical Issue','Other'];
export const ticketStatuses=['Open','In Progress','Awaiting Student Reply','Resolved','Closed'];
export function Chat({id,replyPath,closed=false}:{id:string;replyPath:string;closed?:boolean}){
  const [sender,setSender]=useState<'support'|'info'>('support');
  const account=useAccount(),[page,setPage]=useState(1),[draft,setDraft]=useState('');
  const path='/conversations/'+id;
  const isAdmin=account.data?.role==='admin';
  const messages=useData<Page&{conversation:Row}>(path+'/messages?page='+page,true,12000);
  const action=useAction([path,'/conversations?','/support/tickets','/admin/support/tickets']);
  const read=useAction(['/conversations?']);
  const last=messages.data?.items.at(-1)?._id;
  useEffect(()=>{if(last&&page===1)read.mutate({path:path+'/read',method:'PATCH'});},[last,page,path]);
  return <div className="chat"><header><MessageSquare size={18}/><h3>{messages.data?.conversation.subject||'Conversation'}</h3></header>
    <div className="chat-messages">{messages.isPending&&<Loader/>}{messages.error&&<Fault error={messages.error} retry={messages.refetch}/>}
    {messages.data?.items.map(item=><div key={item._id} className={'bubble '+(item.senderRole===(account.data?.role==='admin'?'admin':'student')?'mine':'')}><p>{item.content}</p><small>{item.senderRole==='admin'?'DInterns team':'Student'} · {day(item.createdAt)} · {new Date(item.createdAt).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}</small></div>)}</div>
    {messages.data&&<Pagination page={messages.data} change={setPage}/>}
    {closed?<p className="info">Replies are closed for this ticket.</p>:<form className="form-stack chat-form" onSubmit={event=>{
      event.preventDefault();action.mutate({path:replyPath,body:{content:draft,...(isAdmin?{sender}:{})}},{onSuccess:()=>{setDraft('');setPage(1);}});
    }}>{isAdmin&&<Field label="Email sender"><select value={sender} onChange={event=>setSender(event.target.value==='info'?'info':'support')}>
        <option value="support">support@dinterns.online</option><option value="info">info@dinterns.online</option>
      </select></Field>}<Field label="Reply"><textarea required maxLength={5000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…"/></Field>{action.error&&<Fault error={action.error}/>}<Button type="submit" busy={action.isPending}><Send size={17}/>Send Message</Button></form>}
  </div>;
}
export function SendNotifications(){
  const [audience,setAudience]=useState<'all'|'one'>('all');
  const [sent,setSent]=useState('');
  return <><PageHeading title="Send Notifications">Send a popup to everyone or choose one recipient.</PageHeading>
    <section className="panel form-panel settings-panel">
      <Field label="Audience"><select value={audience} onChange={event=>{setAudience(event.target.value==='one'?'one':'all');setSent('');}}>
        <option value="all">Everyone</option><option value="one">One user</option>
      </select></Field>
      <NotificationForm key={audience} broadcast={audience==='all'} onSent={setSent}/>
      {sent&&<p className="success" role="status">{sent}</p>}
    </section>
  </>;
}

export function MessageComposer({userId,enrollmentId,clarification=false,close}:{userId:string;enrollmentId?:string;clarification?:boolean;close:()=>void}){
  return <Modal title={clarification?'Request Clarification':'Send Notification'} close={close}>
    <NotificationForm userId={userId} enrollmentId={enrollmentId} clarification={clarification} onSent={()=>close()}/>
  </Modal>;
}

function NotificationForm({broadcast=false,userId,enrollmentId,clarification,onSent}:{broadcast?:boolean;userId?:string;enrollmentId?:string;clarification?:boolean;onSent:(message:string)=>void}){
  const action=useAction<{recipients?:number}>(['/notifications']);
  const [search,setSearch]=useState('');
  const term=useDebounced(search.trim());
  const needsRecipient=!broadcast&&!userId;
  const users=useData<Page>('/admin/users?q='+encodeURIComponent(term),needsRecipient&&term.length>=2);
  return <form className="form-stack" onSubmit={event=>{
    const form=event.currentTarget;
    const data=formData(event),title=value(data,'subject').trim()||'Message from DInterns',content=value(data,'content');
    action.mutate(broadcast
      ?{path:'/admin/announcements',body:{title,body:content}}
      :{path:'/admin/messages',body:{userId:userId||value(data,'user'),enrollmentId,clarification,subject:title,content}},
      {onSuccess:result=>{
        form.reset();setSearch('');
        onSent(broadcast?'Notification sent to '+result.recipients+' users.':'Notification sent.');
      }});
  }}>
    {needsRecipient&&<>
      <Field label="Find a user by name or email"><input value={search} onChange={event=>setSearch(event.target.value)}/></Field>
      {term.length>=2&&users.error&&<Fault error={users.error}/>}
      <Field label="Recipient"><select key={term} name="user" required defaultValue=""><option value="" disabled>Choose a recipient</option>{users.data?.items.filter(item=>item.accountStatus==='active').map(item=><option key={item._id} value={item._id}>{item.fullName} · {item.email}</option>)}</select></Field>
    </>}
    <Field label="Title (optional)"><input name="subject" maxLength={150}/></Field>
    <Field label="Message"><textarea name="content" required maxLength={4000}/></Field>
    {action.error&&<Fault error={action.error}/>}
    <Button type="submit" busy={action.isPending}>Send Notification</Button>
  </form>;
}
export function TicketView({id,admin=false,close}:{id:string;admin?:boolean;close:()=>void}){
  const path=(admin?'/admin':'')+'/support/tickets/'+id;
  const q=useData<Row>(path,true,15000),action=useAction(['/admin/support/tickets','/support/tickets']);
  const row=q.data;
  return <Modal title={row?.subject??'Support request'} close={close}>
    {q.isPending&&<Loader/>}{q.error&&<Fault error={q.error} retry={q.refetch}/>}
    {row&&<><div className="actions"><Badge>{row.status}</Badge><span>{row.ticketId} · {row.category}</span></div>
      {admin&&<><dl className="details">{[['Name',row.studentName],[row.userId?'Registered email':'Contact email',row.email],['Phone number',row.phone],['Internship ID',row.studentInternshipId],['Internship progress',row.related?.internshipStatus],['Payment status',row.related?.certificatePaymentStatus]].filter(([,val])=>val).map(([label,val])=><div key={label}><dt>{label}</dt><dd>{val}</dd></div>)}</dl>
      <form className="form-stack" onSubmit={event=>{const form=formData(event);action.mutate({path:path+'/status',method:'PATCH',body:{status:value(form,'status'),priority:value(form,'priority')}});}}>
        <div className="form-grid"><Field label="Status"><select name="status" defaultValue={row.status}>{ticketStatuses.map(status=><option key={status}>{status}</option>)}</select></Field><Field label="Priority"><select name="priority" defaultValue={row.priority}>{['Low','Normal','High','Urgent'].map(priority=><option key={priority}>{priority}</option>)}</select></Field></div>
        {action.error&&<Fault error={action.error}/>}<Button type="submit" busy={action.isPending}>Update Ticket</Button></form></>}
      {row.conversationId&&<Chat id={row.conversationId} replyPath={path+'/reply'} closed={['Closed','Resolved'].includes(row.status)}/>}</>}
  </Modal>;
}
export function StudentSupport(){
  const [params,setParams]=useSearchParams(),[page,setPage]=useState(1);
  const id=params.get('record'),create=params.get('new')==='1',enrollment=params.get('enrollment')??'';
  const account=useAccount(),query=useData<Page>('/support/tickets?page='+page),enrollments=useData<Page>('/student/enrollments?page=1',create),related=useData<Row>('/student/enrollments/'+enrollment,create&&Boolean(enrollment));
  const action=useAction<Row>(['/support/tickets']);
  function close(){action.reset();setParams({});}
  return <><PageHeading title="Help & Support">Track your requests and replies from the DInterns team.</PageHeading>
    <div className="actions inbox-actions"><Button onClick={()=>setParams({new:'1'})}>Raise a Support Request</Button><Link to="/contact#faq" className="btn secondary">Read FAQs</Link></div>
    {query.isPending&&<Loader/>}{query.error&&<Fault error={query.error} retry={query.refetch}/>}
    {query.data?.total===0&&<Empty title="No support requests yet"/>}
    {query.data&&<><div className="card-grid">{query.data.items.map(item=><article className="panel document-card" key={item._id}><Badge>{item.status}</Badge><h2>{item.subject}</h2><p>{item.ticketId} · {item.category}</p><Button variant="secondary" onClick={()=>setParams({record:item._id})}>View Request</Button></article>)}</div><Pagination page={query.data} change={setPage}/></>}
    {id&&<TicketView id={id} close={close}/>}
    {create&&<Modal title="Raise a Support Request" close={close}><form className="form-stack" onSubmit={event=>{
      const form=formData(event);action.mutate({path:'/support/tickets',body:{enrollmentId:value(form,'enrollment')||undefined,category:value(form,'category'),subject:value(form,'subject'),description:value(form,'description')}},{onSuccess:row=>setParams({record:row._id})});
    }}><div className="form-grid"><Field label="Student name"><input value={account.data?.fullName??''} readOnly/></Field><Field label="Registered email"><input value={account.data?.email??''} readOnly/></Field></div>
      <Field label="Related internship and student ID (optional)"><select name="enrollment" defaultValue={enrollment}><option value="">No related internship</option>{enrollment&&!enrollments.data?.items.some(item=>item._id===enrollment)&&<option value={enrollment}>{related.data?.studentInternshipId??'Selected internship'}</option>}{enrollments.data?.items.map(item=><option key={item._id} value={item._id}>{item.domainName} · {item.studentInternshipId}</option>)}</select></Field>
      <Field label="Problem category"><select name="category" required defaultValue=""><option value="" disabled>Select a category</option>{supportCategories.map(category=><option key={category}>{category}</option>)}</select></Field>
      <Field label="Subject"><input name="subject" minLength={4} maxLength={150} required/></Field><Field label="Detailed description"><textarea name="description" minLength={10} maxLength={5000} required/></Field>
      {action.error&&<Fault error={action.error}/>}<Button type="submit" busy={action.isPending}>Submit Request</Button></form></Modal>}
  </>;
}
