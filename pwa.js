/* Instalação e atualizações do PWA; os dados permanecem sob controle do Firebase. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let convite=null,instalado=false,registration=null,recarregando=false;
const standalone=()=>instalado||window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const iphone=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Mac/.test(navigator.platform)&&navigator.maxTouchPoints>1);
function atualizar(){const b=$('btnInstalar');if(b)b.hidden=standalone()}
function fechar(){$('modalInstalar').hidden=true;$('btnInstalar').focus()}
function guia(){const ios=iphone();$('instalarTitulo').textContent=ios?'Instalar no iPhone ou iPad':'Instalar Academia Tenda';$('instalarIos').hidden=!ios;$('instalarOutros').hidden=ios;$('modalInstalar').hidden=false;$('fecharInstalar').focus()}
async function instalar(){if(standalone())return;if(!convite){guia();return}const atual=convite;convite=null;try{await atual.prompt();const escolha=await atual.userChoice;if(escolha.outcome==='accepted')instalado=true}catch(e){guia()}atualizar()}
window.TendaPwa={atualizar};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();convite=e;atualizar()});
window.addEventListener('appinstalled',()=>{convite=null;instalado=true;atualizar();$('modalInstalar').hidden=true});
$('btnInstalar').onclick=instalar;$('fecharInstalar').onclick=fechar;
$('modalInstalar').addEventListener('click',e=>{if(e.target===$('modalInstalar'))fechar()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modalInstalar').hidden)fechar()});
function aviso(){if(registration&&registration.waiting)$('pwaAtualizacao').hidden=false}
$('pwaAtualizar').onclick=async function(){const b=$('pwaAtualizar');b.disabled=true;try{if(window.tendaPodeAtualizar&&!await window.tendaPodeAtualizar())return;if(registration&&registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'})}finally{b.disabled=false}};
if('serviceWorker' in navigator){
 const tinhaController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!tinhaController||recarregando)return;recarregando=true;location.reload()});
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
  registration=reg;aviso();reg.addEventListener('updatefound',()=>{const sw=reg.installing;if(sw)sw.addEventListener('statechange',()=>{if(sw.state==='installed')aviso()})});
  reg.update().catch(()=>{});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){reg.update().catch(()=>{});aviso()}});
 }).catch(()=>{});
}
atualizar();
})();
