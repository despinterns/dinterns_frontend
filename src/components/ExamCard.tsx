import type {ReactNode} from 'react';
import {Award} from 'lucide-react';
import type {Exam} from '../examination';

export function ExamCard({exam,heading:Heading='h2',children}:{exam:Exam;heading?:'h2'|'h3';children?:ReactNode}){
  return <article className="panel exam-card" id={'exam-'+exam._id}>
    {exam.bannerUrl&&<img src={exam.bannerUrl} alt="" loading="lazy"/>}
    <div className="exam-card-content">
      {!exam.bannerUrl&&<span className="icon-tile"><Award size={23}/></span>}
      <Heading>{exam.name}</Heading>
      <p>{exam.totalQuestions} {exam.totalQuestions===1?'question':'questions'} · {exam.durationMinutes} {exam.durationMinutes===1?'minute':'minutes'} · {exam.passingPercentage}% to pass</p>
      {children}
    </div>
  </article>;
}
