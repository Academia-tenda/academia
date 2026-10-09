# Ativar carteiras por convite

A interface de treinos, as datas e as versões dos planos funcionam com as permissões atuais. O acompanhamento por convite é ativado separadamente.

As regras foram publicadas no Firebase do projeto `academia-tenda` em 9 de outubro de 2026. O arquivo `firestore.rules` corresponde às regras em produção. A ativação das carteiras pelo responsável ainda é necessária.

1. Entre no projeto correto no Firebase Console.
2. Guarde uma cópia das regras atualmente publicadas.
3. Em Firestore Database → Regras, publique o conteúdo de `firestore-vinculos.rules`.
4. No site, entre na conta do responsável já cadastrada em `perfis/_adm`.
5. Abra Perfil → Carteiras de alunos → Ativar carteiras por convite.
6. Cada professor abre Perfil ou o painel e disponibiliza seu convite.
7. O aluno cola o código em Perfil → Meu professor, consulta o nome e confirma a aceitação.

Depois da ativação, o professor consulta e publica somente para alunos vinculados. O responsável mantém acesso administrativo. Alunos existentes precisam aceitar um convite; seus treinos, registros e planos não são removidos.

O aluno pode encerrar o acompanhamento pelo Perfil. O professor perde o acesso, e os registros permanecem com o aluno.

As novas regras impedem que uma conta se promova sozinha a professor. A liberação continua sendo feita pelo responsável. O documento `perfis/_adm` existente é preservado; o cadastro inicial de um novo responsável deve ser feito administrativamente.

## Verificação

A implementação foi verificada no emulador do Firestore: aceitação atômica, consulta limitada, publicação, revogação, preservação de dados e bloqueio de promoção indevida. Também foram testados os fluxos da interface e a mesclagem dos dados.

Essa verificação não substitui um teste final com duas contas no projeto real. As regras foram publicadas em produção; não foram criadas contas nem alteradas cobranças.
