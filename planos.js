/* Datas e versões dos planos. Mantém até dez publicações anteriores. */
(function(){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));
function validDate(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(d||''))return false;const date=new Date(d+'T12:00:00');return Number.isFinite(date.getTime())&&dataISO(date)===d}
function validate(plan){const f=plan.ficha||{};for(const key of ['inicio','revisaoPrevista'])if(f[key]&&!validDate(f[key]))throw Error('Informe uma data válida para o início e a revisão.');if(f.inicio&&f.revisaoPrevista&&f.revisaoPrevista<f.inicio)throw Error('A revisão deve ser na data de início ou depois dela.')}
function history(plan){return Array.isArray(plan?.ficha?.__historico)?plan.ficha.__historico.filter(v=>v&&v.revisao&&v.treinos&&v.ficha).slice(-10):[]}
function snapshot(plan){const copy=clone(plan);copy.ficha=copy.ficha||{};delete copy.ficha.__historico;return{revisao:copy.revisao,atualizadoEm:copy.atualizadoEm||null,ficha:copy.ficha,treinos:copy.treinos,nomes:copy.nomes||{},alimentar:copy.alimentar||{refeicoes:[]}}}
function archive(previous,next){const copy=clone(next);const versions=history(previous).filter(v=>v.revisao!==previous?.revisao);if(previous?.revisao)versions.push(snapshot(previous));copy.ficha.__historico=versions.slice(-10);return copy}
function label(plan){const f=plan.ficha||{},parts=[];if(validDate(f.inicio))parts.push('Início: '+new Date(f.inicio+'T12:00:00').toLocaleDateString('pt-BR'));if(validDate(f.revisaoPrevista))parts.push('Revisão prevista: '+new Date(f.revisaoPrevista+'T12:00:00').toLocaleDateString('pt-BR')+(f.revisaoPrevista<hoje()?' · Revisar plano':''));return parts}
window.TendaPlanos={validDate,validate,history,snapshot,archive,label};
})();
