import {useState} from 'react';
import {request} from '../api/client';
import {rupees} from '../types';
import {Button,Fault,Field} from './ui';

type Quote={code:string;percent:number;originalAmountInPaise:number;amountInPaise:number};
type Props={
  product:'internship'|'skill';referenceId:string;amount:number;canPay:boolean;
  busy:boolean;disabled:boolean;canApplyPromo:boolean;onUnlock:(code?:string)=>void;submission?:boolean;
};

export function CertificateCheckout({product,referenceId,amount,canPay,busy,disabled,canApplyPromo,onUnlock,submission}:Props){
  const [showPromo,setShowPromo]=useState(false),[code,setCode]=useState(''),[quote,setQuote]=useState<Quote|null>(null);
  const [checking,setChecking]=useState(false),[error,setError]=useState<unknown>(null);
  const payable=quote?.amountInPaise??amount;
  const label=submission
    ? (payable===0?'Submit Tasks Free':'Pay '+rupees(payable)+' and Submit Tasks')
    : (payable===0?'Unlock Certificate Free':'Unlock Certificate · '+rupees(payable));
  return <div className="form-stack certificate-checkout">
    <div className="actions">
      <Button type="button" busy={busy} disabled={disabled||checking||(!canPay&&payable!==0)} onClick={()=>onUnlock(quote?.code)}>
        {label}
      </Button>
      {canApplyPromo&&<Button type="button" variant="ghost" disabled={disabled||checking} aria-expanded={showPromo} onClick={()=>setShowPromo(value=>!value)}>Have a promo code?</Button>}
    </div>
    {!canPay&&payable>0&&<p>Paid checkout is currently unavailable.{canApplyPromo&&' You can still apply a 100% promo code.'}</p>}
    {canApplyPromo&&showPromo&&<form className="form-stack" onSubmit={async event=>{
      event.preventDefault();setChecking(true);setError(null);setQuote(null);
      try{setQuote(await request<Quote>('/payments/promo/quote','POST',{product,referenceId,code}));}
      catch(failure){setError(failure);}finally{setChecking(false);}
    }}>
      <Field label="7-character promo code"><input value={code} autoComplete="off" autoCapitalize="characters" maxLength={7}
        pattern="[A-Z0-9]{7}" required disabled={disabled||checking}
        onChange={event=>{setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''));setQuote(null);setError(null);}}/></Field>
      {error!=null&&<Fault error={error}/>}
      <div className="actions">
        <Button type="submit" variant="secondary" busy={checking} disabled={disabled||code.length!==7}>Apply Promo Code</Button>
        {quote&&<Button type="button" variant="ghost" disabled={disabled||checking} onClick={()=>{setCode('');setQuote(null);}}>Remove Code</Button>}
      </div>
    </form>}
    {quote&&<div className="info" role="status"><strong>{quote.code} applied · {quote.percent}% off</strong><p>
      Original fee {rupees(quote.originalAmountInPaise)} · Payable {rupees(quote.amountInPaise)}
    </p></div>}
  </div>;
}
