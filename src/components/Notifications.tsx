import {useState} from 'react';
import {Bell} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useAction,useData} from '../api/client';
import {day,type Notice,type Page} from '../types';
import {Button,Empty,Fault,Loader,Modal,Pagination} from './ui';
export function Notifications(){
  const [open,setOpen]=useState(false),[page,setPage]=useState(1);
  const query=useData<Page<Notice>&{unread:number}>('/notifications?page='+page,true,25000);
  const popup=useData<Notice|null>('/notifications/pending-popup',true,5000);
  const [selected,setSelected]=useState<Notice|null>(null);
  const action=useAction(['/notifications']);
  function read(notice:Notice){
    action.mutate({path:'/notifications/'+notice._id+'/read',method:'PATCH'});
  }
  return <div className="notification-wrap">
    <button className="icon-btn bell" aria-expanded={open} aria-label={(query.data?.unread||0)+' unread notifications'} onClick={()=>setOpen(!open)}><Bell size={20}/>{Boolean(query.data?.unread)&&<small>{query.data!.unread}</small>}</button>
    {open&&<section className="notification-menu">
      <header><strong>Notifications</strong><Button variant="ghost" disabled={!query.data?.unread} onClick={()=>action.mutate({path:'/notifications/read-all',method:'PATCH'})}>Mark all read</Button></header>
      {query.isPending&&<Loader/>}{query.error&&<Fault error={query.error} retry={query.refetch}/>}
      {action.error&&<Fault error={action.error}/>}
      {query.data?.items.map(item=>{
        const contents=<><strong>{item.title}</strong><span>{item.body}</span><small>{day(item.createdAt)}</small></>;
        const className='notice '+(!item.readAt?'unread':'');
        function select(){setOpen(false);if(!item.readAt)read(item);}
        return item.href&&!item.href.startsWith('/student/messages')
          ?<Link className={className} key={item._id} to={item.href} onClick={select}>{contents}</Link>
          :<button type="button" className={className} key={item._id} onClick={()=>{select();setSelected(item);}}>{contents}</button>;
      })}
      {query.data?.total===0&&<Empty title="You're all caught up"/>}
      {query.data&&<Pagination page={query.data} change={setPage}/>}
    </section>}
    {selected&&<Modal title={selected.title} close={()=>setSelected(null)}><p className="notice-message">{selected.body}</p></Modal>}
    {popup.data&&!selected&&<aside key={popup.data._id} className="panel announcement-popup" aria-label="New notification">
      <div role="status"><strong>{popup.data.title}</strong><p className="notice-message">{popup.data.body}</p></div>
      {action.error&&<Fault error={action.error}/>}
      <div className="actions">
        {popup.data.href&&<Link className="btn secondary" to={popup.data.href} onClick={()=>read(popup.data!)}>View details</Link>}
        <Button busy={action.isPending} onClick={()=>read(popup.data!)}>Dismiss</Button>
      </div>
    </aside>}
  </div>;
}
