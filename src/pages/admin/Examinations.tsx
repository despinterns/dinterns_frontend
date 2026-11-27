import {useState,type FormEvent} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {FileUp,Plus} from 'lucide-react';
import {request,useData} from '../../api/client';
import {Badge,Button,Empty,Fault,Field,Loader,PageHeading,Pagination,toast} from '../../components/ui';
import {parseExamQuestions,type Exam,type ExamQuestion} from '../../examination';
import type {Page} from '../../types';

type ExamRecord=Exam&{status:'published'|'draft';questions:ExamQuestion[];revision:number};
const blankQuestion=():ExamQuestion=>({question:'',options:['','','',''],correctIndex:-1});
const example='[{"question":"What does HTML stand for?","options":["HyperText Markup Language","Home Tool Markup Language"],"correctAnswer":"A"}]';

function ExamEditor({exam,done}:{exam?:ExamRecord;done:()=>void}){
  const [name,setName]=useState(exam?.name??'');
  const [total,setTotal]=useState(exam?.totalQuestions??0);
  const [duration,setDuration]=useState(exam?.durationMinutes??30);
  const [passing,setPassing]=useState(exam?.passingPercentage??60);
  const [questions,setQuestions]=useState<ExamQuestion[]>(exam?.questions??[]);
  const [banner,setBanner]=useState<File>();
  const [importing,setImporting]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<unknown>(null);
  function replaceQuestions(next:ExamQuestion[]){
    if(total===0||total===questions.length)setTotal(next.length);
    setQuestions(next);
  }
  function changeQuestion(index:number,next:ExamQuestion){
    setQuestions(questions.map((entry,position)=>position===index?next:entry));
  }
  async function importQuestions(files:File[]){
    if(!files.length)return;
    setError(null);setImporting(true);
    try{
      const imported=(await Promise.all(files.map(async file=>{
        if(!/\.json$/i.test(file.name)||file.size>1024*1024)throw new Error(file.name+' must be a JSON file of up to 1 MB.');
        try{return parseExamQuestions(await file.text());}
        catch(error){throw new Error(file.name+' › '+(error instanceof Error?error.message:'Invalid JSON file.'));}
      }))).flat();
      if(questions.length+imported.length>100)throw new Error('An exam can have up to 100 questions.');
      replaceQuestions([...questions,...imported]);
      toast('Imported '+imported.length+' questions. Review them before publishing.');
    }catch(error){setError(error);}
    finally{setImporting(false);}
  }
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const status=(event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')==='draft'?'draft':'published';
    setError(null);setSaving(true);
    try{
      if(total!==questions.length)throw new Error('Total questions must match the '+questions.length+' questions entered.');
      const missing=questions.findIndex(question=>question.correctIndex<0);
      if(missing>=0)throw new Error('Select the correct answer for question '+(missing+1)+'.');
      const data=new FormData();
      data.append('exam',JSON.stringify({name,totalQuestions:total,durationMinutes:duration,passingPercentage:passing,questions,status,revision:exam?.revision}));
      if(banner)data.append('image',banner);
      await request(exam?'/admin/examinations/'+exam._id:'/admin/examinations',exam?'PATCH':'POST',data);
      toast(status==='published'?'Exam published.':'Exam saved as a draft.');done();
    }catch(error){setError(error);}
    finally{setSaving(false);}
  }
  return <form className="panel exam-editor form-stack" onSubmit={save}>
    <fieldset className="exam-controls form-stack" disabled={saving||importing}>
      <div className="form-grid">
        <Field label="Name of exam"><input value={name} onChange={e=>setName(e.target.value)} required maxLength={120}/></Field>
        <Field label="Banner (optional)"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setBanner(e.target.files?.[0])}/></Field>
        <Field label="Total questions"><input type="number" min="1" max="100" required value={total||''} onChange={e=>setTotal(Number(e.target.value))}/></Field>
        <Field label="Time limit (minutes)"><input type="number" min="1" max="240" required value={duration||''} onChange={e=>setDuration(Number(e.target.value))}/></Field>
        <Field label="Passing percentage"><input type="number" min="1" max="100" required value={passing||''} onChange={e=>setPassing(Number(e.target.value))}/></Field>
      </div>
      <section className="exam-import">
        <div className="section-row"><h2>Questions</h2><span>{questions.length} entered</span></div>
        <Field label="Import MCQ JSON files"><input type="file" accept=".json,application/json" multiple onChange={e=>{
          const files=Array.from(e.currentTarget.files??[]);e.currentTarget.value='';void importQuestions(files);
        }}/></Field>
        <details><summary><FileUp size={15}/> JSON format example</summary><pre>{example}</pre><p>Use the option letter, the answer text, or a zero-based <code>correctIndex</code>.</p></details>
        {importing&&<Loader text="Importing questions…"/>}
        {error!=null&&<Fault error={error}/>}
      </section>
      {questions.map((entry,index)=><fieldset key={index} className="exam-question form-stack">
        <legend>Question {index+1}</legend>
        <Field label="Question text"><textarea value={entry.question} required maxLength={1000} onChange={e=>changeQuestion(index,{...entry,question:e.target.value})}/></Field>
        <div className="form-grid">
          {entry.options.map((option,position)=><Field key={position} label={'Option '+String.fromCharCode(65+position)}>
            <div className="exam-option-edit"><input value={option} required maxLength={300} onChange={e=>changeQuestion(index,{
              ...entry,options:entry.options.map((text,i)=>i===position?e.target.value:text),
            })}/>
            {entry.options.length>2&&<Button variant="ghost" type="button" aria-label={'Remove option '+String.fromCharCode(65+position)} onClick={()=>changeQuestion(index,{
              ...entry,options:entry.options.filter((_,i)=>i!==position),
              correctIndex:entry.correctIndex===position?-1:entry.correctIndex-Number(entry.correctIndex>position),
            })}>Remove</Button>}</div>
          </Field>)}
        </div>
        <Field label="Correct answer"><select required value={entry.correctIndex<0?'':entry.correctIndex} onChange={e=>changeQuestion(index,{...entry,correctIndex:e.target.value===''?-1:Number(e.target.value)})}>
          <option value="">Choose option</option>{entry.options.map((option,i)=><option value={i} key={i}>{String.fromCharCode(65+i)} {option}</option>)}
        </select></Field>
        <div className="actions">
          {entry.options.length<6&&<Button variant="secondary" type="button" onClick={()=>changeQuestion(index,{...entry,options:[...entry.options,'']})}>Add Option</Button>}
          <Button variant="ghost" type="button" onClick={()=>replaceQuestions(questions.filter((_,i)=>i!==index))}>Remove Question</Button>
        </div>
      </fieldset>)}
      <div className="actions"><Button variant="secondary" type="button" disabled={questions.length>=100} onClick={()=>replaceQuestions([...questions,blankQuestion()])}><Plus size={17}/> Add Question</Button></div>
      <div className="actions">
        <Button type="submit" value="published" busy={saving}>{exam?.status==='published'?'Save Published Exam':'Publish Exam'}</Button>
        <Button type="submit" value="draft" variant="secondary">{exam?.status==='published'?'Unpublish to Draft':'Save as Draft'}</Button>
        <Button type="button" variant="ghost" onClick={done}>Cancel</Button>
      </div>
    </fieldset>
  </form>;
}

