#! /bin/bash
DOC_SRC_PATH="./doc"
DOC_SRC_GLOB="$DOC_SRC_PATH/*"
DOC_OUTPUT="./docs"
TS_INFER_ID="ts-infer"
TS_INFER_PATH="$DOC_OUTPUT/$TS_INFER_ID"
GIT_URL="git@github.com:FilipeBeck/docs.git"

if [ ! -d $DOC_SRC_PATH ]; then
	echo "Diretório \"$DOC_SRC_PATH\" não existe"
	exit 1
fi

if [ -d $DOC_OUTPUT ]; then
	rm -rf $DOC_OUTPUT
fi

PACKAGE_NAME="$(node -e "console.log(JSON.parse(require('fs').readFileSync('./package.json', 'utf8')).name)")"
PACKAGE_DESCRIPTION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('./package.json', 'utf8')).description)")"
PACKAGE_DOCS="$(node -e "console.log(JSON.parse(require('fs').readFileSync('./package.json', 'utf8')).docs)")"

if [ -z "$PACKAGE_NAME" ] || [ "$PACKAGE_NAME" = "undefined" ]; then
	echo "Campo \"name\" inexistente em \"package.json\""
	exit 1
fi

if [ -z "$PACKAGE_DESCRIPTION" ] || [ "$PACKAGE_DESCRIPTION" = "undefined" ]; then
	echo "Camppo \"description\" inexistente em \"package.json\""
	exit 1
fi

if [ -z "$PACKAGE_DOCS" ] || [ "$PACKAGE_DOCS" = "undefined" ]; then
	echo "Campo \"docs\" inexistente em \"package.json\""
	exit 1
fi

git clone $GIT_URL $DOC_OUTPUT --depth=1

if [ ! $? ]; then
	echo "Erro ao clonar repositório \"$GIT_URL\""
fi

DOCS_README="$DOC_OUTPUT/README.md"
README_ITEM="$(grep $PACKAGE_NAME $DOCS_README)"

if [ -z "$README_ITEM" ]; then
	cat <<< "- [$PACKAGE_NAME](./$PACKAGE_NAME) - [$PACKAGE_DESCRIPTION]($PACKAGE_DOCS)$(\n)" >> $DOCS_README
fi

if [ ! -d $TS_INFER_PATH ]; then
	mkdir $TS_INFER_PATH
fi

cp -r $DOC_SRC_GLOB $TS_INFER_PATH &&
cd $DOC_OUTPUT

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