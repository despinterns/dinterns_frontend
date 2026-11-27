import {useState} from 'react';
import {isAxiosError} from 'axios';
import {CheckCircle2,Clock3,TriangleAlert} from 'lucide-react';
import {request} from '../api/client';
import type {PayuExit} from '../api/checkout';
import {rupees} from '../types';
import {Button,Modal} from './ui';

type PaymentCheck={path:string;label:string;amount:number;successText:string};
type Outcome='checking'|'paid'|'pending'|'failed'|'closed'|'needs_review'|'refunded'|'unavailable';
type Feedback=PaymentCheck&{outcome:Outcome};
const isFinal=(status:string):status is 'paid'|'failed'|'needs_review'|'refunded'=>
  status==='paid'||status==='failed'||status==='needs_review'||status==='refunded';
const pause=(ms:number)=>new Promise<void>(resolve=>window.setTimeout(resolve,ms));

export function usePayuConfirmation(onUpdate:()=>void){
  const [feedback,setFeedback]=useState<Feedback|null>(null);

  async function confirm(check:PaymentCheck,exit:PayuExit='returned'){
    setFeedback({...check,outcome:'checking'});
    let outcome:Outcome='pending';
    const delays=exit==='returned'?[0,1500,3000]:[0];
    for(const delay of delays){
      if(delay)await pause(delay);
      try{
        const {status}=await request<{status:string}>(check.path);
        if(isFinal(status)){outcome=status;break;}
        outcome=status==='created'&&exit==='closed'?'closed':'pending';
      }catch(error){
        outcome='unavailable';
        const status=isAxiosError(error)?error.response?.status:undefined;
        if(status&&status<500)break;
      }
    }
    setFeedback(current=>current?.path===check.path?{...current,outcome}:current);
    onUpdate();
  }

  return {feedback,confirm,close:()=>setFeedback(null)};
}

type Confirmation=ReturnType<typeof usePayuConfirmation>;
export function PayuConfirmation({confirmation}:{confirmation:Confirmation}){
  const payment=confirmation.feedback;
  if(!payment)return null;
  const {outcome,successText}=payment;
  const copy={
    checking:['Verifying payment','We’re checking your payment with PayU.'],
    paid:['Payment verified',successText],
    pending:['Payment pending','PayU hasn’t confirmed this payment yet. Check the status before trying to pay again.'],
    failed:['Payment failed','PayU reported that this payment failed. You can return and try again.'],
    closed:['Checkout closed','If you completed the payment, check its status before trying to pay again.'],
    needs_review:['Payment verified','Your payment was received. Contact support to complete the certificate update.'],
    refunded:['Payment refunded','PayU has confirmed the refund.'],
    unavailable:['Verification unavailable','We couldn’t check the payment right now. Check its status before trying to pay again.'],
  };
  const [title,message]=copy[outcome];
  const verified=outcome==='paid'||outcome==='needs_review';
  const Icon=verified?CheckCircle2:outcome==='failed'||outcome==='unavailable'?TriangleAlert:Clock3;
  const canCheck=outcome==='pending'||outcome==='unavailable'||outcome==='closed';

  return <Modal title="DInterns Payment" close={confirmation.close}>
    <div className="payment-confirmation">
      <div className="payment-receipt"><img src="/logo.png" width="36" height="36" alt=""/><span>{payment.label}</span><strong>{rupees(payment.amount)}</strong></div>
      <div className="payment-confirmation-status" role="status">
        <Icon className={verified?'payment-verified':''} size={32} aria-hidden="true"/>
        <h3>{title}</h3><p>{message}</p>
      </div>
      <div className="actions">
        {canCheck&&<Button onClick={()=>void confirmation.confirm(payment)}>Check Payment Status</Button>}
        <Button variant={canCheck||outcome==='checking'?'secondary':'primary'} onClick={confirmation.close}>{outcome==='checking'?'Close':'Done'}</Button>
      </div>
    </div>
  </Modal>;
}
