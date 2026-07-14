(()=>{
'use strict';
const cfg=window.YJSY_CONFIG;
const API=`${cfg.supabaseUrl}/rest/v1`;
const AUTH=`${cfg.supabaseUrl}/auth/v1`;
const STORE=`${cfg.supabaseUrl}/storage/v1`;
const $=s=>document.querySelector(s);
const token=()=>localStorage.getItem('yjsy_access_token')||'';
let values={assets:{},downloads:{},site:{}};
let dirty=false;

const groups=[
  {title:'品牌与首屏',hint:'保存后刷新官网即可看到效果',items:[
    ['header_logo','顶部公司 Logo','透明 PNG，建议宽 370px、高 132px'],
    ['hero_background','首页整页主背景','当前人物、游戏 Logo 和后续背景都在这张长图中，建议使用同尺寸长图'],
    ['main_qrcode','首屏下载二维码','建议正方形 PNG'],
    ['side_qrcode','右侧悬浮二维码','建议正方形 PNG'],
    ['age_icon','适龄提示图','当前 16+ 图标']
  ]},
  {title:'下载按钮图片',hint:'图片和实际下载地址分开管理',items:[
    ['ios_button','iOS 下载按钮','建议保持当前宽高比例'],
    ['android_button','Android 下载按钮','建议保持当前宽高比例']
  ]},
  {title:'新闻轮播图',hint:'首页新闻资讯左侧轮播',items:[
    ['news_banner_1','新闻轮播 1','建议横图'],['news_banner_2','新闻轮播 2','建议横图'],
    ['news_banner_3','新闻轮播 3','建议横图'],['news_banner_4','新闻轮播 4','建议横图']
  ]},
  {title:'角色介绍',hint:'首页角色介绍轮播',items:[
    ['role_banner_1','角色图 1','建议透明 PNG'],['role_banner_2','角色图 2','建议透明 PNG']
  ]},
  {title:'游戏特色',hint:'首页游戏特色轮播',items:[
    ['feature_1','特色图 1','建议横图'],['feature_2','特色图 2','建议横图'],
    ['feature_3','特色图 3','建议横图'],['feature_4','特色图 4','建议横图'],
    ['feature_5','特色图 5','建议横图']
  ]},
  {title:'官方渠道',hint:'官网底部四张渠道卡片',items:[
    ['channel_weixin','微信渠道图','建议保持当前比例'],['channel_scan','扫码关注图','建议保持当前比例'],
    ['channel_taptap','TapTap 渠道图','建议保持当前比例'],['channel_service','客服渠道图','建议保持当前比例']
  ]}
];

const footerFields=[
  ['company_name','公司名称','text','例如：广州熊动科技有限公司'],
  ['address','公司地址','text','留空则隐藏地址行'],
  ['business_license_label','许可证标签','text','例如：经营许可证编号'],
  ['business_license_number','经营许可证编号','text','留空则官网不显示'],
  ['business_license_url','许可证链接','url','留空则只显示文字；编号为空时整项隐藏'],
  ['icp_number','ICP备案号','text','留空则官网不显示'],
  ['icp_url','ICP备案链接','url','通常填写工信部备案查询地址'],
  ['publication_isbn','出版物号','text','留空则隐藏'],
  ['copyright_registration','著作权登记号','text','留空则隐藏'],
  ['approval_number','审批文号','text','留空则隐藏'],
  ['about_url','关于我们链接','url','留空则隐藏入口'],
  ['contact_url','联系我们链接','url','留空则隐藏入口'],
  ['privacy_url','隐私政策链接','url','留空则隐藏入口'],
  ['agreement_url','用户协议链接','url','留空则隐藏入口'],
  ['health_notice','健康游戏提示','textarea','留空则隐藏底部提示']
];

function esc(v=''){
  return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function card([key,label,hint]){
  const val=values.assets[key]||'';
  return `<article class="asset-card" data-key="${key}"><h4>${label}</h4><span class="hint">${hint}</span><div class="asset-preview"><img src="${esc(val)}" alt="${label}"></div><input class="asset-url" type="text" value="${esc(val)}" placeholder="图片 URL"><div class="asset-card-foot"><label>上传替换<input class="asset-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label><button class="asset-clear" type="button">清空</button></div></article>`;
}
function footerField([key,label,type,hint]){
  const val=values.site[key]||'';
  const control=type==='textarea'
    ? `<textarea class="site-field" data-site-key="${key}" rows="3" placeholder="${esc(hint)}">${esc(val)}</textarea>`
    : `<input class="site-field" data-site-key="${key}" type="${type}" value="${esc(val)}" placeholder="${esc(hint)}">`;
  return `<div class="asset-url-card"><div><h4>${label}</h4><small>${hint}</small></div>${control}</div>`;
}
function render(){
  const app=$('#assetSettingsApp');
  if(!app)return;
  app.innerHTML=`<div class="asset-page-head"><div><h2>网站素材与页脚管理</h2><p>统一管理官网图片、下载入口、公司主体、资质信息和底部链接。</p></div><div class="asset-actions"><span id="assetSaveState" class="asset-save-state"></span><button id="reloadAssets" class="ghost" type="button">重新载入</button><button id="saveAssets" class="primary" type="button">保存并生效</button></div></div>
  ${groups.map(g=>`<section class="asset-section"><div class="asset-section-title"><h3>${g.title}</h3><span>${g.hint}</span></div><div class="asset-grid">${g.items.map(card).join('')}</div></section>`).join('')}
  <section class="asset-section"><div class="asset-section-title"><h3>游戏下载链接</h3><span>玩家点击下载按钮后跳转到这里</span></div><div class="asset-url-card"><div><h4>iOS 下载地址</h4><small>App Store 或下载落地页</small></div><input id="downloadIos" type="url" value="${esc(values.downloads.ios||'')}"></div><div class="asset-url-card"><div><h4>Android 下载地址</h4><small>APK、应用商店或下载落地页</small></div><input id="downloadAndroid" type="text" value="${esc(values.downloads.android||'')}"></div></section>
  <section class="asset-section"><div class="asset-section-title"><h3>页脚与资质信息</h3><span>字段留空后，官网会自动隐藏对应内容</span></div>${footerFields.map(footerField).join('')}</section>`;
  bindCards();
}
async function api(path,opt={}){
  const r=await fetch(`${API}/${path}`,{...opt,headers:{apikey:cfg.supabaseKey,Authorization:`Bearer ${token()}`,'Content-Type':'application/json',...(opt.headers||{})}});
  if(!r.ok)throw Error(await r.text());
  if(r.status===204)return null;
  const t=await r.text();
  return t?JSON.parse(t):null;
}
function setState(text,cls=''){
  const el=$('#assetSaveState');
  if(el){el.textContent=text;el.className=`asset-save-state ${cls}`;}
}
function markDirty(){dirty=true;setState('有未保存修改');}
async function load(){
  setState('正在载入…');
  try{
    const rows=await api('yjsy_site_settings?select=key,value&key=in.(assets,downloads,site)');
    values={assets:{},downloads:{},site:{}};
    for(const r of rows||[])values[r.key]=r.value||{};
    dirty=false;render();setState('已载入','ok');
  }catch(e){setState(e.message,'error');}
}
async function upload(file,key){
  if(!file)return'';
  if(file.size>10*1024*1024)throw Error('图片不能超过 10MB');
  const ext=(file.name.split('.').pop()||'png').toLowerCase();
  const path=`site-assets/${key}-${Date.now()}.${ext}`;
  const r=await fetch(`${STORE}/object/yjsy-media/${path}`,{method:'POST',headers:{apikey:cfg.supabaseKey,Authorization:`Bearer ${token()}`,'Content-Type':file.type,'x-upsert':'true'},body:file});
  if(!r.ok)throw Error(await r.text());
  return `${STORE}/object/public/yjsy-media/${path}`;
}
function bindCards(){
  document.querySelectorAll('.asset-card').forEach(cardEl=>{
    const key=cardEl.dataset.key,input=cardEl.querySelector('.asset-url'),img=cardEl.querySelector('img'),file=cardEl.querySelector('.asset-file');
    input.oninput=()=>{values.assets[key]=input.value.trim();img.src=input.value.trim();markDirty();};
    file.onchange=async()=>{try{setState(`正在上传「${cardEl.querySelector('h4').textContent}」…`);const url=await upload(file.files[0],key);values.assets[key]=url;input.value=url;img.src=url;markDirty();}catch(e){setState(e.message,'error');}};
    cardEl.querySelector('.asset-clear').onclick=()=>{values.assets[key]='';input.value='';img.removeAttribute('src');markDirty();};
  });
  $('#downloadIos').oninput=e=>{values.downloads.ios=e.target.value.trim();markDirty();};
  $('#downloadAndroid').oninput=e=>{values.downloads.android=e.target.value.trim();markDirty();};
  document.querySelectorAll('.site-field').forEach(el=>el.oninput=()=>{values.site[el.dataset.siteKey]=el.value.trim();markDirty();});
  $('#reloadAssets').onclick=()=>dirty&&!confirm('放弃未保存的修改并重新载入？')?null:load();
  $('#saveAssets').onclick=save;
}
async function save(){
  try{
    setState('正在保存…');
    const user=await fetch(`${AUTH}/user`,{headers:{apikey:cfg.supabaseKey,Authorization:`Bearer ${token()}`}}).then(r=>r.json());
    await Promise.all(['assets','downloads','site'].map(key=>api(`yjsy_site_settings?key=eq.${key}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({value:values[key],updated_by:user.id})})));
    dirty=false;setState('已保存，官网刷新后生效','ok');
  }catch(e){setState(e.message,'error');}
}
function openSettings(){
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  $('#settingsView').classList.remove('hidden');
  document.querySelectorAll('.sidebar nav button').forEach(b=>b.classList.remove('active'));
  $('#siteAssetsNav').classList.add('active');
  $('#pageTitle').textContent='网站素材与页脚';
  $('#pageDesc').textContent='管理官网图片、下载链接、公司和资质信息';
  $('#refreshBtn').style.display='none';
  load();
}
function boot(){
  const nav=$('#siteAssetsNav');
  if(!nav)return;
  nav.textContent='网站设置';
  nav.onclick=openSettings;
  document.querySelectorAll('.sidebar nav button:not(#siteAssetsNav)').forEach(b=>b.addEventListener('click',()=>nav.classList.remove('active')));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();