export default function Examinations(){
  const [page,setPage]=useState(1);
  const [selected,setSelected]=useState<string|null>(null);
  const cache=useQueryClient();
  const list=useData<Page<ExamRecord>>('/admin/examinations?page='+page);
  const detail=useData<ExamRecord>('/admin/examinations/'+selected,Boolean(selected&&selected!=='new'));
  function done(){setSelected(null);if(selected)cache.removeQueries({queryKey:['/admin/examinations/'+selected],exact:true});void list.refetch();}
  if(selected){
    return <div>
      <PageHeading title={selected==='new'?'New Exam':'Edit Exam'}>Review the questions and correct answers before publishing.</PageHeading>
      {selected==='new'?<ExamEditor key="new" done={done}/>:detail.isPending?<Loader/>:detail.error?<Fault error={detail.error} retry={detail.refetch}/>:detail.data&&<ExamEditor key={selected} exam={detail.data} done={done}/>}
    </div>;
  }
  return <div>
    <div className="section-row"><PageHeading title="Manage Examinations"/><Button onClick={()=>setSelected('new')}><Plus size={18}/> New Exam</Button></div>
    {list.isPending&&<Loader/>}{list.error&&<Fault error={list.error} retry={list.refetch}/>}
    {list.data&&<>
      {list.data.total===0&&<Empty title="No exams yet"/>}
      <div className="card-grid">{list.data.items.map(exam=><article className="panel exam-card" key={exam._id}>
        {exam.bannerUrl&&<img src={exam.bannerUrl} alt=""/>}
        <div className="exam-card-content">
          <Badge kind={exam.status==='published'?'active':'draft'}>{exam.status==='published'?'Live':'Draft'}</Badge>
          <h2>{exam.name}</h2><p>{exam.totalQuestions} questions · {exam.durationMinutes} minutes · {exam.passingPercentage}% to pass</p>
          <Button variant="secondary" onClick={()=>setSelected(exam._id)}>Edit Exam</Button>
        </div>
      </article>)}</div>
      <Pagination page={list.data} change={setPage}/>
    </>}
  </div>;
}
