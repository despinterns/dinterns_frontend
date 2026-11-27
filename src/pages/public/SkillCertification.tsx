import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {Clock3,Download} from 'lucide-react';
import {openPdf,request,useAccount,useData} from '../../api/client';
import {openCheckout,type CheckoutOrder} from '../../api/checkout';
import {Badge,Button,Empty,Fault,Loader,Modal,PageHeading,Pagination,Status} from '../../components/ui';
import {ExamCard} from '../../components/ExamCard';
import {CertificateCheckout} from '../../components/CertificateCheckout';
import {PayuConfirmation,usePayuConfirmation} from '../../components/PayuConfirmation';
import type {ActiveAttempt,Exam,ExamProgress,ExamResult} from '../../examination';
import type {Page,SiteSettings} from '../../types';

const studentExams='/student/examinations';
const catalogue='/skill-certification';
const attemptLink=(id:string)=>catalogue+'/attempts/'+id;
type Payment=CheckoutOrder&{_id:string;status:string};

function useExamActions(){
  const [busy,setBusy]=useState('');
  const [error,setError]=useState<unknown>(null);
  const [message,setMessage]=useState('');
  const navigate=useNavigate(),cache=useQueryClient();
  function refreshProgress(){
    return cache.invalidateQueries({predicate:({queryKey})=>String(queryKey[0]).startsWith(studentExams+'/progress')});
  }
  const confirmation=usePayuConfirmation(()=>{void refreshProgress();});
  async function run(key:string,work:()=>Promise<void>){
    setBusy(key);setError(null);setMessage('');
    try{await work();}catch(error){setError(error);}finally{setBusy('');}
  }
  function start(id:string){
    return run('start:'+id,async()=>{
      const attempt=await request<ActiveAttempt|ExamResult>(studentExams+'/'+id+'/start');
      cache.setQueryData([studentExams+'/attempts/'+attempt._id],attempt);
      navigate(attemptLink(attempt._id));
    });
  }
  function unlock(id:string,promoCode?:string){
    return run('pay:'+id,async()=>{
      const payment=await request<Payment>('/payments/exam/order','POST',{examId:id,promoCode});
      function paymentResult({status}:{status:string}){
        if(status==='paid')setMessage('Your examination certificate is ready.');
        else if(status==='failed')setMessage('Payment failed. You can retry in Checkout.');
        else setMessage('Payment is pending. Use Unlock Certificate again to check.');
      }
      if(payment.status==='paid')setMessage('Your examination certificate is ready.');
      else await openCheckout(payment,'Examination certificate',{
        verify:async payload=>paymentResult(await request<{status:string}>('/payments/exam/verify','POST',{paymentId:payment._id,...payload})),
        reconcilePayu:exit=>confirmation.confirm({
          path:'/payments/exam/'+payment._id+'/reconcile',amount:payment.amountInPaise,label:'Skill certificate',
          successText:'Your skill certificate is ready to download.',
        },exit),
        dismiss:()=>setMessage('Checkout closed. Use Unlock Certificate again to check or resume payment.'),
        fail:()=>setMessage('Payment failed. You can retry in Checkout.'),
      });
      await refreshProgress();
    });
  }
  function download(id:string){
    return run('download:'+id,()=>openPdf(studentExams+'/'+id+'/certificate','DInterns-Examination-Certificate.pdf'));
  }
  return {busy,error,message,start,unlock,download,confirmation};
}
type Actions=ReturnType<typeof useExamActions>;
function ExamButtons({examId,progress,actions,canPay,canApplyPromo,amount,start}:{examId:string;progress?:ExamProgress;actions:Actions;canPay:boolean;canApplyPromo:boolean;amount?:number;start:()=>void}){
  const attempt=progress?.attempt;
  const certificateId=progress?.certificateId;
  return <div className="actions">
    {attempt?.active?<Link className="btn secondary" to={attemptLink(attempt._id)}>Resume Exam</Link>:
      <Button variant={progress?.passed?'secondary':'primary'} onClick={start} disabled={Boolean(actions.busy)}
        busy={actions.busy==='start:'+examId}>{attempt?progress?.passed?'Retake':'Try Again':'Start Exam'}</Button>}
    {certificateId?<>
      <Button variant="secondary" disabled={Boolean(actions.busy)} busy={actions.busy==='download:'+examId} onClick={()=>actions.download(examId)}><Download size={17}/>Download Certificate</Button>
      <Link className="btn ghost" to={'/verify-certificate?id='+encodeURIComponent(certificateId)}>Verify Certificate</Link>
    </>:progress?.passed&&<CertificateCheckout key={examId} product="skill" referenceId={examId}
      amount={progress.payment?.amountInPaise??amount??2900} canPay={canPay} canApplyPromo={canApplyPromo} disabled={Boolean(actions.busy)}
      busy={actions.busy==='pay:'+examId} onUnlock={code=>void actions.unlock(examId,code)}/>}
  </div>;
}
function ResultScore({result}:{result:ExamResult}){
  const percent=new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(result.correctCount*100/result.totalQuestions);
  return <div className="exam-score"><Badge kind={result.passed?'active':'failed'}>{result.passed?'Passed':'Below passing score'}</Badge>
    <strong>{percent}%</strong><span>{result.correctCount} of {result.totalQuestions} correct · {result.passingPercentage}% required</span>
  </div>;
}

