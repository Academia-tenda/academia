/* Academia Tenda: editor de planos do professor e consulta do aluno. */
(function(){
'use strict';
let alunos=[],selecionado=null,plano=null,basePlano=null,carregando=false,salvando=false,modificado=false,evolucaoAluno={},atualizandoEvolucao=false;
const $=id=>document.getElementById(id);
const clonar=x=>JSON.parse(JSON.stringify(x));
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function profissional(){return !!usuario&&(meuPerfil==='professor'||meuPerfil==='dono')}
function vazio(){return {versao:1,ficha:{titulo:'Plano de treino',objetivo:'',idade:'',sexo:'',peso:'',altura:'',profissional:'',registro:'',observacoes:'',cardio:''},treinos:{A:[]},nomes:{A:'Treino A'},alimentar:{titulo:'Plano alimentar',profissional:'',registro:'',orientacoes:'',refeicoes:[]}}}
function chaveRascunho(uid){return 'tenda-plano-rascunho:'+usuario.uid+':'+uid}

function resumoEditor(){
 const status=$('pEditorStatus');if(status){status.textContent=salvando?'Publicando…':modificado?'Rascunho em edição':'Editor do plano';status.classList.toggle('rascunho',modificado)}
 if(!plano)return;
 const treinos=Object.values(plano.treinos||{}),exercicios=treinos.reduce((n,a)=>n+a.filter(e=>String(e.nome||'').trim()).length,0),refeicoes=(plano.alimentar.refeicoes||[]).length;
 $('pResumoPlano').textContent=exercicios+(exercicios===1?' exercício':' exercícios')+' · '+refeicoes+(refeicoes===1?' refeição':' refeições');
}

function mensagem(text,erro){resumoEditor();$('profMensagem').textContent=text;$('profMensagem').classList.toggle('erro',!!erro)}
function mudou(){modificado=true;try{localStorage.setItem(chaveRascunho(selecionado.uid),JSON.stringify(plano));resumoEditor();$('profMensagem').textContent=''}catch(e){mensagem('Rascunho apenas nesta tela. O navegador não conseguiu salvá-lo.',true)}}
function sairSeguro(){return !modificado||confirm('Há um rascunho não publicado. Sair da edição? Ele continuará neste navegador se o salvamento local estiver disponível.')}
function campo(label,value,change,area){const wrap=node('label','p-campo');wrap.append(node('span','',label));const input=node(area?'textarea':'input');input.value=value||'';if(/Peso|Altura|Idade|Séries/.test(label))input.inputMode='decimal';if(!area)input.type='text';else input.rows=3;input.oninput=()=>change(input.value);wrap.append(input);return wrap}
function botao(text,fn,cls){const b=node('button',cls||'btn',text);b.type='button';b.onclick=fn;return b}
function limitar(input,max){return String(input||'').trim().slice(0,max||2000)}
function normalizar(c){const d=vazio();if(c&&typeof c==='object'){for(const k of ['ficha','alimentar'])if(c[k]&&typeof c[k]==='object')Object.assign(d[k],c[k]);if(c.treinos&&typeof c.treinos==='object')d.treinos=clonar(c.treinos);if(c.nomes&&typeof c.nomes==='object')d.nomes=clonar(c.nomes)}if(!Array.isArray(d.alimentar.refeicoes))d.alimentar.refeicoes=[];return d}
async function listaAlunos(){
 if(!profissional())return;mensagem('Carregando alunos…');
 try{const fb=await getFB();const snap=await fb.F.getDocs(fb.F.collection(fb.db,'perfis'));alunos=[];snap.forEach(d=>{const v=d.data();if(v&&v.uid&&v.uid!==usuario.uid&&v.role!=='pendente')alunos.push(v)});alunos.sort((a,b)=>String(a.nome||a.email).localeCompare(String(b.nome||b.email)));desenharAlunos();mensagem(alunos.length?'Selecione um aluno para editar seus planos.':'Nenhum aluno cadastrado ainda.');await carregarPainelProfessor();}
 catch(e){mensagem('Não foi possível carregar alunos ('+(e.code||e.message)+').',true)}
}
function desenharAlunos(){const root=$('pAlunos');root.replaceChildren();const q=$('profBusca').value.trim().toLowerCase();const filtrados=alunos.filter(a=>(String(a.nome||'')+' '+String(a.email||'')).toLowerCase().includes(q));$('pTotal').textContent=alunos.length+' alunos';$('pResumoTotal').textContent=String(alunos.length);filtrados.forEach(a=>{const b=botao('',()=>abrirAluno(a),'p-aluno'+(selecionado&&selecionado.uid===a.uid?' ativo':''));b.append(node('span','p-avatar',(a.nome||a.email||'A').slice(0,1).toUpperCase()));const tx=node('span');tx.append(node('strong','',a.nome||'Aluno'),node('small','',a.email||''));b.append(tx);root.append(b)});if(!filtrados.length)root.append(node('p','small-note','Nenhum aluno encontrado.'))}
async function abrirAluno(a){
 if(carregando||salvando||!sairSeguro())return;carregando=true;selecionado=a;$('pResumoAluno').textContent=a.nome||a.email||'Aluno';plano=null;modificado=false;desenharAlunos();$('pEditor').hidden=true;$('pVazio').hidden=false;$('pVazio').textContent='Carregando planos de '+(a.nome||a.email)+'…';mensagem('Carregando…');
 try{
  const fb=await getFB();const ref=fb.F.doc(fb.db,'planosProfessor',a.uid);let planoSnap=null,regraPendente=false;
  try{planoSnap=await fb.F.getDoc(ref)}catch(e){if(e.code==='permission-denied')regraPendente=true;else throw e}
  const user=await fb.F.getDoc(fb.F.doc(fb.db,'usuarios',a.uid));const c=user.exists()?user.data():{};if(!profissional())return;evolucaoAluno=clonar(c);
  const publicado=planoSnap&&planoSnap.exists()?planoSnap.data():null;basePlano=publicado?publicado.revisao:null;plano=normalizar(publicado);
  // Os exercícios atuais do aluno prevalecem sobre uma cópia antiga do plano.
  if(c.treinos&&Object.keys(c.treinos).length)plano.treinos=clonar(c.treinos);if(c.nomes)Object.assign(plano.nomes,c.nomes);
  for(const [t,arr] of Object.entries(plano.treinos))if(arr[0]&&arr[0].treinoNome)plano.nomes[t]=arr[0].treinoNome;
  const draft=localStorage.getItem(chaveRascunho(a.uid));if(draft&&confirm('Existe um rascunho salvo para este aluno. Recuperar?')){plano=normalizar(JSON.parse(draft));modificado=true}
  $('pAlunoNome').textContent=a.nome||a.email||'Aluno';$('pAlunoEmail').textContent=a.email||'';$('pVazio').hidden=true;$('pEditor').hidden=false;desenharFicha();desenharTreinos();desenharRefeicoes();desenharEvolucaoAluno();aba('evolucao');
  mensagem(regraPendente?'Treinos disponíveis. Para publicar a ficha e o plano alimentar, é necessário publicar as novas regras do Firestore. O rascunho pode ser preparado aqui.':modificado?'Rascunho recuperado. Ainda não publicado.':'Alterações chegam ao aluno após a publicação.',regraPendente);
 }catch(e){$('pVazio').textContent='Não foi possível abrir o aluno. Tente novamente.';mensagem('Erro ao carregar ('+(e.code||e.message)+').',true)}finally{carregando=false}
}
function desenharFicha(){const root=$('pFicha');root.replaceChildren();const fields=[['titulo','Título do plano'],['objetivo','Objetivo'],['idade','Idade'],['sexo','Sexo (opcional)'],['peso','Peso (kg)'],['altura','Altura (cm)'],['profissional','Profissional responsável'],['registro','Registro profissional'],['cardio','Atividade complementar / cardio'],['observacoes','Orientações gerais']];fields.forEach(([k,label])=>root.append(campo(label,plano.ficha[k],v=>{plano.ficha[k]=v;mudou()},k==='observacoes')))}
function proxima(){let i=0;while(plano.treinos[String.fromCharCode(65+i)])i++;return String.fromCharCode(65+i)}
function desenharTreinos(){resumoEditor();const root=$('pTreinos');root.replaceChildren();for(const [t,exs] of Object.entries(plano.treinos)){
 const card=node('section','p-treino');const head=node('div','p-card-head');head.append(node('span','p-letra',t),campo('Nome do treino',plano.nomes[t]||'Treino '+t,v=>{plano.nomes[t]=v;mudou()}),botao('Remover treino',()=>{if(confirm('Remover este treino do rascunho?')){delete plano.treinos[t];delete plano.nomes[t];mudou();desenharTreinos()}},'btn warn'));card.append(head);
 const table=node('div','p-exercicios');exs.forEach((ex,i)=>{const row=node('div','p-exercicio');row.append(node('span','p-num',i+1),campo('Exercício',ex.nome,v=>{ex.nome=v;mudou()}),campo('Séries',ex.series,v=>{ex.series=v;mudou()}),campo('Repetições',ex.reps,v=>{ex.reps=v;mudou()}),campo('Descanso',ex.descanso,v=>{ex.descanso=v;mudou()}),botao('×',()=>{exs.splice(i,1);mudou();desenharTreinos()},'btn warn'));row.lastChild.setAttribute('aria-label','Remover exercício '+(i+1));table.append(row)});card.append(table,botao('+ Exercício',()=>{exs.push({id:id(),nome:'',series:'3',reps:'12',descanso:''});mudou();desenharTreinos()}));root.append(card)}
 if(!Object.keys(plano.treinos).length)root.append(node('p','p-vazio','Nenhum treino neste plano. Use Adicionar treino para começar.'));
}
function desenharRefeicoes(){resumoEditor();const root=$('pRefeicoes');root.replaceChildren();const info=$('pInfoAlimentar');info.replaceChildren();[['titulo','Título'],['profissional','Profissional responsável'],['registro','Registro profissional']].forEach(([k,l])=>info.append(campo(l,plano.alimentar[k],v=>{plano.alimentar[k]=v;mudou()})));info.append(campo('Orientações gerais',plano.alimentar.orientacoes,v=>{plano.alimentar.orientacoes=v;mudou()},true));
 plano.alimentar.refeicoes.forEach((r,i)=>{const card=node('section','p-treino');const row=node('div','p-card-head');row.append(node('span','p-letra',i+1),campo('Refeição',r.nome,v=>{r.nome=v;mudou()}),campo('Horário',r.horario,v=>{r.horario=v;mudou()}),botao('Remover',()=>{plano.alimentar.refeicoes.splice(i,1);mudou();desenharRefeicoes()},'btn warn'));card.append(row,campo('Alimentos e quantidades — um item por linha',r.itens,v=>{r.itens=v;mudou()},true),campo('Substituições e observações',r.observacoes,v=>{r.observacoes=v;mudou()},true));root.append(card)});
 if(!plano.alimentar.refeicoes.length)root.append(node('p','p-vazio','Nenhuma refeição neste plano. Use Adicionar refeição para começar.'));
}

function desenharEvolucaoAluno(){if(window.TendaEvolucao)window.TendaEvolucao.render($('pEvolucaoAluno'),evolucaoAluno);$('pEvolucaoStatus').textContent='Consulta atualizada às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
async function atualizarEvolucaoAluno(){
 if(!profissional()||!selecionado||atualizandoEvolucao)return;const uid=selecionado.uid,prof=usuario.uid;
 atualizandoEvolucao=true;$('pAtualizarEvolucao').disabled=true;$('pEvolucaoStatus').textContent='Buscando registros…';
 try{const fb=await getFB(),s=await fb.F.getDoc(fb.F.doc(fb.db,'usuarios',uid));if(!usuario||usuario.uid!==prof||!selecionado||selecionado.uid!==uid||!profissional())return;evolucaoAluno=s.exists()?clonar(s.data()):{};desenharEvolucaoAluno();$('pEvolucaoStatus').textContent='Consulta atualizada às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
 catch(e){if(selecionado&&selecionado.uid===uid)$('pEvolucaoStatus').textContent='Não foi possível atualizar. Os dados anteriores foram mantidos.'}
 finally{atualizandoEvolucao=false;$('pAtualizarEvolucao').disabled=false}
}
$('pAtualizarEvolucao').onclick=atualizarEvolucaoAluno;

function aba(a){resumoEditor();document.querySelector('.p-publish-bar').hidden=a==='evolucao';$('pRascunhoNota').hidden=a==='evolucao';for(const k of ['evolucao','treino','ficha','alimentar','previa']){$('pTab-'+k).hidden=k!==a;$('pBtn-'+k).classList.toggle('acc',k===a);$('pBtn-'+k).setAttribute('aria-pressed',String(k===a))}if(a==='previa')desenharPrevia($('pPrevia'),plano,selecionado.nome||selecionado.email)}
function montarConteudo(){const out=normalizar(plano);let count=0;for(const [t,arr] of Object.entries(out.treinos)){out.treinos[t]=arr.filter(e=>String(e.nome||'').trim()).map(e=>({...e,nome:limitar(e.nome,160),series:limitar(e.series,20),reps:limitar(e.reps,40),descanso:limitar(e.descanso,80),treinoNome:limitar(out.nomes[t]||'Treino '+t,100)}));count+=out.treinos[t].length}out.alimentar.refeicoes=out.alimentar.refeicoes.filter(r=>String(r.nome||'').trim()||String(r.itens||'').trim());if(!count&&!out.alimentar.refeicoes.length)throw Error('Adicione ao menos um exercício ou uma refeição.');return out}
async function publicar(){
 if(!profissional()||!selecionado||!plano||salvando)return;
 let out;try{out=montarConteudo()}catch(e){mensagem(e.message,true);return}
 if(!confirm('Publicar este plano para '+(selecionado.nome||selecionado.email)+'? Os treinos serão atualizados; as cargas e o histórico do aluno serão mantidos.'))return;
 salvando=true;$('pEditor').inert=true;$('pPublicar').disabled=true;const alunoUid=selecionado.uid,profUid=usuario.uid;out.uid=alunoUid;out.professorUid=profUid;out.alunoNome=selecionado.nome||'';out.atualizadoEm=Date.now();out.revisao=id();const expected=basePlano;mensagem('Publicando…');
 try{const fb=await getFB();const ref=fb.F.doc(fb.db,'planosProfessor',alunoUid),uref=fb.F.doc(fb.db,'usuarios',alunoUid);
 await fb.F.runTransaction(fb.db,async tx=>{const ps=await tx.get(ref),us=await tx.get(uref);if((ps.exists()?ps.data().revisao:null)!==expected)throw Error('Outro profissional atualizou o plano. Reabra o aluno antes de publicar.');if(!usuario||usuario.uid!==profUid)throw Error('A conta mudou. Entre novamente.');tx.set(ref,out);const patch={treinos:out.treinos};if(us.exists())tx.update(uref,patch);else tx.set(uref,patch)});
 basePlano=out.revisao;plano=normalizar(out);modificado=false;try{localStorage.removeItem(chaveRascunho(alunoUid))}catch(e){};mensagem('Publicado. O aluno pode abrir a aba Meus planos e atualizar seus treinos.');
 }catch(e){mensagem(e.code==='permission-denied'?'Não publicado: as novas regras do Firestore ainda precisam ser ativadas. Seu rascunho foi mantido.':'Não publicado: '+(e.code||e.message),true)}finally{salvando=false;$('pEditor').inert=false;$('pPublicar').disabled=false}
}
async function publicarSomenteTreinos(){
 if(!profissional()||!selecionado||!plano||salvando)return;let out;try{out=montarConteudo()}catch(e){mensagem(e.message,true);return}if(!Object.values(out.treinos).some(a=>a.length)){mensagem('Adicione ao menos um exercício.',true);return}
 if(!confirm('Enviar apenas os treinos? A ficha e o plano alimentar não serão publicados.'))return;
 salvando=true;$('pEditor').inert=true;$('pSoTreino').disabled=true;
 try{const fb=await getFB();const ref=fb.F.doc(fb.db,'usuarios',selecionado.uid);await fb.F.runTransaction(fb.db,async tx=>{const snap=await tx.get(ref);if(snap.exists())tx.update(ref,{treinos:out.treinos});else tx.set(ref,{treinos:out.treinos})});mensagem('Treinos enviados. A ficha e o plano alimentar continuam como rascunho.');}
 catch(e){mensagem('Não foi possível enviar: '+(e.code||e.message),true)}finally{salvando=false;$('pEditor').inert=false;$('pSoTreino').disabled=false}
}
function desenharPrevia(root,p,nome){root.replaceChildren();const head=node('header','p-folha-head');head.append(node('div','eyebrow','ACADEMIA TENDA'),node('h2','',p.ficha.titulo||'Plano de treino'),node('p','',nome));root.append(head);const ficha=node('div','p-ficha-resumo');[['Objetivo',p.ficha.objetivo],['Idade',p.ficha.idade],['Sexo',p.ficha.sexo],['Peso',p.ficha.peso&&p.ficha.peso+' kg'],['Altura',p.ficha.altura&&p.ficha.altura+' cm'],['Responsável',p.ficha.profissional],['Registro',p.ficha.registro]].forEach(([l,v])=>{if(v){const c=node('div');c.append(node('small','',l),node('strong','',v));ficha.append(c)}});if(ficha.childNodes.length)root.append(ficha);
 const grid=node('div','p-folha-grid');for(const [t,arr] of Object.entries(p.treinos||{})){const exs=arr.filter(e=>String(e.nome||'').trim());if(!exs.length)continue;const card=node('section','p-folha-card');card.append(node('h3','',p.nomes[t]||exs[0].treinoNome||'Treino '+t));const table=node('table');const hr=node('tr');['Exercício','Séries','Repetições','Descanso'].forEach(l=>hr.append(node('th','',l)));const th=node('thead');th.append(hr);table.append(th);const tb=node('tbody');exs.forEach(ex=>{const r=node('tr');[ex.nome,ex.series,ex.reps,ex.descanso||'—'].forEach(v=>r.append(node('td','',v)));tb.append(r)});table.append(tb);card.append(table);grid.append(card)}root.append(grid);
 for(const [l,v] of [['Atividade complementar',p.ficha.cardio],['Orientações',p.ficha.observacoes]])if(v){const card=node('section','p-folha-card');card.append(node('h3','',l),node('p','p-multilinha',v));root.append(card)}
 if(p.alimentar.refeicoes.length){const a=node('section','p-alimentar-previa');a.append(node('h2','',p.alimentar.titulo||'Plano alimentar'));if(p.alimentar.profissional)a.append(node('p','',p.alimentar.profissional+(p.alimentar.registro?' · '+p.alimentar.registro:'')));for(const r of p.alimentar.refeicoes){const card=node('section','p-folha-card');card.append(node('h3','',(r.horario?r.horario+' · ':'')+(r.nome||'Refeição')),node('p','p-multilinha',r.itens||''));if(r.observacoes)card.append(node('p','small-note p-multilinha',r.observacoes));a.append(card)}if(p.alimentar.orientacoes)a.append(node('p','p-multilinha',p.alimentar.orientacoes));root.append(a)}
}
function imprimir(root){const area=$('pImpressao');area.replaceChildren(root.cloneNode(true));document.body.classList.add('imprimindo-plano');window.print();document.body.classList.remove('imprimindo-plano')}
window.addEventListener('afterprint',()=>document.body.classList.remove('imprimindo-plano'));
window.addEventListener('beforeunload',e=>{if(modificado){e.preventDefault();e.returnValue=''}});
// O painel novo substitui o modal antigo, mantendo o fluxo de permissões existente.
abrirPainelProfessor=function(){if(!profissional())return;document.getElementById('modalPerfil').hidden=true;$('modalProfessor').hidden=false;if(!selecionado){$('pEditor').hidden=true;$('pVazio').hidden=false}listaAlunos()};
$('profBusca').oninput=desenharAlunos;
$('btnFecharProf').onclick=()=>{if(!salvando&&sairSeguro())$('modalProfessor').hidden=true};
// Evita fechar e perder contexto ao clicar fora do painel.
$('modalProfessor').addEventListener('click',e=>{if(e.target===$('modalProfessor')){$('modalProfessor').hidden=false}});
$('pAtualizar').onclick=listaAlunos;
$('pAdicionarTreino').onclick=()=>{const t=proxima();plano.treinos[t]=[];plano.nomes[t]='Treino '+t;mudou();desenharTreinos()};
$('pAdicionarRefeicao').onclick=()=>{plano.alimentar.refeicoes.push({nome:'',horario:'',itens:'',observacoes:''});mudou();desenharRefeicoes()};
$('pPublicar').onclick=publicar;$('pSoTreino').onclick=publicarSomenteTreinos;
$('pCopiarMeus').onclick=()=>{if(confirm('Copiar seus treinos para o rascunho deste aluno?')){plano.treinos=clonar(dados.treinos);plano.nomes=clonar(dados.nomes||{});mudou();desenharTreinos()}};
for(const k of ['evolucao','treino','ficha','alimentar','previa'])$('pBtn-'+k).onclick=()=>aba(k);
$('pImprimir').onclick=()=>{desenharPrevia($('pPrevia'),plano,selecionado.nome||selecionado.email);imprimir($('pPrevia'))};
$('pExportar').onclick=()=>{if(!plano)return;const blob=new Blob([JSON.stringify({formato:'tenda-plano-professor',plano},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download='plano-aluno.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
const oldCargo=atualizarCargoPerfil;atualizarCargoPerfil=function(){oldCargo();$('pAcesso').hidden=!profissional()};
$('pAcesso').onclick=abrirPainelProfessor;
const oldConta=atualizaBotaoConta;atualizaBotaoConta=function(){oldConta();$('pAcesso').hidden=!profissional();$('irPlanos').hidden=!usuario;if(!usuario){$('viewPlanos').hidden=true;$('alunoPlano').replaceChildren();selecionado=null;plano=null;modificado=false;evolucaoAluno={};$('pEvolucaoAluno').replaceChildren();$('modalProfessor').hidden=true}};
const nomeAnterior=nomeDo;nomeDo=function(t){const first=dados&&dados.treinos&&dados.treinos[t]&&dados.treinos[t][0];return first&&first.treinoNome?first.treinoNome:nomeAnterior(t)};
const vistaAnterior=mudarVista;mudarVista=function(v){$('viewPlanos').hidden=true;$('irPlanos').classList.remove('selecionado');$('irPlanos').setAttribute('aria-pressed','false');vistaAnterior(v)};
let buscandoPlano=false;
async function verPlanos(){if(buscandoPlano)return;if(!usuario){abrirLogin();return}buscandoPlano=true;$('pAlunoAtualizar').disabled=true;$('viewTreinos').hidden=true;$('viewEvolucao').hidden=true;$('viewPlanos').hidden=false;sairDoModoEdicao();$('btnEditar').hidden=true;for(const k of ['irTreinos','irEvolucao','irPlanos']){$(k).classList.toggle('selecionado',k==='irPlanos');$(k).setAttribute('aria-pressed',String(k==='irPlanos'))}const uid=usuario.uid;$('alunoPlano').textContent='Carregando seu plano…';$('pAlunoImprimir').hidden=true;
 try{const fb=await getFB();const s=await fb.F.getDoc(fb.F.doc(fb.db,'planosProfessor',uid));if(!usuario||usuario.uid!==uid)return;if(!s.exists()){$('alunoPlano').textContent='Você ainda não recebeu um plano. Quando seu professor publicar, ele aparecerá aqui.';return}desenharPrevia($('alunoPlano'),normalizar(s.data()),usuario.displayName||'Meu plano');$('pAlunoImprimir').hidden=false}
 catch(e){if(!usuario||usuario.uid!==uid)return;$('alunoPlano').textContent=e.code==='permission-denied'?'A consulta dos planos ainda precisa ser ativada pelo responsável nas regras do Firebase.':'Não foi possível carregar. Confira sua conexão e tente novamente.'}finally{buscandoPlano=false;$('pAlunoAtualizar').disabled=false}
}
$('irPlanos').onclick=verPlanos;$('pAlunoAtualizar').onclick=verPlanos;$('pAlunoImprimir').onclick=()=>imprimir($('alunoPlano'));
atualizaBotaoConta();
})();


