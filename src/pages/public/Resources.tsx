import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {BadgeCheck,FileText,Mail,MapPin,Send} from 'lucide-react';
import {internshipDocumentNames,openPdf,useAccount,useAction,useData} from '../../api/client';
import {Button,Empty,Fault,Field,formData,Loader,PageHeading,Pagination,Status,value} from '../../components/ui';
import {day,type Page,type Row,type SiteSettings} from '../../types';

import {supportCategories} from '../../components/Inbox';
import {policies,policyUpdated,type PolicyKey} from './policies';

export const rules=[
  'Download your official DInterns internship offer letter.',
  'Share your offer letter on LinkedIn or another website you can link to.',
  'Complete at least two tasks from the provided internship task document. Check your selected domain for its minimum.',
  'Publish completed tasks somewhere the DInterns team can access, such as GitHub or GitHub Pages.',
  'If you use GitHub repositories, name them dinterns_taskname. For example, dinterns_calculator, dinterns_chatbot or dinterns_portfolio.',
  'Submit a distinct project link for each task through the internship dashboard.',
  'Submit a link to your offer letter or the post where you shared it. LinkedIn short links are accepted.',
  'Submit genuine work you can explain.',
  'Plagiarised or fraudulent work may be rejected.',
  'Internship participation is completely free.',
  'Submit an honest review before downloading your completion certificate. Publication consent is optional.',
];
const charges=[
  ['Registration, internship participation, task submission and offer letter','Free (₹0)'],
  ['Taking or retaking a skill examination','Free (₹0)'],
  ['Internship completion certificate and letter of recommendation','₹99'],
  ['Skill examination certificate','₹29'],
  ['Name correction on an issued internship certificate','Free (₹0)'],
  ['Date correction on an issued internship certificate','₹19'],
] as const;
export function Policy({policy}:{policy:PolicyKey|'guidelines'|'about'}){
  if(policy==='about')return <div className="container content-page prose-page"><PageHeading title="About DInterns">From Desperate to Determined.</PageHeading><section className="panel policy"><h2>Everyone Deserves an Opportunity.</h2><p>DInterns (Desperate Interns) is a Delhi-based virtual internship platform. Students can apply for free, complete practical projects and get feedback from the programme team.</p><p>Eligible students can unlock a verifiable completion certificate.</p><Link to="/internships" className="btn primary">Explore Internships</Link></section></div>;
  if(policy==='guidelines')return <div className="container content-page prose-page"><PageHeading title="Internship Guidelines"/><section className="panel policy"><ol>{rules.map(rule=><li key={rule}>{rule}</li>)}</ol><p>Keep private contact details and sensitive information out of published material. <Link to="/contact">Contact support</Link> if you need an alternative to LinkedIn.</p></section></div>;
  const page=policies[policy];
  return <div className="container content-page prose-page">
    <PageHeading title={page.title}>{page.intro}</PageHeading>
    <section className="panel policy">
      <p>Last updated <time dateTime="2026-11-27">{policyUpdated}</time></p>
      {policy==='terms'&&<section className="policy-charges" id="charges">
        <h2>Fees and Charges</h2>
        <p>All paid services listed below are optional. These are one-time charges in Indian rupees.</p>
        <table aria-label="DInterns fees and charges">
          <thead><tr><th scope="col">Service</th><th scope="col">Charge</th></tr></thead>
          <tbody>{charges.map(([service,charge])=><tr key={service}><td>{service}</td><td><strong>{charge}</strong></td></tr>)}</tbody>
        </table>
      </section>}
      {policy==='refunds'&&<p><Link to="/terms#charges">See all fees and charges</Link></p>}
      {page.sections.map(([title,copy])=><section key={title}><h2>{title}</h2><p>{copy}</p></section>)}
      <section><h2>Contact DInterns</h2><p>Delhi, India</p><p><a href="mailto:support@dinterns.online">support@dinterns.online</a></p><Link to="/contact">Open the contact form</Link></section>
      <nav className="actions" aria-label="Related policies">
        {(Object.keys(policies) as PolicyKey[]).filter(key=>key!==policy).map(key=><Link key={key} to={'/'+key}>{policies[key].title}</Link>)}
        <Link to="/contact#faq">FAQs</Link>
      </nav>
    </section>
  </div>;
}
const faqs=[
  ['Are DInterns internships free?','Yes. Registration, participation and offer letters cost ₹0. Eligible students can unlock their completion certificate for ₹99.'],
  ['How do I apply for an internship?','Choose an open domain under Available Internships, sign in and submit your application.'],
  ['How long does application approval take?','Review timing depends on application volume. Check your tracker for updates.'],
  ['How do I download my offer letter?','Open your approved internship and accept the guidelines. The offer letter will then be available from your tracker.'],
  ['Where can I download internship tasks?','Access your offer letter first. Then download the protected task PDF from your tracker.'],
  ['How many tasks are compulsory?','Complete at least two distinct tasks. Your domain may require more. The tracker displays its minimum.'],
  ['How do I submit my project links?','Paste a distinct HTTP or HTTPS link for each project in the submission form. You can use GitHub repositories, GitHub Pages, or another site the team can access.'],
  ['What happens if my submission is rejected?','Read the evaluator’s feedback. If the team requests changes, you can update your work and resubmit. Contact support about a final rejection.'],
  ['How do I unlock my certificate?','After your projects are approved, pay ₹99 through your tracker and submit an honest review.'],
  ['Why is there a ₹99 certificate fee?','The fee applies to unlocking the optional, digitally generated and publicly verifiable completion certificate.'],
  ['What if my payment succeeds but my certificate is locked?','Use Check payment status in the tracker. If the payment remains unresolved, send a support request with the internship and gateway references.'],
  ['How do I verify my certificate?','Enter your certificate ID on the verification page or click the certificate ID in your PDF.'],
  ['How do I correct my certificate name?','Open Edit Certificate in your internship tracker and save the corrected name for free. Contact support if you cannot access the option.'],
  ['How do I recover my account?','Choose Forgot password on the login page and enter the email address on your account. Use the six-digit code sent to that address to set a new password. If you have lost access to that inbox, contact DInterns Support.'],
  ['How do I change the dates on my internship certificate?','Use Edit Certificate in your internship tracker. Choose either date and the other updates to keep the dates one calendar month apart. The date correction costs ?19 and takes effect after payment is verified.'],
  ['How do I get a Skill Certification certificate?','Take a timed skill exam and meet the passing percentage. You can then unlock the optional exam certificate for ?29.'],
];
export function Contact(){
  const settings=useData<SiteSettings>('/settings/public'),account=useAccount();
  const action=useAction<{ticketId:string;_id?:string}>(['/support/tickets']);
  const member=account.data&&account.data.role!=='admin'?account.data:null;
  return <div className="container content-page contact-page">
    <PageHeading title="Contact Us">Have a question about DInterns? Send us a support request or reach us by email.</PageHeading>
    <div className="contact-grid">
      <aside className="contact-details" aria-label="DInterns contact details">
        <div className="panel contact-detail"><span className="icon-tile"><Mail size={21}/></span><div><h2>Email Us</h2><a href="mailto:support@dinterns.online">support@dinterns.online</a></div></div>
        <div className="panel contact-detail"><span className="icon-tile"><MapPin size={21}/></span><div><h2>Visit Us</h2><p>Delhi, India</p></div></div>
      </aside>
      <section className="panel contact-form">
        <h2>Send a support request</h2>
        {account.isPending?<Loader text="Checking your account…"/>:
        <form key={member?._id??'guest'} className="form-stack" onSubmit={event=>{
          const form=event.currentTarget,data=formData(event);
          const issue={subject:value(data,'subject'),category:value(data,'category'),description:value(data,'description')};
          action.mutate(member?{path:'/support/tickets',body:issue}:{
            path:'/contact',body:{...issue,fullName:value(data,'name'),email:value(data,'email'),phone:value(data,'phone').trim()||undefined},
          },{onSuccess:()=>form.reset()});
        }}>
          <div className="form-grid">
            <Field label="Full name"><input name="name" autoComplete="name" defaultValue={member?.fullName} readOnly={Boolean(member)} required minLength={2} maxLength={100}/></Field>
            <Field label="Email address"><input type="email" name="email" autoComplete="email" defaultValue={member?.email} readOnly={Boolean(member)} required maxLength={254}/></Field>
            <Field label={member?'Phone number':'Phone number (optional)'}><input type="tel" name="phone" autoComplete="tel" defaultValue={member?.mobileNumber} readOnly={Boolean(member)} maxLength={25}/></Field>
            <Field label="Category"><select name="category" defaultValue="Other">{supportCategories.map(category=><option key={category}>{category}</option>)}</select></Field>
          </div>
          <Field label="Subject"><input name="subject" required minLength={4} maxLength={150}/></Field>
          <Field label="Your message"><textarea name="description" rows={5} placeholder="How can we help you?" required minLength={10} maxLength={5000}/></Field>
          <Button type="submit" busy={action.isPending}><Send size={17}/>Send Request</Button>
          {action.error&&<Fault error={action.error}/>}
          {action.data&&<Status>Request sent. Reference {action.data.ticketId}.{member&&action.data._id&&<> <Link to={'/student/support?record='+action.data._id}>View request</Link></>}</Status>}
        </form>}
      </section>
    </div>
    <section className="contact-faq" id="faq"><h2>Frequently Asked Questions</h2><div className="faq">{faqs.map(([q,a],index)=><details key={q} id={index===13?'account-recovery':undefined}><summary>{q}</summary><p>{index===2&&settings.data?.reviewTime?settings.data.reviewTime:a}</p></details>)}</div></section>
  </div>;
}

