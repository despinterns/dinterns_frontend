import {useEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useReducedMotion} from 'framer-motion';
import {Check,Pause,Play,Star} from 'lucide-react';
import {get} from '../api/client';
import {day,initials,type PublicReview,type ReviewPage} from '../types';
import {Empty,Fault} from './ui';

async function loadReviews(signal:AbortSignal){
  const path='/reviews/public?limit=50';
  const first=await get<ReviewPage>(path,signal);
  const items=new Map(first.items.map(review=>[review._id,review]));
  const pages=Math.min(1000,Math.ceil(first.total/first.limit));
  for(let page=2;page<=pages;page++){
    const next=await get<ReviewPage>(path+'&page='+page,signal);
    if(!next.visible)return next;
    for(const review of next.items)items.set(review._id,review);
  }
  return {...first,items:[...items.values()]};
}

function ReviewCard({review,duplicate=false}:{review:PublicReview;duplicate?:boolean}){
  return <article className="panel review-card" aria-hidden={duplicate||undefined}>
    <div className="review-author"><span className="avatar" aria-hidden="true">{initials(review.displayName)}</span><div><strong>{review.displayName}</strong><small>{review.domainName}</small></div></div>
    <div className="stars" role="img" aria-label={review.rating+' out of 5 stars'}>{Array.from({length:5},(_,index)=><Star aria-hidden="true" key={index} size={17} fill={review.rating>index?'currentColor':'none'}/>)}</div>
    <p>{review.text}</p>
    <div className="review-footer"><time dateTime={review.createdAt}>{day(review.createdAt)}</time>{review.verified&&<span><Check size={16}/>Verified Intern</span>}</div>
  </article>;
}

function ReviewCarousel({items}:{items:PublicReview[]}){
  const reducedMotion=useReducedMotion();
  const [paused,setPaused]=useState(false);
  const [interacting,setInteracting]=useState(false);
  const viewportRef=useRef<HTMLDivElement>(null);
  const groupRef=useRef<HTMLDivElement>(null);
  const loops=!reducedMotion&&items.length>1;
  const playing=loops&&!paused&&!interacting;
  // Keep each copy wider than the viewport, even with just two reviews.
  const copies=loops?Math.ceil(4/items.length):1;
  const cards=Array.from({length:copies},()=>items).flat();

  useEffect(()=>{
    const viewport=viewportRef.current;
    const group=groupRef.current;
    if(!playing||!viewport||!group)return;
    let width=group.getBoundingClientRect().width;
    let position=viewport.scrollLeft;
    let lastScroll=position;
    let previousTime:number|undefined;
    let frame=0;
    const resize=new ResizeObserver(()=>{width=group.getBoundingClientRect().width;});
    resize.observe(group);

    function advance(time:number){
      if(!viewport)return;
      if(width>0&&previousTime!==undefined){
        if(viewport.scrollLeft!==lastScroll)position=viewport.scrollLeft;
        position=(position+Math.min(time-previousTime,50)*0.028)%width;
        viewport.scrollLeft=position;
        lastScroll=viewport.scrollLeft;
      }
      previousTime=time;
      frame=requestAnimationFrame(advance);
    }

    const visibility=new IntersectionObserver(([entry])=>{
      cancelAnimationFrame(frame);
      previousTime=undefined;
      if(entry.isIntersecting)frame=requestAnimationFrame(advance);
    });
    visibility.observe(viewport);
    return ()=>{
      visibility.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
    };
  },[playing]);

  return <>
    {loops&&<div className="review-controls">
      <button className="btn secondary" type="button" onClick={()=>setPaused(value=>!value)}>
        {paused?<Play size={16}/>:<Pause size={16}/>} {paused?'Play reviews':'Pause reviews'}
      </button>
    </div>}
    <div className="review-viewport" ref={viewportRef} tabIndex={items.length>1?0:undefined} role="region" aria-label="Student review cards"
      onPointerEnter={event=>{if(event.pointerType==='mouse')setInteracting(true);}}
      onPointerLeave={event=>{if(event.pointerType==='mouse')setInteracting(false);}}
      onPointerDown={event=>{if(event.pointerType!=='mouse')setPaused(true);}}
      onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setPaused(true);}}>
      <div className="review-track">
        <div className="review-group" ref={groupRef}>
          {cards.map((review,index)=><ReviewCard key={index<items.length?review._id:'repeat-'+index} review={review} duplicate={index>=items.length}/>)}
        </div>
        {loops&&<div className="review-group" aria-hidden="true">
          {cards.map((review,index)=><ReviewCard key={index} review={review}/>)}
        </div>}
      </div>
    </div>
  </>;
}

export function StudentReviews(){
  const reviews=useQuery({queryKey:['/reviews/public'],queryFn:({signal})=>loadReviews(signal),refetchInterval:15000});
  const data=reviews.data;
  if(!data?.visible)return null;

  return <section className="section container" aria-labelledby="student-reviews-title">
    <div className="section-title section-row">
      <div><h2 id="student-reviews-title">Student Reviews</h2><p>Hear from students who completed their internships.</p></div>
      {data.total>0&&<div className="rating-summary"><Star aria-hidden="true" fill="currentColor" size={20}/><strong>{data.average.toFixed(1)}</strong><span>· {data.total} {data.total===1?'review':'reviews'}</span></div>}
    </div>
    {reviews.error&&<Fault error={reviews.error} retry={reviews.refetch}/>}
    {data.items.length>0?<ReviewCarousel items={data.items}/>:<Empty title="No published reviews yet">Student reviews will appear here when approved for publication.</Empty>}
  </section>;
}