export default function SkillCertification(){
  const [page,setPage]=useState(1);
  const [selected,setSelected]=useState<Exam|null>(null);
  const account=useAccount(),settings=useData<SiteSettings>('/settings/public');
  const list=useData<Page<Exam>>('/examinations?page='+page);
  const {hash}=useLocation();
  useEffect(()=>{
    if(list.isSuccess&&hash.startsWith('#exam-'))document.getElementById(hash.slice(1))?.scrollIntoView();
  },[hash,list.isSuccess]);
  const ids=list.data?.items.map(exam=>exam._id).join(',')??'';
  const canTake=Boolean(account.data&&account.data.role!=='admin');
  const progress=useData<Record<string,ExamProgress>>(studentExams+'/progress?ids='+ids,Boolean(ids&&canTake));
  const actions=useExamActions();
  return <div className="container content-page">
    <PayuConfirmation confirmation={actions.confirmation}/>
    <PageHeading title="Skill Certification">Take a timed exam and earn a verifiable DInterns certificate.</PageHeading>
    {list.isPending&&<Loader/>}{list.error&&<Fault error={list.error} retry={list.refetch}/>}
    {progress.error&&<Fault error={progress.error} retry={progress.refetch}/>}
    {actions.error!=null&&<Fault error={actions.error}/>}
    {actions.message&&<Status>{actions.message}</Status>}
    {list.data&&<>
      {!list.data.total&&<Empty title="No live exams right now"/>}
      <div className="card-grid">{list.data.items.map(exam=>{
        const state=progress.data?.[exam._id];
        return <ExamCard key={exam._id} exam={exam}>
            {state?.attempt?.active===false&&<ResultScore result={state.attempt}/>}
            {canTake&&progress.isPending?<Loader text="Checking exam progress…"/>:canTake?
              <ExamButtons examId={exam._id} progress={state} actions={actions} canPay={Boolean(settings.data?.paymentsConfigured)} canApplyPromo={Boolean(settings.data?.promoCodesEnabled)}
                amount={settings.data?.examCertificateFee} start={()=>setSelected(exam)}/>:
              account.data===null?<Link className="btn primary" to={'/login?next='+encodeURIComponent(catalogue)}>Sign in to take exam</Link>:null}
        </ExamCard>;
      })}</div>
      <Pagination page={list.data} change={setPage}/>
    </>}
    {selected&&<Modal title={selected.name} close={()=>setSelected(null)}>
      <p>You have {selected.durationMinutes} minutes from the moment you start. The timer keeps running if you leave this page.</p>
      <Button onClick={()=>{void actions.start(selected._id);setSelected(null);}}>Start Exam</Button>
    </Modal>}
  </div>;
}