export function Documents(){
  const account=useAccount(),[page,setPage]=useState(1),[error,setError]=useState<unknown>(null),[busy,setBusy]=useState('');
  const [params]=useSearchParams(),offerOnly=params.get('type')==='offer';
  const query=useData<Page>('/student/enrollments?page='+page,Boolean(account.data&&account.data.role!=='admin'));
  async function download(id:string,type:keyof typeof internshipDocumentNames){
    setBusy(id+type);setError(null);
    try{await openPdf('/student/enrollments/'+id+'/'+type,internshipDocumentNames[type]);void query.refetch();}
    catch(failure){setError(failure);}finally{setBusy('');}
  }
  return <div className="container content-page"><PageHeading title={offerOnly?'Download Offer Letter':'Internship Documents'}>Access issued documents from your DInterns internships.</PageHeading>
    {account.isPending&&<Loader/>}{account.error&&<Fault error={account.error} retry={account.refetch}/>}
    {account.data===null&&<Empty title="Sign in to access your documents"><Link className="btn primary" to={'/login?next='+encodeURIComponent('/documents'+(offerOnly?'?type=offer':''))}>Login</Link></Empty>}
    {account.data?.role==='admin'&&<Empty title="Student documents are linked to student accounts"><Link to="/admin/certificates">Open Certificate Management</Link></Empty>}
    {Boolean(account.data&&account.data.role!=='admin')&&query.isPending&&<Loader/>}{query.error&&<Fault error={query.error} retry={query.refetch}/>}
    {error!=null&&<Fault error={error}/>}
    {query.data?.total===0&&<Empty title="You have no internship documents yet"><Link className="btn primary" to="/internships">Explore Internships</Link></Empty>}
    <div className="card-grid">{query.data?.items.map((row:Row)=><article className="panel document-card" key={row._id}><span className="icon-tile">{offerOnly?<FileText size={24}/>:<BadgeCheck size={24}/>}</span><h2>{row.domainName}</h2><p>{row.studentInternshipId} · {day(row.applicationDate)}</p><div className="actions">{row.rulesAcceptedAt&&<Button variant="secondary" disabled={Boolean(busy)} busy={busy===row._id+'offer-letter'} onClick={()=>download(row._id,'offer-letter')}>Offer Letter</Button>}{!offerOnly&&row.certificateStatus==='issued'&&<Button disabled={Boolean(busy)} busy={busy===row._id+'certificate'} onClick={()=>download(row._id,'certificate')}>Certificate</Button>}{!offerOnly&&row.certificateStatus==='issued'&&<Button variant="secondary" disabled={Boolean(busy)} busy={busy===row._id+'recommendation-letter'} onClick={()=>download(row._id,'recommendation-letter')}>Letter of Recommendation</Button>}<Link to={'/student/internships/'+row._id} className="btn ghost">Track Internship</Link></div></article>)}</div>
    {query.data&&<Pagination page={query.data} change={setPage}/>}
  </div>;
}
