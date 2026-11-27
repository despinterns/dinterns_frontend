import type {Plugin} from 'vite';
import {pageTitle,seoPage,seoPages,siteName,siteOrigin} from './src/seo';

const shareImage=siteOrigin+'/dinterns-share.jpg';
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const meta=(kind:'name'|'property',key:string,value:string)=>`<meta ${kind}="${key}" content="${escapeHtml(value)}">`;
const publicLinks=[
  ['Free internships','/internships'],['Skill certification','/skill-certification'],
  ['Verify a certificate','/verify-certificate'],['Contact and FAQs','/contact'],
] as const;

function pageHtml(template:string,path:string){
  const page=seoPage(path);
  const title=`<title>${escapeHtml(pageTitle(path))}</title>`;
  if(!page)return template.replace('<!-- page metadata -->',title+'\n  '+meta('name','robots','noindex, follow'));

  const url=siteOrigin+path;
  const website={
    '@type':'WebSite','@id':siteOrigin+'/#website',url:siteOrigin+'/',name:siteName,
    alternateName:'Desperate Interns',publisher:{'@id':siteOrigin+'/#organization'},
  };
  const organization={
    '@type':'Organization','@id':siteOrigin+'/#organization',name:siteName,alternateName:'Desperate Interns',
    url:siteOrigin+'/',logo:siteOrigin+'/logo.png',email:'support@dinterns.online',
  };
  const webPage={
    '@type':'WebPage','@id':url+'#webpage',url,name:page.title,description:page.description,
    isPartOf:{'@id':website['@id']},inLanguage:'en-IN',
  };
  const data=JSON.stringify({'@context':'https://schema.org','@graph':[organization,website,webPage]}).replaceAll('<','\\u003c');
  const tags=[
    title,meta('name','description',page.description),meta('name','robots','index, follow, max-image-preview:large'),
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    meta('property','og:type','website'),meta('property','og:site_name',siteName),meta('property','og:locale','en_IN'),
    meta('property','og:title',page.title),meta('property','og:description',page.description),meta('property','og:url',url),
    meta('property','og:image',shareImage),meta('property','og:image:type','image/jpeg'),
    meta('property','og:image:width','1200'),meta('property','og:image:height','630'),
    meta('property','og:image:alt','DInterns banner featuring free virtual internships and skill certification'),
    meta('name','twitter:card','summary_large_image'),meta('name','twitter:title',page.title),
    meta('name','twitter:description',page.description),meta('name','twitter:image',shareImage),
    `<script type="application/ld+json">${data}</script>`,
  ];
  const answers=page.points?.map(([question,answer])=>`<section><h2>${escapeHtml(question)}</h2><p>${escapeHtml(answer)}</p></section>`).join('\n')??'';
  const links=publicLinks.filter(([,href])=>href!==path).map(([label,href])=>`<li><a href="${href}">${label}</a></li>`).join('');
  const content=`<main class="container content-page"><a href="/">DInterns</a><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.description)}</p>
${answers}
<nav aria-label="Explore DInterns"><ul>${links}</ul></nav></main>`;
  return template.replace('<!-- page metadata -->',tags.join('\n  ')).replace('<div id="root"></div>',`<div id="root">${content}</div>`);
}

export function publicPageMetadata():Plugin{
  return {
    name:'dinterns-public-page-metadata',
    transformIndexHtml(html,context){
      if(context.server)return pageHtml(html,context.originalUrl?.split('?')[0].replace(/\/+$/,'')||'/');
    },
    generateBundle:{
      order:'post',
      handler(_options,bundle){
        const index=bundle['index.html'];
        if(index?.type!=='asset'||typeof index.source!=='string'||!index.source.includes('<!-- page metadata -->')){
          this.error('DInterns metadata template is missing from the generated index.html.');
        }
        const template=index.source;
        index.source=pageHtml(template,'/');
        for(const path of Object.keys(seoPages)){
          if(path==='/')continue;
          this.emitFile({type:'asset',fileName:`_pages${path}.html`,source:pageHtml(template,path)});
        }
        this.emitFile({type:'asset',fileName:'_pages/spa.html',source:pageHtml(template,'/_app')});
      },
    },
    configurePreviewServer(server){
      server.middlewares.use((req,_res,next)=>{
        const target=new URL(req.url??'/',siteOrigin);
        const path=target.pathname.replace(/\/+$/,'')||'/';
        if(path!=='/'&&!path.includes('.')&&req.headers.accept?.includes('text/html')){
          req.url=(seoPage(path)?`_pages${path}.html`:'_pages/spa.html').replace(/^/,'/')+target.search;
        }
        next();
      });
    },
  };
}
