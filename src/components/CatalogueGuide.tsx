import {seoPage} from '../seo';

export function CatalogueGuide({path,title}:{path:'/internships'|'/skill-certification';title:string}){
  return <section className="catalogue-guide" aria-labelledby="catalogue-guide-title">
    <h2 id="catalogue-guide-title">{title}</h2>
    <div className="faq">
      {seoPage(path).points?.map(([question,answer])=><details key={question}>
        <summary>{question}</summary>
        <p>{answer}</p>
      </details>)}
    </div>
  </section>;
}
