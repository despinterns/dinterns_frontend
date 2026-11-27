import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowLeft,Inbox,Mail,Paperclip,RefreshCw,Search,Send} from 'lucide-react';
import {request,useAction,useData} from '../../api/client';
import {Badge,Button,Empty,Fault,Field,Loader,PageHeading,Pagination,toast,useDebounced} from '../../components/ui';
import type {Page} from '../../types';

type Thread={_id:string;mailbox:string;contact:string;displayFrom:string;subject:string;preview:string;unread:boolean;lastAt:string;lastIncomingId:string};
type Message={_id:string;direction:'incoming'|'outgoing';from:string;to:string[];subject:string;body:string;sentAt:string;
  attachments:{id:string;filename?:string;size?:number}[];deliveryStatus?:'pending'|'sent'|'failed'};
type ThreadPage=Page<Message>&{thread:Thread};
type InboxPage=Page<Thread>&{inboundKeyConfigured:boolean;receivingConfigured:boolean;sendingConfigured:boolean};
const base='/admin/support-mails';
const timestamp=new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'});
const formatTime=(value:string)=>timestamp.format(new Date(value));
const label=(status:Message['deliveryStatus'])=>status==='sent'?'Sent':status==='failed'?'Failed to send':'Queued';

function MailMessage({message}:{message:Message}){
  const [loading,setLoading]=useState(''),[error,setError]=useState<unknown>(null);
  async function attachment(id:string){
    setLoading(id);setError(null);
    try{
      const {url}=await request<{url:string}>(base+'/messages/'+message._id+'/attachments/'+id,'GET');
      const link=document.createElement('a');
      link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.click();
    }catch(error){setError(error);}
    finally{setLoading('');}
  }
  return <article className="mail-message">
    <header><div><strong>{message.from}</strong><span>To {message.to.join(', ')}</span></div>
      <div><time dateTime={message.sentAt}>{formatTime(message.sentAt)}</time>{message.direction==='outgoing'&&<Badge kind={message.deliveryStatus??'pending'}>{label(message.deliveryStatus)}</Badge>}</div>
    </header>
    <div className="mail-body">{message.body||'This email has no readable message text.'}</div>
    {!!message.attachments?.length&&<div className="actions mail-attachments">{message.attachments.map(file=><Button key={file.id} variant="secondary" busy={loading===file.id}
      onClick={()=>void attachment(file.id)}><Paperclip size={15}/>{file.filename||'Attachment'}</Button>)}</div>}
    {error!=null&&<Fault error={error}/>}
  </article>;
}
function MailReader({id,canSend,close}:{id:string;canSend:boolean;close:()=>void}){
  const [page,setPage]=useState(1),[draft,setDraft]=useState('');
  const detail=useData<ThreadPage>(base+'/'+id+'?page='+page,true,10000);
  const mark=useAction([base]);
  const reply=useAction([base]);
  const readMessage=useRef<string>(undefined);
  const thread=detail.data?.thread;
  useEffect(()=>{
    if(!thread?.unread||!thread.lastIncomingId||readMessage.current===thread.lastIncomingId)return;
    readMessage.current=thread.lastIncomingId;
    mark.mutate({path:base+'/'+id+'/read',method:'PATCH',body:{messageId:thread.lastIncomingId}},
      {onError:()=>{readMessage.current=undefined;}});
  },[id,thread?.unread,thread?.lastIncomingId]);
  function sendReply(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    reply.mutate({path:base+'/'+id+'/reply',body:{body:draft}},{onSuccess:()=>{setDraft('');setPage(1);}});
  }
  return <section className="mail-reader" aria-label="Email thread">
    <Button type="button" variant="ghost" className="mail-back" onClick={close}><ArrowLeft size={17}/>Back to inbox</Button>
    {detail.isPending&&<Loader/>}{detail.error&&<Fault error={detail.error} retry={detail.refetch}/>}
    {detail.data&&thread&&<>
      <div className="mail-reader-title"><h2>{thread.subject}</h2><p>{thread.mailbox}</p></div>
      <div className="mail-thread">{detail.data.items.map(message=><MailMessage key={message._id} message={message}/>)}</div>
      <Pagination page={detail.data} change={setPage}/>
      <form className="form-stack mail-composer" onSubmit={sendReply}>
        <p>To {thread.contact}</p>
        <Field label={'Reply from '+thread.mailbox}><textarea value={draft} onChange={event=>setDraft(event.target.value)}
          maxLength={10000} rows={4} placeholder="Write your reply…" required disabled={!canSend}/></Field>
        {reply.error&&<Fault error={reply.error}/>}
        <Button type="submit" busy={reply.isPending} disabled={!canSend||!draft.trim()}><Send size={17}/>Send Reply</Button>
      </form>
    </>}
  </section>;
}
export default function SupportMails(){
  const [page,setPage]=useState(1),[search,setSearch]=useState(''),[mailbox,setMailbox]=useState(''),[unread,setUnread]=useState(false);
  const [selected,setSelected]=useState('');
  const importer=useAction<{imported:number;next?:string}>([base]);
  const term=useDebounced(search.trim());
  const params=new URLSearchParams({page:String(page),q:term});
  if(mailbox)params.set('mailbox',mailbox);
  if(unread)params.set('unread','1');
  const list=useData<InboxPage>(base+'?'+params,true,15000);
  function sync(after?:string){
    importer.mutate({path:base+'/import',body:{after}},{onSuccess:result=>toast(result.imported?result.imported+' emails imported.':'No new emails in this batch.')});
  }
  return <>
    <PageHeading title="Support Mails">Read and reply to emails sent to contact@dinterns.online or support@dinterns.online.</PageHeading>
    {list.data&&!list.data.receivingConfigured&&<p className="info mail-setup">Connect Resend receiving to sync incoming email.</p>}
    <div className={'panel mail-inbox'+(selected?' has-selection':'')}>
      <section className="mail-list-pane" aria-label="Inbox">
        <div className="mail-toolbar">
          <label className="search-field" aria-label="Search email"><Search size={17}/><input aria-label="Search email" placeholder="Search sender or subject"
            value={search} maxLength={100} onChange={event=>{setSearch(event.target.value);setPage(1);}}/></label>
          <Button type="button" variant="ghost" aria-label="Refresh inbox" onClick={()=>void list.refetch()}><RefreshCw size={18}/></Button>
        </div>
        <div className="mail-filters">
          <select value={mailbox} aria-label="Mailbox" onChange={event=>{setMailbox(event.target.value);setPage(1);}}>
            <option value="">All addresses</option><option value="contact@dinterns.online">contact@dinterns.online</option><option value="support@dinterns.online">support@dinterns.online</option>
          </select>
          <label className="checkbox"><input type="checkbox" checked={unread} onChange={event=>{setUnread(event.target.checked);setPage(1);}}/>Unread</label>
        </div>
        {list.data?.inboundKeyConfigured&&<div className="actions mail-toolbar">
          <Button type="button" variant="secondary" busy={importer.isPending} onClick={()=>sync()}>Import Recent</Button>
          {importer.data?.next&&<Button type="button" variant="ghost" disabled={importer.isPending} onClick={()=>sync(importer.data?.next)}>Import Older</Button>}
        </div>}
        {importer.error&&<Fault error={importer.error}/>}
        {list.isPending&&<Loader/>}{list.error&&<Fault error={list.error} retry={list.refetch}/>}
        {list.data&&<>
          {!list.data.total&&<Empty title="No emails found"/>}
          <ul className="mail-list">{list.data.items.map(thread=><li key={thread._id}><button type="button"
            className={thread.unread?'unread':''} aria-current={selected===thread._id} onClick={()=>setSelected(thread._id)}>
            <span className="mail-list-from">{thread.unread&&<Mail size={15} aria-label="Unread"/>}<strong>{thread.displayFrom}</strong></span>
            <span className="mail-list-subject">{thread.subject}</span>
            {thread.preview&&<span className="mail-preview">{thread.preview}</span>}
            <time dateTime={thread.lastAt}>{formatTime(thread.lastAt)}</time>
          </button></li>)}</ul>
          <Pagination page={list.data} change={setPage}/>
        </>}
      </section>
      {selected?<MailReader key={selected} id={selected} canSend={Boolean(list.data?.sendingConfigured)} close={()=>setSelected('')}/>:
        <section className="mail-reader mail-reader-empty"><Inbox size={28}/><p>Select an email to read it.</p></section>}
    </div>
  </>;
}
