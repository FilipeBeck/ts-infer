#! /bin/bash

DOC_SRC_PATH="./doc"
DOC_SRC_GLOB="$DOC_SRC_PATH/*"
DOC_OUTPUT="./docs"
TS_INFER_ID="ts-infer"
TS_INFER_PATH="$DOC_OUTPUT/$TS_INFER_ID"
GIT_URL="git@github.com:FilipeBeck/docs.git"
PRIVATE_KEY_FILENAME="./ssh-key"
PUBLIC_KEY_FILENAME="./ssh-key.pub"

echo $SSH_PRIVATE_KEY > $PRIVATE_KEY_FILENAME &&
echo $SSH_PUBLIC_KEY > $PUBLIC_KEY_FILENAME &&
ssh-add PRIVATE_KEY_FILENAME

if [ ! $? ]; then
	echo "Erro ao adicionar as chaves SSH"
	exit $?
fi

if [ ! -d $DOC_SRC_PATH ]; then
	echo "Diretório \"$DOC_SRC_PATH\" não existe"
	exit 1
fi

if [ -d $DOC_OUTPUT ]; then
	rm -rf $DOC_OUTPUT
fi

git clone $GIT_URL $DOC_OUTPUT --depth=1

if [ ! $? ]; then
	echo "Erro ao clonar repositório \"$GIT_URL\""
fi

if [ ! -d $TS_INFER_PATH ]; then
	mkdir $TS_INFER_PATH
fi

cp -r $DOC_SRC_GLOB $TS_INFER_PATH &&
cd $TS_INFER_PATH

if [ ! $? ]; then
	echo "Erro ao copiar os arquivos de documentação"
	exit $?
fi

git add . &&
git commit -m "Atualiza documentação de $TS_INFER_ID" &&
git push origin master &&

if [ ! $? ]; then
	echo "Erro ao subir as atualizações"
	exit $?
fi