function TimedExam({attempt,receivedAt,onResult}:{attempt:ActiveAttempt;receivedAt:number;onResult:(result:ExamResult)=>void}){
  const localDeadline=receivedAt+Date.parse(attempt.deadline)-Date.parse(attempt.serverTime);
  const [seconds,setSeconds]=useState(()=>Math.max(0,Math.ceil((localDeadline-Date.now())/1000)));
  const [answers,setAnswers]=useState(attempt.answers);
  const [saving,setSaving]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState<unknown>(null);
  const autoSubmitted=useRef(false);
  useEffect(()=>{
    const interval=window.setInterval(()=>setSeconds(Math.max(0,Math.ceil((localDeadline-Date.now())/1000))),250);
    return ()=>window.clearInterval(interval);
  },[localDeadline]);
  const path=studentExams+'/attempts/'+attempt._id;
  async function submit(){
    setError(null);setSubmitting(true);
    try{onResult(await request<ExamResult>(path+'/submit'));}
    catch(error){setError(error);}
    finally{setSubmitting(false);}
  }
  useEffect(()=>{
    if(seconds===0&&!saving&&!submitting&&!autoSubmitted.current){autoSubmitted.current=true;void submit();}
  },[seconds,saving,submitting]);
  async function save(index:number,option:number){
    const previous=answers;
    setAnswers({...previous,[index]:option});
    setError(null);setSaving(true);
    try{
      const result=await request<{saved:true}|ExamResult>(path+'/answer','PATCH',{index,option});
      if(!('saved' in result))onResult(result);
    }catch(error){setAnswers(previous);setError(error);}
    finally{setSaving(false);}
  }
  const timer=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  return <>
    <div className="panel exam-timer"><span>{Object.keys(answers).length} of {attempt.questions.length} answered</span><strong><Clock3 size={18}/><span aria-label="Time remaining" role="timer">{timer}</span></strong></div>
    <form className="form-stack" onSubmit={event=>{event.preventDefault();void submit();}}>
      {attempt.questions.map((question,index)=><fieldset className="panel exam-question form-stack" key={index} disabled={saving||submitting||seconds===0}>
        <legend>{index+1}. {question.question}</legend>
        {question.options.map((option,position)=><label className="exam-choice" key={position}>
          <input type="radio" name={'question-'+index} checked={answers[index]===position} onChange={()=>void save(index,position)}/><span>{option}</span>
        </label>)}
      </fieldset>)}
      {error!=null&&<Fault error={error}/>}
      <div className="actions"><Button type="submit" disabled={saving} busy={submitting}>{seconds===0?'Get Result':'Submit Exam'}</Button></div>
    </form>
  </>;
}

export function ExaminationAttempt(){
  const {attemptId}=useParams();
  const [params]=useSearchParams();
  const account=useAccount(),cache=useQueryClient();
  const path=studentExams+'/attempts/'+attemptId;
  const attempt=useData<ActiveAttempt|ExamResult>(path,Boolean(attemptId&&account.data&&account.data.role!=='admin'));
  const examId=attempt.data?.active===false?attempt.data.examId:'';
  const progress=useData<Record<string,ExamProgress>>(studentExams+'/progress?ids='+examId,Boolean(examId));
  const settings=useData<SiteSettings>('/settings/public');
  const actions=useExamActions();
  if(account.isPending)return <Loader/>;
  if(account.error)return <div className="container content-page"><Fault error={account.error} retry={account.refetch}/></div>;
  if(!account.data||account.data.role==='admin')return <div className="container content-page"><Empty title="Sign in with a student account">
    <Link className="btn primary" to={'/login?next='+encodeURIComponent(attemptLink(attemptId??''))}>Sign in</Link>
  </Empty></div>;
  if(attempt.isPending)return <Loader/>;
  if(attempt.error)return <div className="container content-page"><Fault error={attempt.error} retry={attempt.refetch}/></div>;
  const record=attempt.data;
  if(!record)return null;
  return <div className="container content-page exam-attempt">
    <PayuConfirmation confirmation={actions.confirmation}/>
    <Link to={catalogue}>Skill Certification</Link>
    <PageHeading title={record.examName}/>
    {record.active?<TimedExam key={record._id} attempt={record} receivedAt={attempt.dataUpdatedAt} onResult={result=>{
      cache.setQueryData([path],result);
      void cache.invalidateQueries({predicate:({queryKey})=>String(queryKey[0]).startsWith(studentExams+'/progress')});
    }}/>:<section className="panel exam-result form-stack">
      <h2>Exam Result</h2><ResultScore result={record}/>
      {actions.error!=null&&<Fault error={actions.error}/>}
      {actions.message&&<Status>{actions.message}</Status>}
      {!actions.message&&params.get('paymentReturn')==='payu'&&(progress.data?.[record.examId]?.certificateId?
        <Status>Payment verified. Your skill certificate is ready to download.</Status>:
        <div className="info" role="status">Check your certificate status below.</div>)}
      <ExamButtons examId={record.examId} progress={progress.data?.[record.examId]??{attempt:record,passed:record.passed}}
        actions={actions} canPay={Boolean(settings.data?.paymentsConfigured)} canApplyPromo={Boolean(settings.data?.promoCodesEnabled)} amount={settings.data?.examCertificateFee}
        start={()=>void actions.start(record.examId)}/>
    </section>}
  </div>;
}
