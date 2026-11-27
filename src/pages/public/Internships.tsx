import {useMemo,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {CircleCheck,Search} from 'lucide-react';
import {useAccount,useAction,useData} from '../../api/client';
import {Button,Empty,Fault,Field,Modal,PageHeading,Skeleton,useDebounced} from '../../components/ui';
import type {Account,Domain} from '../../types';
import {DomainCard} from './Home';
const schema=z.object({fullName:z.string().trim().min(2).max(100),email:z.email(),gender:z.enum(['Woman','Man','Non-binary','Other','Prefer not to say']),college:z.string().trim().min(2).max(150),course:z.string().trim().min(2).max(100),courseYear:z.string().trim().min(1).max(40)});
function Application({domain,user,close,complete}:{domain:Domain;user:Account;close:()=>void;complete:()=>void}){
  const {register,handleSubmit,formState:{errors}}=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{fullName:user.fullName,email:user.email,gender:'Prefer not to say'}});
  const action=useAction(['/student']);
  return <Modal title="Apply for an internship" close={close}>
    <form className="form-stack" onSubmit={handleSubmit(input=>action.mutate({path:'/student/applications',body:{...input,domainId:domain._id}},{onSuccess:complete}))}>
      <div className="form-grid">
        <Field label="Full Name" error={errors.fullName?.message}><input autoComplete="name" {...register('fullName')}/></Field>
        <Field label="Mobile Number"><input readOnly value={user.mobileNumber}/></Field>
        <Field label="Email Address" error={errors.email?.message}><input type="email" autoComplete="email" {...register('email')}/></Field>
        <Field label="Gender"><select {...register('gender')}>{['Woman','Man','Non-binary','Other','Prefer not to say'].map(label=><option key={label}>{label}</option>)}</select></Field>
        <Field label="College / University Name" error={errors.college?.message}><input {...register('college')}/></Field>
        <Field label="Course" error={errors.course?.message}><input {...register('course')}/></Field>
        <Field label="Course Year" error={errors.courseYear?.message}><input {...register('courseYear')}/></Field>
        <Field label="Internship Domain"><input readOnly value={domain.domainName}/></Field>
      </div>{action.error&&<Fault error={action.error}/>}
      <div className="actions"><Button type="submit" busy={action.isPending}>Apply</Button><Button type="button" variant="secondary" onClick={close}>Cancel</Button></div>
    </form>
  </Modal>;
}
export default function Internships(){
  const domains=useData<Domain[]>('/internships'),account=useAccount();
  const navigate=useNavigate(),[params,setParams]=useSearchParams();
  const [search,setSearch]=useState(''),[category,setCategory]=useState(''),[success,setSuccess]=useState(false);
  const query=useDebounced(search).trim().toLowerCase(),selected=params.get('domain'),applyId=params.get('apply');
  const data=domains.data;
  const categories=useMemo(()=>[...new Set(data?.map(item=>item.category))].sort(),[data]);
  const filtered=data?.filter(item=>(!selected||item._id===selected)&&(!category||item.category===category)&&[item.domainName,item.description,item.domainCode].some(value=>value.toLowerCase().includes(query)));
  const active=data?.find(item=>item._id===applyId);
  function apply(domain:Domain){
    if(account.isPending)return;
    const next='/internships?apply='+domain._id;
    if(!account.data){navigate('/login?next='+encodeURIComponent(next));return;}
    setParams({apply:domain._id});
  }
  const close=()=>setParams(selected?{domain:selected}:{});
  return <div className="container content-page">
    <PageHeading title="Available Internships">Explore our free virtual internship programmes and start building your professional skills.</PageHeading>
    <div className="filter-bar">
      <label className="search-field"><Search size={19}/><input type="search" placeholder="Search internship domains..." aria-label="Search internship domains" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <select aria-label="Domain" value={selected??''} onChange={e=>setParams(e.target.value?{domain:e.target.value}:{})}><option value="">All Domains</option>{data?.map(item=><option key={item._id} value={item._id}>{item.domainName}</option>)}</select>
      <select aria-label="Category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All Categories</option>{categories.map(item=><option key={item}>{item}</option>)}</select>
      <Button variant="ghost" onClick={()=>{setSearch('');setCategory('');setParams({});}}>Clear Filters</Button>
    </div>
    {domains.isPending&&<Skeleton count={6}/>}
    {domains.error&&<Fault error={domains.error} retry={domains.refetch}/>}
    {account.error&&<Fault error={account.error} retry={account.refetch}/>}
    {filtered?.length?<div className="card-grid">{filtered.map(item=><DomainCard key={item._id} domain={item} action={()=>apply(item)}/>)}</div>:filtered&&<Empty title={data?.length?'No internships match your filters':'No internships are open right now'}>Check back for new opportunities or adjust your filters.</Empty>}
    {applyId&&data&&!active&&<div className="info">This internship is currently unavailable.</div>}
    {active&&account.data&&account.data.role!=='admin'&&<Application domain={active} user={account.data} close={close} complete={()=>{close();setSuccess(true);}}/>}
    {active&&account.data?.role==='admin'&&<Modal title="Student registration required" close={close}><p>Applications are available to student accounts.</p><Link to="/admin" className="btn primary">Admin Dashboard</Link></Modal>}
    {active&&account.data===null&&<Modal title="Sign in to apply" close={close}><p>Sign in to continue applying for {active.domainName}.</p><Link className="btn primary" to={'/login?next='+encodeURIComponent('/internships?apply='+active._id)}>Login</Link></Modal>}
    {success&&<Modal title="Application Submitted Successfully!" close={()=>setSuccess(false)}><div className="success-icon"><CircleCheck size={42}/></div><p>Your internship application is currently under review. Visit your Student Dashboard to track your internship, download your offer letter after approval, access internship tasks and unlock your completion certificate after successful completion.</p><div className="actions"><Link className="btn primary" to="/student">Go to Student Dashboard</Link><Button variant="secondary" onClick={()=>setSuccess(false)}>Explore More Internships</Button></div></Modal>}
  </div>;
}
