import {useEffect,useRef,useState,type ReactNode,type ButtonHTMLAttributes,type FormEvent} from 'react';
import {AlertCircle,CheckCircle2,FolderOpen,LoaderCircle,X} from 'lucide-react';
import {motion,useReducedMotion} from 'framer-motion';
import {Link} from 'react-router-dom';
import {errorText} from '../api/client';
import {type Page} from '../types';

export function Brand({light=false}:{light?:boolean}){
  return <Link to="/" className={'brand'+(light?' light':'')} aria-label="DInterns home"><img src="/logo.png" alt="" width="42" height="42"/><span><strong>DInterns</strong><small>DESPERATE INTERNS</small></span></Link>;
}
export function Button({variant='primary',busy,children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost'|'danger';busy?:boolean}){
  return <button {...props} className={'btn '+variant+' '+className} disabled={props.disabled||busy}>{busy&&<LoaderCircle size={17} className="spin" aria-hidden/>}{children}</button>;
}
export function Loader({text='Connecting to DInterns…'}:{text?:string}){return <div role="status" className="loading"><LoaderCircle className="spin" size={24}/>{text}</div>;}
export function Skeleton({count=3}:{count?:number}){return <div className="card-grid" role="status" aria-label="Loading">{Array.from({length:count},(_,i)=><div className="skeleton" key={i}/>)}</div>;}
export function Fault({error,retry}:{error:unknown;retry?:()=>unknown}){
  return <div className="fault" role="alert"><AlertCircle size={19}/><span>{errorText(error)}</span>{retry&&<Button variant="ghost" type="button" onClick={()=>retry()}>Retry</Button>}</div>;
}
export function Empty({title,children}:{title:string;children?:ReactNode}){
  return <div className="empty"><span className="icon-tile"><FolderOpen size={21}/></span><strong>{title}</strong>{children&&<div>{children}</div>}</div>;
}
export function PageHeading({title,children}:{title:string;children?:ReactNode}){
  return <header className="page-heading"><h1>{title}</h1>{children&&<p>{children}</p>}</header>;
}
export function Badge({children,kind}:{children:ReactNode;kind?:string}){
  const key=kind||String(children);
  const color=/approved|issued|active|paid|completed|available|verified|resolved/i.test(key)&&!/inactive|unpaid/i.test(key)?'green':/rejected|revoked|failed|suspended|closed|refunded/i.test(key)?'red':/pending|review|revision|progress/i.test(key)?'amber':'blue';
  return <span className={'badge '+color}>{children}</span>;
}
export function Field({label,children,error}:{label:string;children:ReactNode;error?:string}){
  return <label className="field"><span>{label}</span>{children}{error&&<small className="field-error">{error}</small>}</label>;
}
export function Modal({title,children,close}:{title:string;children:ReactNode;close:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const reduced=useReducedMotion();
  useEffect(()=>{const node=dialog.current;node?.showModal();return ()=>node?.close();},[]);
  return <dialog ref={dialog} aria-label={title} onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}>
    <motion.div initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} className="dialog-body">
      <header><h2>{title}</h2><button className="icon-btn" type="button" onClick={close} aria-label="Close"><X size={21}/></button></header>{children}
    </motion.div>
  </dialog>;
}
export function Pagination({page,change}:{page:Page<unknown>;change:(value:number)=>void}){
  const pages=Math.max(1,Math.ceil(page.total/page.limit));
  if(pages===1)return null;
  return <nav className="pagination" aria-label="Pagination"><Button variant="secondary" disabled={page.page===1} onClick={()=>change(page.page-1)}>Previous</Button><span>Page {page.page} of {pages}</span><Button variant="secondary" disabled={page.page>=pages} onClick={()=>change(page.page+1)}>Next</Button></nav>;
}
export function useDebounced(value:string,delay=240){
  const [debounced,setDebounced]=useState(value);
  useEffect(()=>{const handle=setTimeout(()=>setDebounced(value),delay);return ()=>clearTimeout(handle);},[value,delay]);
  return debounced;
}
export function formData(event:FormEvent<HTMLFormElement>){event.preventDefault();return new FormData(event.currentTarget);}
export const value=(data:FormData,key:string)=>String(data.get(key)??'');
export function toast(message:string){window.dispatchEvent(new CustomEvent('dinterns:toast',{detail:message}));}
export function ToastRegion(){
  const [message,setMessage]=useState('');
  useEffect(()=>{
    let timer:number|undefined;
    function display(event:Event){
      setMessage((event as CustomEvent<string>).detail);
      window.clearTimeout(timer);
      timer=window.setTimeout(()=>setMessage(''),4200);
    }
    window.addEventListener('dinterns:toast',display);
    return ()=>{window.removeEventListener('dinterns:toast',display);window.clearTimeout(timer);};
  },[]);
  return <div className="toast-region" aria-live="polite">{message&&<Status>{message}</Status>}</div>;
}
export function Status({children}:{children:ReactNode}){return <div className="success" role="status"><CheckCircle2 size={19}/>{children}</div>;}
