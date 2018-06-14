#!/bin/bash
function starts3_multiple () {
  local STORAGE_ENDPOINT='http://zenkoazuretest.blob.core.windows.net'
  local STORAGE_ENDPOINT_2='http://zenkoazuretest2.blob.core.windows.net'
  local ACCOUNT_NAME_1="zenkoazuretest"
  local ACCESS_KEY_1="l+lk4qcC3lXPj1NGaNRVG7QpRlx5Acim/avwda7CVFqHa+yO+RQEHsyk5coeah2KPIazCrAej4qJ/I3ODT3Iyw=="
  local ACCOUNT_NAME_2="zenkoazuretest2"
  local ACCESS_KEY_2="Mk0PPILpXlN7QuTxOdJ7m+nWFW+yvH5qAXHmA6Eu10MWnn/EL03iIZ6+GT3Y7xBJCGFljDEib5AL65VjwK2UJw=="
  azurebackend_AZURE_STORAGE_ENDPOINT=$STORAGE_ENDPOINT azurebackend2_AZURE_STORAGE_ENDPOINT=$STORAGE_ENDPOINT_2 azurebackendmismatch_AZURE_STORAGE_ENDPOINT=$STORAGE_ENDPOINT azurenonexistcontainer_AZURE_STORAGE_ENDPOINT=$STORAGE_ENDPOINT azurebackend_AZURE_STORAGE_ACCOUNT_NAME=$ACCOUNT_NAME_1 azurebackend2_AZURE_STORAGE_ACCOUNT_NAME=$ACCOUNT_NAME_2 azurebackendmismatch_AZURE_STORAGE_ACCOUNT_NAME=$ACCOUNT_NAME_1 azurenonexistcontainer_AZURE_STORAGE_ACCOUNT_NAME=$ACCOUNT_NAME_1 azurebackend_AZURE_STORAGE_ACCESS_KEY=$ACCESS_KEY_1 azurebackend2_AZURE_STORAGE_ACCESS_KEY=$ACCESS_KEY_2 azurebackendmismatch_AZURE_STORAGE_ACCESS_KEY=$ACCESS_KEY_1 
  CI=true 
  azurenonexistcontainer_AZURE_STORAGE_ACCESS_KEY=$ACCESS_KEY_1 S3BACKEND=mem S3DATA=multiple CI=true MPU_TESTING=yes npm run ft_test
}
starts3_multiple
exit $?