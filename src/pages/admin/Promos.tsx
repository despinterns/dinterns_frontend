import {useState} from 'react';
import {useAction,useData} from '../../api/client';
import {Button,Empty,Fault,Field,Loader,PageHeading,Status,formData,value} from '../../components/ui';

type Promo={
  _id:string;code:string;product:'internship'|'skill';percent:number;audience:'everyone'|'selected';maxUsers:number;used:number;expiresAt:string;
};
const expiresOn=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric'});

export default function Promos(){
  const list=useData<Promo[]>('/admin/promos');
  const action=useAction<{code:string}>(['/admin/promos']);
  const [selected,setSelected]=useState(false);
  return <>
    <PageHeading title="Promo Codes">Create discounts for internship or skill certificates.</PageHeading>
    <form className="panel form-panel" onSubmit={event=>{
      const data=formData(event);
      const form=event.currentTarget;
      action.mutate({path:'/admin/promos',body:{
        code:value(data,'code').toUpperCase(),product:value(data,'product'),
        percent:Number(value(data,'percent')),maxUsers:Number(value(data,'maxUsers')),
        audience:selected?'selected':'everyone',selectedEmails:selected?value(data,'emails').split(/[\s,;]+/).filter(Boolean):[],
        expiryDate:value(data,'expiryDate'),
      }},{onSuccess:()=>{form.reset();setSelected(false);}});
    }}>
      <div className="form-grid">
        <Field label="Promo code"><input name="code" autoCapitalize="characters" autoComplete="off" maxLength={7} pattern="[A-Za-z0-9]{7}" required/></Field>
        <Field label="Certificate type"><select name="product"><option value="internship">Internship certificate</option><option value="skill">Skill certificate</option></select></Field>
        <Field label="Discount (%)"><input name="percent" type="number" min={1} max={100} step={1} required/></Field>
        <Field label="Maximum users"><input name="maxUsers" type="number" min={1} max={1000000} step={1} required/></Field>
        <Field label="Eligible users"><select value={selected?'selected':'everyone'} onChange={event=>setSelected(event.target.value==='selected')}>
          <option value="everyone">All eligible users</option><option value="selected">Selected accounts</option>
        </select></Field>
        <Field label="Expiry date (end of day, India time)"><input name="expiryDate" type="date" required/></Field>
      </div>
      {selected&&<Field label="Selected account emails"><textarea name="emails" required placeholder="Enter one email per line"/></Field>}
      {action.error&&<Fault error={action.error}/>}
      {action.data&&<Status>Promo code {action.data.code} created.</Status>}
      <div className="actions"><Button type="submit" busy={action.isPending}>Create Promo Code</Button></div>
    </form>
    <section className="panel admin-list">
      <h2>Active promo codes</h2>
      {list.isPending&&<Loader/>}{list.error&&<Fault error={list.error} retry={list.refetch}/>}
      {list.data?.length===0&&<Empty title="No active promo codes"/>}
      {Boolean(list.data?.length)&&<div className="table-scroll" tabIndex={0} aria-label="Active promo codes"><table><thead><tr>
        <th>Code</th><th>Certificate</th><th>Discount</th><th>Audience</th><th>Reserved / limit</th><th>Valid through</th>
      </tr></thead><tbody>{list.data?.map(row=><tr key={row._id}>
        <td><strong>{row.code}</strong></td><td>{row.product==='internship'?'Internship':'Skill'}</td><td>{row.percent}%</td>
        <td>{row.audience==='everyone'?'All eligible users':'Selected accounts'}</td><td>{row.used} / {row.maxUsers}</td>
        <td>{expiresOn.format(new Date(Date.parse(row.expiresAt)-1))}</td>
      </tr>)}</tbody></table></div>}
    </section>
  </>;
}
