import {Link} from 'react-router-dom';
import {Award,BadgeCheck,BriefcaseBusiness,CalendarClock,CodeXml,FileCheck2,GraduationCap,Headphones,ShieldCheck,Wallet,Clock3,ListChecks,Layers3} from 'lucide-react';
import {motion,useReducedMotion} from 'framer-motion';
import {useData} from '../../api/client';
import {Empty,Fault,Skeleton} from '../../components/ui';
import type {Domain,Page} from '../../types';
import {ExamCard} from '../../components/ExamCard';
import {StudentReviews} from '../../components/StudentReviews';
import type {Exam} from '../../examination';

const benefits=[[Wallet,'Free Applications'],[CodeXml,'Practical Projects'],[CalendarClock,'Flexible Learning'],[ShieldCheck,'Verifiable Certificates']] as const;
const features=[
  [Wallet,'Free Applications','Apply for ₹0 and access your offer letter and internship tasks for free.'],
  [CodeXml,'Practical Project-Based Learning','Build projects you can explain, share, and add to your portfolio.'],
  [CalendarClock,'Flexible Internship Schedule','Plan your project work around classes and other commitments.'],
  [FileCheck2,'Digital Offer Letters','Access your official offer letter after approval and rules acceptance.'],
  [GraduationCap,'Industry-Relevant Skills','Practise tools and techniques relevant to your chosen domain.'],
  [Award,'Verifiable Completion Certificates','Eligible certificates include a unique verification ID.'],
  [Headphones,'Student Support','Get help with applications, tasks, and documents from the dashboard.'],
  [ListChecks,'Transparent Evaluation','See your submission status, feedback, and next steps in one place.'],
] as const;
export function DomainCard({domain,action}:{domain:Domain;action?:()=>void}){
  return <article className="domain-card">
    {domain.imageUrl?<img src={domain.imageUrl} alt="" loading="lazy" className="domain-image"/>:<div className="domain-image domain-art"><Layers3 size={45}/></div>}
    <div className="domain-body"><div className="domain-category">{domain.category}</div><h3>{domain.domainName}</h3><p>{domain.description}</p>
      <div className="domain-meta"><span><Clock3 size={16}/>1 month</span><span><ListChecks size={16}/>{domain.totalTasks} tasks</span></div>
      <div className="domain-actions"><span className="badge green">Free to Apply</span>{action?<button className="btn primary" onClick={action}>Apply Now</button>:<Link className="btn secondary" to={'/internships?domain='+domain._id}>Explore Internship</Link>}</div>
    </div>
  </article>;
}
export default function Home(){
  const domains=useData<Domain[]>('/internships');
  const exams=useData<Page<Exam>>('/examinations?page=1');
  const reduced=useReducedMotion();
  return <>
    <section className="hero">
      <div className="container hero-grid">
        <motion.div className="hero-copy" initial={reduced?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.4}}>
          <div className="hero-badge"><span/><span>Virtual internships · Free to apply</span></div>
          <h1 className="hero-brandline">DInterns — Desperate Interns</h1>
          <h2 className="hero-tagline">From Desperate<br className="hero-line"/> to <em>Determined.</em></h2>
          <h3 className="hero-support">Your Career Starts With an Opportunity.</h3>
          <p>Gain practical experience, build real-world projects and develop industry-relevant skills through our virtual internship programmes.</p>
          <div className="actions hero-actions"><Link to="/internships" className="btn primary"><BriefcaseBusiness size={18}/>Apply Internship</Link><Link to="/verify-certificate" className="btn secondary"><ShieldCheck size={18}/>Verify Certificate</Link></div>
        </motion.div>
        <div className="hero-visual">
          <div className="hero-photo"><img src="/student-work.webp" alt="Student working on a laptop in a campus study space" fetchPriority="high"/></div>
          <div className="hero-note"><span className="hero-note-icon"><CodeXml size={22}/></span><div><strong>Build your portfolio</strong><small>Complete practical projects</small></div></div>
          <div className="hero-note top"><span className="hero-note-icon"><GraduationCap size={20}/></span><div><strong>100% virtual</strong><small>Learn from anywhere</small></div></div>
        </div>
      </div>
      <div className="container benefit-strip">{benefits.map(([Icon,title])=><div key={title}><Icon size={22}/><strong>{title}</strong></div>)}</div>
    </section>
    <section className="section container" id="why-dinterns">
      <div className="section-title centered"><h2>Why Choose DInterns?</h2><p>Everyone deserves an opportunity to put their skills into practice.</p></div>
      <div className="feature-grid">{features.map(([Icon,title,copy])=><article key={title} className="feature"><span className="icon-tile"><Icon size={23}/></span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>
    <section className="section domain-section" id="available-internships"><div className="container">
      <div className="section-title section-row"><div><h2>Available Internship Domains</h2><p>Find a programme that fits the skills you want to build.</p></div><Link className="btn secondary" to="/internships">View All Internships</Link></div>
      {domains.isPending&&<Skeleton/>}{domains.error&&<Fault error={domains.error} retry={domains.refetch}/>}
      {domains.data?.length?<div className="card-grid">{domains.data.slice(0,3).map(domain=><DomainCard key={domain._id} domain={domain}/>)}</div>:domains.data&&<Empty title="No internships are open right now">New domains will appear here when applications open.</Empty>}
    </div></section>
    <section className="certificate-showcase"><div className="container certificate-grid">
      <div className="certificate-copy"><span className="icon-tile light-tile"><Award size={24}/></span><h2>Earn a Verifiable Certificate of Completion</h2><p>Showcase your practical experience with a digitally generated DInterns internship completion certificate. Every issued certificate includes a unique ID linked to the official verification page.</p>
        <div className="actions"><Link className="btn primary" to="/internships">Start Your Journey</Link><Link className="btn dark-outline" to="/verify-certificate">Verify Certificate</Link></div><Link className="certificate-link" to="/documents?type=offer"><FileCheck2 size={17}/>Download Offer Letter</Link></div>
      <div className="sample-wrap"><img className="sample" src="/internship-certificate-sample.webp" alt="Sample DInterns internship certificate showing the official design" width="1263" height="893" loading="lazy"/><div className="sample-status"><BadgeCheck size={22}/>Sample certificate</div></div>
    </div></section>
    <section className="section domain-section" id="skill-certification"><div className="container">
      <div className="section-title section-row"><div><h2>Skill Certification</h2><p>Explore available skill exams and earn a verifiable DInterns certificate.</p></div><Link className="btn secondary" to="/skill-certification">View All Exams</Link></div>
      {exams.isPending&&<Skeleton/>}{exams.error&&<Fault error={exams.error} retry={exams.refetch}/>}
      {exams.data?.items.length?<div className="card-grid">{exams.data.items.slice(0,3).map(exam=><ExamCard key={exam._id} exam={exam} heading="h3">
        <div className="actions"><Link className="btn secondary" to={'/skill-certification#exam-'+exam._id}>View Exam</Link></div>
      </ExamCard>)}</div>:exams.data&&<Empty title="No live exams right now"/>}
    </div></section>
    <StudentReviews/>
  </>;
}
