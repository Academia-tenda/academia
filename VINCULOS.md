# Carteiras geridas pelo instrutor

Esta alteração substitui os códigos de convite pela atribuição direta de alunos. A publicação das novas regras e da interface deve ser coordenada; as regras precisam ser publicadas primeiro. A configuração existente `config/vinculos.ativo = true` continua válida.

## Fluxo

1. No painel ou perfil, o instrutor abre **Adicionar aluno**.
2. A busca mostra usuários com perfil de aluno que não possuem professor. Perfis de instrutores e do responsável não aparecem como candidatos.
3. **Adicionar** atribui o usuário ao instrutor e permite consultar seus registros e publicar planos. Não há código nem confirmação pelo aluno.
4. Na carteira, **Liberar aluno** encerra o vínculo depois da confirmação do instrutor. Os registros e planos permanecem na conta do aluno.
5. O aluno liberado volta à lista de disponíveis. Um aluno com vínculo ativo não pode ser tomado por outro instrutor.

O responsável mantém o acesso administrativo existente. Vínculos anteriores são preservados e podem ser liberados pelo respectivo instrutor.

## Garantias e validação

A atribuição e a liberação gravam o vínculo e o perfil em uma transação. As regras rejeitam mudanças parciais, atribuição a si mesmo, promoção de cargo e substituição de um professor ativo. Os registros e planos só ficam acessíveis ao instrutor após a atribuição.

Testado no emulador do Firestore: dois instrutores tentando selecionar simultaneamente o mesmo aluno têm apenas um vencedor; tentativa direta de substituir o professor é rejeitada; liberar corta o acesso e preserva os dados. Os testes existentes de edição, publicação, conclusão e sincronização também passaram.

Esta proposta amplia o acesso aos registros porque dispensa aceitação pelo aluno. A publicação em produção depende da confirmação específica do responsável. Não altera contas, cobranças ou dados de treino.
