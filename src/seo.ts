export const siteOrigin='https://dinterns.online';
export const siteName='DInterns';

type SeoPage={
  title:string;
  heading:string;
  description:string;
  points?:readonly [question:string,answer:string][];
};

export const seoPages:Record<string,SeoPage>={
  '/':{
    title:'DInterns | Virtual Internships & Skill Certification',
    heading:'Virtual Internships and Skill Certification',
    description:'DInterns (Desperate Interns) offers virtual internships with free applications, practical projects and digital offer letters. Explore internships and skill certification exams.',
    points:[
      ['What is free in a DInterns internship?','Registration, accessing internship tasks and offer letters are free. A ₹99 fee applies when submitting tasks for evaluation, before eligible promo discounts.'],
      ['How long is a DInterns internship?','DInterns virtual internships run for one calendar month and include practical projects.'],
      ['How can I get started?','Choose an internship domain and apply online, or take a timed exam in the Skill Certification section.'],
    ],
  },
  '/internships':{
    title:'Online Internships for Students · Free to Apply | DInterns',
    heading:'Available Virtual Internships',
    description:'Explore one-month virtual internships at DInterns. Apply online for free, download your offer letter after approval and build practical projects from anywhere.',
    points:[
      ['How do I apply?','Choose an internship domain, sign in and submit the application for free. After approval, accept the guidelines to download your offer letter and access your tasks.'],
      ['How are my projects evaluated?','Submit your project links from the internship tracker. The ₹99 submission fee is due before evaluation, and eligible promo codes can reduce it. If your work is approved, submit your review to download your completion certificate.'],
    ],
  },
  '/skill-certification':{
    title:'Online Skill Certification Exams | DInterns',
    heading:'Skill Certification Exams',
    description:'Explore available online skill exams from DInterns. Take a timed multiple-choice test and earn eligibility for a verifiable skill certificate when you pass.',
    points:[
      ['How do I take an exam?','Sign in, choose a subject and check the exam duration and passing score before you start. Each exam has multiple-choice questions. Taking or retaking an exam is free.'],
      ['How do I get my certificate?','Meet the displayed passing score to unlock the optional skill certificate for ₹29 before any eligible promo discount. You can download it after checkout.'],
      ['How can someone verify my certificate?','Share your certificate ID with the person who needs to verify it. They can enter the ID on the DInterns certificate verification page.'],
    ],
  },
  '/verify-certificate':{
    title:'Verify an Internship or Skill Certificate | DInterns',
    heading:'Verify a DInterns Certificate',
    description:'Check a DInterns internship completion certificate or skill certification using its unique certificate ID on the official verification page.',
  },
  '/documents':{
    title:'Internship Offer Letters and Documents | DInterns',
    heading:'Internship Documents',
    description:'Find DInterns internship offer letters and completion documents. Sign in to view and download the documents available for your internship.',
  },
  '/contact':{
    title:'Contact DInterns | Internship Support and FAQs',
    heading:'Contact DInterns',
    description:'Get help with free virtual internship applications, offer letters, project submissions, skill exams, payments and certificates. Contact DInterns support in Delhi, India.',
    points:[
      ['How do I contact DInterns?','Use the contact form or email support@dinterns.online for help with your account, internship or certificate.'],
      ['How do I download my offer letter?','Open your approved internship and accept the guidelines. The offer letter will then be available from your tracker.'],
      ['How do I verify my certificate?','Enter your certificate ID on the verification page or click the certificate ID in your PDF.'],
    ],
  },
  '/about':{
    title:'About DInterns (Desperate Interns) | Virtual Internships',
    heading:'About DInterns',
    description:'DInterns, short for Desperate Interns, helps students build practical skills through virtual internships, project submissions and online skill exams.',
  },
  '/college-coordinator':{
    title:'College Coordinator Programme | DInterns',
    heading:'DInterns College Coordinator Programme',
    description:'Learn about the DInterns college coordinator programme and help students find virtual internships with free applications and skill-building opportunities.',
  },
  '/guidelines':{
    title:'Virtual Internship Guidelines | DInterns',
    heading:'DInterns Internship Guidelines',
    description:'Read the DInterns virtual internship guidelines, including application approval, project submissions, evaluation and certificate eligibility.',
  },
  '/terms':{
    title:'Terms and Conditions | DInterns',
    heading:'DInterns Terms and Conditions',
    description:'Read the terms for using DInterns, participating in virtual internships, taking skill exams and purchasing optional certificate services.',
  },
  '/privacy':{
    title:'Privacy Policy | DInterns',
    heading:'DInterns Privacy Policy',
    description:'Read how DInterns handles account, internship, examination, payment and support information, and how to contact us about your privacy.',
  },
  '/cookies':{
    title:'Cookie Policy | DInterns',
    heading:'DInterns Cookie Policy',
    description:'Learn how DInterns uses cookies for account sessions, website security and platform functionality.',
  },
  '/refunds':{
    title:'Refund Policy | DInterns',
    heading:'DInterns Refund Policy',
    description:'Read the DInterns refund policy for optional certificate purchases and find out how to request help with a payment.',
  },
};

const accountTitles:Record<string,string>={
  '/login':'Log In | DInterns',
  '/signup':'Sign Up | DInterns',
  '/recover':'Reset Password | DInterns',
};

export function seoPage(path:string){
  return seoPages[path];
}

export function pageTitle(path:string){
  const normalized=path.replace(/\/+$/,'')||'/';
  return seoPage(normalized)?.title??accountTitles[normalized]??siteName;
}
