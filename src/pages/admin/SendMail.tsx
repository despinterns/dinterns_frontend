import {useRef,useState} from 'react';
import {useQueries} from '@tanstack/react-query';
import {Send,Sparkles,UserPlus,X} from 'lucide-react';
import {api,useAction} from '../../api/client';
import {Button,Fault,Field,Loader,PageHeading,Status,useDebounced} from '../../components/ui';

const endpoint='/admin/send-mail';
type Activity={id:string;title:string;status:string;completed:boolean};
type Recipient={email:string;name:string;internships:Activity[];exams:Activity[];mailConfigured:boolean;aiConfigured:boolean};
type Draft={subject:string;message:string};
type RecipientSlot={id:number;email:string;selection:string};
const emptySlot=(id:number):RecipientSlot=>({id,email:'',selection:''});
const normalize=(email:string)=>email.trim().toLowerCase();

export default function SendMail(){
  const [slots,setSlots]=useState([emptySlot(0)]);
  const nextId=useRef(1);
  const addresses=slots.map(slot=>normalize(slot.email));
  const settledAddresses=useDebounced(addresses.join('\n')).split('\n');
  const lookups=useQueries({queries:addresses.map((address,index)=>({
    queryKey:[endpoint,slots[index].id,address],enabled:address===settledAddresses[index]&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address),
    retry:false,refetchOnWindowFocus:false,
    queryFn:async({signal}: {signal:AbortSignal})=>(await api.post<{data:Recipient}>(endpoint+'/recipient',{email:address},{signal})).data.data,
  }))});
  const rows=slots.map((slot,index)=>({...slot,account:lookups[index],recipient:lookups[index].data}));
  const duplicate=addresses.some((address,index)=>Boolean(address)&&addresses.indexOf(address)!==index);
  const [related,setRelated]=useState(false);
  const [purpose,setPurpose]=useState(''),[subject,setSubject]=useState(''),[message,setMessage]=useState(''),[status,setStatus]=useState('');
  const suggest=useAction<Draft>(),deliver=useAction<{sent:boolean;count?:number}>();
  const lastSend=useRef<{key:string;id:string}|null>(null);
  const validRecipients=!duplicate&&rows.every(row=>Boolean(row.recipient));
  const mailConfigured=rows[0].recipient?.mailConfigured,aiConfigured=rows[0].recipient?.aiConfigured;
  const recipients=rows.map(row=>{
    const [type,id]=row.selection.split(':');
    return {email:normalize(row.email),activity:related&&id?{type,id}:undefined};
  });
  const grouped=rows.length>1;
  const context=grouped?{recipients}:recipients[0];
  const busy=suggest.isPending||deliver.isPending;
  const validActivity=!related||recipients.every(item=>Boolean(item.activity));
  function updateSlot(id:number,changes:Partial<RecipientSlot>){
    setStatus('');deliver.reset();suggest.reset();
    setSlots(current=>current.map(slot=>slot.id===id?{...slot,...changes}:slot));
  }
  const options=(items:Activity[],type:string)=>items.map(item=><option key={item.id} value={type+':'+item.id}>
    {item.completed?'🔴':'🟢'} {item.title} · {item.status}
  </option>);

  return <>
    <PageHeading title="Send Mail">Send a branded email from info@dinterns.online.</PageHeading>
    <form className="panel form-panel settings-panel form-stack" onSubmit={event=>{
    event.preventDefault();
    if(busy||!validRecipients||!validActivity||!mailConfigured||!subject.trim()||!message.trim())return;
    const draft={...context,subject:subject.trim(),message:message.trim()};
    const key=JSON.stringify(draft);
    const requestId=lastSend.current?.key===key?lastSend.current.id:crypto.randomUUID();
    lastSend.current={key,id:requestId};
    setStatus('');suggest.reset();
    deliver.mutate({path:grouped?endpoint+'/batch':endpoint,body:{...draft,requestId}},{onSuccess:result=>{
      lastSend.current=null;setSubject('');setMessage('');setPurpose('');
      setStatus(grouped?'Email sent to '+result.count+' recipients.':'Email sent to '+recipients[0].email+'.');
    }});
  }}>
    <section className="form-stack" aria-label="Recipients">
      {rows.map(({id,email,recipient,account},index)=><div className="form-stack mail-recipient" key={id}>
        <Field label={grouped?'Recipient '+(index+1)+' email':'Recipient email'}>
          <input type="email" value={email} required maxLength={254} disabled={busy} autoComplete="off"
            onChange={event=>updateSlot(id,{email:event.target.value,selection:''})}/>
        </Field>
        {account.isFetching&&!recipient&&<Loader text="Finding the recipient…"/>}
        {account.error&&<Fault error={account.error}/>}
        {recipient&&<p className="mail-recipient-name">{recipient.name}</p>}
        {grouped&&<div className="actions"><Button type="button" variant="ghost" disabled={busy} onClick={()=>{
          setSlots(current=>current.filter(slot=>slot.id!==id));setStatus('');deliver.reset();suggest.reset();
        }}><X size={16}/>Remove recipient {index+1}</Button></div>}
      </div>)}
      {duplicate&&<p className="fault" role="alert">Add each recipient only once.</p>}
      <div className="actions"><Button type="button" variant="secondary" disabled={busy||rows.length===100}
        onClick={()=>{
          const slot=emptySlot(nextId.current++);
          setSlots(current=>[...current,slot]);setStatus('');deliver.reset();suggest.reset();
        }}>
        <UserPlus size={17}/>+ Person
      </Button></div>
    </section>
    <fieldset className="mail-topic">
      <legend>Is this email about an internship or exam?</legend>
      <div className="actions">
        <label><input type="radio" name="related" checked={!related} disabled={busy} onChange={()=>setRelated(false)}/> No, general email</label>
        <label><input type="radio" name="related" checked={related} disabled={busy} onChange={()=>setRelated(true)}/> Yes</label>
      </div>
      {related&&rows.map(({id,selection,recipient},index)=>recipient&&<Field key={id} label={grouped?'Internship or exam for recipient '+(index+1):'Internship or exam'}>
        <select value={selection} required disabled={busy} onChange={event=>updateSlot(id,{selection:event.target.value})}>
          <option value="" disabled>{recipient.internships.length||recipient.exams.length?'Select an internship or exam':'No internships or exams found'}</option>
          {recipient.internships.length>0&&<optgroup label="Internships">{options(recipient.internships,'internship')}</optgroup>}
          {recipient.exams.length>0&&<optgroup label="Exams">{options(recipient.exams,'exam')}</optgroup>}
        </select>
      </Field>)}
    </fieldset>
    {aiConfigured&&<details className="mail-suggestion">
      <summary>Suggest a draft with AI</summary>
      <Field label="Email purpose"><textarea value={purpose} maxLength={1500} rows={3} disabled={busy} onChange={event=>setPurpose(event.target.value)}
        placeholder="Describe the purpose without including personal or confidential details."/></Field>
      <Button type="button" variant="secondary" busy={suggest.isPending} disabled={busy||!validRecipients||!validActivity||purpose.trim().length<3} onClick={()=>{
        setStatus('');deliver.reset();
        suggest.mutate({path:endpoint+'/draft',body:{...context,purpose}},{onSuccess:draft=>{
          setSubject(draft.subject);setMessage(draft.message);
          setStatus('Draft ready. Review and edit it before sending.');
        }});
      }}><Sparkles size={16}/>Suggest Draft</Button>
      {suggest.error&&<Fault error={suggest.error}/>}
    </details>}
    <Field label="Subject"><input value={subject} required maxLength={150} disabled={busy} onChange={event=>setSubject(event.target.value)}/></Field>
    <Field label="Message"><textarea value={message} required maxLength={5000} rows={7} disabled={busy}
      onChange={event=>setMessage(event.target.value)} placeholder="Write your message. The email adds the recipient’s greeting automatically."/></Field>
    {mailConfigured===false&&<p className="fault">Email sending is currently unavailable.</p>}
    {deliver.error&&<Fault error={deliver.error}/>}
    {status&&<Status>{status}</Status>}
    <div className="actions"><Button type="submit" busy={deliver.isPending} disabled={busy||!validRecipients||!validActivity||!mailConfigured}>
      <Send size={16}/>{grouped?'Send to '+rows.length+' recipients':'Send Email'}
    </Button></div>
  </form></>;
}
