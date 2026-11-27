export interface Account {
  _id:string;fullName:string;email:string;mobileNumber:string;role:'student'|'coordinator'|'admin';
  emailVerified:boolean;mobileVerified:boolean;createdAt:string;
}
export interface Domain {
  _id:string;domainName:string;domainCode:string;description:string;category:string;imageUrl?:string;
  totalTasks:number;minimumRequiredTasks:number;
}
export type Row=Record<string,any>;
export interface Page<T=Row>{items:T[];total:number;page:number;limit:number;}
export interface Notice {_id:string;title:string;body:string;href?:string;readAt?:string;createdAt:string}
export interface PublicReview {_id:string;displayName:string;domainName:string;rating:number;text:string;createdAt:string;verified:boolean}
export interface ReviewPage extends Page<PublicReview>{average:number;visible:boolean;}
export interface SiteSettings {rulesVersion:string;policyVersion:string;fee:number;examCertificateFee?:number;paymentsConfigured:boolean;reviewTime:string;}
export const durationLabel=(row:Row)=>row.durationMonths===1||!row.durationWeeks?'1 month':row.durationWeeks+' weeks';
export const day=(value?:string)=>value?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value)):'—';
export const initials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
export const rupees=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:paise%100?2:0}).format(paise/100);
