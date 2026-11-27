export type ExamQuestion={question:string;options:string[];correctIndex:number};
export type Exam={
  _id:string;name:string;totalQuestions:number;passingPercentage:number;durationMinutes:number;bannerUrl?:string;
};
export type ExamResult={
  _id:string;examId:string;examName:string;active:false;correctCount:number;totalQuestions:number;passingPercentage:number;passed:boolean;
};
export type ActiveAttempt={
  _id:string;examId:string;examName:string;active:true;deadline:string;serverTime:string;
  questions:Omit<ExamQuestion,'correctIndex'>[];answers:Record<number,number>;
};
export type ExamProgress={attempt:{_id:string;active:true}|ExamResult|null;passed:boolean;certificateId?:string;payment?:{amountInPaise:number}};

export function parseExamQuestions(text:string):ExamQuestion[]{
  const data=JSON.parse(text.replace(/^\uFEFF/,''));
  const rows=Array.isArray(data)?data:data?.questions??data?.mcqs;
  if(!Array.isArray(rows)||rows.length<1||rows.length>100)throw new Error('Use a JSON array of 1–100 questions, or put that array under "questions" or "mcqs".');
  return rows.map((row,index)=>{
    const label='Question '+(index+1);
    const question=row?.question??row?.text??row?.prompt;
    const source=row?.options??row?.choices;
    const options:Array<[string,string]>=Array.isArray(source)
      ?source.map((option,position)=>[String.fromCharCode(65+position),option])
      :source&&typeof source==='object'?Object.entries(source):[];
    if(typeof question!=='string'||!question.trim()||options.length<2||options.length>6||
      options.some(([,option])=>typeof option!=='string'||!option.trim()))throw new Error(label+' needs question text and 2–6 text options.');
    const values=options.map(([,option])=>option.trim());
    const answer=row.correctAnswer??row.correct_answer??row.answer??row.correctOption??row.correct_option;
    let correctIndex=row.correctIndex??row.correct_index;
    if(correctIndex==null){
      const match=String(answer??'').trim();
      correctIndex=values.findIndex(value=>value.toLowerCase()===match.toLowerCase());
      if(correctIndex<0)correctIndex=options.findIndex(([key])=>key.toLowerCase()===match.toLowerCase());
      if(correctIndex<0&&/^\d+$/.test(match))correctIndex=Number(match)-1;
    }
    if(!Number.isInteger(correctIndex)||correctIndex<0||correctIndex>=values.length)throw new Error(label+' has an invalid correct answer.');
    if(new Set(values.map(value=>value.toLowerCase())).size!==values.length)throw new Error(label+' has duplicate options.');
    return {question:question.trim(),options:values,correctIndex};
  });
}
