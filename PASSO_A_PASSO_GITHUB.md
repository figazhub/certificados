# Passo a passo — publicar pelo GitHub Pages

## 1. Criar repositório

No GitHub, crie um novo repositório chamado:

cert-generator

Configuração recomendada:
- Visibility: Public, se for usar GitHub Pages sem plano pago.
- Add README: Off.
- Add .gitignore: No .gitignore.
- Add license: No license.

## 2. Enviar os arquivos

Descompacte este ZIP.

Entre dentro da pasta extraída e envie TODO O CONTEÚDO para a raiz do repositório.

A raiz do repositório precisa ficar assim:

index.html
assets/
firebase.json
firestore.rules
README.md
PASSO_A_PASSO_GITHUB.md
.nojekyll

Não envie a pasta inteira como subpasta. Envie o conteúdo de dentro dela.

## 3. Configurar o Firebase no arquivo

No GitHub, abra:

assets/js/firebase-config.js

Clique no lápis de edição e substitua os valores COLE_AQUI pelo firebaseConfig do seu novo projeto Firebase.

Depois faça Commit changes.

## 4. Ativar GitHub Pages

No repositório, vá em:

Settings > Pages

Em Build and deployment:
- Source: Deploy from a branch
- Branch: main
- Folder: / (root)

Clique em Save.

Aguarde 1 a 3 minutos.

O link deverá ficar parecido com:

https://figazhub.github.io/certificados/

## 5. Autorizar domínio no Firebase

No Firebase, vá em:

Authentication > Settings > Authorized domains

Adicione:

figazhub.github.io

Se usar domínio próprio, adicione o domínio próprio também.

## 6. Ativar login

No Firebase:

Authentication > Sign-in method

Ative:
- Email/Password
- Google

## 7. Criar banco

No Firebase:

Firestore > Criar banco de dados

Escolha:
- Modo produção / bloqueado
- Região sugerida ou southamerica-east1, se aparecer

## 8. Publicar regras

Abra o arquivo `firestore.rules` deste projeto.

Copie todo o conteúdo.

No Firebase:

Firestore > Regras

Cole o conteúdo e clique em Publicar.

## 9. Autorizar primeiro admin

No Firestore:

Coleção: usersByEmail
Documento: seu e-mail

Campos tipo string:

email = seu e-mail
name = Seu nome
role = admin
unit = Extremo Norte

## 10. Criar usuário de login

No Firebase:

Authentication > Users > Add user

Crie o mesmo e-mail com uma senha.

Depois acesse o link do GitHub Pages e faça login.
