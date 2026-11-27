import {useState} from 'react';
import {Link} from 'react-router-dom';
import {CircleDollarSign,Copy,Link2,UsersRound} from 'lucide-react';
import {useAccount,useAction,useData} from '../api/client';
import {Badge,Button,Empty,Fault,Field,formData,Loader,Modal,PageHeading,Pagination,Status,toast,useDebounced,value} from '../components/ui';
import {day,rupees,type Page,type Row} from '../types';

export function CoordinatorApplication(){
  const account=useAccount(),user=account.data;
  const query=useData<Row|null>('/coordinator-application',user?.role==='student');
  const action=useAction(['/coordinator-application']);
  const [editing,setEditing]=useState(false);
  const row=query.data;
  return <div className="container content-page prose-page"><PageHeading title="Become a College Coordinator">Represent DInterns at your college and invite students to apply for internships.</PageHeading>
    {account.isPending&&<Loader/>}{account.error&&<Fault error={account.error} retry={account.refetch}/>}
    {user===null&&<Empty title="Sign in to apply"><div className="actions"><Link className="btn primary" to="/login?next=%2Fcollege-coordinator">Sign in</Link><Link className="btn secondary" to="/signup?next=%2Fcollege-coordinator">Create an account</Link></div></Empty>}
    {user?.role==='coordinator'&&<Link className="btn primary" to="/coordinator">Open Coordinator Dashboard</Link>}
    {user?.role==='admin'&&<Link className="btn primary" to="/admin/coordinators">Manage Coordinator Applications</Link>}
    {user?.role==='student'&&<>
      {query.isPending&&<Loader/>}{query.error&&<Fault error={query.error} retry={query.refetch}/>}
      {row&&!editing&&<section className="panel form-panel"><div className="actions"><h2>Your application</h2><Badge>{row.status}</Badge></div>
        <p>{row.college} · {row.branch} · {row.year}</p>
        {row.feedback&&<p>{row.feedback}</p>}
        <Button variant="secondary" onClick={()=>{action.reset();setEditing(true);}}>{row.status==='rejected'?'Apply again':'Edit application'}</Button>
      </section>}
      {(row===null||editing)&&<section className="panel form-panel"><h2>Coordinator application</h2><form className="form-stack" onSubmit={event=>{
        const form=formData(event);
        const body=Object.fromEntries(['college','city','branch','year','motivation'].map(key=>[key,value(form,key)]));
        action.mutate({path:'/coordinator-application',body},{onSuccess:()=>{setEditing(false);toast('Coordinator application submitted.');}});
      }}>
        <div className="form-grid">
          <Field label="Full name"><input value={user.fullName} readOnly/></Field>
          <Field label="Email address"><input type="email" value={user.email} readOnly/></Field>
          <Field label="Mobile number"><input value={user.mobileNumber} readOnly/></Field>
          <Field label="College name"><input name="college" defaultValue={row?.college} required minLength={3} maxLength={150}/></Field>
          <Field label="College city"><input name="city" defaultValue={row?.city} required minLength={2} maxLength={100}/></Field>
          <Field label="Course or branch"><input name="branch" defaultValue={row?.branch} required minLength={2} maxLength={100}/></Field>
          <Field label="Academic year"><input name="year" defaultValue={row?.year} required maxLength={40} placeholder="e.g. 2nd year"/></Field>
        </div>
        <Field label="Why would you like to represent your college? (Optional)"><textarea name="motivation" defaultValue={row?.motivation} maxLength={1000}/></Field>
        {action.error&&<Fault error={action.error}/>}
        <div className="actions"><Button type="submit" busy={action.isPending}>Submit application</Button>{editing&&<Button type="button" variant="secondary" onClick={()=>setEditing(false)}>Cancel</Button>}</div>
      </form></section>}
    </>}
  </div>;
}
type Statement={month:string;earnedPaise:number;reversedPaise:number;paidPaise:number;payablePaise:number;qualified:number};
type Payout={_id:string;month:string;amountPaise:number;reference:string;createdAt:string;upiId?:string;emailStatus?:string};
type Dashboard={college:string;inviteCode:string;upiId?:string;balancePaise:number;signups:number;rewards:number;financials:Statement;history:Payout[];rate:number;testMode:boolean;currentMonth:string};
export function CoordinatorDashboard(){
  const [month,setMonth]=useState(''),[copyError,setCopyError]=useState<unknown>(null);
  const query=useData<Dashboard>('/coordinator'+(month?'?month='+month:''),true,30000);
  const data=query.data;
  const upiAction=useAction(['/coordinator']);
  const link=data?new URL('/signup?ref='+data.inviteCode,window.location.origin).toString():'';
  const totals=data?.financials;
  return <><PageHeading title="Coordinator Dashboard">{data?.college??'Track referrals and monthly payouts.'}</PageHeading>
    {query.isPending&&<Loader/>}{query.error&&<Fault error={query.error} retry={query.refetch}/>}
    {data&&totals&&<>
      {data.testMode&&<p className="info">Test Mode. Simulated certificate payments and payouts do not transfer money.</p>}
      <div className="stat-grid">
        <article className="panel stat"><span className="icon-tile"><UsersRound size={19}/></span><strong>{data.signups}</strong><span>Referred signups</span></article>
        <article className="panel stat"><span className="icon-tile"><CircleDollarSign size={19}/></span><strong>{data.rewards}</strong><span>Referrals with a verified certificate payment</span></article>
        <article className="panel stat"><span className="icon-tile"><CircleDollarSign size={19}/></span><strong>{rupees(data.rate)}</strong><span>Current reward per qualifying referral</span></article>
      </div>
      <section className="panel form-panel">
        <h2>Payout account</h2><p>Available balance <strong>{rupees(data.balancePaise)}</strong></p>
        {!data.upiId&&<p className="info">Add your UPI ID to receive payouts.</p>}
        <form key={data.upiId||'new'} className="form-stack" onSubmit={event=>{
          const form=formData(event);
          upiAction.mutate({path:'/coordinator/upi',method:'PATCH',body:{upiId:value(form,'upiId')}},{onSuccess:()=>toast('UPI ID saved.')});
        }}>
          <Field label="UPI ID (required)"><input name="upiId" defaultValue={data.upiId} placeholder="name@bank" required maxLength={100}/></Field>
          {upiAction.error&&<Fault error={upiAction.error}/>}
          <Button type="submit" busy={upiAction.isPending}>Save UPI ID</Button>
        </form>
      </section>
      <div className="two-grid">
        <section className="panel form-panel"><h2>Invitation link</h2><p>Share this link with new students. You earn one reward per person after their first qualifying certificate payment.</p>
          <Field label="Your invitation link"><input readOnly value={link} onFocus={event=>event.target.select()}/></Field>
          <div className="actions"><Button onClick={async()=>{try{setCopyError(null);await navigator.clipboard.writeText(link);toast('Invitation link copied.');}catch(error){setCopyError(error);}}}><Copy size={17}/>Copy link</Button><a className="btn secondary" href={link} target="_blank" rel="noreferrer"><Link2 size={17}/>Open link</a></div>
          {copyError!=null&&<Fault error={copyError}/>}
        </section>
        <section className="panel form-panel"><h2>Monthly statement</h2><Field label="Statement month"><input type="month" value={month||data.currentMonth} max={data.currentMonth} onChange={event=>setMonth(event.target.value)}/></Field>
          <dl className="details"><div><dt>Rewards earned this month</dt><dd>{rupees(totals.earnedPaise)}</dd></div>
            <div><dt>Refund adjustments this month</dt><dd>{rupees(totals.reversedPaise)}</dd></div>
            <div><dt>Payout recorded for this month</dt><dd>{rupees(totals.paidPaise)}</dd></div>
            <div><dt>Outstanding through this month</dt><dd>{rupees(totals.payablePaise)}</dd></div>
          </dl><p>Admins can pay your available balance after you save a UPI ID. Refunds can reduce the balance.</p>
        </section>
      </div>
      <div className="section-title"><h2>Payout history</h2></div>
      {data.history.length?<div className="panel table-scroll"><table><thead><tr><th>Month</th><th>Amount</th><th>Transfer reference</th><th>Recorded</th></tr></thead><tbody>
        {data.history.map(row=><tr key={row._id}><td>{row.month}</td><td>{rupees(row.amountPaise)}</td><td>{row.reference}</td><td>{day(row.createdAt)}</td></tr>)}
      </tbody></table></div>:<Empty title="No payouts recorded yet"/>}
    </>}
  </>;
}
type CoordinatorPage=Page&{month:string;currentMonth:string;testMode:boolean};
export function AdminCoordinators(){
  const [status,setStatus]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(1);
  const [selection,setSelection]=useState<{row:Row;mode:'review'|'payout'}|null>(null);
  const q=useDebounced(search);
  const params=new URLSearchParams({q,page:String(page),...(status?{status}:{})});
  const query=useData<CoordinatorPage>('/admin/coordinators?'+params);
  const data=query.data,action=useAction(['/admin/coordinators','/coordinator']);
  function select(row:Row,mode:'review'|'payout'){action.reset();setSelection({row,mode});}
  const row=selection?.row;
  const payoutQr=useData<{qr:string;upiId:string;amountPaise:number;testMode:boolean}>(
    '/admin/coordinators/'+row?._id+'/payout-qr',selection?.mode==='payout',5000,
  );
  const qr=payoutQr.data;
  const qrMatches=qr&&qr.upiId===row?.upiId&&qr.amountPaise===row?.financials?.payablePaise;
  const reports=useData<Payout[]>('/admin/coordinators/'+row?._id+'/payouts',selection?.mode==='review'&&row?.status==='approved');
  return <><PageHeading title="College Coordinators">Review applications, view referral earnings and pay coordinator balances and view payout reports.</PageHeading>
    <div className="filter-bar">
      <label className="search-field"><input type="search" aria-label="Search coordinator applications" placeholder="Search name, college or email" value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}}/></label>
      <select aria-label="Application status" value={status} onChange={event=>{setStatus(event.target.value);setPage(1);}}>
        <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
      </select>
    </div>
    {query.isPending&&<Loader/>}{query.error&&<Fault error={query.error} retry={query.refetch}/>}
    {data?.testMode&&<p className="info">Test Mode. Record simulated payouts here to test the workflow.</p>}
    {data&&(data.items.length?<><div className="panel table-scroll"><table><thead><tr><th>Applicant</th><th>College</th><th>Status</th><th>Signups</th><th>Outstanding</th><th>Actions</th></tr></thead><tbody>
      {data.items.map(item=><tr key={item._id}><td>{item.fullName}</td><td>{item.college}</td><td><Badge>{item.status}</Badge></td><td>{item.signups??'—'}</td><td>{item.financials?rupees(item.financials.payablePaise):'—'}</td><td><div className="actions">
        <Button variant="secondary" onClick={()=>select(item,'review')}>{item.status==='pending'?'Review':'Details'}</Button>
        {item.status==='approved'&&<Button disabled={!item.upiId||!item.financials?.payablePaise} onClick={()=>select(item,'payout')}>Pay</Button>}
        {item.status==='approved'&&!item.upiId&&<small>UPI ID required</small>}
      </div></td></tr>)}
    </tbody></table></div><Pagination page={data} change={setPage}/></>:<Empty title="No coordinator applications found"/>)}
    {selection&&row&&<Modal title={selection.mode==='review'?'Coordinator application':'Pay coordinator'} close={()=>setSelection(null)}>
      {selection.mode==='review'?<>
        <dl className="details">{[['Name',row.fullName],['Email',row.email],['Phone',row.mobileNumber],['College',row.college],['City',row.city],['Branch',row.branch],['Year',row.year],['Motivation',row.motivation||'—'],['Status',row.status],['Feedback',row.feedback||'—']].map(([label,val])=><div key={label}><dt>{label}</dt><dd>{val}</dd></div>)}</dl>
        {row.status==='pending'&&<form className="form-stack" onSubmit={event=>{
          const form=formData(event);action.mutate({path:'/admin/coordinators/'+row._id+'/review',body:{decision:value(form,'decision'),feedback:value(form,'feedback')}},{
            onSuccess:()=>{toast('Coordinator decision saved.');setSelection(null);}
          });
        }}><Field label="Decision"><select name="decision" required><option value="">Select decision</option><option value="approved">Approve</option><option value="rejected">Reject</option></select></Field>
          <Field label="Feedback (required for rejection)"><textarea name="feedback" maxLength={1000}/></Field>
          {action.error&&<Fault error={action.error}/>}<Button type="submit" busy={action.isPending}>Save decision</Button>
        </form>}
        {row.status==='approved'&&<><h3>Payout report</h3>
          {reports.isPending&&<Loader/>}{reports.error&&<Fault error={reports.error}/>}
          {reports.data?.length===0&&<p>No payouts recorded.</p>}
          {reports.data&&reports.data.length>0&&<div className="table-scroll"><table>
            <thead><tr><th>Date</th><th>Amount</th><th>UPI ID</th><th>Reference</th><th>Email</th></tr></thead>
            <tbody>{reports.data.map(report=><tr key={report._id}><td>{day(report.createdAt)}</td><td>{rupees(report.amountPaise)}</td><td>{report.upiId||'—'}</td><td>{report.reference}</td><td>{report.emailStatus||'—'}</td></tr>)}</tbody>
          </table></div>}
        </>}
      </>:<form className="form-stack" onSubmit={event=>{
        const form=formData(event);
        action.mutate({path:'/admin/coordinators/'+row._id+'/payout',body:{upiId:row.upiId,amountPaise:row.financials.payablePaise,reference:value(form,'reference')}},{
          onSuccess:()=>{toast('Payout recorded.');setSelection(null);}
        });
      }}><Status>{row.fullName} · {rupees(row.financials.payablePaise)}</Status>
        <Field label="Transfer to UPI ID"><input readOnly value={row.upiId} onFocus={event=>event.target.select()}/></Field>
        {payoutQr.isPending&&<Loader text="Generating UPI QR…"/>}
        {payoutQr.error&&<Fault error={payoutQr.error} retry={payoutQr.refetch}/>}
        {qr&&!qrMatches&&<p className="info">The UPI ID or balance changed. Close and reopen Pay for updated details.</p>}
        {qrMatches&&!payoutQr.error&&<figure>
          <img src={qr.qr} width={192} height={192} alt={qr.testMode?'QR code containing the coordinator’s UPI ID':'UPI QR code for the coordinator payout'}/>
          <figcaption>{qr.testMode?'Test Mode QR contains the UPI ID as plain text.':'Scan with your UPI app and check the recipient and amount before paying.'}</figcaption>
        </figure>}
        <p>{data?.testMode?'Use a simulated reference for this test payout.':'Record this only after transferring the payout to the coordinator.'}</p>
        <Field label={data?.testMode?'Test transfer reference':'Transfer reference'}><input name="reference" required minLength={3} maxLength={100}/></Field>
        {action.error&&<Fault error={action.error}/>}<Button type="submit" busy={action.isPending}>Confirm payout record</Button></form>}
    </Modal>}
  </>;
}
