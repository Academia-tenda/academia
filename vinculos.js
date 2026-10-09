/* Carteiras geridas pelo instrutor, com atribuição exclusiva em transação. */
(function(){
'use strict';
const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
let enabled=false,checkedFor=null,checking=null,uiVersion=0;
const busy=new Set();
function button(text,fn){const b=node('button','btn',text);b.type='button';b.onclick=fn;return b}
function professional(){return !!usuario&&['professor','dono'].includes(meuPerfil)}
async function check(){if(!usuario){enabled=false;checkedFor=null;return false}const uid=usuario.uid;if(checkedFor===uid)return enabled;if(checking)return checking;checking=(async()=>{try{const fb=await getFB(),s=await fb.F.getDoc(fb.F.doc(fb.db,'config','vinculos'));if(usuario?.uid===uid){enabled=s.exists()&&s.data().ativo===true;checkedFor=uid}}catch(e){if(usuario?.uid===uid){enabled=false;checkedFor=uid}}finally{checking=null}return enabled})();return checking}
function active(){return enabled&&checkedFor===usuario?.uid}
function status(root,text,error){let message=root.querySelector('.vinculo-status');if(!message){message=node('p','small-note vinculo-status');message.setAttribute('role','status');root.append(message)}message.textContent=text;message.classList.toggle('erro',!!error)}
async function assign(aluno){
 if(!active()||!professional())throw Error('Entre como instrutor.');
 const uid=usuario.uid,fb=await getFB();
 await fb.F.runTransaction(fb.db,async tx=>{
  const profileRef=fb.F.doc(fb.db,'perfis',aluno.uid),linkRef=fb.F.doc(fb.db,'vinculos',aluno.uid);
  const profile=await tx.get(profileRef),link=await tx.get(linkRef);
  if(usuario?.uid!==uid||!professional())throw Error('A conta mudou.');
  if(!profile.exists()||profile.data().uid!==aluno.uid||profile.data().role!=='aluno'||aluno.uid===uid)throw Error('Este usuário não está disponível como aluno.');
  if(profile.data().professorUid||(link.exists()&&link.data().ativo))throw Error('Este aluno já tem um professor. Atualize a lista.');
  tx.set(linkRef,{alunoUid:aluno.uid,professorUid:uid,professorNome:usuario.displayName||'Instrutor',ativo:true,atribuidoEm:Date.now()});
  tx.update(profileRef,{professorUid:uid});
 });
 window.dispatchEvent(new CustomEvent('tenda:carteira-alterada',{detail:{uid:aluno.uid,acao:'adicionado'}}));
}
async function release(aluno){
 if(!active()||!professional()||busy.has(aluno.uid))return false;
 if(!confirm('Liberar '+(aluno.nome||'este aluno')+' da sua carteira? Você perde o acesso ao acompanhamento. Os treinos, planos e registros permanecem na conta dele.'))return false;
 busy.add(aluno.uid);const uid=usuario.uid;
 try{const fb=await getFB();await fb.F.runTransaction(fb.db,async tx=>{
  const profileRef=fb.F.doc(fb.db,'perfis',aluno.uid),linkRef=fb.F.doc(fb.db,'vinculos',aluno.uid);
  const profile=await tx.get(profileRef),link=await tx.get(linkRef);
  if(usuario?.uid!==uid||!professional())throw Error('A conta mudou.');
  if(!profile.exists()||!link.exists()||!link.data().ativo||link.data().professorUid!==uid||profile.data().professorUid!==uid)throw Error('Este aluno não está na sua carteira. Atualize a lista.');
  tx.update(linkRef,{ativo:false});tx.update(profileRef,{professorUid:''});
 });window.dispatchEvent(new CustomEvent('tenda:carteira-alterada',{detail:{uid:aluno.uid,acao:'liberado'}}));return true;
 }finally{busy.delete(aluno.uid)}
}
async function teacher(root){
 if(!active()||!professional())return;root.replaceChildren();root.hidden=false;
 root.append(node('h3','','Minha carteira'),node('p','small-note','Adicione usuários sem professor. Cada aluno pode ter apenas um instrutor por vez.'));
 const details=node('details','carteira-directory');details.append(node('summary','','Adicionar aluno'));
 const label=node('label');label.append(node('span','small-note','Buscar usuário disponível'));
 const input=node('input');input.type='search';input.placeholder='Nome ou e-mail';input.setAttribute('aria-label','Buscar usuário disponível');label.append(input);
 const list=node('div','carteira-disponiveis'),message=node('p','small-note');message.setAttribute('role','status');details.append(label,message,list);root.append(details);
 const account=usuario.uid;let loading=false,loaded=false,available=[];
 function draw(){list.replaceChildren();const q=input.value.trim().toLowerCase(),matches=available.filter(a=>(String(a.nome||'')+' '+String(a.email||'')).toLowerCase().includes(q));message.textContent=matches.length+' usuários disponíveis';
  for(const a of matches.slice(0,50)){const row=node('div','carteira-candidato'),info=node('div');info.append(node('strong','',a.nome||'Aluno'),node('small','',a.email||''));const add=button('Adicionar',async()=>{
   if(busy.has(a.uid)||usuario?.uid!==account)return;busy.add(a.uid);add.disabled=true;
   try{await assign(a);available=available.filter(v=>v.uid!==a.uid);draw();status(root,(a.nome||'Aluno')+' adicionado à sua carteira.');}
   catch(e){status(root,e.code==='permission-denied'?'Não foi possível adicionar. O usuário pode já estar com outro professor. Atualize a lista.':e.message||'Não foi possível adicionar.',true);add.disabled=false;}
   finally{busy.delete(a.uid)}
  });add.setAttribute('aria-label','Adicionar '+(a.nome||a.email||'aluno')+' à minha carteira');row.append(info,add);list.append(row)}
  if(matches.length>50)list.append(node('p','small-note','Digite um nome para refinar a busca.'));
 }
 async function load(){if(loading||usuario?.uid!==account)return;loading=true;message.textContent='Consultando usuários disponíveis…';try{const fb=await getFB(),snap=await fb.F.getDocs(fb.F.query(fb.F.collection(fb.db,'perfis'),fb.F.where('role','==','aluno')));if(usuario?.uid!==account||!professional())return;available=[];snap.forEach(d=>{const a=d.data();if(a.uid&&a.uid!==account&&a.role==='aluno'&&!a.professorUid)available.push(a)});available.sort((a,b)=>String(a.nome||a.email||'').localeCompare(String(b.nome||b.email||'')));loaded=true;draw()}catch(e){message.textContent='Não foi possível consultar usuários. Tente atualizar.'}finally{loading=false}}
 input.oninput=draw;details.ontoggle=()=>{if(details.open&&!loaded)load()};details.append(button('Atualizar disponíveis',load));
}
async function show(){const ticket=++uiVersion,root=$('vinculoPerfil');root.replaceChildren();root.hidden=true;if(!usuario)return;const uid=usuario.uid;await check();if(usuario?.uid!==uid||ticket!==uiVersion||!active())return;root.hidden=false;if(professional()){await teacher(root);return}
 root.append(node('h3','','Meu instrutor'));try{const fb=await getFB(),snap=await fb.F.getDoc(fb.F.doc(fb.db,'vinculos',uid));if(usuario?.uid!==uid||ticket!==uiVersion)return;const link=snap.exists()?snap.data():null;
  root.append(node('p','',link?.ativo?'Acompanhamento com '+(link.professorNome||'seu instrutor'):'Você está sem instrutor.'),node('p','small-note',link?.ativo?'Seu instrutor pode acompanhar seus registros e publicar planos. Ele também gerencia sua entrada e saída da carteira.':'Você pode continuar treinando por conta própria. Um instrutor pode adicionar você à carteira enquanto estiver disponível.'));
 }catch(e){status(root,'Não foi possível consultar seu acompanhamento.',true)}
}
async function renderTeacher(){const root=$('pConviteProfessor');root.hidden=true;if(!usuario)return;await check();if(active()&&professional())await teacher(root)}
const previousProfile=abrirPerfil;abrirPerfil=function(){previousProfile();show()};
const previousRole=atualizarCargoPerfil;atualizarCargoPerfil=function(){previousRole();if(!$('modalPerfil').hidden)show()};
const previousAccount=atualizaBotaoConta;atualizaBotaoConta=function(){previousAccount();if(!usuario||checkedFor!==usuario.uid){enabled=false;checkedFor=null;$('vinculoPerfil').replaceChildren();$('vinculoPerfil').hidden=true;$('pConviteProfessor').replaceChildren();$('pConviteProfessor').hidden=true}};
window.TendaVinculos={check,ativo:active,renderTeacher,assign,release};
})();
