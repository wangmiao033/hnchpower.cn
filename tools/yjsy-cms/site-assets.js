(()=>{
'use strict';
const cfg=window.YJSY_CONFIG;
if(!cfg)return;
const OLD_COMPANY=['上','海','圆','戏','网','络','科','技','有','限','公','司'].join('');
const defaultSite={
  company_name:'广州熊动科技有限公司',
  address:'广州市越秀区江月路13号之一301-自编390-16',
  business_license_label:'经营许可证编号',
  business_license_number:'',
  business_license_url:'',
  icp_number:'',
  icp_url:'',
  about_url:'http://www.shyxi5.com/',
  contact_url:'http://www.shyxi5.com/',
  privacy_url:'https://m.sh9130.com/yszc/6492.html',
  agreement_url:'https://m.sh9130.com/yszc/6493.html',
  publication_isbn:'ISBN 978-7-498-12340-4',
  copyright_registration:'2022SR0518402',
  approval_number:'国新出审〔2023〕801号',
  health_notice:'抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。'
};
let site={...defaultSite};
let downloads={ios:'https://adapi.sh9130.com/download/?s=TPj3888A',android:'/static.sh9130.com/uploads/apk/dlwgwbdb/dlwgwbdb_1905117.apk'};
const H={apikey:cfg.supabaseKey,Authorization:`Bearer ${cfg.supabaseKey}`};

function replaceCompany(root=document){
  const base=root.nodeType===9?root.documentElement:root;
  if(!base)return;
  const walker=document.createTreeWalker(base,NodeFilter.SHOW_TEXT);
  let node;
  while(node=walker.nextNode()){
    if(node.nodeValue&&node.nodeValue.includes(OLD_COMPANY))node.nodeValue=node.nodeValue.split(OLD_COMPANY).join(site.company_name||defaultSite.company_name);
  }
  base.querySelectorAll?.('[title],[alt],[content]').forEach(el=>['title','alt','content'].forEach(attr=>{
    const value=el.getAttribute(attr);
    if(value&&value.includes(OLD_COMPANY))el.setAttribute(attr,value.split(OLD_COMPANY).join(site.company_name||defaultSite.company_name));
  }));
}
function setImg(selector,url){if(!url)return;document.querySelectorAll(selector).forEach(el=>el.src=url);}
function setSwiper(selector,urls){
  if(!urls.length)return;
  const slides=[...document.querySelectorAll(`${selector} .swiper-slide`)];
  slides.forEach((s,i)=>{
    let n=Number(s.dataset.swiperSlideIndex);
    if(!Number.isFinite(n))n=i;
    const img=s.querySelector('img'),url=urls[n%urls.length];
    if(img&&url)img.src=url;
  });
}
function applyAssets(a={}){
  setImg('.header img.logo',a.header_logo);
  if(a.hero_background){const c=document.querySelector('.container');if(c)c.style.backgroundImage=`url("${a.hero_background}")`;}
  setImg('.banner .qrcode',a.main_qrcode);
  setImg('.slide_qrcode img',a.side_qrcode||a.main_qrcode);
  setImg('.new_right_ew img',a.side_qrcode||a.main_qrcode);
  setImg('.agetips_img',a.age_icon);
  setImg('.btn_d[data-type="ios"] img',a.ios_button);
  setImg('.btn_d[data-type="android"] img',a.android_button);
  setSwiper('#newCarousel',[a.news_banner_1,a.news_banner_2,a.news_banner_3,a.news_banner_4].filter(Boolean));
  setSwiper('#asideSwiper',[a.news_banner_1,a.news_banner_2,a.news_banner_3].filter(Boolean));
  setSwiper('#roleCarousel',[a.role_banner_1,a.role_banner_2].filter(Boolean));
  setSwiper('#newFeature',[a.feature_1,a.feature_2,a.feature_3,a.feature_4,a.feature_5].filter(Boolean));
  const channels=[a.channel_weixin,a.channel_scan,a.channel_taptap,a.channel_service];
  document.querySelectorAll('.audio_visual .chanel ul li img').forEach((img,i)=>{if(channels[i])img.src=channels[i];});
}
function addFooterLink(box,label,url,first){
  if(!url)return first;
  if(!first)box.append(document.createTextNode('   |   '));
  const a=document.createElement('a');
  a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener';
  box.append(a);
  return false;
}
function ensureParagraph(parent,className,index){
  let list=parent.querySelectorAll(`p.${className}`);
  while(list.length<=index){const p=document.createElement('p');p.className=className;parent.append(p);list=parent.querySelectorAll(`p.${className}`);}
  return list[index];
}
function footerWraps(){
  const candidates=[...document.querySelectorAll('.audio_visual .wrap, .news_footer .wrap, body.new .wrap, .new .wrap')];
  document.querySelectorAll('.wrap').forEach(w=>{
    if(w.querySelector('.info1')&&(w.querySelector('p.addr')||w.querySelector('p.p2')))candidates.push(w);
  });
  return [...new Set(candidates)];
}
function applyFooterToWrap(wrap){
  const info=wrap.querySelector('.info1');
  if(info){
    let linkBox=info.querySelector('div[style*="text-align"]');
    if(!linkBox){linkBox=document.createElement('div');linkBox.style.cssText='width:100%;text-align:center;color:#000;';info.prepend(linkBox);}
    linkBox.replaceChildren();
    let first=true;
    first=addFooterLink(linkBox,'关于我们',site.about_url,first);
    first=addFooterLink(linkBox,'联系我们',site.contact_url,first);
    first=addFooterLink(linkBox,'隐私政策',site.privacy_url,first);
    first=addFooterLink(linkBox,'用户协议',site.agreement_url,first);
    linkBox.style.display=first?'none':'';

    const address=ensureParagraph(info,'addr',0);
    address.textContent=site.address?`地址：${site.address}`:'';
    address.style.display=site.address?'':'none';

    const company=ensureParagraph(info,'addr',1);
    company.replaceChildren();
    if(site.company_name)company.append(document.createTextNode(site.company_name));
    const legal=[];
    if(site.business_license_number)legal.push({text:`${site.business_license_label||'经营许可证编号'}:${site.business_license_number}`,url:site.business_license_url});
    if(site.icp_number)legal.push({text:site.icp_number,url:site.icp_url});
    legal.forEach(item=>{
      company.append(document.createTextNode(' '));
      if(item.url){const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener';a.textContent=item.text;company.append(a);}else company.append(document.createTextNode(item.text));
    });
    company.style.display=(site.company_name||legal.length)?'':'none';
  }

  const p2=wrap.querySelectorAll('p.p2');
  const publication=p2[0]||ensureParagraph(wrap,'p2',0);
  const parts=[];
  if(site.publication_isbn)parts.push(`出版物号：${site.publication_isbn}`);
  if(site.copyright_registration)parts.push(`著作权登记号：${site.copyright_registration}`);
  if(site.approval_number)parts.push(`审批文号：${site.approval_number}`);
  publication.textContent=parts.join('  ');
  publication.style.display=parts.length?'':'none';

  const health=(wrap.querySelectorAll('p.p2')[1])||ensureParagraph(wrap,'p2',1);
  health.textContent=site.health_notice||'';
  health.style.display=site.health_notice?'':'none';
}
function applyFooter(s={}){
  site={...defaultSite,...s};
  replaceCompany();
  footerWraps().forEach(applyFooterToWrap);
}
async function load(){
  applyFooter(defaultSite);
  try{
    const r=await fetch(`${cfg.supabaseUrl}/rest/v1/yjsy_site_settings?select=key,value&key=in.(assets,downloads,site)&_=${Date.now()}`,{headers:H,cache:'no-store'});
    const rows=await r.json();
    for(const x of rows||[]){
      if(x.key==='assets')applyAssets(x.value||{});
      if(x.key==='downloads')downloads={...downloads,...x.value};
      if(x.key==='site')applyFooter(x.value||{});
    }
  }catch(e){console.debug('site settings skipped',e);}
  replaceCompany();
}
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('.btn_d');
  if(!btn)return;
  const url=btn.dataset.type==='ios'?downloads.ios:downloads.android;
  if(!url)return;
  e.preventDefault();e.stopImmediatePropagation();window.open(url,'_blank','noopener');
},true);
const start=()=>{
  load();
  new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1||n.nodeType===3)replaceCompany(n.nodeType===3?n.parentElement:n);}))).observe(document.documentElement,{childList:true,subtree:true});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();