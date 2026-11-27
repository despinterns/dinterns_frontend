import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useSearchParams} from 'react-router-dom';
import {BadgeCheck,Search,ShieldCheck,TriangleAlert} from 'lucide-react';
import {motion,useReducedMotion} from 'framer-motion';
import {useAction} from '../../api/client';
import {Button,Fault,Field} from '../../components/ui';
import {day} from '../../types';
type Result={status:'issued'|'revoked'|'invalid';type?:'examination';candidateName?:string;domainName?:string;examName?:string;completedAt?:string;certificateId?:string;startDate?:string;endDate?:string;issueDate?:string;};
export default function Verify(){
  const [params]=useSearchParams(),[id,setId]=useState(params.get('id')??'');
  const reduced=useReducedMotion(),action=useAction<Result>(),auto=useRef('');
  const valid=/^DI\/(?:[A-Z0-9]{2,8}\/\d{6}|EXAM\/[A-F0-9]{16})$/;
  const verify=(value:string)=>action.mutate({path:'/certificates/verify',body:{id:value.toUpperCase().trim()}});
  const direct=params.get('id')?.trim().toUpperCase()??'';
  useEffect(()=>{if(direct&&direct!==auto.current&&valid.test(direct)){auto.current=direct;setId(direct);verify(direct);}},[direct]);
  function submit(e:FormEvent){e.preventDefault();verify(id);}
  const result=action.data,issued=result?.status==='issued';
  return <div className="verification-bg"><div className={'container verify-layout '+(issued?'results':'')}>
    <motion.section layout={!reduced} className="panel verify-form">
      <span className="icon-tile"><ShieldCheck size={27}/></span><h1>Verify Certificate</h1><p>Enter a DInterns internship or examination certificate ID.</p>
      <form className="form-stack" onSubmit={submit}><Field label="Certificate ID"><input value={id} onChange={e=>setId(e.target.value)} placeholder="Enter certificate ID" autoCapitalize="characters" autoComplete="off" maxLength={24} required/></Field>
        <Button type="submit" busy={action.isPending}><Search size={18}/>Verify Certificate</Button>
        {action.error&&<Fault error={action.error}/>}
        {result?.status==='invalid'&&<div className="fault" role="status">No valid certificate was found. Please check the certificate ID and try again.</div>}
        {result?.status==='revoked'&&<div className="fault" role="status"><TriangleAlert size={19}/>This certificate has been revoked.</div>}
      </form>
    </motion.section>
    {issued&&<motion.section className="panel verify-result" aria-live="polite" initial={reduced?false:{opacity:0,x:16}} animate={{opacity:1,x:0}}><h2>Certificate details</h2><dl className="details">
      {[['Candidate Name',result.candidateName],...(result.type==='examination'?
        [['Examination',result.examName],['Completion Date',day(result.completedAt)]]:
        [['Internship Domain',result.domainName],['Internship Starting Date',day(result.startDate)],['Internship Ending Date',day(result.endDate)]]),
        ['Certificate ID',result.certificateId],['Certificate Issue Date',day(result.issueDate)],['Verification Status','Valid']].map(([key,val])=><div key={key}><dt>{key}</dt><dd>{val}</dd></div>)}
    </dl><div className="success"><BadgeCheck size={21}/>{result.type==='examination'?'Verified Examination Certificate':'Verified Intern'}</div></motion.section>}
  </div></div>;
}
